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
import WearNotificationModule from '../native/WearNotificationModule';
import { Coordinates, startTracking, stopTracking, setTrackingAccuracy } from './geolocation';
import { getDistanceMeters, searchNearbyPlaces, NearbyPlace, placeTypeLabel } from './maps';
import { markPoiAlertSeen, markAllPoiAlertsSeen } from './firestore';
import { PoiType, Task, POI_GEOFENCE_RADIUS } from '../types';
import {
  NativeGeofence,
  geofenceEmitter,
  buildGeofenceId,
  parseGeofenceId,
  GEOFENCE_ENTRY_EVENT,
  GEOFENCE_EXIT_EVENT,
} from './nativeGeofence';
import { fireExitPrompt } from './notifications';
import { markExitPromptSeen } from './firestore';
import { COPY } from '../constants/copy';
import { todayISO } from '../utils/date';

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
 * Unified proximity threshold for both foreground display (NearbyCard / ring
 * sublabel) and background geofence registration. KAN-142.
 */
export const NEARBY_RADIUS = 400; // metres

/**
 * Default geofence radius in metres for custom (non-built-in) POI types.
 * Custom category types (e.g. "gym", "restaurant") don't appear in
 * POI_GEOFENCE_RADIUS, so we fall back to the larger café/supermarket radius.
 * Used only when NEARBY_RADIUS is not applicable (e.g. exit-prompt geofences).
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
 * Pause context — stored when startProximityMonitoring() runs so that
 * pauseGeofenceMonitoring() / resumeGeofenceMonitoring() can operate without
 * the caller having to pass uid/tasks/callback again (KAN-52).
 */
interface PauseContext {
  uid: string;
  getLatestTasks: () => Task[];
  onUpdate: ProximityCallback;
}
let _pauseContext: PauseContext | null = null;
let _isPaused = false;

/**
 * Optional tap into the GPS stream (KAN-75 indoor detection).
 * When set, every location fix from `startTracking` is forwarded to this
 * callback so the indoor detection service can receive feeds without
 * starting a competing GPS watcher.
 */
let _locationTap: ((lat: number, lng: number, accuracy: number) => void) | null = null;

/**
 * Whether nearby-POI notifications are enabled (KAN-142).
 * Controlled by `userPreferences/{uid}.notif_nearby_enabled`.
 * Defaults to true so notifications fire before the user has saved a pref.
 */
let notifNearbyEnabled = true;

/** Update the nearby-notification enabled flag from a preferences subscription. */
export function updateNotifNearbyEnabled(enabled: boolean): void {
  notifNearbyEnabled = enabled;
}

/**
 * Returns true when local time is in the quiet window (10pm–8am).
 * No proximity notifications are delivered during this period (KAN-142).
 */
export function isQuietHours(): boolean {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 8;
}

/**
 * Distance threshold for switching GPS accuracy mode (KAN-55).
 *
 * When the nearest cached POI is within this distance the engine switches to
 * fine (GPS) mode for precise geofence detection. Beyond this threshold it
 * switches to coarse (cell/WiFi) mode to save battery.
 *
 * 500 m gives ~2–3 min of fine GPS before entering a 50–75 m geofence at
 * walking pace — enough time for the engine to detect the crossing.
 */
const FINE_ACCURACY_THRESHOLD_M = 500;

// ─── Native geofence registration (KAN-56) ───────────────────────────────────

/** Subscription for the native geofence entry event emitter. */
let geofenceEntrySubscription: ReturnType<NonNullable<typeof geofenceEmitter>['addListener']> | null = null;
/** Subscription for the native geofence exit event emitter. */
let geofenceExitSubscription:  ReturnType<NonNullable<typeof geofenceEmitter>['addListener']> | null = null;

/**
 * Tracks the Unix timestamp (ms) at which the device entered each geofence.
 * Used to enforce the 5-minute dwell requirement before firing an exit prompt.
 * Key: geofenceId. Cleared on geofence exit or when monitoring stops.
 */
