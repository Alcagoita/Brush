-- KAN-460. Additive: old imports keep their original name; a missing
-- translation stays NULL rather than being inferred from the spelling.
ALTER TABLE overture_candidate ADD COLUMN name_local TEXT;
ALTER TABLE overture_candidate ADD COLUMN name_en TEXT;
ALTER TABLE overture_candidate ADD COLUMN name_local_lang TEXT;
ALTER TABLE overture_poi ADD COLUMN name_local TEXT;
ALTER TABLE overture_poi ADD COLUMN name_en TEXT;
ALTER TABLE overture_poi ADD COLUMN name_local_lang TEXT;
ALTER TABLE curated_poi ADD COLUMN name_local TEXT;
ALTER TABLE curated_poi ADD COLUMN name_en TEXT;
ALTER TABLE curated_poi ADD COLUMN name_local_lang TEXT;
