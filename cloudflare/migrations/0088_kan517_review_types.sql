-- KAN-517 review. Rows 0081/0083/0084 typed from stale centre type tables that
-- contradict the person's rulings in tenant_type_overrides.json: Tefal is cookware
-- (store/kitchen_supply, not childrens_clothing); Zara Home is store/home; Flying
-- Tiger is store/gift (not florist); Timberland store/shoes; IUMAN Intimissimi Uomo
-- store/mens_clothing; Brownie store/womens_clothing. Tables corrected in the same
-- commit. Idempotent.

UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '625798cc-b4dc-481a-b662-af00481b6512';
DELETE FROM overture_poi_type WHERE overture_id = '625798cc-b4dc-481a-b662-af00481b6512';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('625798cc-b4dc-481a-b662-af00481b6512', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '625798cc-b4dc-481a-b662-af00481b6512' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('625798cc-b4dc-481a-b662-af00481b6512', 'store_kind', 'kitchen_supply');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '99ffda47-5eeb-4aa6-b54b-5baeca3cf372';
DELETE FROM overture_poi_type WHERE overture_id = '99ffda47-5eeb-4aa6-b54b-5baeca3cf372';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('99ffda47-5eeb-4aa6-b54b-5baeca3cf372', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '99ffda47-5eeb-4aa6-b54b-5baeca3cf372' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('99ffda47-5eeb-4aa6-b54b-5baeca3cf372', 'store_kind', 'shoes');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '1ad1bc31-2a78-4124-9257-4fea863f8792';
DELETE FROM overture_poi_type WHERE overture_id = '1ad1bc31-2a78-4124-9257-4fea863f8792';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('1ad1bc31-2a78-4124-9257-4fea863f8792', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '1ad1bc31-2a78-4124-9257-4fea863f8792' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('1ad1bc31-2a78-4124-9257-4fea863f8792', 'store_kind', 'gift');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'f535be8f-dcbe-431e-a313-d3795e3e9f09';
DELETE FROM overture_poi_type WHERE overture_id = 'f535be8f-dcbe-431e-a313-d3795e3e9f09';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('f535be8f-dcbe-431e-a313-d3795e3e9f09', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'f535be8f-dcbe-431e-a313-d3795e3e9f09' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('f535be8f-dcbe-431e-a313-d3795e3e9f09', 'store_kind', 'shoes');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '9175219f-0072-4809-88c4-1b22c2fa01b5';
DELETE FROM overture_poi_type WHERE overture_id = '9175219f-0072-4809-88c4-1b22c2fa01b5';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('9175219f-0072-4809-88c4-1b22c2fa01b5', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '9175219f-0072-4809-88c4-1b22c2fa01b5' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('9175219f-0072-4809-88c4-1b22c2fa01b5', 'store_kind', 'home');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1465610349';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1465610349' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1465610349', 'store_kind', 'womens_clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'd34c6300-a90e-4357-b4e2-d1a2580dab5f';
DELETE FROM overture_poi_type WHERE overture_id = 'd34c6300-a90e-4357-b4e2-d1a2580dab5f';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d34c6300-a90e-4357-b4e2-d1a2580dab5f', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd34c6300-a90e-4357-b4e2-d1a2580dab5f' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('d34c6300-a90e-4357-b4e2-d1a2580dab5f', 'store_kind', 'gift');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '34f70553-8eec-483b-9d9a-83a9d20a826d';
DELETE FROM overture_poi_type WHERE overture_id = '34f70553-8eec-483b-9d9a-83a9d20a826d';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('34f70553-8eec-483b-9d9a-83a9d20a826d', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '34f70553-8eec-483b-9d9a-83a9d20a826d' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('34f70553-8eec-483b-9d9a-83a9d20a826d', 'store_kind', 'mens_clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'd26de3ed-4af4-490c-b978-4c50ffe1d032';
DELETE FROM overture_poi_type WHERE overture_id = 'd26de3ed-4af4-490c-b978-4c50ffe1d032';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d26de3ed-4af4-490c-b978-4c50ffe1d032', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd26de3ed-4af4-490c-b978-4c50ffe1d032' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('d26de3ed-4af4-490c-b978-4c50ffe1d032', 'store_kind', 'shoes');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:brownie';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:brownie' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:brownie', 'store_kind', 'womens_clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:zara-home';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:zara-home' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:zara-home', 'store_kind', 'home');
