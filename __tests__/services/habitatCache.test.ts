/**
 * KAN-228 — habitatCache: SQLite-backed offline POI cache + cross-source
 * place identity resolution.
 *
 * expo-sqlite has no official Jest mock, so this file uses a small in-memory
 * mock DB that recognizes the exact queries habitatCache.ts issues (a full
 * SQL engine would be overkill for one module's fixed query set).
 *
 * Covers:
 *   - upsertPlace inserts a new row for OSM-sourced candidates only — a
 *     Google-only candidate with no existing match is never persisted with
 *     coordinates (Places ToS: no long-term Google coordinate caching)
 *   - upsertPlace merges into an existing row when proximity + type + name
 *     match, in both directions (Google-first-then-OSM and vice versa) —
 *     the ticket's key cross-source-identity AC
 *   - generic (nameless-fallback) OSM names only merge on an exact match,
 *     never via substring — a real name must not collide with a generic one
 *   - queryHabitatCache returns NearbyPlace-shaped results within radius,
 *     sorted by distance, capped at 5 per type (matches searchNearbyPlaces)
 *   - refreshHabitatCacheIfStale only fetches OSM for stale/missing types
 *     (judged by osm_fetched_at, not touched by Google-only seeding), and
 *     skips entirely when offline
 *   - enforceSizeBudget evicts the oldest (by last_matched_at) rows beyond
 *     the cap
 *   - findExistingPlaceId (KAN-229) is a read-only counterpart to upsertPlace:
 *     returns an already-established match's id, or null (never inserts, and
 *     never invents an id for an unmatched place)
 *   - every exported function degrades to a safe default (never throws)
 *     when the underlying DB call itself throws
 *   - refreshHabitatCacheIfStale (KAN-238 review) pre-filters to OSM-mappable
 *     types before deciding what's stale — a custom-category string with no
 *     POI_OSM_TAGS mapping can never produce a row, so it must never keep
 *     "staleTypes" non-empty forever; a mapped type that legitimately
 *     returns zero OSM results is throttled per (type, coarse area) instead
 *     of re-hitting Overpass on every single proximity tick; and
 *     enforceSizeBudget's full-table COUNT(*) is skipped when nothing was
 *     actually upserted
 */

interface MockHabitatRow {
  id: string;
  poi_type: string;
  name: string;
  is_generic_name: number;
  lat: number;
  lng: number;
  google_place_id: string | null;
  osm_id: string | null;
  osm_fetched_at: number;
  last_matched_at: number;
}

// ─── In-memory expo-sqlite mock ────────────────────────────────────────────────

let rows: MockHabitatRow[] = [];

function matchesBox(row: MockHabitatRow, latMin: number, latMax: number, lngMin: number, lngMax: number): boolean {
  return row.lat >= latMin && row.lat <= latMax && row.lng >= lngMin && row.lng <= lngMax;
}

