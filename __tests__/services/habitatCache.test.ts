/**
 * KAN-228 — habitatCache: SQLite-backed offline POI cache + cross-source
 * place identity resolution.
 *
 * expo-sqlite has no official Jest mock, so this file uses a small in-memory
 * fake that recognizes the exact queries habitatCache.ts issues (a full SQL
 * engine would be overkill for one module's fixed query set).
 *
 * Covers:
 *   - upsertPlace inserts a new row when no existing place matches
 *   - upsertPlace merges into an existing row when proximity + type + name
 *     match, in both directions (Google-first-then-OSM and vice versa) —
 *     the ticket's key cross-source-identity AC
 *   - queryHabitatCache returns NearbyPlace-shaped results within radius,
 *     sorted by distance
 *   - refreshHabitatCacheIfStale only fetches OSM for stale/missing types,
 *     and skips entirely when offline
 *   - enforceSizeBudget evicts the oldest (by last_matched_at) rows beyond
 *     the cap
 */

// ─── In-memory expo-sqlite fake ────────────────────────────────────────────────

let rows: Record<string, unknown>[] = [];

function matchesBox(row: any, latMin: number, latMax: number, lngMin: number, lngMax: number) {
  return row.lat >= latMin && row.lat <= latMax && row.lng >= lngMin && row.lng <= lngMax;
}

const mockDb = {
  execSync: jest.fn(),
  getAllSync: jest.fn((sql: string, params: unknown[] = []) => {
    const s = sql.replace(/\s+/g, ' ').trim();

    if (s.startsWith('SELECT COUNT(*)')) {
      return [{ count: rows.length }];
    }
    if (s.startsWith('SELECT poi_type FROM habitat_places WHERE poi_type IN')) {
      const inCount = (s.match(/\?/g) ?? []).length - 5; // poiTypes + 4 box bounds + 1 fetched_at
      const poiTypes = params.slice(0, inCount) as string[];
      const [latMin, latMax, lngMin, lngMax, cutoff] = params.slice(inCount) as number[];
      return rows.filter((r: any) =>
        poiTypes.includes(r.poi_type) && matchesBox(r, latMin, latMax, lngMin, lngMax) && r.fetched_at >= cutoff,
      );
    }
    if (s.startsWith('SELECT * FROM habitat_places WHERE poi_type IN')) {
      const inCount = (s.match(/\?/g) ?? []).length - 4;
      const poiTypes = params.slice(0, inCount) as string[];
      const [latMin, latMax, lngMin, lngMax] = params.slice(inCount) as number[];
      return rows.filter((r: any) => poiTypes.includes(r.poi_type) && matchesBox(r, latMin, latMax, lngMin, lngMax));
    }
    if (s.startsWith('SELECT * FROM habitat_places WHERE poi_type = ?')) {
      const [poiType, latMin, latMax, lngMin, lngMax] = params as [string, number, number, number, number];
      return rows.filter((r: any) => r.poi_type === poiType && matchesBox(r, latMin, latMax, lngMin, lngMax));
    }
    throw new Error(`mockDb.getAllSync: unrecognized query: ${s}`);
  }),
  runSync: jest.fn((sql: string, params: unknown[] = []) => {
    const s = sql.replace(/\s+/g, ' ').trim();

    if (s.startsWith('INSERT INTO habitat_places')) {
      const [id, poi_type, name, lat, lng, google_place_id, osm_id, fetched_at, last_matched_at] = params;
      rows.push({ id, poi_type, name, lat, lng, google_place_id, osm_id, fetched_at, last_matched_at });
      return {} as any;
    }
    if (s.startsWith('UPDATE habitat_places')) {
      const [google, osm, fetchedAt, lastMatchedAt, id] = params;
      const row = rows.find((r: any) => r.id === id) as any;
      if (row) {
        row.google_place_id = row.google_place_id ?? google;
        row.osm_id = row.osm_id ?? osm;
        row.fetched_at = fetchedAt;
        row.last_matched_at = lastMatchedAt;
      }
      return {} as any;
    }
    if (s.startsWith('DELETE FROM habitat_places WHERE id IN')) {
      const [limit] = params as [number];
      const oldestFirst = [...rows].sort((a: any, b: any) => a.last_matched_at - b.last_matched_at);
      const toDelete = new Set(oldestFirst.slice(0, limit).map((r: any) => r.id));
      rows = rows.filter((r: any) => !toDelete.has(r.id));
      return {} as any;
    }
    throw new Error(`mockDb.runSync: unrecognized query: ${s}`);
  }),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => mockDb),
}));

