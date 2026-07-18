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
 *   2. VERIFY + PICK — for every candidate, query the offline habitat cache
 *      around THAT CANDIDATE'S OWN location (not the user's) for the trip's
 *      POI types. Among candidates that verifiably cover >= 2 tasks, pick
 *      the one covering the MOST — not just the nearest one (a small nearby
 *      venue that could only solve 2 tasks must not beat a farther mall
 *      that could solve all of them). Ties broken by distance.
 *
 * A venue "qualifies" once real, verified coverage reaches >= 2 tasks.
 */

import { getDistanceMeters, type NearbyPlace } from './maps';
import { queryHabitatCache } from './habitatCache';
import { ROUTE_MAX_RADIUS_M } from './destinationResolver';
import { MALL_SNAPSHOT_DOWNLOAD_RADIUS_M } from './mallSnapshots';
import type { MallSnapshot } from '../types';
import type { TripStop } from './oneTripForAll';

export interface MallOption {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  /** How many of the trip's tasks this venue's OWN premises cover (verified against the habitat cache around its own location, not guessed) — >= 2 to qualify. */
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
  /** How wide a net to cast around this candidate's own location when
   *  verifying coverage — a downloaded snapshot's own recorded radius is
   *  more generous/exact than the default guess for a freshly-found one. */
  verifyRadiusM: number;
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
        distanceMeters: distanceToMall, verifyRadiusM: mallSnapshot.radius,
      });
    }
  }

  const cachedMalls = queryHabitatCache(coords.lat, coords.lng, ['shopping_mall'], ROUTE_MAX_RADIUS_M).shopping_mall ?? [];
  for (const p of cachedMalls) {
    candidates.push({ ...p, verifyRadiusM: MALL_SNAPSHOT_DOWNLOAD_RADIUS_M });
  }

  for (const p of liveMallCandidates) {
    candidates.push({ ...p, verifyRadiusM: MALL_SNAPSHOT_DOWNLOAD_RADIUS_M });
  }

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

/** Real coverage: what does the habitat cache actually know exists near `lat,lng`? */
function verifyCoverage(lat: number, lng: number, radiusM: number, stops: TripStop[]): number {
  const uniqueTypes = [...new Set(stops.map(s => s.task.poi).filter((p): p is string => !!p))];
  const covered = queryHabitatCache(lat, lng, uniqueTypes, radiusM);
  const coveredTypes = new Set(uniqueTypes.filter(t => (covered[t]?.length ?? 0) > 0));
  return stops.filter(s => !!s.task.poi && coveredTypes.has(s.task.poi)).length;
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
    const coveredCount = verifyCoverage(candidate.lat, candidate.lng, candidate.verifyRadiusM, stops);
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
      coveredCount: verifyCoverage(c.lat, c.lng, c.verifyRadiusM, stops),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}
