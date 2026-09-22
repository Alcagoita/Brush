/**
 * oneTripForAll.ts — KAN-281 "One trip for all of these".
 *
 * Orchestrates destinationResolver.ts across a whole trip, then orders the
 * resolved stops. Two hard rules (decided 2026-07-16):
 *
 *   - The entire trip computation makes AT MOST ONE Places API call: every
 *     task is first resolved locally (pinned/learned/cache — no network),
 *     and whatever POI types are still unresolved after that get bundled
 *     into a single `searchNearbyPlaces` call (never one call per task,
 *     never iterative widening).
 *   - We never compute routes — Google does. Ordering here is a trivial
 *     client-side greedy nearest-neighbor pass over straight-line distance,
 *     purely to pick a sensible stop sequence before handing off.
 *
 * KAN-282 note (2026-07-19): mall discovery for the "All in one place" card
 * is NOT done here and adds no call of its own. After a long detour that
 * tried piggybacking `shopping_mall` onto (or beside) this Google call, mall
 * detection moved entirely onto OSM data — the offline habitat cache, which
 * proximity's background refresh and trip-area downloads already populate
 * with `shop=mall` way/relation footprints (including their area, for the
 * big-vs-small filter). Google's Nearby Search was both a noise source
 * (individual stores mistagged `shopping_mall`, with no geometry to tell a
 * real mall's footprint from a point) and a 20-result-cap liability, so it
 * no longer participates in mall discovery at all. See mallRoute.ts.
 */

import NetInfo from '@react-native-community/netinfo';
import { searchNearbyPlaces, getDistanceMeters } from './maps';
import { orderStopsNearestFirst } from './routeHandoff';
import { getLearnedPlaceCounts } from './firestore';
import { queryHabitatCache } from './habitatCache';
import { computeLearnedPlaces } from './learnedPlaces';
import { filterRoutePlacesForTask, resolveTaskDestination, ROUTE_MAX_RADIUS_M, type ResolvedPlace } from './destinationResolver';
import type { PlacesMap } from './proximity';
import type { Task } from '../types';

/** Google Maps' directions URL supports ~9 waypoints total. */
export const MAX_WAYPOINTS = 9;
/** Bounds local route enumeration so a large cache cannot stall refresh. */
export const MAX_LOCAL_ALTERNATIVES = 100;
/** Keeps local combination search responsive while still considering a useful local neighbourhood. */
const MAX_CANDIDATES_PER_REQUIREMENT = 5;
const MAX_ROUTE_EVALUATIONS = 10_000;

export interface TripStop {
  task: Task;
  place: ResolvedPlace;
}

export interface TripPlan {
  /** Ordered, capped at MAX_WAYPOINTS, nearest-first greedy path from `origin`. */
  stops: TripStop[];
  /** Eligible tasks that resolved to nowhere, or were cut by the waypoint cap. */
  excludedCount: number;
  /** Sum of straight-line legs (origin -> stop1 -> stop2 -> ... -> last), meters. */
  totalDistanceMeters: number;
}

/**
 * Finds the shortest straight-line walk through one locally cached candidate
 * for every requested task. Candidate choice and stop order are optimized
 * together; no network or persisted itinerary state is involved.
 */
export function planBestLocalTrip(
  tasks: Task[],
  coords: { lat: number; lng: number },
): TripPlan {
  const eligible = tasks.filter(t => !t.done && t.kind !== 'birthday' && t.poi).slice(0, MAX_WAYPOINTS);
  const excludedByCap = tasks.filter(t => !t.done && t.kind !== 'birthday' && t.poi).length - eligible.length;
  const types = [...new Set(eligible.map(task => task.poi as string))];
  const cached = queryHabitatCache(coords.lat, coords.lng, types, ROUTE_MAX_RADIUS_M, { maxResultsPerType: null });
  const candidatesByTask = eligible.map(task => cachedPlacesForTask(task, cached).slice(0, MAX_CANDIDATES_PER_REQUIREMENT));

  if (eligible.length === 0 || candidatesByTask.some(candidates => candidates.length === 0)) {
    return { stops: [], excludedCount: eligible.length + excludedByCap, totalDistanceMeters: 0 };
  }

  let best: TripPlan | null = null;
  let evaluations = 0;
  const chosen: TripStop[] = [];
  const consider = () => {
    const permutations = permute(chosen);
    for (const ordered of permutations) {
      if (evaluations++ >= MAX_ROUTE_EVALUATIONS) { return; }
      const totalDistanceMeters = routeDistance(coords, ordered);
      if (!best || totalDistanceMeters < best.totalDistanceMeters) {
        best = { stops: ordered, excludedCount: excludedByCap, totalDistanceMeters };
      }
    }
  };
  const choose = (taskIndex: number) => {
    if (evaluations >= MAX_ROUTE_EVALUATIONS) { return; }
    if (taskIndex === eligible.length) { consider(); return; }
    for (const candidate of candidatesByTask[taskIndex]) {
      chosen.push({
        task: eligible[taskIndex],
        place: { internalId: candidate.placeId, name: candidate.name, lat: candidate.lat, lng: candidate.lng, distanceMeters: candidate.distanceMeters, source: 'cache' },
      });
      choose(taskIndex + 1);
      chosen.pop();
      if (evaluations >= MAX_ROUTE_EVALUATIONS) { return; }
    }
  };
  choose(0);
  return best ?? { stops: [], excludedCount: eligible.length + excludedByCap, totalDistanceMeters: 0 };
}