const mockSearchOsmPlaces = jest.fn();
jest.mock('../../src/services/osmPlaces', () => ({
  searchOsmPlaces: (...args: unknown[]) => mockSearchOsmPlaces(...args),
}));

const mockNetInfoFetch = jest.fn();
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: (...args: unknown[]) => mockNetInfoFetch(...args) },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {
  upsertPlace,
  queryHabitatCache,
  refreshHabitatCacheIfStale,
  enforceSizeBudget,
  __resetHabitatDbForTests,
  MAX_CACHED_PLACES,
  HABITAT_CACHE_STALE_MS,
} from '../../src/services/habitatCache';

const ORIGIN = { lat: 0, lng: 0 };

beforeEach(() => {
  rows = [];
  jest.clearAllMocks();
  __resetHabitatDbForTests();
  mockNetInfoFetch.mockResolvedValue({ isConnected: true });
});

describe('upsertPlace', () => {
  it('inserts a new row when no existing place matches', () => {
    const id = upsertPlace({
      poiType: 'pharmacy',
      name:    'Corner Pharmacy',
      lat:     0,
      lng:     0,
      source:  { google: 'g-1' },
    });

    expect(rows).toHaveLength(1);
    expect((rows[0] as any).id).toBe(id);
    expect((rows[0] as any).google_place_id).toBe('g-1');
    expect((rows[0] as any).osm_id).toBeNull();
  });

  it('merges a later OSM sighting into the same internal id as an earlier Google sighting', () => {
    const googleId = upsertPlace({
      poiType: 'pharmacy',
      name:    'Corner Pharmacy',
      lat:     0,
      lng:     0,
      source:  { google: 'g-1' },
    });

    const osmId = upsertPlace({
      poiType: 'pharmacy',
      name:    'Corner Pharmacy',
      lat:     0.0001, // a few metres away — within the identity match radius
      lng:     0,
      source:  { osm: 'node/99' },
    });

    expect(osmId).toBe(googleId);
    expect(rows).toHaveLength(1);
    expect((rows[0] as any).google_place_id).toBe('g-1');
    expect((rows[0] as any).osm_id).toBe('node/99');
  });

  it('merges a later Google sighting into the same internal id as an earlier OSM sighting', () => {
    const osmId = upsertPlace({
      poiType: 'cafe',
      name:    'Nice Café',
      lat:     0,
      lng:     0,
      source:  { osm: 'node/42' },
    });

    const googleId = upsertPlace({
      poiType: 'cafe',
      name:    'Nice Cafe', // accent-insensitive match via normalize()
      lat:     0.0001,
      lng:     0,
      source:  { google: 'g-2' },
    });

    expect(googleId).toBe(osmId);
    expect(rows).toHaveLength(1);
    expect((rows[0] as any).google_place_id).toBe('g-2');
    expect((rows[0] as any).osm_id).toBe('node/42');
  });

  it('does not merge places of a different POI type at the same location', () => {
    const id1 = upsertPlace({ poiType: 'cafe', name: 'Spot', lat: 0, lng: 0, source: { google: 'g-3' } });
    const id2 = upsertPlace({ poiType: 'bank', name: 'Spot', lat: 0, lng: 0, source: { osm: 'node/1' } });

    expect(id1).not.toBe(id2);
    expect(rows).toHaveLength(2);
  });

  it('does not merge places beyond the identity match radius', () => {
    const id1 = upsertPlace({ poiType: 'atm', name: 'Same Name', lat: 0, lng: 0, source: { google: 'g-4' } });
    // ~1km away — well beyond the ~150m identity match radius.
    const id2 = upsertPlace({ poiType: 'atm', name: 'Same Name', lat: 0.009, lng: 0, source: { osm: 'node/2' } });

    expect(id1).not.toBe(id2);
    expect(rows).toHaveLength(2);
  });
});

