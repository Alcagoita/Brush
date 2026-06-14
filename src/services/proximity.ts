/**
 * proximity.ts — POI proximity detection engine.
 *
 * Flow:
 *   1. On start: one background Places API search within NEARBY_RADIUS_M.
 *   2. Results split by distance:
 *        < HERO_RADIUS_M   → orange hero card (nearbyPoiType set)
 *        < NEARBY_RADIUS_M → grey "approaching" card (poiPlaces entry)
 *   3. Every POSITION_CHECK_INTERVAL_MS: get device position.
 *      If moved ≥ MIN_MOVEMENT_M from last search origin → re-run search.
 *      This keeps battery impact minimal — the API is never called unless
 *      the user has meaningfully changed location.
 *   4. No native geofences needed for card display — distance is computed
 *      directly from the search results.
 *
 * Notifications (KAN-28):
 *   Fires once when a type transitions INTO the hero zone (< HERO_RADIUS_M).
 *   Suppressed if the type was already alerted today or during quiet hours.
 */

import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform } from 'react-native';
import WearNotificationModule from '../native/WearNotificationModule';
import { Coordinates, getPositionLowAccuracy } from './geolocation';
import { getDistanceMeters, searchNearbyPlaces, NearbyPlace, placeTypeLabel } from './maps';
import { markAllPoiAlertsSeen } from './firestore';
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
 * Nearest known place per POI type string.
 * A type is present in this map only when a place was found within
 * NEARBY_RADIUS_M. Includes the hero type's place (< HERO_RADIUS_M)
 * as well as grey-range places (HERO_RADIUS_M–NEARBY_RADIUS_M).
 * Used by NearbyCard to display distance and place name on each row.
 */
export type PlacesMap = Partial<Record<string, NearbyPlace>>;

/** Callback fired whenever nearby state or place data changes. */
export type ProximityCallback = (
  nearbyPoiType: string | null,
  nearbyPlace:   NearbyPlace | null,
  allPlaces:     PlacesMap,
) => void;

// ─── Constants ────────────────────────────────────────────────────────────────

/** Under this distance: show orange hero card + fire notification. */
const HERO_RADIUS_M = 100;

/** Under this distance: show grey approaching card. Max search radius. */
export const NEARBY_RADIUS = 400; // metres — exported for copy.ts reference

/** How often we check the device position for movement. */
const POSITION_CHECK_INTERVAL_MS = 3 * 60 * 1_000; // 3 minutes

/** Minimum movement from last search origin before re-calling the Places API. */
const MIN_MOVEMENT_M = 200;

/** Default geofence radius for custom POI types (exit-prompt only). */
const DEFAULT_GEOFENCE_RADIUS = 75;

/** Notifee Android channel id for proximity alerts. */
const CHANNEL_ID = 'proximity_alerts';

// ─── Internal state ───────────────────────────────────────────────────────────

/** Where the last Places API search was run from. Movement gate. */
let _lastSearchCoords: { lat: number; lng: number } | null = null;

/** Currently active orange-hero POI type. Null when nothing is < HERO_RADIUS_M. */
let _currentNearbyType: string | null = null;

/** Count of undone POI tasks from the last search call. Detects new POI tasks. */
let _prevUndonePoiTaskCount = 0;

/**
 * POI types that have already triggered a notification today.
 * Prevents re-firing on every re-search when the user stays close.
 */
const _alertedTodayTypes = new Set<string>();

/** Guards against concurrent search calls. */
let _isSearching = false;

/**
 * Optional tap into the GPS stream (KAN-75 indoor detection).
 * Every position fix is forwarded here so indoor detection can run without
 * a competing GPS watcher.
 */
let _locationTap: ((lat: number, lng: number, accuracy: number) => void) | null = null;

/** Whether nearby-POI notifications are enabled (KAN-142). */
let notifNearbyEnabled = true;

/** Whether exit-prompt notifications are enabled. */
let exitPromptEnabled = true;

/** User-saved POI radius preferences (KAN-25). */
let poiRadiusPrefs: Record<string, number> = {};

// ─── Native geofence state (exit-prompt only, KAN-119) ───────────────────────

const geofenceEntryTimes = new Map<string, number>();
const EXIT_PROMPT_MIN_DWELL_MS = 5 * 60 * 1_000;

// ─── Public flag helpers ──────────────────────────────────────────────────────

export function updateNotifNearbyEnabled(enabled: boolean): void {
  notifNearbyEnabled = enabled;
}

