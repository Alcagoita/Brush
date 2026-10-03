-- KAN-471. Where a native name came from.
--
-- 0049 added `name_local` but nothing about its origin. A name we looked up
-- in Wikidata (CC0), one the owner confirmed by hand, and one this repo
-- derived from a descriptor are three different claims with three different
-- licences, and "where did this string come from" has to stay answerable —
-- the same reason `poi_source_correction.name_source` exists for overrides
-- and `poi` records source identity.
ALTER TABLE overture_poi ADD COLUMN name_local_source TEXT;
ALTER TABLE overture_poi ADD COLUMN name_local_source_ref TEXT;
ALTER TABLE overture_poi ADD COLUMN name_local_updated_at TEXT;
