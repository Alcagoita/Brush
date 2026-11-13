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
import { findVenue, insideRings, listVenues } from '../venueInventory';
import { d1Binding, schemaDb } from './d1TestDb';

/**
 * KAN-382 — a shopping centre's inventory: every valid place the registry
 * serves inside the centre's strict outline, in stable pages.
 *
 * Real SQLite over the project's schema. Reference centre: Alma Shopping,
 * whose outline is in extraction/mall_lists/footprints.json.
 */
const ROOT = join(__dirname, '..', '..');
const CTX = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;
const ALMA = findVenue('alma-shopping')!;
const [IN_LAT, IN_LNG] = ALMA.centroid;
const OUT = [IN_LAT + 0.01, IN_LNG] as const;

interface Unit { key: string; poi_id: string; source: string; name: string; floor: string | null; types: string[]; primary_poi_type: string }
interface Page { venue: { id: string; name: string }; version: string; total: number; units: Unit[]; nextCursor: string | null }

function db(): DatabaseSync {
  const database = schemaDb();
  for (const file of ['poi_type_schema.sql', 'poi_attribute_schema.sql', 'type_relation_schema.sql']) {
    database.exec(readFileSync(join(ROOT, file), 'utf8'));
  }
  return database;
}

function curated(database: DatabaseSync, poiId: string, name: string, at: readonly [number, number], options: {
  type?: string; floor?: string | null; status?: string; extraTypes?: string[];
} = {}) {
  database.prepare(
    `INSERT INTO curated_poi (poi_id, source, name, dedupe_name, lat, lng, geohash, primary_poi_type, floor, status,
                              created_at, created_by, updated_at, updated_by, origin_source, origin_id, origin_licence, imported_at, import_run_id)
     VALUES (?, 'community', ?, ?, ?, ?, ?, ?, ?, ?, 't', 'kan-382', 't', 'kan-382', 'operator_list', ?, 'n/a', 't', 'test')`,
  ).run(poiId, name, name.toLowerCase(), at[0], at[1], encodeGeohash(at[0], at[1], 7),
    options.type ?? 'store', options.floor ?? null, options.status ?? 'active', poiId);
  for (const type of options.extraTypes ?? []) {
    database.prepare("INSERT INTO curated_poi_attribute (poi_id, dimension, value) VALUES (?, 'poi_type', ?)").run(poiId, type);
  }
}

function overture(database: DatabaseSync, id: string, name: string, at: readonly [number, number], options: {
  type?: string; floor?: string | null; retired?: boolean; hidden?: boolean;
} = {}) {
  const type = options.type ?? 'store';
  database.prepare(
    `INSERT INTO overture_poi (overture_id, name, dedupe_name, lat, lng, geohash, primary_poi_type, floor, retired_in_release, imported_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 't', 't')`,
  ).run(id, name, name.toLowerCase(), at[0], at[1], encodeGeohash(at[0], at[1], 7), type,
    options.floor ?? null, options.retired ? '2026-01-01.0' : null);
  database.prepare('INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES (?, ?, 0)').run(id, type);
  if (options.hidden) {
    database.prepare(
      "INSERT INTO poi_source_correction (source, source_id, visible, review_note) VALUES ('overture', ?, 0, 'test')",
    ).run(id);
  }
}

function atm(database: DatabaseSync, id: string, name: string, at: readonly [number, number]) {
  database.prepare(
    `INSERT INTO multibanco_poi (source_id, name, dedupe_name, lat, lng, geohash, primary_poi_type, address, source_url,
                                 raw_payload_json, fetched_at, imported_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'atm', 'Rua', 'https://x', '{}', 't', 't', 't')`,
  ).run(id, name, name.toLowerCase(), at[0], at[1], encodeGeohash(at[0], at[1], 7));
}

async function get(database: DatabaseSync, path: string): Promise<Response> {
  const env = { API_KEY: 'test-key', TURNSTILE_SECRET: 'test-secret', REGISTRY_DB: d1Binding(database) } as unknown as Env;
  return worker.fetch(new Request(`https://poi-api.test${path}`, { headers: { 'X-Api-Key': 'test-key' } }), env, CTX);
}

async function page(database: DatabaseSync, query = ''): Promise<Page> {
  const response = await get(database, `/venues/alma-shopping/units${query}`);
  expect(response.status).toBe(200);
  return response.json() as Promise<Page>;
}

