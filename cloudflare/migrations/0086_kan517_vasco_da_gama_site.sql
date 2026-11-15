-- KAN-517. Vasco da Gama re-read from centrovascodagama.pt on 2026-11-15 (owner: the
-- site is the truth). The site renumbered its floors since August (WORTEN 1 -> 0;
-- the Gare units sit on the mall's own numbering), so every listed unit takes the
-- floor the site shows today. 223 units incl. the Multibanco BPI point. Eleven
-- cards show no floor and are written without one. Nothing deleted.

INSERT INTO poi_source_correction (source, source_id, visible, review_note, created_at) VALUES
  ('overture', 'c8240c03-c012-4b92-ad94-7983b441fde3', 0, 'KAN-517: same shop as listed ''NOS'', held twice; the other row kept', '2026-11-15'),
  ('overture', 'e8c45ae3-b7a6-4bf0-87f9-789df8fb43fe', 0, 'KAN-517: same shop as listed ''NESPRESSO'', held twice; the other row kept', '2026-11-15'),
  ('overture', '1f3675a6-cdab-47fe-90bc-e09cd4552d3e', 0, 'KAN-517: same shop as listed ''FNAC'', held twice; the other row kept', '2026-11-15'),
  ('overture', 'e3af4d2e-9452-48eb-9d3d-98e6ce7a2b02', 0, 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list', '2026-11-15')
ON CONFLICT (source, source_id) DO UPDATE SET visible = 0, review_note = excluded.review_note;
UPDATE curated_poi SET status = 'removed', removed_at = '2026-11-15', removed_by = 'kan-439-mall-tenants', removal_reason = 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list' WHERE status = 'active' AND poi_id = 'mall:vasco_da_gama:chilli-beans';
UPDATE curated_poi SET status = 'removed', removed_at = '2026-11-15', removed_by = 'kan-439-mall-tenants', removal_reason = 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list' WHERE status = 'active' AND poi_id = 'mall:vasco_da_gama:leitaria-da-quinta-do-paco';
UPDATE curated_poi SET status = 'removed', removed_at = '2026-11-15', removed_by = 'kan-439-mall-tenants', removal_reason = 'KAN-517: not on the Centro Comercial Vasco da Gama tenant list' WHERE status = 'active' AND poi_id = 'mall:way-1057099013';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '1d802f82-e1fd-4852-93e8-0e0277ee83b5';
DELETE FROM overture_poi_type WHERE overture_id = '1d802f82-e1fd-4852-93e8-0e0277ee83b5';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('1d802f82-e1fd-4852-93e8-0e0277ee83b5', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '1d802f82-e1fd-4852-93e8-0e0277ee83b5' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'bank', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'd8dffd67-b832-45f4-96ba-b1cae1721334';
DELETE FROM overture_poi_type WHERE overture_id = 'd8dffd67-b832-45f4-96ba-b1cae1721334';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d8dffd67-b832-45f4-96ba-b1cae1721334', 'bank', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd8dffd67-b832-45f4-96ba-b1cae1721334' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = NULL, updated_at = '2026-11-15' WHERE overture_id = 'aad702bd-3a03-4feb-a0c1-a47d3875ee91';
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
UPDATE overture_poi SET primary_poi_type = 'hairdresser', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '2c0d684a-27f0-4fea-8cd1-cdfd965b0699';
DELETE FROM overture_poi_type WHERE overture_id = '2c0d684a-27f0-4fea-8cd1-cdfd965b0699';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('2c0d684a-27f0-4fea-8cd1-cdfd965b0699', 'hairdresser', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '2c0d684a-27f0-4fea-8cd1-cdfd965b0699' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'cafe', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'd03f2aa5-42ed-459a-ad90-a6fe39e83bfa';
DELETE FROM overture_poi_type WHERE overture_id = 'd03f2aa5-42ed-459a-ad90-a6fe39e83bfa';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d03f2aa5-42ed-459a-ad90-a6fe39e83bfa', 'cafe', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd03f2aa5-42ed-459a-ad90-a6fe39e83bfa' AND dimension = 'store_kind';
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
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'defddcfe-26ac-4056-b756-e082f00fe8b3';
DELETE FROM overture_poi_type WHERE overture_id = 'defddcfe-26ac-4056-b756-e082f00fe8b3';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('defddcfe-26ac-4056-b756-e082f00fe8b3', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'defddcfe-26ac-4056-b756-e082f00fe8b3' AND dimension = 'store_kind';
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
UPDATE overture_poi SET primary_poi_type = 'cafe', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '1bfe3e6d-b1f3-428c-96fd-feceaabbb7f9';
DELETE FROM overture_poi_type WHERE overture_id = '1bfe3e6d-b1f3-428c-96fd-feceaabbb7f9';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('1bfe3e6d-b1f3-428c-96fd-feceaabbb7f9', 'cafe', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '1bfe3e6d-b1f3-428c-96fd-feceaabbb7f9' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '3d95dc6d-2c3b-43a3-ac9d-0ec5ec5b208c';
DELETE FROM overture_poi_type WHERE overture_id = '3d95dc6d-2c3b-43a3-ac9d-0ec5ec5b208c';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('3d95dc6d-2c3b-43a3-ac9d-0ec5ec5b208c', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '3d95dc6d-2c3b-43a3-ac9d-0ec5ec5b208c' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('3d95dc6d-2c3b-43a3-ac9d-0ec5ec5b208c', 'store_kind', 'womens_clothing');
UPDATE overture_poi SET primary_poi_type = 'supermarket', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '9f0e16b5-fbf9-46a5-b784-29b77b8d7d10';
DELETE FROM overture_poi_type WHERE overture_id = '9f0e16b5-fbf9-46a5-b784-29b77b8d7d10';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('9f0e16b5-fbf9-46a5-b784-29b77b8d7d10', 'supermarket', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '9f0e16b5-fbf9-46a5-b784-29b77b8d7d10' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'movie_theater', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '7bdf8ae5-38a6-4a4f-adae-9aeeb24b1b9d';
DELETE FROM overture_poi_type WHERE overture_id = '7bdf8ae5-38a6-4a4f-adae-9aeeb24b1b9d';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('7bdf8ae5-38a6-4a4f-adae-9aeeb24b1b9d', 'movie_theater', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '7bdf8ae5-38a6-4a4f-adae-9aeeb24b1b9d' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '3197bae1-3f69-42c9-b5fe-21d2f03ecb9c';
DELETE FROM overture_poi_type WHERE overture_id = '3197bae1-3f69-42c9-b5fe-21d2f03ecb9c';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('3197bae1-3f69-42c9-b5fe-21d2f03ecb9c', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '3197bae1-3f69-42c9-b5fe-21d2f03ecb9c' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('3197bae1-3f69-42c9-b5fe-21d2f03ecb9c', 'store_kind', 'fashion_accessories');
UPDATE overture_poi SET primary_poi_type = 'supermarket', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '15eb26c7-8d0f-45d2-978c-bd1cc2661d59';
DELETE FROM overture_poi_type WHERE overture_id = '15eb26c7-8d0f-45d2-978c-bd1cc2661d59';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('15eb26c7-8d0f-45d2-978c-bd1cc2661d59', 'supermarket', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '15eb26c7-8d0f-45d2-978c-bd1cc2661d59' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '6e090446-8072-4a81-91cb-922e1083e78f';
DELETE FROM overture_poi_type WHERE overture_id = '6e090446-8072-4a81-91cb-922e1083e78f';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('6e090446-8072-4a81-91cb-922e1083e78f', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '6e090446-8072-4a81-91cb-922e1083e78f' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('6e090446-8072-4a81-91cb-922e1083e78f', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '3', updated_at = '2026-11-15' WHERE overture_id = '0c27a494-e565-4119-a7e1-756eaf0260e0';
DELETE FROM overture_poi_type WHERE overture_id = '0c27a494-e565-4119-a7e1-756eaf0260e0';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('0c27a494-e565-4119-a7e1-756eaf0260e0', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '0c27a494-e565-4119-a7e1-756eaf0260e0' AND dimension = 'store_kind';
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
UPDATE overture_poi SET primary_poi_type = 'bakery', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'df70113f-93d4-4bbc-bce9-7e957bf7772b';
DELETE FROM overture_poi_type WHERE overture_id = 'df70113f-93d4-4bbc-bce9-7e957bf7772b';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('df70113f-93d4-4bbc-bce9-7e957bf7772b', 'bakery', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'df70113f-93d4-4bbc-bce9-7e957bf7772b' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = NULL, updated_at = '2026-11-15' WHERE overture_id = 'ab78d47e-0840-4397-afc8-ffded9fcee3f';
DELETE FROM overture_poi_type WHERE overture_id = 'ab78d47e-0840-4397-afc8-ffded9fcee3f';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('ab78d47e-0840-4397-afc8-ffded9fcee3f', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'ab78d47e-0840-4397-afc8-ffded9fcee3f' AND dimension = 'store_kind';
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
UPDATE overture_poi SET primary_poi_type = 'ice_cream', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '875da7f3-cec6-4dab-93bf-bbc535814005';
DELETE FROM overture_poi_type WHERE overture_id = '875da7f3-cec6-4dab-93bf-bbc535814005';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('875da7f3-cec6-4dab-93bf-bbc535814005', 'ice_cream', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '875da7f3-cec6-4dab-93bf-bbc535814005' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'bfdf2fac-4f23-41f5-99d3-e27929bbbd62';
DELETE FROM overture_poi_type WHERE overture_id = 'bfdf2fac-4f23-41f5-99d3-e27929bbbd62';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('bfdf2fac-4f23-41f5-99d3-e27929bbbd62', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'bfdf2fac-4f23-41f5-99d3-e27929bbbd62' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('bfdf2fac-4f23-41f5-99d3-e27929bbbd62', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '3', updated_at = '2026-11-15' WHERE overture_id = '4ab84e93-b8f6-44a8-ad10-62ea2c449fca';
DELETE FROM overture_poi_type WHERE overture_id = '4ab84e93-b8f6-44a8-ad10-62ea2c449fca';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('4ab84e93-b8f6-44a8-ad10-62ea2c449fca', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '4ab84e93-b8f6-44a8-ad10-62ea2c449fca' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '8f427ffc-29e0-4554-8ee5-a6fd4404136f';
DELETE FROM overture_poi_type WHERE overture_id = '8f427ffc-29e0-4554-8ee5-a6fd4404136f';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('8f427ffc-29e0-4554-8ee5-a6fd4404136f', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '8f427ffc-29e0-4554-8ee5-a6fd4404136f' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('8f427ffc-29e0-4554-8ee5-a6fd4404136f', 'store_kind', 'childrens_clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '418092b9-eab8-43f8-9e2a-e73674705fb3';
DELETE FROM overture_poi_type WHERE overture_id = '418092b9-eab8-43f8-9e2a-e73674705fb3';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('418092b9-eab8-43f8-9e2a-e73674705fb3', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '418092b9-eab8-43f8-9e2a-e73674705fb3' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('418092b9-eab8-43f8-9e2a-e73674705fb3', 'store_kind', 'shoes');
UPDATE overture_poi SET primary_poi_type = 'hairdresser', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '749d6da4-1dbb-4dd3-bd5e-fb018a87380e';
DELETE FROM overture_poi_type WHERE overture_id = '749d6da4-1dbb-4dd3-bd5e-fb018a87380e';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('749d6da4-1dbb-4dd3-bd5e-fb018a87380e', 'hairdresser', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '749d6da4-1dbb-4dd3-bd5e-fb018a87380e' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '9ebf391e-f0b6-4b9e-bc7d-d3e03dd493fd';
DELETE FROM overture_poi_type WHERE overture_id = '9ebf391e-f0b6-4b9e-bc7d-d3e03dd493fd';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('9ebf391e-f0b6-4b9e-bc7d-d3e03dd493fd', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '9ebf391e-f0b6-4b9e-bc7d-d3e03dd493fd' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '810b6d3c-c36a-4fc9-8fee-add7add71d1d';
DELETE FROM overture_poi_type WHERE overture_id = '810b6d3c-c36a-4fc9-8fee-add7add71d1d';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('810b6d3c-c36a-4fc9-8fee-add7add71d1d', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '810b6d3c-c36a-4fc9-8fee-add7add71d1d' AND dimension = 'store_kind';
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
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'a79d7afb-3fe2-4d15-926c-373a6c8971d0';
DELETE FROM overture_poi_type WHERE overture_id = 'a79d7afb-3fe2-4d15-926c-373a6c8971d0';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('a79d7afb-3fe2-4d15-926c-373a6c8971d0', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'a79d7afb-3fe2-4d15-926c-373a6c8971d0' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '8732a696-b71a-4f46-a981-31e04266e113';
DELETE FROM overture_poi_type WHERE overture_id = '8732a696-b71a-4f46-a981-31e04266e113';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('8732a696-b71a-4f46-a981-31e04266e113', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '8732a696-b71a-4f46-a981-31e04266e113' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('8732a696-b71a-4f46-a981-31e04266e113', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '052bc990-5564-4a07-ac39-cb7b61023c8d';
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
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '04ccd695-a5a8-476b-9bd1-9631800b0a66';
DELETE FROM overture_poi_type WHERE overture_id = '04ccd695-a5a8-476b-9bd1-9631800b0a66';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('04ccd695-a5a8-476b-9bd1-9631800b0a66', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '04ccd695-a5a8-476b-9bd1-9631800b0a66' AND dimension = 'store_kind';
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
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '3', updated_at = '2026-11-15' WHERE overture_id = '93381e55-ba71-40ab-b538-5b1ba72f25d2';
DELETE FROM overture_poi_type WHERE overture_id = '93381e55-ba71-40ab-b538-5b1ba72f25d2';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('93381e55-ba71-40ab-b538-5b1ba72f25d2', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '93381e55-ba71-40ab-b538-5b1ba72f25d2' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'bf074a23-1050-40b9-9ab6-d42405e62157';
DELETE FROM overture_poi_type WHERE overture_id = 'bf074a23-1050-40b9-9ab6-d42405e62157';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('bf074a23-1050-40b9-9ab6-d42405e62157', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'bf074a23-1050-40b9-9ab6-d42405e62157' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('bf074a23-1050-40b9-9ab6-d42405e62157', 'store_kind', 'beauty');
UPDATE overture_poi SET primary_poi_type = 'ice_cream', floor = NULL, updated_at = '2026-11-15' WHERE overture_id = '882c2f8a-cb85-405c-8923-9a41280e6b58';
DELETE FROM overture_poi_type WHERE overture_id = '882c2f8a-cb85-405c-8923-9a41280e6b58';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('882c2f8a-cb85-405c-8923-9a41280e6b58', 'ice_cream', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '882c2f8a-cb85-405c-8923-9a41280e6b58' AND dimension = 'store_kind';
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
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'd359d294-541c-44e1-bd8c-8f8773242484';
DELETE FROM overture_poi_type WHERE overture_id = 'd359d294-541c-44e1-bd8c-8f8773242484';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d359d294-541c-44e1-bd8c-8f8773242484', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd359d294-541c-44e1-bd8c-8f8773242484' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '25b8d68c-637e-4b87-aee7-5d3ece8919cc';
DELETE FROM overture_poi_type WHERE overture_id = '25b8d68c-637e-4b87-aee7-5d3ece8919cc';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('25b8d68c-637e-4b87-aee7-5d3ece8919cc', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '25b8d68c-637e-4b87-aee7-5d3ece8919cc' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('25b8d68c-637e-4b87-aee7-5d3ece8919cc', 'store_kind', 'jewelry');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'a9371515-158d-4471-ba71-3c200587a9ea';
DELETE FROM overture_poi_type WHERE overture_id = 'a9371515-158d-4471-ba71-3c200587a9ea';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('a9371515-158d-4471-ba71-3c200587a9ea', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'a9371515-158d-4471-ba71-3c200587a9ea' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('a9371515-158d-4471-ba71-3c200587a9ea', 'store_kind', 'beauty');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '17d1529e-8c7c-4d68-81d5-f28f704c4630';
DELETE FROM overture_poi_type WHERE overture_id = '17d1529e-8c7c-4d68-81d5-f28f704c4630';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('17d1529e-8c7c-4d68-81d5-f28f704c4630', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '17d1529e-8c7c-4d68-81d5-f28f704c4630' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'cafe', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '88a42b2e-9d8c-4039-90fd-d2cf4a48877e';
DELETE FROM overture_poi_type WHERE overture_id = '88a42b2e-9d8c-4039-90fd-d2cf4a48877e';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('88a42b2e-9d8c-4039-90fd-d2cf4a48877e', 'cafe', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '88a42b2e-9d8c-4039-90fd-d2cf4a48877e' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '3', updated_at = '2026-11-15' WHERE overture_id = 'ce5a6bb1-fd88-49e0-bca9-7f81acfa905a';
DELETE FROM overture_poi_type WHERE overture_id = 'ce5a6bb1-fd88-49e0-bca9-7f81acfa905a';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('ce5a6bb1-fd88-49e0-bca9-7f81acfa905a', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'ce5a6bb1-fd88-49e0-bca9-7f81acfa905a' AND dimension = 'store_kind';
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
UPDATE overture_poi SET primary_poi_type = 'cafe', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'b96a5223-f1f7-4d69-b84e-6cdf283574dc';
DELETE FROM overture_poi_type WHERE overture_id = 'b96a5223-f1f7-4d69-b84e-6cdf283574dc';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('b96a5223-f1f7-4d69-b84e-6cdf283574dc', 'cafe', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'b96a5223-f1f7-4d69-b84e-6cdf283574dc' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'c63f015d-9109-43a3-8040-f37c91ebb238';
DELETE FROM overture_poi_type WHERE overture_id = 'c63f015d-9109-43a3-8040-f37c91ebb238';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('c63f015d-9109-43a3-8040-f37c91ebb238', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'c63f015d-9109-43a3-8040-f37c91ebb238' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('c63f015d-9109-43a3-8040-f37c91ebb238', 'store_kind', 'beauty');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'd1039351-6995-4f6d-80d0-13e412ee208d';
DELETE FROM overture_poi_type WHERE overture_id = 'd1039351-6995-4f6d-80d0-13e412ee208d';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d1039351-6995-4f6d-80d0-13e412ee208d', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd1039351-6995-4f6d-80d0-13e412ee208d' AND dimension = 'store_kind';
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
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'd220c203-6e5b-4b2c-90b7-7848b912c45a';
DELETE FROM overture_poi_type WHERE overture_id = 'd220c203-6e5b-4b2c-90b7-7848b912c45a';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d220c203-6e5b-4b2c-90b7-7848b912c45a', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd220c203-6e5b-4b2c-90b7-7848b912c45a' AND dimension = 'store_kind';
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
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '43a708f3-024c-44ec-9392-bb02a7f4ee39';
DELETE FROM overture_poi_type WHERE overture_id = '43a708f3-024c-44ec-9392-bb02a7f4ee39';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('43a708f3-024c-44ec-9392-bb02a7f4ee39', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '43a708f3-024c-44ec-9392-bb02a7f4ee39' AND dimension = 'store_kind';
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
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'd3cc067d-7ed4-4719-9a9d-a92d65b50feb';
DELETE FROM overture_poi_type WHERE overture_id = 'd3cc067d-7ed4-4719-9a9d-a92d65b50feb';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d3cc067d-7ed4-4719-9a9d-a92d65b50feb', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd3cc067d-7ed4-4719-9a9d-a92d65b50feb' AND dimension = 'store_kind';
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
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '3', updated_at = '2026-11-15' WHERE overture_id = 'eba471fe-e42e-4900-8189-14588765b5a0';
DELETE FROM overture_poi_type WHERE overture_id = 'eba471fe-e42e-4900-8189-14588765b5a0';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('eba471fe-e42e-4900-8189-14588765b5a0', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'eba471fe-e42e-4900-8189-14588765b5a0' AND dimension = 'store_kind';
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
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '648567e2-65e7-49fb-a86f-4445468741a5';
DELETE FROM overture_poi_type WHERE overture_id = '648567e2-65e7-49fb-a86f-4445468741a5';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('648567e2-65e7-49fb-a86f-4445468741a5', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '648567e2-65e7-49fb-a86f-4445468741a5' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'dd14780a-b5d0-49ff-9f13-6abe6db6de20';
DELETE FROM overture_poi_type WHERE overture_id = 'dd14780a-b5d0-49ff-9f13-6abe6db6de20';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('dd14780a-b5d0-49ff-9f13-6abe6db6de20', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'dd14780a-b5d0-49ff-9f13-6abe6db6de20' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('dd14780a-b5d0-49ff-9f13-6abe6db6de20', 'store_kind', 'phone');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '01fea7f1-7e42-4d0a-864d-55f39316eeb7';
DELETE FROM overture_poi_type WHERE overture_id = '01fea7f1-7e42-4d0a-864d-55f39316eeb7';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('01fea7f1-7e42-4d0a-864d-55f39316eeb7', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '01fea7f1-7e42-4d0a-864d-55f39316eeb7' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'phone_repair', floor = '0', updated_at = '2026-11-15' WHERE overture_id = '24967e46-5ea4-48b2-a7de-d2bf1fa16616';
DELETE FROM overture_poi_type WHERE overture_id = '24967e46-5ea4-48b2-a7de-d2bf1fa16616';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('24967e46-5ea4-48b2-a7de-d2bf1fa16616', 'phone_repair', 0), ('24967e46-5ea4-48b2-a7de-d2bf1fa16616', 'store', 1);
DELETE FROM overture_poi_attribute WHERE overture_id = '24967e46-5ea4-48b2-a7de-d2bf1fa16616' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('24967e46-5ea4-48b2-a7de-d2bf1fa16616', 'store_kind', 'electronics');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15' WHERE overture_id = 'd5a5c60b-f7a7-4152-866a-1788a3155ab7';
DELETE FROM overture_poi_type WHERE overture_id = 'd5a5c60b-f7a7-4152-866a-1788a3155ab7';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d5a5c60b-f7a7-4152-866a-1788a3155ab7', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd5a5c60b-f7a7-4152-866a-1788a3155ab7' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('d5a5c60b-f7a7-4152-866a-1788a3155ab7', 'store_kind', 'home');
UPDATE curated_poi SET primary_poi_type = 'laundry', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:5-a-sec';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:5-a-sec' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:acium';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:acium' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:acium', 'store_kind', 'jewelry');
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
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:amigo';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:amigo' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'cafe', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:arcadia-nescafe';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:arcadia-nescafe' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'cafe', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:ardina-caffe';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:ardina-caffe' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'cafe', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:ardina-caffe-2';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:ardina-caffe-2' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'car_rental', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:avis';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:avis' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057243010';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057243010' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057243010', 'store_kind', 'shoes');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:baan-canteen';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:baan-canteen' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057098953';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057098953' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057098953', 'store_kind', 'beauty');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:benfica-official-store';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:benfica-official-store' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:benfica-official-store', 'store_kind', 'sports');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:blue-banana';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:blue-banana' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:blue-banana', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'shoe_repair', floor = NULL, updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:bota-minuto';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:bota-minuto' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'shoe_repair', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1464366473';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1464366473' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'bakery', floor = '3', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:bread-friends';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:bread-friends' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:brownie';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:brownie' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:brownie', 'store_kind', 'womens_clothing');
UPDATE curated_poi SET primary_poi_type = 'cafe', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:cafe-jeronymo';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:cafe-jeronymo' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'local_government_office', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:cartorio-lurdes-pires';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:cartorio-lurdes-pires' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'car_wash', floor = NULL, updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1464366474';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1464366474' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057242992';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057242992' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057242992', 'store_kind', 'handbag');
UPDATE curated_poi SET primary_poi_type = 'nail_salon', floor = NULL, updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:centro-de-estetica-e-unhas';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:centro-de-estetica-e-unhas' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '3', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:cervejaria-malandra';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:cervejaria-malandra' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:cex';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:cex' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:cex', 'store_kind', 'electronics');
UPDATE curated_poi SET primary_poi_type = 'cafe', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057098958';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057098958' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'post', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:ctt-correios-de-portugal';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:ctt-correios-de-portugal' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:desejo-pronto-delicious-coffe-grill';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:desejo-pronto-delicious-coffe-grill' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057099001';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057099001' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057099001', 'store_kind', 'shoes');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:empanadas';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:empanadas' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'car_rental', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:europcar';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:europcar' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'cafe', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:expresso-do-oriente';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:expresso-do-oriente' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'pharmacy', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:farmacia-gare-do-oriente';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:farmacia-gare-do-oriente' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '3', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:feel-rio';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:feel-rio' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'bus_station', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:flixbus';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:flixbus' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:flying-tiger-copenhagen';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:flying-tiger-copenhagen' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:flying-tiger-copenhagen', 'store_kind', 'gift');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:fnac';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:fnac' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:fnac', 'store_kind', 'books');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:footsport-outlaw';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:footsport-outlaw' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:footsport-outlaw', 'store_kind', 'shoes');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:frango-da-gare';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:frango-da-gare' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '3', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:furio';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:furio' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'gas_station', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:galp';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:galp' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:gant';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:gant' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:gant', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '3', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:gulden-draak';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:gulden-draak' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:gulden-draak', 'store_kind', 'wine_and_spirits');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057098935';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057098935' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:happ-li';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:happ-li' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:happ-li', 'store_kind', 'fashion_accessories');
UPDATE curated_poi SET primary_poi_type = 'bakery', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:happy-cookies';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:happy-cookies' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'clinic', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:imed-vasco-da-gama';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:imed-vasco-da-gama' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:inspiral';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:inspiral' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:inspiral', 'store_kind', 'phone');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:intimissimi-uomo';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:intimissimi-uomo' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:intimissimi-uomo', 'store_kind', 'mens_clothing');
UPDATE curated_poi SET primary_poi_type = 'tobacco', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:iqos';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:iqos' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'phone_repair', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057098972';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057098972' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057098978';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057098978' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057098978', 'store_kind', 'electronics');
UPDATE curated_poi SET primary_poi_type = 'bakery', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:jrn-docarias';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:jrn-docarias' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = NULL, updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:kik';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:kik' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:kik', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:kiwoko';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:kiwoko' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:kiwoko', 'store_kind', 'pet');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:l-oreal';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:l-oreal' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:l-oreal', 'store_kind', 'beauty');
UPDATE curated_poi SET primary_poi_type = 'medical_lab', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:labco-analises-clinicas';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:labco-analises-clinicas' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '3', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:las-muns';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:las-muns' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057099000';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057099000' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057099000', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:lola';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:lola' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:lola', 'store_kind', 'shoes');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057098951';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057098951' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057098951', 'store_kind', 'eyewear_and_optician');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:mango-teen';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:mango-teen' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:mango-teen', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:meo';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:meo' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:meo', 'store_kind', 'phone');
UPDATE curated_poi SET primary_poi_type = 'bank', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:millennium-bcp';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:millennium-bcp' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:misako';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:misako' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:misako', 'store_kind', 'jewelry');
UPDATE curated_poi SET primary_poi_type = 'ice_cream', floor = '3', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:mu-gelato-italiano';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:mu-gelato-italiano' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'bank', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057242948';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057242948' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'car_repair', floor = '-1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:myforce';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:myforce' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:nespresso';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:nespresso' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:nespresso', 'store_kind', 'coffee_supplies');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '3', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:noori-lab';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:noori-lab' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:noori-pots';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:noori-pots' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:nos';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:nos' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:nos', 'store_kind', 'phone');
UPDATE curated_poi SET primary_poi_type = 'currency_exchange', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:nova-cambios';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:nova-cambios' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:nutrystore';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:nutrystore' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:nutrystore', 'store_kind', 'vitamins_and_supplements');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '3', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:o-forno-do-leitao-do-ze';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:o-forno-do-leitao-do-ze' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:o-lisboeta';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:o-lisboeta' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'bakery', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:o-mundo-das-gomas';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:o-mundo-das-gomas' AND dimension IN ('store_kind', 'poi_type');
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
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '3', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:panda-cantina';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:panda-cantina' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = NULL, updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:pluricosmetica';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:pluricosmetica' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:pluricosmetica', 'store_kind', 'beauty');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:pluricosmetica-2';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:pluricosmetica-2' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:pluricosmetica-2', 'store_kind', 'beauty');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '3', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:poke-house';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:poke-house' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'cafe', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:portela-cafes';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:portela-cafes' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057098952';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057098952' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057098952', 'store_kind', 'newspaper_and_magazines');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:print-point-expo';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:print-point-expo' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:print-point-expo', 'store_kind', 'copy_shop');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057242955';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057242955' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057242955', 'store_kind', 'shoes');
UPDATE curated_poi SET primary_poi_type = 'car_rental', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:rentauto';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:rentauto' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = NULL, updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:restaurante-da-gare';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:restaurante-da-gare' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '3', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:santa-francesinha-by-cufra';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:santa-francesinha-by-cufra' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057242957';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057242957' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057242957', 'store_kind', 'shoes');
UPDATE curated_poi SET primary_poi_type = 'cafe', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:sporting';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:sporting' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057099012';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057099012' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057099012', 'store_kind', 'shoes');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:street-smash-burger';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:street-smash-burger' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:subway';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:subway' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:pt-38.767599--9.097919';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:pt-38.767599--9.097919' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:pt-38.767599--9.097919', 'store_kind', 'jewelry');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:tabink';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:tabink' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:tabink', 'store_kind', 'books');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057098962';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057098962' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'tea', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057242968';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057242968' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'travel_agency', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057243016';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057243016' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'currency_exchange', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1058308030';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1058308030' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'currency_exchange', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:unicambio-gare';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:unicambio-gare' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = NULL, updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:universo-senior';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:universo-senior' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:universo-senior', 'store_kind', 'medical_supply');
UPDATE curated_poi SET primary_poi_type = 'ice_cream', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:weeel';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:weeel' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'nail_salon', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:wink';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:wink' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'bank', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:wizink';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:wizink' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057099022';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057099022' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057099022', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:woo';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:woo' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:woo', 'store_kind', 'phone');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:wtf';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:wtf' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:wtf', 'store_kind', 'phone');
UPDATE curated_poi SET primary_poi_type = 'store', floor = NULL, updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:vasco_da_gama:xtreme';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:vasco_da_gama:xtreme' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:xtreme', 'store_kind', 'shoes');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057242989';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057242989' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057242989', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '0', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1057242995';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1057242995' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1057242995', 'store_kind', 'clothing');
INSERT INTO curated_poi (poi_id, source, name, dedupe_name, lat, lng, geohash, primary_poi_type, brand, address, floor, country_code, status, created_at, created_by, updated_at, updated_by, origin_source, origin_id, origin_licence, imported_at, import_run_id) VALUES
('mall:vasco_da_gama:2-life', 'community', '2 Life', '2 life', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:2-life', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-site-2026-11-15'),
('mall:vasco_da_gama:aurya', 'community', 'AURYA', 'aurya', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:aurya', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-site-2026-11-15'),
('mall:vasco_da_gama:bershka', 'community', 'BERSHKA', 'bershka', 38.7674183, -9.0961717, 'eycs912ke', 'store', 'Bershka', NULL, '1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:bershka', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-site-2026-11-15'),
('mall:vasco_da_gama:boali', 'community', 'BOALI', 'boali', 38.767696, -9.0968202, 'eycs8cryh', 'restaurant', NULL, NULL, '3', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:boali', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-site-2026-11-15'),
('mall:vasco_da_gama:coffee-me', 'community', 'Coffee & Me', 'coffee me', 38.7675993, -9.0974938, 'eycs8crmt', 'cafe', NULL, NULL, '1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:coffee-me', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-site-2026-11-15'),
('mall:vasco_da_gama:cooland', 'community', 'COOLAND', 'cooland', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:cooland', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-site-2026-11-15'),
('mall:vasco_da_gama:fabric-store', 'community', 'Fabric Store', 'fabric store', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:fabric-store', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-site-2026-11-15'),
('mall:vasco_da_gama:figu', 'community', 'FIGU', 'figu', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:figu', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-site-2026-11-15'),
('mall:vasco_da_gama:grazze', 'community', 'Grazze', 'grazze', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:grazze', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-site-2026-11-15'),
('mall:vasco_da_gama:intercentro', 'community', 'Intercentro', 'intercentro', 38.767696, -9.0968202, 'eycs8cryh', 'bus_station', NULL, NULL, '1', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:intercentro', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-site-2026-11-15'),
('mall:vasco_da_gama:jmb', 'community', 'JMB', 'jmb', 38.767696, -9.0968202, 'eycs8cryh', 'cafe', NULL, NULL, '2', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:jmb', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-site-2026-11-15'),
('mall:vasco_da_gama:just-k', 'community', 'JUST K', 'just k', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:just-k', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-site-2026-11-15'),
('mall:vasco_da_gama:marie-blachere', 'community', 'Marie Blachère', 'marie blachere', 38.767696, -9.0968202, 'eycs8cryh', 'bakery', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:marie-blachere', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-site-2026-11-15'),
('mall:vasco_da_gama:well-s-otica', 'community', 'WELL''S ÓTICA', 'well s otica', 38.767696, -9.0968202, 'eycs8cryh', 'store', NULL, NULL, '0', 'PT', 'active', '2026-11-15', 'kan-439-mall-tenants', '2026-11-15', 'kan-439-mall-tenants', 'mall_directory', 'mall:vasco_da_gama:well-s-otica', 'ODbL', '2026-11-15', 'kan-517-vasco_da_gama-site-2026-11-15')
ON CONFLICT (poi_id) DO NOTHING;
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:vasco_da_gama:2-life', 'store_kind', 'pawn'),
('mall:vasco_da_gama:aurya', 'store_kind', 'beauty'),
('mall:vasco_da_gama:bershka', 'store_kind', 'clothing'),
('mall:vasco_da_gama:cooland', 'store_kind', 'phone'),
('mall:vasco_da_gama:fabric-store', 'store_kind', 'home'),
('mall:vasco_da_gama:figu', 'store_kind', 'jewelry'),
('mall:vasco_da_gama:grazze', 'store_kind', 'womens_clothing'),
('mall:vasco_da_gama:just-k', 'store_kind', 'beauty'),
('mall:vasco_da_gama:well-s-otica', 'store_kind', 'eyewear_and_optician');
