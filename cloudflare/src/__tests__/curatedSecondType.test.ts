import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@cloudflare/containers', () => ({
  getContainer: () => ({ start: vi.fn() }),
  Container: class {},
}));

import worker, { type Env } from '../index';
import { encodeGeohash } from '../geohash';
import { d1Binding, schemaDb } from './d1TestDb';

/**
 * KAN-433 — a curated row with a second type is served under both.
 *
 * The importer files a Monastery as primary `historical_landmark` plus a
 * `curated_poi_attribute` of dimension `poi_type`, value `church`, because
 * curated_poi has one primary_poi_type and no curated_poi_type table. Nearby
 * must find the row for either request, once each, with the primary type on
 * the wire and the extra type kept out of `attributes`. Real SQLite over the
 * project's schema, so the EXISTS predicate is the one production runs.
 *
 * Reference point: Mosteiro dos Jerónimos.
 */
const ROOT = join(__dirname, '..', '..');
const LAT = 38.6979;
const LNG = -9.2067;
const CTX = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;

interface Served { poi_id: string; name: string; primary_poi_type: string; source: string; attributes: Record<string, string[]> }

function db(): DatabaseSync {
  const database = schemaDb();
  for (const file of ['poi_type_schema.sql', 'poi_attribute_schema.sql', 'type_relation_schema.sql']) {
    database.exec(readFileSync(join(ROOT, file), 'utf8'));
  }
  return database;
}

function insertCurated(database: DatabaseSync, poiId: string, name: string, primary: string, extraTypes: string[] = [], attributes: Array<[string, string]> = []) {
  database.prepare(
    `INSERT INTO curated_poi (poi_id, source, name, dedupe_name, lat, lng, geohash, primary_poi_type, status,
                              created_at, created_by, updated_at, updated_by, origin_source, origin_id, origin_licence, imported_at, import_run_id)
     VALUES (?, 'community', ?, ?, ?, ?, ?, ?, 'active', 't', 'kan-433', 't', 'kan-433', 'foursquare_os_places', ?, 'Apache-2.0', 't', 'test')`,
  ).run(poiId, name, name.toLowerCase(), LAT, LNG, encodeGeohash(LAT, LNG, 7), primary, poiId);
  for (const type of extraTypes) {
    database.prepare("INSERT INTO curated_poi_attribute (poi_id, dimension, value) VALUES (?, 'poi_type', ?)").run(poiId, type);
  }
  for (const [dimension, value] of attributes) {
    database.prepare('INSERT INTO curated_poi_attribute (poi_id, dimension, value) VALUES (?, ?, ?)').run(poiId, dimension, value);
  }
}

async function nearby(database: DatabaseSync, types: string[]): Promise<Record<string, Served[]>> {
  const env = { API_KEY: 'test-key', TURNSTILE_SECRET: 'test-secret', REGISTRY_DB: d1Binding(database) } as unknown as Env;
  const response = await worker.fetch(new Request('https://poi-api.test/poi/nearby', {
    method: 'POST',
    headers: { 'X-Api-Key': 'test-key', 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: LAT, lng: LNG, radius: 200, limitPerRequest: 20, requests: types.map(type => ({ key: type, type })) }),
  }), env, CTX);
  expect(response.status).toBe(200);
  return (await response.json() as { results: Record<string, Served[]> }).results;
}

describe('a curated row with a poi_type attribute', () => {
  it('is returned for its primary type and for its second type, once each, with the primary on the wire', async () => {
    const database = db();
    insertCurated(database, 'fsq:jeronimos', 'Mosteiro dos Jerónimos', 'historical_landmark', ['church']);

    const results = await nearby(database, ['church', 'historical_landmark', 'museum']);

    expect(results.church.map(poi => poi.poi_id)).toEqual(['fsq:jeronimos']);
    expect(results.historical_landmark.map(poi => poi.poi_id)).toEqual(['fsq:jeronimos']);
    expect(results.museum).toEqual([]);
    for (const poi of [...results.church, ...results.historical_landmark]) {
      expect(poi).toMatchObject({ primary_poi_type: 'historical_landmark', source: 'community', attributes: {} });
    }
  });

  it('keeps its other attributes when found through the second type only', async () => {
    const database = db();
    insertCurated(database, 'fsq:shrine', 'Santuário', 'church', ['historical_landmark'], [['store_kind', 'gift']]);

    const results = await nearby(database, ['historical_landmark']);

    expect(results.historical_landmark).toEqual([expect.objectContaining({
      poi_id: 'fsq:shrine', primary_poi_type: 'church', attributes: { store_kind: ['gift'] },
    })]);
  });

  it('does not match a row whose only claim to the type is another dimension', async () => {
    const database = db();
    insertCurated(database, 'fsq:gift', 'Loja', 'store', [], [['store_kind', 'church']]);

    const results = await nearby(database, ['church']);

    expect(results.church).toEqual([]);
  });
});

import { curatedTypeClause } from '../index';

describe('curatedTypeClause', () => {
  // 2026-09-20: the first version bound each type twice (primary IN + EXISTS
  // IN) and a 32-request batch tripped SQLite's variable cap in prod. Each
  // type is bound once and referenced twice by number.
  it('binds each type once and references it twice by ordered placeholder', () => {
    const clause = curatedTypeClause(['church', 'historical_landmark'], 6, null);
    expect(clause.binds).toEqual(['church', 'historical_landmark']);
    expect(clause.sql.match(/\?7\b/g)).toHaveLength(2);
    expect(clause.sql.match(/\?8\b/g)).toHaveLength(2);
    expect(clause.sql).not.toMatch(/\?(?!\d)/);
  });

  it('numbers the brand after the types', () => {
    const clause = curatedTypeClause(['gym'], 2, 'Fitness Hut');
    expect(clause.binds).toEqual(['gym', 'Fitness Hut']);
    expect(clause.sql).toContain('curated_poi.brand = ?4');
  });

  it('serves a full 32-request batch with brands over real SQLite', async () => {
    const database = db();
    insertCurated(database, 'fsq:jeronimos', 'Mosteiro dos Jerónimos', 'historical_landmark', ['church']);
    const types = ['church', 'historical_landmark', 'museum', 'supermarket', 'pharmacy', 'bank', 'gym', 'cafe',
      'restaurant', 'bakery', 'store', 'park', 'hotel', 'library', 'hospital', 'dentist', 'doctor', 'florist',
      'laundry', 'hairdresser', 'gas_station', 'convenience_store', 'grocery_store', 'ice_cream_shop', 'fitness_center',
      'courthouse', 'embassy', 'fire_station', 'fishmonger', 'golf_course', 'hiking_area', 'lake'];
    expect(types).toHaveLength(32);
    const results = await nearby(database, types);
    expect(results.church.map(poi => poi.poi_id)).toEqual(['fsq:jeronimos']);
    expect(results.historical_landmark.map(poi => poi.poi_id)).toEqual(['fsq:jeronimos']);
    expect(results.museum).toEqual([]);
  });
});