/** Calculates the straight-line length of an already ordered local itinerary. */
function routeDistance(origin: { lat: number; lng: number }, stops: readonly TripStop[]): number {
  let total = 0;
  let previous = origin;
  for (const stop of stops) {
    total += getDistanceMeters(previous.lat, previous.lng, stop.place.lat, stop.place.lng);
    previous = stop.place;
  }
  return total;
}

/** Returns every visit order for the small, waypoint-capped stop set. */
function permute<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) { return [Array.from(items)]; }
  const result: T[][] = [];
  for (let index = 0; index < items.length; index++) {
    const remaining = [...items.slice(0, index), ...items.slice(index + 1)];
    for (const suffix of permute(remaining)) { result.push([items[index], ...suffix]); }
  }
  return result;
}

/**
 * Number of locally cached route variants available for a set of tasks.
 *
 * Each POI type advances through its nearby cached places in lockstep, just
 * like Nearby's "Try another place" cycle. The least common multiple makes
 * the sequence return to its first combination only after every type is back
 * at its first place. This is deliberately in-memory UI state only; nothing
 * about a route suggestion is persisted.
 */
export function getLocalTripAlternativeCount(
  tasks: Task[],
  coords: { lat: number; lng: number },
): number {
  const eligibleTypes = [...new Set(tasks
    .filter(t => !t.done && t.kind !== 'birthday' && t.poi)
    .map(t => t.poi as string))];
  if (eligibleTypes.length === 0) { return 0; }

  const cached = queryHabitatCache(
    coords.lat, coords.lng, eligibleTypes, ROUTE_MAX_RADIUS_M, { maxResultsPerType: null },
  );
  const eligible = tasks.filter(t => !t.done && t.kind !== 'birthday' && t.poi);
  const cycleLength = eligible
    .map(task => cachedPlacesForTask(task, cached).length)
    .filter(count => count > 0);
  if (cycleLength.length === 0) { return 0; }

  const rawCycleLength = cycleLength.reduce(
    (total, count) => boundedLeastCommonMultiple(total, count, MAX_LOCAL_ALTERNATIVES),
    1,
  );
  const visibleRoutes = new Set<string>();
  for (let index = 0; index < rawCycleLength; index++) {
    visibleRoutes.add(placeIdSetSignature(planCachedTripAlternative(eligible, coords, cached, index)));
  }
  return visibleRoutes.size;
}

/**
 * Rebuild one alternative using only the POIs already in the habitat cache.
 * It never reads learned places or makes a Places request, so refresh remains
 * a fully local operation even while offline.
 */
export function planLocalTripAlternative(
  tasks: Task[],
  coords: { lat: number; lng: number },
  alternativeIndex: number,
): TripPlan {
  const eligible = tasks.filter(t => !t.done && t.kind !== 'birthday' && t.poi);
  const eligibleTypes = [...new Set(eligible.map(t => t.poi as string))];
  const cached = queryHabitatCache(
    coords.lat, coords.lng, eligibleTypes, ROUTE_MAX_RADIUS_M, { maxResultsPerType: null },
  );

  return planCachedTripAlternative(eligible, coords, cached, alternativeIndex);
}

/** Builds one capped route from a previously read local cache snapshot. */
function planCachedTripAlternative(
  eligible: Task[],
  coords: { lat: number; lng: number },
  cached: PlacesMap,
  alternativeIndex: number,
): TripPlan {
  const resolved: TripStop[] = [];
  for (const task of eligible) {
    const candidates = cachedPlacesForTask(task, cached);
    if (candidates.length === 0) { continue; }
    const candidate = candidates[alternativeIndex % candidates.length];
    resolved.push({
      task,
      place: {
        internalId: candidate.placeId,
        name: candidate.name,
        lat: candidate.lat,
        lng: candidate.lng,
        distanceMeters: candidate.distanceMeters,
        source: 'cache',
      },
    });
  }

  return planTrip(coords, resolved, eligible.length - resolved.length);
}

