-- KAN-517. Strada Outlet holds exactly what stradaoutlet.pt shows (owner,
-- 2026-11-14): the site's 115 units with the floor on each store's page.
-- Written by reconcile_mall_list.py from mall_lists/strada.txt. Nothing deleted.
-- Not written: Cartório Notarial de Odivelas, Remax Place (no type yet).

INSERT INTO poi_source_correction (source, source_id, visible, review_note, created_at) VALUES
  ('overture', '7d050f98-a822-4d64-9ab5-f7a068d1a863', 0, 'KAN-517: same shop as listed ''Puma'', held twice; the other row kept', '2026-11-14'),
  ('overture', '89caaf4f-27d2-428d-b902-30a647cf1f4b', 0, 'KAN-517: same shop as listed ''Mr. Pizza/Ice It'', held twice; the other row kept', '2026-11-14'),
  ('overture', '0f6af00f-6ea9-48d4-b8d1-daaa386de478', 0, 'KAN-517: not on the Strada Outlet tenant list', '2026-11-14'),
  ('overture', '27ef61f6-4aa8-4cb1-9802-873c4c9503d8', 0, 'KAN-517: not on the Strada Outlet tenant list', '2026-11-14'),
  ('overture', '2b26439c-5229-4b76-b4c9-a631e4a5f704', 0, 'KAN-517: not on the Strada Outlet tenant list', '2026-11-14'),
  ('overture', '39c03064-a012-47a7-99ae-5ce8bb403b76', 0, 'KAN-517: not on the Strada Outlet tenant list', '2026-11-14'),
  ('overture', '595bbafc-edd5-4464-acb6-54bcb0a9bef5', 0, 'KAN-517: not on the Strada Outlet tenant list', '2026-11-14'),
  ('overture', '6b5b02e1-fdd5-4ee3-b749-3a49d0b8b602', 0, 'KAN-517: not on the Strada Outlet tenant list', '2026-11-14'),
  ('overture', '6cce2849-0221-4dca-ba6c-35d0a52ca793', 0, 'KAN-517: not on the Strada Outlet tenant list', '2026-11-14'),
  ('overture', '75876948-44df-4aeb-81a0-42bf6f3a83ef', 0, 'KAN-517: not on the Strada Outlet tenant list', '2026-11-14'),
  ('overture', '7adb0977-75d0-4d8e-abf0-0a7f502f9343', 0, 'KAN-517: not on the Strada Outlet tenant list', '2026-11-14'),
  ('overture', '83d163ee-345f-4a19-b4f3-8af0a208433a', 0, 'KAN-517: not on the Strada Outlet tenant list', '2026-11-14'),
  ('overture', '999be556-186a-436a-9d4b-632a8d6a2d07', 0, 'KAN-517: not on the Strada Outlet tenant list', '2026-11-14'),
  ('overture', 'ac361a20-b4be-439e-80df-5d93dc03c8a7', 0, 'KAN-517: not on the Strada Outlet tenant list', '2026-11-14'),
  ('overture', 'b245a641-c70b-48ec-ac22-b4adb62cbbf3', 0, 'KAN-517: not on the Strada Outlet tenant list', '2026-11-14'),
  ('overture', 'b5963402-95e2-42e0-be41-80f44f0b852c', 0, 'KAN-517: not on the Strada Outlet tenant list', '2026-11-14'),
  ('overture', 'cf4d0665-c3ad-4bf3-b16a-3753f2316929', 0, 'KAN-517: not on the Strada Outlet tenant list', '2026-11-14'),
  ('overture', '82a93a8d-5d5b-44a7-825b-9fee1e8f6cc0', 0, 'KAN-517: not on the Strada Outlet tenant list', '2026-11-14'),
  ('overture', '8ef12838-9d6a-4b7e-9c11-fe79459aa306', 0, 'KAN-517: not on the Strada Outlet tenant list', '2026-11-14')
