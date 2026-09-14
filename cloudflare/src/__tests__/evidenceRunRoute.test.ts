import { describe, expect, it, vi } from 'vitest';

import { d1Binding, schemaDb } from './d1TestDb';

vi.mock('@cloudflare/containers', () => ({
  getContainer: () => ({ start: vi.fn() }),
  Container: class {},
}));

import worker, { type Env } from '../index';

const CTX = { waitUntil(_promise: Promise<unknown>) {}, passThroughOnException() {} } as unknown as ExecutionContext;
const SHA = 'a'.repeat(64);

function envFor() {
  const db = schemaDb();
  return { db, env: { BUILD_TRIGGER_SECRET: 'secret', REGISTRY_DB: d1Binding(db) } as unknown as Env };
}

const post = (body: unknown, secret = 'secret') => new Request('https://poi-api.test/internal/overture-country/evidence-run', {
  method: 'POST', headers: { 'X-Build-Secret': secret, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

const valid = {
  countryCode: 'PT', runId: '20260914T000000Z', manifestSha256: SHA, configSha256: SHA, toolCommit: 'abc1234',
  residualRows: 100, verifiedRows: 7, excludedRows: 3, insufficientRows: 90, foursquareRows: 4, osmRows: 6,
};

describe('KAN-446 /internal/overture-country/evidence-run', () => {
  it('records a reviewed run once and refuses the same run again', async () => {
    const { db, env } = envFor();
    expect((await worker.fetch(post(valid), env, CTX)).status).toBe(201);
    expect((await worker.fetch(post(valid), env, CTX)).status).toBe(409);
    const rows = db.prepare('SELECT country_code, run_id, residual_rows, osm_rows FROM overture_evidence_run').all();
    expect(rows).toEqual([{ country_code: 'PT', run_id: valid.runId, residual_rows: 100, osm_rows: 6 }]);
  });

  it('treats a different manifest for the same run id as a new row, never an overwrite', async () => {
    const { db, env } = envFor();
    expect((await worker.fetch(post(valid), env, CTX)).status).toBe(201);
    expect((await worker.fetch(post({ ...valid, manifestSha256: 'b'.repeat(64) }), env, CTX)).status).toBe(201);
    expect(db.prepare('SELECT COUNT(*) AS n FROM overture_evidence_run').get()).toEqual({ n: 2 });
  });

  it('refuses counts that do not add up', async () => {
    const { env } = envFor();
    expect((await worker.fetch(post({ ...valid, insufficientRows: 89 }), env, CTX)).status).toBe(400);
    expect((await worker.fetch(post({ ...valid, osmRows: 7 }), env, CTX)).status).toBe(400);
  });

  it('refuses anything that is not counts and provenance', async () => {
    const { env } = envFor();
    expect((await worker.fetch(post({ ...valid, decisions: [] }), env, CTX)).status).toBe(400);
    expect((await worker.fetch(post({ ...valid, manifestSha256: 'short' }), env, CTX)).status).toBe(400);
    expect((await worker.fetch(post({ ...valid, countryCode: 'pt' }), env, CTX)).status).toBe(400);
    expect((await worker.fetch(post({ ...valid, residualRows: -1 }), env, CTX)).status).toBe(400);
  });

  it('is never reachable without the internal secret', async () => {
    const { env } = envFor();
    expect((await worker.fetch(post(valid, 'wrong'), env, CTX)).status).toBe(401);
  });
});
