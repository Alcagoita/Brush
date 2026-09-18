-- KAN-455. Exactly-once ownership of an overture-repromote run.
--
-- /internal/overture-repromote takes the lease with a conditional UPDATE
-- (null or stale lease only) before it starts a container; a second trigger
-- while a run is active is 409. /complete and /failed require the leased
-- run id and clear it. Applied with `d1 execute --file`; the tracker is not
-- in use. ADD COLUMN only, not idempotent: check
-- `PRAGMA table_info(overture_country_import)` for `repromote_run_id` first.
ALTER TABLE overture_country_import ADD COLUMN repromote_run_id TEXT;
ALTER TABLE overture_country_import ADD COLUMN repromote_started_at TEXT;
