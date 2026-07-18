/**
 * KAN-282 — findMallOption: opportunistic mall detection for "One trip for
 * all of these". Never triggers a search of its own — only reads whatever
 * mall snapshot / habitat cache / piggybacked live data it's handed.
 *
 * Two-step design (review fix — a generic "malls tend to have these types"
 * heuristic offered up a plain supermarket as "the mall" because its
 * category loosely overlapped the trip's needs, even though it couldn't
 * actually resolve anything beyond itself):
 *   1. Find a candidate (snapshot / cached shopping_mall / live piggyback).
 *   2. VERIFY it — query the habitat cache around THAT CANDIDATE'S OWN
 *      location for the trip's POI types. Only real, cache-verified
 *      coverage counts.
 *
 * Covers all three candidate-discovery tiers, the "no mall" default, the
 * "candidate found but nothing verifiably covers >= 2 tasks nearby it"
 * rejection, and "nearest wins when several qualify".
 */

jest.mock('../../src/services/habitatCache');

// maps.ts also imports placesFunctions.ts, which pulls in
// @react-native-firebase/functions (native, unavailable under Jest) — mock
// at the service boundary, same as elsewhere. Flat-earth approximation is
// plenty accurate at these small test distances.
jest.mock('../../src/services/maps', () => ({
  getDistanceMeters: (lat1: number, lng1: number, lat2: number, lng2: number) =>
    Math.round(Math.hypot(lat2 - lat1, lng2 - lng1) * 111_000),
}));

// mallSnapshots.ts pulls in @react-native-firebase/firestore (native,
// unavailable under Jest) — only its exported radius constant is used here.
jest.mock('../../src/services/mallSnapshots', () => ({
  MALL_SNAPSHOT_DOWNLOAD_RADIUS_M: 400,
}));

import { queryHabitatCache } from '../../src/services/habitatCache';
import { findMallOption } from '../../src/services/mallRoute';
import { ROUTE_MAX_RADIUS_M } from '../../src/services/destinationResolver';
import { MALL_SNAPSHOT_DOWNLOAD_RADIUS_M } from '../../src/services/mallSnapshots';
import type { TripStop } from '../../src/services/oneTripForAll';
import type { MallSnapshot } from '../../src/types';
import type { Task } from '../../src/types';

const mockQueryHabitatCache = queryHabitatCache as jest.Mock;

const COORDS = { lat: 38.7, lng: -9.1 };
const MALL_COORDS = { lat: 38.703, lng: -9.1 }; // ~333m from COORDS

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
    centerLat: MALL_COORDS.lat, centerLng: MALL_COORDS.lng, radius: 500,
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

  it('rejects a candidate whose own premises have no verifiable coverage (the "Paulino" bug — a plain store, not a mall)', () => {
    mockQueryHabitatCache.mockImplementation((lat: number, lng: number, types: string[]) => {
      if (types[0] === 'shopping_mall') {
        return { shopping_mall: [{ placeId: 'paulino', name: 'Paulino', lat: MALL_COORDS.lat, lng: MALL_COORDS.lng, distanceMeters: 530 }] };
      }
      // Verification query around Paulino's own location: nothing else is there.
      return {};
    });
    const stops = [stop('t1', 'pharmacy'), stop('t2', 'cafe')];

    expect(findMallOption(COORDS, stops, null, [])).toBeNull();
  });
});

describe('findMallOption — candidate via mall snapshot', () => {
  it('qualifies when the snapshot mall\'s own cached premises cover >= 2 tasks', () => {
    const snapshot = makeSnapshot();
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [{ placeId: 'p1', name: 'Pharmacy', lat: MALL_COORDS.lat, lng: MALL_COORDS.lng, distanceMeters: 10 }],
      cafe:     [{ placeId: 'c1', name: 'Cafe', lat: MALL_COORDS.lat, lng: MALL_COORDS.lng, distanceMeters: 15 }],
    });
    const stops = [stop('t1', 'pharmacy'), stop('t2', 'cafe')];

    const result = findMallOption(COORDS, stops, snapshot, []);

    expect(result).toEqual({
      placeId: 'mall-1', name: 'Snapshot Mall',
      lat: MALL_COORDS.lat, lng: MALL_COORDS.lng, distanceMeters: 333, coveredCount: 2,
    });
    expect(mockQueryHabitatCache).toHaveBeenCalledWith(
      snapshot.centerLat, snapshot.centerLng, expect.arrayContaining(['pharmacy', 'cafe']), snapshot.radius,
    );
  });

  it('rejects the snapshot mall when its own inventory covers fewer than 2 tasks — never falls through to a different mall', () => {
    const snapshot = makeSnapshot();
    mockQueryHabitatCache.mockReturnValue({ pharmacy: [], cafe: [] }); // nothing verifiable there
    const stops = [stop('t1', 'pharmacy'), stop('t2', 'cafe')];

    const result = findMallOption(COORDS, stops, snapshot, []);
    expect(result).toBeNull();
    // Only the snapshot's own inventory was ever queried — no cache/live fallback attempted once a snapshot candidate exists.
    expect(mockQueryHabitatCache).toHaveBeenCalledTimes(1);
  });

  it('ignores a snapshot whose center is beyond ROUTE_MAX_RADIUS_M', () => {
    const farSnapshot = makeSnapshot({ centerLat: COORDS.lat + 1 }); // ~111km away
    mockQueryHabitatCache.mockReturnValue({ shopping_mall: [] });
    const stops = [stop('t1', 'pharmacy'), stop('t2', 'cafe')];

    expect(findMallOption(COORDS, stops, farSnapshot, [])).toBeNull();
    expect(mockQueryHabitatCache).not.toHaveBeenCalledWith(
      farSnapshot.centerLat, farSnapshot.centerLng, expect.anything(), expect.anything(),
    );
  });
});

