/**
 * geolocation.ts — Background location tracking service (KAN-22 / KAN-162).
 *
 * Library: expo-location (replaces react-native-geolocation-service, KAN-162).
 *
 * Permissions requested:
 *   Android: FOREGROUND + BACKGROUND (ACCESS_BACKGROUND_LOCATION, API 29+)
 *   iOS:     Always (NSLocationAlwaysAndWhenInUseUsageDescription)
 *
 * Rules (from CLAUDE.md / KAN-22):
 *   - Request `always` permission so geofences fire in the background.
 *   - Only one POI is "currently nearby" at a time (closest wins).
 *   - A geofence notification fires once per entry per day.
 */

import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

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
export type LocationErrorCallback = (error: Error) => void;

export type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'unavailable';

/**
 * The current environment context inferred by the indoor detection service
 * (KAN-73). Consumed by the indoor proximity engine (KAN-75) and Nearby card.
 *
 * outdoor         — normal GPS signal; outdoor geofence engine is active
 * indoor_unmapped — GPS degraded, indoor context detected but the venue is not
 *                   confirmed in Places; falls back to the outdoor engine
 * indoor_mapped   — GPS degraded AND Places confirmed a mapped shopping mall;
 *                   indoor proximity engine (KAN-75) takes over
 */
export type LocationContext = 'outdoor' | 'indoor_unmapped' | 'indoor_mapped';

// ─── Permission helpers ───────────────────────────────────────────────────────

/**
 * Checks and requests location permissions appropriate for background use.
 *
 * Android flow (API 29+):
 *   1. Request foreground location.
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
  try {
    const { status: fg } = await Location.requestForegroundPermissionsAsync();

    if (fg === 'denied') return 'denied';
    if (fg === 'undetermined') return 'denied';
    if (fg !== 'granted') return 'unavailable';

    const bgResponse = await Location.requestBackgroundPermissionsAsync();
    const { status: bg, canAskAgain } = bgResponse;

    if (bg === 'granted') return 'granted';

    // canAskAgain false = permanently denied; true = soft deny, can retry
    if (bg === 'denied' && !canAskAgain) {
      showBlockedAlert();
      return 'blocked';
    }

    return 'denied';
  } catch {
    return 'unavailable';
  }
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

const FINE_ACCURACY_OPTIONS: Location.LocationOptions = {
  accuracy:       Location.Accuracy.High,
  distanceInterval: 25,
  timeInterval:   8_000,
};

const COARSE_ACCURACY_OPTIONS: Location.LocationOptions = {
  accuracy:       Location.Accuracy.Balanced,
  distanceInterval: 100,
  timeInterval:   30_000,
};

/** Currently active accuracy mode — module-level to avoid unnecessary restarts. */
let currentAccuracyMode: AccuracyMode = 'coarse';

/** Active location callback — stored so we can restart tracking on mode switch. */
let currentLocationCallback: LocationCallback | null = null;
let currentErrorCallback: LocationErrorCallback = defaultErrorHandler;

// ─── Tracking ─────────────────────────────────────────────────────────────────

let watchSubscription: Location.LocationSubscription | null = null;

/**
 * Guard incremented on every startTracking call. The .then() handler captures
 * the value at call time and discards the subscription if stopTracking() ran
 * while watchPositionAsync was still pending (race condition guard).
 */
let _trackingGeneration = 0;

/**
 * Starts continuous location tracking.
 *
 * Calls `onLocation` each time the device moves beyond the active distanceInterval.
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
  stopTracking();

  const generation = ++_trackingGeneration;
  const opts = currentAccuracyMode === 'fine' ? FINE_ACCURACY_OPTIONS : COARSE_ACCURACY_OPTIONS;

  Location.watchPositionAsync(opts, (position) => {
    onLocation({
      lat:       position.coords.latitude,
      lng:       position.coords.longitude,
      accuracy:  position.coords.accuracy ?? 999,
      timestamp: position.timestamp,
    });
  }).then((sub) => {
    if (generation !== _trackingGeneration) {
      // stopTracking() was called while the promise was in-flight; discard.
      sub.remove();
      return;
    }
    watchSubscription = sub;
  }).catch(onError);
}

/**
 * Stops continuous location tracking and clears the watcher.
 * Safe to call when no watcher is active.
 */
export function stopTracking(): void {
  _trackingGeneration++; // invalidates any in-flight watchPositionAsync promise
  if (watchSubscription !== null) {
    watchSubscription.remove();
    watchSubscription = null;
  }
}

/**
 * Switches the GPS accuracy mode and restarts the watcher if needed (KAN-55).
 *
 * No-op if the requested mode matches the current mode — avoids restarting
 * the watcher on every location tick.
 */
export function setTrackingAccuracy(mode: AccuracyMode): void {
  if (mode === currentAccuracyMode) { return; }
  currentAccuracyMode = mode;

  if (watchSubscription !== null && currentLocationCallback) {
    startTracking(currentLocationCallback, currentErrorCallback);
  }
}

/**
 * One-shot current position query (high accuracy — GPS).
 * Resolves with the device's current coordinates or rejects with a GeoError.
 * Use only when GPS-level accuracy is required (e.g. turn-by-turn).
 */
export function getCurrentPosition(): Promise<Coordinates> {
  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  }).then((position) => ({
    lat:       position.coords.latitude,
    lng:       position.coords.longitude,
    accuracy:  position.coords.accuracy ?? 999,
    timestamp: position.timestamp,
  }));
}

/**
 * One-shot position query using network/cell location only.
 *
 * Does NOT wake the GPS hardware. Returns quickly using a cached or
 * network-derived fix. Accuracy is 50–200 m, sufficient for proximity
 * detection at 100 m / 400 m thresholds.
 *
 * Use this for all background proximity checks to avoid GPS cold-start
 * latency and the associated system slowdown.
 */
export function getPositionLowAccuracy(): Promise<Coordinates> {
  return Location.getCurrentPositionAsync({
    accuracy:    Location.Accuracy.Balanced,
    timeInterval: 3_000,
    mayShowUserSettingsDialog: false,
  }).then((position) => ({
    lat:       position.coords.latitude,
    lng:       position.coords.longitude,
    accuracy:  position.coords.accuracy ?? 999,
    timestamp: position.timestamp,
  }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultErrorHandler(error: Error): void {
  console.warn('[geolocation] error', error.message);
}
