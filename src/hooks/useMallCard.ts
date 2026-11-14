/**
 * useMallCard — KAN-514. Should Today show the mall Nearby card, and with
 * which rows?
 *
 * Yes when the user is inside a centre (KAN-513) AND we hold a COMPLETE copy
 * of that centre's inventory (KAN-382). Without a complete copy the card
 * would claim shops aren't there when they are, so Today keeps the outdoor
 * NearbyCard instead.
 *
 * The centre comes from the proximity engine's place context; when the
 * engine has none this tick (it only searches with open POI tasks), from the
 * centre detector's own memory, which the Lantern keeps current. A centre's
 * inventory can finish downloading while the user is already inside, so the
 * answer is recomputed when stored inventories change.
 */

import { useEffect, useMemo, useState } from 'react';
import type { PlaceContext } from '../services/proximity';
import type { LearnedBrand } from '../services/learnedPlaces';
import type { Task } from '../types';
import { getCurrentCentre } from '../services/centreDetection';
import { getVenueInventory, searchVenueUnits, subscribeVenueInventory } from '../services/venueInventory';
import { buildMallRows, type MallRow } from '../services/mallSuggestions';

export interface MallCard {
  venueId: string;
  name: string;
  rows: MallRow[];
}

export function useMallCard(
  placeContext: PlaceContext | null,
  tasks: Task[],
  learned: LearnedBrand[],
): MallCard | null {
  const [inventoryVersion, setInventoryVersion] = useState(0);
  useEffect(() => subscribeVenueInventory(() => setInventoryVersion(v => v + 1)), []);

  const centre = placeContext?.kind === 'centre'
    ? { venueId: placeContext.venueId, name: placeContext.name }
    : placeContext == null ? getCurrentCentre() : null;
  const venueId = centre?.venueId ?? null;
  const name = centre?.name ?? null;

  return useMemo(() => {
    if (!venueId || !name) { return null; }
    if (!getVenueInventory(venueId)?.complete) { return null; }
    const rows = buildMallRows(tasks, poiType => searchVenueUnits(venueId, { poiType }), learned);
    return { venueId, name, rows };
  // inventoryVersion isn't read inside: it's the signal that a stored
  // inventory changed, so the same centre must be read again.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, name, tasks, learned, inventoryVersion]);
}
