/**
 * KAN-281 — oneTripForAll.ts
 *
 * Covers:
 *  - resolveTripDestinations: local-only resolution first, at most ONE
 *    batched searchNearbyPlaces call for whatever's still unresolved,
 *    zero calls when the local pass resolves everything, offline never
 *    attempts a live call.
 *  - planTrip: greedy nearest-neighbor ordering, waypoint cap, total
 *    straight-line distance.
 */

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock'),
);

const mockSearchNearbyPlaces = jest.fn();
jest.mock('../../src/services/maps', () => ({
  searchNearbyPlaces: (...args: unknown[]) => mockSearchNearbyPlaces(...args),
  getDistanceMeters: (lat1: number, lng1: number, lat2: number, lng2: number) =>
    Math.round(Math.hypot(lat2 - lat1, lng2 - lng1) * 111_000),
}));

const mockQueryHabitatCache = jest.fn();
const mockGetHabitatPlaceById = jest.fn();
jest.mock('../../src/services/habitatCache', () => ({
  queryHabitatCache:   (...args: unknown[]) => mockQueryHabitatCache(...args),
  getHabitatPlaceById: (...args: unknown[]) => mockGetHabitatPlaceById(...args),
}));

const mockGetLearnedPlaceCounts = jest.fn();
jest.mock('../../src/services/firestore', () => ({
  getLearnedPlaceCounts: (...args: unknown[]) => mockGetLearnedPlaceCounts(...args),
}));

import NetInfo from '@react-native-community/netinfo';
import {
  getLocalTripAlternativeCount,
  planLocalTripAlternative,
  resolveTripDestinations,
  planTrip,
  MAX_WAYPOINTS,
  type TripStop,
} from '../../src/services/oneTripForAll';
import type { Task } from '../../src/types';

const COORDS = { lat: 38.7, lng: -9.1 };
const FAKE_TIMESTAMP = { seconds: 0, nanoseconds: 0 } as unknown as Task['createdAt'];

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1', title: 'Task', category: 'errands', done: false,
    date: '2026-07-16', createdAt: FAKE_TIMESTAMP, poi: 'pharmacy',
    ...overrides,
  };
}

