import type { Env } from './index';

/**
 * KAN-461 — the landmark cleanup as a durable container job
 * (docs/kan-461/landmark-cleanup-job.md).
 *
 * Same shape as the MULTIBANCO job (KAN-440): a run holds a batch lock, its
 * areas hold a lease each, the Container claims a few areas, checkpoints each
 * in D1, and exits; cron starts the next batch until none is claimable.
 *
 * Two modes. A dry run decides and reports (R2) and writes nothing outside
 * these two tables. An emit run replays one completed dry run's decisions —
 * only its areas that were not held — so what the owner approved is exactly
 * what is deleted.
 */
export const LANDMARK_CLEANUP_BATCH_SIZE = 10;
export const LANDMARK_CLEANUP_LEASE_MS = 20 * 60 * 1_000;
export const LANDMARK_CLEANUP_LOCK_MS = 25 * 60 * 1_000;
export const LANDMARK_CLEANUP_MAX_ATTEMPTS = 3;
export const LANDMARK_CLEANUP_COUNTRIES = ['PT'] as const;
/**
 * The job code a container must run to be handed areas. A container sends
 * its version with every claim; an older one gets nothing (2026-11-18: an
 * emit started right after a deploy was claimed by the previous image, which
 * had no filter and no backup, and deleted 84 rows it should not have).
 * Bump with landmark_cleanup_job.JOB_VERSION whenever the job's behaviour changes.
 */
export const LANDMARK_CLEANUP_JOB_VERSION = 5;

// Lisbon first, then every municipality-level place (some are stored as a
// city or town), the county boxes, then one area for whatever no box covers —
// the order and areas of the KAN-461 landmark import (run_landmark_import.py).
const AREA_KINDS = "('municipality', 'city', 'town', 'city_district', 'county')";
export const REST_OF_COUNTRY = { areaKey: 'rest-of-country', name: 'Resto de Portugal', box: [32.0, 42.2, -31.5, -6.1] } as const;

export type CleanupMode = 'dry_run' | 'emit';
/** 'safe': not-a-place rows and identical-name duplicates only; 'all': every decision. */
export type EmitFilter = 'safe' | 'all';
export type CleanupScope = {
  areaKey: string; name: string; seq: number;
  minLat: number; maxLat: number; minLng: number; maxLng: number;
};

function iso(at: number): string { return new Date(at).toISOString(); }

const CLAIMABLE = `
  run_id = ? AND attempts < ${LANDMARK_CLEANUP_MAX_ATTEMPTS}
  AND (status = 'pending' OR (status = 'running' AND (lease_expires_at IS NULL OR lease_expires_at <= ?)))`;

export async function cleanupCounts(env: Env, runId: string, now: number) {
  const row = await env.REGISTRY_DB.prepare(
    `SELECT COUNT(*) AS total,
       COALESCE(SUM(status = 'completed'), 0) AS completed,
       COALESCE(SUM(status = 'failed'), 0) AS failed,
       COALESCE(SUM(status = 'running'), 0) AS running,
       COALESCE(SUM(status = 'pending'), 0) AS pending,
       COALESCE(SUM(held_reason IS NOT NULL), 0) AS held,
       COALESCE(SUM(rows), 0) AS rows,
       COALESCE(SUM(CASE WHEN held_reason IS NULL THEN to_remove ELSE 0 END), 0) AS to_remove,
       COALESCE(SUM(removed), 0) AS removed
     FROM landmark_cleanup_scope WHERE run_id = ?`,
  ).bind(runId).first<Record<string, number>>();
  const claimable = await env.REGISTRY_DB.prepare(
    `SELECT COUNT(*) AS claimable FROM landmark_cleanup_scope WHERE ${CLAIMABLE}`,
  ).bind(runId, iso(now)).first<{ claimable: number }>();
  return {
    total: row?.total ?? 0, completed: row?.completed ?? 0, failed: row?.failed ?? 0,
    running: row?.running ?? 0, pending: row?.pending ?? 0, held: row?.held ?? 0,
    rows: row?.rows ?? 0, toRemove: row?.to_remove ?? 0, removed: row?.removed ?? 0,
    claimable: claimable?.claimable ?? 0,
  };
}

/**
 * Start a run. A dry run seeds every area; an emit run seeds only the
 * completed, not-held areas of `sourceRunId` that have something to remove.
 * One run at a time per country.
 */
