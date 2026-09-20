-- KAN-456. An Overture refresh is an upsert on the GERS id, not a second
-- copy: the same overture_id gets the new release's values, a row the new
-- release no longer carries is retired (never deleted), and a row that
-- comes back un-retires. ADD COLUMN only — apply exactly once (not
-- idempotent, like 0042 and 0045); check PRAGMA table_info first.
--
-- overture_candidate.last_seen_source_key: the archive key of the most
--   recent release that carried the row. After a load, rows for the country
--   whose key is older than the run's are the retired set.
-- overture_poi.retired_in_release: the release that stopped carrying the
--   row; nearby serves only NULL. Overrides, types and attributes stay on
--   the row, so a shop that reopens (or a release that re-lists it) is
--   served again with its reviewed decision intact.
-- overture_country_import.previous_source_r2_key: the archive a refresh
--   replaces (the container diffs the new release against it); .release and
--   .{new,changed,retired}_rows: the refresh report.
ALTER TABLE overture_candidate ADD COLUMN last_seen_source_key TEXT;
ALTER TABLE overture_poi ADD COLUMN retired_in_release TEXT;
ALTER TABLE overture_country_import ADD COLUMN previous_source_r2_key TEXT;
ALTER TABLE overture_country_import ADD COLUMN release TEXT;
ALTER TABLE overture_country_import ADD COLUMN new_rows INTEGER NOT NULL DEFAULT 0;
ALTER TABLE overture_country_import ADD COLUMN changed_rows INTEGER NOT NULL DEFAULT 0;
ALTER TABLE overture_country_import ADD COLUMN retired_rows INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_overture_candidate_last_seen
  ON overture_candidate (last_seen_source_key);
CREATE INDEX IF NOT EXISTS idx_overture_poi_retired
  ON overture_poi (retired_in_release);