describe('resolveTripDestinations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLearnedPlaceCounts.mockResolvedValue([]);
    mockQueryHabitatCache.mockReturnValue({});
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true, isInternetReachable: true });
  });

  it('makes ZERO Places API calls when the local-only pass resolves everything', async () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [{ placeId: 'p1', name: 'Pharmacy A', lat: 38.71, lng: -9.11, distanceMeters: 200 }],
      atm:      [{ placeId: 'a1', name: 'ATM A', lat: 38.72, lng: -9.12, distanceMeters: 300 }],
    });

    const tasks = [makeTask({ id: 't1', poi: 'pharmacy' }), makeTask({ id: 't2', poi: 'atm' })];
    const { resolved, excludedCount } = await resolveTripDestinations(tasks, COORDS, 'uid-1');

    expect(resolved).toHaveLength(2);
    expect(excludedCount).toBe(0);
    expect(mockSearchNearbyPlaces).not.toHaveBeenCalled();
  });

  it('makes AT MOST ONE batched searchNearbyPlaces call for all unresolved types together', async () => {
    mockQueryHabitatCache.mockReturnValue({}); // nothing cached, nothing learned
    mockSearchNearbyPlaces.mockResolvedValue({
      results: {
        pharmacy: [{ placeId: 'live-1', name: 'Live Pharmacy', lat: 38.73, lng: -9.13, distanceMeters: 1000 }],
        atm:      [{ placeId: 'live-2', name: 'Live ATM', lat: 38.74, lng: -9.14, distanceMeters: 1200 }],
      },
      source: 'osm',
    });

    const tasks = [
      makeTask({ id: 't1', poi: 'pharmacy' }),
      makeTask({ id: 't2', poi: 'atm' }),
      makeTask({ id: 't3', poi: 'cafe' }),
    ];
    const { resolved } = await resolveTripDestinations(tasks, COORDS, 'uid-1');

    expect(mockSearchNearbyPlaces).toHaveBeenCalledTimes(1);
    expect(mockSearchNearbyPlaces).toHaveBeenCalledWith(
      COORDS.lat, COORDS.lng, expect.arrayContaining(['pharmacy', 'atm', 'cafe']), expect.any(Number),
    );
    expect(resolved).toHaveLength(2); // cafe never resolved (not in live results)
  });

  // KAN-282: mall discovery used to be piggybacked onto (and later run
  // beside) this call. It isn't any more — it moved entirely onto OSM /
  // the habitat cache, because Google's Nearby Search both returned stores
  // mistagged as malls and capped at 20 results, crowding real malls out.
  // These two guard the call budget that regression cost us.
  it('never asks Google for shopping_mall — mall discovery is not this call\'s job', async () => {
    mockQueryHabitatCache.mockReturnValue({});
    mockSearchNearbyPlaces.mockResolvedValue({
      results: { pharmacy: [{ placeId: 'live-1', name: 'Live Pharmacy', lat: 38.73, lng: -9.13, distanceMeters: 1000 }] },
      source: 'osm',
    });

    const tasks = [makeTask({ id: 't1', poi: 'pharmacy' })];
    await resolveTripDestinations(tasks, COORDS, 'uid-1');

    expect(mockSearchNearbyPlaces).toHaveBeenCalledTimes(1);
    const [, , requestedTypes] = mockSearchNearbyPlaces.mock.calls[0];
    expect(requestedTypes).not.toContain('shopping_mall');
  });

  it('makes ZERO Places calls when every task resolves locally', async () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [{ placeId: 'p1', name: 'Pharmacy A', lat: 38.71, lng: -9.11, distanceMeters: 200 }],
    });
    const tasks = [makeTask({ id: 't1', poi: 'pharmacy' })];
    await resolveTripDestinations(tasks, COORDS, 'uid-1');

    expect(mockSearchNearbyPlaces).not.toHaveBeenCalled();
  });

  it('does NOT attempt a live search when offline', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });
    mockQueryHabitatCache.mockReturnValue({});

    const tasks = [makeTask()];
    const { resolved, excludedCount } = await resolveTripDestinations(tasks, COORDS, 'uid-1');

    expect(mockSearchNearbyPlaces).not.toHaveBeenCalled();
    expect(resolved).toHaveLength(0);
    expect(excludedCount).toBe(1);
  });

  it('excludes birthday tasks and tasks without a poi', async () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [{ placeId: 'p1', name: 'Pharmacy A', lat: 38.71, lng: -9.11, distanceMeters: 200 }],
    });

    const tasks = [
      makeTask({ id: 't1', poi: 'pharmacy' }),
      makeTask({ id: 't2', kind: 'birthday', poi: undefined }),
      makeTask({ id: 't3', poi: undefined }),
    ];
    const { resolved } = await resolveTripDestinations(tasks, COORDS, 'uid-1');

    expect(resolved).toHaveLength(1);
    expect(resolved[0].task.id).toBe('t1');
  });

  it('excludes done tasks', async () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [{ placeId: 'p1', name: 'Pharmacy A', lat: 38.71, lng: -9.11, distanceMeters: 200 }],
    });
    const tasks = [makeTask({ done: true })];
    const { resolved } = await resolveTripDestinations(tasks, COORDS, 'uid-1');
    expect(resolved).toHaveLength(0);
  });

  it('does NOT throw when NetInfo.fetch() rejects — treats it as offline, keeps local-only results', async () => {
    (NetInfo.fetch as jest.Mock).mockRejectedValue(new Error('netinfo error'));
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [{ placeId: 'p1', name: 'Pharmacy A', lat: 38.71, lng: -9.11, distanceMeters: 200 }],
    });

    const tasks = [makeTask({ id: 't1', poi: 'pharmacy' }), makeTask({ id: 't2', poi: 'atm' })];
    const result = await resolveTripDestinations(tasks, COORDS, 'uid-1');

    expect(mockSearchNearbyPlaces).not.toHaveBeenCalled();
    expect(result.resolved.map(r => r.task.id)).toEqual(['t1']);
    expect(result.excludedCount).toBe(1);
  });

  it('does NOT throw when searchNearbyPlaces rejects — proceeds with whatever resolved locally', async () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [{ placeId: 'p1', name: 'Pharmacy A', lat: 38.71, lng: -9.11, distanceMeters: 200 }],
    });
    mockSearchNearbyPlaces.mockRejectedValue(new Error('timeout'));

    const tasks = [makeTask({ id: 't1', poi: 'pharmacy' }), makeTask({ id: 't2', poi: 'atm' })];
    const result = await resolveTripDestinations(tasks, COORDS, 'uid-1');

    expect(mockSearchNearbyPlaces).toHaveBeenCalledTimes(1);
    expect(result.resolved.map(r => r.task.id)).toEqual(['t1']);
    expect(result.excludedCount).toBe(1);
  });
});

