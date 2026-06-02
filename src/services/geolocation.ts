/**
 * geolocation.ts — Background location tracking service (KAN-22).
 *
 * Library: react-native-geolocation-service v5
 * (Selected as the "or equivalent" option — fully open-source, supports RN
 * New Architecture, no proprietary native binary required.)
 *
 * Permissions requested:
 *   Android: ACCESS_FINE_LOCATION + ACCESS_BACKGROUND_LOCATION (API 29+)
 *   iOS:     Always (NSLocationAlwaysAndWhenInUseUsageDescription)
 *
 * Rules (from CLAUDE.md / KAN-22):
 *   - Request `always` permission so geofences fire in the background.
 *   - Only one POI is "currently nearby" at a time (closest wins).
 *   - A geofence notification fires once per entry per day.
 *
 * The proximity check / geofence logic lives in KAN-24 and consumes the
 * Coordinates emitted by watchPosition() below.
 */

import { Alert, Linking, Platform } from 'react-native';
import Geolocation, {
  GeoError,
  GeoPosition,
  GeoWatchOptions,
} from 'react-native-geolocation-service';
import { check, request, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Coordinates {
  lat: number;
  lng: number;
  /** Accuracy radius in metres. */
  accuracy: number;
  /** Unix timestamp (ms). */
  timestamp: number;
}

export type LocationCallback = (coords: Coordinates) => void;
export type LocationErrorCallback = (error: GeoError) => void;

export type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'unavailable';

// ─── Watch options ─────────────────────────────────────────────────────────────

/**
 * Options for continuous tracking (KAN-54 — tuned for battery efficiency).
 *
 * distanceFilter 25 m  — halves wakeups vs. the old 10 m value.
 *                        Maximum detection latency for a 50 m ATM fence is
 *                        ~2 steps at walking pace (~3 m/s) = ~8 s. Acceptable.
 *
 * interval 8 s         — Android preferred poll cadence. Battery Historian showed
 *                        no excess wakeups at this value; kept unchanged.
 *
 * fastestInterval 4 s  — Android floor. Kept to avoid starving the engine when
 *                        the user is moving quickly toward a POI.
 *
 * ios 'best'           — Replaces 'bestForNavigation' (turn-by-turn nav mode,
 *                        maximum drain). 'best' is sufficient for 50 m geofences
 *                        and draws significantly less power on A-series chips.
 */
const WATCH_OPTIONS: GeoWatchOptions = {
  enableHighAccuracy: true,
  distanceFilter: 25,        // was 10 — halves wakeups; 2-step latency for 50 m fences is acceptable
  interval: 8_000,           // Android: preferred update interval (ms) — unchanged
  fastestInterval: 4_000,    // Android: fastest acceptable update interval (ms) — unchanged
  showsBackgroundLocationIndicator: true,   // iOS: shows blue pill in status bar
  forceRequestLocation: false,
  accuracy: {
    android: 'high',
    ios: 'best',             // was 'bestForNavigation' — sufficient for 50 m fences, lower drain
  },
};

// ─── Permission helpers ───────────────────────────────────────────────────────

/**
 * Checks and requests location permissions appropriate for background use.
 *
 * Android flow (API 29+):
 *   1. Request FINE location (foreground).
 *   2. Only after that is granted: request BACKGROUND_LOCATION separately.
 *      (Android 11+ requires this to be a separate dialog.)
 *
 * iOS flow:
 *   Request "always" permission directly. The system shows a two-step dialog
 *   (When In Use → Always) automatically.
 *
 * Returns:
 *   'granted'     — both foreground + background granted
 *   'denied'      — user denied; can ask again
 *   'blocked'     — user denied and checked "don't ask again"; must open Settings
 *   'unavailable' — device does not support location
 */
export async function requestLocationPermission(): Promise<PermissionStatus> {
  if (Platform.OS === 'ios') {
    return requestIOSPermission();
  }
  return requestAndroidPermission();
}

async function requestIOSPermission(): Promise<PermissionStatus> {
  const permission = PERMISSIONS.IOS.LOCATION_ALWAYS;
  const current = await check(permission);

  if (current === RESULTS.GRANTED) return 'granted';
  if (current === RESULTS.UNAVAILABLE) return 'unavailable';
  if (current === RESULTS.BLOCKED) {
    showBlockedAlert();
    return 'blocked';
  }

  const result = await request(permission);
  if (result === RESULTS.GRANTED) return 'granted';
  if (result === RESULTS.BLOCKED) { showBlockedAlert(); return 'blocked'; }
  return 'denied';
}

async function requestAndroidPermission(): Promise<PermissionStatus> {
  // Step 1 — foreground fine location
  const finePerm: Permission = PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
  const fineResult = await request(finePerm);

  if (fineResult === RESULTS.DENIED) return 'denied';
  if (fineResult === RESULTS.BLOCKED) { showBlockedAlert(); return 'blocked'; }
  if (fineResult !== RESULTS.GRANTED) return 'unavailable';

  // Step 2 — background location (Android 10+, API 29)
  // On older devices this permission doesn't exist; skip gracefully.
  if (Number(Platform.Version) < 29) return 'granted';

  const bgPerm: Permission = PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION;
  const bgResult = await request(bgPerm);

  if (bgResult === RESULTS.GRANTED) return 'granted';
  if (bgResult === RESULTS.BLOCKED) { showBlockedAlert(); return 'blocked'; }
  // Background denied but foreground granted — foreground tracking still works.
  return 'denied';
}

function showBlockedAlert(): void {
  Alert.alert(
    'Location permission required',
    'Brush needs "Always" location access to alert you when you\'re near a task\'s location. Please enable it in Settings.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => Linking.openSettings(),
      },
    ],
  );
}

