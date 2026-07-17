/**
 * destinationResolver.ts — KAN-281 shared destination resolution.
 *
 * KAN-279 originally specced "reuse the KAN-279 resolver" but that resolver
 * doesn't exist — KAN-279 shipped simpler (a plain Maps search, no picked
 * destination). This module builds the real per-task resolver KAN-281 needs
 * to order stops and build a multi-stop directions URL.
 *
 * Resolution order per task, first match wins:
 *   1. Pinned `poiPlaceId` (rare — set via Places autocomplete).
 *   2. Learned place for the task's POI type (KAN-230 ranking) — "your"
 *      place wins even if another candidate is closer.
 *   3. Nearest match in the offline habitat cache, within ROUTE_MAX_RADIUS_M.
 *   4. A pre-fetched live-search result for this POI type, if one was
 *      provided (the live search itself is NOT called from here — see
 *      resolveTripDestinations, which batches all unresolved types into at
 *      most one Places API call for the whole trip).
 *
 * `resolveTaskDestination` never calls the network for step 4 — it only
 * reads whatever `liveResults` the orchestrator already fetched. This keeps
 * it fixture-testable per branch without mocking a live API call inside it.
 */

import { getDistanceMeters, getPlaceDetails } from './maps';
import { queryHabitatCache, getHabitatPlaceById } from './habitatCache';
import { getLearnedPlaceForPoiType, type LearnedPlace } from './learnedPlaces';
import type { PlacesMap } from './proximity';
import type { Task } from '../types';

/** Wider than the cache's own default (5 km) is not needed — this doubles as
 *  the live-search radius, tuned to the same generous-but-bounded reach as
 *  KAN-279's original design intent. Start here, tune later. */
export const ROUTE_MAX_RADIUS_M = 5_000;

export type DestinationSource = 'pinned' | 'learned' | 'cache' | 'live';

export interface ResolvedPlace {
  /** Google Place ID (pinned/live) or the internal habitat cross-source id (learned/cache). */
  internalId: string;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  source: DestinationSource;
}

export async function resolveTaskDestination(
  task: Task,
  coords: { lat: number; lng: number },
  learnedPlaces: LearnedPlace[],
  liveResults: PlacesMap = {},
  options: { skipPinned?: boolean } = {},
): Promise<ResolvedPlace | null> {
  // 1. Pinned place wins over everything. `skipPinned` opts out of this
  // branch's network call — used by TodayScreen's local-only eligibility
  // check, which must never fire an uninvited Places API request just to
  // decide whether to show a discovery row.
  if (task.poiPlaceId && !options.skipPinned) {
    const pinned = await getPlaceDetails(task.poiPlaceId).catch(() => null);
    if (pinned) {
      return {
        internalId:     task.poiPlaceId,
        name:           pinned.name,
        lat:            pinned.lat,
        lng:            pinned.lng,
        distanceMeters: getDistanceMeters(coords.lat, coords.lng, pinned.lat, pinned.lng),
        source:         'pinned',
      };
    }
  }

  if (!task.poi) { return null; }

  // 2. Learned place — wins even if farther than a closer cached candidate.
  // Falls through if its own habitat row can't be resolved (e.g. evicted).
  const learned = getLearnedPlaceForPoiType(learnedPlaces, task.poi);
  if (learned) {
    const place = getHabitatPlaceById(learned.placeId);
    if (place) {
      return {
        internalId:     learned.placeId,
        name:           learned.name,
        lat:            place.lat,
        lng:            place.lng,
        distanceMeters: getDistanceMeters(coords.lat, coords.lng, place.lat, place.lng),
        source:         'learned',
      };
    }
  }

  // 3. Nearest matching place from the offline habitat cache.
  const cached = queryHabitatCache(coords.lat, coords.lng, [task.poi], ROUTE_MAX_RADIUS_M)[task.poi]?.[0];
  if (cached) {
    return {
      internalId:     cached.placeId,
      name:           cached.name,
      lat:            cached.lat,
      lng:            cached.lng,
      distanceMeters: cached.distanceMeters,
      source:         'cache',
    };
  }

  // 4. A pre-fetched live-search result for this type, if the orchestrator
  // supplied one (respects the same radius cap).
  const live = liveResults[task.poi]?.[0];
  if (live && live.distanceMeters <= ROUTE_MAX_RADIUS_M) {
    return {
      internalId:     live.placeId,
      name:           live.name,
      lat:            live.lat,
      lng:            live.lng,
      distanceMeters: live.distanceMeters,
      source:         'live',
    };
  }

  // 5. Nothing resolved anywhere within the cap.
  return null;
}
