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
import { resolveTripDestinations, planTrip, MAX_WAYPOINTS, type TripStop } from '../../src/services/oneTripForAll';
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
      pharmacy: [{ placeId: 'live-1', name: 'Live Pharmacy', lat: 38.73, lng: -9.13, distanceMeters: 1000 }],
      atm:      [{ placeId: 'live-2', name: 'Live ATM', lat: 38.74, lng: -9.14, distanceMeters: 1200 }],
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

  it('piggybacks shopping_mall onto the same batched call and surfaces it as liveMallCandidates (KAN-282 — never a second call)', async () => {
    mockQueryHabitatCache.mockReturnValue({});
    mockSearchNearbyPlaces.mockResolvedValue({
      pharmacy:      [{ placeId: 'live-1', name: 'Live Pharmacy', lat: 38.73, lng: -9.13, distanceMeters: 1000, primaryType: 'pharmacy' }],
      shopping_mall: [{ placeId: 'mall-1', name: 'Big Mall', lat: 38.72, lng: -9.12, distanceMeters: 800, primaryType: 'shopping_mall' }],
    });

    const tasks = [makeTask({ id: 't1', poi: 'pharmacy' })];
    const result = await resolveTripDestinations(tasks, COORDS, 'uid-1');

    expect(mockSearchNearbyPlaces).toHaveBeenCalledTimes(1);
    expect(mockSearchNearbyPlaces).toHaveBeenCalledWith(
      COORDS.lat, COORDS.lng, expect.arrayContaining(['pharmacy', 'shopping_mall']), expect.any(Number),
    );
    expect(result.liveMallCandidates).toEqual([
      { placeId: 'mall-1', name: 'Big Mall', lat: 38.72, lng: -9.12, distanceMeters: 800, primaryType: 'shopping_mall' },
    ]);
  });

  it('drops a shopping_mall bucket hit whose PRIMARY Google type is something else (KAN-282 review fix — a supermarket tagged shopping_mall as a secondary category must never be offered up as "the mall" under its own name)', async () => {
    mockQueryHabitatCache.mockReturnValue({});
    mockSearchNearbyPlaces.mockResolvedValue({
      pharmacy:      [],
      // Landed in the shopping_mall bucket because ONE of its types matched
      // our request, but its true primary type is supermarket.
      shopping_mall: [{ placeId: 'paulino', name: 'Paulino', lat: 38.72, lng: -9.12, distanceMeters: 530, primaryType: 'supermarket' }],
    });

    const tasks = [makeTask({ id: 't1', poi: 'pharmacy' })];
    const result = await resolveTripDestinations(tasks, COORDS, 'uid-1');

    expect(result.liveMallCandidates).toEqual([]);
  });

  it('returns an empty liveMallCandidates when no live search happens (offline or everything resolved locally)', async () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [{ placeId: 'p1', name: 'Pharmacy A', lat: 38.71, lng: -9.11, distanceMeters: 200 }],
    });
    const tasks = [makeTask({ id: 't1', poi: 'pharmacy' })];
    const result = await resolveTripDestinations(tasks, COORDS, 'uid-1');

    expect(mockSearchNearbyPlaces).not.toHaveBeenCalled();
    expect(result.liveMallCandidates).toEqual([]);
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
