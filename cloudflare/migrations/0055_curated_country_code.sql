-- KAN-471. `curated_poi` could never show a native name.
--
-- 0049 gave it `name_local`, `name_en` and `name_local_lang`, but no country
-- — and `selectPoiName` resolves the user's per-country choice from the
-- row's own `country_code`. Without one it takes the no-country branch and
-- returns the source name, so a native name written on a curated row would
-- never have been displayed. All 9,978 active rows were affected.
--
-- Every curated row is Portuguese today: the registry is PT-only, the
-- community rows come from the PT Foursquare archive, and the manual and
-- mall-tenant rows were all entered for PT venues. The value is set
-- explicitly rather than inferred so that the first non-PT curated row has
-- to say what it is instead of inheriting a wrong default.
--
-- Guarded on NULL, so a re-run changes nothing and a row that already
-- carries a country keeps it.
ALTER TABLE curated_poi ADD COLUMN country_code TEXT;

UPDATE curated_poi SET country_code = 'PT' WHERE country_code IS NULL;
