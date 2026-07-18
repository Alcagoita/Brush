/**
 * mallRoute.ts — KAN-282 "Mall/single-venue option for 'One trip for all of
 * these'".
 *
 * Opportunistic, never hunted: this only ever looks at data the app already
 * has lying around for the current tick (a mall snapshot the user already
 * downloaded, the offline habitat cache, or the one live Places call
 * oneTripForAll.ts's resolveTripDestinations makes anyway). It never
 * triggers a search of its own. No qualifying mall found is a normal
 * outcome, not a failure — findMallOption just returns null and the screen
 * shows only the stop-by-stop card.
 *
 * The point is a mall whose OWN premises can actually resolve the trip's
 * tasks (separate shops inside/around it — a pharmacy, an ATM, a cafe...),
 * not "this venue is generically the kind of place that tends to have
 * these" (KAN-282 review fix — a standalone supermarket got offered up as
 * "the mall" purely because its category loosely overlapped the trip's
 * needs; it couldn't actually solve anything beyond itself). So detection
 * is two separate steps:
 *
 *   1. Collect mall CANDIDATES from every source — the user's own mall
 *      snapshot (KAN-237, if its center is within ROUTE_MAX_RADIUS_M), the
 *      offline habitat cache's `shopping_mall`-typed entries within
 *      ROUTE_MAX_RADIUS_M, and any `shopping_mall` hits piggybacked onto
 *      oneTripForAll's own live call (already filtered to genuinely
 *      PRIMARY-typed malls — see NearbyPlace.primaryType). ALL sources
 *      pooled together, not "first source that has anything wins" (KAN-282
 *      review fix — a mall already cached from background refresh was
 *      shadowing a closer, better-covering mall that only the live search
 *      would have found, because cache "winning" meant live was never even
 *      consulted).
 *   2. VERIFY + PICK — for every candidate, check which of the trip's
 *      ALREADY-RESOLVED stops (real coordinates resolveTripDestinations
 *      already validated, from cache/learned/live — whichever source
 *      actually found each one) sit within MALL_SNAPSHOT_DOWNLOAD_RADIUS_M
 *      of the candidate's own coordinates. Among candidates that reach >= 2
 *      that way, pick the one covering the MOST — not just the nearest one
 *      (a small nearby venue that could only solve 2 tasks must not beat a
 *      farther mall that could solve all of them). Ties broken by distance.
 *
 *      Deliberately NOT a fresh habitat-cache query centered on the
 *      candidate (KAN-282 review fix #2): that depends on POI data having
 *      already been cached specifically around THAT location, which is
 *      often just empty for a real mall nobody's explicitly downloaded —
 *      not because it lacks a pharmacy, but because we never cached
 *      anything centered there. Distance-to-an-already-resolved-stop has
 *      no such dependency; it's just geometry over data we already trust.
 *
 * A venue "qualifies" once real, verified coverage reaches >= 2 tasks.
 */

import { getDistanceMeters, type NearbyPlace } from './maps';
import { queryHabitatCache } from './habitatCache';
import { ROUTE_MAX_RADIUS_M } from './destinationResolver';
import { MALL_SNAPSHOT_DOWNLOAD_RADIUS_M } from './mallSnapshots';
import type { MallSnapshot } from '../types';
import type { TripStop } from './oneTripForAll';

/** How close an already-resolved stop must be to a mall candidate's own
 *  coordinates to count as "inside/at that mall" — a mall's own footprint
 *  can genuinely span this much (Colombo-sized complexes are not small). */
const MALL_COVERAGE_RADIUS_M = MALL_SNAPSHOT_DOWNLOAD_RADIUS_M;

export interface MallOption {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  /** How many of the trip's tasks resolved to a place within MALL_COVERAGE_RADIUS_M of this venue — >= 2 to qualify. */
  coveredCount: number;
}

/** Every mall candidate considered this tick, verified but NOT filtered to
 *  qualifying ones — for the temporary on-screen debug list only. */