const geofenceEntryTimes = new Map<string, number>();

/** Minimum dwell time inside a geofence before an exit prompt may fire (ms). */
const EXIT_PROMPT_MIN_DWELL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Whether the exit-prompt notification is enabled.
 * Updated via updateExitPromptPref() when userPreferences changes.
 */
let exitPromptEnabled = true;

/** Update the exit-prompt enabled flag from a userPreferences subscription. */
export function updateExitPromptPref(enabled: boolean): void {
  exitPromptEnabled = enabled;
}

/**
 * Handles a geofence exit event from the native layer.
 *
 * Guards:
 *   1. exitPromptEnabled — setting is off
 *   2. dwell < 5 min     — brief drive-by, not a meaningful visit
 *   3. No undone task    — nothing to prompt about
 *   4. Task already done — user brushed while inside
 *   5. exitPromptSeenDate === today — already prompted once today
 */
export async function handleGeofenceExit(
  geofenceId: string,
  uid: string,
  tasks: Task[],
): Promise<void> {
  const entryTime = geofenceEntryTimes.get(geofenceId);
  geofenceEntryTimes.delete(geofenceId);

  if (!exitPromptEnabled) { return; }

  // Enforce minimum dwell time.
  if (!entryTime || Date.now() - entryTime < EXIT_PROMPT_MIN_DWELL_MS) { return; }

  const parsed = parseGeofenceId(geofenceId);
  if (!parsed) { return; }

  const { poiType } = parsed;
  const today = new Date().toISOString().split('T')[0];

  const task = tasks.find(
    t => !t.done && t.poi === poiType && t.exitPromptSeenDate !== today,
  );
  if (!task) { return; }

  // Resolve store name from the place cache for richer copy (optional).
  const cached    = placeCache.get(poiType);
  const storeName = cached?.places[0]?.name;

  try {
    await fireExitPrompt({ taskId: task.id, taskTitle: task.title, storeName });
    await markExitPromptSeen(uid, task.id, today);
  } catch (err) {
    console.warn('[proximity] exit prompt failed', err);
  }
}

/**
 * Register native OS geofences for all active undone POI tasks.
 *
 * For each unique POI type: resolve the nearest place from the cache, then
 * register a native geofence at those coordinates. Stores a mapping of
 * geofence ID → { poiType, taskIds } so the entry handler can look up context.
 *
 * Clears and re-registers all geofences on each call to stay in sync with
 * the current task list (tasks added/completed, POI prefs changed).
 */
async function syncNativeGeofences(
  uid: string,
  tasks: Task[],
  onUpdate: ProximityCallback,
): Promise<void> {
  await NativeGeofence.removeAllGeofences();

  const undonePoiTasks = tasks.filter(t => !t.done && t.poi != null);
  const uniquePoiTypes = [...new Set(undonePoiTasks.map(t => t.poi as string))];

  for (const poiType of uniquePoiTypes) {
    const cached = placeCache.get(poiType);
    if (!cached?.places.length) { continue; }

    const nearest = cached.places[0];
    const geoId   = buildGeofenceId(poiType, nearest.placeId);

    try {
      await NativeGeofence.registerGeofence(geoId, nearest.lat, nearest.lng, NEARBY_RADIUS);
    } catch (err) {
      console.warn('[proximity] failed to register geofence', geoId, err);
    }
  }
}

/**
 * Handle a native geofence entry event (KAN-56 / KAN-142).
 *
 * Fires one notification per POI type per day. Suppressed during quiet hours
 * (10pm–8am) or when notif_nearby_enabled is off. Marks ALL undone tasks of
 * the POI type as alerted so the limit is per-type, not per-task.
 */
