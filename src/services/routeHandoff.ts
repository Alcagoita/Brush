/**
 * routeHandoff.ts — shared stop-ordering for multi-stop Maps handoffs
 * (KAN-283, extracted from KAN-281's planTrip).
 *
 * Deliberately narrow. The two features that hand off a route are NOT the
 * same thing and must not be merged:
 *
 *   - KAN-281 "One trip for all of these" — every eligible task of the day,
 *     resolved anywhere inside a 5 km radius. Cares about a waypoint cap,
 *     a total distance to display, and how many tasks it had to exclude.
 *   - KAN-283 Nearby cluster box — tasks the proximity engine already found
 *     clustered within a few hundred metres of each other. None of those
 *     trip concerns apply: it's a short walk that's already known to be one.
 *
 * What they genuinely share is the geometry, and only the geometry: greedy
 * nearest-neighbour ordering has no notion of scale, so ordering three
 * points 200 m apart runs the identical math as ordering nine points 4 km
 * apart. That one pure function lives here. Everything scale- or
 * feature-specific stays with its own feature.
 *
 * The URL builder is likewise already shared — see maps.ts's
 * openMultiStopDirections, which both callers use directly.
 *
 * We never compute real routes; Google does that once Maps opens. This is
 * purely about the order stops are handed over in.
 */

import { getDistanceMeters } from './maps';

export interface RoutePoint {
  lat: number;
  lng: number;
}

/**
 * Orders `items` greedily nearest-first, walking outward from `origin`:
 * repeatedly hop to whichever remaining item is closest to where the last
 * hop ended. `getPoint` maps an item to its coordinates, so callers can pass
 * their own richer shapes (a trip stop, a bundle entry) without this module
 * knowing anything about them.
 *
 * Not optimal — that would be a travelling-salesman solve, which is both
 * overkill and pointless here, since Maps re-optimises the real route on the
 * other side of the handoff anyway. Greedy is stable, O(n²) on a handful of
 * points, and produces a sane visiting order.
 *
 * Pure: never mutates `items`, and returns a new array.
 */
export function orderStopsNearestFirst<T>(
  origin: RoutePoint,
  items: readonly T[],
  getPoint: (item: T) => RoutePoint,
): T[] {
  const remaining = [...items];
  const ordered: T[] = [];
  let current: RoutePoint = origin;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    remaining.forEach((item, i) => {
      const point = getPoint(item);
      const d = getDistanceMeters(current.lat, current.lng, point.lat, point.lng);
      if (d < nearestDistance) { nearestDistance = d; nearestIndex = i; }
    });
    const [next] = remaining.splice(nearestIndex, 1);
    ordered.push(next);
    current = getPoint(next);
  }

  return ordered;
}