// ─── Adaptive accuracy (KAN-55) ───────────────────────────────────────────────

/**
 * Two-tier accuracy model:
 *
 * coarse — cell/WiFi triangulation. Used when all known POIs are > 500 m away.
 *          Low power draw; sufficient to detect when the user is approaching.
 *
 * fine   — GPS. Used when at least one cached POI is ≤ 500 m away.
 *          Higher power draw; required for 50–75 m geofence precision.
 */
export type AccuracyMode = 'coarse' | 'fine';

const COARSE_OPTIONS: GeoWatchOptions = {
  enableHighAccuracy: false,
  distanceFilter: 50,          // coarser filter — no need for precision when far away
  interval: 15_000,            // Android: longer interval saves battery in coarse mode
  fastestInterval: 8_000,      // Android: floor in coarse mode
  showsBackgroundLocationIndicator: true,
  forceRequestLocation: false,
  accuracy: {
    android: 'balancedPower',  // cell/WiFi triangulation — much lower drain than GPS
    ios: 'hundredMeters',      // ~100 m accuracy — sufficient for approach detection
  },
};

const FINE_OPTIONS: GeoWatchOptions = WATCH_OPTIONS; // reuse the KAN-54 tuned options

/** Currently active accuracy mode — module-level to avoid unnecessary restarts. */
let currentAccuracyMode: AccuracyMode = 'coarse'; // bootstrap in coarse (KAN-55)

/** Active location callback — stored so we can restart tracking on mode switch. */
let currentLocationCallback: LocationCallback | null = null;
let currentErrorCallback: LocationErrorCallback = defaultErrorHandler;

// ─── Tracking ─────────────────────────────────────────────────────────────────

let watchId: number | null = null;

/**
 * Starts continuous location tracking.
 *
 * Calls `onLocation` each time the device moves beyond the active distanceFilter.
 * Calls `onError` on any error (permission revoked, GPS off, etc.).
 *
 * Safe to call multiple times — stops the previous watcher automatically.
 * Bootstraps in coarse mode (KAN-55); call setTrackingAccuracy() to switch.
 */
export function startTracking(
  onLocation: LocationCallback,
  onError: LocationErrorCallback = defaultErrorHandler,
): void {
  currentLocationCallback = onLocation;
  currentErrorCallback    = onError;
  stopTracking(); // clear any previous watcher

  const options = currentAccuracyMode === 'fine' ? FINE_OPTIONS : COARSE_OPTIONS;

  watchId = Geolocation.watchPosition(
    (position: GeoPosition) => {
      onLocation({
        lat:       position.coords.latitude,
        lng:       position.coords.longitude,
        accuracy:  position.coords.accuracy ?? 999,
        timestamp: position.timestamp,
      });
    },
    onError,
    options,
  );
}

/**
 * Stops continuous location tracking and clears the watcher.
 * Safe to call when no watcher is active.
 */
export function stopTracking(): void {
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }
}

/**
 * Switches the GPS accuracy mode and restarts the watcher if needed (KAN-55).
 *
 * No-op if the requested mode matches the current mode — avoids restarting
 * the watcher on every location tick.
 *
 * Does NOT reset placeCache or currentNearbyType inside proximity.ts — only
 * the watcher options change.
 */
export function setTrackingAccuracy(mode: AccuracyMode): void {
  if (mode === currentAccuracyMode) { return; } // no-op — already in this mode
  currentAccuracyMode = mode;

  // Restart the watcher with the new options only if it was already running.
  //
  // Invariant: watchId !== null ⟹ currentLocationCallback !== null.
  // startTracking() is the only path that sets watchId, and it always sets
  // currentLocationCallback first. The `&& currentLocationCallback` check is
  // therefore redundant, but kept as a TypeScript null guard and defensive
  // safeguard against future refactors that might break this invariant.
  if (watchId !== null && currentLocationCallback) {
    startTracking(currentLocationCallback, currentErrorCallback);
  }
}

/**
 * One-shot current position query.
 * Resolves with the device's current coordinates or rejects with a GeoError.
 */
export function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position: GeoPosition) =>
        resolve({
          lat:       position.coords.latitude,
          lng:       position.coords.longitude,
          accuracy:  position.coords.accuracy ?? 999,
          timestamp: position.timestamp,
        }),
      reject,
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 10_000,
        accuracy: { android: 'high', ios: 'best' }, // was 'bestForNavigation' — KAN-54
      },
    );
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultErrorHandler(error: GeoError): void {
  console.warn('[geolocation] error', error.code, error.message);
}
