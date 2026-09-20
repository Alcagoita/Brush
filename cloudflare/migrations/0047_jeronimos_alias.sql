-- KAN-433. Mosteiro dos Jerónimos was served twice after the PT Tier 1
-- import: Overture's "Jerónimos Monastery" (church, 12 m from the reference
-- point) and the Foursquare row "Mosteiro De Santa Maria De Belém" — the
-- same monastery under its formal name, 103 m away, so neither the 75 m
-- name match nor the 25 m translation match paired them. Owner decision
-- 2026-09-20: one visible, Overture's. The curated row is removed (status,
-- never deleted); a Foursquare-keyed correction records the decision so the
-- importer's dedupe reports it, and the Overture row gains the
-- historical_landmark type the alias was answering. Idempotent.
UPDATE curated_poi
   SET status = 'removed', removed_at = '2026-09-20', removed_by = 'kan-433',
       removal_reason = 'KAN-433: alias of Overture ee495395-584e-4a19-8cc7-0274a668ea40 (Jerónimos Monastery), owner decision 2026-09-20',
       updated_at = '2026-09-20', updated_by = 'kan-433'
 WHERE poi_id = 'fsq:5e14cb44a5504400086f956f' AND status = 'active';
INSERT OR IGNORE INTO poi_source_correction (source, source_id, visible, review_note, created_at) VALUES
('foursquare','5e14cb44a5504400086f956f',0,'KAN-433: "Mosteiro De Santa Maria De Belém" is the formal name of Overture ee495395-584e-4a19-8cc7-0274a668ea40 (Jerónimos Monastery); one visible, owner decision 2026-09-20','2026-09-20');
INSERT OR IGNORE INTO overture_poi_type (overture_id, poi_type, rank) VALUES
('ee495395-584e-4a19-8cc7-0274a668ea40','historical_landmark',1);