describe('queryHabitatCache', () => {
  it('returns NearbyPlace-shaped results within radius, sorted by distance', () => {
    upsertPlace({ poiType: 'atm', name: 'Near ATM', lat: 0.0003, lng: 0, source: { osm: 'node/1' } }); // ~33m
    upsertPlace({ poiType: 'atm', name: 'Far ATM', lat: 0.002, lng: 0, source: { osm: 'node/2' } }); // ~222m
    upsertPlace({ poiType: 'atm', name: 'Way Far ATM', lat: 0.1, lng: 0, source: { osm: 'node/3' } }); // ~11km

    const result = queryHabitatCache(ORIGIN.lat, ORIGIN.lng, ['atm'], 500);

    expect(result.atm).toHaveLength(2);
    expect(result.atm[0].name).toBe('Near ATM');
    expect(result.atm[1].name).toBe('Far ATM');
    expect(result.atm[0].distanceMeters).toBeLessThan(result.atm[1].distanceMeters);
    // placeId is the internal id, not a raw source id.
    expect(result.atm[0].placeId).toMatch(/^hp_/);
  });

  it('returns an empty array for a type with no cached rows', () => {
    const result = queryHabitatCache(ORIGIN.lat, ORIGIN.lng, ['school'], 5000);
    expect(result.school).toEqual([]);
  });
});

describe('refreshHabitatCacheIfStale', () => {
  it('does nothing when offline', async () => {
    mockNetInfoFetch.mockResolvedValue({ isConnected: false });
    await refreshHabitatCacheIfStale(ORIGIN.lat, ORIGIN.lng, ['atm']);
    expect(mockSearchOsmPlaces).not.toHaveBeenCalled();
  });

  it('fetches OSM data when the area has no cached rows yet', async () => {
    mockSearchOsmPlaces.mockResolvedValue({ atm: [{ osmId: 'node/1', name: 'New ATM', lat: 0, lng: 0, distanceMeters: 0 }] });

    await refreshHabitatCacheIfStale(ORIGIN.lat, ORIGIN.lng, ['atm']);

    expect(mockSearchOsmPlaces).toHaveBeenCalledWith(ORIGIN.lat, ORIGIN.lng, ['atm'], 5000);
    expect(rows).toHaveLength(1);
  });

  it('does not re-fetch a type whose cached data is still fresh', async () => {
    upsertPlace({ poiType: 'atm', name: 'Existing ATM', lat: 0, lng: 0, source: { osm: 'node/1' } });

    await refreshHabitatCacheIfStale(ORIGIN.lat, ORIGIN.lng, ['atm']);

    expect(mockSearchOsmPlaces).not.toHaveBeenCalled();
  });

  it('re-fetches a type whose cached data is older than the 14-day staleness window', async () => {
    upsertPlace({ poiType: 'atm', name: 'Stale ATM', lat: 0, lng: 0, source: { osm: 'node/1' } });
    (rows[0] as any).fetched_at = Date.now() - HABITAT_CACHE_STALE_MS - 1000;
    mockSearchOsmPlaces.mockResolvedValue({ atm: [] });

    await refreshHabitatCacheIfStale(ORIGIN.lat, ORIGIN.lng, ['atm']);

    expect(mockSearchOsmPlaces).toHaveBeenCalledWith(ORIGIN.lat, ORIGIN.lng, ['atm'], 5000);
  });
});

describe('enforceSizeBudget', () => {
  it('evicts the oldest (by last_matched_at) rows beyond MAX_CACHED_PLACES', () => {
    for (let i = 0; i < MAX_CACHED_PLACES + 5; i++) {
      const id = upsertPlace({ poiType: 'atm', name: `ATM ${i}`, lat: i * 0.01, lng: 0, source: { osm: `node/${i}` } });
      (rows.find((r: any) => r.id === id) as any).last_matched_at = i; // ascending — first inserted is oldest
    }

    enforceSizeBudget();

    expect(rows).toHaveLength(MAX_CACHED_PLACES);
    // The 5 oldest (lowest last_matched_at, i.e. i=0..4) should be gone.
    expect(rows.some((r: any) => r.name === 'ATM 0')).toBe(false);
    expect(rows.some((r: any) => r.name === `ATM ${MAX_CACHED_PLACES + 4}`)).toBe(true);
  });

  it('does nothing when under the cap', () => {
    upsertPlace({ poiType: 'atm', name: 'Only ATM', lat: 0, lng: 0, source: { osm: 'node/1' } });
    enforceSizeBudget();
    expect(rows).toHaveLength(1);
  });
});
