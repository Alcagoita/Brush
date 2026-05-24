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
 * Options for continuous tracking.
 * - `distanceFilter: 10` — emit only when the user moves ≥ 10 m (battery saver).
 * - `interval: 8000` / `fastestInterval: 4000` — Android-specific poll cadence.
 * - `accuracy: { android: 'high', ios: 'best' }` — needed for 50 m geofences.
 */
const WATCH_OPTIONS: GeoWatchOptions = {
  enableHighAccuracy: true,
  distanceFilter: 10,        // metres — reduces updates when user is stationary
  interval: 8_000,           // Android: preferred update interval (ms)
  fastestInterval: 4_000,    // Android: fastest acceptable update interval (ms)
  showsBackgroundLocationIndicator: true,   // iOS: shows blue pill in status bar
  forceRequestLocation: false,
  accuracy: {
    android: 'high',
    ios: 'bestForNavigation',
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
    'Agenda needs "Always" location access to alert you when you\'re near a task\'s location. Please enable it in Settings.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => Linking.openSettings(),
      },
    ],
  );
}

// ─── Tracking ─────────────────────────────────────────────────────────────────

let watchId: number | null = null;

/**
 * Starts continuous location tracking.
 *
 * Calls `onLocation` each time the device moves ≥ 10 m.
 * Calls `onError` on any error (permission revoked, GPS off, etc.).
 *
 * Safe to call multiple times — stops the previous watcher automatically.
 */
export function startTracking(
  onLocation: LocationCallback,
  onError: LocationErrorCallback = defaultErrorHandler,
): void {
  stopTracking(); // clear any previous watcher

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
    WATCH_OPTIONS,
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
        accuracy: { android: 'high', ios: 'bestForNavigation' },
      },
    );
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultErrorHandler(error: GeoError): void {
  console.warn('[geolocation] error', error.code, error.message);
}
