/**
 * KAN-285 review fix — proximitySnapshot: direct coverage of the SQLite
 * persistence layer, using a small in-memory mock DB that recognizes the
 * exact queries the module issues (same pattern as habitatCache.test.ts —
 * expo-sqlite has no official Jest mock, and a full SQL engine would be
 * overkill for one module's fixed single-table query set).
 *
 * Covers:
 *   - table creation happens lazily, once, on first use
 *   - save then load round-trips every field, including JSON-encoded
 *     nearbyPlace/poiPlaces
 *   - a null nearbyPlace round-trips as null, not the string "null"
 *   - different uids never see each other's snapshot (UID isolation)
 *   - a second save for the same uid replaces the row (upsert), not a
 *     second row
 *   - loadProximitySnapshot returns null for a uid with no saved snapshot
 *   - malformed persisted JSON in poi_places_json is caught, not thrown —
 *     load returns null and logs a warning
 *   - a save/load call that hits a genuine SQLite error is caught, not
 *     thrown — save silently no-ops (fire-and-forget), load returns null,
 *     both log a warning
 */

interface MockRow {
  uid: string;
  lat: number;
  lng: number;
  poi_types_key: string;
  nearby_poi_type: string | null;
  nearby_place_json: string | null;
  poi_places_json: string;
  updated_at: number;
}

let rows: MockRow[] = [];
let nextRunSyncThrows: Error | null = null;
let nextGetFirstSyncThrows: Error | null = null;

const mockOpenDatabaseSync = jest.fn();
const mockExecSync = jest.fn();
const mockRunSync = jest.fn((sql: string, params: unknown[] = []) => {
  if (nextRunSyncThrows) {
    const err = nextRunSyncThrows;
    nextRunSyncThrows = null;
    throw err;
  }
  const s = sql.replace(/\s+/g, ' ').trim();
  if (s.startsWith('INSERT INTO proximity_snapshot')) {
    const [uid, lat, lng, poiTypesKey, nearbyPoiType, nearbyPlaceJson, poiPlacesJson, updatedAt] =
      params as [string, number, number, string, string | null, string | null, string, number];
    const existing = rows.find(r => r.uid === uid);
    if (existing) {
      existing.lat = lat;
      existing.lng = lng;
      existing.poi_types_key = poiTypesKey;
      existing.nearby_poi_type = nearbyPoiType;
      existing.nearby_place_json = nearbyPlaceJson;
      existing.poi_places_json = poiPlacesJson;
      existing.updated_at = updatedAt;
    } else {
      rows.push({
        uid, lat, lng, poi_types_key: poiTypesKey, nearby_poi_type: nearbyPoiType,
        nearby_place_json: nearbyPlaceJson, poi_places_json: poiPlacesJson, updated_at: updatedAt,
      });
    }
    return {} as any;
  }
  throw new Error(`mockDb.runSync: unrecognized query: ${s}`);
});
const mockGetFirstSync = jest.fn(<T,>(sql: string, params: unknown[] = []): T | null => {
  if (nextGetFirstSyncThrows) {
    const err = nextGetFirstSyncThrows;
    nextGetFirstSyncThrows = null;
    throw err;
  }
  const s = sql.replace(/\s+/g, ' ').trim();
  if (s.startsWith('SELECT lat, lng, poi_types_key, nearby_poi_type, nearby_place_json, poi_places_json FROM proximity_snapshot WHERE uid = ?')) {
    const [uid] = params as [string];
    const row = rows.find(r => r.uid === uid);
    return (row ?? null) as unknown as T | null;
  }
  throw new Error(`mockDb.getFirstSync: unrecognized query: ${s}`);
});

const mockDb = {
  execSync:     mockExecSync,
  runSync:      mockRunSync,
  getFirstSync: mockGetFirstSync,
};

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: (...args: unknown[]) => mockOpenDatabaseSync(...args),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {
  saveProximitySnapshot,
  loadProximitySnapshot,
  __resetProximitySnapshotDbForTests,
  type ProximitySnapshot,
} from '../../src/services/proximitySnapshot';

const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

function makeSnapshot(overrides: Partial<ProximitySnapshot> = {}): ProximitySnapshot {
  return {
    lat: 38.7, lng: -9.1, poiTypesKey: 'pharmacy',
    nearbyPoiType: 'pharmacy',
    nearbyPlace: { placeId: 'p1', name: 'Corner Pharmacy', lat: 38.7001, lng: -9.1001, distanceMeters: 20 },
    poiPlaces: { pharmacy: [{ placeId: 'p1', name: 'Corner Pharmacy', lat: 38.7001, lng: -9.1001, distanceMeters: 20 }] },
    ...overrides,
  };
}

