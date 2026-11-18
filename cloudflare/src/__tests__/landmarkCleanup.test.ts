import type { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { d1Binding, schemaDb } from './d1TestDb';

const { mockStart } = vi.hoisted(() => ({ mockStart: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@cloudflare/containers', () => ({
  getContainer: () => ({ start: mockStart }),
  Container: class {},
}));

import worker, { type Env } from '../index';

function testDb() {
  const db = schemaDb();
  db.prepare('INSERT INTO country (country_code, name, status) VALUES (?, ?, ?)').run('PT', 'Portugal', 'mapped');
  const place = db.prepare(
    `INSERT INTO place (place_id, country_code, name, place_kind, status, request_count, min_lat, max_lat, min_lng, max_lng)
     VALUES (?, 'PT', ?, ?, 'mapped', 0, 38.0, 38.1, -9.2, -9.1)`,
  );
  place.run('relation/2', 'Amadora', 'municipality');
  place.run('relation/1', 'Lisboa', 'municipality');
  place.run('relation/3', 'Grande Lisboa', 'county');
  place.run('relation/4', 'Unbounded', 'municipality');
  db.prepare("UPDATE place SET min_lat = NULL WHERE place_id = 'relation/4'").run();
  return db;
}

const envFor = (db: DatabaseSync) =>
  ({ BUILD_TRIGGER_SECRET: 'secret', REGISTRY_DB: d1Binding(db), EXTRACTION_CONTAINER: {} } as unknown as Env);
const CTX = { waitUntil(_p: Promise<unknown>) {}, passThroughOnException() {} } as unknown as ExecutionContext;
const post = (path: string, body: unknown, secret = 'secret') => new Request(`https://poi-api.test${path}`, {
  method: 'POST', headers: { 'X-Build-Secret': secret, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const get = (path: string) => new Request(`https://poi-api.test${path}`, { headers: { 'X-Build-Secret': 'secret' } });
const call = async (env: Env, request: Request) => {
  const response = await worker.fetch(request, env, CTX);
  return { status: response.status, body: await response.json<Record<string, any>>() };
};

async function finishDryRun(env: Env) {
  const start = await call(env, post('/internal/landmark-cleanup/start', { countryCode: 'PT', mode: 'dry_run' }));
  const runId = start.body.runId as string;
  const claim = await call(env, post('/internal/landmark-cleanup/claim', { runId, workerId: 'w1', batchSize: 10, jobVersion: 2 }));
  for (const scope of claim.body.scopes as Array<{ areaKey: string }>) {
    await call(env, post('/internal/landmark-cleanup/scope-result', {
      runId, workerId: 'w1', areaKey: scope.areaKey, status: 'completed',
      rows: 10, toRemove: scope.areaKey === 'relation/2' ? 0 : 2, removed: 0,
      heldReason: scope.areaKey === 'relation/3' ? 'would remove 9 of 10 (90%)' : null,
      reportR2Key: `reviews/x/${scope.areaKey}.md`,
    }));
  }
  const release = await call(env, post('/internal/landmark-cleanup/batch-release', { runId, workerId: 'w1' }));
  return { runId, claim, release };
}

beforeEach(() => mockStart.mockClear());

describe('KAN-461 landmark cleanup job', () => {
  it('needs the internal secret', async () => {
    const env = envFor(testDb());
    expect((await call(env, post('/internal/landmark-cleanup/start', { countryCode: 'PT', mode: 'dry_run' }, 'wrong'))).status).toBe(401);
  });

  it('seeds every bounded area in import order, Lisbon first and the rest of the country last', async () => {
    const env = envFor(testDb());
    const { runId, claim, release } = await finishDryRun(env);
    expect(mockStart).toHaveBeenCalledWith(expect.objectContaining({
      envVars: expect.objectContaining({ MODE: 'landmark-cleanup', LANDMARK_CLEANUP_RUN_ID: runId, D1_INTERNAL: '1' }),
    }));
    expect(claim.body.mode).toBe('dry_run');
    expect((claim.body.scopes as Array<{ name: string }>).map(s => s.name))
      .toEqual(['Lisboa', 'Amadora', 'Grande Lisboa', 'Resto de Portugal']);
    expect(release.body.finalized).toBe(true);
    const status = await call(env, get(`/internal/landmark-cleanup/status?runId=${runId}`));
    expect(status.body.status).toBe('done');
    expect(status.body.counts).toMatchObject({ total: 4, completed: 4, held: 1, toRemove: 4 });
  });

  it('a second batch cannot take a run another batch holds', async () => {
    const env = envFor(testDb());
    const start = await call(env, post('/internal/landmark-cleanup/start', { countryCode: 'PT', mode: 'dry_run' }));
    await call(env, post('/internal/landmark-cleanup/claim', { runId: start.body.runId, workerId: 'w1', batchSize: 1, jobVersion: 2 }));
    const other = await call(env, post('/internal/landmark-cleanup/claim', { runId: start.body.runId, workerId: 'w2', batchSize: 1, jobVersion: 2 }));
    expect(other.body.locked).toBe(false);
  });

  it('emit takes only the finished dry run\'s areas that were not held and have something to remove', async () => {
    const env = envFor(testDb());
    const early = await call(env, post('/internal/landmark-cleanup/start', { countryCode: 'PT', mode: 'emit', sourceRunId: 'nope' }));
    expect(early.status).toBe(409);
    const { runId } = await finishDryRun(env);
    const emit = await call(env, post('/internal/landmark-cleanup/start', { countryCode: 'PT', mode: 'emit', sourceRunId: runId }));
    expect(emit.status).toBe(200);
    const claim = await call(env, post('/internal/landmark-cleanup/claim', { runId: emit.body.runId, workerId: 'w9', batchSize: 10, jobVersion: 2 }));
    expect(claim.body).toMatchObject({ mode: 'emit', sourceRunId: runId, emitFilter: 'safe' });
    expect((claim.body.scopes as Array<{ name: string }>).map(s => s.name)).toEqual(['Lisboa', 'Resto de Portugal']);
  });

  it('emit takes an explicit filter and refuses an unknown one', async () => {
    const env = envFor(testDb());
    const { runId } = await finishDryRun(env);
    const bad = await call(env, post('/internal/landmark-cleanup/start', { countryCode: 'PT', mode: 'emit', sourceRunId: runId, emitFilter: 'everything' }));
    expect(bad.status).toBe(400);
    const all = await call(env, post('/internal/landmark-cleanup/start', { countryCode: 'PT', mode: 'emit', sourceRunId: runId, emitFilter: 'all' }));
    const claim = await call(env, post('/internal/landmark-cleanup/claim', { runId: all.body.runId, workerId: 'w9', batchSize: 10, jobVersion: 2 }));
    expect(claim.body.emitFilter).toBe('all');
  });

  it('a container older than the job version gets nothing and does not take the lock', async () => {
    const env = envFor(testDb());
    const start = await call(env, post('/internal/landmark-cleanup/start', { countryCode: 'PT', mode: 'dry_run' }));
    const runId = start.body.runId as string;
    for (const old of [{}, { jobVersion: 1 }]) {
      const claim = await call(env, post('/internal/landmark-cleanup/claim', { runId, workerId: 'old', batchSize: 10, ...old }));
      expect(claim.body).toMatchObject({ locked: false, scopes: [] });
      expect(claim.body.refused).toMatch(/older than 2/);
    }
    const status = await call(env, get(`/internal/landmark-cleanup/status?runId=${runId}`));
    expect(status.body.last_error).toMatch(/older than 2/);
    expect(status.body.counts.running).toBe(0);
    const current = await call(env, post('/internal/landmark-cleanup/claim', { runId, workerId: 'new', batchSize: 10, jobVersion: 2 }));
    expect(current.body.locked).toBe(true);
  });

  it('a pilot emit takes the first N areas, and the next emit takes only the rest', async () => {
    const env = envFor(testDb());
    const { runId } = await finishDryRun(env);
    const pilot = await call(env, post('/internal/landmark-cleanup/start', { countryCode: 'PT', mode: 'emit', sourceRunId: runId, areaLimit: 1 }));
    expect(pilot.body.counts.total).toBe(1);
    const claim = await call(env, post('/internal/landmark-cleanup/claim', { runId: pilot.body.runId, workerId: 'p', batchSize: 10, jobVersion: 2 }));
    const [area] = claim.body.scopes as Array<{ areaKey: string; name: string }>;
    expect(area.name).toBe('Lisboa');
    await call(env, post('/internal/landmark-cleanup/scope-result', {
      runId: pilot.body.runId, workerId: 'p', areaKey: area.areaKey, status: 'completed', rows: 10, toRemove: 2, removed: 2,
    }));
    await call(env, post('/internal/landmark-cleanup/batch-release', { runId: pilot.body.runId, workerId: 'p' }));
    const rest = await call(env, post('/internal/landmark-cleanup/start', { countryCode: 'PT', mode: 'emit', sourceRunId: runId }));
    const restClaim = await call(env, post('/internal/landmark-cleanup/claim', { runId: rest.body.runId, workerId: 'r', batchSize: 10, jobVersion: 2 }));
    expect((restClaim.body.scopes as Array<{ name: string }>).map(s => s.name)).toEqual(['Resto de Portugal']);
    expect((await call(env, post('/internal/landmark-cleanup/start', { countryCode: 'PT', mode: 'emit', sourceRunId: runId, areaLimit: 0 }))).status).toBe(400);
  });

  it('a failed area goes back to pending, then to failed after three tries', async () => {
    const env = envFor(testDb());
    const start = await call(env, post('/internal/landmark-cleanup/start', { countryCode: 'PT', mode: 'dry_run' }));
    const runId = start.body.runId as string;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const claim = await call(env, post('/internal/landmark-cleanup/claim', { runId, workerId: `w${attempt}`, batchSize: 1, jobVersion: 2 }));
      const [scope] = claim.body.scopes as Array<{ areaKey: string }>;
      expect(scope.areaKey).toBe('relation/1');
      await call(env, post('/internal/landmark-cleanup/scope-result', { runId, workerId: `w${attempt}`, areaKey: scope.areaKey, status: 'failed', error: 'boom' }));
      await call(env, post('/internal/landmark-cleanup/batch-release', { runId, workerId: `w${attempt}` }));
    }
    const status = await call(env, get(`/internal/landmark-cleanup/status?runId=${runId}`));
    expect(status.body.failed).toEqual([expect.objectContaining({ area_key: 'relation/1', last_error: 'boom' })]);
  });
});
