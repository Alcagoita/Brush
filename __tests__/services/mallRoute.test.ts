/**
 * KAN-282 — findMallOption: opportunistic mall detection for "One trip for
 * all of these". Never triggers a search of its own; it only reads the
 * user's mall snapshot and the offline habitat cache.
 *
 * A candidate qualifies on TWO conditions (see mallRoute.ts's header for why
 * Google Places couldn't answer either):
 *   1. It's a real mall — guaranteed by the source, since mall rows only
 *      ever come from OSM's `shop=mall` tag.
 *   2. It's BIG — its OSM building-footprint area clears
 *      MALL_MIN_FOOTPRINT_M2 (25,000 m²), the factual proxy for "a
 *      destination worth the trip". Bare OSM nodes have no footprint (0) and
 *      fail automatically, which is what keeps a store mistagged as a mall,
 *      or a tiny neighbourhood gallery, out of the card.
 *
 * The user's own downloaded snapshot is exempt from the size gate — they
 * already vouched for that mall. Among qualifying candidates, nearest wins.
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

import { queryHabitatCache } from '../../src/services/habitatCache';
import { findMallOption } from '../../src/services/mallRoute';
import { ROUTE_MAX_RADIUS_M } from '../../src/services/destinationResolver';
import type { TripStop } from '../../src/services/oneTripForAll';
import type { MallSnapshot, Task } from '../../src/types';

const mockQueryHabitatCache = queryHabitatCache as jest.Mock;

const COORDS = { lat: 38.7, lng: -9.1 };

/** Real Lisbon reference points (see mallRoute.ts's calibration sample). */
const COLOMBO_AREA_M2 = 116_791;   // comfortably over the gate
const SMALL_GALLERY_AREA_M2 = 8_481; // Fonte Nova — a real mall, but too small

/** `lat + degrees` at COORDS.lng, i.e. `degrees * 111_000` metres away. */
function northOf(degrees: number) {
  return { lat: COORDS.lat + degrees, lng: COORDS.lng };
}

