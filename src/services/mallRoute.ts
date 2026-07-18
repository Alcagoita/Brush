/**
 * mallRoute.ts — KAN-282 "Mall/single-venue option for 'One trip for all of
 * these'".
 *
 * Opportunistic, never hunted: this only ever looks at data the app already
 * has lying around for the current tick (a mall snapshot the user already
 * downloaded, the offline habitat cache, or the one live Places call
 * oneTripForAll.ts's resolveTripDestinations makes anyway for unresolved
 * task types). It never triggers a search of its own. No qualifying mall
 * found is a normal outcome, not a failure — findMallOption just returns
 * null and the screen shows only the stop-by-stop card.
 *
 * The point is a mall whose OWN premises can actually resolve the trip's
 * tasks (separate shops inside/around it — a pharmacy, an ATM, a cafe...),
 * not "this venue is generically the kind of place that tends to have
 * these" (KAN-282 review fix — a standalone supermarket got offered up as
 * "the mall" purely because its category loosely overlapped the trip's
 * needs; it couldn't actually solve anything beyond itself). So detection
 * is two separate steps:
 *
 *   1. Find a mall CANDIDATE — three ways, first hit wins:
 *      a. The user's own mall snapshot (KAN-237), if its center is within
 *         ROUTE_MAX_RADIUS_M.
 *      b. The offline habitat cache's nearest `shopping_mall`-typed entry
 *         within ROUTE_MAX_RADIUS_M.
 *      c. A `shopping_mall` hit piggybacked onto oneTripForAll's own live
 *         call (already filtered to genuinely PRIMARY-typed malls there —
 *         see NearbyPlace.primaryType).
 *   2. VERIFY it — query the offline habitat cache around THAT CANDIDATE'S
 *      OWN location (not the user's) for the trip's POI types. Only what's
 *      actually cached near the mall itself counts; a candidate with no
 *      verifiable coverage there is rejected, not guessed at.
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

function nearestByDistance(places: NearbyPlace[]): NearbyPlace | null {
  if (places.length === 0) { return null; }
  return [...places].sort((a, b) => a.distanceMeters - b.distanceMeters)[0];
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

  let candidate: MallCandidate | null = null;

  if (mallSnapshot) {
    const distanceToMall = getDistanceMeters(coords.lat, coords.lng, mallSnapshot.centerLat, mallSnapshot.centerLng);
    if (distanceToMall <= ROUTE_MAX_RADIUS_M) {
      candidate = {
        placeId: mallSnapshot.placeId, name: mallSnapshot.name,
        lat: mallSnapshot.centerLat, lng: mallSnapshot.centerLng,
        distanceMeters: distanceToMall, verifyRadiusM: mallSnapshot.radius,
      };
    }
  }

  if (!candidate) {
    const cachedMalls = queryHabitatCache(coords.lat, coords.lng, ['shopping_mall'], ROUTE_MAX_RADIUS_M).shopping_mall ?? [];
    const nearestCached = nearestByDistance(cachedMalls);
    if (nearestCached) {
      candidate = { ...nearestCached, verifyRadiusM: MALL_SNAPSHOT_DOWNLOAD_RADIUS_M };
    }
  }

  if (!candidate) {
    const nearestLive = nearestByDistance(liveMallCandidates);
    if (nearestLive) {
      candidate = { ...nearestLive, verifyRadiusM: MALL_SNAPSHOT_DOWNLOAD_RADIUS_M };
    }
  }

  if (!candidate) { return null; }

  const coveredCount = verifyCoverage(candidate.lat, candidate.lng, candidate.verifyRadiusM, stops);
  if (coveredCount < 2) { return null; }

  return {
    placeId: candidate.placeId, name: candidate.name,
    lat: candidate.lat, lng: candidate.lng,
    distanceMeters: candidate.distanceMeters, coveredCount,
  };
}