export async function startLandmarkCleanup(
  env: Env, options: {
    countryCode: string; mode: CleanupMode; sourceRunId?: string; emitFilter?: EmitFilter; now: number;
    /** emit only: the first N areas still to emit (a pilot), by run order */
    areaLimit?: number;
  },
) {
  const { countryCode, mode, now } = options;
  const busy = await env.REGISTRY_DB.prepare(
    "SELECT run_id FROM landmark_cleanup_run WHERE country_code = ? AND status = 'running'",
  ).bind(countryCode).first<{ run_id: string }>();
  if (busy) return { error: `run ${busy.run_id} is still running` as const };
  if (mode === 'emit') {
    const source = await env.REGISTRY_DB.prepare(
      "SELECT status, mode, country_code FROM landmark_cleanup_run WHERE run_id = ?",
    ).bind(options.sourceRunId ?? '').first<{ status: string; mode: string; country_code: string }>();
    if (!source || source.mode !== 'dry_run' || source.status !== 'done' || source.country_code !== countryCode) {
      return { error: 'sourceRunId must be a finished dry run of this country' as const };
    }
  }
  const runId = crypto.randomUUID();
  await env.REGISTRY_DB.prepare(
    `INSERT INTO landmark_cleanup_run (run_id, country_code, mode, source_run_id, emit_filter, status, started_at)
     VALUES (?, ?, ?, ?, ?, 'running', ?)`,
  ).bind(runId, countryCode, mode, mode === 'emit' ? options.sourceRunId : null,
    mode === 'emit' ? (options.emitFilter ?? 'safe') : null, iso(now)).run();
  if (mode === 'dry_run') {
    await env.REGISTRY_DB.prepare(
      `INSERT INTO landmark_cleanup_scope (run_id, area_key, name, seq, min_lat, max_lat, min_lng, max_lng, status)
       SELECT ?, place_id, name,
              ROW_NUMBER() OVER (ORDER BY name <> 'Lisboa', place_kind = 'county', name, place_id),
              min_lat, max_lat, min_lng, max_lng, 'pending'
       FROM place
       WHERE country_code = ? AND place_kind IN ${AREA_KINDS}
         AND min_lat IS NOT NULL AND max_lat IS NOT NULL AND min_lng IS NOT NULL AND max_lng IS NOT NULL`,
    ).bind(runId, countryCode).run();
    const [minLat, maxLat, minLng, maxLng] = REST_OF_COUNTRY.box;
    await env.REGISTRY_DB.prepare(
      `INSERT INTO landmark_cleanup_scope (run_id, area_key, name, seq, min_lat, max_lat, min_lng, max_lng, status)
       VALUES (?, ?, ?, 1000000, ?, ?, ?, ?, 'pending')`,
    ).bind(runId, REST_OF_COUNTRY.areaKey, REST_OF_COUNTRY.name, minLat, maxLat, minLng, maxLng).run();
  } else {
    await env.REGISTRY_DB.prepare(
      `INSERT INTO landmark_cleanup_scope (run_id, area_key, name, seq, min_lat, max_lat, min_lng, max_lng, status, report_r2_key)
       SELECT ?, area_key, name, seq, min_lat, max_lat, min_lng, max_lng, 'pending', report_r2_key
       FROM landmark_cleanup_scope
       WHERE run_id = ? AND status = 'completed' AND held_reason IS NULL AND to_remove > 0
         -- an area an earlier emit of this dry run already finished is not emitted again
         AND area_key NOT IN (
           SELECT s.area_key FROM landmark_cleanup_scope s JOIN landmark_cleanup_run r ON r.run_id = s.run_id
           WHERE r.mode = 'emit' AND r.source_run_id = ? AND s.status = 'completed')
       ORDER BY seq LIMIT ?`,
    ).bind(runId, options.sourceRunId, options.sourceRunId, options.areaLimit ?? -1).run();
  }
  const counts = await cleanupCounts(env, runId, now);
  if (counts.total === 0) {
    await env.REGISTRY_DB.prepare(
      "UPDATE landmark_cleanup_run SET status = 'done', completed_at = ?, last_error = 'nothing to do' WHERE run_id = ?",
    ).bind(iso(now), runId).run();
    return { runId, started: false, counts };
  }
  return { runId, started: true, counts };
}

