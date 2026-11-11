-- KAN-439. Two data faults found in review of PR #445, both written by this
-- ticket and both now fixed in the code that produced them.
--
-- 1. A STORE KIND WRITTEN AS A POI TYPE
--
-- `resolve_mall_types` carried a row's types and its store kind in one tuple
-- and read position 1 as the kind. That holds for `('store',) + ('phone',)`
-- and breaks the moment a row has two real types: the second type is written
-- as the kind and the kind as a type. Four rows reached production with a
-- `poi_type` attribute whose value is a store kind, so nearby would offer
-- them under a type that does not exist:
--
--   mall:ubbo:tudo4mobile                   poi_type=phone
--   mall:ubbo:worten                        poi_type=electronics
--   mall:ubbo:worten-mobile                 poi_type=electronics
--   mall:amoreiras:la-casa-de-las-carcasas  poi_type=phone
--
-- Each already carries the same value as its `store_kind`, which is correct
-- and stays. Only the bogus `poi_type` rows are deleted.
--
-- 2. A LISTED UNIT THE IMPORT COULD NOT EXPRESS
--
-- UBBO lists `Snipes` twice, two real units on the same floor (owner,
-- 2026-10-04). `poi_id` was derived from the tenant name alone, so both
-- entries produced one id and `ON CONFLICT DO NOTHING` kept one; the first
-- also consumed the single held `SNIPES` row, so the second unit vanished
-- entirely. Production held one Snipes where the operator lists two.
--
-- The writer now consumes held rows and OSM locations one-to-one and suffixes
-- a repeated listing, with the FIRST occurrence keeping its bare id so no id
-- already in production moves. The second unit is added here, at the centre's
-- centroid like any tenant nothing can place, typed `store` + `shoes` from
-- the row we hold elsewhere in Portugal.
--
-- Both statements are idempotent.
DELETE FROM curated_poi_attribute
 WHERE dimension = 'poi_type'
   AND (poi_id, value) IN (
     VALUES ('mall:ubbo:tudo4mobile', 'phone'),
            ('mall:ubbo:worten', 'electronics'),
            ('mall:ubbo:worten-mobile', 'electronics'),
            ('mall:amoreiras:la-casa-de-las-carcasas', 'phone')
   );

INSERT INTO curated_poi
  (poi_id, source, name, dedupe_name, lat, lng, geohash, primary_poi_type,
   address, floor, country_code, status, created_at, created_by, updated_at,
   updated_by, origin_source, origin_id, origin_licence, imported_at, import_run_id)
VALUES
  ('mall:ubbo:snipes-2', 'community', 'Snipes', 'snipes',
   38.7769534, -9.2204064, 'eyckw5juh', 'store',
   NULL, NULL, 'PT', 'active', '2026-10-24', 'kan-439-mall-tenants', '2026-10-24',
   'kan-439-mall-tenants', 'mall_directory', 'mall:ubbo:snipes-2', 'ODbL',
   '2026-10-24', 'kan439-20261024')
ON CONFLICT (poi_id) DO NOTHING;

INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value)
VALUES ('mall:ubbo:snipes-2', 'store_kind', 'shoes');
