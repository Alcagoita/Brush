-- KAN-455. The reviewed batch kan455_reviewed_multi_type names three rows
-- production already serves, and an override batch cannot retype a served
-- row: its writes are INSERT OR IGNORE, so `Zara by Castro` would keep
-- `store`/`clothing`/Zara at rank 0 with `bakery` beside it. This applies
-- the reviewed decision to the served rows by exact id, in 0041's shape.
-- `Auchan Gasolineira` is not served; the batch's rejection covers it.
-- Idempotent. Apply after 0044 and before the override batches.
-- 3 rows corrected.
-- Zara by Castro: a pastelaria, never the clothing chain.
UPDATE overture_poi SET primary_poi_type = 'bakery', brand = NULL WHERE overture_id = '3c15c3f0-346e-40b5-bda9-af51e2ed9c08';
DELETE FROM overture_poi_type WHERE overture_id = '3c15c3f0-346e-40b5-bda9-af51e2ed9c08';
INSERT OR IGNORE INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('3c15c3f0-346e-40b5-bda9-af51e2ed9c08','bakery',0);
DELETE FROM overture_poi_attribute WHERE overture_id = '3c15c3f0-346e-40b5-bda9-af51e2ed9c08' AND dimension = 'store_kind';
-- Opticalia Farmacia Silveira (Algueirão, Mem Martins): a pharmacy that is also an optician.
DELETE FROM overture_poi_type WHERE overture_id = 'c8761ae1-5d79-48b9-aeca-08172d8aec28';
INSERT OR IGNORE INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('c8761ae1-5d79-48b9-aeca-08172d8aec28','pharmacy',0);
INSERT OR IGNORE INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('c8761ae1-5d79-48b9-aeca-08172d8aec28','store',1);
DELETE FROM overture_poi_attribute WHERE overture_id = 'c8761ae1-5d79-48b9-aeca-08172d8aec28' AND dimension = 'store_kind';
INSERT OR IGNORE INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('c8761ae1-5d79-48b9-aeca-08172d8aec28','store_kind','eyewear_and_optician');
DELETE FROM overture_poi_type WHERE overture_id = 'fd7cbee5-03eb-4de6-a326-18b663b1db67';
INSERT OR IGNORE INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('fd7cbee5-03eb-4de6-a326-18b663b1db67','pharmacy',0);
INSERT OR IGNORE INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('fd7cbee5-03eb-4de6-a326-18b663b1db67','store',1);
DELETE FROM overture_poi_attribute WHERE overture_id = 'fd7cbee5-03eb-4de6-a326-18b663b1db67' AND dimension = 'store_kind';
INSERT OR IGNORE INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('fd7cbee5-03eb-4de6-a326-18b663b1db67','store_kind','eyewear_and_optician');