export async function claimCleanupBatch(
  env: Env, options: { runId: string; workerId: string; now: number; batchSize: number; jobVersion: number },
): Promise<{ locked: boolean; mode: CleanupMode | null; sourceRunId: string | null; emitFilter: EmitFilter | null; scopes: CleanupScope[]; refused?: string }> {
  const { runId, workerId, now } = options;
  if (!(options.jobVersion >= LANDMARK_CLEANUP_JOB_VERSION)) {
    const refused = `container job version ${options.jobVersion || 'none'} is older than ${LANDMARK_CLEANUP_JOB_VERSION}`;
    await env.REGISTRY_DB.prepare('UPDATE landmark_cleanup_run SET last_error = ? WHERE run_id = ?').bind(refused, runId).run();
    return { locked: false, mode: null, sourceRunId: null, emitFilter: null, scopes: [], refused };
  }
  const lockUntil = iso(now + LANDMARK_CLEANUP_LOCK_MS);
  const leaseUntil = iso(now + LANDMARK_CLEANUP_LEASE_MS);
  const batchSize = Math.min(Math.max(options.batchSize, 1), LANDMARK_CLEANUP_BATCH_SIZE);
  const lock = await env.REGISTRY_DB.prepare(
    `UPDATE landmark_cleanup_run SET batch_worker_id = ?, batch_lease_expires_at = ?
     WHERE run_id = ? AND status = 'running' AND cancel_requested = 0
       AND (batch_lease_expires_at IS NULL OR batch_lease_expires_at <= ? OR batch_worker_id = ?)`,
  ).bind(workerId, lockUntil, runId, iso(now), workerId).run();
  if (lock.meta.changes !== 1) return { locked: false, mode: null, sourceRunId: null, emitFilter: null, scopes: [] };
  const run = await env.REGISTRY_DB.prepare('SELECT mode, source_run_id, emit_filter FROM landmark_cleanup_run WHERE run_id = ?')
    .bind(runId).first<{ mode: CleanupMode; source_run_id: string | null; emit_filter: EmitFilter | null }>();

  await env.REGISTRY_DB.prepare(
    `UPDATE landmark_cleanup_scope SET status = 'running', worker_id = ?, lease_expires_at = ?,
       attempts = attempts + CASE WHEN status = 'running' THEN 1 ELSE 0 END
     WHERE run_id = ? AND area_key IN (
       SELECT area_key FROM landmark_cleanup_scope WHERE ${CLAIMABLE} ORDER BY seq LIMIT ?
     )`,
  ).bind(workerId, leaseUntil, runId, runId, iso(now), batchSize).run();
  const claimed = await env.REGISTRY_DB.prepare(
    `SELECT area_key, name, seq, min_lat, max_lat, min_lng, max_lng FROM landmark_cleanup_scope
     WHERE run_id = ? AND worker_id = ? AND status = 'running' AND lease_expires_at = ? ORDER BY seq`,
  ).bind(runId, workerId, leaseUntil).all<{
    area_key: string; name: string; seq: number; min_lat: number; max_lat: number; min_lng: number; max_lng: number;
  }>();
  return {
    locked: true, mode: run?.mode ?? null, sourceRunId: run?.source_run_id ?? null, emitFilter: run?.emit_filter ?? null,
    scopes: (claimed.results ?? []).map(s => ({
      areaKey: s.area_key, name: s.name, seq: s.seq,
      minLat: s.min_lat, maxLat: s.max_lat, minLng: s.min_lng, maxLng: s.max_lng,
    })),
  };
}

export async function completeCleanupScope(env: Env, options: {
  runId: string; areaKey: string; workerId: string; now: number;
  rows: number; toRemove: number; removed: number; heldReason: string | null; reportR2Key: string | null;
}): Promise<boolean> {
  const result = await env.REGISTRY_DB.prepare(
    `UPDATE landmark_cleanup_scope SET status = 'completed', completed_at = ?, worker_id = NULL,
       lease_expires_at = NULL, rows = ?, to_remove = ?, removed = ?, held_reason = ?,
       report_r2_key = COALESCE(?, report_r2_key), last_error = NULL
     WHERE run_id = ? AND area_key = ? AND worker_id = ? AND status = 'running'`,
  ).bind(iso(options.now), options.rows, options.toRemove, options.removed, options.heldReason,
    options.reportR2Key, options.runId, options.areaKey, options.workerId).run();
  return result.meta.changes === 1;
}

