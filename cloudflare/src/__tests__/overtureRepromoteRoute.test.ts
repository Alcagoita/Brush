import type { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { d1Binding, schemaDb } from './d1TestDb';

const { mockStart } = vi.hoisted(() => ({ mockStart: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@cloudflare/containers', () => ({ getContainer: () => ({ start: mockStart }), Container: class {} }));

import worker, { type Env } from '../index';

function envFor(db: DatabaseSync): Env {
  return { BUILD_TRIGGER_SECRET: 'secret', REGISTRY_DB: d1Binding(db), EXTRACTION_CONTAINER: {} } as unknown as Env;
}

const CTX = { waitUntil(_promise: Promise<unknown>) {}, passThroughOnException() {} } as unknown as ExecutionContext;
const RAW_KEY = 'overture-country-sources/PT/1ea48e22.csv';
const post = (path: string, body: unknown, secret = 'secret') => new Request(`https://poi-api.test${path}`, {
  method: 'POST', headers: { 'X-Build-Secret': secret, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

function mappedImport(db: DatabaseSync, rawKey = RAW_KEY) {
  db.prepare(`INSERT INTO overture_country_import
    (country_code, status, active_run_id, raw_extract_r2_key, started_at, completed_at,
     source_rows, staged_rows, dropped_rows, promoted_rows, rejected_rows, pending_rows)
    VALUES ('PT', 'mapped', 'completed', ?, 1, 2, 100, 100, 0, 60, 10, 30)`).run(rawKey);
}

const complete = {
  countryCode: 'PT', runId: 'run-1', rawExtractR2Key: RAW_KEY,
  repromotedRows: 5, rerejectedRows: 1, leftPendingRows: 24,
  promotedRows: 65, rejectedRows: 11, pendingRows: 24,
};

beforeEach(() => mockStart.mockClear());

describe('KAN-455 /internal/overture-repromote', () => {
  it('starts one repromote container over the mapped immutable source', async () => {
    const db = schemaDb();
    mappedImport(db);
    const response = await worker.fetch(post('/internal/overture-repromote', { countryCode: 'PT' }), envFor(db), CTX);
    expect(response.status).toBe(200);
    const body = await response.json<{ ok: boolean; started: boolean; runId: string; rawExtractR2Key: string }>();
    expect(body).toMatchObject({ ok: true, started: true, rawExtractR2Key: RAW_KEY });
    const envVars = (mockStart.mock.calls.at(-1)?.[0] as { envVars: Record<string, string> }).envVars;
    expect(envVars).toMatchObject({
      MODE: 'overture-repromote', TARGET: 'PT', D1_INTERNAL: '1',
      COUNTRY_SOURCE_R2_KEY: RAW_KEY, OVERTURE_REPROMOTE_RUN_ID: body.runId,
    });
  });

  it('refuses to run before the country is mapped from an immutable source', async () => {
    const db = schemaDb();
    const env = envFor(db);
    expect((await worker.fetch(post('/internal/overture-repromote', { countryCode: 'PT' }), env, CTX)).status).toBe(409);
    db.prepare(`INSERT INTO overture_country_import (country_code, status, active_run_id, raw_extract_r2_key, started_at)
      VALUES ('PT', 'mapping', 'active', ?, 1)`).run(RAW_KEY);
    expect((await worker.fetch(post('/internal/overture-repromote', { countryCode: 'PT' }), env, CTX)).status).toBe(409);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('accepts only PT', async () => {
    const db = schemaDb();
    mappedImport(db);
    expect((await worker.fetch(post('/internal/overture-repromote', { countryCode: 'ES' }), envFor(db), CTX)).status).toBe(400);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('is never reachable without the internal secret', async () => {
    const db = schemaDb();
    mappedImport(db);
    const env = envFor(db);
    expect((await worker.fetch(post('/internal/overture-repromote', { countryCode: 'PT' }, 'wrong'), env, CTX)).status).toBe(401);
    expect((await worker.fetch(post('/internal/overture-repromote/complete', complete, 'wrong'), env, CTX)).status).toBe(401);
    expect(mockStart).not.toHaveBeenCalled();
  });
});

describe('KAN-455 /internal/overture-repromote/complete', () => {
  it('brings the mapped source counts up to date and keeps everything else', async () => {
    const db = schemaDb();
    mappedImport(db);
    const response = await worker.fetch(post('/internal/overture-repromote/complete', complete), envFor(db), CTX);
    expect(response.status).toBe(200);
    expect(db.prepare('SELECT status, raw_extract_r2_key, staged_rows, promoted_rows, rejected_rows, pending_rows FROM overture_country_import').get())
      .toEqual({ status: 'mapped', raw_extract_r2_key: RAW_KEY, staged_rows: 100, promoted_rows: 65, rejected_rows: 11, pending_rows: 24 });
  });

  it('refuses totals that no longer account for every staged row', async () => {
    const db = schemaDb();
    mappedImport(db);
    const response = await worker.fetch(post('/internal/overture-repromote/complete', { ...complete, pendingRows: 25 }), envFor(db), CTX);
    expect(response.status).toBe(409);
    expect(db.prepare('SELECT promoted_rows, pending_rows FROM overture_country_import').get()).toEqual({ promoted_rows: 60, pending_rows: 30 });
  });

  it('refuses a source that is not the mapped one', async () => {
    const db = schemaDb();
    mappedImport(db, 'overture-country-sources/PT/other.csv');
    expect((await worker.fetch(post('/internal/overture-repromote/complete', complete), envFor(db), CTX)).status).toBe(409);
  });

  it('refuses a malformed payload', async () => {
    const db = schemaDb();
    mappedImport(db);
    const env = envFor(db);
    expect((await worker.fetch(post('/internal/overture-repromote/complete', { ...complete, promotedRows: -1 }), env, CTX)).status).toBe(400);
    expect((await worker.fetch(post('/internal/overture-repromote/complete', { ...complete, rawExtractR2Key: 'elsewhere/x.csv' }), env, CTX)).status).toBe(400);
    expect((await worker.fetch(post('/internal/overture-repromote/complete', { ...complete, runId: 'not ok!' }), env, CTX)).status).toBe(400);
  });
});