function makeTask(id: string, poi: string): Task {
  return {
    id, title: `Task ${id}`, category: 'errands', done: false, date: '2026-07-19',
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

/** A cached OSM mall row, as queryHabitatCache would return it. */
function cachedMall(opts: {
  name: string;
  degreesNorth: number;
  footprintAreaM2?: number;
  placeId?: string;
}) {
  const { lat, lng } = northOf(opts.degreesNorth);
  return {
    placeId: opts.placeId ?? `cache-${opts.name}`,
    name: opts.name,
    lat,
    lng,
    distanceMeters: Math.round(opts.degreesNorth * 111_000),
    footprintAreaM2: opts.footprintAreaM2,
  };
}

function withCachedMalls(malls: ReturnType<typeof cachedMall>[]) {
  mockQueryHabitatCache.mockReturnValue({ shopping_mall: malls });
}

function makeSnapshot(overrides: Partial<MallSnapshot> = {}): MallSnapshot {
  const { lat, lng } = northOf(0.003); // ~333 m
  return {
    placeId: 'snapshot-mall', name: 'Snapshot Mall',
    centerLat: lat, centerLng: lng, radius: 500,
    cacheAreaId: 'mall_snapshot',
    expiresAt: Date.now() + 1_000_000,
    createdAt: { seconds: 0, nanoseconds: 0 } as unknown as MallSnapshot['createdAt'],
    ...overrides,
  };
}

const TWO_STOPS = [stop('a', 'pharmacy'), stop('b', 'supermarket')];

beforeEach(() => {
  jest.clearAllMocks();
  mockQueryHabitatCache.mockReturnValue({});
});

describe('findMallOption — trip preconditions', () => {
  it('returns null for a trip with fewer than 2 stops', () => {
    withCachedMalls([cachedMall({ name: 'Colombo', degreesNorth: 0.002, footprintAreaM2: COLOMBO_AREA_M2 })]);

    expect(findMallOption(COORDS, [stop('a', 'pharmacy')], null)).toBeNull();
  });

  it('returns null when nothing is cached and there is no snapshot', () => {
    expect(findMallOption(COORDS, TWO_STOPS, null)).toBeNull();
  });
});

describe('findMallOption — the size gate', () => {
  it('accepts a cached mall whose footprint clears the threshold', () => {
    withCachedMalls([cachedMall({ name: 'Colombo', degreesNorth: 0.002, footprintAreaM2: COLOMBO_AREA_M2 })]);

    expect(findMallOption(COORDS, TWO_STOPS, null)).toMatchObject({ name: 'Colombo' });
  });

  it('rejects a real but too-small mall, however close it is', () => {
    withCachedMalls([cachedMall({ name: 'Fonte Nova', degreesNorth: 0.0005, footprintAreaM2: SMALL_GALLERY_AREA_M2 })]);

    expect(findMallOption(COORDS, TWO_STOPS, null)).toBeNull();
  });

  it('rejects a bare OSM node — no footprint at all (a mistagged store)', () => {
    withCachedMalls([cachedMall({ name: 'Galeria Uruguai', degreesNorth: 0.001, footprintAreaM2: 0 })]);

    expect(findMallOption(COORDS, TWO_STOPS, null)).toBeNull();
  });

  it('rejects a row whose footprint is unknown (cached before the field existed)', () => {
    withCachedMalls([cachedMall({ name: 'Legacy Row', degreesNorth: 0.001, footprintAreaM2: undefined })]);

    expect(findMallOption(COORDS, TWO_STOPS, null)).toBeNull();
  });
});

describe('findMallOption — choosing between candidates', () => {
  it('picks the nearest among several qualifying malls', () => {
    withCachedMalls([
      cachedMall({ name: 'Far Big Mall', degreesNorth: 0.03, footprintAreaM2: COLOMBO_AREA_M2 }),
      cachedMall({ name: 'Near Big Mall', degreesNorth: 0.004, footprintAreaM2: 40_000 }),
    ]);

    expect(findMallOption(COORDS, TWO_STOPS, null)).toMatchObject({ name: 'Near Big Mall' });
  });

  it('does not let a much closer small mall beat a farther big one — it is excluded, not ranked', () => {
    withCachedMalls([
      cachedMall({ name: 'Tiny Gallery', degreesNorth: 0.0005, footprintAreaM2: SMALL_GALLERY_AREA_M2 }),
      cachedMall({ name: 'Colombo', degreesNorth: 0.02, footprintAreaM2: COLOMBO_AREA_M2 }),
    ]);

    expect(findMallOption(COORDS, TWO_STOPS, null)).toMatchObject({ name: 'Colombo' });
  });

  it('ignores cached malls beyond ROUTE_MAX_RADIUS_M', () => {
    // queryHabitatCache is asked for exactly that radius, so anything past it
    // never reaches mallRoute in the first place.
    withCachedMalls([]);

    expect(findMallOption(COORDS, TWO_STOPS, null)).toBeNull();
    expect(mockQueryHabitatCache).toHaveBeenCalledWith(
      COORDS.lat, COORDS.lng, ['shopping_mall'], ROUTE_MAX_RADIUS_M,
    );
  });
});

describe('findMallOption — duplicate merging', () => {
  it('merges the same physical mall cached under two OSM ids, keeping the larger footprint', () => {
    // The nearer row has no footprint of its own (e.g. cached as a node);
    // the same mall's way/relation row, a few metres off, carries the real
    // area. Merging must propagate that area so the venue still qualifies —
    // and surface it under the nearest entry's identity.
    withCachedMalls([
      cachedMall({ name: 'Colombo', degreesNorth: 0.002, footprintAreaM2: 0, placeId: 'node-row' }),
      cachedMall({ name: 'Centro Comercial Colombo', degreesNorth: 0.0021, footprintAreaM2: COLOMBO_AREA_M2, placeId: 'way-row' }),
    ]);

    expect(findMallOption(COORDS, TWO_STOPS, null)).toMatchObject({ placeId: 'node-row', name: 'Colombo' });
  });

  it('does not merge two genuinely different malls that happen to be neighbours', () => {
    // Same distance apart as the merge case above, but no shared meaningful
    // name word — so they stay separate and the nearest qualifying one wins.
    withCachedMalls([
      cachedMall({ name: 'Alegro', degreesNorth: 0.002, footprintAreaM2: 0 }),
      cachedMall({ name: 'Amoreiras', degreesNorth: 0.0021, footprintAreaM2: COLOMBO_AREA_M2 }),
    ]);

    expect(findMallOption(COORDS, TWO_STOPS, null)).toMatchObject({ name: 'Amoreiras' });
  });
});

describe('findMallOption — the user\'s own mall snapshot', () => {
  it('is exempt from the size gate — the user already vouched for it', () => {
    // No footprint data at all, and nothing else cached: it still wins.
    expect(findMallOption(COORDS, TWO_STOPS, makeSnapshot())).toMatchObject({ name: 'Snapshot Mall' });
  });

  it('is ignored when it sits beyond ROUTE_MAX_RADIUS_M', () => {
    const farAway = northOf(0.06); // ~6.6 km
    const snapshot = makeSnapshot({ centerLat: farAway.lat, centerLng: farAway.lng });

    expect(findMallOption(COORDS, TWO_STOPS, snapshot)).toBeNull();
  });

  it('still loses to a closer qualifying mall — exemption is not preference', () => {
    withCachedMalls([cachedMall({ name: 'Colombo', degreesNorth: 0.001, footprintAreaM2: COLOMBO_AREA_M2 })]);

    // Snapshot is ~333 m out; Colombo is ~111 m.
    expect(findMallOption(COORDS, TWO_STOPS, makeSnapshot())).toMatchObject({ name: 'Colombo' });
  });
});