export async function failCleanupScope(env: Env, options: {
  runId: string; areaKey: string; workerId: string; error: string;
}): Promise<boolean> {
  const result = await env.REGISTRY_DB.prepare(
    `UPDATE landmark_cleanup_scope SET attempts = attempts + 1,
       status = CASE WHEN attempts + 1 >= ${LANDMARK_CLEANUP_MAX_ATTEMPTS} THEN 'failed' ELSE 'pending' END,
       worker_id = NULL, lease_expires_at = NULL, last_error = ?
     WHERE run_id = ? AND area_key = ? AND worker_id = ? AND status = 'running'`,
  ).bind(options.error.slice(0, 1_000), options.runId, options.areaKey, options.workerId).run();
  return result.meta.changes === 1;
}

export async function releaseCleanupBatch(env: Env, options: { runId: string; workerId: string; now: number }) {
  await env.REGISTRY_DB.prepare(
    `UPDATE landmark_cleanup_scope SET status = 'pending', worker_id = NULL, lease_expires_at = NULL
     WHERE run_id = ? AND worker_id = ? AND status = 'running'`,
  ).bind(options.runId, options.workerId).run();
  await env.REGISTRY_DB.prepare(
    `UPDATE landmark_cleanup_run SET batch_worker_id = NULL, batch_lease_expires_at = NULL
     WHERE run_id = ? AND batch_worker_id = ?`,
  ).bind(options.runId, options.workerId).run();
  const counts = await cleanupCounts(env, options.runId, options.now);
  if (counts.claimable > 0 || counts.running > 0) return { finalized: false, counts };
  const done = await env.REGISTRY_DB.prepare(
    `UPDATE landmark_cleanup_run SET status = 'done', completed_at = ?, batch_worker_id = NULL,
       batch_lease_expires_at = NULL, last_error = CASE WHEN ? > 0 THEN ? ELSE NULL END
     WHERE run_id = ? AND status = 'running'`,
  ).bind(iso(options.now), counts.failed, counts.failed ? `${counts.failed} area(s) failed` : null, options.runId).run();
  return { finalized: done.meta.changes === 1, counts };
}

/** Runs cron should start a batch for: running, not cancelled, no live batch lock. */
export async function cleanupRunsAwaitingBatch(env: Env, now: number) {
  const rows = await env.REGISTRY_DB.prepare(
    `SELECT run_id FROM landmark_cleanup_run
     WHERE status = 'running' AND cancel_requested = 0
       AND (batch_lease_expires_at IS NULL OR batch_lease_expires_at <= ?)`,
  ).bind(iso(now)).all<{ run_id: string }>();
  return rows.results ?? [];
}

export async function landmarkCleanupStatus(env: Env, runId: string, now: number) {
  const run = await env.REGISTRY_DB.prepare('SELECT * FROM landmark_cleanup_run WHERE run_id = ?')
    .bind(runId).first<Record<string, unknown>>();
  if (!run) return null;
  const held = await env.REGISTRY_DB.prepare(
    `SELECT area_key, name, rows, to_remove, held_reason FROM landmark_cleanup_scope
     WHERE run_id = ? AND held_reason IS NOT NULL ORDER BY seq`,
  ).bind(runId).all<Record<string, unknown>>();
  const failed = await env.REGISTRY_DB.prepare(
    `SELECT area_key, name, last_error FROM landmark_cleanup_scope WHERE run_id = ? AND status = 'failed' ORDER BY seq`,
  ).bind(runId).all<Record<string, unknown>>();
  return { ...run, counts: await cleanupCounts(env, runId, now), held: held.results ?? [], failed: failed.results ?? [] };
}

export async function cancelLandmarkCleanup(env: Env, runId: string, now: number): Promise<boolean> {
  const result = await env.REGISTRY_DB.prepare(
    `UPDATE landmark_cleanup_run SET status = 'failed', cancel_requested = 1, completed_at = ?,
       batch_worker_id = NULL, batch_lease_expires_at = NULL, last_error = 'cancelled by operator'
     WHERE run_id = ? AND status = 'running'`,
  ).bind(iso(now), runId).run();
  if (result.meta.changes !== 1) return false;
  await env.REGISTRY_DB.prepare(
    `UPDATE landmark_cleanup_scope SET status = 'pending', worker_id = NULL, lease_expires_at = NULL
     WHERE run_id = ? AND status = 'running'`,
  ).bind(runId).run();
  return true;
}
