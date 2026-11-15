-- KAN-517. Vasco da Gama holds exactly the units its operator lists (owner, 2026-11-15).
-- The five units marked opening in August are open now. Written by
-- reconcile_mall_list.py from vasco_da_gama_stores.txt + vasco_da_gama_eating.txt.
-- Not written: 2 Life, COOLAND, Grazze, Intercentro, JUST K, JMB (untyped); BERSKA is
-- the operator's typo for BERSHKA. Nothing deleted.

INSERT INTO poi_source_correction (source, source_id, visible, review_note, created_at) VALUES
  ('overture', 'a10c2a65-3daf-436e-a0d8-713987cb23f9', 0, 'KAN-517: same shop as listed ''KIKO MILANO'', held twice; the other row kept', '2026-11-15'),
  ('overture', 'dcebe0b7-30c6-43da-b76e-0e735056c0d6', 0, 'KAN-517: same shop as listed ''MAIS ÓPTICA'', held twice; the other row kept', '2026-11-15'),
  ('overture', 'eba128b4-f109-41d8-8371-7ebf029e1e78', 0, 'KAN-517: same shop as listed ''Presse Linha'', held twice; the other row kept', '2026-11-15'),
  ('overture', 'b9749fa8-8136-4254-a6d0-c2038c075bb5', 0, 'KAN-517: same shop as listed "LEVI''S", held twice; the other row kept', '2026-11-15'),
  ('overture', '0038bc86-5e6a-4825-b2a9-c00cbaca8094', 0, 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list', '2026-11-15'),
  ('overture', '174f17e2-94e0-4811-b50c-42bf9c8f09de', 0, 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list', '2026-11-15'),
  ('overture', '2c82050b-4577-4344-a15e-507fad860c79', 0, 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list', '2026-11-15'),
  ('overture', '4fe21b2b-dcce-4929-bf1b-ed0f7e8a34e4', 0, 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list', '2026-11-15'),
  ('overture', '59f04c74-5c2d-498e-916f-1d5957dfe835', 0, 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list', '2026-11-15'),
  ('overture', '604af41d-84fe-4f82-9bfa-62d84ec6899a', 0, 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list', '2026-11-15'),
  ('overture', '83d4133c-95fc-4ad6-aa81-155460a11a18', 0, 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list', '2026-11-15'),
  ('overture', '8d9d9b8c-559a-4bec-a29b-cfe2b951679d', 0, 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list', '2026-11-15'),
  ('overture', 'a26f7745-ec3c-4644-890f-a34fb6c50f36', 0, 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list', '2026-11-15'),
  ('overture', 'd37e15c6-fab9-41f6-bb8a-45beef611ab5', 0, 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list', '2026-11-15'),
  ('overture', 'dc6e4231-bcd5-4291-bc51-c4182186b20c', 0, 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list', '2026-11-15'),
  ('overture', 'dd837e4d-cd59-4a4a-9288-cf0b36278c4a', 0, 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list', '2026-11-15'),
  ('overture', 'e8f6e17a-f11c-4b5b-9f75-e2ecbe701972', 0, 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list', '2026-11-15'),
  ('overture', 'eca9cfcd-f66b-4ffa-a5e2-16b2f6338067', 0, 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list', '2026-11-15'),
  ('overture', 'f42717da-1ce7-4572-aaa6-93e102a0b075', 0, 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list', '2026-11-15'),
  ('overture', 'f7f62fe7-ac4c-4797-99c9-b6549d9e5f52', 0, 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list', '2026-11-15'),
  ('overture', 'fc8fb80e-06d9-4458-a6c6-bb8ce215281a', 0, 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list', '2026-11-15'),
  ('overture', 'fda3708a-0405-400f-b4a3-b6f5be2126ac', 0, 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list', '2026-11-15'),
  ('overture', '8f7b1aea-40b1-4f6f-9bd7-491ae46adb7e', 0, 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list', '2026-11-15'),
  ('overture', '1d41b6b5-a32a-4d82-ba4a-84bec26f3081', 0, 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list', '2026-11-15')
ON CONFLICT (source, source_id) DO UPDATE SET visible = 0, review_note = excluded.review_note;
UPDATE curated_poi SET status = 'removed', removed_at = '2026-11-15', removed_by = 'kan-439-mall-tenants', removal_reason = 'KAN-517: same shop as listed ''BERTRAND LIVREIROS'', held twice; the other row kept' WHERE status = 'active' AND poi_id = 'mall:way-1057242987';
UPDATE overture_poi SET primary_poi_type = 'bank', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'd8dffd67-b832-45f4-96ba-b1cae1721334';
DELETE FROM overture_poi_type WHERE overture_id = 'd8dffd67-b832-45f4-96ba-b1cae1721334';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d8dffd67-b832-45f4-96ba-b1cae1721334', 'bank', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd8dffd67-b832-45f4-96ba-b1cae1721334' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'hairdresser', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '2c0d684a-27f0-4fea-8cd1-cdfd965b0699';
DELETE FROM overture_poi_type WHERE overture_id = '2c0d684a-27f0-4fea-8cd1-cdfd965b0699';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('2c0d684a-27f0-4fea-8cd1-cdfd965b0699', 'hairdresser', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '2c0d684a-27f0-4fea-8cd1-cdfd965b0699' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'c11feac2-869f-4f98-8b28-16f6e0745f35';
DELETE FROM overture_poi_type WHERE overture_id = 'c11feac2-869f-4f98-8b28-16f6e0745f35';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('c11feac2-869f-4f98-8b28-16f6e0745f35', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'c11feac2-869f-4f98-8b28-16f6e0745f35' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('c11feac2-869f-4f98-8b28-16f6e0745f35', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '238a9339-944c-4e59-907c-7a1338250337';
DELETE FROM overture_poi_type WHERE overture_id = '238a9339-944c-4e59-907c-7a1338250337';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('238a9339-944c-4e59-907c-7a1338250337', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '238a9339-944c-4e59-907c-7a1338250337' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('238a9339-944c-4e59-907c-7a1338250337', 'store_kind', 'books');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'a46aa44a-996c-44d7-9686-9a3477348b27';
DELETE FROM overture_poi_type WHERE overture_id = 'a46aa44a-996c-44d7-9686-9a3477348b27';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('a46aa44a-996c-44d7-9686-9a3477348b27', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'a46aa44a-996c-44d7-9686-9a3477348b27' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('a46aa44a-996c-44d7-9686-9a3477348b27', 'store_kind', 'jewelry');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '3843ffa1-d453-4810-832d-89a9f74d1c02';
DELETE FROM overture_poi_type WHERE overture_id = '3843ffa1-d453-4810-832d-89a9f74d1c02';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('3843ffa1-d453-4810-832d-89a9f74d1c02', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '3843ffa1-d453-4810-832d-89a9f74d1c02' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('3843ffa1-d453-4810-832d-89a9f74d1c02', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '15304ee2-7185-4084-ad43-8ed22f0fbab9';
DELETE FROM overture_poi_type WHERE overture_id = '15304ee2-7185-4084-ad43-8ed22f0fbab9';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('15304ee2-7185-4084-ad43-8ed22f0fbab9', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '15304ee2-7185-4084-ad43-8ed22f0fbab9' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('15304ee2-7185-4084-ad43-8ed22f0fbab9', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '3d95dc6d-2c3b-43a3-ac9d-0ec5ec5b208c';
DELETE FROM overture_poi_type WHERE overture_id = '3d95dc6d-2c3b-43a3-ac9d-0ec5ec5b208c';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('3d95dc6d-2c3b-43a3-ac9d-0ec5ec5b208c', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '3d95dc6d-2c3b-43a3-ac9d-0ec5ec5b208c' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('3d95dc6d-2c3b-43a3-ac9d-0ec5ec5b208c', 'store_kind', 'womens_clothing');
UPDATE overture_poi SET primary_poi_type = 'supermarket', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '9f0e16b5-fbf9-46a5-b784-29b77b8d7d10';
DELETE FROM overture_poi_type WHERE overture_id = '9f0e16b5-fbf9-46a5-b784-29b77b8d7d10';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('9f0e16b5-fbf9-46a5-b784-29b77b8d7d10', 'supermarket', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '9f0e16b5-fbf9-46a5-b784-29b77b8d7d10' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'movie_theater', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '7bdf8ae5-38a6-4a4f-adae-9aeeb24b1b9d';
DELETE FROM overture_poi_type WHERE overture_id = '7bdf8ae5-38a6-4a4f-adae-9aeeb24b1b9d';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('7bdf8ae5-38a6-4a4f-adae-9aeeb24b1b9d', 'movie_theater', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '7bdf8ae5-38a6-4a4f-adae-9aeeb24b1b9d' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'supermarket', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '15eb26c7-8d0f-45d2-978c-bd1cc2661d59';
DELETE FROM overture_poi_type WHERE overture_id = '15eb26c7-8d0f-45d2-978c-bd1cc2661d59';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('15eb26c7-8d0f-45d2-978c-bd1cc2661d59', 'supermarket', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '15eb26c7-8d0f-45d2-978c-bd1cc2661d59' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '6e090446-8072-4a81-91cb-922e1083e78f';
DELETE FROM overture_poi_type WHERE overture_id = '6e090446-8072-4a81-91cb-922e1083e78f';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('6e090446-8072-4a81-91cb-922e1083e78f', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '6e090446-8072-4a81-91cb-922e1083e78f' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('6e090446-8072-4a81-91cb-922e1083e78f', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '37b2e5e6-ce00-4262-bb02-43d673f1f65d';
DELETE FROM overture_poi_type WHERE overture_id = '37b2e5e6-ce00-4262-bb02-43d673f1f65d';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('37b2e5e6-ce00-4262-bb02-43d673f1f65d', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '37b2e5e6-ce00-4262-bb02-43d673f1f65d' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('37b2e5e6-ce00-4262-bb02-43d673f1f65d', 'store_kind', 'beauty');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'ddd29aec-0abe-4b6b-a0c8-05186f2320eb';
DELETE FROM overture_poi_type WHERE overture_id = 'ddd29aec-0abe-4b6b-a0c8-05186f2320eb';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('ddd29aec-0abe-4b6b-a0c8-05186f2320eb', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'ddd29aec-0abe-4b6b-a0c8-05186f2320eb' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('ddd29aec-0abe-4b6b-a0c8-05186f2320eb', 'store_kind', 'sports');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '1f3675a6-cdab-47fe-90bc-e09cd4552d3e';
DELETE FROM overture_poi_type WHERE overture_id = '1f3675a6-cdab-47fe-90bc-e09cd4552d3e';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('1f3675a6-cdab-47fe-90bc-e09cd4552d3e', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '1f3675a6-cdab-47fe-90bc-e09cd4552d3e' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('1f3675a6-cdab-47fe-90bc-e09cd4552d3e', 'store_kind', 'books');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'a9965ed8-2542-43bf-abf2-510ed82231fb';
DELETE FROM overture_poi_type WHERE overture_id = 'a9965ed8-2542-43bf-abf2-510ed82231fb';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('a9965ed8-2542-43bf-abf2-510ed82231fb', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'a9965ed8-2542-43bf-abf2-510ed82231fb' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('a9965ed8-2542-43bf-abf2-510ed82231fb', 'store_kind', 'photography_store_and_services');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'd10d64e9-2b29-408f-895a-3f3e26063ed9';
DELETE FROM overture_poi_type WHERE overture_id = 'd10d64e9-2b29-408f-895a-3f3e26063ed9';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d10d64e9-2b29-408f-895a-3f3e26063ed9', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd10d64e9-2b29-408f-895a-3f3e26063ed9' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('d10d64e9-2b29-408f-895a-3f3e26063ed9', 'store_kind', 'jewelry');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'd70086a9-e666-4bee-9125-491497d74ea2';
DELETE FROM overture_poi_type WHERE overture_id = 'd70086a9-e666-4bee-9125-491497d74ea2';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d70086a9-e666-4bee-9125-491497d74ea2', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd70086a9-e666-4bee-9125-491497d74ea2' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('d70086a9-e666-4bee-9125-491497d74ea2', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'cc8862a8-07f4-4f33-b056-5599790cc9ed';
DELETE FROM overture_poi_type WHERE overture_id = 'cc8862a8-07f4-4f33-b056-5599790cc9ed';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('cc8862a8-07f4-4f33-b056-5599790cc9ed', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'cc8862a8-07f4-4f33-b056-5599790cc9ed' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('cc8862a8-07f4-4f33-b056-5599790cc9ed', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'bfdf2fac-4f23-41f5-99d3-e27929bbbd62';
DELETE FROM overture_poi_type WHERE overture_id = 'bfdf2fac-4f23-41f5-99d3-e27929bbbd62';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('bfdf2fac-4f23-41f5-99d3-e27929bbbd62', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'bfdf2fac-4f23-41f5-99d3-e27929bbbd62' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('bfdf2fac-4f23-41f5-99d3-e27929bbbd62', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '8f427ffc-29e0-4554-8ee5-a6fd4404136f';
DELETE FROM overture_poi_type WHERE overture_id = '8f427ffc-29e0-4554-8ee5-a6fd4404136f';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('8f427ffc-29e0-4554-8ee5-a6fd4404136f', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '8f427ffc-29e0-4554-8ee5-a6fd4404136f' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('8f427ffc-29e0-4554-8ee5-a6fd4404136f', 'store_kind', 'childrens_clothing');
UPDATE overture_poi SET primary_poi_type = 'hairdresser', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '749d6da4-1dbb-4dd3-bd5e-fb018a87380e';
DELETE FROM overture_poi_type WHERE overture_id = '749d6da4-1dbb-4dd3-bd5e-fb018a87380e';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('749d6da4-1dbb-4dd3-bd5e-fb018a87380e', 'hairdresser', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '749d6da4-1dbb-4dd3-bd5e-fb018a87380e' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '345f942d-d520-4dc2-91b6-7a22afeb9770';
DELETE FROM overture_poi_type WHERE overture_id = '345f942d-d520-4dc2-91b6-7a22afeb9770';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('345f942d-d520-4dc2-91b6-7a22afeb9770', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '345f942d-d520-4dc2-91b6-7a22afeb9770' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('345f942d-d520-4dc2-91b6-7a22afeb9770', 'store_kind', 'beauty');
UPDATE overture_poi SET primary_poi_type = 'phone_repair', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '406161e1-ec60-466e-bbc6-13406c32108f';
DELETE FROM overture_poi_type WHERE overture_id = '406161e1-ec60-466e-bbc6-13406c32108f';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('406161e1-ec60-466e-bbc6-13406c32108f', 'phone_repair', 0), ('406161e1-ec60-466e-bbc6-13406c32108f', 'store', 1);
DELETE FROM overture_poi_attribute WHERE overture_id = '406161e1-ec60-466e-bbc6-13406c32108f' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('406161e1-ec60-466e-bbc6-13406c32108f', 'store_kind', 'phone');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '8732a696-b71a-4f46-a981-31e04266e113';
DELETE FROM overture_poi_type WHERE overture_id = '8732a696-b71a-4f46-a981-31e04266e113';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('8732a696-b71a-4f46-a981-31e04266e113', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '8732a696-b71a-4f46-a981-31e04266e113' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('8732a696-b71a-4f46-a981-31e04266e113', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '052bc990-5564-4a07-ac39-cb7b61023c8d';
DELETE FROM overture_poi_type WHERE overture_id = '052bc990-5564-4a07-ac39-cb7b61023c8d';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('052bc990-5564-4a07-ac39-cb7b61023c8d', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '052bc990-5564-4a07-ac39-cb7b61023c8d' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('052bc990-5564-4a07-ac39-cb7b61023c8d', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'd0691689-c482-4149-a335-a8f5da027ce7';
DELETE FROM overture_poi_type WHERE overture_id = 'd0691689-c482-4149-a335-a8f5da027ce7';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d0691689-c482-4149-a335-a8f5da027ce7', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd0691689-c482-4149-a335-a8f5da027ce7' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('d0691689-c482-4149-a335-a8f5da027ce7', 'store_kind', 'fashion_accessories');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'c7340112-40ee-4524-a1b1-d8ff113d9618';
DELETE FROM overture_poi_type WHERE overture_id = 'c7340112-40ee-4524-a1b1-d8ff113d9618';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('c7340112-40ee-4524-a1b1-d8ff113d9618', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'c7340112-40ee-4524-a1b1-d8ff113d9618' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('c7340112-40ee-4524-a1b1-d8ff113d9618', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'd4668dd3-c625-4058-a6ca-2d717b7f4a7e';
DELETE FROM overture_poi_type WHERE overture_id = 'd4668dd3-c625-4058-a6ca-2d717b7f4a7e';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d4668dd3-c625-4058-a6ca-2d717b7f4a7e', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd4668dd3-c625-4058-a6ca-2d717b7f4a7e' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('d4668dd3-c625-4058-a6ca-2d717b7f4a7e', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '78aad20a-013d-4e01-bcb4-0e17f96742cc';
DELETE FROM overture_poi_type WHERE overture_id = '78aad20a-013d-4e01-bcb4-0e17f96742cc';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('78aad20a-013d-4e01-bcb4-0e17f96742cc', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '78aad20a-013d-4e01-bcb4-0e17f96742cc' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('78aad20a-013d-4e01-bcb4-0e17f96742cc', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'a8d3a783-4043-4e62-b8f3-7f5d723afce1';
DELETE FROM overture_poi_type WHERE overture_id = 'a8d3a783-4043-4e62-b8f3-7f5d723afce1';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('a8d3a783-4043-4e62-b8f3-7f5d723afce1', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'a8d3a783-4043-4e62-b8f3-7f5d723afce1' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('a8d3a783-4043-4e62-b8f3-7f5d723afce1', 'store_kind', 'eyewear_and_optician');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'cc085b43-e4f9-4d89-a5f9-69b3ddabc128';
DELETE FROM overture_poi_type WHERE overture_id = 'cc085b43-e4f9-4d89-a5f9-69b3ddabc128';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('cc085b43-e4f9-4d89-a5f9-69b3ddabc128', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'cc085b43-e4f9-4d89-a5f9-69b3ddabc128' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('cc085b43-e4f9-4d89-a5f9-69b3ddabc128', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'e8c45ae3-b7a6-4bf0-87f9-789df8fb43fe';
DELETE FROM overture_poi_type WHERE overture_id = 'e8c45ae3-b7a6-4bf0-87f9-789df8fb43fe';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('e8c45ae3-b7a6-4bf0-87f9-789df8fb43fe', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'e8c45ae3-b7a6-4bf0-87f9-789df8fb43fe' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('e8c45ae3-b7a6-4bf0-87f9-789df8fb43fe', 'store_kind', 'coffee_supplies');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'c8240c03-c012-4b92-ad94-7983b441fde3';
DELETE FROM overture_poi_type WHERE overture_id = 'c8240c03-c012-4b92-ad94-7983b441fde3';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('c8240c03-c012-4b92-ad94-7983b441fde3', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'c8240c03-c012-4b92-ad94-7983b441fde3' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('c8240c03-c012-4b92-ad94-7983b441fde3', 'store_kind', 'phone');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'bf074a23-1050-40b9-9ab6-d42405e62157';
DELETE FROM overture_poi_type WHERE overture_id = 'bf074a23-1050-40b9-9ab6-d42405e62157';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('bf074a23-1050-40b9-9ab6-d42405e62157', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'bf074a23-1050-40b9-9ab6-d42405e62157' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('bf074a23-1050-40b9-9ab6-d42405e62157', 'store_kind', 'beauty');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'b3b14757-24f8-45f1-a5d0-1149f5dd83a6';
DELETE FROM overture_poi_type WHERE overture_id = 'b3b14757-24f8-45f1-a5d0-1149f5dd83a6';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('b3b14757-24f8-45f1-a5d0-1149f5dd83a6', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'b3b14757-24f8-45f1-a5d0-1149f5dd83a6' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('b3b14757-24f8-45f1-a5d0-1149f5dd83a6', 'store_kind', 'watch');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '458e4873-50dc-42c6-a1a4-b1542a46748b';
DELETE FROM overture_poi_type WHERE overture_id = '458e4873-50dc-42c6-a1a4-b1542a46748b';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('458e4873-50dc-42c6-a1a4-b1542a46748b', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '458e4873-50dc-42c6-a1a4-b1542a46748b' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('458e4873-50dc-42c6-a1a4-b1542a46748b', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'f687bad9-94fe-4dc0-99a8-aef12fd59cd7';
DELETE FROM overture_poi_type WHERE overture_id = 'f687bad9-94fe-4dc0-99a8-aef12fd59cd7';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('f687bad9-94fe-4dc0-99a8-aef12fd59cd7', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'f687bad9-94fe-4dc0-99a8-aef12fd59cd7' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('f687bad9-94fe-4dc0-99a8-aef12fd59cd7', 'store_kind', 'jewelry');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'acbddb30-b5e3-432c-afc1-2d1856c4c02e';
DELETE FROM overture_poi_type WHERE overture_id = 'acbddb30-b5e3-432c-afc1-2d1856c4c02e';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('acbddb30-b5e3-432c-afc1-2d1856c4c02e', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'acbddb30-b5e3-432c-afc1-2d1856c4c02e' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('acbddb30-b5e3-432c-afc1-2d1856c4c02e', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '57f653f0-dbf1-4948-a747-e642d90d23fd';
DELETE FROM overture_poi_type WHERE overture_id = '57f653f0-dbf1-4948-a747-e642d90d23fd';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('57f653f0-dbf1-4948-a747-e642d90d23fd', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '57f653f0-dbf1-4948-a747-e642d90d23fd' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('57f653f0-dbf1-4948-a747-e642d90d23fd', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'c63f015d-9109-43a3-8040-f37c91ebb238';
DELETE FROM overture_poi_type WHERE overture_id = 'c63f015d-9109-43a3-8040-f37c91ebb238';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('c63f015d-9109-43a3-8040-f37c91ebb238', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'c63f015d-9109-43a3-8040-f37c91ebb238' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('c63f015d-9109-43a3-8040-f37c91ebb238', 'store_kind', 'beauty');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'ca3399ac-076a-45f4-abc2-603e133e5e75';
DELETE FROM overture_poi_type WHERE overture_id = 'ca3399ac-076a-45f4-abc2-603e133e5e75';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('ca3399ac-076a-45f4-abc2-603e133e5e75', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'ca3399ac-076a-45f4-abc2-603e133e5e75' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('ca3399ac-076a-45f4-abc2-603e133e5e75', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'd2277747-7d75-46be-b30d-d02facea22ff';
DELETE FROM overture_poi_type WHERE overture_id = 'd2277747-7d75-46be-b30d-d02facea22ff';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d2277747-7d75-46be-b30d-d02facea22ff', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd2277747-7d75-46be-b30d-d02facea22ff' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('d2277747-7d75-46be-b30d-d02facea22ff', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '08d42b41-1a15-460d-b0cd-f81f19153719';
DELETE FROM overture_poi_type WHERE overture_id = '08d42b41-1a15-460d-b0cd-f81f19153719';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('08d42b41-1a15-460d-b0cd-f81f19153719', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '08d42b41-1a15-460d-b0cd-f81f19153719' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('08d42b41-1a15-460d-b0cd-f81f19153719', 'store_kind', 'handbag');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '12f373e0-c177-42bb-bd22-a2030d6f51f7';
DELETE FROM overture_poi_type WHERE overture_id = '12f373e0-c177-42bb-bd22-a2030d6f51f7';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('12f373e0-c177-42bb-bd22-a2030d6f51f7', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '12f373e0-c177-42bb-bd22-a2030d6f51f7' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('12f373e0-c177-42bb-bd22-a2030d6f51f7', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'd9e18a2a-17f5-4ed3-8d81-7b6cd433a089';
DELETE FROM overture_poi_type WHERE overture_id = 'd9e18a2a-17f5-4ed3-8d81-7b6cd433a089';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d9e18a2a-17f5-4ed3-8d81-7b6cd433a089', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd9e18a2a-17f5-4ed3-8d81-7b6cd433a089' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('d9e18a2a-17f5-4ed3-8d81-7b6cd433a089', 'store_kind', 'beauty');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'c50f4fca-e87e-4eb9-9c2b-a30e4a31d547';
DELETE FROM overture_poi_type WHERE overture_id = 'c50f4fca-e87e-4eb9-9c2b-a30e4a31d547';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('c50f4fca-e87e-4eb9-9c2b-a30e4a31d547', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'c50f4fca-e87e-4eb9-9c2b-a30e4a31d547' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('c50f4fca-e87e-4eb9-9c2b-a30e4a31d547', 'store_kind', 'jewelry');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '390fb405-9e87-4e15-8f62-3c2c3bfe029a';
DELETE FROM overture_poi_type WHERE overture_id = '390fb405-9e87-4e15-8f62-3c2c3bfe029a';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('390fb405-9e87-4e15-8f62-3c2c3bfe029a', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '390fb405-9e87-4e15-8f62-3c2c3bfe029a' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('390fb405-9e87-4e15-8f62-3c2c3bfe029a', 'store_kind', 'sports');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'eaa158ae-dea2-4188-bc94-f18c8b9a53f8';
DELETE FROM overture_poi_type WHERE overture_id = 'eaa158ae-dea2-4188-bc94-f18c8b9a53f8';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('eaa158ae-dea2-4188-bc94-f18c8b9a53f8', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'eaa158ae-dea2-4188-bc94-f18c8b9a53f8' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('eaa158ae-dea2-4188-bc94-f18c8b9a53f8', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '4d81a983-4eef-4f79-b503-4ee25b2e3414';
DELETE FROM overture_poi_type WHERE overture_id = '4d81a983-4eef-4f79-b503-4ee25b2e3414';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('4d81a983-4eef-4f79-b503-4ee25b2e3414', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '4d81a983-4eef-4f79-b503-4ee25b2e3414' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('4d81a983-4eef-4f79-b503-4ee25b2e3414', 'store_kind', 'jewelry');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'c1525bc3-8aa1-4d25-b02d-1e56cd7e40f6';
DELETE FROM overture_poi_type WHERE overture_id = 'c1525bc3-8aa1-4d25-b02d-1e56cd7e40f6';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('c1525bc3-8aa1-4d25-b02d-1e56cd7e40f6', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'c1525bc3-8aa1-4d25-b02d-1e56cd7e40f6' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('c1525bc3-8aa1-4d25-b02d-1e56cd7e40f6', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '4b5ec03a-e359-45fc-b8f4-1b17af769905';
DELETE FROM overture_poi_type WHERE overture_id = '4b5ec03a-e359-45fc-b8f4-1b17af769905';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('4b5ec03a-e359-45fc-b8f4-1b17af769905', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '4b5ec03a-e359-45fc-b8f4-1b17af769905' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('4b5ec03a-e359-45fc-b8f4-1b17af769905', 'store_kind', 'eyewear_and_optician');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '922b3890-55f3-4a30-a8f9-32aab973975c';
DELETE FROM overture_poi_type WHERE overture_id = '922b3890-55f3-4a30-a8f9-32aab973975c';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('922b3890-55f3-4a30-a8f9-32aab973975c', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '922b3890-55f3-4a30-a8f9-32aab973975c' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('922b3890-55f3-4a30-a8f9-32aab973975c', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'barber', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '3a16f92b-dd68-4ea3-ae1c-983dea44d85e';
DELETE FROM overture_poi_type WHERE overture_id = '3a16f92b-dd68-4ea3-ae1c-983dea44d85e';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('3a16f92b-dd68-4ea3-ae1c-983dea44d85e', 'barber', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '3a16f92b-dd68-4ea3-ae1c-983dea44d85e' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '7e3394e8-e68b-4e60-b2a9-139beea97208';
DELETE FROM overture_poi_type WHERE overture_id = '7e3394e8-e68b-4e60-b2a9-139beea97208';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('7e3394e8-e68b-4e60-b2a9-139beea97208', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '7e3394e8-e68b-4e60-b2a9-139beea97208' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('7e3394e8-e68b-4e60-b2a9-139beea97208', 'store_kind', 'beauty');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'bcb6d67a-256a-41a4-8926-afc5e9f22381';
DELETE FROM overture_poi_type WHERE overture_id = 'bcb6d67a-256a-41a4-8926-afc5e9f22381';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('bcb6d67a-256a-41a4-8926-afc5e9f22381', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'bcb6d67a-256a-41a4-8926-afc5e9f22381' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('bcb6d67a-256a-41a4-8926-afc5e9f22381', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '025eaddf-d272-42aa-9309-ace5ecc6d18f';
DELETE FROM overture_poi_type WHERE overture_id = '025eaddf-d272-42aa-9309-ace5ecc6d18f';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('025eaddf-d272-42aa-9309-ace5ecc6d18f', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '025eaddf-d272-42aa-9309-ace5ecc6d18f' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('025eaddf-d272-42aa-9309-ace5ecc6d18f', 'store_kind', 'shoes');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '9ca6ee42-3a52-47e8-81f7-8d444f48f1fc';
DELETE FROM overture_poi_type WHERE overture_id = '9ca6ee42-3a52-47e8-81f7-8d444f48f1fc';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('9ca6ee42-3a52-47e8-81f7-8d444f48f1fc', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '9ca6ee42-3a52-47e8-81f7-8d444f48f1fc' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('9ca6ee42-3a52-47e8-81f7-8d444f48f1fc', 'store_kind', 'jewelry');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '78c9dc44-4b10-416e-8c5a-bd9261a5db74';
DELETE FROM overture_poi_type WHERE overture_id = '78c9dc44-4b10-416e-8c5a-bd9261a5db74';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('78c9dc44-4b10-416e-8c5a-bd9261a5db74', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '78c9dc44-4b10-416e-8c5a-bd9261a5db74' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('78c9dc44-4b10-416e-8c5a-bd9261a5db74', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '4b9ffff5-1eb2-482c-9de9-b62429b03ccb';
DELETE FROM overture_poi_type WHERE overture_id = '4b9ffff5-1eb2-482c-9de9-b62429b03ccb';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('4b9ffff5-1eb2-482c-9de9-b62429b03ccb', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '4b9ffff5-1eb2-482c-9de9-b62429b03ccb' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('4b9ffff5-1eb2-482c-9de9-b62429b03ccb', 'store_kind', 'home');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'dd14780a-b5d0-49ff-9f13-6abe6db6de20';
DELETE FROM overture_poi_type WHERE overture_id = 'dd14780a-b5d0-49ff-9f13-6abe6db6de20';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('dd14780a-b5d0-49ff-9f13-6abe6db6de20', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'dd14780a-b5d0-49ff-9f13-6abe6db6de20' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('dd14780a-b5d0-49ff-9f13-6abe6db6de20', 'store_kind', 'phone');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '24967e46-5ea4-48b2-a7de-d2bf1fa16616';
DELETE FROM overture_poi_type WHERE overture_id = '24967e46-5ea4-48b2-a7de-d2bf1fa16616';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('24967e46-5ea4-48b2-a7de-d2bf1fa16616', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '24967e46-5ea4-48b2-a7de-d2bf1fa16616' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('24967e46-5ea4-48b2-a7de-d2bf1fa16616', 'store_kind', 'electronics');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'd5a5c60b-f7a7-4152-866a-1788a3155ab7';
DELETE FROM overture_poi_type WHERE overture_id = 'd5a5c60b-f7a7-4152-866a-1788a3155ab7';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d5a5c60b-f7a7-4152-866a-1788a3155ab7', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd5a5c60b-f7a7-4152-866a-1788a3155ab7' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('d5a5c60b-f7a7-4152-866a-1788a3155ab7', 'store_kind', 'home');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '1d802f82-e1fd-4852-93e8-0e0277ee83b5';
DELETE FROM overture_poi_type WHERE overture_id = '1d802f82-e1fd-4852-93e8-0e0277ee83b5';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('1d802f82-e1fd-4852-93e8-0e0277ee83b5', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '1d802f82-e1fd-4852-93e8-0e0277ee83b5' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'aad702bd-3a03-4feb-a0c1-a47d3875ee91';
DELETE FROM overture_poi_type WHERE overture_id = 'aad702bd-3a03-4feb-a0c1-a47d3875ee91';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('aad702bd-3a03-4feb-a0c1-a47d3875ee91', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'aad702bd-3a03-4feb-a0c1-a47d3875ee91' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '6b707cb5-71c0-4259-aebf-0cc7aa0dbd69';
DELETE FROM overture_poi_type WHERE overture_id = '6b707cb5-71c0-4259-aebf-0cc7aa0dbd69';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('6b707cb5-71c0-4259-aebf-0cc7aa0dbd69', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '6b707cb5-71c0-4259-aebf-0cc7aa0dbd69' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'ice_cream', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'c4dde7a9-49d4-43b2-875c-57b8fae637b0';
DELETE FROM overture_poi_type WHERE overture_id = 'c4dde7a9-49d4-43b2-875c-57b8fae637b0';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('c4dde7a9-49d4-43b2-875c-57b8fae637b0', 'ice_cream', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'c4dde7a9-49d4-43b2-875c-57b8fae637b0' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'cafe', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'e3af4d2e-9452-48eb-9d3d-98e6ce7a2b02';
DELETE FROM overture_poi_type WHERE overture_id = 'e3af4d2e-9452-48eb-9d3d-98e6ce7a2b02';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('e3af4d2e-9452-48eb-9d3d-98e6ce7a2b02', 'cafe', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'e3af4d2e-9452-48eb-9d3d-98e6ce7a2b02' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'defddcfe-26ac-4056-b756-e082f00fe8b3';
DELETE FROM overture_poi_type WHERE overture_id = 'defddcfe-26ac-4056-b756-e082f00fe8b3';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('defddcfe-26ac-4056-b756-e082f00fe8b3', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'defddcfe-26ac-4056-b756-e082f00fe8b3' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'bakery', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'df70113f-93d4-4bbc-bce9-7e957bf7772b';
DELETE FROM overture_poi_type WHERE overture_id = 'df70113f-93d4-4bbc-bce9-7e957bf7772b';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('df70113f-93d4-4bbc-bce9-7e957bf7772b', 'bakery', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'df70113f-93d4-4bbc-bce9-7e957bf7772b' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'ab78d47e-0840-4397-afc8-ffded9fcee3f';
DELETE FROM overture_poi_type WHERE overture_id = 'ab78d47e-0840-4397-afc8-ffded9fcee3f';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('ab78d47e-0840-4397-afc8-ffded9fcee3f', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'ab78d47e-0840-4397-afc8-ffded9fcee3f' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'ice_cream', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '875da7f3-cec6-4dab-93bf-bbc535814005';
DELETE FROM overture_poi_type WHERE overture_id = '875da7f3-cec6-4dab-93bf-bbc535814005';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('875da7f3-cec6-4dab-93bf-bbc535814005', 'ice_cream', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '875da7f3-cec6-4dab-93bf-bbc535814005' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '9ebf391e-f0b6-4b9e-bc7d-d3e03dd493fd';
DELETE FROM overture_poi_type WHERE overture_id = '9ebf391e-f0b6-4b9e-bc7d-d3e03dd493fd';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('9ebf391e-f0b6-4b9e-bc7d-d3e03dd493fd', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '9ebf391e-f0b6-4b9e-bc7d-d3e03dd493fd' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '810b6d3c-c36a-4fc9-8fee-add7add71d1d';
DELETE FROM overture_poi_type WHERE overture_id = '810b6d3c-c36a-4fc9-8fee-add7add71d1d';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('810b6d3c-c36a-4fc9-8fee-add7add71d1d', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '810b6d3c-c36a-4fc9-8fee-add7add71d1d' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'a79d7afb-3fe2-4d15-926c-373a6c8971d0';
DELETE FROM overture_poi_type WHERE overture_id = 'a79d7afb-3fe2-4d15-926c-373a6c8971d0';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('a79d7afb-3fe2-4d15-926c-373a6c8971d0', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'a79d7afb-3fe2-4d15-926c-373a6c8971d0' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '04ccd695-a5a8-476b-9bd1-9631800b0a66';
DELETE FROM overture_poi_type WHERE overture_id = '04ccd695-a5a8-476b-9bd1-9631800b0a66';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('04ccd695-a5a8-476b-9bd1-9631800b0a66', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '04ccd695-a5a8-476b-9bd1-9631800b0a66' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '3', updated_at = '2026-11-15' WHERE overture_id = '93381e55-ba71-40ab-b538-5b1ba72f25d2';
DELETE FROM overture_poi_type WHERE overture_id = '93381e55-ba71-40ab-b538-5b1ba72f25d2';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('93381e55-ba71-40ab-b538-5b1ba72f25d2', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '93381e55-ba71-40ab-b538-5b1ba72f25d2' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'ice_cream', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '882c2f8a-cb85-405c-8923-9a41280e6b58';
DELETE FROM overture_poi_type WHERE overture_id = '882c2f8a-cb85-405c-8923-9a41280e6b58';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('882c2f8a-cb85-405c-8923-9a41280e6b58', 'ice_cream', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '882c2f8a-cb85-405c-8923-9a41280e6b58' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'd359d294-541c-44e1-bd8c-8f8773242484';
DELETE FROM overture_poi_type WHERE overture_id = 'd359d294-541c-44e1-bd8c-8f8773242484';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d359d294-541c-44e1-bd8c-8f8773242484', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd359d294-541c-44e1-bd8c-8f8773242484' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '17d1529e-8c7c-4d68-81d5-f28f704c4630';
DELETE FROM overture_poi_type WHERE overture_id = '17d1529e-8c7c-4d68-81d5-f28f704c4630';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('17d1529e-8c7c-4d68-81d5-f28f704c4630', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '17d1529e-8c7c-4d68-81d5-f28f704c4630' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'cafe', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '88a42b2e-9d8c-4039-90fd-d2cf4a48877e';
DELETE FROM overture_poi_type WHERE overture_id = '88a42b2e-9d8c-4039-90fd-d2cf4a48877e';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('88a42b2e-9d8c-4039-90fd-d2cf4a48877e', 'cafe', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '88a42b2e-9d8c-4039-90fd-d2cf4a48877e' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '3', updated_at = '2026-11-15' WHERE overture_id = 'ce5a6bb1-fd88-49e0-bca9-7f81acfa905a';
DELETE FROM overture_poi_type WHERE overture_id = 'ce5a6bb1-fd88-49e0-bca9-7f81acfa905a';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('ce5a6bb1-fd88-49e0-bca9-7f81acfa905a', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'ce5a6bb1-fd88-49e0-bca9-7f81acfa905a' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'cafe', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'b96a5223-f1f7-4d69-b84e-6cdf283574dc';
DELETE FROM overture_poi_type WHERE overture_id = 'b96a5223-f1f7-4d69-b84e-6cdf283574dc';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('b96a5223-f1f7-4d69-b84e-6cdf283574dc', 'cafe', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'b96a5223-f1f7-4d69-b84e-6cdf283574dc' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'd1039351-6995-4f6d-80d0-13e412ee208d';
DELETE FROM overture_poi_type WHERE overture_id = 'd1039351-6995-4f6d-80d0-13e412ee208d';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d1039351-6995-4f6d-80d0-13e412ee208d', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd1039351-6995-4f6d-80d0-13e412ee208d' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'd220c203-6e5b-4b2c-90b7-7848b912c45a';
DELETE FROM overture_poi_type WHERE overture_id = 'd220c203-6e5b-4b2c-90b7-7848b912c45a';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d220c203-6e5b-4b2c-90b7-7848b912c45a', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd220c203-6e5b-4b2c-90b7-7848b912c45a' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '43a708f3-024c-44ec-9392-bb02a7f4ee39';
DELETE FROM overture_poi_type WHERE overture_id = '43a708f3-024c-44ec-9392-bb02a7f4ee39';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('43a708f3-024c-44ec-9392-bb02a7f4ee39', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '43a708f3-024c-44ec-9392-bb02a7f4ee39' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'd3cc067d-7ed4-4719-9a9d-a92d65b50feb';
DELETE FROM overture_poi_type WHERE overture_id = 'd3cc067d-7ed4-4719-9a9d-a92d65b50feb';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d3cc067d-7ed4-4719-9a9d-a92d65b50feb', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd3cc067d-7ed4-4719-9a9d-a92d65b50feb' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '3', updated_at = '2026-11-15' WHERE overture_id = 'eba471fe-e42e-4900-8189-14588765b5a0';
DELETE FROM overture_poi_type WHERE overture_id = 'eba471fe-e42e-4900-8189-14588765b5a0';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('eba471fe-e42e-4900-8189-14588765b5a0', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'eba471fe-e42e-4900-8189-14588765b5a0' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '648567e2-65e7-49fb-a86f-4445468741a5';
DELETE FROM overture_poi_type WHERE overture_id = '648567e2-65e7-49fb-a86f-4445468741a5';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('648567e2-65e7-49fb-a86f-4445468741a5', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '648567e2-65e7-49fb-a86f-4445468741a5' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '01fea7f1-7e42-4d0a-864d-55f39316eeb7';
DELETE FROM overture_poi_type WHERE overture_id = '01fea7f1-7e42-4d0a-864d-55f39316eeb7';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('01fea7f1-7e42-4d0a-864d-55f39316eeb7', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '01fea7f1-7e42-4d0a-864d-55f39316eeb7' AND dimension = 'store_kind';
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057099023';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057099023' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057099023', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'travel_agency', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:pt-38.767737--9.098130';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:pt-38.767737--9.098130' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:pt-38.767730--9.097804';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:pt-38.767730--9.097804' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:pt-38.767730--9.097804', 'store_kind', 'eyewear_and_optician');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057099011';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057099011' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057099011', 'store_kind', 'shoes');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057243010';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057243010' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057243010', 'store_kind', 'shoes');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057098953';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057098953' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057098953', 'store_kind', 'beauty');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057242992';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057242992' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057242992', 'store_kind', 'handbag');
UPDATE curated_poi SET primary_poi_type = 'phone_repair', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057098972';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057098972' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057098978';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057098978' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057098978', 'store_kind', 'electronics');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057099000';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057099000' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057099000', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057098951';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057098951' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057098951', 'store_kind', 'eyewear_and_optician');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057242991';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057242991' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057242991', 'store_kind', 'toys');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057242979';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057242979' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057242979', 'store_kind', 'jewelry');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057242996';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057242996' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057242996', 'store_kind', 'handbag');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057098952';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057098952' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057098952', 'store_kind', 'newspaper_and_magazines');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057242955';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057242955' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057242955', 'store_kind', 'shoes');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057242957';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057242957' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057242957', 'store_kind', 'shoes');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:pt-38.767599--9.097919';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:pt-38.767599--9.097919' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:pt-38.767599--9.097919', 'store_kind', 'jewelry');
UPDATE curated_poi SET primary_poi_type = 'tea', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057242968';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057242968' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'travel_agency', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057243016';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057243016' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'currency_exchange', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1058308030';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1058308030' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057099022';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057099022' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057099022', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057242989';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057242989' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057242989', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057242995';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057242995' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057242995', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057098935';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057098935' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057098962';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057098962' AND dimension IN ('store_kind', 'poi_type');
INSERT INTO curated_poi (poi_id, source, name, dedupe_name, lat, lng, geohash, primary_poi_type, brand, address, floor, country_code, status, created_at, created_by, updated_at, updated_by, origin_source, origin_id, origin_licence, imported_at, import_run_id) VALUES
('mall:vasco_da_gama:5-a-sec', 'community', '5 À SEC', '5 a sec', 38.767696, -9.0968202, 'eycs8cryh', 'laundry', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:5-a-sec', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:acium', 'community', 'ACIUM', 'acium', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:acium', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:amigo', 'community', 'AMIGO', 'amigo', 38.767696, -9.0968202, 'eycs8cryh', 'restaurant', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:amigo', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:avis', 'community', 'AVIS', 'avis', 38.767696, -9.0968202, 'eycs8cryh', 'car_rental', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:avis', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:benfica-official-store', 'community', 'Benfica Official Store', 'benfica official store', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:benfica-official-store', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:blue-banana', 'community', 'BLUE BANANA', 'blue banana', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '2', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:blue-banana', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:brownie', 'community', 'Brownie', 'brownie', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:brownie', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:cartorio-lurdes-pires', 'community', 'Cartório Lurdes Pires', 'cartorio lurdes pires', 38.767696, -9.0968202, 'eycs8cryh', 'local_government_office', NULL, NULL, '-1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:cartorio-lurdes-pires', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:centro-de-estetica-e-unhas', 'community', 'CENTRO DE ESTÉTICA E UNHAS', 'centro de estetica e unhas', 38.767696, -9.0968202, 'eycs8cryh', 'nail_salon', NULL, NULL, '-1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:centro-de-estetica-e-unhas', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:cex', 'community', 'CEX', 'cex', 38.767696, -9.0968202, 'eycs8cryh', 'store', 'CeX', NULL, '2', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:cex', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:chilli-beans', 'community', 'CHILLI BEANS', 'chilli beans', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:chilli-beans', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:ctt-correios-de-portugal', 'community', 'CTT-CORREIOS DE PORTUGAL', 'ctt correios de portugal', 38.767696, -9.0968202, 'eycs8cryh', 'post', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:ctt-correios-de-portugal', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:europcar', 'community', 'EuropCar', 'europcar', 38.767696, -9.0968202, 'eycs8cryh', 'car_rental', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:europcar', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:farmacia-gare-do-oriente', 'community', 'Farmácia Gare do Oriente', 'farmacia gare do oriente', 38.767696, -9.0968202, 'eycs8cryh', 'pharmacy', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:farmacia-gare-do-oriente', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:flixbus', 'community', 'FLIXBUS', 'flixbus', 38.767696, -9.0968202, 'eycs8cryh', 'bus_station', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:flixbus', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:flying-tiger-copenhagen', 'community', 'FLYING TIGER COPENHAGEN', 'flying tiger copenhagen', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:flying-tiger-copenhagen', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:footsport-outlaw', 'community', 'FootSport Outlaw', 'footsport outlaw', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '-1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:footsport-outlaw', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:galp', 'community', 'Galp', 'galp', 38.767696, -9.0968202, 'eycs8cryh', 'gas_station', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:galp', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:gant', 'community', 'GANT', 'gant', 38.767696, -9.0968202, 'eycs8cryh', 'store', 'Gant', NULL, '1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:gant', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:happ-li', 'community', 'Happ''li', 'happ li', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:happ-li', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:imed-vasco-da-gama', 'community', 'IMED – VASCO DA GAMA', 'imed vasco da gama', 38.767696, -9.0968202, 'eycs8cryh', 'clinic', NULL, NULL, '-1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:imed-vasco-da-gama', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:inspiral', 'community', 'INSPIRAL', 'inspiral', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:inspiral', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:intimissimi-uomo', 'community', 'Intimissimi Uomo', 'intimissimi uomo', 38.7675422, -9.0970066, 'eycs8crv2', 'store', 'Intimissimi', NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:intimissimi-uomo', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:iqos', 'community', 'IQOS', 'iqos', 38.767696, -9.0968202, 'eycs8cryh', 'tobacco', NULL, NULL, '1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:iqos', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:kik', 'community', 'KIK', 'kik', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:kik', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:kiwoko', 'community', 'KIWOKO', 'kiwoko', 38.767696, -9.0968202, 'eycs8cryh', 'store', 'Kiwoko', NULL, '-1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:kiwoko', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:l-oreal', 'community', 'L''ÓREAL', 'l oreal', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:l-oreal', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:labco-analises-clinicas', 'community', 'LABCO – ANÁLISES CLÍNICAS', 'labco analises clinicas', 38.767696, -9.0968202, 'eycs8cryh', 'medical_lab', NULL, NULL, '-1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:labco-analises-clinicas', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:lola', 'community', 'LOLA', 'lola', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:lola', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:mango-teen', 'community', 'MANGO TEEN', 'mango teen', 38.7670326, -9.0965346, 'eycs91247', 'store', 'Mango', NULL, '2', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:mango-teen', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:meo', 'community', 'MEO', 'meo', 38.7676184, -9.0966742, 'eycs912j8', 'store', 'MEO', NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:meo', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:millennium-bcp', 'community', 'MILLENNIUM BCP', 'millennium bcp', 38.767696, -9.0968202, 'eycs8cryh', 'bank', 'Millennium bcp', NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:millennium-bcp', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:misako', 'community', 'MISAKO', 'misako', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:misako', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:myforce', 'community', 'MyForce', 'myforce', 38.7681992, -9.0975225, 'eycs8cx3h', 'car_repair', NULL, NULL, '-1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:myforce', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:nos', 'community', 'NOS', 'nos', 38.7676235, -9.0967765, 'eycs8crvv', 'store', 'NOS', NULL, '-1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:nos', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:nova-cambios', 'community', 'NOVA CÂMBIOS', 'nova cambios', 38.767696, -9.0968202, 'eycs8cryh', 'currency_exchange', NULL, NULL, '-1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:nova-cambios', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:nutrystore', 'community', 'NUTRYSTORE', 'nutrystore', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:nutrystore', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:pluricosmetica', 'community', 'PLURICOSMÉTICA', 'pluricosmetica', 38.767696, -9.0968202, 'eycs8cryh', 'store', 'Pluricosmética', NULL, '-1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:pluricosmetica', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:pluricosmetica-2', 'community', 'PLURICOSMÉTICA', 'pluricosmetica', 38.767696, -9.0968202, 'eycs8cryh', 'store', 'Pluricosmética', NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:pluricosmetica-2', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:print-point-expo', 'community', 'Print Point Expo', 'print point expo', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:print-point-expo', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:rentauto', 'community', 'RentAuto', 'rentauto', 38.767696, -9.0968202, 'eycs8cryh', 'car_rental', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:rentauto', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:sporting', 'community', 'SPORTING', 'sporting', 38.767696, -9.0968202, 'eycs8cryh', 'cafe', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:sporting', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:tabink', 'community', 'TABINK', 'tabink', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:tabink', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:unicambio-gare', 'community', 'UNICÂMBIO – Gare', 'unicambio gare', 38.7674985, -9.0973021, 'eycs8crt1', 'currency_exchange', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:unicambio-gare', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:universo-senior', 'community', 'UNIVERSO SÉNIOR', 'universo senior', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '-1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:universo-senior', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:wink', 'community', 'WIÑK', 'wink', 38.767696, -9.0968202, 'eycs8cryh', 'nail_salon', NULL, NULL, '2', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:wink', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:wizink', 'community', 'WIZINK', 'wizink', 38.767696, -9.0968202, 'eycs8cryh', 'bank', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:wizink', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:woo', 'community', 'WOO', 'woo', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:woo', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:wtf', 'community', 'WTF', 'wtf', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:wtf', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:xtreme', 'community', 'XTREME', 'xtreme', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:xtreme', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:arcadia-nescafe', 'community', 'Arcádia – Nescafé', 'arcadia nescafe', 38.767696, -9.0968202, 'eycs8cryh', 'cafe', NULL, NULL, '2', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:arcadia-nescafe', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:ardina-caffe', 'community', 'ARDINA CAFFÉ', 'ardina caffe', 38.767696, -9.0968202, 'eycs8cryh', 'cafe', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:ardina-caffe', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:ardina-caffe-2', 'community', 'ARDINA CAFFÉ', 'ardina caffe', 38.767696, -9.0968202, 'eycs8cryh', 'cafe', NULL, NULL, '1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:ardina-caffe-2', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:baan-canteen', 'community', 'BAAN CANTEEN', 'baan canteen', 38.767696, -9.0968202, 'eycs8cryh', 'restaurant', NULL, NULL, '2', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:baan-canteen', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:bread-friends', 'community', 'BREAD & FRIENDS', 'bread friends', 38.767696, -9.0968202, 'eycs8cryh', 'bakery', NULL, NULL, '3', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:bread-friends', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:cafe-jeronymo', 'community', 'CAFÉ JERONYMO', 'cafe jeronymo', 38.767696, -9.0968202, 'eycs8cryh', 'cafe', 'Jeronymo', NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:cafe-jeronymo', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:cervejaria-malandra', 'community', 'CERVEJARIA MALANDRA', 'cervejaria malandra', 38.767696, -9.0968202, 'eycs8cryh', 'restaurant', NULL, NULL, '3', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:cervejaria-malandra', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:desejo-pronto-delicious-coffe-grill', 'community', 'DESEJO PRONTO DELICIOUS COFFE & GRILL', 'desejo pronto delicious coffe grill', 38.767696, -9.0968202, 'eycs8cryh', 'restaurant', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:desejo-pronto-delicious-coffe-grill', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:empanadas', 'community', 'EMPANADAS', 'empanadas', 38.767696, -9.0968202, 'eycs8cryh', 'restaurant', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:empanadas', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:expresso-do-oriente', 'community', 'EXPRESSO DO ORIENTE', 'expresso do oriente', 38.767696, -9.0968202, 'eycs8cryh', 'cafe', NULL, NULL, '1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:expresso-do-oriente', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:feel-rio', 'community', 'FEEL RIO', 'feel rio', 38.767696, -9.0968202, 'eycs8cryh', 'restaurant', NULL, NULL, '3', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:feel-rio', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:fnac', 'community', 'FNAC', 'fnac', 38.7680124, -9.0967516, 'eycs8cxbn', 'store', 'Fnac', NULL, '2', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:fnac', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:frango-da-gare', 'community', 'Frango da Gare', 'frango da gare', 38.767696, -9.0968202, 'eycs8cryh', 'restaurant', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:frango-da-gare', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:furio', 'community', 'FURIO', 'furio', 38.767696, -9.0968202, 'eycs8cryh', 'restaurant', NULL, NULL, '3', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:furio', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:gulden-draak', 'community', 'GULDEN DRAAK', 'gulden draak', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '3', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:gulden-draak', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:happy-cookies', 'community', 'HAPPY COOKIES', 'happy cookies', 38.767696, -9.0968202, 'eycs8cryh', 'bakery', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:happy-cookies', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:jrn-docarias', 'community', 'JRN DOÇARIAS', 'jrn docarias', 38.767696, -9.0968202, 'eycs8cryh', 'bakery', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:jrn-docarias', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:las-muns', 'community', 'LAS MUNS', 'las muns', 38.767696, -9.0968202, 'eycs8cryh', 'restaurant', NULL, NULL, '3', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:las-muns', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:leitaria-da-quinta-do-paco', 'community', 'LEITARIA DA QUINTA DO PAÇO', 'leitaria da quinta do paco', 38.767696, -9.0968202, 'eycs8cryh', 'bakery', NULL, NULL, '3', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:leitaria-da-quinta-do-paco', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:mu-gelato-italiano', 'community', 'MÚ – GELATO ITALIANO', 'mu gelato italiano', 38.767696, -9.0968202, 'eycs8cryh', 'ice_cream', NULL, NULL, '3', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:mu-gelato-italiano', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:nespresso', 'community', 'NESPRESSO', 'nespresso', 38.7678717, -9.0970815, 'eycs8crxn', 'store', NULL, NULL, '1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:nespresso', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:noori-lab', 'community', 'NOORI LAB', 'noori lab', 38.767696, -9.0968202, 'eycs8cryh', 'restaurant', NULL, NULL, '3', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:noori-lab', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:noori-pots', 'community', 'NOORI POTS', 'noori pots', 38.767696, -9.0968202, 'eycs8cryh', 'restaurant', NULL, NULL, '2', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:noori-pots', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:o-forno-do-leitao-do-ze', 'community', 'O Forno do leitão do Zé', 'o forno do leitao do ze', 38.767696, -9.0968202, 'eycs8cryh', 'restaurant', NULL, NULL, '3', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:o-forno-do-leitao-do-ze', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:o-lisboeta', 'community', 'O Lisboeta', 'o lisboeta', 38.767696, -9.0968202, 'eycs8cryh', 'restaurant', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:o-lisboeta', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:o-mundo-das-gomas', 'community', 'O MUNDO DAS GOMAS', 'o mundo das gomas', 38.767696, -9.0968202, 'eycs8cryh', 'bakery', NULL, NULL, '1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:o-mundo-das-gomas', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:panda-cantina', 'community', 'PANDA CANTINA', 'panda cantina', 38.767696, -9.0968202, 'eycs8cryh', 'restaurant', NULL, NULL, '3', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:panda-cantina', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:poke-house', 'community', 'Poké House', 'poke house', 38.767696, -9.0968202, 'eycs8cryh', 'restaurant', NULL, NULL, '3', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:poke-house', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:portela-cafes', 'community', 'PORTELA CAFÉS', 'portela cafes', 38.7678704, -9.0966309, 'eycs912p1', 'cafe', NULL, NULL, '-1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:portela-cafes', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:restaurante-da-gare', 'community', 'Restaurante da Gare', 'restaurante da gare', 38.767696, -9.0968202, 'eycs8cryh', 'restaurant', NULL, NULL, '-1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:restaurante-da-gare', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:santa-francesinha-by-cufra', 'community', 'Santa Francesinha by Cufra', 'santa francesinha by cufra', 38.767696, -9.0968202, 'eycs8cryh', 'restaurant', NULL, NULL, '3', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:santa-francesinha-by-cufra', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:street-smash-burger', 'community', 'STREET SMASH BURGER', 'street smash burger', 38.767696, -9.0968202, 'eycs8cryh', 'restaurant', NULL, NULL, '2', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:street-smash-burger', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:subway', 'community', 'SUBWAY', 'subway', 38.767696, -9.0968202, 'eycs8cryh', 'restaurant', NULL, NULL, '-1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:subway', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15'),
('mall:vasco_da_gama:weeel', 'community', 'Weeel', 'weeel', 38.767696, -9.0968202, 'eycs8cryh', 'ice_cream', NULL, NULL, '1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:weeel', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15')
ON CONFLICT (poi_id) DO NOTHING;
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:acium', 'store_kind', 'jewelry'),
('mall:vasco_da_gama:benfica-official-store', 'store_kind', 'sports'),
('mall:vasco_da_gama:blue-banana', 'store_kind', 'clothing'),
('mall:vasco_da_gama:brownie', 'store_kind', 'womens_clothing'),
('mall:vasco_da_gama:cex', 'store_kind', 'electronics'),
('mall:vasco_da_gama:chilli-beans', 'store_kind', 'eyewear_and_optician'),
('mall:vasco_da_gama:flying-tiger-copenhagen', 'store_kind', 'gift'),
('mall:vasco_da_gama:footsport-outlaw', 'store_kind', 'shoes'),
('mall:vasco_da_gama:gant', 'store_kind', 'clothing'),
('mall:vasco_da_gama:happ-li', 'store_kind', 'fashion_accessories'),
('mall:vasco_da_gama:inspiral', 'store_kind', 'phone'),
('mall:vasco_da_gama:intimissimi-uomo', 'store_kind', 'mens_clothing'),
('mall:vasco_da_gama:kik', 'store_kind', 'clothing'),
('mall:vasco_da_gama:kiwoko', 'store_kind', 'pet'),
('mall:vasco_da_gama:l-oreal', 'store_kind', 'beauty'),
('mall:vasco_da_gama:lola', 'store_kind', 'shoes'),
('mall:vasco_da_gama:mango-teen', 'store_kind', 'clothing'),
('mall:vasco_da_gama:meo', 'store_kind', 'phone'),
('mall:vasco_da_gama:misako', 'store_kind', 'jewelry'),
('mall:vasco_da_gama:nos', 'store_kind', 'phone'),
('mall:vasco_da_gama:nutrystore', 'store_kind', 'vitamins_and_supplements'),
('mall:vasco_da_gama:pluricosmetica', 'store_kind', 'beauty'),
('mall:vasco_da_gama:pluricosmetica-2', 'store_kind', 'beauty'),
('mall:vasco_da_gama:print-point-expo', 'store_kind', 'copy_shop'),
('mall:vasco_da_gama:tabink', 'store_kind', 'books'),
('mall:vasco_da_gama:universo-senior', 'store_kind', 'medical_supply'),
('mall:vasco_da_gama:woo', 'store_kind', 'phone'),
('mall:vasco_da_gama:wtf', 'store_kind', 'phone'),
('mall:vasco_da_gama:xtreme', 'store_kind', 'shoes'),
('mall:vasco_da_gama:fnac', 'store_kind', 'books'),
('mall:vasco_da_gama:gulden-draak', 'store_kind', 'wine_and_spirits'),
('mall:vasco_da_gama:leitaria-da-quinta-do-paco', 'poi_type', 'cafe'),
('mall:vasco_da_gama:nespresso', 'store_kind', 'coffee_supplies');

-- BOTA MINUTO is two units (Piso -1, and Piso -1 at the Gare): the second, typed shoe_repair.
INSERT INTO curated_poi (poi_id, source, name, dedupe_name, lat, lng, geohash, primary_poi_type, brand, address, floor, country_code, status, created_at, created_by, updated_at, updated_by, origin_source, origin_id, origin_licence, imported_at, import_run_id) VALUES
('mall:vasco_da_gama:bota-minuto', 'community', 'BOTA MINUTO', 'bota minuto', 38.7674156, -9.0973705, 'eycs8crkx', 'shoe_repair', NULL, NULL, '-1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:bota-minuto', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-2026-11-15')
ON CONFLICT (poi_id) DO NOTHING;