describe('findMallOption — candidate via offline habitat cache', () => {
  it('qualifies the nearest cached shopping_mall once its OWN premises verify >= 2 tasks', () => {
    mockQueryHabitatCache.mockImplementation((lat: number, lng: number, types: string[]) => {
      if (types[0] === 'shopping_mall') {
        return {
          shopping_mall: [
            { placeId: 'far-mall', name: 'Far Mall', lat: COORDS.lat, lng: COORDS.lng, distanceMeters: 900 },
            { placeId: 'near-mall', name: 'Near Mall', lat: MALL_COORDS.lat, lng: MALL_COORDS.lng, distanceMeters: 300 },
          ],
        };
      }
      // Verification around whichever candidate's own coords were passed in.
      if (lat === MALL_COORDS.lat) {
        return {
          pharmacy: [{ placeId: 'p1', name: 'Pharmacy', lat: MALL_COORDS.lat, lng: MALL_COORDS.lng, distanceMeters: 20 }],
          cafe:     [{ placeId: 'c1', name: 'Cafe', lat: MALL_COORDS.lat, lng: MALL_COORDS.lng, distanceMeters: 25 }],
        };
      }
      return {};
    });
    const stops = [stop('t1', 'pharmacy'), stop('t2', 'cafe')];

    const result = findMallOption(COORDS, stops, null, []);

    expect(result).toMatchObject({ placeId: 'near-mall', name: 'Near Mall', coveredCount: 2 });
  });

  it('verifies against the candidate\'s own location using MALL_SNAPSHOT_DOWNLOAD_RADIUS_M, not the user\'s position', () => {
    mockQueryHabitatCache.mockImplementation((lat: number, lng: number) => {
      if (lat === COORDS.lat && lng === COORDS.lng) { return { shopping_mall: [{ placeId: 'm1', name: 'Mall', lat: MALL_COORDS.lat, lng: MALL_COORDS.lng, distanceMeters: 300 }] }; }
      return { pharmacy: [], cafe: [] };
    });
    const stops = [stop('t1', 'pharmacy'), stop('t2', 'cafe')];
    findMallOption(COORDS, stops, null, []);

    expect(mockQueryHabitatCache).toHaveBeenCalledWith(
      MALL_COORDS.lat, MALL_COORDS.lng, expect.arrayContaining(['pharmacy', 'cafe']), MALL_SNAPSHOT_DOWNLOAD_RADIUS_M,
    );
  });
});

describe('findMallOption — candidate via piggybacked live result', () => {
  it('qualifies a live shopping_mall hit once its own premises verify >= 2 tasks', () => {
    mockQueryHabitatCache.mockImplementation((lat: number, lng: number, types: string[]) => {
      if (types[0] === 'shopping_mall') { return { shopping_mall: [] }; } // nothing cached
      return {
        atm:        [{ placeId: 'a1', name: 'ATM', lat: MALL_COORDS.lat, lng: MALL_COORDS.lng, distanceMeters: 5 }],
        restaurant: [{ placeId: 'r1', name: 'Restaurant', lat: MALL_COORDS.lat, lng: MALL_COORDS.lng, distanceMeters: 8 }],
      };
    });
    const liveMallCandidates = [
      { placeId: 'live-mall', name: 'Live Mall', lat: MALL_COORDS.lat, lng: MALL_COORDS.lng, distanceMeters: 400, primaryType: 'shopping_mall' },
    ];
    const stops = [stop('t1', 'atm'), stop('t2', 'restaurant')];

    const result = findMallOption(COORDS, stops, null, liveMallCandidates);

    expect(result).toMatchObject({ placeId: 'live-mall', name: 'Live Mall', coveredCount: 2 });
  });

  it('rejects a live mall candidate when nothing verifies near it — never guesses from its category alone', () => {
    mockQueryHabitatCache.mockReturnValue({}); // no cache data anywhere, including around the mall
    const liveMallCandidates = [
      { placeId: 'live-mall', name: 'Live Mall', lat: MALL_COORDS.lat, lng: MALL_COORDS.lng, distanceMeters: 400 },
    ];
    const stops = [stop('t1', 'atm'), stop('t2', 'restaurant')];

    expect(findMallOption(COORDS, stops, null, liveMallCandidates)).toBeNull();
  });
});
