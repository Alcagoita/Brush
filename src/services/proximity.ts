/**
 * proximity.ts — POI proximity detection & geofencing engine (KAN-24).
 *
 * Responsibilities:
 *   1. Watch the user's location (via geolocation.ts).
 *   2. For each unique POI type in the user's undone tasks, find the nearest
 *      physical place using the Places API (via maps.ts) — results are cached
 *      and refreshed only when the user moves > CACHE_INVALIDATION_DISTANCE m.
 *   3. Compare distance to each cached place against the geofence radius.
 *   4. Determine the single "currently nearby" POI (closest one inside any
 *      active geofence). Rule: only one POI nearby at a time — closest wins.
 *   5. On geofence entry (transition null → some PoiType, or change):
 *        a. Fire a local notification via @notifee/react-native.
 *        b. Write poiAlertSeenDate to Firestore so we don't re-notify today.
 *      Suppression: skip if the task is already done, or if
 *      task.poiAlertSeenDate === today.
 *
 * Geofence radii (from spec):
 *   ATM / Pharmacy   → 50 m
 *   Café / Supermarket → 75 m
 *
 * Usage (in TodayScreen):
 *   const stop = startProximityMonitoring(uid, tasks, (type, place, allPlaces) => {
 *     setNearbyPoiType(type);
 *     setNearbyPlace(place);
 *     setPoiPlaces(allPlaces);
 *   });
 *   // call stop() on unmount
 */

import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';
import { Platform } from 'react-native';
import { Coordinates, startTracking, stopTracking } from './geolocation';
import { getDistanceMeters, searchNearbyPlaces, NearbyPlace, placeTypeLabel } from './maps';
import { markPoiAlertSeen } from './firestore';
import { PoiType, Task, POI_GEOFENCE_RADIUS } from '../types';

// ─── Public types ─────────────────────────────────────────────────────────────

/**
 * Snapshot of the nearest known place for each POI type string.
 * Keys are Google Places primary type strings (built-in PoiType values
 * or arbitrary custom category types). Populated as the Places API cache
 * fills in. Used by NearbyCard for the idle-state rows.
 */
export type PlacesMap = Partial<Record<string, NearbyPlace>>;

/** Callback fired whenever nearby state OR place data changes. */
export type ProximityCallback = (
  nearbyPoiType: string | null,
  nearbyPlace:   NearbyPlace | null,
  allPlaces:     PlacesMap,
) => void;

// ─── Constants ────────────────────────────────────────────────────────────────

/** Re-query Places API only after the user has moved this far from the last
 *  search origin. Keeps API calls low while maintaining freshness. */
const CACHE_INVALIDATION_DISTANCE = 200; // metres

/**
 * Default geofence radius in metres for custom (non-built-in) POI types.
 * Custom category types (e.g. "gym", "restaurant") don't appear in
 * POI_GEOFENCE_RADIUS, so we fall back to the larger café/supermarket radius.
 */
const DEFAULT_GEOFENCE_RADIUS = 75; // metres

/** Notifee Android channel id for proximity alerts. */
const CHANNEL_ID = 'proximity_alerts';

// ─── Internal state ───────────────────────────────────────────────────────────

interface PlaceCache {
  /** User position when the search was performed. */
  origin: { lat: number; lng: number };
  /** Nearest places found (up to 5). */
  places: NearbyPlace[];
}

const placeCache = new Map<string, PlaceCache>();

let currentNearbyType: string | null = null;
let isMonitoring = false;

/**
 * Live user-defined geofence radius preferences (KAN-25).
 * Keyed by Google Places primary type string. Updated in real time via
 * `updateProximityPoiPreferences()` whenever the Firestore subscription fires.
 */
let poiRadiusPrefs: Record<string, number> = {};

// ─── Radius helper ───────────────────────────────────────────────────────────

/**
 * Returns the effective geofence radius in metres for a POI type string.
 *
 * Priority (KAN-25):
 *   1. User-saved preference from Firestore (`poiRadiusPrefs`).
 *   2. Built-in spec default from `POI_GEOFENCE_RADIUS` (50 m or 75 m).
 *   3. `DEFAULT_GEOFENCE_RADIUS` (75 m) for custom types with no stored pref.
 */
function getGeofenceRadius(poiType: string): number {
  return poiRadiusPrefs[poiType]
    ?? (POI_GEOFENCE_RADIUS as Record<string, number>)[poiType]
    ?? DEFAULT_GEOFENCE_RADIUS;
}

