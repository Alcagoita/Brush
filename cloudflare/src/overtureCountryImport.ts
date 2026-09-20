import type { Env } from './index';

export type OvertureCountryImportStatus = 'none' | 'mapping' | 'mapped' | 'failed';

function iso(now: number): string {
  return new Date(now).toISOString();
}

export function overtureCountrySourceKey(countryCode: string, runId: string): string {
  return `overture-country-sources/${countryCode}/${runId}.csv`;
}

export function overtureCountryReportKey(countryCode: string, runId: string): string {
  return `overture-country-reports/${countryCode}/${runId}.tsv`;
}

/**
 * Queue a country import. Re-queuing a `mapped` country is a refresh
 * (KAN-456): the archive it was mapped from is kept as
 * `previous_source_r2_key` so the container can diff the new release against
 * it, and the requested `release` is recorded. A `failed` run keeps its own
 * archive (a retry re-stages the same immutable source) and its previous key.
 */
export async function queueOvertureCountryImport(env: Env, countryCode: string, now: number, release: string | null = null) {
  const runId = crypto.randomUUID();
  const result = await env.REGISTRY_DB.prepare(
    `INSERT INTO overture_country_import
       (country_code, status, active_run_id, started_at, completed_at, raw_extract_r2_key,
        backlog_report_r2_key, source_rows, staged_rows, dropped_rows, promoted_rows,
        rejected_rows, pending_rows, last_error, previous_source_r2_key, release)
     VALUES (?, 'mapping', ?, ?, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, NULL, ?)
     ON CONFLICT(country_code) DO UPDATE SET
       status = 'mapping', active_run_id = excluded.active_run_id, started_at = excluded.started_at,
       completed_at = NULL,
       previous_source_r2_key = CASE WHEN overture_country_import.status = 'mapped'
         THEN overture_country_import.raw_extract_r2_key ELSE overture_country_import.previous_source_r2_key END,
       raw_extract_r2_key = CASE WHEN overture_country_import.status = 'failed'
         THEN overture_country_import.raw_extract_r2_key ELSE NULL END,
       release = COALESCE(excluded.release, overture_country_import.release),
       backlog_report_r2_key = NULL,
       source_rows = 0, staged_rows = 0, dropped_rows = 0, promoted_rows = 0,
       rejected_rows = 0, pending_rows = 0, new_rows = 0, changed_rows = 0, retired_rows = 0, last_error = NULL
     WHERE overture_country_import.status IN ('none', 'failed', 'mapped')`,
  ).bind(countryCode, runId, iso(now), release).run();
  const row = await env.REGISTRY_DB.prepare(
    'SELECT status, active_run_id, raw_extract_r2_key, previous_source_r2_key, release FROM overture_country_import WHERE country_code = ?',
  ).bind(countryCode).first<{ status: OvertureCountryImportStatus; active_run_id: string | null; raw_extract_r2_key: string | null; previous_source_r2_key: string | null; release: string | null }>();
  return {
    started: result.meta.changes === 1, runId: row?.active_run_id ?? null, rawExtractR2Key: row?.raw_extract_r2_key ?? null,
    previousSourceR2Key: row?.previous_source_r2_key ?? null, release: row?.release ?? null, status: row?.status ?? 'none',
  };
}

export async function checkpointOvertureCountrySource(env: Env, options: {
  countryCode: string; runId: string; rawExtractR2Key: string; sourceRows: number;
}): Promise<boolean> {
  const result = await env.REGISTRY_DB.prepare(
    `UPDATE overture_country_import SET raw_extract_r2_key = ?, source_rows = ?, last_error = NULL
     WHERE country_code = ? AND active_run_id = ? AND status = 'mapping'`,
  ).bind(options.rawExtractR2Key, options.sourceRows, options.countryCode, options.runId).run();
  return result.meta.changes === 1;
}

