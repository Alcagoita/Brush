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
  planTripAroundFarTask,
  planBestLocalTrip,
  resolveTripDestinations,
  planTrip,
  MAX_WAYPOINTS,
  MAX_LOCAL_ALTERNATIVES,
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

  const place = (id: string, metersNorth: number, extra: Record<string, unknown> = {}) => ({
    placeId: id, name: id, lat: COORDS.lat + metersNorth / 111_000, lng: COORDS.lng,
    distanceMeters: metersNorth, ...extra,
  });

  it('chooses the candidate combination and stop order with the shortest local walk', () => {
    mockQueryHabitatCache.mockReturnValue({
      restaurant: [
        { placeId: 'closest-restaurant', name: 'Near Restaurant', lat: 0.001, lng: 0, distanceMeters: 111 },
        { placeId: 'clustered-restaurant', name: 'Cluster Restaurant', lat: 0, lng: 0.01, distanceMeters: 1_110 },
      ],
      atm: [{ placeId: 'clustered-atm', name: 'Cluster ATM', lat: 0, lng: 0.011, distanceMeters: 1_221 }],
      cafe: [{ placeId: 'clustered-cafe', name: 'Cluster Cafe', lat: 0, lng: 0.012, distanceMeters: 1_332 }],
    });

    const plan = planBestLocalTrip([
      makeTask({ id: 'restaurant', poi: 'restaurant' }),
      makeTask({ id: 'atm', poi: 'atm' }),
      makeTask({ id: 'cafe', poi: 'cafe' }),
    ], { lat: 0, lng: 0 });

    expect(plan.stops.map(stop => stop.place.internalId)).toEqual([
      'clustered-restaurant', 'clustered-atm', 'clustered-cafe',
    ]);
  });

  it('cycles cached POIs locally without calling Places', () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [place('p1', 1000), place('p2', 1020)],
      atm: [place('a1', 1040), place('a2', 1060)],
    });
    const tasks = [makeTask({ id: 't1', poi: 'pharmacy' }), makeTask({ id: 't2', poi: 'atm' })];

    expect(getLocalTripAlternativeCount(tasks, COORDS, ['t1'])).toEqual([0, 1]);
    expect(planLocalTripAlternative(tasks, COORDS, ['t1'], 0).stops.map(stop => stop.place.internalId).sort()).toEqual(['a1', 'p1']);
    expect(planLocalTripAlternative(tasks, COORDS, ['t1'], 1).stops.map(stop => stop.place.internalId).sort()).toEqual(['a2', 'p2']);
    expect(planLocalTripAlternative(tasks, COORDS, ['t1'], 2).stops.map(stop => stop.place.internalId).sort()).toEqual(['a1', 'p1']);
    expect(mockSearchNearbyPlaces).not.toHaveBeenCalled();
  });

  it('uses the least common multiple so mixed candidate lists cycle correctly', () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [place('p1', 1000), place('p2', 1020)],
      atm: [place('a1', 1040), place('a2', 1060), place('a3', 1080)],
    });
    const tasks = [makeTask({ id: 't1', poi: 'pharmacy' }), makeTask({ id: 't2', poi: 'atm' })];

    expect(getLocalTripAlternativeCount(tasks, COORDS, ['t1'])).toEqual([0, 1, 2, 3, 4, 5]);
    expect(planLocalTripAlternative(tasks, COORDS, ['t1'], 5).stops.map(stop => stop.place.internalId).sort()).toEqual(['a3', 'p2']);
    expect(planLocalTripAlternative(tasks, COORDS, ['t1'], 6).stops.map(stop => stop.place.internalId).sort()).toEqual(['a1', 'p1']);
  });

  it('reports one alternative when every resolvable type has one cached POI', () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [place('p1', 1000)],
      atm: [place('a1', 1050)],
    });

    expect(getLocalTripAlternativeCount([
      makeTask({ id: 't1', poi: 'pharmacy' }), makeTask({ id: 't2', poi: 'atm' }),
    ], COORDS, ['t1'])).toEqual([0]);
  });

  it('does not count duplicate cached rows as another route', () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [
        place('p1', 1000), place('p1', 1000),
      ],
    });

    expect(getLocalTripAlternativeCount([makeTask()], COORDS, ['task-1'])).toEqual([0]);
  });

  it('cycles only cached stores that match the task subtype', () => {
    mockQueryHabitatCache.mockReturnValue({
      store: [
        place('clothes', 1010, { storeSubtype: 'clothing' }),
        place('electronics-1', 1000, { storeSubtype: 'electronics' }),
        place('electronics-2', 1050, { storeSubtype: 'electronics' }),
      ],
    });
    const tasks = [makeTask({ poi: 'store', storeSubtype: 'electronics' })];

    expect(getLocalTripAlternativeCount(tasks, COORDS, ['task-1'])).toEqual([0, 1]);
    expect(planLocalTripAlternative(tasks, COORDS, ['task-1'], 0).stops[0].place.internalId).toBe('electronics-1');
    expect(planLocalTripAlternative(tasks, COORDS, ['task-1'], 1).stops[0].place.internalId).toBe('electronics-2');
  });

  it('cycles only cached restaurants and financial services matching their selected subtypes', () => {
    mockQueryHabitatCache.mockReturnValue({
      restaurant: [
        place('sushi', 1010, { restaurantFoodType: 'sushi' }),
        place('vegetarian-1', 1000, { restaurantFoodType: 'vegetarian' }),
        place('vegetarian-2', 1050, { restaurantFoodType: 'vegetarian' }),
      ],
      financial_service: [
        place('insurance', 1060, { financialServiceKinds: ['insurance'] }),
        place('credit', 1080, { financialServiceKinds: ['consumer_credit'] }),
      ],
    });
    const tasks = [
      makeTask({ id: 'restaurant', poi: 'restaurant', restaurantFoodType: 'vegetarian' }),
      makeTask({ id: 'financial', poi: 'financial_service', financialServiceKind: 'consumer_credit' }),
    ];

    expect(getLocalTripAlternativeCount(tasks, COORDS, ['restaurant'])).toEqual([0, 1]);
    expect(planLocalTripAlternative(tasks, COORDS, ['restaurant'], 0).stops.map(stop => stop.place.internalId).sort()).toEqual(['credit', 'vegetarian-1']);
    expect(planLocalTripAlternative(tasks, COORDS, ['restaurant'], 1).stops.map(stop => stop.place.internalId).sort()).toEqual(['credit', 'vegetarian-2']);
  });

  it('does not count a variation that falls after the waypoint cap', () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [place('p1', 1000)],
      atm: [
        place('a1', 1050), place('a2', 1070),
      ],
    });
    const tasks = [
      ...Array.from({ length: MAX_WAYPOINTS }, (_, index) => makeTask({ id: `p${index}`, poi: 'pharmacy' })),
      makeTask({ id: 'atm', poi: 'atm' }),
    ];

    expect(getLocalTripAlternativeCount(tasks, COORDS, ['p0'])).toEqual([0]);
  });

  it('caps coprime cached cycles at the local alternative limit', () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: Array.from({ length: 101 }, (_, index) => ({
        ...place(`p${index}`, 1000 + index / 10),
      })),
      atm: Array.from({ length: 103 }, (_, index) => ({
        ...place(`a${index}`, 1050 + index / 10),
      })),
    });

    expect(getLocalTripAlternativeCount([
      makeTask({ id: 'pharmacy', poi: 'pharmacy' }), makeTask({ id: 'atm', poi: 'atm' }),
    ], COORDS, ['pharmacy'])).toHaveLength(MAX_LOCAL_ALTERNATIVES);
  });

  it('returns only the raw indices for distinct valid anchored routes', () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [place('p1', 1000), place('p2', 3000), place('p3', 1020)],
      atm: [place('a1', 1050)],
    });
    const tasks = [makeTask({ id: 'anchor' }), makeTask({ id: 'companion', poi: 'atm' })];

    expect(getLocalTripAlternativeCount(tasks, COORDS, ['anchor'])).toEqual([0, 1]);
    expect(planLocalTripAlternative(tasks, COORDS, ['anchor'], 2).stops).toHaveLength(0);
  });

  it('uses the nearest far-task place as the local alternative anchor', () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [place('distant-pharmacy', 1000), place('nearby-pharmacy', 550)],
      atm: [place('nearest-atm', 500)],
    });
    const tasks = [makeTask({ id: 'pharmacy' }), makeTask({ id: 'atm', poi: 'atm' })];

    const plan = planLocalTripAlternative(tasks, COORDS, ['pharmacy', 'atm'], 0);

    expect(plan.stops.map(stop => stop.place.internalId).sort()).toEqual(['nearby-pharmacy', 'nearest-atm']);
  });

  it('rejects cached routes without a far anchor or 80% coverage', () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [place('near', 100), place('far', 1000)],
      atm: [place('too-far', 3000)],
    });
    const tasks = [makeTask({ id: 'anchor' }), makeTask({ id: 'companion', poi: 'atm' })];

    expect(getLocalTripAlternativeCount(tasks, COORDS, [])).toEqual([]);
    expect(getLocalTripAlternativeCount(tasks, COORDS, ['anchor'])).toEqual([]);
    expect(planLocalTripAlternative(tasks, COORDS, ['anchor'], 0).stops).toHaveLength(0);
  });
});

