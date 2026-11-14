/**
 * centreDetection.ts — KAN-513. Is the user inside a shopping centre?
 *
 * THE RULE (docs/KAN-512-mall-floors.md, decision 1)
 *
 * Inside a centre = the settled position is inside that centre's STRICT
 * outline. Not a radius, not GPS quality, not a POI count — an outline is a
 * building, so a dense high street can never pass for a centre.
 *
 *   enter  first settled fix inside the strict outline
 *   leave  first settled fix more than CENTRE_LEAVE_BUFFER_M outside it
 *
 * Between the two the previous answer holds: the gap stops the street door
 * from flapping in and out. A surface car park is outside (the user is
 * walking towards the centre, not in it); an underground one inside the
 * outline is inside.
 *
 * WHERE THE OUTLINES COME FROM
 *
 * The venue inventory's stored copies (KAN-382) — so this works offline, under
 * the roof, exactly where it matters. A centre we hold no outline for keeps
 * outdoor behaviour. Positions come from whoever already has one (the
 * proximity engine's settled search, or the Lantern's own one-shot fix):
 * this module never asks for a position itself (KAN-231 — no watcher, no
 * poll). Automatic, no prompt, no toggle.
 */

import { getDistanceMeters } from './geoDistance';
import { listStoredVenues, type Venue } from './venueInventory';

/** Leave only once this far outside the outline (KAN-512). */
export const CENTRE_LEAVE_BUFFER_M = 30;

type Ring = [number, number][];

export interface CentreContext {
  venueId: string;
  name: string;
}

/** Ray casting, even-odd across rings: a hole (inner ring) is outside. */
export function insideRings(lat: number, lng: number, rings: Ring[]): boolean {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [latI, lngI] = ring[i];
      const [latJ, lngJ] = ring[j];
      if ((lngI > lng) !== (lngJ > lng)
        && lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI) {
        inside = !inside;
      }
    }
  }
  return inside;
}

/**
 * Metres from the point to the outline's nearest edge; 0 when inside.
 * A local equirectangular projection — at a building's scale the error is
 * far below GPS noise.
 */
export function metresOutside(lat: number, lng: number, rings: Ring[]): number {
  if (insideRings(lat, lng, rings)) { return 0; }
  const metresPerDegLat = 111_320;
  const metresPerDegLng = 111_320 * Math.cos((lat * Math.PI) / 180);
  const toXY = ([pLat, pLng]: [number, number]) => [(pLng - lng) * metresPerDegLng, (pLat - lat) * metresPerDegLat];
  let best = Infinity;
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const [ax, ay] = toXY(ring[i]);
      const [bx, by] = toXY(ring[i + 1]);
      const dx = bx - ax;
      const dy = by - ay;
      const lengthSq = dx * dx + dy * dy;
      const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSq));
      best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
    }
  }
  return best;
}

/**
 * The centre the user is in after this fix, given the one they were in.
 * Pure: the whole rule, testable without state.
 */
export function nextCentre(
  previous: CentreContext | null,
  lat: number,
  lng: number,
  venues: Venue[],
): CentreContext | null {
  if (previous) {
    const held = venues.find(venue => venue.id === previous.venueId);
    if (held && metresOutside(lat, lng, held.rings) <= CENTRE_LEAVE_BUFFER_M) {
      return { venueId: held.id, name: held.name };
    }
  }
  // Entering needs the strict outline. Where outlines overlap (they shouldn't),
  // the nearest centroid wins so the answer is deterministic.
  const containing = venues
    .filter(venue => insideRings(lat, lng, venue.rings))
    .sort((a, b) => getDistanceMeters(lat, lng, a.centroid[0], a.centroid[1])
      - getDistanceMeters(lat, lng, b.centroid[0], b.centroid[1]));
  const entered = containing[0];
  return entered ? { venueId: entered.id, name: entered.name } : null;
}

let current: CentreContext | null = null;

/**
 * Feed a settled position; returns the centre the user is in now (or null).
 * Idempotent for the same position, so the proximity engine and the Lantern
 * can both call it with whatever fix they hold. Never throws.
 */
export function updateCentreContext(lat: number, lng: number): CentreContext | null {
  try {
    current = nextCentre(current, lat, lng, listStoredVenues());
  } catch (err) {
    console.warn('[centreDetection] update failed', err);
  }
  return current;
}

/** The centre from the last update, without feeding a new position. */
export function getCurrentCentre(): CentreContext | null {
  return current;
}

/** Test-only. */
export function __resetCentreDetectionForTests(): void {
  current = null;
}
