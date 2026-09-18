-- KAN-452. Provenance on curated_poi.
--
-- The registry rule since 2026-09-18: Overture is the base, and every served
-- place that is not Overture is a curated_poi row of ours. curated_poi was
-- built (0008) for two kinds of row — a moderator's manual entry and an
-- approved community suggestion — and records nothing about where a row's
-- data came from. Once recovered Foursquare landmarks, OSM-placed mall
-- tenants and hand-typed entries share the table, "where did this come from"
-- has to be answerable from the row, and an importer run twice has to be a
-- no-op rather than 294 more rows.
--
-- Additive only. No table is rebuilt, no row is deleted, no value that is
-- already there changes.

ALTER TABLE curated_poi ADD COLUMN origin_source  TEXT;  -- 'osm', 'foursquare_os_places', 'operator_list', 'multibanco', …; NULL = moderator-created
ALTER TABLE curated_poi ADD COLUMN origin_id      TEXT;  -- the id in that dataset, in that dataset's own shape ('way/123', a GERS id, …)
ALTER TABLE curated_poi ADD COLUMN origin_licence TEXT;  -- the licence the origin carries ('ODbL', 'Apache-2.0', …); NULL = not asserted
ALTER TABLE curated_poi ADD COLUMN imported_at    TEXT;
ALTER TABLE curated_poi ADD COLUMN import_run_id  TEXT;

-- The idempotency guarantee every importer relies on: the same origin row
-- can be a curated_poi at most once. Partial, so moderator-created rows
-- (both NULL) never collide with each other.
CREATE UNIQUE INDEX IF NOT EXISTS idx_curated_poi_origin
  ON curated_poi (origin_source, origin_id)
  WHERE origin_source IS NOT NULL AND origin_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Backfill — only where the origin is derivable from what the row already
-- says. Measured on production 2026-09-18 (294 rows):
--
--   157  mall:way-N / mall:node-N   KAN-435 mall tenants placed from the OSM
--                                   element whose id is in the poi_id. 157
--                                   distinct ids, so the unique index holds.
--   105  multibanco:*               the Odivelas ATM pilot, every one joined
--                                   to multibanco_import_staging by poi_id,
--                                   which holds the raw payload.
--    26  mall:pt-<lat>-<lng>        KAN-435 tenants the operator's list named
--                                   but no source could place; a point was
--                                   set by hand. The list file and line are
--                                   not recorded anywhere, so there is no
--                                   origin_id to write. Left NULL on purpose.
--     6  community:*                moderator-approved suggestions. NULL by
--                                   definition.
--
-- Every UPDATE is guarded on origin_source IS NULL so re-running this file
-- changes nothing.

UPDATE curated_poi
   SET origin_source  = 'osm',
       -- 'mall:way-123' -> 'way/123', the shape osm_poi.osm_element_id and
       -- supplement_osm_pois.py use.
       origin_id      = replace(substr(poi_id, 6), '-', '/'),
       origin_licence = 'ODbL',
       imported_at    = created_at
 WHERE origin_source IS NULL
   AND (poi_id GLOB 'mall:way-[0-9]*' OR poi_id GLOB 'mall:node-[0-9]*');

UPDATE curated_poi
   SET origin_source  = 'multibanco',
       -- Same string as multibanco_import_staging.source_id, so the raw
       -- payload is one join away. The licence is the provider's own terms,
       -- not an open licence, so none is asserted here.
       origin_id      = poi_id,
       imported_at    = created_at
 WHERE origin_source IS NULL
   AND poi_id LIKE 'multibanco:%'
   AND EXISTS (SELECT 1 FROM multibanco_import_staging s WHERE s.source_id = curated_poi.poi_id);
