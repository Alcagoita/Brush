import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@cloudflare/containers', () => ({
  getContainer: () => ({ start: vi.fn() }),
  Container: class {},
}));

import worker, { type Env } from '../index';
import { encodeGeohash } from '../geohash';
import { d1Binding, schemaDb } from './d1TestDb';

/**
 * KAN-452 — moderation knows Overture exists. End to end through the real
 * handlers against real SQLite carrying the project's schema files, so the
 * correction join, the CHECK constraints and the nearby read are the ones
 * production runs, not a fake's reading of them.
 *
 * Reference point: Odivelas Parque.
 */
const ROOT = join(__dirname, '..', '..');
const LAT = 38.78247076856684;
const LNG = -9.192561695448394;
const CTX = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;

function db(): DatabaseSync {
  const database = schemaDb();
  for (const file of ['poi_type_schema.sql', 'poi_attribute_schema.sql', 'type_relation_schema.sql']) {
    database.exec(readFileSync(join(ROOT, file), 'utf8'));
  }
  return database;
}

function insertOverture(database: DatabaseSync, id: string, name: string, dedupe: string, type = 'store') {
  database.prepare(
    `INSERT INTO overture_poi (overture_id, name, dedupe_name, lat, lng, geohash, primary_poi_type, address, imported_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Odivelas Parque', 't', 't')`,
  ).run(id, name, dedupe, LAT, LNG, encodeGeohash(LAT, LNG, 7), type);
  database.prepare('INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES (?, ?, 0)').run(id, type);
}

function env(database: DatabaseSync): Env {
  return { API_KEY: 'test-key', TURNSTILE_SECRET: 'test-secret', REGISTRY_DB: d1Binding(database) } as unknown as Env;
}

async function nearbyNames(database: DatabaseSync, type = 'store'): Promise<string[]> {
  const response = await worker.fetch(new Request('https://poi-api.test/poi/nearby', {
    method: 'POST',
    headers: { 'X-Api-Key': 'test-key', 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: LAT, lng: LNG, radius: 200, limitPerRequest: 20, requests: [{ key: type, type }] }),
  }), env(database), CTX);
  expect(response.status).toBe(200);
  const body = await response.json() as { results: Record<string, Array<{ name: string }>> };
  return Object.values(body.results).flat().map(poi => poi.name);
}

const publicUrl = (path: string, params: Record<string, string | number>) =>
  `https://poi-api.brushaway.app${path}?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}`;

describe('GET /manual-poi/duplicates', () => {
  it('returns the Overture match for a name and point Overture already holds', async () => {
    const database = db();
    insertOverture(database, 'ovt-1', 'Continente Odivelas', 'continente odivelas');

    const response = await worker.fetch(new Request(publicUrl('/manual-poi/duplicates', { name: 'Continente Odivelas', lat: LAT, lng: LNG })), env(database), CTX);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ duplicate: { name: 'Continente Odivelas', source: 'overture' } });
  });

  it('does not report a hidden Overture row as a duplicate', async () => {
    const database = db();
    insertOverture(database, 'ovt-1', 'Continente Odivelas', 'continente odivelas');
    database.prepare("INSERT INTO poi_source_correction (source, source_id, visible, review_note) VALUES ('overture', 'ovt-1', 0, 'closed')").run();

    const response = await worker.fetch(new Request(publicUrl('/manual-poi/duplicates', { name: 'Continente Odivelas', lat: LAT, lng: LNG })), env(database), CTX);
    await expect(response.json()).resolves.toEqual({ duplicate: null });
  });
});

describe('GET /manual-poi/search', () => {
  it('finds Overture rows', async () => {
    const database = db();
    insertOverture(database, 'ovt-1', 'Continente Odivelas', 'continente odivelas');

    const response = await worker.fetch(new Request(publicUrl('/manual-poi/search', { name: 'Continente', lat: LAT, lng: LNG })), env(database), CTX);

    await expect(response.json()).resolves.toEqual({ matches: [{
      source: 'overture', id: 'ovt-1', name: 'Continente Odivelas', poiType: 'store', address: 'Odivelas Parque', distanceMeters: 0,
    }] });
  });
});

describe('an Overture removal and /poi/nearby', () => {
  it('a visible = 0 correction for the row takes it out of nearby, leaving the base row in place', async () => {
    const database = db();
    insertOverture(database, 'ovt-1', 'Continente Odivelas', 'continente odivelas');
    insertOverture(database, 'ovt-2', 'Pingo Doce Odivelas', 'pingo doce odivelas');
    expect(await nearbyNames(database)).toEqual(expect.arrayContaining(['Continente Odivelas', 'Pingo Doce Odivelas']));

    // What the approve route writes for target_source = 'overture'.
    database.prepare(
      `INSERT INTO poi_source_correction (source, source_id, visible, review_note, created_at)
       VALUES ('overture', 'ovt-1', 0, 'KAN-428 removal r-1: closed', 't')`,
    ).run();

    expect(await nearbyNames(database)).toEqual(['Pingo Doce Odivelas']);
    expect(database.prepare('SELECT count(*) AS n FROM overture_poi').get()).toEqual({ n: 2 });
  });
});

describe('POST /manual-poi/removals against an Overture row, on the production schema', () => {
  afterEach(() => vi.unstubAllGlobals());

  // Found while doing KAN-452: poi_removal_submission.target_source has
  // CHECK (target_source IN ('foursquare', 'openstreetmap', 'community')),
  // as production does (verified against sqlite_master 2026-09-18), so a
  // report against an Overture row cannot be stored until that CHECK is
  // widened — a table rebuild, which is the owner's call. Until then the
  // Worker refuses the report before spending a Turnstile token on it
  // (OVERTURE_REMOVAL_REPORTS_ENABLED). This is the test to flip to 202 when
  // the CHECK is widened; schema.sql keeps production's CHECK on purpose.
  it('is refused up front with a CORS-bearing 409, and nothing is stored', async () => {
    const database = db();
    insertOverture(database, 'ovt-1', 'Continente Odivelas', 'continente odivelas');
    const siteverify = vi.fn();
    vi.stubGlobal('fetch', siteverify);

    const response = await worker.fetch(new Request('https://poi-api.brushaway.app/manual-poi/removals', {
      method: 'POST',
      headers: { Origin: 'https://brushaway.app', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetSource: 'overture', targetId: 'ovt-1', reason: 'closed',
        idempotencyKey: '4b28143c-7ea0-4c03-9152-c083fa522d8e', turnstileToken: 'fresh-token',
      }),
    }), env(database), CTX);

    expect(response.status).toBe(409);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://brushaway.app');
    expect(siteverify).not.toHaveBeenCalled();
    expect(database.prepare('SELECT count(*) AS n FROM poi_removal_submission').get()).toEqual({ n: 0 });
  });

  it('the production CHECK is what still stands in the way of storing one', () => {
    const database = db();
    expect(() => database.prepare(
      `INSERT INTO poi_removal_submission (submission_id, idempotency_key, target_source, target_id, target_name, target_poi_type, reason, ip_hash, status, submitted_at)
       VALUES ('s', 'k', 'overture', 'ovt-1', 'x', 'store', 'closed', 'h', 'pending', 't')`,
    ).run()).toThrow(/CHECK constraint failed/);
  });
});
