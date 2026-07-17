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
 * Detection order (stop at first hit):
 *   1. The user's mall snapshot (KAN-237), if one exists and its center is
 *      within ROUTE_MAX_RADIUS_M — exact: cross-references the trip's POI
 *      types against the snapshot's own downloaded places.
 *   2. The offline habitat cache's nearest `shopping_mall` entry within
 *      ROUTE_MAX_RADIUS_M — heuristic: a generic "malls usually have these"
 *      list (MALL_COVERED_TYPES), not verified against that specific mall's
 *      actual inventory (the cache doesn't necessarily have it).
 *   3. A `shopping_mall` hit piggybacked onto oneTripForAll's live call, if
 *      one happened — same heuristic as (2).
 *
 * A venue "qualifies" once it covers >= 2 of the trip's tasks.
 */

import { getDistanceMeters, type NearbyPlace } from './maps';
import { queryHabitatCache } from './habitatCache';
import { ROUTE_MAX_RADIUS_M } from './destinationResolver';
import type { MallSnapshot } from '../types';
import type { TripStop } from './oneTripForAll';

/**
 * Google Places types a typical mall's tenant mix plausibly covers — used
 * only for the heuristic tiers (2) and (3), where we have a mall's location
 * but not a verified inventory. Tune freely; this is deliberately generous
 * rather than precise (a false positive just opens Maps to a mall that
 * turns out not to have everything — a false negative silently hides a
 * genuinely useful option).
 */
export const MALL_COVERED_TYPES: string[] = [
  'supermarket', 'pharmacy', 'atm', 'salon',
  'clothing_store', 'shoe_store', 'electronics_store',
  'restaurant', 'cafe',
];

export interface MallOption {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  /** How many of the trip's tasks this venue covers (>= 2 to qualify). */
  coveredCount: number;
}

function countCoveredStops(stops: TripStop[], coveredTypes: Set<string>): number {
  return stops.filter(s => !!s.task.poi && coveredTypes.has(s.task.poi)).length;
}

function nearestByDistance(places: NearbyPlace[]): NearbyPlace | null {
  if (places.length === 0) { return null; }
  return [...places].sort((a, b) => a.distanceMeters - b.distanceMeters)[0];
}

export function findMallOption(
  coords: { lat: number; lng: number },
  stops: TripStop[],
  mallSnapshot: MallSnapshot | null,
  liveMallCandidates: NearbyPlace[] = [],
): MallOption | null {
  if (stops.length < 2) { return null; }

  // Tier 1 — the user's own mall snapshot: exact, cross-referenced against
  // its actually-downloaded places (queried by the mall's own center/radius,
  // not the current position).
  if (mallSnapshot) {
    const distanceToMall = getDistanceMeters(coords.lat, coords.lng, mallSnapshot.centerLat, mallSnapshot.centerLng);
    if (distanceToMall <= ROUTE_MAX_RADIUS_M) {
      const uniqueTypes = [...new Set(stops.map(s => s.task.poi).filter((p): p is string => !!p))];
      const covered = queryHabitatCache(mallSnapshot.centerLat, mallSnapshot.centerLng, uniqueTypes, mallSnapshot.radius);
      const coveredTypes = new Set(uniqueTypes.filter(t => (covered[t]?.length ?? 0) > 0));
      const coveredCount = countCoveredStops(stops, coveredTypes);
      if (coveredCount >= 2) {
        return {
          placeId: mallSnapshot.placeId, name: mallSnapshot.name,
          lat: mallSnapshot.centerLat, lng: mallSnapshot.centerLng,
          distanceMeters: distanceToMall, coveredCount,
        };
      }
    }
  }

  const heuristicCoveredTypes = new Set(MALL_COVERED_TYPES);
  const heuristicCoveredCount = countCoveredStops(stops, heuristicCoveredTypes);
  if (heuristicCoveredCount >= 2) {
    // Tier 2 — offline habitat cache.
    const cachedMalls = queryHabitatCache(coords.lat, coords.lng, ['shopping_mall'], ROUTE_MAX_RADIUS_M).shopping_mall ?? [];
    const nearestCached = nearestByDistance(cachedMalls);
    if (nearestCached) {
      return {
        placeId: nearestCached.placeId, name: nearestCached.name,
        lat: nearestCached.lat, lng: nearestCached.lng,
        distanceMeters: nearestCached.distanceMeters, coveredCount: heuristicCoveredCount,
      };
    }

    // Tier 3 — piggybacked onto oneTripForAll's own live call, if any.
    const nearestLive = nearestByDistance(liveMallCandidates);
    if (nearestLive) {
      return {
        placeId: nearestLive.placeId, name: nearestLive.name,
        lat: nearestLive.lat, lng: nearestLive.lng,
        distanceMeters: nearestLive.distanceMeters, coveredCount: heuristicCoveredCount,
      };
    }
  }

  return null;
}
