-- KAN-461. The landmark cleanup as a container job (docs/kan-461/landmark-cleanup-job.md).
-- Same shape as multibanco_import / multibanco_import_scope (KAN-440): a run
-- with a batch lock, its areas with a lease each, cron starting the next
-- batch. Creates only; touches no existing table.

CREATE TABLE IF NOT EXISTS landmark_cleanup_run (
  run_id                 TEXT PRIMARY KEY,
  country_code           TEXT NOT NULL,
  mode                   TEXT NOT NULL CHECK (mode IN ('dry_run', 'emit')),
  -- emit replays the decisions of this dry run, it never recomputes
  source_run_id          TEXT REFERENCES landmark_cleanup_run(run_id),
  status                 TEXT NOT NULL CHECK (status IN ('running', 'done', 'failed')),
  started_at             TEXT NOT NULL,
  completed_at           TEXT,
  batch_worker_id        TEXT,
  batch_lease_expires_at TEXT,
  cancel_requested       INTEGER NOT NULL DEFAULT 0 CHECK (cancel_requested IN (0, 1)),
  last_error             TEXT
);

CREATE TABLE IF NOT EXISTS landmark_cleanup_scope (
  run_id           TEXT NOT NULL REFERENCES landmark_cleanup_run(run_id),
  area_key         TEXT NOT NULL,
  name             TEXT NOT NULL,
  seq              INTEGER NOT NULL,
  min_lat          REAL NOT NULL,
  max_lat          REAL NOT NULL,
  min_lng          REAL NOT NULL,
  max_lng          REAL NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  worker_id        TEXT,
  lease_expires_at TEXT,
  attempts         INTEGER NOT NULL DEFAULT 0,
  rows             INTEGER NOT NULL DEFAULT 0,
  to_remove        INTEGER NOT NULL DEFAULT 0,
  removed          INTEGER NOT NULL DEFAULT 0,
  held_reason      TEXT,
  report_r2_key    TEXT,
  completed_at     TEXT,
  last_error       TEXT,
  PRIMARY KEY (run_id, area_key)
);
CREATE INDEX IF NOT EXISTS idx_landmark_cleanup_scope_claim
  ON landmark_cleanup_scope (run_id, status, lease_expires_at);