export function updateExitPromptPref(enabled: boolean): void {
  exitPromptEnabled = enabled;
}

export function updateProximityPoiPreferences(prefs: Record<string, number>): void {
  poiRadiusPrefs = prefs;
  // Force a re-search on next position check by resetting the movement gate.
  _lastSearchCoords = null;
}

export function isQuietHours(): boolean {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 8;
}

// ─── Radius helper ────────────────────────────────────────────────────────────

function getGeofenceRadius(poiType: string): number {
  return poiRadiusPrefs[poiType]
    ?? (POI_GEOFENCE_RADIUS as Record<string, number>)[poiType]
    ?? DEFAULT_GEOFENCE_RADIUS;
}

// ─── Notification channel ─────────────────────────────────────────────────────

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

async function fireNotification(poiLabel: string, taskCount: number): Promise<void> {
  await ensureChannel();
  await notifee.displayNotification({
    title: COPY.notification.proximityTitle(poiLabel),
    body:  COPY.notification.proximityBody(taskCount),
    data:  { screen: 'Today' },
    android: {
      channelId:   CHANNEL_ID,
      importance:  AndroidImportance.HIGH,
      pressAction: { id: 'default' },
    },
    ios: { sound: 'default' },
  });

  if (Platform.OS === 'android') {
    WearNotificationModule?.sendProximityAlert(
      COPY.notification.proximityTitle(poiLabel),
      COPY.notification.proximityBody(taskCount),
      '',
    );
  }
}

// ─── Exit-prompt geofence handler (KAN-119) ───────────────────────────────────

export async function handleGeofenceExit(
  geofenceId: string,
  uid: string,
  tasks: Task[],
): Promise<void> {
  const entryTime = geofenceEntryTimes.get(geofenceId);
  geofenceEntryTimes.delete(geofenceId);

  if (!exitPromptEnabled) { return; }
  if (!entryTime || Date.now() - entryTime < EXIT_PROMPT_MIN_DWELL_MS) { return; }

  const parsed = parseGeofenceId(geofenceId);
  if (!parsed) { return; }

  const { poiType } = parsed;
  const today = todayISO();
  const task  = tasks.find(t => !t.done && t.poi === poiType && t.exitPromptSeenDate !== today);
  if (!task) { return; }

  try {
    await fireExitPrompt({ taskId: task.id, taskTitle: task.title });
    await markExitPromptSeen(uid, task.id, today);
  } catch (err) {
    console.warn('[proximity] exit prompt failed', err);
  }
}

// ─── Core: one-shot proximity search ─────────────────────────────────────────

/**
 * Get current position, search Places API for all needed POI types within
 * NEARBY_RADIUS_M, split results by distance, and fire onUpdate.
 *
 * Non-blocking: always called as fire-and-forget (`.catch` at call sites).
 * Returns immediately if a search is already in progress.
 */
async function runProximitySearch(
  uid: string,
  tasks: Task[],
  onUpdate: ProximityCallback,
): Promise<void> {
  if (_isSearching) { return; }
  _isSearching = true;

  try {
    const coords = await getPositionLowAccuracy();
    _locationTap?.(coords.lat, coords.lng, coords.accuracy);

    const undonePoiTasks = tasks.filter(t => !t.done && t.poi != null);
    const uniquePoiTypes = [...new Set(undonePoiTasks.map(t => t.poi as string))];

    if (uniquePoiTypes.length === 0) {
      _currentNearbyType = null;
      onUpdate(null, null, {});
      _lastSearchCoords = { lat: coords.lat, lng: coords.lng };
      return;
    }

    // One API call covers all POI types.
    let results: Record<string, NearbyPlace[]> = {};
    try {
      results = await searchNearbyPlaces(coords.lat, coords.lng, uniquePoiTypes, NEARBY_RADIUS);
    } catch {
      // Network/timeout — keep showing whatever was shown before.
      return;
    }

    _lastSearchCoords = { lat: coords.lat, lng: coords.lng };

    // Split results: orange hero (< 100 m) vs. grey approaching (100–400 m).
    let heroType:  string | null = null;
    let heroPlace: NearbyPlace | null = null;
    let heroDistance = Infinity;
    const allPlaces: PlacesMap = {};

    for (const poiType of uniquePoiTypes) {
      const nearest = results[poiType]?.[0];
      if (!nearest) { continue; }

      const dist = nearest.distanceMeters;
      if (dist >= NEARBY_RADIUS) { continue; }

      // All places within NEARBY_RADIUS go into the map (for grey rows).
      allPlaces[poiType] = nearest;

      // Closest place under HERO_RADIUS_M wins the orange hero.
      if (dist < HERO_RADIUS_M && dist < heroDistance) {
        heroType     = poiType;
        heroPlace    = nearest;
        heroDistance = dist;
      }
    }

    // Fire notification when a new type enters the hero zone.
    if (heroType !== null && heroType !== _currentNearbyType) {
      const today    = todayISO();
      const eligible = undonePoiTasks.filter(
        t => t.poi === heroType && t.poiAlertSeenDate !== today,
      );
      if (
        eligible.length > 0 &&
        notifNearbyEnabled &&
        !isQuietHours() &&
        !_alertedTodayTypes.has(heroType)
      ) {
        _alertedTodayTypes.add(heroType);
        fireNotification(placeTypeLabel(heroType), eligible.length).catch(err =>
          console.warn('[proximity] notification failed', err),
        );
        markAllPoiAlertsSeen(uid, eligible.map(t => t.id), today).catch(err =>
          console.warn('[proximity] markAllPoiAlertsSeen failed', err),
        );
      }
    }

    // Reset today-alert tracking when hero clears (user walked away).
    if (heroType === null && _currentNearbyType !== null) {
      _alertedTodayTypes.delete(_currentNearbyType);
    }

    _currentNearbyType = heroType;
    onUpdate(heroType, heroPlace, allPlaces);
  } finally {
    _isSearching = false;
  }
}