export interface MallCandidateDebugInfo {
  name: string;
  distanceMeters: number;
  coveredCount: number;
}

interface MallCandidate {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
}

function collectCandidates(
  coords: { lat: number; lng: number },
  mallSnapshot: MallSnapshot | null,
  liveMallCandidates: NearbyPlace[],
): MallCandidate[] {
  const candidates: MallCandidate[] = [];

  if (mallSnapshot) {
    const distanceToMall = getDistanceMeters(coords.lat, coords.lng, mallSnapshot.centerLat, mallSnapshot.centerLng);
    if (distanceToMall <= ROUTE_MAX_RADIUS_M) {
      candidates.push({
        placeId: mallSnapshot.placeId, name: mallSnapshot.name,
        lat: mallSnapshot.centerLat, lng: mallSnapshot.centerLng,
        distanceMeters: distanceToMall,
      });
    }
  }

  const cachedMalls = queryHabitatCache(coords.lat, coords.lng, ['shopping_mall'], ROUTE_MAX_RADIUS_M).shopping_mall ?? [];
  candidates.push(...cachedMalls);
  candidates.push(...liveMallCandidates);

  // The same physical mall can turn up from more than one source (e.g.
  // already cached AND returned live) — dedupe by placeId so it isn't
  // double-counted/double-listed. Internal cache ids and raw Google
  // placeIds are different id spaces, so this only catches exact repeats
  // within the same source, which is fine — verifying it twice under two
  // different ids is harmless, just redundant work.
  const seen = new Set<string>();
  return candidates.filter(c => {
    if (seen.has(c.placeId)) { return false; }
    seen.add(c.placeId);
    return true;
  });
}

/** Real coverage: how many of the trip's ALREADY-RESOLVED stops sit within
 *  MALL_COVERAGE_RADIUS_M of this candidate's own coordinates? Uses each
 *  stop's real, already-validated place — not a fresh cache lookup. */
function verifyCoverage(lat: number, lng: number, stops: TripStop[]): number {
  return stops.filter(s => getDistanceMeters(lat, lng, s.place.lat, s.place.lng) <= MALL_COVERAGE_RADIUS_M).length;
}

export function findMallOption(
  coords: { lat: number; lng: number },
  stops: TripStop[],
  mallSnapshot: MallSnapshot | null,
  liveMallCandidates: NearbyPlace[] = [],
): MallOption | null {
  if (stops.length < 2) { return null; }

  let best: MallOption | null = null;
  for (const candidate of collectCandidates(coords, mallSnapshot, liveMallCandidates)) {
    const coveredCount = verifyCoverage(candidate.lat, candidate.lng, stops);
    if (coveredCount < 2) { continue; }
    if (
      !best ||
      coveredCount > best.coveredCount ||
      (coveredCount === best.coveredCount && candidate.distanceMeters < best.distanceMeters)
    ) {
      best = {
        placeId: candidate.placeId, name: candidate.name,
        lat: candidate.lat, lng: candidate.lng,
        distanceMeters: candidate.distanceMeters, coveredCount,
      };
    }
  }
  return best;
}

/**
 * TEMPORARY — every candidate considered this tick (from every source),
 * with its verified coverage, sorted nearest-first. Not filtered to
 * qualifying ones — the point is to see the FULL picture, including
 * candidates that don't qualify, so a missing expected mall (or a
 * surprising one) is visible. Remove once the detection bug is found.
 */
export function debugAllMallCandidates(
  coords: { lat: number; lng: number },
  stops: TripStop[],
  mallSnapshot: MallSnapshot | null,
  liveMallCandidates: NearbyPlace[] = [],
): MallCandidateDebugInfo[] {
  if (stops.length < 2) { return []; }
  return collectCandidates(coords, mallSnapshot, liveMallCandidates)
    .map(c => ({
      name: c.name,
      distanceMeters: c.distanceMeters,
      coveredCount: verifyCoverage(c.lat, c.lng, stops),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}