beforeEach(() => {
  rows = [];
  nextRunSyncThrows = null;
  nextGetFirstSyncThrows = null;
  mockOpenDatabaseSync.mockReturnValue(mockDb);
  jest.clearAllMocks();
  mockConsoleWarn.mockClear();
  __resetProximitySnapshotDbForTests();
});

describe('proximitySnapshot — db setup', () => {
  it('creates the table lazily on first use, once, not on module load', () => {
    expect(mockOpenDatabaseSync).not.toHaveBeenCalled();
    saveProximitySnapshot('uid-1', makeSnapshot());
    expect(mockOpenDatabaseSync).toHaveBeenCalledTimes(1);
    expect(mockExecSync).toHaveBeenCalledTimes(1);
    expect(mockExecSync.mock.calls[0][0]).toContain('CREATE TABLE IF NOT EXISTS proximity_snapshot');

    loadProximitySnapshot('uid-1');
    // Second call reuses the cached db handle — no second open/create.
    expect(mockOpenDatabaseSync).toHaveBeenCalledTimes(1);
    expect(mockExecSync).toHaveBeenCalledTimes(1);
  });
});

describe('proximitySnapshot — save/load round-trip', () => {
  it('round-trips every field, including JSON-encoded nearbyPlace/poiPlaces', () => {
    const snapshot = makeSnapshot();
    saveProximitySnapshot('uid-1', snapshot);

    const loaded = loadProximitySnapshot('uid-1');
    expect(loaded).toEqual(snapshot);
  });

  it('round-trips a null nearbyPlace as null, not the string "null"', () => {
    saveProximitySnapshot('uid-1', makeSnapshot({ nearbyPoiType: null, nearbyPlace: null, poiPlaces: {} }));

    const loaded = loadProximitySnapshot('uid-1');
    expect(loaded?.nearbyPlace).toBeNull();
    expect(loaded?.nearbyPoiType).toBeNull();
  });

  it('returns null for a uid with no saved snapshot', () => {
    saveProximitySnapshot('uid-1', makeSnapshot());
    expect(loadProximitySnapshot('uid-2')).toBeNull();
  });

  it('isolates snapshots per uid — saving one uid never overwrites another', () => {
    saveProximitySnapshot('uid-1', makeSnapshot({ poiTypesKey: 'pharmacy' }));
    saveProximitySnapshot('uid-2', makeSnapshot({ poiTypesKey: 'atm' }));

    expect(loadProximitySnapshot('uid-1')?.poiTypesKey).toBe('pharmacy');
    expect(loadProximitySnapshot('uid-2')?.poiTypesKey).toBe('atm');
  });

  it('replaces the existing row on a second save for the same uid (upsert, not a duplicate row)', () => {
    saveProximitySnapshot('uid-1', makeSnapshot({ poiTypesKey: 'pharmacy' }));
    saveProximitySnapshot('uid-1', makeSnapshot({ poiTypesKey: 'atm', lat: 1, lng: 2 }));

    expect(rows).toHaveLength(1);
    const loaded = loadProximitySnapshot('uid-1');
    expect(loaded?.poiTypesKey).toBe('atm');
    expect(loaded?.lat).toBe(1);
  });
});

describe('proximitySnapshot — error handling', () => {
  it('load returns null and warns when the persisted poi_places_json is malformed', () => {
    saveProximitySnapshot('uid-1', makeSnapshot());
    const row = rows.find(r => r.uid === 'uid-1')!;
    row.poi_places_json = '{not valid json';

    const loaded = loadProximitySnapshot('uid-1');
    expect(loaded).toBeNull();
    expect(mockConsoleWarn).toHaveBeenCalledWith('[proximitySnapshot] load failed', expect.anything());
  });

  it('save swallows a SQLite failure — fire-and-forget, never throws — and warns', () => {
    nextRunSyncThrows = new Error('disk full');
    expect(() => saveProximitySnapshot('uid-1', makeSnapshot())).not.toThrow();
    expect(mockConsoleWarn).toHaveBeenCalledWith('[proximitySnapshot] save failed', expect.any(Error));
    // Nothing was persisted.
    expect(loadProximitySnapshot('uid-1')).toBeNull();
  });

  it('load swallows a SQLite failure — returns null, never throws — and warns', () => {
    saveProximitySnapshot('uid-1', makeSnapshot());
    nextGetFirstSyncThrows = new Error('database is locked');

    let loaded: unknown;
    expect(() => { loaded = loadProximitySnapshot('uid-1'); }).not.toThrow();
    expect(loaded).toBeNull();
    expect(mockConsoleWarn).toHaveBeenCalledWith('[proximitySnapshot] load failed', expect.any(Error));
  });
});
