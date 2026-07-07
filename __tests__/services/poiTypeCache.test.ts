/**
 * KAN-253 — poiTypeCache: local SQLite read-through cache in front of
 * maps.ts's searchPlaceTypes (Google Places Text Search, a live/billed call).
 *
 * expo-sqlite has no official Jest mock, so this file uses a small in-memory
 * mock DB that recognizes the exact queries poiTypeCache.ts issues, same
 * approach as __tests__/services/habitatCache.test.ts.
 *
 * Covers:
 *   - seedPoiTypeCacheIfEmpty seeds one row per bundled type, keyed by its
 *     normalized label, and no-ops if the table already has anything in it
 *   - lookupPoiTypeCache returns a seeded/cached hit, or null on a genuine miss
 *   - searchPlaceTypesCached short-circuits on a cache hit (no network call)
 *   - searchPlaceTypesCached falls through to the live API on a miss and
 *     persists the result (including an empty result) so it's never re-fetched
 *   - every exported function degrades to a safe default (never throws) when
 *     the underlying DB call itself throws
 */

interface MockRow {
  query_key: string;
  results_json: string;
  source: string;
  created_at: number;
}

// ─── In-memory expo-sqlite mock ────────────────────────────────────────────────

let rows: MockRow[] = [];

const mockDb = {
  execSync: jest.fn(),
  getAllSync: jest.fn(<T>(sql: string, params: unknown[] = []): T[] => {
    const s = sql.replace(/\s+/g, ' ').trim();

    if (s.startsWith('SELECT results_json FROM poi_type_search WHERE query_key = ?')) {
      const [key] = params as [string];
      const row = rows.find(r => r.query_key === key);
      return (row ? [{ results_json: row.results_json }] : []) as unknown as T[];
    }
    if (s.startsWith('SELECT 1 as one FROM poi_type_search')) {
      return (rows.length > 0 ? [{ one: 1 }] : []) as unknown as T[];
    }
    throw new Error(`mockDb.getAllSync: unrecognized query: ${s}`);
  }),
  runSync: jest.fn((sql: string, params: unknown[] = []) => {
    const s = sql.replace(/\s+/g, ' ').trim();

    if (s.startsWith('INSERT OR REPLACE INTO poi_type_search')) {
      const [query_key, results_json, source, created_at] = params as [string, string, string, number];
      rows = rows.filter(r => r.query_key !== query_key);
      rows.push({ query_key, results_json, source, created_at });
      return {} as any;
    }
    if (s.startsWith('INSERT OR IGNORE INTO poi_type_search')) {
      const [query_key, results_json, source, created_at] = params as [string, string, string, number];
      if (!rows.some(r => r.query_key === query_key)) {
        rows.push({ query_key, results_json, source, created_at });
      }
      return {} as any;
    }
    throw new Error(`mockDb.runSync: unrecognized query: ${s}`);
  }),
  withTransactionSync: jest.fn((task: () => void) => { task(); }),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => mockDb),
}));

const mockSearchPlaceTypes = jest.fn();
jest.mock('../../src/services/maps', () => {
  const actual = jest.requireActual('../../src/services/maps');
  return {
    ...actual,
    searchPlaceTypes: (...args: unknown[]) => mockSearchPlaceTypes(...args),
  };
});

jest.mock('../../src/constants/googlePlaceTypes', () => ({
  GOOGLE_PLACE_TYPES_TABLE_A: ['gym', 'cafe', 'sushi_restaurant'],
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {
  lookupPoiTypeCache,
  recordPoiTypeSearch,
  seedPoiTypeCacheIfEmpty,
  searchPlaceTypesCached,
  __resetPoiTypeCacheDbForTests,
} from '../../src/services/poiTypeCache';

beforeEach(() => {
  rows = [];
  jest.clearAllMocks();
  __resetPoiTypeCacheDbForTests();
});

describe('seedPoiTypeCacheIfEmpty', () => {
  it('seeds one row per bundled type, keyed by its normalized label', () => {
    seedPoiTypeCacheIfEmpty();

    expect(rows).toHaveLength(3);
    expect(lookupPoiTypeCache('Gym')).toEqual([{ type: 'gym', label: 'Gym' }]);
    expect(lookupPoiTypeCache('sushi restaurant')).toEqual([{ type: 'sushi_restaurant', label: 'Sushi Restaurant' }]);
  });

  it('matches a seeded type by its raw slug too (underscores normalize to spaces same as the label)', () => {
    seedPoiTypeCacheIfEmpty();

    expect(lookupPoiTypeCache('sushi_restaurant')).toEqual([{ type: 'sushi_restaurant', label: 'Sushi Restaurant' }]);
  });

  it('no-ops if the table already has anything in it', () => {
    rows.push({ query_key: 'preexisting', results_json: '[]', source: 'api', created_at: 1 });

    seedPoiTypeCacheIfEmpty();

    expect(rows).toHaveLength(1);
    expect(mockDb.withTransactionSync).not.toHaveBeenCalled();
  });

  it('never throws when the underlying DB call fails', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockDb.getAllSync.mockImplementationOnce(() => { throw new Error('disk full'); });

    expect(() => seedPoiTypeCacheIfEmpty()).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('lookupPoiTypeCache', () => {
  it('returns null on a genuine miss', () => {
    expect(lookupPoiTypeCache('nonexistent query')).toBeNull();
  });

  it('returns a previously recorded result on a hit', () => {
    recordPoiTypeSearch('a nice bakery', [{ type: 'bakery', label: 'Bakery' }]);
    expect(lookupPoiTypeCache('A Nice Bakery')).toEqual([{ type: 'bakery', label: 'Bakery' }]);
  });

  it('returns null (never throws) when the underlying DB call fails', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockDb.getAllSync.mockImplementationOnce(() => { throw new Error('disk full'); });

    expect(lookupPoiTypeCache('anything')).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('recordPoiTypeSearch', () => {
  it('persists an empty result too, so an unresolvable query is remembered as a miss', () => {
    recordPoiTypeSearch('gibberish xyz', []);
    expect(lookupPoiTypeCache('gibberish xyz')).toEqual([]);
  });

  it('never throws when the underlying DB call fails', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockDb.runSync.mockImplementationOnce(() => { throw new Error('disk full'); });

    expect(() => recordPoiTypeSearch('anything', [])).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('searchPlaceTypesCached', () => {
  it('returns the cached result on a hit without calling the live API', async () => {
    recordPoiTypeSearch('gym', [{ type: 'gym', label: 'Gym' }]);

    const results = await searchPlaceTypesCached('gym');

    expect(results).toEqual([{ type: 'gym', label: 'Gym' }]);
    expect(mockSearchPlaceTypes).not.toHaveBeenCalled();
  });

  it('falls through to the live API on a miss and persists the result', async () => {
    mockSearchPlaceTypes.mockResolvedValue([{ type: 'florist', label: 'Florist' }]);

    const results = await searchPlaceTypesCached('flowers nearby');

    expect(mockSearchPlaceTypes).toHaveBeenCalledWith('flowers nearby');
    expect(results).toEqual([{ type: 'florist', label: 'Florist' }]);
    expect(lookupPoiTypeCache('flowers nearby')).toEqual([{ type: 'florist', label: 'Florist' }]);
  });

  it('never re-fetches the same query once it has been resolved and cached', async () => {
    mockSearchPlaceTypes.mockResolvedValue([{ type: 'florist', label: 'Florist' }]);

    await searchPlaceTypesCached('flowers nearby');
    await searchPlaceTypesCached('flowers nearby');

    expect(mockSearchPlaceTypes).toHaveBeenCalledTimes(1);
  });
});