/** Applies each task's optional subtype constraint to cached candidates. */
function cachedPlacesForTask(task: Task, cached: PlacesMap) {
  return filterRoutePlacesForTask(task, uniqueCachedPlaces(cached[task.poi as string]));
}

/** Stable identity for the visible venue set; stop ordering alone is not a new route. */
function placeIdSetSignature(plan: TripPlan): string {
  return [...new Set(plan.stops.map(stop => stop.place.internalId))].sort().join('\u0000');
}

/** Same place under two cached rows still counts as one venue in a route. */
function uniqueCachedPlaces<T extends { placeId: string }>(places: T[] | undefined): T[] {
  const byPlaceId = new Map<string, T>();
  for (const place of places ?? []) {
    if (!byPlaceId.has(place.placeId)) { byPlaceId.set(place.placeId, place); }
  }
  return [...byPlaceId.values()];
}

/** Euclidean greatest-common-divisor calculation for route-cycle lengths. */
function greatestCommonDivisor(a: number, b: number): number {
  while (b !== 0) { [a, b] = [b, a % b]; }
  return a;
}

/**
 * Cycle length at which two cached POI lists return to their first pairing,
 * saturated at the local enumeration limit before multiplication can overflow.
 */
function boundedLeastCommonMultiple(a: number, b: number, limit: number): number {
  const factor = b / greatestCommonDivisor(a, b);
  const safeLimit = Math.min(limit, Number.MAX_SAFE_INTEGER);
  return a > Math.floor(safeLimit / factor) ? safeLimit : a * factor;
}

async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected !== false && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}

/**
 * Resolves a destination for every eligible task (undone, not birthday, has
 * a poi), batching at most one live search for whatever's left unresolved
 * after the local-only pass. Never throws — a failed live search just means
 * fewer tasks resolve, same as no candidate existing at all.
 */
export async function resolveTripDestinations(
  tasks: Task[],
  coords: { lat: number; lng: number },
  uid: string,
): Promise<{ resolved: TripStop[]; excludedCount: number }> {
  const eligible = tasks.filter(t => !t.done && t.kind !== 'birthday' && t.poi);

  const counts = await getLearnedPlaceCounts(uid).catch(() => []);
  const learnedPlaces = computeLearnedPlaces(counts);

  const localPass = await Promise.all(eligible.map(async task => ({
    task,
    place: await resolveTaskDestination(task, coords, learnedPlaces),
  })));

  const unresolvedTypes = [...new Set(
    localPass.filter(r => r.place === null).map(r => r.task.poi as string),
  )];

  // The one live search: only for POI types that failed to resolve locally
  // (KAN-281's "at most one call"). Mall discovery is NOT here — it's
  // OSM/habitat-cache-based, see the header note and mallRoute.ts.
  let liveResults: PlacesMap = {};
  if (unresolvedTypes.length > 0 && await isOnline()) {
    liveResults = await searchNearbyPlaces(coords.lat, coords.lng, unresolvedTypes, ROUTE_MAX_RADIUS_M)
      .then(r => r.results)
      .catch(() => ({} as PlacesMap));
  }

  const finalPass = await Promise.all(localPass.map(async (r) => {
    if (r.place) { return r; }
    return { task: r.task, place: await resolveTaskDestination(r.task, coords, learnedPlaces, liveResults) };
  }));

  const resolved = finalPass.filter((r): r is TripStop => r.place !== null);
  return { resolved, excludedCount: eligible.length - resolved.length };
}

/**
 * Greedy nearest-neighbor ordering from `origin`, capped at MAX_WAYPOINTS.
 * Trivial client-side pass — no TSP heroics, no Directions/Distance Matrix
 * API calls (Google recalculates real routing once Maps opens anyway).
 *
 * The ordering itself lives in routeHandoff.ts (KAN-283), shared with the
 * Nearby cluster box — it's pure geometry with no notion of scale. The
 * waypoint cap, total distance and exclusion counting below are trip
 * concerns and stay here.
 */
export function planTrip(
  origin: { lat: number; lng: number },
  resolved: TripStop[],
  priorExcludedCount = 0,
): TripPlan {
  const ordered = orderStopsNearestFirst(origin, resolved, stop => stop.place);

  const stops = ordered.slice(0, MAX_WAYPOINTS);
  const cappedCount = ordered.length - stops.length;

  let totalDistanceMeters = 0;
  let leg = origin;
  for (const stop of stops) {
    totalDistanceMeters += getDistanceMeters(leg.lat, leg.lng, stop.place.lat, stop.place.lng);
    leg = stop.place;
  }

  return { stops, excludedCount: priorExcludedCount + cappedCount, totalDistanceMeters };
}
