/**
 * nativeGeofence.ts — Direct native OS geofence wrapper (KAN-56).
 *
 * Architecture decision: direct native modules (no third-party library).
 * We wire CLLocationManager (iOS) and GeofencingClient (Android) directly
 * rather than using react-native-background-geolocation (Transistor Software,
 * paid licence). This avoids a commercial dependency and keeps full control
 * over the geofence lifecycle.
 *
 * iOS:  CLCircularRegion — up to 20 regions per app.
 * Android: GeofencingClient — up to 100 geofences per app.
 *
 * With ≤10 POI types in practice, neither limit is a concern.
 *
 * ── Entry flow ────────────────────────────────────────────────────────────────
 * 1. App open / task sync → searchNearbyPlaces() per active POI type
 *    → registerGeofence() at nearest place coordinates
 * 2. OS monitors at hardware level → wakes app on boundary crossing
 * 3. Entry event → fireGeofenceEntryNotification() → markPoiAlertSeen()
 *
 * ── watchPosition() role after KAN-56 ────────────────────────────────────────
 * watchPosition() is demoted to display-only: it powers the NearbyCard
 * distance rows ("850 m away") at coarse accuracy (KAN-55). It is no longer
 * in the critical notification path.
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

// ─── PositioningProvider abstraction (KAN-56 / KAN-75) ───────────────────────
//
// This interface is the seam for the future indoor proximity engine (KAN-75).
// The default implementation is GPS + native OS geofences (this file).
// KAN-75 will add IndoorPositioningProvider (WiFi + indoor maps) against this
// interface without requiring structural changes to the outdoor implementation.
//
// No refactoring of existing logic is needed now — this is purely additive.

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface WatchOptions {
  distanceFilter?: number;
  accuracy?: 'high' | 'balanced' | 'low';
}

export type PositionCallback = (coords: Coordinates) => void;

/**
 * Abstraction over the positioning source.
 * Default implementation: GPS + native OS geofences (this file).
 * Future implementation: WiFi + indoor maps (KAN-75 — IndoorPositioningProvider).
 */
export interface PositioningProvider {
  getCurrentPosition(): Promise<Coordinates>;
  /** Starts position updates. Returns a cleanup function to stop watching. */
  watchPosition(opts: WatchOptions, cb: PositionCallback): () => void;
}

// ─── Native module interface ──────────────────────────────────────────────────

export interface NativeGeofenceModule {
  /**
   * Register a circular geofence with the OS.
   *
   * @param id           Unique string identifier (used to look up context on entry).
   * @param lat          Centre latitude.
   * @param lng          Centre longitude.
   * @param radiusMeters Geofence radius in metres (typically 50–75 m for POIs).
   */
  registerGeofence(id: string, lat: number, lng: number, radiusMeters: number): Promise<void>;

  /**
   * Remove a single geofence by ID.
   * No-op if the geofence is not registered.
   */
  removeGeofence(id: string): Promise<void>;

  /**
   * Remove all geofences registered by this app.
   * Called on sign-out or when all POI tasks are done.
   */
  removeAllGeofences(): Promise<void>;
}

// ─── Geofence entry event ─────────────────────────────────────────────────────

/** Payload emitted by the native layer when a geofence boundary is crossed. */
export interface GeofenceEntryEvent {
  /** The geofence ID passed to registerGeofence(). */
  geofenceId: string;
}

export const GEOFENCE_ENTRY_EVENT = 'onGeofenceEntry';

// ─── Module access ────────────────────────────────────────────────────────────

const { BrushGeofenceModule } = NativeModules;

if (!BrushGeofenceModule) {
  console.warn(
    '[nativeGeofence] BrushGeofenceModule is not available. ' +
    'Ensure the native module is registered and the app has been rebuilt.',
  );
}

export const NativeGeofence: NativeGeofenceModule = BrushGeofenceModule ?? {
  registerGeofence: () => Promise.resolve(),
  removeGeofence:   () => Promise.resolve(),
  removeAllGeofences: () => Promise.resolve(),
};

export const geofenceEmitter = BrushGeofenceModule
  ? new NativeEventEmitter(BrushGeofenceModule)
  : null;

// ─── Geofence ID helpers ──────────────────────────────────────────────────────

/**
 * Build a geofence ID from a POI type and place ID.
 * Format: `brush_geo_{poiType}_{placeId}`
 *
 * The ID is used by the native layer to call back with the correct context.
 */
export function buildGeofenceId(poiType: string, placeId: string): string {
  return `brush_geo_${poiType}_${placeId}`;
}

/**
 * Parse a geofence ID back into its components.
 * Returns null if the ID format is unrecognised.
 */
export function parseGeofenceId(id: string): { poiType: string; placeId: string } | null {
  const prefix = 'brush_geo_';
  if (!id.startsWith(prefix)) { return null; }
  const rest = id.slice(prefix.length);
  const firstUnderscore = rest.indexOf('_');
  if (firstUnderscore === -1) { return null; }
  return {
    poiType: rest.slice(0, firstUnderscore),
    placeId: rest.slice(firstUnderscore + 1),
  };
}

// ─── iOS-only guard ───────────────────────────────────────────────────────────

/**
 * True on iOS where CLCircularRegion is available.
 * On Android GeofencingClient is always used regardless of this flag.
 */
export const supportsNativeGeofences = Platform.OS === 'ios' || Platform.OS === 'android';