export async function completeOvertureCountryImport(env: Env, options: {
  countryCode: string; runId: string; backlogReportR2Key: string; sourceRows: number;
  stagedRows: number; droppedRows: number; promotedRows: number; rejectedRows: number; pendingRows: number; now: number;
  /** KAN-456: the release the source was extracted from and the refresh report (a first import reports every row as new). */
  release?: string | null; newRows?: number; changedRows?: number; retiredRows?: number;
}): Promise<boolean> {
  if (options.sourceRows !== options.stagedRows + options.droppedRows) return false;
  if (options.promotedRows + options.rejectedRows + options.pendingRows !== options.stagedRows) return false;
  const result = await env.REGISTRY_DB.prepare(
    `UPDATE overture_country_import SET status = 'mapped', completed_at = ?, backlog_report_r2_key = ?,
       source_rows = ?, staged_rows = ?, dropped_rows = ?, promoted_rows = ?, rejected_rows = ?, pending_rows = ?, last_error = NULL,
       release = COALESCE(?, release), new_rows = ?, changed_rows = ?, retired_rows = ?
     WHERE country_code = ? AND active_run_id = ? AND status = 'mapping' AND raw_extract_r2_key IS NOT NULL`,
  ).bind(iso(options.now), options.backlogReportR2Key, options.sourceRows, options.stagedRows,
    options.droppedRows, options.promotedRows, options.rejectedRows, options.pendingRows,
    options.release ?? null, options.newRows ?? options.stagedRows, options.changedRows ?? 0, options.retiredRows ?? 0,
    options.countryCode, options.runId).run();
  return result.meta.changes === 1;
}

/** A repromote lease older than this is abandoned: the container is gone. */
export const REPROMOTE_LEASE_STALE_MS = 2 * 60 * 60 * 1000;

/**
 * KAN-455. Exactly-once ownership of a repromote run, the way
 * startPlaceMapping and queueSettlementRegistry take theirs: one
 * conditional UPDATE, and `changes === 1` means this request owns the run.
 * Only the mapped row for exactly this source qualifies, and only when no
 * live lease is on it.
 */
export async function leaseOvertureRepromote(env: Env, options: {
  countryCode: string; rawExtractR2Key: string; runId: string; now: number;
}): Promise<boolean> {
  const result = await env.REGISTRY_DB.prepare(
    `UPDATE overture_country_import SET repromote_run_id = ?, repromote_started_at = ?
     WHERE country_code = ? AND status = 'mapped' AND raw_extract_r2_key = ?
       AND (repromote_run_id IS NULL OR repromote_started_at IS NULL OR repromote_started_at < ?)`,
  ).bind(options.runId, iso(options.now), options.countryCode, options.rawExtractR2Key,
    iso(options.now - REPROMOTE_LEASE_STALE_MS)).run();
  return result.meta.changes === 1;
}

/**
 * KAN-455. After a repromote run over the mapped source, the row's decision
 * counts are brought up to date and the lease is released. Only the run
 * holding the lease may do this, and only when the counts still account for
 * every staged row — the same invariant completeOvertureCountryImport
 * enforces.
 */
export async function recordOvertureRepromote(env: Env, options: {
  countryCode: string; rawExtractR2Key: string; runId: string; promotedRows: number; rejectedRows: number; pendingRows: number;
}): Promise<boolean> {
  const result = await env.REGISTRY_DB.prepare(
    `UPDATE overture_country_import SET promoted_rows = ?, rejected_rows = ?, pending_rows = ?,
       repromote_run_id = NULL, repromote_started_at = NULL
     WHERE country_code = ? AND status = 'mapped' AND raw_extract_r2_key = ? AND repromote_run_id = ?
       AND staged_rows = ? + ? + ?`,
  ).bind(options.promotedRows, options.rejectedRows, options.pendingRows,
    options.countryCode, options.rawExtractR2Key, options.runId,
    options.promotedRows, options.rejectedRows, options.pendingRows).run();
  return result.meta.changes === 1;
}

/** KAN-455. A failed or never-started run releases its lease; counts untouched. */
export async function releaseOvertureRepromote(env: Env, countryCode: string, runId: string): Promise<boolean> {
  const result = await env.REGISTRY_DB.prepare(
    `UPDATE overture_country_import SET repromote_run_id = NULL, repromote_started_at = NULL
     WHERE country_code = ? AND repromote_run_id = ?`,
  ).bind(countryCode, runId).run();
  return result.meta.changes === 1;
}

export async function failOvertureCountryImport(env: Env, countryCode: string, runId: string, error: string, now: number): Promise<boolean> {
  const result = await env.REGISTRY_DB.prepare(
    `UPDATE overture_country_import SET status = 'failed', completed_at = ?, last_error = ?
     WHERE country_code = ? AND active_run_id = ? AND status = 'mapping'`,
  ).bind(iso(now), error.slice(0, 1_000), countryCode, runId).run();
  return result.meta.changes === 1;
}

export async function overtureCountryImportStatus(env: Env, countryCode: string) {
  return env.REGISTRY_DB.prepare('SELECT * FROM overture_country_import WHERE country_code = ?')
    .bind(countryCode).first<Record<string, unknown>>();
}