// ─── Date helper ──────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Notification setup ───────────────────────────────────────────────────────

/**
 * Create the Android notification channel (idempotent — safe to call on every
 * app launch; Android ignores duplicate channel registrations).
 * iOS does not use channels but notifee handles that transparently.
 */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') { return; }
  await notifee.createChannel({
    id:         CHANNEL_ID,
    name:       'Nearby Task Alerts',
    importance: AndroidImportance.HIGH,
    sound:      'default',
    vibration:  true,
  });
}

// ─── Notification ──────────────────────────────────────────────────────────────

async function fireNotification(
  task: Task,
  place: NearbyPlace,
  distanceMeters: number,
): Promise<void> {
  await ensureChannel();

  const distLabel = distanceMeters < 1000
    ? `${Math.round(distanceMeters)} m away`
    : `${(distanceMeters / 1000).toFixed(1)} km away`;

  // placeTypeLabel handles both built-in PoiType values and custom Google
  // Places type strings (e.g. "gym" → "Gym").
  const poiLabel = task.poi ? placeTypeLabel(task.poi) : 'nearby';

  await notifee.displayNotification({
    title: `${poiLabel} nearby`,
    body:  `${place.name} is ${distLabel} — you have "${task.title}"`,
    // KAN-28: data payload for deep linking — press handler navigates to Today.
    data: {
      screen: 'Today',
      taskId: task.id,
      date:   task.date,
    },
    android: {
      channelId:   CHANNEL_ID,
      importance:  AndroidImportance.HIGH,
      style: {
        type: AndroidStyle.BIGTEXT,
        text: `${place.name} is ${distLabel}.\nTask: "${task.title}"`,
      },
      pressAction: { id: 'default' },
    },
    ios: {
      sound: 'default',
    },
  });
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

function isCacheValid(poiType: string, lat: number, lng: number): boolean {
  const cached = placeCache.get(poiType);
  if (!cached) { return false; }
  const dist = getDistanceMeters(lat, lng, cached.origin.lat, cached.origin.lng);
  return dist < CACHE_INVALIDATION_DISTANCE;
}

async function getNearestPlace(
  poiType: string,
  lat: number,
  lng: number,
): Promise<NearbyPlace | null> {
  if (!isCacheValid(poiType, lat, lng)) {
    try {
      const radius = getGeofenceRadius(poiType) * 4; // search in a larger bubble
      const places = await searchNearbyPlaces(lat, lng, poiType, radius);
      placeCache.set(poiType, { origin: { lat, lng }, places });
    } catch {
      // Network or quota error — keep stale cache if available.
      if (!placeCache.has(poiType)) { return null; }
    }
  }
  const cache = placeCache.get(poiType);
  return cache?.places[0] ?? null;
}

// ─── Core proximity check ─────────────────────────────────────────────────────

/**
 * Given the user's current location and the list of open POI tasks, determines
 * which (if any) POI type is currently inside its geofence.
 * If multiple are inside, returns the one with the smallest distance.
 *
 * Also handles notification firing and Firestore alert-seen writes.
 */
function buildPlacesMap(): PlacesMap {
  const map: PlacesMap = {};
  for (const [poiType, cache] of placeCache) {
    if (cache.places[0]) { map[poiType] = cache.places[0]; }
  }
  return map;
}

async function checkProximity(
  uid: string,
  coords: Coordinates,
  tasks: Task[],
  onUpdate: ProximityCallback,
): Promise<void> {
  // Collect unique POI type strings from undone tasks that have a poi field.
  const undonePoiTasks = tasks.filter(t => !t.done && t.poi != null);
  const uniquePoiTypes = [...new Set(undonePoiTasks.map(t => t.poi as string))];

  if (uniquePoiTypes.length === 0) {
    if (currentNearbyType !== null) {
      currentNearbyType = null;
      onUpdate(null, null, buildPlacesMap());
    }
    return;
  }

  // For each POI type, find the nearest place and compute the user's distance.
  type Candidate = { poiType: string; place: NearbyPlace; distance: number };
  const candidates: Candidate[] = [];

  await Promise.all(
    uniquePoiTypes.map(async poiType => {
      const place = await getNearestPlace(poiType, coords.lat, coords.lng);
      if (!place) { return; }
      const distance = getDistanceMeters(
        coords.lat, coords.lng, place.lat, place.lng,
      );
      if (distance <= getGeofenceRadius(poiType)) {
        candidates.push({ poiType, place, distance });
      }
    }),
  );

  // Rule: only one nearby POI at a time — pick the closest.
  candidates.sort((a, b) => a.distance - b.distance);
  const winner = candidates[0] ?? null;
  const newNearbyType = winner?.poiType ?? null;

  // Always emit updated place data so NearbyCard idle rows refresh.
  const allPlaces = buildPlacesMap();
  onUpdate(newNearbyType, winner?.place ?? null, allPlaces);

  // Notification + Firestore write only on entry transition.
  if (newNearbyType !== currentNearbyType) {
    currentNearbyType = newNearbyType;

    // Fire a notification on entry (null → type, or type switch).
    if (winner) {
      const today = todayISO();
      // Find the highest-priority task for this POI type (first undone one).
      const matchingTask = undonePoiTasks.find(t => t.poi === winner.poiType);
      if (
        matchingTask &&
        !matchingTask.done &&
        matchingTask.poiAlertSeenDate !== today
      ) {
        try {
          await fireNotification(matchingTask, winner.place, winner.distance);
          await markPoiAlertSeen(uid, matchingTask.id, today);
        } catch (err) {
          console.warn('[proximity] notification failed', err);
        }
      }
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start monitoring the user's proximity to POI tasks.
 *
 * @param uid              Firebase user ID (for Firestore writes).
 * @param tasks            Live list of today's tasks (pass effectiveTasks from
 *                         TodayScreen so optimistic done state is respected).
 * @param onNearbyChanged  Callback fired whenever the nearest POI type changes.
 *                         Called with `null` when the user leaves all geofences.
 * @returns                A cleanup function — call it on component unmount.
 */
export function startProximityMonitoring(
  uid: string,
  tasks: Task[],
  onUpdate: ProximityCallback,
): () => void {
  if (isMonitoring) { stopProximityMonitoring(); }
  isMonitoring = true;

  // Keep a mutable ref to the latest tasks so the location callback always
  // sees fresh data without needing to be re-registered.
  let latestTasks = tasks;

  // Wire up the global updater so updateProximityTasks() reaches this closure.
  _latestTasksUpdater = (newTasks: Task[]) => {
    latestTasks = newTasks;
  };

  startTracking(
    async (coords: Coordinates) => {
      if (!isMonitoring) { return; }
      await checkProximity(uid, coords, latestTasks, onUpdate);
    },
    (err) => {
      console.warn('[proximity] location error', err.code, err.message);
    },
  );

  return () => {
    isMonitoring = false;
    _latestTasksUpdater = null;
    stopProximityMonitoring();
  };
}

/**
 * Update the task list used by the active proximity monitor without
 * restarting location tracking. Call this whenever TodayScreen's task
 * list changes (Firestore snapshot or optimistic toggle).
 *
 * `_latestTasksUpdater` is set by startProximityMonitoring() and cleared
 * by its cleanup function, so this is a safe no-op when no monitor is active.
 */
let _latestTasksUpdater: ((tasks: Task[]) => void) | null = null;

export function updateProximityTasks(tasks: Task[]): void {
  _latestTasksUpdater?.(tasks);
}

/**
 * Update the live POI radius preferences used by the active proximity monitor
 * (KAN-25). Call this whenever the Firestore preferences subscription fires.
 *
 * The new radii take effect on the NEXT location update — no restart needed.
 * Safe to call before `startProximityMonitoring` (sets module-level state that
 * persists until the next `stopProximityMonitoring` call).
 *
 * @param prefs - Plain `Record<string, number>` map of poiType → radiusMeters,
 *                as returned by `subscribeToPoiPreferences`.
 */
export function updateProximityPoiPreferences(prefs: Record<string, number>): void {
  poiRadiusPrefs = prefs;
  // Invalidate the search cache so the next location tick re-searches with
  // the updated radii (prevents stale "too-small bubble" results).
  placeCache.clear();
}

/** Stop all proximity monitoring and clear internal state. */
export function stopProximityMonitoring(): void {
  isMonitoring = false;
  stopTracking();
  placeCache.clear();
  currentNearbyType = null;
  _latestTasksUpdater = null;
  poiRadiusPrefs = {};
}
