/**
 * KAN-282 — findMallOption: opportunistic mall detection for "One trip for
 * all of these". Never triggers a search of its own — only reads whatever
 * mall snapshot / habitat cache / piggybacked live data it's handed.
 *
 * Covers all three detection tiers (stop at first hit), the "no mall"
 * default (screen shows only the stop-by-stop card), and the "nearest wins
 * when several qualify" rule.
 */

jest.mock('../../src/services/habitatCache');

// maps.ts also imports placesFunctions.ts, which pulls in
// @react-native-firebase/functions (native, unavailable under Jest) — mock
// at the service boundary, same as elsewhere in this suite. Flat-earth
// approximation is plenty accurate at these small test distances.
jest.mock('../../src/services/maps', () => ({
  getDistanceMeters: (lat1: number, lng1: number, lat2: number, lng2: number) =>
    Math.round(Math.hypot(lat2 - lat1, lng2 - lng1) * 111_000),
}));

import { queryHabitatCache } from '../../src/services/habitatCache';
import { findMallOption, MALL_COVERED_TYPES } from '../../src/services/mallRoute';
import { ROUTE_MAX_RADIUS_M } from '../../src/services/destinationResolver';
import type { TripStop } from '../../src/services/oneTripForAll';
import type { MallSnapshot } from '../../src/types';
import type { Task } from '../../src/types';

const mockQueryHabitatCache = queryHabitatCache as jest.Mock;

const COORDS = { lat: 38.7, lng: -9.1 };

function makeTask(id: string, poi: string): Task {
  return {
    id, title: `Task ${id}`, category: 'errands', done: false, date: '2026-07-17',
    poi: poi as Task['poi'],
    createdAt: { seconds: 0, nanoseconds: 0 } as unknown as Task['createdAt'],
  };
}

function stop(id: string, poi: string): TripStop {
  return {
    task: makeTask(id, poi),
    place: { internalId: `${id}-place`, name: `${poi} place`, lat: COORDS.lat, lng: COORDS.lng, distanceMeters: 50, source: 'cache' },
  };
}

function makeSnapshot(overrides: Partial<MallSnapshot> = {}): MallSnapshot {
  return {
    placeId: 'mall-1', name: 'Snapshot Mall',
    centerLat: COORDS.lat, centerLng: COORDS.lng, radius: 500,
    cacheAreaId: 'mall_snapshot',
    expiresAt: Date.now() + 1_000_000,
    createdAt: { seconds: 0, nanoseconds: 0 } as unknown as MallSnapshot['createdAt'],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockQueryHabitatCache.mockReturnValue({});
});

describe('findMallOption — no mall (default outcome, not a failure)', () => {
  it('returns null when fewer than 2 stops exist — never worth a mall alternative', () => {
    const result = findMallOption(COORDS, [stop('t1', 'pharmacy')], null, []);
    expect(result).toBeNull();
  });

  it('returns null when there is no snapshot, no cached mall, and no live candidate', () => {
    const stops = [stop('t1', 'pharmacy'), stop('t2', 'cafe')];
    const result = findMallOption(COORDS, stops, null, []);
    expect(result).toBeNull();
    // Never falls back to a wider search — just reads what it was given.
    expect(mockQueryHabitatCache).toHaveBeenCalledWith(COORDS.lat, COORDS.lng, ['shopping_mall'], ROUTE_MAX_RADIUS_M);
  });

  it('returns null when a mall exists but covers fewer than 2 tasks', () => {
    mockQueryHabitatCache.mockReturnValue({
      shopping_mall: [{ placeId: 'mall-1', name: 'Small Mall', lat: COORDS.lat, lng: COORDS.lng, distanceMeters: 100 }],
    });
    // 'bank' and 'gym' are not in MALL_COVERED_TYPES — heuristic count is 0.
    const stops = [stop('t1', 'bank'), stop('t2', 'gym')];
    expect(findMallOption(COORDS, stops, null, [])).toBeNull();
  });
});

