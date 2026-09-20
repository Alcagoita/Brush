-- Single shared D1 database for ALL places — one shared table with a
-- place_id column, not one database per place (still true even off the Free
-- plan: 10GB is the hard per-database ceiling regardless of plan tier).
-- No R-tree support on D1 — geohash prefix range queries stand in for
-- radius search instead. Lives in the same DB as `place` (place_schema.sql),
-- `country` (country_schema.sql) and `build_log` (build_log_schema.sql) —
-- one database serves all four.
--
-- build_id (KAN-333): every load tags its rows with a fresh build_id.
-- Loading is INSERT OR REPLACE on the (place_id, fsq_place_id) PK, so a
-- place present in both the old and new build updates in place — no
-- duplicate risk. After loading, a sweep (DELETE WHERE place_id = ? AND
-- build_id != ?) removes anything that didn't reappear in the new build
-- (closed places). Not atomic with the load — a closed place can linger
-- for the duration of one load cycle between the two steps, never longer,
-- never duplicated.
--
-- primary_poi_type (KAN-335): display/icon only — a place can genuinely
-- match more than one type, and search matches against the poi_type table
-- (poi_type_schema.sql), not this column. Deliberate denormalization: every
-- result needs exactly one icon/label, and that shouldn't cost a join.
--
-- place_id (KAN-355): renamed from city_id — kept as a column (not
-- normalized away) because it's how you rebuild or delete one Place's POIs.
-- Whether it stays in the read query's predicate is measured against the
-- pre-rename ~23ms baseline (see index.ts's nearby query), not assumed.

CREATE TABLE IF NOT EXISTS poi (
  fsq_place_id        TEXT NOT NULL,
  name                TEXT NOT NULL,
  dedupe_name         TEXT NOT NULL,          -- normalized at import time; together with coordinates identifies one real-world POI even when Foursquare supplies multiple IDs
  lat                 REAL NOT NULL,
  lng                 REAL NOT NULL,
  geohash             TEXT NOT NULL,          -- precision 7 (~150m cell), lowercase base32 only (see geohash.ts's BASE32); prefix-range-queried for nearby search (`geohash >= ? AND geohash < ?~`). No COLLATE clause -> SQLite's default BINARY collation, which is what makes that range correct: BASE32 is already in ascending codepoint order, so byte comparison alone matches the intended geohash subtree. Never load an uppercase geohash into this column — it would sort before its lowercase siblings and silently miss every prefix range that should contain it.
  primary_poi_type    TEXT NOT NULL,          -- display/icon only — see poi_type table for the full match set
  brand               TEXT,                   -- matched at load time against src/constants/brandDictionary.json; NULL when no confident match — added to an existing table via migrations/0001_phase4_poi_attribute_brand.sql, CREATE TABLE IF NOT EXISTS alone won't add it
  category_label      TEXT,                   -- raw Foursquare category hierarchy, for debugging/display
  raw_category_ids    TEXT,                   -- '|'-joined fsq category ids, verbatim — populated during CSV loading; NULL only when a row's raw category string was itself empty
  raw_category_labels TEXT,                   -- '|'-joined fsq category labels, verbatim — populated during CSV loading; NULL only when a row's raw category string was itself empty
  address             TEXT,
  date_refreshed      TEXT NOT NULL,
  open_min            INTEGER,                -- KAN-318: opening time in minutes from local midnight; NULL = always open (also stands in for 24h and "unknown" — all "never hide" for Nearby)
  close_min           INTEGER,                -- KAN-318: closing time, minutes from local midnight; paired with open_min
  PRIMARY KEY (fsq_place_id)
);

CREATE INDEX IF NOT EXISTS idx_poi_geo ON poi (geohash);
CREATE INDEX IF NOT EXISTS idx_poi_brand_geo ON poi (brand, geohash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_poi_canonical_identity
  ON poi (dedupe_name, lat, lng);

-- KAN-383: OpenStreetMap-only POIs are deliberately kept outside `poi`.
-- `poi.fsq_place_id` must always be a genuine Foursquare identifier; an OSM
-- element has its own stable identity and is joined by the nearby query as a
-- supplementary source.
CREATE TABLE IF NOT EXISTS osm_poi (
  osm_element_id      TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  dedupe_name         TEXT NOT NULL,
  lat                 REAL NOT NULL,
  lng                 REAL NOT NULL,
  geohash             TEXT NOT NULL,
  primary_poi_type    TEXT NOT NULL,
  brand               TEXT,
  address             TEXT,
  imported_at         TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  open_min            INTEGER,
  close_min           INTEGER
);
CREATE INDEX IF NOT EXISTS idx_osm_poi_geo ON osm_poi (geohash);
CREATE INDEX IF NOT EXISTS idx_osm_poi_brand_geo ON osm_poi (brand, geohash);
CREATE INDEX IF NOT EXISTS idx_osm_poi_name ON osm_poi (dedupe_name);

CREATE TABLE IF NOT EXISTS osm_poi_type (
  osm_element_id TEXT NOT NULL REFERENCES osm_poi(osm_element_id),
  poi_type       TEXT NOT NULL,
  rank           INTEGER NOT NULL,
  PRIMARY KEY (osm_element_id, poi_type)
);
CREATE INDEX IF NOT EXISTS idx_osm_poi_type_type_place
  ON osm_poi_type (poi_type, osm_element_id);

CREATE TABLE IF NOT EXISTS osm_poi_attribute (
  osm_element_id TEXT NOT NULL REFERENCES osm_poi(osm_element_id),
  dimension      TEXT NOT NULL,
  value          TEXT NOT NULL,
  PRIMARY KEY (osm_element_id, dimension, value)
);

-- The serving base since KAN-438. Arrived by migrations 0029 and 0030 and was
-- missing here, which is why the test harness — which loads this file rather
-- than replaying migrations — could not see it.
--
-- `overture_id` is Overture's GERS id and is the primary key. Ids are never
-- interchangeable across sources: each carries different licence terms, and
-- mislabelling one corrupts both cross-source dedupe and provenance.
CREATE TABLE IF NOT EXISTS overture_poi (
  overture_id         TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  dedupe_name         TEXT NOT NULL,
  lat                 REAL NOT NULL,
  lng                 REAL NOT NULL,
  geohash             TEXT NOT NULL,
  primary_poi_type    TEXT NOT NULL,
  brand               TEXT,
  address             TEXT,
  category            TEXT,
  confidence          REAL,
  source_datasets     TEXT,
  open_min            INTEGER,
  close_min           INTEGER,
  imported_at         TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  -- TEXT, not INTEGER: floors go negative, and a unit spanning two levels
  -- must be able to say so without another migration.
  floor               TEXT,
  -- KAN-456 (0048). The release that stopped carrying the row. Nearby serves
  -- only NULL; the row, its types, attributes and overrides stay, and a
  -- later release that lists the id again clears it.
  retired_in_release  TEXT
);
CREATE INDEX IF NOT EXISTS idx_overture_poi_geo ON overture_poi (geohash);
CREATE INDEX IF NOT EXISTS idx_overture_poi_retired ON overture_poi (retired_in_release);
CREATE INDEX IF NOT EXISTS idx_overture_poi_brand_geo ON overture_poi (brand, geohash);
CREATE INDEX IF NOT EXISTS idx_overture_poi_name ON overture_poi (dedupe_name);

-- Overture staging is intentionally distinct from serving rows.  A country
-- run may be resumed from its immutable R2 CSV before any pending candidate
-- is promoted.
CREATE TABLE IF NOT EXISTS overture_candidate (
  overture_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  address TEXT,
  locality TEXT,
  category TEXT,
  basic_category TEXT,
  category_path TEXT,
  confidence REAL,
  source_datasets TEXT,
  promotion_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (promotion_status IN ('pending', 'promoted', 'rejected')),
  promotion_note TEXT,
  imported_at TEXT NOT NULL,
  country_source_r2_key TEXT,
  -- KAN-456 (0048). The archive key of the most recent release that carried
  -- the row; after a refresh, rows for the country still on an older key are
  -- the retired set.
  last_seen_source_key TEXT
);
CREATE INDEX IF NOT EXISTS idx_overture_candidate_status ON overture_candidate (promotion_status);
CREATE INDEX IF NOT EXISTS idx_overture_candidate_last_seen ON overture_candidate (last_seen_source_key);
CREATE INDEX IF NOT EXISTS idx_overture_candidate_category ON overture_candidate (category);
CREATE INDEX IF NOT EXISTS idx_overture_candidate_source_status
  ON overture_candidate (country_source_r2_key, promotion_status);

CREATE TABLE IF NOT EXISTS overture_country_import (
  country_code TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'none' CHECK (status IN ('none', 'mapping', 'mapped', 'failed')),
  active_run_id TEXT,
  raw_extract_r2_key TEXT,
  backlog_report_r2_key TEXT,
  source_rows INTEGER NOT NULL DEFAULT 0,
  staged_rows INTEGER NOT NULL DEFAULT 0,
  dropped_rows INTEGER NOT NULL DEFAULT 0,
  promoted_rows INTEGER NOT NULL DEFAULT 0,
  rejected_rows INTEGER NOT NULL DEFAULT 0,
  pending_rows INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  completed_at TEXT,
  last_error TEXT,
  -- KAN-455 (0045). Lease of the one overture-repromote run allowed at a time.
  repromote_run_id TEXT,
  repromote_started_at TEXT,
  -- KAN-456 (0048). The refresh report: which Overture release the mapped
  -- source came from, and what the upsert found against the previous one.
  previous_source_r2_key TEXT,
  release TEXT,
  new_rows INTEGER NOT NULL DEFAULT 0,
  changed_rows INTEGER NOT NULL DEFAULT 0,
  retired_rows INTEGER NOT NULL DEFAULT 0
);

-- KAN-438. Frozen, deliberately narrow fallback copied from the 2026-08-29
-- backup before active Foursquare rows are removed. It contains only banks
-- and agreed heritage/cultural/nature/visitor types; never everyday commerce
-- or ATMs, which are respectively Overture and MULTIBANCO responsibilities.
CREATE TABLE IF NOT EXISTS legacy_poi (
  source_id           TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  dedupe_name         TEXT NOT NULL,
  lat                 REAL NOT NULL,
  lng                 REAL NOT NULL,
  geohash             TEXT NOT NULL,
  primary_poi_type    TEXT NOT NULL,
  address             TEXT,
  imported_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_legacy_poi_geo ON legacy_poi (geohash);
CREATE INDEX IF NOT EXISTS idx_legacy_poi_name ON legacy_poi (dedupe_name);
CREATE TABLE IF NOT EXISTS legacy_poi_type (
  source_id TEXT NOT NULL REFERENCES legacy_poi(source_id),
  poi_type TEXT NOT NULL,
  rank INTEGER NOT NULL,
  PRIMARY KEY (source_id, poi_type)
);
CREATE INDEX IF NOT EXISTS idx_legacy_poi_type_type ON legacy_poi_type (poi_type, source_id);

CREATE TABLE IF NOT EXISTS overture_poi_type (
  overture_id TEXT NOT NULL REFERENCES overture_poi(overture_id),
  poi_type    TEXT NOT NULL,
  rank        INTEGER NOT NULL,
  PRIMARY KEY (overture_id, poi_type)
);
CREATE INDEX IF NOT EXISTS idx_overture_poi_type_type_place
  ON overture_poi_type (poi_type, overture_id);

CREATE TABLE IF NOT EXISTS overture_poi_attribute (
  overture_id TEXT NOT NULL REFERENCES overture_poi(overture_id),
  dimension   TEXT NOT NULL,
  value       TEXT NOT NULL,
  PRIMARY KEY (overture_id, dimension, value)
);

CREATE TABLE IF NOT EXISTS osm_supplement_import (
  country_code          TEXT PRIMARY KEY REFERENCES country(country_code),
  status                TEXT NOT NULL CHECK (status IN ('none', 'mapping', 'mapped', 'failed')),
  active_run_id         TEXT,
  started_at            TEXT,
  completed_at          TEXT,
  source_elements       INTEGER NOT NULL DEFAULT 0,
  inserted_rows         INTEGER NOT NULL DEFAULT 0,
  matched_skipped       INTEGER NOT NULL DEFAULT 0,
  ambiguous_skipped     INTEGER NOT NULL DEFAULT 0,
  last_error            TEXT,
  -- KAN-387. One batch lock per country (leased, so a dead holder frees it),
  -- one country-wide Overpass backoff, and a cooperative cancel flag.
  batch_worker_id        TEXT,
  batch_lease_expires_at TEXT,
  backoff_until          TEXT,
  backoff_seconds        INTEGER NOT NULL DEFAULT 0,
  failed_scopes          INTEGER NOT NULL DEFAULT 0,
  cancel_requested       INTEGER NOT NULL DEFAULT 0
);

-- KAN-387: one durable checkpoint per municipality scope. Identity is
-- (country_code, place_id), never the run id — otherwise every new run
-- redoes the whole country. `last_completed_at` is the refresh authority.
CREATE TABLE IF NOT EXISTS osm_supplement_scope (
  country_code         TEXT NOT NULL,
  place_id             TEXT NOT NULL,
  status               TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  last_run_id          TEXT,
  last_completed_at    TEXT,
  consecutive_attempts INTEGER NOT NULL DEFAULT 0,
  total_attempts       INTEGER NOT NULL DEFAULT 0,
  lease_expires_at     TEXT,
  work_started_at      TEXT,
  lease_expiries       INTEGER NOT NULL DEFAULT 0,
  worker_id            TEXT,
  inserted             INTEGER NOT NULL DEFAULT 0,
  matched_skipped      INTEGER NOT NULL DEFAULT 0,
  ambiguous_skipped    INTEGER NOT NULL DEFAULT 0,
  overpass_elements    INTEGER NOT NULL DEFAULT 0,
  rename_report_r2_key TEXT,
  last_error           TEXT,
  last_error_class     TEXT,
  PRIMARY KEY (country_code, place_id)
);
CREATE INDEX IF NOT EXISTS idx_osm_supplement_scope_claim
  ON osm_supplement_scope (country_code, status, lease_expires_at);

-- KAN-440 — official MULTIBANCO ATM source.  This mirrors migration 0031 so
-- the in-memory D1 test database exercises the production schema.
CREATE TABLE IF NOT EXISTS multibanco_poi (
  source_id TEXT PRIMARY KEY, name TEXT NOT NULL, dedupe_name TEXT NOT NULL,
  lat REAL NOT NULL, lng REAL NOT NULL, geohash TEXT NOT NULL,
  primary_poi_type TEXT NOT NULL CHECK (primary_poi_type = 'atm'), address TEXT NOT NULL,
  parish TEXT, store_type TEXT, campaign TEXT, source_url TEXT NOT NULL,
  raw_payload_json TEXT NOT NULL, fetched_at TEXT NOT NULL, imported_at TEXT NOT NULL,
  updated_at TEXT NOT NULL, is_demo_zone INTEGER NOT NULL DEFAULT 0 CHECK (is_demo_zone IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_multibanco_poi_geo ON multibanco_poi (geohash);
CREATE TABLE IF NOT EXISTS multibanco_import_staging (
  source_id TEXT PRIMARY KEY, source_name TEXT NOT NULL CHECK (source_name = 'multibanco'),
  municipality_relation_id INTEGER NOT NULL, source_url TEXT NOT NULL, request_bounds_json TEXT NOT NULL,
  raw_payload_json TEXT NOT NULL, fetched_at TEXT NOT NULL, published_poi_id TEXT NOT NULL, published_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS multibanco_import (
  country_code TEXT PRIMARY KEY REFERENCES country(country_code),
  status TEXT NOT NULL CHECK (status IN ('none', 'mapping', 'mapped', 'failed')),
  active_run_id TEXT, started_at TEXT, completed_at TEXT, batch_worker_id TEXT,
  batch_lease_expires_at TEXT, backoff_until TEXT,
  cancel_requested INTEGER NOT NULL DEFAULT 0 CHECK (cancel_requested IN (0, 1)), last_error TEXT
);
CREATE TABLE IF NOT EXISTS multibanco_import_scope (
  country_code TEXT NOT NULL REFERENCES country(country_code), place_id TEXT NOT NULL REFERENCES place(place_id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  worker_id TEXT, lease_expires_at TEXT, completed_at TEXT, attempts INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 0, rejected INTEGER NOT NULL DEFAULT 0, duplicates INTEGER NOT NULL DEFAULT 0,
  last_error TEXT, PRIMARY KEY (country_code, place_id)
);
CREATE INDEX IF NOT EXISTS idx_multibanco_import_scope_claim
  ON multibanco_import_scope (country_code, status, lease_expires_at);

-- KAN-386: reviewed source decisions are applied at read time so a later
-- Foursquare reload cannot reintroduce a venue that was replaced by a more
-- accurate OSM record. Raw source rows remain available for audit.
--
-- 'overture' arrived by migration 0030 (a rebuild, since SQLite cannot widen
-- a CHECK in place). A row with visible = 0 is how an Overture place is
-- taken out of nearby — the base table is never edited (KAN-452).
CREATE TABLE IF NOT EXISTS poi_source_correction (
  source                TEXT NOT NULL CHECK (source IN ('foursquare', 'openstreetmap', 'overture')),
  source_id             TEXT NOT NULL,
  visible               INTEGER NOT NULL CHECK (visible IN (0, 1)),
  name_override         TEXT,
  dedupe_name_override  TEXT,
  -- KAN-390. Where `name_override` came from, and when. Once a row's name and
  -- its coordinates can originate in different places, "where did this string
  -- come from" stops being answerable from the schema — and the Settings
  -- attribution footer has to name every source actually shipping. Same
  -- reason `poi` records source identity.
  name_source           TEXT,
  name_updated_at       TEXT,
  review_note           TEXT NOT NULL,
  created_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (source, source_id)
);

-- KAN-446. One row per reviewed evidence run, per country. Append-only: the
-- primary key includes the manifest hash, so a rerun that changed anything is
-- a new row, and a repost of the same run is refused rather than overwritten.
-- Counts and provenance only — decisions live in the reviewed overrides file,
-- never here.
CREATE TABLE IF NOT EXISTS overture_evidence_run (
  country_code    TEXT NOT NULL,
  run_id          TEXT NOT NULL,
  manifest_sha256 TEXT NOT NULL,
  tool_commit     TEXT,
  config_sha256   TEXT NOT NULL,
  residual_rows   INTEGER NOT NULL,
  verified_rows   INTEGER NOT NULL,
  excluded_rows   INTEGER NOT NULL,
  insufficient_rows INTEGER NOT NULL,
  foursquare_rows INTEGER NOT NULL,
  osm_rows        INTEGER NOT NULL,
  recorded_at     TEXT NOT NULL,
  PRIMARY KEY (country_code, run_id, manifest_sha256),
  CHECK (residual_rows = verified_rows + excluded_rows + insufficient_rows),
  CHECK (verified_rows + excluded_rows = foursquare_rows + osm_rows)
);

-- ---------------------------------------------------------------------------
-- Moderation tables (KAN-362 / KAN-428 / KAN-452). Arrived by migrations 0008,
-- 0010, 0027, 0028, 0030 and 0042 and were missing here, so the in-memory
-- test database could not see the curated layer that nearby serves. Column
-- order follows the live schema: the ALTER-added columns (`brand`, `floor`,
-- the `origin_*` set) come last.

CREATE TABLE IF NOT EXISTS manual_poi_submission (
  submission_id       TEXT PRIMARY KEY,
  idempotency_key     TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  dedupe_name         TEXT NOT NULL,
  lat                 REAL NOT NULL,
  lng                 REAL NOT NULL,
  poi_type            TEXT NOT NULL,
  attributes_json     TEXT NOT NULL,
  address             TEXT,
  contributor_note    TEXT,
  ip_hash             TEXT NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at        TEXT NOT NULL,
  reviewed_at         TEXT,
  reviewed_by         TEXT,
  rejection_reason    TEXT,
  approved_poi_id     TEXT
);
CREATE INDEX IF NOT EXISTS idx_manual_poi_submission_review
  ON manual_poi_submission (status, submitted_at);

-- Every served place that is not Overture. `source` says who put the row
-- here (a moderator, or an approved community suggestion); the `origin_*`
-- columns (KAN-452) say which dataset the data came from, if any, and are
-- what makes an importer idempotent.
CREATE TABLE IF NOT EXISTS curated_poi (
  poi_id                     TEXT PRIMARY KEY,
  source                     TEXT NOT NULL CHECK (source IN ('community', 'manual')),
  source_submission_id       TEXT UNIQUE REFERENCES manual_poi_submission(submission_id),
  name                       TEXT NOT NULL,
  dedupe_name                TEXT NOT NULL,
  lat                        REAL NOT NULL,
  lng                        REAL NOT NULL,
  geohash                    TEXT NOT NULL,
  primary_poi_type           TEXT NOT NULL,
  address                    TEXT,
  status                     TEXT NOT NULL CHECK (status IN ('active', 'removed')),
  created_at                 TEXT NOT NULL,
  created_by                 TEXT NOT NULL,
  updated_at                 TEXT NOT NULL,
  updated_by                 TEXT NOT NULL,
  removed_at                 TEXT,
  removed_by                 TEXT,
  removal_reason             TEXT,
  brand                      TEXT,
  floor                      TEXT,
  origin_source              TEXT,
  origin_id                  TEXT,
  origin_licence             TEXT,
  imported_at                TEXT,
  import_run_id              TEXT
);
CREATE INDEX IF NOT EXISTS idx_curated_poi_geo ON curated_poi (geohash);
CREATE INDEX IF NOT EXISTS idx_curated_poi_name ON curated_poi (dedupe_name);
CREATE INDEX IF NOT EXISTS idx_curated_poi_brand_geo ON curated_poi (brand, geohash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_curated_poi_origin
  ON curated_poi (origin_source, origin_id)
  WHERE origin_source IS NOT NULL AND origin_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS curated_poi_attribute (
  poi_id       TEXT NOT NULL REFERENCES curated_poi(poi_id),
  dimension    TEXT NOT NULL,
  value        TEXT NOT NULL,
  PRIMARY KEY (poi_id, dimension, value)
);

CREATE TABLE IF NOT EXISTS manual_poi_audit (
  audit_id       TEXT PRIMARY KEY,
  target_kind    TEXT NOT NULL CHECK (target_kind IN ('submission', 'curated_poi', 'removal')),
  target_id      TEXT NOT NULL,
  action         TEXT NOT NULL,
  actor          TEXT NOT NULL,
  detail_json    TEXT NOT NULL,
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_manual_poi_audit_target
  ON manual_poi_audit (target_kind, target_id, created_at);

CREATE TABLE IF NOT EXISTS manual_poi_rate_limit (
  ip_hash            TEXT PRIMARY KEY,
  window_started_at  TEXT NOT NULL,
  request_count      INTEGER NOT NULL
);

-- KAN-428. `target_source` is as production has it: 'overture' is NOT
-- accepted, which is what stops a removal report against an Overture row
-- from being stored until that CHECK is widened (see migration 0027 and the
-- KAN-452 PR).
CREATE TABLE IF NOT EXISTS poi_removal_submission (
  submission_id      TEXT PRIMARY KEY,
  idempotency_key    TEXT NOT NULL UNIQUE,
  target_source      TEXT NOT NULL CHECK (target_source IN ('foursquare', 'openstreetmap', 'community')),
  target_id          TEXT NOT NULL,
  target_name        TEXT NOT NULL,
  target_poi_type    TEXT NOT NULL,
  target_address     TEXT,
  reason             TEXT NOT NULL CHECK (reason IN ('closed', 'never_existed', 'duplicate')),
  contributor_note   TEXT,
  ip_hash            TEXT NOT NULL,
  status             TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at       TEXT NOT NULL,
  reviewed_at        TEXT,
  reviewed_by        TEXT,
  rejection_reason   TEXT
);
CREATE INDEX IF NOT EXISTS idx_poi_removal_submission_review
  ON poi_removal_submission (status, submitted_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_poi_removal_submission_pending_target
  ON poi_removal_submission (target_source, target_id)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS poi_suppression (
  source            TEXT NOT NULL CHECK (source IN ('foursquare', 'openstreetmap', 'community')),
  source_id         TEXT NOT NULL,
  reason            TEXT NOT NULL CHECK (reason IN ('closed', 'never_existed', 'duplicate')),
  submission_id     TEXT REFERENCES poi_removal_submission(submission_id),
  name              TEXT NOT NULL,
  suppressed_at     TEXT NOT NULL,
  suppressed_by     TEXT NOT NULL,
  PRIMARY KEY (source, source_id)
);
