-- KAN-517. Strada Outlet, owner rulings 2026-11-15:
-- Jardim Verde is a supplements shop (store/vitamins_and_supplements), Mineral Store
-- sells summer clothing (store/swimwear), and the Cartório Notarial de Odivelas is
-- written as local_government_office, at the centre on Piso 2. Idempotent.

UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272981';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272981' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272981', 'store_kind', 'vitamins_and_supplements');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272987';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272987' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272987', 'store_kind', 'swimwear');
INSERT INTO curated_poi (poi_id, source, name, dedupe_name, lat, lng, geohash, primary_poi_type, brand, address, floor, country_code, status, created_at, created_by, updated_at, updated_by, origin_source, origin_id, origin_licence, imported_at, import_run_id) VALUES
('mall:strada:cartorio-notarial-de-odivelas', 'community', 'Cartório Notarial de Odivelas', 'cartorio notarial de odivelas', 38.7822619, -9.1924735, 'eyckwu45p', 'local_government_office', NULL, NULL, '2', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:strada:cartorio-notarial-de-odivelas', 'ODbL', '2026-11-15', 'kan-517-strada-2026-11-15')
ON CONFLICT (poi_id) DO NOTHING;