describe('far-task live search fallback', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  const place = (id: string, metersNorth: number) => ({
    placeId: id, name: id, lat: COORDS.lat + metersNorth / 111_000, lng: COORDS.lng,
    distanceMeters: metersNorth,
  });
  const tasks = [makeTask({ id: 'anchor', poi: 'pharmacy' }), makeTask({ id: 'companion', poi: 'atm' })];

  it('uses clustered cached candidates when live search rejects', async () => {
    mockSearchNearbyPlaces.mockRejectedValue(new Error('timeout'));
    mockQueryHabitatCache.mockReturnValue({ pharmacy: [place('cached-anchor', 1000)], atm: [place('cached-atm', 1050)] });

    const plan = await planTripAroundFarTask(tasks, COORDS, ['anchor']);

    expect(plan.stops.map(stop => stop.place.internalId).sort()).toEqual(['cached-anchor', 'cached-atm']);
    expect(mockSearchNearbyPlaces).toHaveBeenCalledTimes(1);
  });

  it('fills a missing live companion from the cluster cache while keeping the live anchor', async () => {
    mockSearchNearbyPlaces.mockResolvedValue({
      results: { pharmacy: [place('live-anchor', 1000)], atm: [place('live-atm-too-far', 3000)] }, source: 'osm',
    });
    mockQueryHabitatCache.mockReturnValue({ pharmacy: [place('cached-anchor', 1100)], atm: [place('cached-atm', 1050)] });

    const plan = await planTripAroundFarTask(tasks, COORDS, ['anchor']);

    expect(plan.stops.map(stop => stop.place.internalId).sort()).toEqual(['cached-atm', 'live-anchor']);
  });

  it('fills a cached companion even when the live route already meets 80% coverage', async () => {
    const fiveTasks = [
      makeTask({ id: 'anchor', poi: 'pharmacy' }),
      makeTask({ id: 'atm', poi: 'atm' }),
      makeTask({ id: 'cafe', poi: 'cafe' }),
      makeTask({ id: 'market', poi: 'supermarket' }),
      makeTask({ id: 'store', poi: 'store' }),
    ];
    mockSearchNearbyPlaces.mockResolvedValue({
      results: {
        pharmacy: [place('live-anchor', 1000)], atm: [place('live-atm', 1020)],
        cafe: [place('live-cafe', 1040)], supermarket: [place('live-market', 1060)],
      }, source: 'osm',
    });
    mockQueryHabitatCache.mockReturnValue({ store: [place('cached-store', 1080)] });

    const plan = await planTripAroundFarTask(fiveTasks, COORDS, ['anchor']);

    expect(plan.stops).toHaveLength(5);
    expect(plan.stops.map(stop => stop.place.internalId)).toContain('cached-store');
  });

  it('uses a cached far anchor when live search returns no usable anchor', async () => {
    mockSearchNearbyPlaces.mockResolvedValue({
      results: { pharmacy: [place('live-nearby', 100)], atm: [place('live-atm', 1050)] }, source: 'osm',
    });
    mockQueryHabitatCache.mockReturnValue({ pharmacy: [place('cached-anchor', 1000)], atm: [] });

    const plan = await planTripAroundFarTask(tasks, COORDS, ['anchor']);

    expect(plan.stops.map(stop => stop.place.internalId).sort()).toEqual(['cached-anchor', 'live-atm']);
  });

  it('keeps a complete live result after searching around the anchor', async () => {
    mockSearchNearbyPlaces.mockResolvedValue({
      results: { pharmacy: [place('live-anchor', 1000)], atm: [place('live-atm', 1050)] }, source: 'osm',
    });

    const plan = await planTripAroundFarTask(tasks, COORDS, ['anchor']);

    expect(plan.stops.map(stop => stop.place.internalId).sort()).toEqual(['live-anchor', 'live-atm']);
    expect(mockSearchNearbyPlaces).toHaveBeenNthCalledWith(
      2, expect.any(Number), expect.any(Number), ['atm'], 200, expect.any(Array),
    );
  });

  it('rejects cached fallback that cannot meet the cluster and coverage rules', async () => {
    mockSearchNearbyPlaces.mockRejectedValue(new Error('timeout'));
    mockQueryHabitatCache.mockReturnValue({ pharmacy: [place('cached-anchor', 1000)], atm: [place('cached-atm-too-far', 3000)] });

    expect((await planTripAroundFarTask(tasks, COORDS, ['anchor'])).stops).toHaveLength(0);
  });

  it('checks the next far anchor during the same search when the first cannot cover the tasks', async () => {
    mockSearchNearbyPlaces.mockResolvedValue({
      results: {
        pharmacy: [place('first-anchor', 500), place('second-anchor', 1000)],
        atm: [place('clustered-atm', 1050)],
      }, source: 'cloudflare',
    });
    mockQueryHabitatCache.mockReturnValue({});

    const plan = await planTripAroundFarTask(tasks, COORDS, ['anchor']);

    expect(plan.stops.map(stop => stop.place.internalId).sort()).toEqual(['clustered-atm', 'second-anchor']);
    expect(mockSearchNearbyPlaces.mock.calls[1].slice(0, 2)).toEqual([place('first-anchor', 500).lat, COORDS.lng]);
    expect(mockSearchNearbyPlaces.mock.calls[2].slice(0, 2)).toEqual([place('second-anchor', 1000).lat, COORDS.lng]);
  });

  it('centers on the nearest far place regardless of task order', async () => {
    const farTasks = [makeTask({ id: 'first', poi: 'pharmacy' }), makeTask({ id: 'second', poi: 'atm' })];
    mockSearchNearbyPlaces
      .mockResolvedValueOnce({ results: { pharmacy: [place('later-pharmacy', 1000)], atm: [place('nearest-atm', 500)] }, source: 'cloudflare' })
      .mockResolvedValueOnce({ results: { pharmacy: [place('nearby-pharmacy', 550)] }, source: 'cloudflare' });
    mockQueryHabitatCache.mockReturnValue({});

    const plan = await planTripAroundFarTask(farTasks, COORDS, ['first', 'second']);

    expect(plan.stops.map(stop => stop.place.internalId).sort()).toEqual(['nearby-pharmacy', 'nearest-atm']);
    expect(mockSearchNearbyPlaces).toHaveBeenNthCalledWith(
      2, place('nearest-atm', 500).lat, COORDS.lng, ['pharmacy'], 200, expect.any(Array),
    );
  });

  it('finds all companions around a Books anchor even when origin search returns only Books', async () => {
    const book = { ...place('bookstore', 800), storeSubtype: 'books', storeSubtypes: ['books'] };
    const fourTasks = [
      makeTask({ id: 'book', poi: 'store', storeSubtype: 'books' }),
      makeTask({ id: 'food', poi: 'restaurant' }),
      makeTask({ id: 'cash', poi: 'atm' }),
      makeTask({ id: 'coffee', poi: 'cafe' }),
    ];
    mockSearchNearbyPlaces
      .mockResolvedValueOnce({ results: { store: [book] }, source: 'cloudflare' })
      .mockResolvedValueOnce({ results: {
        restaurant: [{ ...place('restaurant', 830), distanceMeters: 30 }],
        atm: [{ ...place('atm', 850), distanceMeters: 50 }],
        cafe: [{ ...place('cafe', 870), distanceMeters: 70 }],
      }, source: 'cloudflare' });
    mockQueryHabitatCache.mockReturnValue({});

    const plan = await planTripAroundFarTask(fourTasks, COORDS, ['book']);

    expect(plan.stops).toHaveLength(4);
    expect(mockSearchNearbyPlaces).toHaveBeenNthCalledWith(
      1, COORDS.lat, COORDS.lng, ['store'], 4500,
      [{ key: 'store:store_kind:books', type: 'store', attribute: { dimension: 'store_kind', values: ['books'] } }],
      50,
    );
    expect(mockSearchNearbyPlaces).toHaveBeenNthCalledWith(
      2, book.lat, book.lng, ['restaurant', 'atm', 'cafe'], 200, expect.any(Array),
    );
    expect(mockQueryHabitatCache).toHaveBeenNthCalledWith(
      2, book.lat, book.lng, ['restaurant', 'atm', 'cafe'], 200, { maxResultsPerType: null },
    );
    expect(plan.stops.find(stop => stop.task.id === 'food')?.place.distanceMeters).toBe(830);
  });

  it('checks a sole anchor only once', async () => {
    mockSearchNearbyPlaces.mockResolvedValue({
      results: { pharmacy: [place('only-anchor', 500)], atm: [place('matching-atm', 550)] },
      source: 'cloudflare',
    });
    mockQueryHabitatCache.mockReturnValue({});

    expect((await planTripAroundFarTask(tasks, COORDS, ['anchor'])).stops).toHaveLength(2);
    expect(mockSearchNearbyPlaces).toHaveBeenCalledTimes(2);
  });

  it('finds a complete Books cluster at the third bookstore without a user retry', async () => {
    const book = (id: string, meters: number) => ({ ...place(id, meters), storeSubtype: 'books' as const });
    const fourTasks = [
      makeTask({ id: 'book', poi: 'store', storeSubtype: 'books' }),
      makeTask({ id: 'food', poi: 'restaurant' }),
      makeTask({ id: 'cash', poi: 'atm' }),
      makeTask({ id: 'coffee', poi: 'cafe' }),
    ];
    mockSearchNearbyPlaces
      .mockResolvedValueOnce({ results: { store: [book('first', 737), book('second', 795), book('third', 802)] }, source: 'cloudflare' })
      .mockResolvedValueOnce({ results: { restaurant: [place('food-1', 750)] }, source: 'cloudflare' })
      .mockResolvedValueOnce({ results: { restaurant: [place('food-2', 810)] }, source: 'cloudflare' })
      .mockResolvedValueOnce({ results: {
        restaurant: [place('food-3', 820)], atm: [place('cash-3', 830)], cafe: [place('coffee-3', 840)],
      }, source: 'cloudflare' });
    mockQueryHabitatCache.mockReturnValue({});

    const plan = await planTripAroundFarTask(fourTasks, COORDS, ['book']);

    expect(plan.stops).toHaveLength(4);
    expect(plan.stops.map(stop => stop.place.internalId)).toContain('third');
    expect(mockSearchNearbyPlaces).toHaveBeenCalledTimes(4);
    expect(mockSearchNearbyPlaces.mock.calls.slice(1).map(call => call[0])).toEqual([
      book('first', 737).lat, book('second', 795).lat, book('third', 802).lat,
    ]);
  });

  it('marks all candidates exhausted only after every known anchor fails', async () => {
    mockSearchNearbyPlaces
      .mockResolvedValueOnce({ results: { pharmacy: [place('first', 500), place('second', 1000)] }, source: 'cloudflare' })
      .mockResolvedValue({ results: { atm: [] }, source: 'cloudflare' });
    mockQueryHabitatCache.mockReturnValue({});

    const plan = await planTripAroundFarTask(tasks, COORDS, ['anchor']);

    expect(plan.stops).toHaveLength(0);
    expect(plan.searchExhausted).toBe(true);
    expect(mockSearchNearbyPlaces).toHaveBeenCalledTimes(3);
  });

  it('moves to another far task type after checking the first type', async () => {
    const farTasks = [makeTask({ id: 'pharmacy' }), makeTask({ id: 'atm', poi: 'atm' })];
    mockSearchNearbyPlaces
      .mockResolvedValueOnce({ results: { pharmacy: [place('pharmacy-anchor', 500)], atm: [place('atm-anchor', 1000)] }, source: 'cloudflare' })
      .mockResolvedValueOnce({ results: { atm: [] }, source: 'cloudflare' })
      .mockResolvedValueOnce({ results: { pharmacy: [place('near-atm', 1050)] }, source: 'cloudflare' });
    mockQueryHabitatCache.mockReturnValue({});

    const plan = await planTripAroundFarTask(farTasks, COORDS, ['pharmacy', 'atm']);

    expect(plan.stops.map(stop => stop.place.internalId).sort()).toEqual(['atm-anchor', 'near-atm']);
    expect(mockSearchNearbyPlaces).toHaveBeenCalledTimes(3);
  });

  it('does not save exhaustion when live companion searches fall back to OSM', async () => {
    mockSearchNearbyPlaces
      .mockResolvedValueOnce({ results: { pharmacy: [place('anchor', 500)] }, source: 'cloudflare' })
      .mockResolvedValueOnce({ results: { atm: [] }, source: 'osm' });
    mockQueryHabitatCache.mockReturnValue({});

    const plan = await planTripAroundFarTask(tasks, COORDS, ['anchor']);

    expect(plan.stops).toHaveLength(0);
    expect(plan.searchExhausted).toBe(false);
  });

  it('saves an exhaustive empty result when both completed sources find no anchors', async () => {
    mockSearchNearbyPlaces.mockResolvedValue({ results: { pharmacy: [] }, source: 'osm', cloudflareSettledEmpty: true });
    mockQueryHabitatCache.mockReturnValue({});

    const plan = await planTripAroundFarTask(tasks, COORDS, ['anchor']);

    expect(plan.searchExhausted).toBe(true);
    expect(mockSearchNearbyPlaces).toHaveBeenCalledTimes(1);
  });

  it('does not claim exhaustion when the anchor bucket hits the API result cap', async () => {
    mockSearchNearbyPlaces
      .mockResolvedValueOnce({
        results: { pharmacy: Array.from({ length: 50 }, (_, index) => place(`anchor-${index}`, 500 + index * 10)) },
        source: 'cloudflare',
      })
      .mockResolvedValue({ results: { atm: [] }, source: 'cloudflare' });
    mockQueryHabitatCache.mockReturnValue({});

    const plan = await planTripAroundFarTask(tasks, COORDS, ['anchor']);

    expect(plan.stops).toHaveLength(0);
    expect(plan.searchExhausted).toBe(false);
    expect(mockSearchNearbyPlaces).toHaveBeenCalledTimes(51);
  });
});
