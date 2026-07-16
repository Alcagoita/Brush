/**
 * oneTripForAll.ts — KAN-281 "One trip for all of these".
 *
 * Orchestrates destinationResolver.ts across a whole trip, then orders the
 * resolved stops. Two hard rules (decided 2026-07-16):
 *
 *   - The entire trip computation makes AT MOST ONE Places API call, and
 *     usually zero: every task is first resolved locally (pinned/learned/
 *     cache — no network). Only the POI types still unresolved after that
 *     get bundled into a single `searchNearbyPlaces` call (never one call
 *     per task, never iterative widening).
 *   - We never compute routes — Google does. Ordering here is a trivial
 *     client-side greedy nearest-neighbor pass over straight-line distance,
 *     purely to pick a sensible stop sequence before handing off.
 */

import NetInfo from '@react-native-community/netinfo';
import { searchNearbyPlaces, getDistanceMeters } from './maps';
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

  let liveResults: PlacesMap = {};
  if (unresolvedTypes.length > 0 && await isOnline()) {
    try {
      liveResults = await searchNearbyPlaces(coords.lat, coords.lng, unresolvedTypes, ROUTE_MAX_RADIUS_M);
    } catch {
      // Timeout/network error — proceed with whatever resolved locally.
    }
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
