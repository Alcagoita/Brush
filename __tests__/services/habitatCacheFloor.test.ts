/**
 * KAN-382 — the habitat cache keeps a place's floor, on real SQLite.
 *
 * habitatCache.test.ts drives the cache through a fake that pattern-matches
 * SQL; this file runs the production SQL itself (../helpers/expoSqliteNode),
 * so the ALTER TABLE migration, the INSERT/UPDATE parameter order and the
 * COALESCE that never clears a floor are all checked by SQLite.
 */
import { nodeSqlite, resetNodeSqlite } from '../helpers/expoSqliteNode';

jest.mock('expo-sqlite', () => require('../helpers/expoSqliteNode').expoSqliteMock);
jest.mock('../../src/services/maps', () => ({
  getDistanceMeters: jest.requireActual('../../src/services/geoDistance').getDistanceMeters,
  searchNearbyPlaces: jest.fn(),
}));
jest.mock('../../src/services/osmPlaces', () => ({
  searchOsmPlaces: jest.fn().mockResolvedValue({}),
  searchOsmPlacesStrict: jest.fn().mockResolvedValue({}),
  OverpassRateLimitedError: class OverpassRateLimitedError extends Error {},
  OverpassHttpError: class OverpassHttpError extends Error {},
}));

import {
  __resetHabitatDbForTests, getHabitatPlaceById, queryHabitatCache, upsertPlace,
} from '../../src/services/habitatCache';

const AT = { lat: 38.7546, lng: -9.1882 };

beforeEach(() => {
  resetNodeSqlite();
  __resetHabitatDbForTests();
});

function columns(): string[] {
  return (nodeSqlite().prepare('PRAGMA table_info(habitat_places)').all() as Array<{ name: string }>).map(c => c.name);
}

describe('habitat_places.floor on real SQLite', () => {
  it('adds the column to a cache created before it existed, keeping the old rows', () => {
    // The original KAN-228 table, as an older install has it on disk.
    nodeSqlite().exec(`
      CREATE TABLE habitat_places (
        id TEXT PRIMARY KEY, poi_type TEXT NOT NULL, name TEXT NOT NULL,
        is_generic_name INTEGER NOT NULL DEFAULT 0, lat REAL NOT NULL, lng REAL NOT NULL,
        google_place_id TEXT, osm_id TEXT, brand TEXT,
        osm_fetched_at INTEGER NOT NULL, last_matched_at INTEGER NOT NULL
      );
      INSERT INTO habitat_places (id, poi_type, name, lat, lng, osm_id, osm_fetched_at, last_matched_at)
      VALUES ('hp_old', 'store', 'Worten', ${AT.lat}, ${AT.lng}, 'node/1', 1, 1);
    `);
    expect(columns()).not.toContain('floor');

    const result = queryHabitatCache(AT.lat, AT.lng, ['store'], 200);

    expect(columns()).toContain('floor');
    expect(result.store.map(place => [place.name, place.floor])).toEqual([['Worten', null]]);
  });

  it('stores a floor, keeps it when a later sighting has none, and reads it back', () => {
    const id = upsertPlace({ poiType: 'store', name: 'Zara', ...AT, source: { brush: 'mall:colombo:zara' }, floor: '1' });
    upsertPlace({ poiType: 'store', name: 'Zara', ...AT, source: { overture: 'ov-zara' } });

    expect(nodeSqlite().prepare('SELECT COUNT(*) AS n FROM habitat_places').get()).toEqual({ n: 1 });
    expect(getHabitatPlaceById(id)?.floor).toBe('1');
    expect(queryHabitatCache(AT.lat, AT.lng, ['store'], 200).store.map(place => place.floor)).toEqual(['1']);
  });

  it('keeps one brand on two known floors as two places', () => {
    upsertPlace({ poiType: 'restaurant', name: 'OAKBERRY', ...AT, source: { brush: 'mall:colombo:oakberry' }, floor: '0' });
    upsertPlace({ poiType: 'restaurant', name: 'OAKBERRY', lat: AT.lat + 0.0001, lng: AT.lng, source: { brush: 'mall:colombo:oakberry-2' }, floor: '2' });

    const floors = queryHabitatCache(AT.lat, AT.lng, ['restaurant'], 200).restaurant.map(place => place.floor).sort();

    expect(floors).toEqual(['0', '2']);
  });

  it('still merges when one side has no floor', () => {
    upsertPlace({ poiType: 'restaurant', name: 'OAKBERRY', ...AT, source: { brush: 'mall:colombo:oakberry' }, floor: '0' });
    upsertPlace({ poiType: 'restaurant', name: 'OAKBERRY', ...AT, source: { overture: 'ov-oak' } });

    expect(queryHabitatCache(AT.lat, AT.lng, ['restaurant'], 200).restaurant.map(place => place.floor)).toEqual(['0']);
  });
});
