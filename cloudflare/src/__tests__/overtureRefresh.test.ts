import type { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { d1Binding, schemaDb } from './d1TestDb';
import { encodeGeohash } from '../geohash';

const { mockStart } = vi.hoisted(() => ({ mockStart: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@cloudflare/containers', () => ({ getContainer: () => ({ start: mockStart }), Container: class {} }));

import worker, { SUPPORTED_OVERTURE_COUNTRIES, overtureCountry, type Env } from '../index';

/**
 * KAN-456 — an Overture refresh. Re-queuing a mapped country keeps the
 * archive it replaces and hands the container the release; the completion
 * records what the release did; nearby never serves a retired row; every
 * Overture route takes the country from the request, never a literal.
 */
const CTX = { waitUntil(_promise: Promise<unknown>) {}, passThroughOnException() {} } as unknown as ExecutionContext;
const OLD_KEY = 'overture-country-sources/PT/old.csv';

function envFor(db: DatabaseSync): Env {
  return { API_KEY: 'test-key', BUILD_TRIGGER_SECRET: 'secret', REGISTRY_DB: d1Binding(db), EXTRACTION_CONTAINER: {} } as unknown as Env;
}
const post = (path: string, body: unknown) => new Request(`https://poi-api.test${path}`, {
  method: 'POST', headers: { 'X-Build-Secret': 'secret', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const lastEnvVars = () => (mockStart.mock.calls.at(-1)?.[0] as { envVars: Record<string, string> }).envVars;

function mapped(db: DatabaseSync, rawKey = OLD_KEY) {
  db.prepare(`INSERT INTO overture_country_import
    (country_code, status, active_run_id, raw_extract_r2_key, started_at, completed_at,
     source_rows, staged_rows, dropped_rows, promoted_rows, rejected_rows, pending_rows, release)
    VALUES ('PT', 'mapped', 'done', ?, 1, 2, 100, 100, 0, 60, 10, 30, '2026-08-19.0')`).run(rawKey);
}

beforeEach(() => mockStart.mockClear());

describe('the country allowlist', () => {
  it('accepts a supported code case-insensitively and nothing else', () => {
    expect(SUPPORTED_OVERTURE_COUNTRIES).toContain('PT');
    expect(overtureCountry('pt')).toBe('PT');
    expect(overtureCountry('ES')).toBeNull();
    expect(overtureCountry(undefined)).toBeNull();
  });

  it('refuses an unsupported country on every Overture route with a 400, not a silent PT', async () => {
    const env = envFor(schemaDb());
    for (const path of ['/internal/overture-country/queue', '/internal/overture-country/overrides', '/internal/overture-repromote']) {
      const response = await worker.fetch(post(path, { countryCode: 'ES', batch: 'x', rawExtractR2Key: 'overture-country-sources/ES/x.csv' }), env, CTX);
      expect(response.status, path).toBe(400);
    }
    expect(mockStart).not.toHaveBeenCalled();
  });
});

describe('re-queuing a mapped country', () => {
  it('is a refresh: the mapped archive becomes the previous key and the container gets it with the release', async () => {
    const db = schemaDb();
    mapped(db);
    const response = await worker.fetch(post('/internal/overture-country/queue', { countryCode: 'pt', release: '2026-10-15.0' }), envFor(db), CTX);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, started: true, refresh: true, previousSourceR2Key: OLD_KEY, release: '2026-10-15.0' });
    expect(lastEnvVars()).toMatchObject({
      MODE: 'overture-country', TARGET: 'PT', D1_INTERNAL: '1',
      OVERTURE_PREVIOUS_SOURCE_KEY: OLD_KEY, OVERTURE_RELEASE: '2026-10-15.0',
    });
    expect(lastEnvVars().COUNTRY_SOURCE_R2_KEY).toBeUndefined();
    expect(db.prepare('SELECT status, previous_source_r2_key, raw_extract_r2_key, release FROM overture_country_import').get())
      .toEqual({ status: 'mapping', previous_source_r2_key: OLD_KEY, raw_extract_r2_key: null, release: '2026-10-15.0' });
  });

  it('a first import has no previous key and no refresh env', async () => {
    const db = schemaDb();
    const response = await worker.fetch(post('/internal/overture-country/queue', { countryCode: 'PT' }), envFor(db), CTX);
    expect(await response.json()).toMatchObject({ started: true, refresh: false, previousSourceR2Key: null, release: null });
    expect(lastEnvVars().OVERTURE_PREVIOUS_SOURCE_KEY).toBeUndefined();
    expect(lastEnvVars().OVERTURE_RELEASE).toBeUndefined();
  });

  it('a retry after a failed refresh keeps both the new archive and the previous key', async () => {
    const db = schemaDb();
    mapped(db);
    const env = envFor(db);
    await worker.fetch(post('/internal/overture-country/queue', { countryCode: 'PT', release: '2026-10-15.0' }), env, CTX);
    const runId = lastEnvVars().OVERTURE_COUNTRY_RUN_ID;
    const newKey = `overture-country-sources/PT/${runId}.csv`;
    await worker.fetch(post('/internal/overture-country/source', { countryCode: 'PT', runId, rawExtractR2Key: newKey, sourceRows: 5 }), env, CTX);
    await worker.fetch(post('/internal/overture-country/failed', { countryCode: 'PT', runId, error: 'd1' }), env, CTX);
    await worker.fetch(post('/internal/overture-country/queue', { countryCode: 'PT' }), env, CTX);
    expect(lastEnvVars()).toMatchObject({ COUNTRY_SOURCE_R2_KEY: newKey, OVERTURE_PREVIOUS_SOURCE_KEY: OLD_KEY, OVERTURE_RELEASE: '2026-10-15.0' });
  });

  it('refuses a malformed release', async () => {
    const response = await worker.fetch(post('/internal/overture-country/queue', { countryCode: 'PT', release: 'latest' }), envFor(schemaDb()), CTX);
    expect(response.status).toBe(400);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('records the refresh report on completion', async () => {
    const db = schemaDb();
    mapped(db);
    const env = envFor(db);
    await worker.fetch(post('/internal/overture-country/queue', { countryCode: 'PT', release: '2026-10-15.0' }), env, CTX);
    const runId = lastEnvVars().OVERTURE_COUNTRY_RUN_ID;
    const newKey = `overture-country-sources/PT/${runId}.csv`;
    await worker.fetch(post('/internal/overture-country/source', { countryCode: 'PT', runId, rawExtractR2Key: newKey, sourceRows: 105 }), env, CTX);
    const done = await worker.fetch(post('/internal/overture-country/complete', {
      countryCode: 'PT', runId, backlogReportR2Key: `overture-country-reports/PT/${runId}.tsv`,
      sourceRows: 105, stagedRows: 105, droppedRows: 0, promotedRows: 64, rejectedRows: 11, pendingRows: 30,
      release: '2026-10-15.0', newRows: 7, changedRows: 12, retiredRows: 2,
    }), env, CTX);
    expect(done.status).toBe(200);
    expect(db.prepare('SELECT status, release, new_rows, changed_rows, retired_rows, previous_source_r2_key, raw_extract_r2_key FROM overture_country_import').get())
      .toEqual({ status: 'mapped', release: '2026-10-15.0', new_rows: 7, changed_rows: 12, retired_rows: 2, previous_source_r2_key: OLD_KEY, raw_extract_r2_key: newKey });
  });
});

describe('a retired Overture row', () => {
  const LAT = 38.7; const LNG = -9.2;

  function served(db: DatabaseSync, overtureId: string, name: string, retiredIn: string | null) {
    db.prepare(`INSERT INTO overture_poi (overture_id, name, dedupe_name, lat, lng, geohash, primary_poi_type, imported_at, updated_at, retired_in_release)
                VALUES (?, ?, ?, ?, ?, ?, 'pharmacy', 'd', 'd', ?)`).run(overtureId, name, name.toLowerCase(), LAT, LNG, encodeGeohash(LAT, LNG, 7), retiredIn);
    db.prepare("INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES (?, 'pharmacy', 0)").run(overtureId);
  }

  it('is not served by nearby; a row with the mark cleared is', async () => {
    const db = schemaDb();
    for (const file of ['poi_type_schema.sql', 'poi_attribute_schema.sql', 'type_relation_schema.sql']) {
      db.exec(readFileSync(join(__dirname, '..', '..', file), 'utf8'));
    }
    served(db, 'gone', 'Farmácia Fechada', '2026-10-15.0');
    served(db, 'open', 'Farmácia Aberta', null);
    const response = await worker.fetch(new Request('https://poi-api.test/poi/nearby', {
      method: 'POST', headers: { 'X-Api-Key': 'test-key', 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: LAT, lng: LNG, radius: 200, limitPerRequest: 20, requests: [{ key: 'pharmacy', type: 'pharmacy' }] }),
    }), envFor(db), CTX);
    expect(response.status).toBe(200);
    const body = await response.json() as { results: Record<string, Array<{ poi_id: string }>> };
    expect(body.results.pharmacy.map(poi => poi.poi_id)).toEqual(['open']);
  });
});