describe('planTrip', () => {
  function stop(id: string, lat: number, lng: number, name = id): TripStop {
    return { task: makeTask({ id }), place: { internalId: id, name, lat, lng, distanceMeters: 0, source: 'cache' } };
  }

  it('orders stops nearest-first from the origin (greedy)', () => {
    // Origin at (0,0). B is closest, then C, then A (deliberately out of input order).
    const stops = [stop('A', 0, 0.03), stop('B', 0, 0.01), stop('C', 0, 0.02)];
    const plan = planTrip({ lat: 0, lng: 0 }, stops);
    expect(plan.stops.map(s => s.task.id)).toEqual(['B', 'C', 'A']);
  });

  it('caps at MAX_WAYPOINTS and counts the rest as excluded', () => {
    const stops = Array.from({ length: MAX_WAYPOINTS + 3 }, (_, i) => stop(`s${i}`, 0, i * 0.001));
    const plan = planTrip({ lat: 0, lng: 0 }, stops);
    expect(plan.stops).toHaveLength(MAX_WAYPOINTS);
    expect(plan.excludedCount).toBe(3);
  });

  it('adds priorExcludedCount to the waypoint-cap exclusions', () => {
    const stops = [stop('A', 0, 0.01)];
    const plan = planTrip({ lat: 0, lng: 0 }, stops, 2);
    expect(plan.excludedCount).toBe(2);
  });

  it('computes the total straight-line distance across all legs', () => {
    const stops = [stop('A', 0, 0.01)]; // ~1111m from origin at equator
    const plan = planTrip({ lat: 0, lng: 0 }, stops);
    expect(plan.totalDistanceMeters).toBeGreaterThan(1000);
    expect(plan.totalDistanceMeters).toBeLessThan(1300);
  });

  it('returns zero stops and zero distance for an empty trip', () => {
    const plan = planTrip({ lat: 0, lng: 0 }, []);
    expect(plan.stops).toHaveLength(0);
    expect(plan.totalDistanceMeters).toBe(0);
  });
});

