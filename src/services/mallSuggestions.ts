/**
 * mallSuggestions.ts — KAN-514. What the mall Nearby card shows, decided
 * without React so every rule is testable on its own.
 *
 * Inside a shopping centre (KAN-513) the card lists, for each open task the
 * centre can solve, one place and its floor — never a distance
 * (docs/KAN-512-mall-floors.md, decisions 2–8 and 4b):
 *
 *   • A place matches a task by the SAME rules as the outdoor Nearby card:
 *     type, then store kind / cuisine / financial kind, then brand (Gym, Bank,
 *     Store). The checks are the outdoor ones, reused, not re-implemented.
 *   • A brand's units in one centre are ONE candidate, carrying every floor
 *     (OAKBERRY on Piso 0 and 2): "Try another place" always reaches a
 *     different place, never the same shop one floor up.
 *   • Candidates per task: the user's learned brand first, then lowest floor,
 *     then name.
 *   • Rows: by their shown candidate's lowest floor, lowest first, no floor
 *     last; ties keep the task list's own order. Sorted once, when built —
 *     a swapped row keeps its place until the next entry (KAN-514).
 *
 * The user's own floor is never assumed, asked or inferred.
 */

import type { Task } from '../types';
import type { LearnedBrand } from './learnedPlaces';
import { brandTaskMatchesPlace } from './brandDictionary';
import { financialServiceTaskMatchesPlace } from './financialServiceKinds';
import type { FinancialServiceKind } from './financialServiceKinds';
import { restaurantTaskMatchesPlaceName, type RestaurantFoodType } from './restaurantFoodTypes';
import { storeTaskMatchesPlaceName, type StoreSubtype } from './storeSubtypes';
import { getLearnedPlaceForPoiType } from './learnedPlaces';
import type { VenueUnit } from './venueInventory';

/** One place a task can be solved at: a brand (or a single unbranded unit) and every floor it's on. */
export interface MallCandidate {
  /** Stable within the centre: the brand, or the unit key for an unbranded unit. */
  key: string;
  name: string;
  /** Distinct floors, lowest first. Empty when no unit states one. */
  floors: string[];
  poiType: string;
}

export interface MallRow {
  task: Task;
  /** At least one; index 0 is shown first. */
  candidates: MallCandidate[];
}

/** The shape the outdoor matchers read, built from a unit's served attributes. */
function asPlace(unit: VenueUnit) {
  return {
    name: unit.name,
    brand: unit.brand,
    storeSubtypes: (unit.attributes.store_kind ?? []) as StoreSubtype[],
    restaurantFoodTypes: (unit.attributes.food_cuisine ?? []) as RestaurantFoodType[],
    financialServiceKinds: (unit.attributes.financial_service_kind ?? []) as FinancialServiceKind[],
  };
}

/** Does this unit solve this task, by the outdoor Nearby rules? */
export function unitSolvesTask(task: Task, unit: VenueUnit): boolean {
  if (!task.poi || unit.poiType !== task.poi) { return false; }
  const place = asPlace(unit);
  return restaurantTaskMatchesPlaceName(task, place)
    && storeTaskMatchesPlaceName(task, place)
    && financialServiceTaskMatchesPlace(task, place)
    && brandTaskMatchesPlace(task, place);
}

/** "-1" < "0" < "2"; a missing floor sorts after every real one. */
export function floorRank(floor: string | null | undefined): number {
  if (floor == null || floor === '') { return Number.POSITIVE_INFINITY; }
  const n = Number(floor);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function lowestFloor(candidate: MallCandidate): number {
  return candidate.floors.length > 0 ? floorRank(candidate.floors[0]) : Number.POSITIVE_INFINITY;
}

function normalizedName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

/** Same-brand units become one candidate; an unbranded unit stands alone. */
export function groupCandidates(units: VenueUnit[]): MallCandidate[] {
  const byKey = new Map<string, MallCandidate>();
  for (const unit of units) {
    const key = unit.brand ? `brand:${unit.brand}` : `unit:${unit.key}`;
    const existing = byKey.get(key);
    if (existing) {
      if (unit.floor != null && unit.floor !== '' && !existing.floors.includes(unit.floor)) {
        existing.floors.push(unit.floor);
      }
    } else {
      byKey.set(key, {
        key,
        name: unit.brand ?? unit.name,
        floors: unit.floor != null && unit.floor !== '' ? [unit.floor] : [],
        poiType: unit.poiType,
      });
    }
  }
  for (const candidate of byKey.values()) {
    candidate.floors.sort((a, b) => floorRank(a) - floorRank(b));
  }
  return [...byKey.values()];
}

/**
 * The card's rows for this centre. `unitsFor(poiType)` answers from the
 * downloaded inventory (venueInventory.searchVenueUnits); tasks come in the
 * task list's own order.
 */
export function buildMallRows(
  tasks: Task[],
  unitsFor: (poiType: string) => VenueUnit[],
  learned: LearnedBrand[],
): MallRow[] {
  const unitCache = new Map<string, VenueUnit[]>();
  const rows: Array<MallRow & { order: number }> = [];

  tasks.forEach((task, order) => {
    if (task.done || !task.poi) { return; }
    let units = unitCache.get(task.poi);
    if (!units) { units = unitsFor(task.poi); unitCache.set(task.poi, units); }
    const candidates = groupCandidates(units.filter(unit => unitSolvesTask(task, unit)));
    if (candidates.length === 0) { return; }

    const learnedName = getLearnedPlaceForPoiType(learned, task.poi)?.name;
    const isLearned = (c: MallCandidate) =>
      learnedName != null && normalizedName(c.name) === normalizedName(learnedName);
    candidates.sort((a, b) =>
      Number(isLearned(b)) - Number(isLearned(a))
      || lowestFloor(a) - lowestFloor(b)
      || a.name.localeCompare(b.name));

    rows.push({ task, candidates, order });
  });

  rows.sort((a, b) => lowestFloor(a.candidates[0]) - lowestFloor(b.candidates[0]) || a.order - b.order);
  return rows.map(({ task, candidates }) => ({ task, candidates }));
}

/** The next candidate index, wrapping after the last (as NearbyCard's handleTryAnother). */
export function nextCandidateIndex(current: number, count: number): number {
  return count <= 1 ? 0 : (current + 1) % count;
}

/**
 * The floor line for a candidate, in the user's language:
 * "Floor 1", "Floors 0 and 2", "Floors -1 and 0 +1"; null when no unit
 * states a floor (the row shows the name only).
 */
export function formatFloors(
  floors: string[],
  copy: { floor: (f: string) => string; floors: (a: string, b: string) => string; moreFloors: (n: number) => string },
): string | null {
  if (floors.length === 0) { return null; }
  if (floors.length === 1) { return copy.floor(floors[0]); }
  const two = copy.floors(floors[0], floors[1]);
  return floors.length > 2 ? `${two} ${copy.moreFloors(floors.length - 2)}` : two;
}
