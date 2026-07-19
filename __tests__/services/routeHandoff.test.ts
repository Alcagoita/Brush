/**
 * KAN-283 — orderStopsNearestFirst: the one piece of geometry shared between
 * "One trip for all of these" (KAN-281) and the Nearby cluster box.
 *
 * The two features are otherwise unrelated — one plans across a 5 km radius
 * with a waypoint cap, the other hands off a few-hundred-metre walk the
 * proximity engine already found. What they share is that greedy
 * nearest-neighbour ordering has no notion of scale, which is exactly what
 * these tests pin down: identical behaviour at both distances.
 */

// maps.ts pulls in placesFunctions -> @react-native-firebase/functions, a
// native module unavailable under Jest. Flat-earth approximation is plenty
// accurate for ordering assertions.
jest.mock('../../src/services/maps', () => ({
  getDistanceMeters: (lat1: number, lng1: number, lat2: number, lng2: number) =>
    Math.round(Math.hypot(lat2 - lat1, lng2 - lng1) * 111_000),
}));

import { orderStopsNearestFirst } from '../../src/services/routeHandoff';

const ORIGIN = { lat: 0, lng: 0 };

/** Named point at `lat` degrees north of the origin. */
function pt(name: string, lat: number, lng = 0) {
  return { name, lat, lng };
}

const names = (items: { name: string }[]) => items.map(i => i.name);

describe('orderStopsNearestFirst', () => {
  it('returns an empty array for no items', () => {
    expect(orderStopsNearestFirst(ORIGIN, [], (p: { lat: number; lng: number }) => p)).toEqual([]);
  });

  it('returns a single item unchanged', () => {
    const only = pt('only', 0.005);
    expect(orderStopsNearestFirst(ORIGIN, [only], p => p)).toEqual([only]);
  });

  it('orders points nearest-first from the origin', () => {
    const items = [pt('far', 0.003), pt('near', 0.001), pt('mid', 0.002)];
    expect(names(orderStopsNearestFirst(ORIGIN, items, p => p))).toEqual(['near', 'mid', 'far']);
  });

  it('hops from the last stop, not from the origin', () => {
    // 'backtrack' is nearer to the origin than 'chain', but once the walk has
    // reached 'start' the next hop is judged from THERE — which is the whole
    // point of nearest-neighbour versus just sorting by distance-from-origin.
    const items = [
      pt('start', 0.010),
      pt('chain', 0.011),      // 111 m from 'start'
      pt('backtrack', 0.005),  // closer to origin, but 500 m from 'start'
    ];
    expect(names(orderStopsNearestFirst(ORIGIN, items, p => p))).toEqual(['backtrack', 'start', 'chain']);
  });

  it('behaves identically at cluster scale and trip scale — the math has no notion of distance', () => {
    const walk = [pt('c', 0.0003), pt('a', 0.0001), pt('b', 0.0002)]; // ~33/11/22 m
    const trip = [pt('c', 0.03), pt('a', 0.01), pt('b', 0.02)];       // ~3.3/1.1/2.2 km

    expect(names(orderStopsNearestFirst(ORIGIN, walk, p => p))).toEqual(['a', 'b', 'c']);
    expect(names(orderStopsNearestFirst(ORIGIN, trip, p => p))).toEqual(['a', 'b', 'c']);
  });

  it('reads coordinates through getPoint, so callers keep their own shapes', () => {
    // Mirrors the two real callers: a trip stop and a bundle entry both wrap
    // their coordinates in a nested `place`.
    const wrapped = [
      { id: 'far', place: { lat: 0.003, lng: 0 } },
      { id: 'near', place: { lat: 0.001, lng: 0 } },
    ];
    const ordered = orderStopsNearestFirst(ORIGIN, wrapped, w => w.place);
    expect(ordered.map(w => w.id)).toEqual(['near', 'far']);
  });

  it('never mutates the caller\'s array', () => {
    const items = [pt('far', 0.003), pt('near', 0.001)];
    const snapshot = [...items];

    orderStopsNearestFirst(ORIGIN, items, p => p);

    expect(items).toEqual(snapshot);
  });
});