ON CONFLICT (source, source_id) DO UPDATE SET visible = 0, review_note = excluded.review_note;
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'd0e1b94d-f53f-4f1c-8d13-cb67c901a799';
DELETE FROM overture_poi_type WHERE overture_id = 'd0e1b94d-f53f-4f1c-8d13-cb67c901a799';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d0e1b94d-f53f-4f1c-8d13-cb67c901a799', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd0e1b94d-f53f-4f1c-8d13-cb67c901a799' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('d0e1b94d-f53f-4f1c-8d13-cb67c901a799', 'store_kind', 'pet');
UPDATE overture_poi SET primary_poi_type = 'laundry', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '874a1d77-40e0-4a14-b765-f8b3b15bc1a5';
DELETE FROM overture_poi_type WHERE overture_id = '874a1d77-40e0-4a14-b765-f8b3b15bc1a5';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('874a1d77-40e0-4a14-b765-f8b3b15bc1a5', 'laundry', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '874a1d77-40e0-4a14-b765-f8b3b15bc1a5' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'bakery', floor = '2', updated_at = '2026-11-14' WHERE overture_id = '154d60f3-fff2-40ec-9aba-616c4b986810';
DELETE FROM overture_poi_type WHERE overture_id = '154d60f3-fff2-40ec-9aba-616c4b986810';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('154d60f3-fff2-40ec-9aba-616c4b986810', 'bakery', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '154d60f3-fff2-40ec-9aba-616c4b986810' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '4e9f482c-4986-4710-8314-6e6a61e25a5d';
DELETE FROM overture_poi_type WHERE overture_id = '4e9f482c-4986-4710-8314-6e6a61e25a5d';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('4e9f482c-4986-4710-8314-6e6a61e25a5d', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '4e9f482c-4986-4710-8314-6e6a61e25a5d' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('4e9f482c-4986-4710-8314-6e6a61e25a5d', 'store_kind', 'jewelry');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-14' WHERE overture_id = '6fb296ad-ef84-4cb5-96ad-0daa8b3ec7f0';
DELETE FROM overture_poi_type WHERE overture_id = '6fb296ad-ef84-4cb5-96ad-0daa8b3ec7f0';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('6fb296ad-ef84-4cb5-96ad-0daa8b3ec7f0', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '6fb296ad-ef84-4cb5-96ad-0daa8b3ec7f0' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '5c2737f7-81aa-43dc-839e-4bce059647a0';
DELETE FROM overture_poi_type WHERE overture_id = '5c2737f7-81aa-43dc-839e-4bce059647a0';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('5c2737f7-81aa-43dc-839e-4bce059647a0', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '5c2737f7-81aa-43dc-839e-4bce059647a0' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('5c2737f7-81aa-43dc-839e-4bce059647a0', 'store_kind', 'club_store');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'f696a458-fb21-405d-b96d-80bfe071da64';
DELETE FROM overture_poi_type WHERE overture_id = 'f696a458-fb21-405d-b96d-80bfe071da64';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('f696a458-fb21-405d-b96d-80bfe071da64', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'f696a458-fb21-405d-b96d-80bfe071da64' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('f696a458-fb21-405d-b96d-80bfe071da64', 'store_kind', 'shoes');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-14' WHERE overture_id = '30b8da53-2e6f-43f7-a1c5-3c246167b5c4';
DELETE FROM overture_poi_type WHERE overture_id = '30b8da53-2e6f-43f7-a1c5-3c246167b5c4';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('30b8da53-2e6f-43f7-a1c5-3c246167b5c4', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '30b8da53-2e6f-43f7-a1c5-3c246167b5c4' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('30b8da53-2e6f-43f7-a1c5-3c246167b5c4', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-14' WHERE overture_id = '85c58389-1ce2-48f0-98cb-1e7987b07e53';
DELETE FROM overture_poi_type WHERE overture_id = '85c58389-1ce2-48f0-98cb-1e7987b07e53';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('85c58389-1ce2-48f0-98cb-1e7987b07e53', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '85c58389-1ce2-48f0-98cb-1e7987b07e53' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '6dc1c6b8-6560-42ab-941d-6817b768956a';
DELETE FROM overture_poi_type WHERE overture_id = '6dc1c6b8-6560-42ab-941d-6817b768956a';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('6dc1c6b8-6560-42ab-941d-6817b768956a', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '6dc1c6b8-6560-42ab-941d-6817b768956a' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('6dc1c6b8-6560-42ab-941d-6817b768956a', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'car_wash', floor = '-1', updated_at = '2026-11-14' WHERE overture_id = 'c56cb6d8-10bb-460c-ad13-b05c3416e868';
DELETE FROM overture_poi_type WHERE overture_id = 'c56cb6d8-10bb-460c-ad13-b05c3416e868';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('c56cb6d8-10bb-460c-ad13-b05c3416e868', 'car_wash', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'c56cb6d8-10bb-460c-ad13-b05c3416e868' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'supermarket', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '438c7086-44da-4510-94e6-e6214f47d4f2';
DELETE FROM overture_poi_type WHERE overture_id = '438c7086-44da-4510-94e6-e6214f47d4f2';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('438c7086-44da-4510-94e6-e6214f47d4f2', 'supermarket', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '438c7086-44da-4510-94e6-e6214f47d4f2' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'movie_theater', floor = '2', updated_at = '2026-11-14' WHERE overture_id = 'e8d4f845-d7a2-493c-aad8-b9783db38fc5';
DELETE FROM overture_poi_type WHERE overture_id = 'e8d4f845-d7a2-493c-aad8-b9783db38fc5';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('e8d4f845-d7a2-493c-aad8-b9783db38fc5', 'movie_theater', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'e8d4f845-d7a2-493c-aad8-b9783db38fc5' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-14' WHERE overture_id = '527ee5da-1944-4b1b-9357-40f73d72b968';
DELETE FROM overture_poi_type WHERE overture_id = '527ee5da-1944-4b1b-9357-40f73d72b968';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('527ee5da-1944-4b1b-9357-40f73d72b968', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '527ee5da-1944-4b1b-9357-40f73d72b968' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'lottery', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '6f095e7a-3c6d-4d76-b14c-4d9c4a004479';
DELETE FROM overture_poi_type WHERE overture_id = '6f095e7a-3c6d-4d76-b14c-4d9c4a004479';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('6f095e7a-3c6d-4d76-b14c-4d9c4a004479', 'lottery', 0), ('6f095e7a-3c6d-4d76-b14c-4d9c4a004479', 'store', 1);
DELETE FROM overture_poi_attribute WHERE overture_id = '6f095e7a-3c6d-4d76-b14c-4d9c4a004479' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('6f095e7a-3c6d-4d76-b14c-4d9c4a004479', 'store_kind', 'tobacco');
UPDATE overture_poi SET primary_poi_type = 'pharmacy', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '36a43176-dcf8-4ce8-8404-8be78c2f8565';
DELETE FROM overture_poi_type WHERE overture_id = '36a43176-dcf8-4ce8-8404-8be78c2f8565';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('36a43176-dcf8-4ce8-8404-8be78c2f8565', 'pharmacy', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '36a43176-dcf8-4ce8-8404-8be78c2f8565' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '9c196d85-d0a3-4ac0-b651-83fc710c60a7';
DELETE FROM overture_poi_type WHERE overture_id = '9c196d85-d0a3-4ac0-b651-83fc710c60a7';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('9c196d85-d0a3-4ac0-b651-83fc710c60a7', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '9c196d85-d0a3-4ac0-b651-83fc710c60a7' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('9c196d85-d0a3-4ac0-b651-83fc710c60a7', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '8f633214-512a-452d-b4cc-3d067ba6c1c5';
DELETE FROM overture_poi_type WHERE overture_id = '8f633214-512a-452d-b4cc-3d067ba6c1c5';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('8f633214-512a-452d-b4cc-3d067ba6c1c5', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '8f633214-512a-452d-b4cc-3d067ba6c1c5' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('8f633214-512a-452d-b4cc-3d067ba6c1c5', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-14' WHERE overture_id = '6b59b116-d7f9-4e28-88f7-9466a0ae59d5';
DELETE FROM overture_poi_type WHERE overture_id = '6b59b116-d7f9-4e28-88f7-9466a0ae59d5';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('6b59b116-d7f9-4e28-88f7-9466a0ae59d5', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '6b59b116-d7f9-4e28-88f7-9466a0ae59d5' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'phone_repair', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '487fd9b8-17e8-4bb1-9c60-6c4cc8ff18a5';
DELETE FROM overture_poi_type WHERE overture_id = '487fd9b8-17e8-4bb1-9c60-6c4cc8ff18a5';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('487fd9b8-17e8-4bb1-9c60-6c4cc8ff18a5', 'phone_repair', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '487fd9b8-17e8-4bb1-9c60-6c4cc8ff18a5' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-14' WHERE overture_id = '5771c70a-1d6c-4780-b62c-85599d48fee4';
DELETE FROM overture_poi_type WHERE overture_id = '5771c70a-1d6c-4780-b62c-85599d48fee4';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('5771c70a-1d6c-4780-b62c-85599d48fee4', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '5771c70a-1d6c-4780-b62c-85599d48fee4' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '70581b0d-a5cc-44b6-8fb1-a50275570498';
DELETE FROM overture_poi_type WHERE overture_id = '70581b0d-a5cc-44b6-8fb1-a50275570498';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('70581b0d-a5cc-44b6-8fb1-a50275570498', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '70581b0d-a5cc-44b6-8fb1-a50275570498' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('70581b0d-a5cc-44b6-8fb1-a50275570498', 'store_kind', 'beauty');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '4e1c98c6-2892-4420-b61d-f72f292ec3a5';
DELETE FROM overture_poi_type WHERE overture_id = '4e1c98c6-2892-4420-b61d-f72f292ec3a5';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('4e1c98c6-2892-4420-b61d-f72f292ec3a5', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '4e1c98c6-2892-4420-b61d-f72f292ec3a5' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('4e1c98c6-2892-4420-b61d-f72f292ec3a5', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '13371d50-c20e-4b14-bf0e-817ed3bc27e7';
DELETE FROM overture_poi_type WHERE overture_id = '13371d50-c20e-4b14-bf0e-817ed3bc27e7';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('13371d50-c20e-4b14-bf0e-817ed3bc27e7', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '13371d50-c20e-4b14-bf0e-817ed3bc27e7' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('13371d50-c20e-4b14-bf0e-817ed3bc27e7', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '018dbe0d-39f9-433f-9539-3e7a40633247';
DELETE FROM overture_poi_type WHERE overture_id = '018dbe0d-39f9-433f-9539-3e7a40633247';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('018dbe0d-39f9-433f-9539-3e7a40633247', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '018dbe0d-39f9-433f-9539-3e7a40633247' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('018dbe0d-39f9-433f-9539-3e7a40633247', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-14' WHERE overture_id = 'c6034eee-e10f-4c73-99d9-0989e514b64b';
DELETE FROM overture_poi_type WHERE overture_id = 'c6034eee-e10f-4c73-99d9-0989e514b64b';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('c6034eee-e10f-4c73-99d9-0989e514b64b', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'c6034eee-e10f-4c73-99d9-0989e514b64b' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-14' WHERE overture_id = '05665b5c-0ffc-4bda-8dac-978ee08ecb7e';
DELETE FROM overture_poi_type WHERE overture_id = '05665b5c-0ffc-4bda-8dac-978ee08ecb7e';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('05665b5c-0ffc-4bda-8dac-978ee08ecb7e', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '05665b5c-0ffc-4bda-8dac-978ee08ecb7e' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('05665b5c-0ffc-4bda-8dac-978ee08ecb7e', 'store_kind', 'phone');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-14' WHERE overture_id = '9f0955e0-2f53-4f62-bcf5-5653c9184231';
DELETE FROM overture_poi_type WHERE overture_id = '9f0955e0-2f53-4f62-bcf5-5653c9184231';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('9f0955e0-2f53-4f62-bcf5-5653c9184231', 'restaurant', 0), ('9f0955e0-2f53-4f62-bcf5-5653c9184231', 'ice_cream', 1);
DELETE FROM overture_poi_attribute WHERE overture_id = '9f0955e0-2f53-4f62-bcf5-5653c9184231' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '9fe8cff5-0430-44e6-a37e-f4919b90385c';
DELETE FROM overture_poi_type WHERE overture_id = '9fe8cff5-0430-44e6-a37e-f4919b90385c';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('9fe8cff5-0430-44e6-a37e-f4919b90385c', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '9fe8cff5-0430-44e6-a37e-f4919b90385c' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('9fe8cff5-0430-44e6-a37e-f4919b90385c', 'store_kind', 'eyewear_and_optician');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'f42e23f8-3e09-4446-a717-e90f510baf35';
DELETE FROM overture_poi_type WHERE overture_id = 'f42e23f8-3e09-4446-a717-e90f510baf35';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('f42e23f8-3e09-4446-a717-e90f510baf35', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'f42e23f8-3e09-4446-a717-e90f510baf35' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('f42e23f8-3e09-4446-a717-e90f510baf35', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'c8601aeb-35fc-4e67-99de-1dfdfec24d65';
DELETE FROM overture_poi_type WHERE overture_id = 'c8601aeb-35fc-4e67-99de-1dfdfec24d65';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('c8601aeb-35fc-4e67-99de-1dfdfec24d65', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'c8601aeb-35fc-4e67-99de-1dfdfec24d65' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('c8601aeb-35fc-4e67-99de-1dfdfec24d65', 'store_kind', 'beauty');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'f0de7bb6-1667-4563-b781-aacb5d7c7edd';
DELETE FROM overture_poi_type WHERE overture_id = 'f0de7bb6-1667-4563-b781-aacb5d7c7edd';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('f0de7bb6-1667-4563-b781-aacb5d7c7edd', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'f0de7bb6-1667-4563-b781-aacb5d7c7edd' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('f0de7bb6-1667-4563-b781-aacb5d7c7edd', 'store_kind', 'jewelry');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '19fa8139-1fce-495a-b076-cafc209d28be';
DELETE FROM overture_poi_type WHERE overture_id = '19fa8139-1fce-495a-b076-cafc209d28be';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('19fa8139-1fce-495a-b076-cafc209d28be', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '19fa8139-1fce-495a-b076-cafc209d28be' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('19fa8139-1fce-495a-b076-cafc209d28be', 'store_kind', 'beauty');
UPDATE overture_poi SET primary_poi_type = 'supermarket', floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'ccd22065-acf4-4c32-904d-3f900ec57b7e';
DELETE FROM overture_poi_type WHERE overture_id = 'ccd22065-acf4-4c32-904d-3f900ec57b7e';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('ccd22065-acf4-4c32-904d-3f900ec57b7e', 'supermarket', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'ccd22065-acf4-4c32-904d-3f900ec57b7e' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-14' WHERE overture_id = 'd90b4974-d21a-4685-abc9-760183d0a280';
DELETE FROM overture_poi_type WHERE overture_id = 'd90b4974-d21a-4685-abc9-760183d0a280';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d90b4974-d21a-4685-abc9-760183d0a280', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd90b4974-d21a-4685-abc9-760183d0a280' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-14' WHERE overture_id = '960997f5-c248-4fb0-84bb-d4cc82a96164';
DELETE FROM overture_poi_type WHERE overture_id = '960997f5-c248-4fb0-84bb-d4cc82a96164';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('960997f5-c248-4fb0-84bb-d4cc82a96164', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '960997f5-c248-4fb0-84bb-d4cc82a96164' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '151f472d-704b-41f7-8c69-c5ee08585838';
DELETE FROM overture_poi_type WHERE overture_id = '151f472d-704b-41f7-8c69-c5ee08585838';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('151f472d-704b-41f7-8c69-c5ee08585838', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '151f472d-704b-41f7-8c69-c5ee08585838' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('151f472d-704b-41f7-8c69-c5ee08585838', 'store_kind', 'sports');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'e35c4af4-f233-4326-b84f-1d3a7ce86443';
DELETE FROM overture_poi_type WHERE overture_id = 'e35c4af4-f233-4326-b84f-1d3a7ce86443';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('e35c4af4-f233-4326-b84f-1d3a7ce86443', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'e35c4af4-f233-4326-b84f-1d3a7ce86443' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('e35c4af4-f233-4326-b84f-1d3a7ce86443', 'store_kind', 'womens_clothing');
UPDATE overture_poi SET primary_poi_type = 'spa', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '649c2f3a-99e2-43ed-a771-da0468bfcc3d';
DELETE FROM overture_poi_type WHERE overture_id = '649c2f3a-99e2-43ed-a771-da0468bfcc3d';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('649c2f3a-99e2-43ed-a771-da0468bfcc3d', 'spa', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '649c2f3a-99e2-43ed-a771-da0468bfcc3d' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-14' WHERE overture_id = 'd34b9464-3e1a-46f3-9737-5d83771e5ec0';
DELETE FROM overture_poi_type WHERE overture_id = 'd34b9464-3e1a-46f3-9737-5d83771e5ec0';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d34b9464-3e1a-46f3-9737-5d83771e5ec0', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd34b9464-3e1a-46f3-9737-5d83771e5ec0' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '625798cc-b4dc-481a-b662-af00481b6512';
DELETE FROM overture_poi_type WHERE overture_id = '625798cc-b4dc-481a-b662-af00481b6512';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('625798cc-b4dc-481a-b662-af00481b6512', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '625798cc-b4dc-481a-b662-af00481b6512' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('625798cc-b4dc-481a-b662-af00481b6512', 'store_kind', 'childrens_clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'eda467c4-6a63-4b6e-ad0c-6aa83ccd1984';
DELETE FROM overture_poi_type WHERE overture_id = 'eda467c4-6a63-4b6e-ad0c-6aa83ccd1984';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('eda467c4-6a63-4b6e-ad0c-6aa83ccd1984', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'eda467c4-6a63-4b6e-ad0c-6aa83ccd1984' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('eda467c4-6a63-4b6e-ad0c-6aa83ccd1984', 'store_kind', 'beauty');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'fa8bcc99-c1b0-4ecb-86b7-a342326f3b18';
DELETE FROM overture_poi_type WHERE overture_id = 'fa8bcc99-c1b0-4ecb-86b7-a342326f3b18';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('fa8bcc99-c1b0-4ecb-86b7-a342326f3b18', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'fa8bcc99-c1b0-4ecb-86b7-a342326f3b18' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('fa8bcc99-c1b0-4ecb-86b7-a342326f3b18', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '99ffda47-5eeb-4aa6-b54b-5baeca3cf372';
DELETE FROM overture_poi_type WHERE overture_id = '99ffda47-5eeb-4aa6-b54b-5baeca3cf372';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('99ffda47-5eeb-4aa6-b54b-5baeca3cf372', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '99ffda47-5eeb-4aa6-b54b-5baeca3cf372' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('99ffda47-5eeb-4aa6-b54b-5baeca3cf372', 'store_kind', 'shoes');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-14' WHERE overture_id = '06984de0-b5b0-4dce-a296-55764244fb53';
DELETE FROM overture_poi_type WHERE overture_id = '06984de0-b5b0-4dce-a296-55764244fb53';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('06984de0-b5b0-4dce-a296-55764244fb53', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '06984de0-b5b0-4dce-a296-55764244fb53' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = 'f1f096e8-fab1-4e39-8fc4-0db186b9a1dd';
DELETE FROM overture_poi_type WHERE overture_id = 'f1f096e8-fab1-4e39-8fc4-0db186b9a1dd';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('f1f096e8-fab1-4e39-8fc4-0db186b9a1dd', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'f1f096e8-fab1-4e39-8fc4-0db186b9a1dd' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('f1f096e8-fab1-4e39-8fc4-0db186b9a1dd', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '6e07f5c7-bc9b-46ac-8348-be5726a9bc67';
DELETE FROM overture_poi_type WHERE overture_id = '6e07f5c7-bc9b-46ac-8348-be5726a9bc67';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('6e07f5c7-bc9b-46ac-8348-be5726a9bc67', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '6e07f5c7-bc9b-46ac-8348-be5726a9bc67' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('6e07f5c7-bc9b-46ac-8348-be5726a9bc67', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'gym', floor = '2', updated_at = '2026-11-14' WHERE overture_id = 'dbb1e7de-3fca-4860-afc5-4486eef047ac';
DELETE FROM overture_poi_type WHERE overture_id = 'dbb1e7de-3fca-4860-afc5-4486eef047ac';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('dbb1e7de-3fca-4860-afc5-4486eef047ac', 'gym', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'dbb1e7de-3fca-4860-afc5-4486eef047ac' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14' WHERE overture_id = '3106674a-937d-40f0-81b8-2281e4c03d3a';
DELETE FROM overture_poi_type WHERE overture_id = '3106674a-937d-40f0-81b8-2281e4c03d3a';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('3106674a-937d-40f0-81b8-2281e4c03d3a', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '3106674a-937d-40f0-81b8-2281e4c03d3a' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('3106674a-937d-40f0-81b8-2281e4c03d3a', 'store_kind', 'hearing_aid_provider');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-14' WHERE overture_id = '546cfa11-d300-48fb-b5ae-9c70aac2ad6e';
DELETE FROM overture_poi_type WHERE overture_id = '546cfa11-d300-48fb-b5ae-9c70aac2ad6e';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('546cfa11-d300-48fb-b5ae-9c70aac2ad6e', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '546cfa11-d300-48fb-b5ae-9c70aac2ad6e' AND dimension = 'store_kind';
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272900';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272900' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:node-13938064398';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:node-13938064398' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272875';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272875' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272875', 'store_kind', 'watch');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272940';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272940' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272940', 'store_kind', 'womens_clothing');
UPDATE curated_poi SET primary_poi_type = 'cafe', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272919';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272919' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528273000';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528273000' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528273000', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272976';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272976' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272976', 'store_kind', 'copy_shop');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272955';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272955' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272955', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'cafe', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272923';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272923' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272973';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272973' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272973', 'store_kind', 'photography_store_and_services');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272928';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272928' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272928', 'store_kind', 'mens_clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272965';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272965' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272965', 'store_kind', 'photography_store_and_services');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272981';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272981' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272981', 'store_kind', 'health_food');
UPDATE curated_poi SET primary_poi_type = 'hairdresser', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272964';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272964' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'phone_repair', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272974';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272974' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272974', 'store_kind', 'phone'),
('mall:way-1528272974', 'poi_type', 'store');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272892';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272892' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272968';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272968' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272968', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528273048';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528273048' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528273048', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272987';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272987' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272987', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'shoe_repair', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272977';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272977' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528273011';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528273011' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528273011', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'cafe', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272909';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272909' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528273051';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528273051' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528273037';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528273037' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528273037', 'store_kind', 'phone');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272943';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272943' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272943', 'store_kind', 'shoes');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272975';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272975' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272975', 'store_kind', 'gift');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528273016';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528273016' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528273016', 'store_kind', 'beauty');
UPDATE curated_poi SET primary_poi_type = 'cafe', floor = '2', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272983';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272983' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528273041';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528273041' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528273041', 'store_kind', 'newspaper_and_magazines');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272992';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272992' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272992', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272986';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272986' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272986', 'store_kind', 'handbag');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528273053';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528273053' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272954';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272954' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272954', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272935';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272935' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272935', 'store_kind', 'handbag');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272901';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272901' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272917';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272917' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272917', 'store_kind', 'shoes');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272882';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272882' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272882', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272931';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272931' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272931', 'store_kind', 'eyewear_and_optician');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272957';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272957' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272957', 'store_kind', 'jewelry');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272937';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272937' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528272937', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'currency_exchange', floor = '2', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528273050';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528273050' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528273050', 'poi_type', 'money_transfer');
UPDATE curated_poi SET primary_poi_type = 'travel_agency', floor = '1', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528273002';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528273002' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528273044';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528273044' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528273044', 'store_kind', 'home');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528272894';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528272894' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528273038';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528273038' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528273038', 'store_kind', 'phone');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528273029';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528273029' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528273029', 'store_kind', 'drugstore');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528273029-otica';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528273029-otica' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528273029-otica', 'store_kind', 'eyewear_and_optician');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-14', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:way-1528273022';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:way-1528273022' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:way-1528273022', 'store_kind', 'clothing');
INSERT INTO curated_poi (poi_id, source, name, dedupe_name, lat, lng, geohash, primary_poi_type, brand, address, floor, country_code, status, created_at, created_by, updated_at, updated_by, origin_source, origin_id, origin_licence, imported_at, import_run_id) VALUES
('mall:strada:bertrand', 'community', 'Bertrand', 'bertrand', 38.7819932, -9.1916077, 'eyckwu4ck', 'store', 'Bertrand', NULL, '2', 'PT', 'active', '2026-11-14', 'kan-439-mall-tenants', '2026-11-14', 'kan-439-mall-tenants', 'mall_directory', 'mall:strada:bertrand', 'ODbL', '2026-11-14', 'kan-517-strada-2026-11-14'),
('mall:strada:bigfoot', 'community', 'BigFoot', 'bigfoot', 38.782668, -9.1914071, 'eyckwu5j2', 'store', NULL, NULL, '1', 'PT', 'active', '2026-11-14', 'kan-439-mall-tenants', '2026-11-14', 'kan-439-mall-tenants', 'mall_directory', 'mall:strada:bigfoot', 'ODbL', '2026-11-14', 'kan-517-strada-2026-11-14'),
('mall:strada:cafe-do-ponto', 'community', 'Café do Ponto', 'cafe do ponto', 38.7820542, -9.1912383, 'eyckwu51u', 'cafe', NULL, NULL, '2', 'PT', 'active', '2026-11-14', 'kan-439-mall-tenants', '2026-11-14', 'kan-439-mall-tenants', 'mall_directory', 'mall:strada:cafe-do-ponto', 'ODbL', '2026-11-14', 'kan-517-strada-2026-11-14'),
('mall:strada:cort-cose', 'community', 'Cort&Cose', 'cort cose', 38.7822619, -9.1924735, 'eyckwu45p', 'clothing_repair', NULL, NULL, '0', 'PT', 'active', '2026-11-14', 'kan-439-mall-tenants', '2026-11-14', 'kan-439-mall-tenants', 'mall_directory', 'mall:strada:cort-cose', 'ODbL', '2026-11-14', 'kan-517-strada-2026-11-14'),
('mall:strada:loja-do-cidadao', 'community', 'Loja do Cidadão', 'loja do cidadao', 38.7818768, -9.1925719, 'eyckwu40v', 'local_government_office', NULL, NULL, '2', 'PT', 'active', '2026-11-14', 'kan-439-mall-tenants', '2026-11-14', 'kan-439-mall-tenants', 'mall_directory', 'mall:strada:loja-do-cidadao', 'ODbL', '2026-11-14', 'kan-517-strada-2026-11-14'),
('mall:strada:magnolia', 'community', 'Magnolia', 'magnolia', 38.7822619, -9.1924735, 'eyckwu45p', 'store', NULL, NULL, '1', 'PT', 'active', '2026-11-14', 'kan-439-mall-tenants', '2026-11-14', 'kan-439-mall-tenants', 'mall_directory', 'mall:strada:magnolia', 'ODbL', '2026-11-14', 'kan-517-strada-2026-11-14'),
('mall:strada:nutrystore', 'community', 'Nutrystore', 'nutrystore', 38.7822619, -9.1924735, 'eyckwu45p', 'store', NULL, NULL, '0', 'PT', 'active', '2026-11-14', 'kan-439-mall-tenants', '2026-11-14', 'kan-439-mall-tenants', 'mall_directory', 'mall:strada:nutrystore', 'ODbL', '2026-11-14', 'kan-517-strada-2026-11-14'),
('mall:strada:opticalia', 'community', 'Opticália', 'opticalia', 38.7822619, -9.1924735, 'eyckwu45p', 'store', NULL, NULL, '1', 'PT', 'active', '2026-11-14', 'kan-439-mall-tenants', '2026-11-14', 'kan-439-mall-tenants', 'mall_directory', 'mall:strada:opticalia', 'ODbL', '2026-11-14', 'kan-517-strada-2026-11-14'),
('mall:strada:sacoor', 'community', 'Sacoor', 'sacoor', 38.7818007, -9.191537, 'eyckwu4bm', 'store', NULL, NULL, '1', 'PT', 'active', '2026-11-14', 'kan-439-mall-tenants', '2026-11-14', 'kan-439-mall-tenants', 'mall_directory', 'mall:strada:sacoor', 'ODbL', '2026-11-14', 'kan-517-strada-2026-11-14'),
('mall:strada:santa-madalena-clinica-dentaria', 'community', 'Santa Madalena Clinica Dentária', 'santa madalena clinica dentaria', 38.7822263, -9.192351, 'eyckwu46f', 'clinic', NULL, NULL, '2', 'PT', 'active', '2026-11-14', 'kan-439-mall-tenants', '2026-11-14', 'kan-439-mall-tenants', 'mall_directory', 'mall:strada:santa-madalena-clinica-dentaria', 'ODbL', '2026-11-14', 'kan-517-strada-2026-11-14'),
('mall:strada:tagus-excellence-barber-shop', 'community', 'Tagus Excellence Barber Shop', 'tagus excellence barber shop', 38.7822619, -9.1924735, 'eyckwu45p', 'barber', NULL, NULL, '1', 'PT', 'active', '2026-11-14', 'kan-439-mall-tenants', '2026-11-14', 'kan-439-mall-tenants', 'mall_directory', 'mall:strada:tagus-excellence-barber-shop', 'ODbL', '2026-11-14', 'kan-517-strada-2026-11-14'),
('mall:strada:turismo-de-odivelas', 'community', 'Turismo de Odivelas', 'turismo de odivelas', 38.7818869, -9.1917198, 'eyckwu4bc', 'local_government_office', NULL, NULL, '2', 'PT', 'active', '2026-11-14', 'kan-439-mall-tenants', '2026-11-14', 'kan-439-mall-tenants', 'mall_directory', 'mall:strada:turismo-de-odivelas', 'ODbL', '2026-11-14', 'kan-517-strada-2026-11-14'),
('mall:strada:unisa', 'community', 'Unisa', 'unisa', 38.781708, -9.1918986, 'eyckwgfxv', 'store', NULL, NULL, '1', 'PT', 'active', '2026-11-14', 'kan-439-mall-tenants', '2026-11-14', 'kan-439-mall-tenants', 'mall_directory', 'mall:strada:unisa', 'ODbL', '2026-11-14', 'kan-517-strada-2026-11-14'),
('mall:strada:weeel-frozen-yogurt', 'community', 'Weeel Frozen Yogurt', 'weeel frozen yogurt', 38.7822619, -9.1924735, 'eyckwu45p', 'ice_cream', NULL, NULL, '0', 'PT', 'active', '2026-11-14', 'kan-439-mall-tenants', '2026-11-14', 'kan-439-mall-tenants', 'mall_directory', 'mall:strada:weeel-frozen-yogurt', 'ODbL', '2026-11-14', 'kan-517-strada-2026-11-14'),
('mall:strada:wink', 'community', 'Wiñk', 'wink', 38.7822619, -9.1924735, 'eyckwu45p', 'nail_salon', NULL, NULL, '1', 'PT', 'active', '2026-11-14', 'kan-439-mall-tenants', '2026-11-14', 'kan-439-mall-tenants', 'mall_directory', 'mall:strada:wink', 'ODbL', '2026-11-14', 'kan-517-strada-2026-11-14')
ON CONFLICT (poi_id) DO NOTHING;
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:strada:bertrand', 'store_kind', 'books'),
('mall:strada:bigfoot', 'store_kind', 'clothing'),
('mall:strada:magnolia', 'store_kind', 'jewelry'),
('mall:strada:nutrystore', 'store_kind', 'vitamins_and_supplements'),
('mall:strada:opticalia', 'store_kind', 'eyewear_and_optician'),
('mall:strada:sacoor', 'store_kind', 'womens_clothing'),
('mall:strada:unisa', 'store_kind', 'shoes');

-- The site has Café do Ponto twice, Piso 1 and Piso 2: the held row is the unit
-- at the second position, so it takes Piso 2 and the new row Piso 1.
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:strada:cafe-do-ponto';  -- Café do Ponto
UPDATE curated_poi SET floor = '2', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:way-1528272919';  -- Café do Ponto
