/**
 * clusterLeisure.ts — KAN-293 ("Central Park is right there").
 *
 * When a notable leisure or cultural place happens to sit among the stops of
 * an errand cluster, the cluster box mentions it once. The errand run becomes
 * an excuse for a walk. The place is never inserted into the route, never
 * counted in "N of these", and never joins anything unless the user asks.
 *
 * Detection is pure and cache-only. It reads rows the habitat cache already
 * holds — the leisure types ride along in the SAME Overpass request the
 * proximity engine already makes for the user's own POI types (see
 * CLUSTER_LEISURE_TYPES and proximity.ts's prefetchTypes), so this feature
 * issues no request of its own and costs no Google call whatsoever.
 *
 * COMMERCIAL NEUTRALITY (KAN-293 doctrine — monetize fulfilment, never
 * placement): nothing in this module takes a partner, sponsor, bid or
 * revenue input. The only signals are physical: is the place one of a fixed
 * hand-authored set of types, does it have a real name, and how far is it
 * from a stop the user was already going to. Nobody can pay to appear here,
 * and no ordering below may ever be influenced by a commercial relationship.
 * The ticket link this surfaces (`website`) is the place's own OSM-tagged
 * site — if that link ever becomes monetized, the change belongs to the
 * fulfilment action in KAN-239, never to the detection in this file.
 */

import { getDistanceMeters, placeTypeLabel } from './maps';
import type { NearbyPlace } from './maps';
import { queryHabitatCache } from './habitatCache';
import { CLUSTER_LEISURE_TYPES } from '../types';
import type { ClusterLeisureType, PoiType } from '../types';
import type { ErrandBundle } from './errandBundles';

/**
 * How close a leisure place must be to one of the cluster's stops to be worth
 * mentioning. Deliberately much tighter than ERRAND_BUNDLE_RADIUS_M (700 m):
 * the bundle radius answers "can these errands be one trip", while this
 * answers "is this literally right there as you walk past" — the honest
 * threshold for the word "right there" in the copy.
 */
export const LEISURE_NEAR_STOP_RADIUS_M = 100;

export interface ClusterLeisureSuggestion {
  place: NearbyPlace;
  type: ClusterLeisureType;
  /** Distance to the nearest cluster stop — what qualified it, and the ranking key. */
  distanceToStopMeters: number;
}

/**
 * Catalog PoiType to stamp on the task "Keep it in mind" creates.
 *
 * The leisure types aren't PoiTypes of their own, and don't need to be: the
 * app already treats them as aliases of catalog types everywhere it matters
 * (see AppIcon/poi.tsx, which maps museum→library and aquarium/attraction→
 * park for icon selection). Reusing that same aliasing keeps the created
 * task an ordinary task — right icon, real geofence radius, no new entries
 * in CATEGORY_POI_MAP or the POI picker — while `poiPlaceId` pins the
 * specific place so proximity resolves the actual museum, not "a library".
 */
const LEISURE_TASK_POI_TYPE: Record<ClusterLeisureType, PoiType> = {
  park:       'park',
  attraction: 'park',
  aquarium:   'park',
  museum:     'library',
};

export function leisureTaskPoiType(type: ClusterLeisureType): PoiType {
  return LEISURE_TASK_POI_TYPE[type];
}

/**
 * The one leisure place worth mentioning for `bundle`, or null.
 *
 * Rules, in order:
 *  - candidates come only from the habitat cache, only in CLUSTER_LEISURE_TYPES
 *  - a candidate must be within LEISURE_NEAR_STOP_RADIUS_M of at least ONE
 *    cluster stop (any stop, not just the anchor — the walk passes them all)
 *  - it must have a real name; an unnamed row ("Park") says nothing worth
 *    interrupting for, and the copy is built around naming the place
 *  - it must not already BE one of the cluster's stops (a park the user has
 *    an errand at is not a discovery)
 *  - nearest to a stop wins; exactly one suggestion per bundle, ever
 *
 * Never throws — any failure yields null, and the line is simply absent.
 * Absence is the default state, never a placeholder.
 */
export function findClusterLeisure(bundle: ErrandBundle): ClusterLeisureSuggestion | null {
  try {
    const stops = bundle.entries.map(entry => entry.place);
    if (stops.length === 0) { return null; }

    // Search around the anchor, wide enough to reach a leisure place sitting
    // just past the furthest stop. Every candidate is then re-measured
    // against the individual stops below — this radius only bounds the query.
    const furthestStopM = Math.max(
      ...stops.map(stop => getDistanceMeters(bundle.anchor.lat, bundle.anchor.lng, stop.lat, stop.lng)),
    );
    const searchRadiusM = furthestStopM + LEISURE_NEAR_STOP_RADIUS_M;

    const byType = queryHabitatCache(
      bundle.anchor.lat,
      bundle.anchor.lng,
      [...CLUSTER_LEISURE_TYPES],
      searchRadiusM,
    );

    // A place already in the cluster is an errand, not a discovery.
    const stopPlaceIds = new Set(stops.map(stop => stop.placeId));

    let best: ClusterLeisureSuggestion | null = null;

    for (const type of CLUSTER_LEISURE_TYPES) {
      for (const place of byType[type] ?? []) {
        if (stopPlaceIds.has(place.placeId)) { continue; }
        if (!hasRealName(place, type)) { continue; }

        let nearestStopM = Infinity;
        for (const stop of stops) {
          const dist = getDistanceMeters(place.lat, place.lng, stop.lat, stop.lng);
          if (dist < nearestStopM) { nearestStopM = dist; }
        }
        if (nearestStopM > LEISURE_NEAR_STOP_RADIUS_M) { continue; }

        if (!best || nearestStopM < best.distanceToStopMeters) {
          best = { place, type, distanceToStopMeters: nearestStopM };
        }
      }
    }

    return best;
  } catch (err) {
    console.warn('[clusterLeisure] findClusterLeisure failed', err);
    return null;
  }
}

/**
 * True when the cached row carries a genuine name rather than osmPlaces'
 * type-label fallback. The cache doesn't surface its `is_generic_name` flag
 * through NearbyPlace, so compare against the same label the fallback would
 * have produced — a place actually called "Museum" is indistinguishable from
 * an unnamed one, and staying quiet is the right call either way.
 */
function hasRealName(place: NearbyPlace, type: ClusterLeisureType): boolean {
  const name = place.name?.trim();
  if (!name) { return false; }
  return name.toLowerCase() !== placeTypeLabel(type).trim().toLowerCase();
}
