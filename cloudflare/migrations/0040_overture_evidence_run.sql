-- KAN-446. Append-only record of each reviewed evidence run per country.
-- See schema.sql for the reasoning; this only creates the table.
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