// ─── Position check (runs on 3-minute timer) ──────────────────────────────────

async function checkPositionAndMaybeSearch(
  uid: string,
  getLatestTasks: () => Task[],
  onUpdate: ProximityCallback,
): Promise<void> {
  let coords: Coordinates;
  try {
    coords = await getPositionLowAccuracy();
  } catch {
    return; // location unavailable — skip this tick silently
  }

  _locationTap?.(coords.lat, coords.lng, coords.accuracy);

  // Always search on first tick (no previous origin).
  if (!_lastSearchCoords) {
    await runProximitySearch(uid, getLatestTasks(), onUpdate);
    return;
  }

  const moved = getDistanceMeters(
    coords.lat, coords.lng,
    _lastSearchCoords.lat, _lastSearchCoords.lng,
  );

  if (moved >= MIN_MOVEMENT_M) {
    await runProximitySearch(uid, getLatestTasks(), onUpdate);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run a one-shot proximity search.
 *
 * Gets the device position, queries the Places API for all POI types needed by
 * the given tasks, splits results by distance (hero < 100 m, grey 100–400 m),
 * fires a notification on first hero entry, and calls onUpdate with the results.
 *
 * Guards against concurrent calls with an internal flag — safe to call from
 * multiple places (effect, task-add trigger, movement poll) without risk of
 * duplicate in-flight searches.
 *
 * Called directly by useTodayScreen — no monitoring lifecycle needed here.
 */
export { runProximitySearch };

/**
 * Returns the coordinates of the last completed search, or null if no search
 * has run yet. Used by the movement gate in useTodayScreen to decide whether
 * to re-search.
 */
export function getLastSearchCoords(): { lat: number; lng: number } | null {
  return _lastSearchCoords;
}

/** Reset deduplication state (call on sign-out or day boundary). */
export function resetProximityState(): void {
  _currentNearbyType      = null;
  _lastSearchCoords       = null;
  _isSearching            = false;
  _prevUndonePoiTaskCount = 0;
  _alertedTodayTypes.clear();
  poiRadiusPrefs = {};

  geofenceEntryTimes.clear();
  NativeGeofence.removeAllGeofences().catch(() => {});
}

/**
 * Register a callback that receives every GPS fix (KAN-75 indoor detection).
 * Pass null to unregister.
 */
export function setLocationTap(
  cb: ((lat: number, lng: number, accuracy: number) => void) | null,
): void {
  _locationTap = cb;
}

/**
 * Trigger an on-demand search (e.g. user taps a retry button).
 * Resets the movement gate so the search always runs.
 */
export async function scanNow(
  uid: string,
  tasks: Task[],
  onUpdate: ProximityCallback,
): Promise<void> {
  _lastSearchCoords = null; // force search regardless of movement
  await runProximitySearch(uid, tasks, onUpdate);
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

export function __setGeofenceEntryTime(geofenceId: string, timestamp: number): void {
  geofenceEntryTimes.set(geofenceId, timestamp);
}

export function __clearGeofenceEntryTimes(): void {
  geofenceEntryTimes.clear();
}