async function handleGeofenceEntry(
  geofenceId: string,
  uid: string,
  tasks: Task[],
  onUpdate: ProximityCallback,
): Promise<void> {
  const parsed = parseGeofenceId(geofenceId);
  if (!parsed) {
    console.warn('[proximity] unrecognised geofence ID', geofenceId);
    return;
  }

  const { poiType } = parsed;
  const today = todayISO();

  // Find all undone tasks of this type that haven't been alerted today.
  const eligibleTasks = tasks.filter(
    t => !t.done && t.poi === poiType && t.poiAlertSeenDate !== today,
  );
  if (eligibleTasks.length === 0) { return; }

  // Find the nearest cached place for UI context (NearbyCard hero state).
  const cached = placeCache.get(poiType);
  const place  = cached?.places[0] ?? null;

  if (place) {
    onUpdate(poiType, place, buildPlacesMap());
  }

  // Suppress during quiet hours or when the user has disabled nearby alerts.
  if (!notifNearbyEnabled || isQuietHours()) { return; }

  try {
    const poiLabel = placeTypeLabel(poiType);
    await fireNotification(poiLabel, eligibleTasks.length);
    await markAllPoiAlertsSeen(uid, eligibleTasks.map(t => t.id), today);
  } catch (err) {
    console.warn('[proximity] geofence notification failed', err);
  }
}

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
  poiLabel: string,
  taskCount: number,
): Promise<void> {
  await ensureChannel();

  await notifee.displayNotification({
    title: COPY.notification.proximityTitle(poiLabel),
    body:  COPY.notification.proximityBody(taskCount),
    // KAN-28: data payload for deep linking — press handler navigates to Today.
    data: { screen: 'Today' },
    android: {
      channelId:   CHANNEL_ID,
      importance:  AndroidImportance.HIGH,
      pressAction: { id: 'default' },
    },
    ios: {
      sound: 'default',
    },
  });

  // KAN-36: forward the alert to the paired Wear OS watch (Android only).
  if (Platform.OS === 'android') {
    WearNotificationModule?.sendProximityAlert(
      COPY.notification.proximityTitle(poiLabel),
      COPY.notification.proximityBody(taskCount),
      '',
    );
  }
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
      const radius = NEARBY_RADIUS * 2; // search bubble wider than the display threshold
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
      if (distance <= NEARBY_RADIUS) {
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

  // ── Adaptive accuracy (KAN-55) ─────────────────────────────────────────────
  // Switch to fine GPS when within approach distance of any cached POI;
  // switch back to coarse (cell/WiFi) when all POIs are far away.
  // setTrackingAccuracy() is a no-op if the mode hasn't changed.
  const nearestCachedDist = Math.min(
    ...Object.values(allPlaces).map(p => p?.distanceMeters ?? Infinity),
  );
  setTrackingAccuracy(nearestCachedDist <= FINE_ACCURACY_THRESHOLD_M ? 'fine' : 'coarse');

  // Notification + Firestore write only on entry transition.
  if (newNearbyType !== currentNearbyType) {
    currentNearbyType = newNearbyType;

    // Fire a notification on entry (null → type, or type switch).
    if (winner && notifNearbyEnabled && !isQuietHours()) {
      const today = todayISO();
      // Collect all undone tasks of this type that haven't been alerted today.
      const eligibleTasks = undonePoiTasks.filter(
        t => t.poi === winner.poiType && t.poiAlertSeenDate !== today,
      );
      if (eligibleTasks.length > 0) {
        try {
          const poiLabel = placeTypeLabel(winner.poiType);
          await fireNotification(poiLabel, eligibleTasks.length);
          await markAllPoiAlertsSeen(uid, eligibleTasks.map(t => t.id), today);
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
  _isPaused = false;

  // Keep a mutable ref to the latest tasks so callbacks always see fresh data.
  let latestTasks = tasks;

  // Store context for pause/resume — see pauseGeofenceMonitoring() (KAN-52).
  _pauseContext = {
    uid,
    getLatestTasks: () => latestTasks,
    onUpdate,
  };

  // Wire up the global updater so updateProximityTasks() reaches this closure.
  _latestTasksUpdater = (newTasks: Task[]) => {
    latestTasks = newTasks;
    // Re-sync native geofences whenever the task list changes (KAN-56).
    syncNativeGeofences(uid, newTasks, onUpdate).catch(err =>
      console.warn('[proximity] geofence sync failed', err),
    );
  };

  // ── Native geofence entry listener (KAN-56) ──────────────────────────────
  // Listen for OS geofence boundary crossing events and handle them in JS.
  if (geofenceEmitter) {
    geofenceEntrySubscription = geofenceEmitter.addListener(
      GEOFENCE_ENTRY_EVENT,
      ({ geofenceId }: { geofenceId: string }) => {
        // Stamp dwell start time for exit-prompt debounce (KAN-119).
        geofenceEntryTimes.set(geofenceId, Date.now());
        handleGeofenceEntry(geofenceId, uid, latestTasks, onUpdate).catch(err =>
          console.warn('[proximity] geofence entry handler failed', err),
        );
      },
    );

    // ── Native geofence exit listener (KAN-119) ──────────────────────────
    geofenceExitSubscription = geofenceEmitter.addListener(
      GEOFENCE_EXIT_EVENT,
      ({ geofenceId }: { geofenceId: string }) => {
        handleGeofenceExit(geofenceId, uid, latestTasks).catch(err =>
          console.warn('[proximity] geofence exit handler failed', err),
        );
      },
    );
  }

  // ── watchPosition (display-only after KAN-56) ────────────────────────────
  // watchPosition is now only responsible for keeping NearbyCard distance rows
  // up to date. Notification delivery is handled by native geofences above.
  // Runs at coarse accuracy by default (KAN-55); switches to fine when near a POI.
  startTracking(
    async (coords: Coordinates) => {
      if (!isMonitoring) { return; }
      // Forward to indoor detection tap (KAN-75) — no-op when null.
      _locationTap?.(coords.lat, coords.lng, coords.accuracy);
      await checkProximity(uid, coords, latestTasks, onUpdate);
    },
    (err) => {
      console.warn('[proximity] location error', err.code, err.message);
    },
  );

  // Initial geofence registration for tasks already in the list.
  //
  // Ordering note: geofenceEmitter.addListener() is set up BEFORE this call,
  // so any INITIAL_TRIGGER_ENTER event fired by the OS immediately after a
  // geofence is registered (i.e. the user is already inside the boundary) is
  // guaranteed to be caught by the listener.
  //
  // A race condition where the user crosses a boundary *during* registration
  // is not possible — the OS cannot fire an entry event for a geofence that
  // has not yet been registered. The ~100ms registration window is therefore
  // safe. Documented here for future reference.
  syncNativeGeofences(uid, tasks, onUpdate).catch(err =>
    console.warn('[proximity] initial geofence sync failed', err),
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

/**
 * Pause geofence monitoring while keeping the engine alive (KAN-52).
 *
 * Stops location tracking and removes all native OS geofences so the GPS radio
 * goes idle. The engine state (`isMonitoring = true`) is preserved so that
 * `resumeGeofenceMonitoring()` can restart transparently.
 *
 * Intended use: called by TodayScreen when `shouldPauseForBattery()` returns
 * true (battery < 20% and the user has enabled the toggle).
 *
 * No-op if the engine is not monitoring or is already paused.
 */
export function pauseGeofenceMonitoring(): void {
  if (!isMonitoring || _isPaused) { return; }
  _isPaused = true;

  stopTracking();

  geofenceEntrySubscription?.remove();
  geofenceEntrySubscription = null;
  geofenceExitSubscription?.remove();
  geofenceExitSubscription = null;
  geofenceEntryTimes.clear();

  NativeGeofence.removeAllGeofences().catch(err =>
    console.warn('[proximity] pauseGeofenceMonitoring: removeAllGeofences failed', err),
  );
}

/**
 * Resume geofence monitoring after a pause (KAN-52).
 *
 * Re-registers native geofences and restarts location tracking using the context
 * captured when startProximityMonitoring() was originally called. The caller does
 * not need to pass any arguments — all state is kept internally.
 *
 * No-op if the engine is not monitoring, is not paused, or the pause context has
 * been cleared (i.e. stopProximityMonitoring() was already called).
 */
export function resumeGeofenceMonitoring(): void {
  if (!isMonitoring || !_isPaused || !_pauseContext) { return; }
  _isPaused = false;

  const { uid, getLatestTasks, onUpdate } = _pauseContext;

  // Re-attach native geofence entry listener before registering geofences so
  // that INITIAL_TRIGGER_ENTER events (fired immediately on registration when
  // the user is already inside a boundary) are not lost.
  if (geofenceEmitter) {
    geofenceEntrySubscription = geofenceEmitter.addListener(
      GEOFENCE_ENTRY_EVENT,
      ({ geofenceId }: { geofenceId: string }) => {
        geofenceEntryTimes.set(geofenceId, Date.now());
        handleGeofenceEntry(geofenceId, uid, getLatestTasks(), onUpdate).catch(err =>
          console.warn('[proximity] geofence entry handler failed', err),
        );
      },
    );
    geofenceExitSubscription = geofenceEmitter.addListener(
      GEOFENCE_EXIT_EVENT,
      ({ geofenceId }: { geofenceId: string }) => {
        handleGeofenceExit(geofenceId, uid, getLatestTasks()).catch(err =>
          console.warn('[proximity] geofence exit handler failed', err),
        );
      },
    );
  }

  // Re-register native geofences for all current undone POI tasks.
  syncNativeGeofences(uid, getLatestTasks(), onUpdate).catch(err =>
    console.warn('[proximity] resumeGeofenceMonitoring: geofence sync failed', err),
  );

  // Restart watchPosition (display-only — drives NearbyCard distance rows).
  startTracking(
    async (coords: Coordinates) => {
      if (!isMonitoring || _isPaused) { return; }
      await checkProximity(uid, coords, getLatestTasks(), onUpdate);
    },
    (err) => {
      console.warn('[proximity] location error', err.code, err.message);
    },
  );
}

/** Stop all proximity monitoring and clear internal state. */
export function stopProximityMonitoring(): void {
  isMonitoring = false;
  _isPaused = false;
  _pauseContext = null;
  _locationTap = null;
  stopTracking();
  placeCache.clear();
  currentNearbyType = null;
  _latestTasksUpdater = null;
  poiRadiusPrefs = {};

  // ── Native geofence cleanup (KAN-56 / KAN-119) ────────────────────────────
  geofenceEntrySubscription?.remove();
  geofenceEntrySubscription = null;
  geofenceExitSubscription?.remove();
  geofenceExitSubscription = null;
  geofenceEntryTimes.clear();
  NativeGeofence.removeAllGeofences().catch(err =>
    console.warn('[proximity] failed to remove geofences on stop', err),
  );
}

/**
 * Register a callback that receives every GPS fix while the outdoor proximity
 * engine is running (KAN-75). Used by the indoor detection service to feed
 * location data without starting a competing GPS watcher.
 *
 * The tap is automatically cleared when `stopProximityMonitoring()` is called.
 * Pass `null` to unregister explicitly.
 */
export function setLocationTap(
  cb: ((lat: number, lng: number, accuracy: number) => void) | null,
): void {
  _locationTap = cb;
}

// ─── Test helpers (prefix __ — test files only) ───────────────────────────────

/**
 * Seed the geofence entry timestamp for a given geofence ID.
 * Only for use in Jest tests — simulates the GEOFENCE_ENTRY_EVENT stamp.
 */
export function __setGeofenceEntryTime(geofenceId: string, timestamp: number): void {
  geofenceEntryTimes.set(geofenceId, timestamp);
}

/**
 * Clear the geofenceEntryTimes map.
 * Only for use in Jest tests.
 */
export function __clearGeofenceEntryTimes(): void {
  geofenceEntryTimes.clear();
}
