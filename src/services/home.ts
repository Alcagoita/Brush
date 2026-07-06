/**
 * home.ts — KAN-247: explicit home anchor, no inference.
 *
 * The user tells the app where home is via Settings; the app never guesses
 * it. This module holds the current home point in memory (fed in once — see
 * setHomeLocation — mirroring proximity.ts's setActiveTrips/setMallSnapshot
 * pattern) and exposes pure distance/proximity helpers over it. No new
 * location watchers, no background anything (KAN-231) — callers compare
 * against positions they already have.
 */

import { getDistanceMeters } from './maps';

/** Default "near home" radius — same order of magnitude as the mall/habitat radii. */
export const HOME_RADIUS_M = 150;

export interface HomeLocation {
  address: string;
  lat: number;
  lng: number;
}

let _home: HomeLocation | null = null;

/** Feed in the user's home location (or null when unset / on sign-out). */
export function setHomeLocation(home: HomeLocation | null): void {
  _home = home;
}

export function getHomeLocation(): HomeLocation | null {
  return _home;
}

/** Distance in meters from `coords` to home, or null when home is unset. */
export function distanceFromHome(coords: { lat: number; lng: number }): number | null {
  if (!_home) { return null; }
  return getDistanceMeters(_home.lat, _home.lng, coords.lat, coords.lng);
}

/** True when `coords` is within `radius` meters of home; null when home is unset. */
export function isNearHome(coords: { lat: number; lng: number }, radius: number = HOME_RADIUS_M): boolean | null {
  const dist = distanceFromHome(coords);
  return dist == null ? null : dist <= radius;
}

/** Test helper — clears the in-memory home point. */
export function __resetHomeLocation(): void {
  _home = null;
}