describe('findMallOption — tier 1: mall snapshot (exact)', () => {
  it('qualifies when the snapshot mall\'s own cached places cover >= 2 tasks', () => {
    const snapshot = makeSnapshot();
    // queryHabitatCache is called once for the snapshot's own inventory —
    // both requested types have a hit there.
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [{ placeId: 'p1', name: 'Pharmacy', lat: COORDS.lat, lng: COORDS.lng, distanceMeters: 10 }],
      cafe:     [{ placeId: 'c1', name: 'Cafe', lat: COORDS.lat, lng: COORDS.lng, distanceMeters: 15 }],
    });
    const stops = [stop('t1', 'pharmacy'), stop('t2', 'cafe')];

    const result = findMallOption(COORDS, stops, snapshot, []);

    expect(result).toEqual({
      placeId: 'mall-1', name: 'Snapshot Mall',
      lat: COORDS.lat, lng: COORDS.lng, distanceMeters: 0, coveredCount: 2,
    });
    expect(mockQueryHabitatCache).toHaveBeenCalledWith(
      snapshot.centerLat, snapshot.centerLng, expect.arrayContaining(['pharmacy', 'cafe']), snapshot.radius,
    );
  });

  it('falls through to tier 2/3 when the snapshot exists but its own inventory covers fewer than 2 tasks', () => {
    const snapshot = makeSnapshot();
    mockQueryHabitatCache
      .mockReturnValueOnce({ pharmacy: [] }) // snapshot's own inventory — no hit
      .mockReturnValueOnce({ shopping_mall: [] }); // tier 2 cache lookup — also nothing
    const stops = [stop('t1', 'pharmacy'), stop('t2', 'cafe')]; // heuristic count would be 2 (both covered types)

    const result = findMallOption(COORDS, stops, snapshot, []);
    expect(result).toBeNull();
  });

  it('ignores a snapshot whose center is beyond ROUTE_MAX_RADIUS_M', () => {
    const farSnapshot = makeSnapshot({ centerLat: COORDS.lat + 1 }); // ~111km away
    mockQueryHabitatCache.mockReturnValue({ shopping_mall: [] });
    const stops = [stop('t1', 'pharmacy'), stop('t2', 'cafe')];

    expect(findMallOption(COORDS, stops, farSnapshot, [])).toBeNull();
    // Never even queries the snapshot's own inventory for an out-of-range snapshot.
    expect(mockQueryHabitatCache).not.toHaveBeenCalledWith(
      farSnapshot.centerLat, farSnapshot.centerLng, expect.anything(), expect.anything(),
    );
  });
});

describe('findMallOption — tier 2: offline habitat cache (heuristic)', () => {
  it('qualifies using the generic MALL_COVERED_TYPES overlap, nearest cached mall wins', () => {
    mockQueryHabitatCache.mockReturnValue({
      shopping_mall: [
        { placeId: 'far-mall', name: 'Far Mall', lat: COORDS.lat, lng: COORDS.lng, distanceMeters: 900 },
        { placeId: 'near-mall', name: 'Near Mall', lat: COORDS.lat, lng: COORDS.lng, distanceMeters: 300 },
      ],
    });
    const stops = [stop('t1', 'pharmacy'), stop('t2', 'cafe')]; // both in MALL_COVERED_TYPES

    const result = findMallOption(COORDS, stops, null, []);

    expect(result).toEqual({
      placeId: 'near-mall', name: 'Near Mall',
      lat: COORDS.lat, lng: COORDS.lng, distanceMeters: 300, coveredCount: 2,
    });
  });

  it('MALL_COVERED_TYPES includes the documented supermarket/pharmacy/atm/salon/restaurant/cafe set', () => {
    for (const t of ['supermarket', 'pharmacy', 'atm', 'salon', 'restaurant', 'cafe']) {
      expect(MALL_COVERED_TYPES).toContain(t);
    }
  });
});

describe('findMallOption — tier 3: piggybacked live candidate', () => {
  it('qualifies using a live shopping_mall hit when nothing was found locally', () => {
    mockQueryHabitatCache.mockReturnValue({ shopping_mall: [] }); // tier 2 empty
    const liveMallCandidates = [
      { placeId: 'live-mall', name: 'Live Mall', lat: COORDS.lat, lng: COORDS.lng, distanceMeters: 400 },
    ];
    const stops = [stop('t1', 'atm'), stop('t2', 'restaurant')];

    const result = findMallOption(COORDS, stops, null, liveMallCandidates);

    expect(result).toEqual({
      placeId: 'live-mall', name: 'Live Mall',
      lat: COORDS.lat, lng: COORDS.lng, distanceMeters: 400, coveredCount: 2,
    });
  });

  it('never used when the heuristic count is already < 2, even with a live candidate present', () => {
    mockQueryHabitatCache.mockReturnValue({ shopping_mall: [] });
    const liveMallCandidates = [
      { placeId: 'live-mall', name: 'Live Mall', lat: COORDS.lat, lng: COORDS.lng, distanceMeters: 400 },
    ];
    const stops = [stop('t1', 'bank')]; // not in MALL_COVERED_TYPES, and only 1 stop anyway

    expect(findMallOption(COORDS, stops, null, liveMallCandidates)).toBeNull();
  });
});
