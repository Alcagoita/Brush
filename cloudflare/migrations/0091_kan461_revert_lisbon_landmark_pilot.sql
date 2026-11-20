-- KAN-461. Revert the Lisbon landmark pilot (run kan461-osm-historic-lisbon-20261116).
-- Its duplicate check was distance alone (any landmark within 50 m), which the
-- registry rule forbids: a monastery, the fountain beside it and a tower are
-- three places (owner, 2026-11-16). The rows are re-imported later with a
-- name-based rule. Nothing deleted. Idempotent.

UPDATE curated_poi SET status = 'removed', removed_at = '2026-11-16', removed_by = 'kan-461',
       removal_reason = 'KAN-461: Lisbon landmark pilot reverted — distance-only duplicate check; re-import with the name rule'
 WHERE status = 'active' AND import_run_id = 'kan461-osm-historic-lisbon-20261116';