const mockDb = {
  execSync: jest.fn(),
  getAllSync: jest.fn(<T>(sql: string, params: unknown[] = []): T[] => {
    const s = sql.replace(/\s+/g, ' ').trim();

    if (s.startsWith('SELECT COUNT(*)')) {
      return [{ count: rows.length }] as unknown as T[];
    }
    if (s.startsWith('SELECT 1 as one FROM habitat_places')) {
      return (rows.length > 0 ? [{ one: 1 }] : []) as unknown as T[];
    }
    if (s.startsWith('SELECT poi_type FROM habitat_places WHERE poi_type IN')) {
      const inCount = (s.match(/\?/g) ?? []).length - 5; // poiTypes + 4 box bounds + 1 cutoff
      const poiTypes = params.slice(0, inCount) as string[];
      const [latMin, latMax, lngMin, lngMax, cutoff] = params.slice(inCount) as number[];
      return rows.filter(r =>
        poiTypes.includes(r.poi_type) && matchesBox(r, latMin, latMax, lngMin, lngMax)
        && r.osm_id != null && r.osm_fetched_at >= cutoff,
      ) as unknown as T[];
    }
    if (s.startsWith('SELECT * FROM habitat_places WHERE poi_type IN')) {
      const inCount = (s.match(/\?/g) ?? []).length - 4;
      const poiTypes = params.slice(0, inCount) as string[];
      const [latMin, latMax, lngMin, lngMax] = params.slice(inCount) as number[];
      return rows.filter(r => poiTypes.includes(r.poi_type) && matchesBox(r, latMin, latMax, lngMin, lngMax)) as unknown as T[];
    }
    if (s.startsWith('SELECT * FROM habitat_places WHERE poi_type = ?')) {
      const [poiType, latMin, latMax, lngMin, lngMax] = params as [string, number, number, number, number];
      return rows.filter(r => r.poi_type === poiType && matchesBox(r, latMin, latMax, lngMin, lngMax)) as unknown as T[];
    }
    throw new Error(`mockDb.getAllSync: unrecognized query: ${s}`);
  }),
  runSync: jest.fn((sql: string, params: unknown[] = []) => {
    const s = sql.replace(/\s+/g, ' ').trim();

    if (s.startsWith('INSERT INTO habitat_places')) {
      const [id, poi_type, name, is_generic_name, lat, lng, google_place_id, osm_id, osm_fetched_at, last_matched_at] =
        params as [string, string, string, number, number, number, string | null, string | null, number, number];
      rows.push({ id, poi_type, name, is_generic_name, lat, lng, google_place_id, osm_id, osm_fetched_at, last_matched_at });
      return {} as any;
    }
    if (s.startsWith('UPDATE habitat_places')) {
      const [google, osm, osmFlag1, lat, osmFlag2, lng, osmFlag3, osmFetchedAt, lastMatchedAt, id] =
        params as [string | null, string | null, number, number, number, number, number, number, number, string];
      const row = rows.find(r => r.id === id);
      if (row) {
        row.google_place_id = row.google_place_id ?? google;
        row.osm_id = row.osm_id ?? osm;
        if (osmFlag1 === 1) { row.lat = lat; }
        if (osmFlag2 === 1) { row.lng = lng; }
        if (osmFlag3 === 1) { row.osm_fetched_at = osmFetchedAt; }
        row.last_matched_at = lastMatchedAt;
      }
      return {} as any;
    }
    if (s.startsWith('DELETE FROM habitat_places WHERE id IN')) {
      const [limit] = params as [number];
      const oldestFirst = [...rows].sort((a, b) => a.last_matched_at - b.last_matched_at);
      const toDelete = new Set(oldestFirst.slice(0, limit).map(r => r.id));
      rows = rows.filter(r => !toDelete.has(r.id));
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
  findExistingPlaceId,
  hasCachedPlaces,
  __resetHabitatDbForTests,
  __resetEmptyResultAttemptsForTests,
  MAX_CACHED_PLACES,
  HABITAT_CACHE_STALE_MS,
} from '../../src/services/habitatCache';

const ORIGIN = { lat: 0, lng: 0 };

beforeEach(() => {
  rows = [];
  jest.clearAllMocks();
  __resetHabitatDbForTests();
  __resetEmptyResultAttemptsForTests();
  mockNetInfoFetch.mockResolvedValue({ isConnected: true });
});

describe('upsertPlace', () => {
  it('inserts a new row for an OSM-sourced candidate when no existing place matches', () => {
    const id = upsertPlace({
      poiType: 'pharmacy',
      name:    'Corner Pharmacy',
      lat:     0,
      lng:     0,
      source:  { osm: 'node/1' },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(id);
    expect(rows[0].osm_id).toBe('node/1');
    expect(rows[0].google_place_id).toBeNull();
  });

  it('does NOT persist a Google-only candidate with no existing match (never caches Google coordinates long-term)', () => {
    const id = upsertPlace({
      poiType: 'pharmacy',
      name:    'Corner Pharmacy',
      lat:     0,
      lng:     0,
      source:  { google: 'g-1' },
    });

    expect(rows).toHaveLength(0);
    expect(id).toMatch(/^hp_/); // still returns a usable (but unpersisted) id
  });

  it('merges a later OSM sighting into the same internal id as an earlier Google sighting', () => {
    // Seed an OSM-anchored row first (a Google-only candidate alone would
    // not persist — see the test above).
    const osmSeedId = upsertPlace({
      poiType: 'pharmacy', name: 'Corner Pharmacy', lat: 0, lng: 0, source: { osm: 'node/seed' },
    });

    const googleId = upsertPlace({
      poiType: 'pharmacy',
      name:    'Corner Pharmacy',
      lat:     0.0001,
      lng:     0,
      source:  { google: 'g-1' },
    });

    expect(googleId).toBe(osmSeedId);
    expect(rows).toHaveLength(1);
    expect(rows[0].google_place_id).toBe('g-1');
  });

  it('merges a later Google sighting into the same internal id as an earlier OSM sighting, without moving its coordinates', () => {
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
      lat:     0.0001,       // a different coordinate than the OSM row
      lng:     0.0001,
      source:  { google: 'g-2' },
    });

    expect(googleId).toBe(osmId);
    expect(rows).toHaveLength(1);
    expect(rows[0].google_place_id).toBe('g-2');
    expect(rows[0].osm_id).toBe('node/42');
    // Coordinates stay OSM-anchored — the Google sighting's lat/lng never wins.
    expect(rows[0].lat).toBe(0);
    expect(rows[0].lng).toBe(0);
  });

  it('does not merge places of a different POI type at the same location', () => {
    const id1 = upsertPlace({ poiType: 'cafe', name: 'Spot', lat: 0, lng: 0, source: { osm: 'node/1' } });
    const id2 = upsertPlace({ poiType: 'bank', name: 'Spot', lat: 0, lng: 0, source: { osm: 'node/2' } });

    expect(id1).not.toBe(id2);
    expect(rows).toHaveLength(2);
  });

  it('does not merge places beyond the identity match radius', () => {
    const id1 = upsertPlace({ poiType: 'atm', name: 'Same Name', lat: 0, lng: 0, source: { osm: 'node/1' } });
    // ~1km away — well beyond the ~150m identity match radius.
    const id2 = upsertPlace({ poiType: 'atm', name: 'Same Name', lat: 0.009, lng: 0, source: { osm: 'node/2' } });

    expect(id1).not.toBe(id2);
    expect(rows).toHaveLength(2);
  });

  describe('generic (nameless-fallback) name matching', () => {
    it('does not merge a real name into a nearby generic-named row (substring collision guard)', () => {
      // "pharmacy" (generic OSM fallback) is trivially a substring of almost
      // every real pharmacy name — that must not cause a false merge.
      const genericId = upsertPlace({
        poiType: 'pharmacy', name: 'pharmacy', isGenericName: true, lat: 0, lng: 0, source: { osm: 'node/1' },
      });
      const namedId = upsertPlace({
        poiType: 'pharmacy', name: 'Corner Pharmacy', lat: 0.0001, lng: 0, source: { osm: 'node/2' },
      });

      expect(namedId).not.toBe(genericId);
      expect(rows).toHaveLength(2);
    });

    it('still merges the exact same generic name at the same place (re-fetch of the same unnamed OSM node)', () => {
      const firstId = upsertPlace({
        poiType: 'atm', name: 'atm', isGenericName: true, lat: 0, lng: 0, source: { osm: 'node/1' },
      });
      const secondId = upsertPlace({
        poiType: 'atm', name: 'atm', isGenericName: true, lat: 0.0001, lng: 0, source: { osm: 'node/1' },
      });

      expect(secondId).toBe(firstId);
      expect(rows).toHaveLength(1);
    });
  });

  it('returns a fresh id and logs a warning instead of throwing when the DB read fails', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockDb.getAllSync.mockImplementationOnce(() => { throw new Error('disk full'); });

    const id = upsertPlace({ poiType: 'atm', name: 'Test', lat: 0, lng: 0, source: { osm: 'node/1' } });

    expect(id).toMatch(/^hp_/);
    expect(warnSpy).toHaveBeenCalledWith('[habitatCache] upsertPlace failed', expect.any(Error));
    warnSpy.mockRestore();
  });
});

describe('findExistingPlaceId (KAN-229)', () => {
  it('returns the internal id of an already-established cross-source match', () => {
    const id = upsertPlace({ poiType: 'atm', name: 'Corner ATM', lat: 0, lng: 0, source: { osm: 'node/1' } });

    const found = findExistingPlaceId('atm', 'Corner ATM', 0.0001, 0);

    expect(found).toBe(id);
  });

  it('returns null when the place has no cache counterpart yet — never invents an id', () => {
    const found = findExistingPlaceId('atm', 'Some New Place', 0, 0);
    expect(found).toBeNull();
  });

  it('is read-only — never inserts or updates a row', () => {
    findExistingPlaceId('atm', 'Some New Place', 0, 0);
    expect(rows).toHaveLength(0);
    expect(mockDb.runSync).not.toHaveBeenCalled();
  });

  it('returns null and logs a warning instead of throwing when the DB read fails', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockDb.getAllSync.mockImplementationOnce(() => { throw new Error('disk full'); });

    const found = findExistingPlaceId('atm', 'Corner ATM', 0, 0);

    expect(found).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('[habitatCache] findExistingPlaceId failed', expect.any(Error));
    warnSpy.mockRestore();
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

  it('caps results at 5 per type, matching searchNearbyPlaces behavior', () => {
    for (let i = 0; i < 8; i++) {
      upsertPlace({ poiType: 'atm', name: `ATM ${i}`, lat: i * 0.0001, lng: 0, source: { osm: `node/${i}` } });
    }

    const result = queryHabitatCache(ORIGIN.lat, ORIGIN.lng, ['atm'], 5000);

    expect(result.atm).toHaveLength(5);
  });

  it('returns an empty array for a type with no cached rows', () => {
    const result = queryHabitatCache(ORIGIN.lat, ORIGIN.lng, ['school'], 5000);
    expect(result.school).toEqual([]);
  });

  it('returns an empty result and logs a warning instead of throwing when the DB read fails', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockDb.getAllSync.mockImplementationOnce(() => { throw new Error('disk full'); });

    const result = queryHabitatCache(ORIGIN.lat, ORIGIN.lng, ['atm'], 5000);

    expect(result).toEqual({ atm: [] });
    expect(warnSpy).toHaveBeenCalledWith('[habitatCache] queryHabitatCache failed', expect.any(Error));
    warnSpy.mockRestore();
  });
});

describe('refreshHabitatCacheIfStale', () => {
  it('does nothing when offline', async () => {
    mockNetInfoFetch.mockResolvedValue({ isConnected: false });
    await refreshHabitatCacheIfStale(ORIGIN.lat, ORIGIN.lng, ['atm']);
    expect(mockSearchOsmPlaces).not.toHaveBeenCalled();
  });

  it('fetches OSM data when the area has no cached rows yet', async () => {
    mockSearchOsmPlaces.mockResolvedValue({
      atm: [{ osmId: 'node/1', name: 'New ATM', isGenericName: false, lat: 0, lng: 0, distanceMeters: 0 }],
    });

    await refreshHabitatCacheIfStale(ORIGIN.lat, ORIGIN.lng, ['atm']);

    expect(mockSearchOsmPlaces).toHaveBeenCalledWith(ORIGIN.lat, ORIGIN.lng, ['atm'], 5000);
    expect(rows).toHaveLength(1);
  });

  it('does not re-fetch a type whose OSM data is still fresh', async () => {
    upsertPlace({ poiType: 'atm', name: 'Existing ATM', lat: 0, lng: 0, source: { osm: 'node/1' } });

    await refreshHabitatCacheIfStale(ORIGIN.lat, ORIGIN.lng, ['atm']);

    expect(mockSearchOsmPlaces).not.toHaveBeenCalled();
  });

  it('re-fetches a type whose OSM data is older than the 14-day staleness window', async () => {
    upsertPlace({ poiType: 'atm', name: 'Stale ATM', lat: 0, lng: 0, source: { osm: 'node/1' } });
    rows[0].osm_fetched_at = Date.now() - HABITAT_CACHE_STALE_MS - 1000;
    mockSearchOsmPlaces.mockResolvedValue({ atm: [] });

    await refreshHabitatCacheIfStale(ORIGIN.lat, ORIGIN.lng, ['atm']);

    expect(mockSearchOsmPlaces).toHaveBeenCalledWith(ORIGIN.lat, ORIGIN.lng, ['atm'], 5000);
  });

  it('does not skip the OSM refresh just because a live Google hit was seeded for the same type', async () => {
    // Seed a Google-only candidate first — per the ToS-compliance fix this
    // never persists a row, so the area still has zero OSM-backed rows and
    // must still be treated as stale.
    upsertPlace({ poiType: 'atm', name: 'Live Hit', lat: 0, lng: 0, source: { google: 'g-1' } });
    mockSearchOsmPlaces.mockResolvedValue({ atm: [] });

    await refreshHabitatCacheIfStale(ORIGIN.lat, ORIGIN.lng, ['atm']);

    expect(mockSearchOsmPlaces).toHaveBeenCalledWith(ORIGIN.lat, ORIGIN.lng, ['atm'], 5000);
  });

  it('never calls searchOsmPlaces for a custom type with no OSM mapping — it would never satisfy the freshness check and stay stale forever otherwise', async () => {
    await refreshHabitatCacheIfStale(ORIGIN.lat, ORIGIN.lng, ['my_custom_unmapped_type']);
    expect(mockSearchOsmPlaces).not.toHaveBeenCalled();
  });

  it('fetches only the OSM-mappable subset when poiTypes mixes mapped and unmapped types', async () => {
    mockSearchOsmPlaces.mockResolvedValue({ atm: [] });

    await refreshHabitatCacheIfStale(ORIGIN.lat, ORIGIN.lng, ['atm', 'my_custom_unmapped_type']);

    expect(mockSearchOsmPlaces).toHaveBeenCalledWith(ORIGIN.lat, ORIGIN.lng, ['atm'], 5000);
  });

  it('skips enforceSizeBudget\'s full-table COUNT(*) when OSM returned zero results for every fetched type', async () => {
    mockSearchOsmPlaces.mockResolvedValue({ atm: [] });

    await refreshHabitatCacheIfStale(ORIGIN.lat, ORIGIN.lng, ['atm']);

    const countCalls = mockDb.getAllSync.mock.calls.filter(([sql]) => String(sql).includes('SELECT COUNT(*)'));
    expect(countCalls).toHaveLength(0);
  });

  it('still runs enforceSizeBudget when at least one place was upserted', async () => {
    mockSearchOsmPlaces.mockResolvedValue({
      atm: [{ osmId: 'node/1', name: 'New ATM', isGenericName: false, lat: 0, lng: 0, distanceMeters: 0 }],
    });

    await refreshHabitatCacheIfStale(ORIGIN.lat, ORIGIN.lng, ['atm']);

    const countCalls = mockDb.getAllSync.mock.calls.filter(([sql]) => String(sql).includes('SELECT COUNT(*)'));
    expect(countCalls).toHaveLength(1);
  });

  describe('empty-result retry cooldown', () => {
    it('does not re-fetch a mapped type shortly after it returned zero OSM results', async () => {
      mockSearchOsmPlaces.mockResolvedValue({ atm: [] });
      await refreshHabitatCacheIfStale(ORIGIN.lat, ORIGIN.lng, ['atm']);
      expect(mockSearchOsmPlaces).toHaveBeenCalledTimes(1);

      mockSearchOsmPlaces.mockClear();
      await refreshHabitatCacheIfStale(ORIGIN.lat, ORIGIN.lng, ['atm']);
      expect(mockSearchOsmPlaces).not.toHaveBeenCalled();
    });

    it('retries once the cooldown window has passed', async () => {
      const nowSpy = jest.spyOn(Date, 'now');
      let now = 1_000_000;
      nowSpy.mockImplementation(() => now);

      mockSearchOsmPlaces.mockResolvedValue({ atm: [] });
      await refreshHabitatCacheIfStale(ORIGIN.lat, ORIGIN.lng, ['atm']);
      expect(mockSearchOsmPlaces).toHaveBeenCalledTimes(1);

      mockSearchOsmPlaces.mockClear();
      now += 60 * 60 * 1_000 + 1; // just past the 1-hour cooldown
      await refreshHabitatCacheIfStale(ORIGIN.lat, ORIGIN.lng, ['atm']);
      expect(mockSearchOsmPlaces).toHaveBeenCalledTimes(1);

      nowSpy.mockRestore();
    });

    it('throttles independently per area — a different location for the same type still fetches', async () => {
      mockSearchOsmPlaces.mockResolvedValue({ atm: [] });
      await refreshHabitatCacheIfStale(0, 0, ['atm']);
      expect(mockSearchOsmPlaces).toHaveBeenCalledTimes(1);

      mockSearchOsmPlaces.mockClear();
      await refreshHabitatCacheIfStale(10, 10, ['atm']); // far enough to be a different grid cell
      expect(mockSearchOsmPlaces).toHaveBeenCalledTimes(1);
    });
  });

  it('returns without throwing when the DB read fails', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockDb.getAllSync.mockImplementationOnce(() => { throw new Error('disk full'); });

    await expect(refreshHabitatCacheIfStale(ORIGIN.lat, ORIGIN.lng, ['atm'])).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith('[habitatCache] refreshHabitatCacheIfStale failed', expect.any(Error));
    warnSpy.mockRestore();
  });
});

describe('enforceSizeBudget', () => {
  it('evicts the oldest (by last_matched_at) rows beyond MAX_CACHED_PLACES', () => {
    for (let i = 0; i < MAX_CACHED_PLACES + 5; i++) {
      const id = upsertPlace({ poiType: 'atm', name: `ATM ${i}`, lat: i * 0.01, lng: 0, source: { osm: `node/${i}` } });
      const row = rows.find(r => r.id === id);
      if (row) { row.last_matched_at = i; } // ascending — first inserted is oldest
    }

    enforceSizeBudget();

    expect(rows).toHaveLength(MAX_CACHED_PLACES);
    // The 5 oldest (lowest last_matched_at, i.e. i=0..4) should be gone.
    expect(rows.some(r => r.name === 'ATM 0')).toBe(false);
    expect(rows.some(r => r.name === `ATM ${MAX_CACHED_PLACES + 4}`)).toBe(true);
  });

  it('does nothing when under the cap', () => {
    upsertPlace({ poiType: 'atm', name: 'Only ATM', lat: 0, lng: 0, source: { osm: 'node/1' } });
    enforceSizeBudget();
    expect(rows).toHaveLength(1);
  });

  it('does not throw when the DB read fails', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockDb.getAllSync.mockImplementationOnce(() => { throw new Error('disk full'); });

    expect(() => enforceSizeBudget()).not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith('[habitatCache] enforceSizeBudget failed', expect.any(Error));
    warnSpy.mockRestore();
  });
});

describe('hasCachedPlaces (KAN-236)', () => {
  it('returns false when the cache is empty', () => {
    expect(hasCachedPlaces()).toBe(false);
  });

  it('returns true when the cache has at least one row, anywhere', () => {
    upsertPlace({ poiType: 'atm', name: 'Some ATM', lat: 40, lng: -70, source: { osm: 'node/1' } });
    expect(hasCachedPlaces()).toBe(true);
  });

  it('returns false and logs a warning instead of throwing when the DB read fails', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockDb.getAllSync.mockImplementationOnce(() => { throw new Error('disk full'); });

    expect(hasCachedPlaces()).toBe(false);

    expect(warnSpy).toHaveBeenCalledWith('[habitatCache] hasCachedPlaces failed', expect.any(Error));
    warnSpy.mockRestore();
  });
});
