-- KAN-461. Delete what we rejected, keep why (owner, 2026-11-17: "I don't
-- want to pay for space filled with that crap" / "If they were rejected,
-- there is a reason"). Runs after 0092.
--
-- The rejection list is poi_source_correction with visible = 0. Every row
-- deleted here either already has a marker there, gets one first, or was
-- rejected by a rule the loader now applies before staging (a category we do
-- not serve). The importers check the list inside their own SQL
-- (extraction/rejection_registry.py), so nothing deleted here can come back:
--
--   overture_candidate  load_overture_candidates: no rejected GERS id, and no
--                       new row in REJECTED_CATEGORIES;
--   curated_poi         import_osm_archive / import_landmarks /
--                       import_foursquare_tourism: no rejected origin.
--
-- What goes:
--   1. curated_poi rows withdrawn (status 'removed'), with their attributes —
--      except source 'manual': a contributor's row is its own audit trail;
--   2. overture_poi rows hidden by a marker, with their types and attributes;
--   3. overture_candidate rows rejected by promotion, and the staged copies of
--      the hidden rows.
-- Mall-list rows (origin mall_directory) get no marker: the list is ours and
-- re-importing it is a reviewed act.
--
-- Bounded: the big deletes run 5,000 rows per statement and repeat until
-- empty; every statement is a no-op once done. PERMANENT — the deleted
-- rows' sources stay in R2 (overture-country-sources/, the OSM and Foursquare
-- archives); the decision stays here as the marker.

-- Markers first, so nothing is deleted without its reason on record.
INSERT INTO poi_source_correction (source, source_id, visible, review_note, created_at)
SELECT CASE origin_source WHEN 'openstreetmap' THEN 'openstreetmap' WHEN 'osm' THEN 'openstreetmap' WHEN 'foursquare' THEN 'foursquare' WHEN 'foursquare_os_places' THEN 'foursquare' WHEN 'overture' THEN 'overture' END, origin_id, 0,
       'KAN-461 deleted: ' || COALESCE(removal_reason, 'withdrawn'), '2026-11-17'
  FROM curated_poi
 WHERE status = 'removed' AND source <> 'manual'
   AND origin_source IN ('openstreetmap', 'osm', 'foursquare', 'foursquare_os_places') AND origin_id IS NOT NULL
ON CONFLICT (source, source_id) DO UPDATE SET visible = 0;

INSERT INTO poi_source_correction (source, source_id, visible, review_note, created_at)
SELECT 'overture', overture_id, 0, 'KAN-461 deleted: ' || COALESCE(promotion_note, 'rejected'), '2026-11-17'
  FROM overture_candidate
 WHERE promotion_status = 'rejected'
   AND (category IS NULL OR category NOT IN ('automobile_leasing', 'automotive_repair', 'boat_dealer', 'car_broker', 'car_dealer', 'commercial_vehicle_dealer', 'community_services_non_profits', 'dance_school', 'dentist', 'diagnostic_services', 'driving_school', 'holiday_rental_home', 'hospital', 'hotel', 'insurance_agency', 'lawyer', 'motorcycle_dealer', 'motorsport_vehicle_dealer', 'psychologist', 'restaurant_equipment_and_supply', 'restaurant_wholesale', 'scooter_dealers', 'truck_dealer', 'used_car_dealer'))
ON CONFLICT (source, source_id) DO NOTHING;

-- 1. Withdrawn curated rows.
DELETE FROM curated_poi_attribute WHERE poi_id IN (SELECT poi_id FROM curated_poi WHERE status = 'removed' AND source <> 'manual');
DELETE FROM curated_poi WHERE status = 'removed' AND source <> 'manual';

-- 2. Hidden Overture rows.
DELETE FROM overture_poi_type WHERE overture_id IN (SELECT source_id FROM poi_source_correction WHERE source = 'overture' AND visible = 0);
DELETE FROM overture_poi_attribute WHERE overture_id IN (SELECT source_id FROM poi_source_correction WHERE source = 'overture' AND visible = 0);
DELETE FROM overture_poi WHERE overture_id IN (SELECT source_id FROM poi_source_correction WHERE source = 'overture' AND visible = 0);

-- 3. Staging rows: the hidden rows' copies, then every promotion rejection.
DELETE FROM overture_candidate WHERE overture_id IN (SELECT source_id FROM poi_source_correction WHERE source = 'overture' AND visible = 0);
DELETE FROM overture_candidate WHERE overture_id IN (SELECT overture_id FROM overture_candidate WHERE promotion_status = 'rejected' LIMIT 5000);
DELETE FROM overture_candidate WHERE overture_id IN (SELECT overture_id FROM overture_candidate WHERE promotion_status = 'rejected' LIMIT 5000);
DELETE FROM overture_candidate WHERE overture_id IN (SELECT overture_id FROM overture_candidate WHERE promotion_status = 'rejected' LIMIT 5000);
DELETE FROM overture_candidate WHERE overture_id IN (SELECT overture_id FROM overture_candidate WHERE promotion_status = 'rejected' LIMIT 5000);
DELETE FROM overture_candidate WHERE overture_id IN (SELECT overture_id FROM overture_candidate WHERE promotion_status = 'rejected' LIMIT 5000);
DELETE FROM overture_candidate WHERE overture_id IN (SELECT overture_id FROM overture_candidate WHERE promotion_status = 'rejected' LIMIT 5000);
DELETE FROM overture_candidate WHERE overture_id IN (SELECT overture_id FROM overture_candidate WHERE promotion_status = 'rejected' LIMIT 5000);
DELETE FROM overture_candidate WHERE overture_id IN (SELECT overture_id FROM overture_candidate WHERE promotion_status = 'rejected' LIMIT 5000);
DELETE FROM overture_candidate WHERE overture_id IN (SELECT overture_id FROM overture_candidate WHERE promotion_status = 'rejected' LIMIT 5000);
DELETE FROM overture_candidate WHERE overture_id IN (SELECT overture_id FROM overture_candidate WHERE promotion_status = 'rejected' LIMIT 5000);