async function allPages(database: DatabaseSync, limit: number): Promise<{ units: Unit[]; versions: Set<string>; pages: number }> {
  const units: Unit[] = [];
  const versions = new Set<string>();
  let cursor: string | null = null;
  let pages = 0;
  do {
    const current: Page = await page(database, `?limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    units.push(...current.units);
    versions.add(current.version);
    cursor = current.nextCursor;
    pages++;
  } while (cursor && pages < 100);
  return { units, versions, pages };
}

describe('venue list', () => {
  it('lists every centre with an outline, including Vasco da Gama and Strada', async () => {
    const ids = listVenues().map(venue => venue.id);
    expect(ids).toEqual([...ids].sort());
    expect(ids).toEqual(expect.arrayContaining(['alma-shopping', 'norteshopping', 'ubbo', 'centro-comercial-vasco-da-gama', 'strada-outlet']));
    const response = await get(db(), '/venues');
    expect(response.status).toBe(200);
    const body = await response.json() as { venues: Array<{ id: string; name: string; centroid: number[]; rings: number[][][] }> };
    expect(body.venues.find(venue => venue.id === 'alma-shopping')).toMatchObject({ name: 'Alma Shopping', centroid: ALMA.centroid });
    expect(body.venues.every(venue => venue.rings[0].length >= 4)).toBe(true);
  });

  it('places the centroid inside the outline and a point 1 km north outside', () => {
    expect(insideRings(IN_LAT, IN_LNG, ALMA.rings)).toBe(true);
    expect(insideRings(OUT[0], OUT[1], ALMA.rings)).toBe(false);
  });
});

describe('venue units', () => {
  it('serves every valid place inside the outline, with its floor, and nothing outside it', async () => {
    const database = db();
    curated(database, 'mall:alma_shopping:zara', 'Zara', [IN_LAT, IN_LNG], { floor: '1' });
    curated(database, 'mall:alma_shopping:old', 'Closed Shop', [IN_LAT, IN_LNG], { status: 'removed' });
    curated(database, 'community:street', 'Street Shop', OUT);
    overture(database, 'ov-inside', 'Pharmacy Alma', [IN_LAT, IN_LNG], { type: 'pharmacy', floor: '0' });
    overture(database, 'ov-retired', 'Gone', [IN_LAT, IN_LNG], { retired: true });
    overture(database, 'ov-hidden', 'Hidden', [IN_LAT, IN_LNG], { hidden: true });
    overture(database, 'ov-outside', 'Outside', OUT);
    atm(database, 'mb-1', 'Multibanco Alma', [IN_LAT, IN_LNG]);

    const body = await page(database);

    expect(body.venue).toEqual({ id: 'alma-shopping', name: 'Alma Shopping' });
    expect(body.units.map(unit => unit.key)).toEqual([
      'community:mall:alma_shopping:zara', 'multibanco:mb-1', 'overture:ov-inside',
    ]);
    expect(body.units.find(unit => unit.poi_id === 'mall:alma_shopping:zara')?.floor).toBe('1');
    expect(body.units.find(unit => unit.poi_id === 'ov-inside')?.floor).toBe('0');
    expect(body.units.find(unit => unit.poi_id === 'mb-1')?.floor).toBeNull();
    expect(body.total).toBe(3);
    expect(body.nextCursor).toBeNull();
  });

  it('shows one shop held twice once, the curated row winning, as /poi/nearby does', async () => {
    const database = db();
    curated(database, 'mall:alma_shopping:fnac', 'FNAC', [IN_LAT, IN_LNG], { floor: '2' });
    overture(database, 'ov-fnac', 'FNAC', [IN_LAT + 0.00005, IN_LNG]);

    const body = await page(database);

    expect(body.units.map(unit => unit.key)).toEqual(['community:mall:alma_shopping:fnac']);
  });

  it('carries every type a unit answers, primary first', async () => {
    const database = db();
    curated(database, 'mall:alma_shopping:pans', 'Café Pans', [IN_LAT, IN_LNG], { type: 'bakery', extraTypes: ['cafe'] });

    const [unit] = (await page(database)).units;

    expect(unit.primary_poi_type).toBe('bakery');
    expect(unit.types).toEqual(['bakery', 'cafe']);
  });

  it('pages a centre of more than 50 units completely, once each, under one stable version', async () => {
    const database = db();
    for (let i = 0; i < 230; i++) {
      curated(database, `mall:alma_shopping:shop-${String(i).padStart(3, '0')}`, `Shop ${i}`, [IN_LAT, IN_LNG], { floor: String(i % 4) });
    }

    const { units, versions, pages } = await allPages(database, 50);

    expect(pages).toBe(5);
    expect(units).toHaveLength(230);
    expect(new Set(units.map(unit => unit.key)).size).toBe(230);
    expect(units.map(unit => unit.key)).toEqual([...units.map(unit => unit.key)].sort());
    expect(versions.size).toBe(1);
  });

  it('changes the version when the centre changes, and keeps it when nothing does', async () => {
    const database = db();
    curated(database, 'mall:alma_shopping:zara', 'Zara', [IN_LAT, IN_LNG], { floor: '1' });
    const first = await page(database);
    expect((await page(database)).version).toBe(first.version);

    database.prepare("UPDATE curated_poi SET floor = '2' WHERE poi_id = 'mall:alma_shopping:zara'").run();

    expect((await page(database)).version).not.toBe(first.version);
  });

  it('rejects an unknown centre and a bad limit or cursor', async () => {
    const database = db();
    expect((await get(database, '/venues/nowhere/units')).status).toBe(404);
    expect((await get(database, '/venues/alma-shopping/units?limit=0')).status).toBe(400);
    expect((await get(database, '/venues/alma-shopping/units?limit=201')).status).toBe(400);
    expect((await get(database, '/venues/alma-shopping/units?cursor=')).status).toBe(400);
  });

  it('needs the same authentication as /poi/nearby', async () => {
    const env = { API_KEY: 'test-key', TURNSTILE_SECRET: 'test-secret', REGISTRY_DB: d1Binding(db()) } as unknown as Env;
    for (const path of ['/venues', '/venues/alma-shopping/units']) {
      const response = await worker.fetch(new Request(`https://poi-api.test${path}`), env, CTX);
      expect(response.status).toBe(401);
    }
  });
});
