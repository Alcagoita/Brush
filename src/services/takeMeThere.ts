/**
 * takeMeThere.ts — KAN-279 "Take me there".
 *
 * The only in-app logic: is this task's POI type NOT in the Nearby list
 * right now (the same hero+grey set NearbyCard renders)? If so, it's far —
 * show the action. Reuses proximity.ts's own nearby state, so there's no
 * separate distance computation to get wrong or fall out of sync.
 *
 * No destination resolution/ranking — tapping opens a Maps text search
 * anchored at the current position; Maps finds the nearest match itself.
 * Shared here so the edit-screen header action and each Today row's icon
 * stay in sync (same label, same a11y phrasing, same tap behavior).
 */

import { isCatalogPoiType, poiCatalogLabel } from '../types';
import { localPoiLabel } from './poiTypeCache';
import { getPositionLowAccuracy } from './geolocation';
import { openMapsSearch } from './maps';
import { isPoiTypeNearby } from './proximity';
import { COPY } from '../constants/copy';

export function isTaskPoiFarAway(poiType: string): boolean {
  return !isPoiTypeNearby(poiType);
}

/** Human label for a POI type — catalog label for the 16 built-ins, the
 *  localized custom-category label otherwise. Used both as the Maps search
 *  query text and in the a11y phrasing below. */
export function getPoiSearchLabel(poiType: string): string {
  return isCatalogPoiType(poiType) ? poiCatalogLabel(poiType) : localPoiLabel(poiType);
}

export function getTakeMeThereA11yLabel(poiType: string): string {
  return COPY.takeMeThere.a11yFor(getPoiSearchLabel(poiType));
}

/**
 * Fetches the current position and opens a Maps search for `poiType` —
 * shared by the edit-screen header action and each Today row's icon.
 */
export async function openTakeMeThereMaps(poiType: string): Promise<void> {
  const coords = await getPositionLowAccuracy();
  await openMapsSearch(coords.lat, coords.lng, getPoiSearchLabel(poiType));
}