describe('local itinerary alternatives (KAN-291)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cycles cached POIs locally without calling Places', () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [
        { placeId: 'p1', name: 'Pharmacy A', lat: 38.71, lng: -9.11, distanceMeters: 200 },
        { placeId: 'p2', name: 'Pharmacy B', lat: 38.72, lng: -9.12, distanceMeters: 300 },
      ],
      atm: [
        { placeId: 'a1', name: 'ATM A', lat: 38.73, lng: -9.13, distanceMeters: 400 },
        { placeId: 'a2', name: 'ATM B', lat: 38.74, lng: -9.14, distanceMeters: 500 },
      ],
    });
    const tasks = [makeTask({ id: 't1', poi: 'pharmacy' }), makeTask({ id: 't2', poi: 'atm' })];

    expect(getLocalTripAlternativeCount(tasks, COORDS)).toBe(2);
    expect(planLocalTripAlternative(tasks, COORDS, 0).stops.map(stop => stop.place.internalId).sort()).toEqual(['a1', 'p1']);
    expect(planLocalTripAlternative(tasks, COORDS, 1).stops.map(stop => stop.place.internalId).sort()).toEqual(['a2', 'p2']);
    expect(planLocalTripAlternative(tasks, COORDS, 2).stops.map(stop => stop.place.internalId).sort()).toEqual(['a1', 'p1']);
    expect(mockSearchNearbyPlaces).not.toHaveBeenCalled();
  });

  it('uses the least common multiple so mixed candidate lists cycle correctly', () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [
        { placeId: 'p1', name: 'Pharmacy A', lat: 38.71, lng: -9.11, distanceMeters: 200 },
        { placeId: 'p2', name: 'Pharmacy B', lat: 38.72, lng: -9.12, distanceMeters: 300 },
      ],
      atm: [
        { placeId: 'a1', name: 'ATM A', lat: 38.73, lng: -9.13, distanceMeters: 400 },
        { placeId: 'a2', name: 'ATM B', lat: 38.74, lng: -9.14, distanceMeters: 500 },
        { placeId: 'a3', name: 'ATM C', lat: 38.75, lng: -9.15, distanceMeters: 600 },
      ],
    });
    const tasks = [makeTask({ id: 't1', poi: 'pharmacy' }), makeTask({ id: 't2', poi: 'atm' })];

    expect(getLocalTripAlternativeCount(tasks, COORDS)).toBe(6);
    expect(planLocalTripAlternative(tasks, COORDS, 5).stops.map(stop => stop.place.internalId).sort()).toEqual(['a3', 'p2']);
    expect(planLocalTripAlternative(tasks, COORDS, 6).stops.map(stop => stop.place.internalId).sort()).toEqual(['a1', 'p1']);
  });

  it('reports one alternative when every resolvable type has one cached POI', () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [{ placeId: 'p1', name: 'Pharmacy A', lat: 38.71, lng: -9.11, distanceMeters: 200 }],
      atm: [{ placeId: 'a1', name: 'ATM A', lat: 38.73, lng: -9.13, distanceMeters: 400 }],
    });

    expect(getLocalTripAlternativeCount([
      makeTask({ id: 't1', poi: 'pharmacy' }), makeTask({ id: 't2', poi: 'atm' }),
    ], COORDS)).toBe(1);
  });

  it('does not count duplicate cached rows as another route', () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [
        { placeId: 'p1', name: 'Pharmacy A', lat: 38.71, lng: -9.11, distanceMeters: 200 },
        { placeId: 'p1', name: 'Pharmacy A', lat: 38.71, lng: -9.11, distanceMeters: 200 },
      ],
    });

    expect(getLocalTripAlternativeCount([makeTask()], COORDS)).toBe(1);
  });

  it('cycles only cached stores that match the task subtype', () => {
    mockQueryHabitatCache.mockReturnValue({
      store: [
        { placeId: 'clothes', name: 'Fashion House', lat: 38.701, lng: -9.101, distanceMeters: 50, storeSubtype: 'clothing' },
        { placeId: 'electronics-1', name: 'Tech Shop A', lat: 38.702, lng: -9.102, distanceMeters: 100, storeSubtype: 'electronics' },
        { placeId: 'electronics-2', name: 'Tech Shop B', lat: 38.703, lng: -9.103, distanceMeters: 150, storeSubtype: 'electronics' },
      ],
    });
    const tasks = [makeTask({ poi: 'store', storeSubtype: 'electronics' })];

    expect(getLocalTripAlternativeCount(tasks, COORDS)).toBe(2);
    expect(planLocalTripAlternative(tasks, COORDS, 0).stops[0].place.internalId).toBe('electronics-1');
    expect(planLocalTripAlternative(tasks, COORDS, 1).stops[0].place.internalId).toBe('electronics-2');
  });

  it('cycles only cached restaurants and financial services matching their selected subtypes', () => {
    mockQueryHabitatCache.mockReturnValue({
      restaurant: [
        { placeId: 'sushi', name: 'Sushi House', lat: 38.701, lng: -9.101, distanceMeters: 50, restaurantFoodType: 'sushi' },
        { placeId: 'vegetarian-1', name: 'Green Table A', lat: 38.702, lng: -9.102, distanceMeters: 100, restaurantFoodType: 'vegetarian' },
        { placeId: 'vegetarian-2', name: 'Green Table B', lat: 38.703, lng: -9.103, distanceMeters: 150, restaurantFoodType: 'vegetarian' },
      ],
      financial_service: [
        { placeId: 'insurance', name: 'Secure Cover', lat: 38.704, lng: -9.104, distanceMeters: 200, financialServiceKinds: ['insurance'] },
        { placeId: 'credit', name: 'Credit Point', lat: 38.705, lng: -9.105, distanceMeters: 250, financialServiceKinds: ['consumer_credit'] },
      ],
    });
    const tasks = [
      makeTask({ id: 'restaurant', poi: 'restaurant', restaurantFoodType: 'vegetarian' }),
      makeTask({ id: 'financial', poi: 'financial_service', financialServiceKind: 'consumer_credit' }),
    ];

    expect(getLocalTripAlternativeCount(tasks, COORDS)).toBe(2);
    expect(planLocalTripAlternative(tasks, COORDS, 0).stops.map(stop => stop.place.internalId).sort()).toEqual(['credit', 'vegetarian-1']);
    expect(planLocalTripAlternative(tasks, COORDS, 1).stops.map(stop => stop.place.internalId).sort()).toEqual(['credit', 'vegetarian-2']);
  });

  it('does not count a variation that falls after the waypoint cap', () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [{ placeId: 'p1', name: 'Pharmacy A', lat: 38.7001, lng: -9.1, distanceMeters: 10 }],
      atm: [
        { placeId: 'a1', name: 'ATM A', lat: 38.8, lng: -9.1, distanceMeters: 11_000 },
        { placeId: 'a2', name: 'ATM B', lat: 38.9, lng: -9.1, distanceMeters: 22_000 },
      ],
    });
    const tasks = [
      ...Array.from({ length: MAX_WAYPOINTS }, (_, index) => makeTask({ id: `p${index}`, poi: 'pharmacy' })),
      makeTask({ id: 'atm', poi: 'atm' }),
    ];

    expect(getLocalTripAlternativeCount(tasks, COORDS)).toBe(1);
  });
});
