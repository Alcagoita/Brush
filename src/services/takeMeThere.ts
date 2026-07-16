/**
 * takeMeThere.ts — KAN-279 "Take me there" destination resolver.
 *
 * Pull, not push: only called when the user opens a task's details and asks
 * for a destination — never runs in the background, never fires a
 * notification. Resolution order, first match wins:
 *
 *   1. Pinned `poiPlaceId` on the task (rare — set via Places autocomplete).
 *   2. Learned place for the task's POI type (KAN-230 ranking) — "your"
 *      place wins even if another candidate is closer.
 *   3. Nearest matching place in the offline habitat cache (KAN-228).
 *   4. One live Places search with a wider radius, only attempted if online.
 *   5. No candidate anywhere — returns null. Absence over apology: the
 *      caller renders nothing, never a disabled button or error state.
 *
 * Never throws — every step is best-effort and falls through to the next.
 */

import NetInfo from '@react-native-community/netinfo';
import { getPlaceDetails, searchNearbyPlaces } from './maps';
import { queryHabitatCache, getHabitatPlaceById } from './habitatCache';
import { getLearnedPlaceCounts } from './firestore';
import { computeLearnedPlaces, getLearnedPlaceForPoiType } from './learnedPlaces';

/** Wider than the cache's own default (HABITAT_RADIUS_M, 5 km) and far
 *  beyond the 400 m NEARBY radius — this is a deliberate, user-requested
 *  reach-out, not a passive proximity check. */
const LIVE_SEARCH_RADIUS_M = 15_000;

export type TakeMeThereSource = 'pinned' | 'learned' | 'cache' | 'live';

export interface TakeMeThereDestination {
  lat: number;
  lng: number;
  name: string;
  /** Straight-line distance from the current position, in meters — absent
   *  for 'pinned'/'learned' (resolved independent of current distance). */
  distanceMeters?: number;
  source: TakeMeThereSource;
}

async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected !== false && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}

export async function resolveTakeMeThereDestination(options: {
  uid: string;
  poiType: string;
  poiPlaceId?: string;
  currentLat: number;
  currentLng: number;
}): Promise<TakeMeThereDestination | null> {
  const { uid, poiType, poiPlaceId, currentLat, currentLng } = options;

  // 1. Pinned place wins over everything.
  if (poiPlaceId) {
    const pinned = await getPlaceDetails(poiPlaceId).catch(() => null);
    if (pinned) {
      return { lat: pinned.lat, lng: pinned.lng, name: pinned.name, source: 'pinned' };
    }
  }

  // 2. Learned place for this POI type — wins even if farther than nearby
  // candidates. Falls through (rather than returning null) if the learned
  // record's own coordinates can't be resolved, e.g. its habitat row was
  // since evicted.
  try {
    const counts = await getLearnedPlaceCounts(uid);
    const learned = getLearnedPlaceForPoiType(computeLearnedPlaces(counts), poiType);
    if (learned) {
      const place = getHabitatPlaceById(learned.placeId);
      if (place) {
        return { lat: place.lat, lng: place.lng, name: learned.name, source: 'learned' };
      }
    }
  } catch {
    // Best-effort — fall through to cache/live search.
  }

  // 3. Nearest matching place from the offline habitat cache.
  const cached = queryHabitatCache(currentLat, currentLng, [poiType])[poiType]?.[0];
  if (cached) {
    return { lat: cached.lat, lng: cached.lng, name: cached.name, distanceMeters: cached.distanceMeters, source: 'cache' };
  }

  // 4. One live search, wider radius — only if online.
  if (await isOnline()) {
    try {
      const live = (await searchNearbyPlaces(currentLat, currentLng, [poiType], LIVE_SEARCH_RADIUS_M))[poiType]?.[0];
      if (live) {
        return { lat: live.lat, lng: live.lng, name: live.name, distanceMeters: live.distanceMeters, source: 'live' };
      }
    } catch {
      // Best-effort — falls through to hidden.
    }
  }

  // 5. Nothing resolved — the action doesn't render.
  return null;
}
