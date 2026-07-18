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
 * KAN-282 update (2026-07-18): that one call now always happens when online,
 * even if every task resolved locally (previously it was skipped entirely
 * in that case) — it also always requests `shopping_mall`, piggybacked in.
 * The offline habitat cache (background-refreshed, or an explicitly
 * downloaded trip area) is the primary, free way the mall card finds a
 * venue; this online call is what still makes "if I'm in range of a mall,
 * show it" true the FIRST time in a brand-new area with no cache yet —
 * "at most one call" stays true, it just no longer requires an unresolved
 * task to justify making it.
 */

import NetInfo from '@react-native-community/netinfo';
import { searchNearbyPlaces, getDistanceMeters, type NearbyPlace } from './maps';
import { getLearnedPlaceCounts } from './firestore';
import { computeLearnedPlaces } from './learnedPlaces';
import { resolveTaskDestination, ROUTE_MAX_RADIUS_M, type ResolvedPlace } from './destinationResolver';
import type { PlacesMap } from './proximity';
import type { Task } from '../types';

/** Google Maps' directions URL supports ~9 waypoints total. */
export const MAX_WAYPOINTS = 9;

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
): Promise<{ resolved: TripStop[]; excludedCount: number; liveMallCandidates: NearbyPlace[] }> {
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

  let liveResults: PlacesMap = {};
  let liveMallCandidates: NearbyPlace[] = [];
  // KAN-282 — always attempt this when online, even if unresolvedTypes is
  // empty (every task already resolved locally): that's still "at most one
  // call," it's just no longer conditional on a task needing it. Without
  // this, a brand-new area with a warm local cache for the trip's own POI
  // types but no shopping_mall data yet would never get a chance to check
  // for a mall at all — "in range" has to be checked on its own, not just
  // piggybacked when something else happens to need a live search too.
  if (await isOnline()) {
    const typesToRequest = unresolvedTypes.length > 0 ? [...unresolvedTypes, 'shopping_mall'] : ['shopping_mall'];
    try {
      liveResults = await searchNearbyPlaces(coords.lat, coords.lng, typesToRequest, ROUTE_MAX_RADIUS_M);
      // A place lands in the shopping_mall bucket if ANY of its Google types
      // matched our request — a supermarket occasionally also carries
      // shopping_mall as a secondary tag and would otherwise get offered up
      // as "the mall" under its own (wrong) name. Only trust it as a mall
      // when shopping_mall is genuinely its PRIMARY type.
      liveMallCandidates = (liveResults.shopping_mall ?? []).filter(p => p.primaryType === 'shopping_mall');
    } catch {
      // Timeout/network error — proceed with whatever resolved locally.
    }
  }

  const finalPass = await Promise.all(localPass.map(async (r) => {
    if (r.place) { return r; }
    return { task: r.task, place: await resolveTaskDestination(r.task, coords, learnedPlaces, liveResults) };
  }));

  const resolved = finalPass.filter((r): r is TripStop => r.place !== null);
  return { resolved, excludedCount: eligible.length - resolved.length, liveMallCandidates };
}

/**
 * Greedy nearest-neighbor ordering from `origin`, capped at MAX_WAYPOINTS.
 * Trivial client-side pass — no TSP heroics, no Directions/Distance Matrix
 * API calls (Google recalculates real routing once Maps opens anyway).
 */
export function planTrip(
  origin: { lat: number; lng: number },
  resolved: TripStop[],
  priorExcludedCount = 0,
): TripPlan {
  const remaining = [...resolved];
  const ordered: TripStop[] = [];
  let current = origin;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    remaining.forEach((stop, i) => {
      const d = getDistanceMeters(current.lat, current.lng, stop.place.lat, stop.place.lng);
      if (d < nearestDistance) { nearestDistance = d; nearestIndex = i; }
    });
    const [next] = remaining.splice(nearestIndex, 1);
    ordered.push(next);
    current = next.place;
  }

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
