-- KAN-517. Amoreiras holds exactly the units its operator lists (owner, 2026-11-15:
-- only stores the venue site validates). Floors for Simple & Fast (Piso -2) and
-- Simple Eco Wash (Piso -1) from the owner. Written by reconcile_mall_list.py from
-- mall_lists/amoreiras.txt. Nothing deleted.

INSERT INTO poi_source_correction (source, source_id, visible, review_note, created_at) VALUES
  ('overture', '167da551-9f7b-49ae-92d2-759bc8a7567e', 0, 'KAN-517: same shop as listed ''Sushi Café'', held twice; the other row kept', '2026-11-15'),
  ('overture', '0930273b-ca96-4b44-89f3-3f443cf9f59c', 0, 'KAN-517: not on the Amoreiras Shopping Center tenant list', '2026-11-15'),
  ('overture', '11656bac-8079-4889-acab-6d0ca2dd75b9', 0, 'KAN-517: not on the Amoreiras Shopping Center tenant list', '2026-11-15'),
  ('overture', '2576f2ea-c7cf-4bd4-837e-1f555cbc80c0', 0, 'KAN-517: not on the Amoreiras Shopping Center tenant list', '2026-11-15'),
  ('overture', '47a09b46-a91c-4ee3-ab2e-0e9444e193e5', 0, 'KAN-517: not on the Amoreiras Shopping Center tenant list', '2026-11-15'),
  ('overture', '65e80d95-e983-4191-807b-c059c9cb3ca6', 0, 'KAN-517: not on the Amoreiras Shopping Center tenant list', '2026-11-15'),
  ('overture', '798172da-3002-4b16-9050-233846c278ce', 0, 'KAN-517: not on the Amoreiras Shopping Center tenant list', '2026-11-15'),
  ('overture', '8b9aec3a-eb99-4aac-9a94-e4560150bbe6', 0, 'KAN-517: not on the Amoreiras Shopping Center tenant list', '2026-11-15'),
  ('overture', '9f8f2739-7fa6-4c01-ac21-0302316e3bfb', 0, 'KAN-517: not on the Amoreiras Shopping Center tenant list', '2026-11-15'),
  ('overture', 'bcf31429-48d2-4256-a665-9f53c34dfbf6', 0, 'KAN-517: not on the Amoreiras Shopping Center tenant list', '2026-11-15'),
  ('overture', 'bda0e2b7-ac14-405a-8845-7e84a95dab31', 0, 'KAN-517: not on the Amoreiras Shopping Center tenant list', '2026-11-15'),
  ('overture', 'ec3f65d5-9e44-4ca7-aadd-25ee80090faa', 0, 'KAN-517: not on the Amoreiras Shopping Center tenant list', '2026-11-15'),
  ('overture', 'f6b705ac-85c7-4eff-b72b-445d2bcd6314', 0, 'KAN-517: not on the Amoreiras Shopping Center tenant list', '2026-11-15'),
  ('overture', '01c95b4c-dfbc-4375-8520-7998f0a89f3e', 0, 'KAN-517: not on the Amoreiras Shopping Center tenant list', '2026-11-15'),
  ('overture', '4d7ec5f6-c010-4de7-9bb7-ea8426ad5681', 0, 'KAN-517: not on the Amoreiras Shopping Center tenant list', '2026-11-15'),
  ('overture', '284d9e27-e0b5-4f29-af05-4dd081458b01', 0, 'KAN-517: not on the Amoreiras Shopping Center tenant list', '2026-11-15'),
  ('overture', '850d4487-6a82-48f2-8eb4-8903738de0d8', 0, 'KAN-517: not on the Amoreiras Shopping Center tenant list', '2026-11-15'),
  ('overture', '9a3353fb-22fe-4666-bc2d-a0b4c10c3b94', 0, 'KAN-517: not on the Amoreiras Shopping Center tenant list', '2026-11-15'),
  ('overture', 'bf170f92-d1cb-4400-a25a-5179fafd5354', 0, 'KAN-517: not on the Amoreiras Shopping Center tenant list', '2026-11-15'),
  ('overture', 'aec4b12c-ebb9-4bc0-81e3-9f118ae7861b', 0, 'KAN-517: not on the Amoreiras Shopping Center tenant list', '2026-11-15'),
  ('overture', '648d8056-3c1a-4103-8b1e-d09e3d16b285', 0, 'KAN-517: not on the Amoreiras Shopping Center tenant list', '2026-11-15'),
  ('overture', 'fe454ecb-59f7-4a3d-b5df-8eefae15fb5d', 0, 'KAN-517: not on the Amoreiras Shopping Center tenant list', '2026-11-15')
ON CONFLICT (source, source_id) DO UPDATE SET visible = 0, review_note = excluded.review_note;
UPDATE curated_poi SET status = 'removed', removed_at = '2026-11-15', removed_by = 'kan-439-mall-tenants', removal_reason = 'KAN-517: same shop as listed ''Capela das Amoreiras'', held twice; the other row kept' WHERE status = 'active' AND poi_id = 'fsq:50b792c2e4b0dd3bd919d7f9';
UPDATE overture_poi SET primary_poi_type = 'laundry', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '3cbcb850-cc86-4b00-b304-34817aa526fd';
DELETE FROM overture_poi_type WHERE overture_id = '3cbcb850-cc86-4b00-b304-34817aa526fd';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('3cbcb850-cc86-4b00-b304-34817aa526fd', 'laundry', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '3cbcb850-cc86-4b00-b304-34817aa526fd' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'bakery', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'f81aa4f2-374b-4166-86d9-a8f2a4b1ef62';
DELETE FROM overture_poi_type WHERE overture_id = 'f81aa4f2-374b-4166-86d9-a8f2a4b1ef62';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('f81aa4f2-374b-4166-86d9-a8f2a4b1ef62', 'bakery', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'f81aa4f2-374b-4166-86d9-a8f2a4b1ef62' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'bank', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'ee433098-7703-4ede-b285-e86b56844290';
DELETE FROM overture_poi_type WHERE overture_id = 'ee433098-7703-4ede-b285-e86b56844290';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('ee433098-7703-4ede-b285-e86b56844290', 'bank', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'ee433098-7703-4ede-b285-e86b56844290' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'df5283fa-c3c4-4fe2-8309-c23b75408773';
DELETE FROM overture_poi_type WHERE overture_id = 'df5283fa-c3c4-4fe2-8309-c23b75408773';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('df5283fa-c3c4-4fe2-8309-c23b75408773', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'df5283fa-c3c4-4fe2-8309-c23b75408773' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('df5283fa-c3c4-4fe2-8309-c23b75408773', 'store_kind', 'shoes');
UPDATE overture_poi SET primary_poi_type = 'bakery', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '70a20ecc-0422-423d-8a9c-ed180373eb2a';
DELETE FROM overture_poi_type WHERE overture_id = '70a20ecc-0422-423d-8a9c-ed180373eb2a';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('70a20ecc-0422-423d-8a9c-ed180373eb2a', 'bakery', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '70a20ecc-0422-423d-8a9c-ed180373eb2a' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'historical_landmark', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'af6a1794-b303-4115-b0b7-66d86e772bc2';
DELETE FROM overture_poi_type WHERE overture_id = 'af6a1794-b303-4115-b0b7-66d86e772bc2';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('af6a1794-b303-4115-b0b7-66d86e772bc2', 'historical_landmark', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'af6a1794-b303-4115-b0b7-66d86e772bc2' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '26c4eb8f-5bd4-4686-b107-74627b7590bf';
DELETE FROM overture_poi_type WHERE overture_id = '26c4eb8f-5bd4-4686-b107-74627b7590bf';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('26c4eb8f-5bd4-4686-b107-74627b7590bf', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '26c4eb8f-5bd4-4686-b107-74627b7590bf' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('26c4eb8f-5bd4-4686-b107-74627b7590bf', 'store_kind', 'jewelry');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'b0a8a552-f073-4cc8-9d6e-6e72ed158d47';
DELETE FROM overture_poi_type WHERE overture_id = 'b0a8a552-f073-4cc8-9d6e-6e72ed158d47';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('b0a8a552-f073-4cc8-9d6e-6e72ed158d47', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'b0a8a552-f073-4cc8-9d6e-6e72ed158d47' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('b0a8a552-f073-4cc8-9d6e-6e72ed158d47', 'store_kind', 'shoes');
UPDATE overture_poi SET primary_poi_type = 'bank', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '591d9623-5f69-4bb8-b38b-479169e87006';
DELETE FROM overture_poi_type WHERE overture_id = '591d9623-5f69-4bb8-b38b-479169e87006';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('591d9623-5f69-4bb8-b38b-479169e87006', 'bank', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '591d9623-5f69-4bb8-b38b-479169e87006' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'd03a711d-8b17-456d-86cc-504fb8fdf7b4';
DELETE FROM overture_poi_type WHERE overture_id = 'd03a711d-8b17-456d-86cc-504fb8fdf7b4';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d03a711d-8b17-456d-86cc-504fb8fdf7b4', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd03a711d-8b17-456d-86cc-504fb8fdf7b4' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('d03a711d-8b17-456d-86cc-504fb8fdf7b4', 'store_kind', 'electronics');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '0b50655a-8420-4516-b474-ca0b9caad421';
DELETE FROM overture_poi_type WHERE overture_id = '0b50655a-8420-4516-b474-ca0b9caad421';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('0b50655a-8420-4516-b474-ca0b9caad421', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '0b50655a-8420-4516-b474-ca0b9caad421' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('0b50655a-8420-4516-b474-ca0b9caad421', 'store_kind', 'beauty');
UPDATE overture_poi SET primary_poi_type = 'hairdresser', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '0fee1284-16be-4e80-8c22-37714ba7f3d0';
DELETE FROM overture_poi_type WHERE overture_id = '0fee1284-16be-4e80-8c22-37714ba7f3d0';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('0fee1284-16be-4e80-8c22-37714ba7f3d0', 'hairdresser', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '0fee1284-16be-4e80-8c22-37714ba7f3d0' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '51f1d351-6741-46c6-98fb-4ee5743a186e';
DELETE FROM overture_poi_type WHERE overture_id = '51f1d351-6741-46c6-98fb-4ee5743a186e';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('51f1d351-6741-46c6-98fb-4ee5743a186e', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '51f1d351-6741-46c6-98fb-4ee5743a186e' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('51f1d351-6741-46c6-98fb-4ee5743a186e', 'store_kind', 'books');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '7bde4116-0422-4cee-bccd-db5559b8b502';
DELETE FROM overture_poi_type WHERE overture_id = '7bde4116-0422-4cee-bccd-db5559b8b502';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('7bde4116-0422-4cee-bccd-db5559b8b502', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '7bde4116-0422-4cee-bccd-db5559b8b502' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('7bde4116-0422-4cee-bccd-db5559b8b502', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '7ff2cfb1-6b39-4f3f-9f1b-f3db66608b97';
DELETE FROM overture_poi_type WHERE overture_id = '7ff2cfb1-6b39-4f3f-9f1b-f3db66608b97';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('7ff2cfb1-6b39-4f3f-9f1b-f3db66608b97', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '7ff2cfb1-6b39-4f3f-9f1b-f3db66608b97' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '95a3e212-16f3-47f4-8973-9a94411fd356';
DELETE FROM overture_poi_type WHERE overture_id = '95a3e212-16f3-47f4-8973-9a94411fd356';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('95a3e212-16f3-47f4-8973-9a94411fd356', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '95a3e212-16f3-47f4-8973-9a94411fd356' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('95a3e212-16f3-47f4-8973-9a94411fd356', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '994cfc2d-7a3e-476e-b579-4c646b704e62';
DELETE FROM overture_poi_type WHERE overture_id = '994cfc2d-7a3e-476e-b579-4c646b704e62';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('994cfc2d-7a3e-476e-b579-4c646b704e62', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '994cfc2d-7a3e-476e-b579-4c646b704e62' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('994cfc2d-7a3e-476e-b579-4c646b704e62', 'store_kind', 'jewelry');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '38e5200a-acfd-4b9e-96c2-bdc30c84403a';
DELETE FROM overture_poi_type WHERE overture_id = '38e5200a-acfd-4b9e-96c2-bdc30c84403a';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('38e5200a-acfd-4b9e-96c2-bdc30c84403a', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '38e5200a-acfd-4b9e-96c2-bdc30c84403a' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('38e5200a-acfd-4b9e-96c2-bdc30c84403a', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '42eeb961-771f-4e8e-9d5c-25345a2e9730';
DELETE FROM overture_poi_type WHERE overture_id = '42eeb961-771f-4e8e-9d5c-25345a2e9730';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('42eeb961-771f-4e8e-9d5c-25345a2e9730', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '42eeb961-771f-4e8e-9d5c-25345a2e9730' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('42eeb961-771f-4e8e-9d5c-25345a2e9730', 'store_kind', 'womens_clothing');
UPDATE overture_poi SET primary_poi_type = 'lottery', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '76040546-abc6-4e1b-b9ef-25ea0502fc7f';
DELETE FROM overture_poi_type WHERE overture_id = '76040546-abc6-4e1b-b9ef-25ea0502fc7f';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('76040546-abc6-4e1b-b9ef-25ea0502fc7f', 'lottery', 0), ('76040546-abc6-4e1b-b9ef-25ea0502fc7f', 'store', 1);
DELETE FROM overture_poi_attribute WHERE overture_id = '76040546-abc6-4e1b-b9ef-25ea0502fc7f' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('76040546-abc6-4e1b-b9ef-25ea0502fc7f', 'store_kind', 'tobacco');
UPDATE overture_poi SET primary_poi_type = 'supermarket', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '814d4422-330b-4375-9c72-cf210c322b50';
DELETE FROM overture_poi_type WHERE overture_id = '814d4422-330b-4375-9c72-cf210c322b50';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('814d4422-330b-4375-9c72-cf210c322b50', 'supermarket', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '814d4422-330b-4375-9c72-cf210c322b50' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'post', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '7ba34c96-0719-4b63-9c8b-4566d3814101';
DELETE FROM overture_poi_type WHERE overture_id = '7ba34c96-0719-4b63-9c8b-4566d3814101';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('7ba34c96-0719-4b63-9c8b-4566d3814101', 'post', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '7ba34c96-0719-4b63-9c8b-4566d3814101' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '85a5372f-6391-4fc7-b668-829c7e95b7a0';
DELETE FROM overture_poi_type WHERE overture_id = '85a5372f-6391-4fc7-b668-829c7e95b7a0';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('85a5372f-6391-4fc7-b668-829c7e95b7a0', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '85a5372f-6391-4fc7-b668-829c7e95b7a0' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '80163444-cb6a-4cf0-87f7-054d8f3eb8c2';
DELETE FROM overture_poi_type WHERE overture_id = '80163444-cb6a-4cf0-87f7-054d8f3eb8c2';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('80163444-cb6a-4cf0-87f7-054d8f3eb8c2', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '80163444-cb6a-4cf0-87f7-054d8f3eb8c2' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('80163444-cb6a-4cf0-87f7-054d8f3eb8c2', 'store_kind', 'shoes');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '616f0554-07c8-4b56-a169-089e400d8a12';
DELETE FROM overture_poi_type WHERE overture_id = '616f0554-07c8-4b56-a169-089e400d8a12';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('616f0554-07c8-4b56-a169-089e400d8a12', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '616f0554-07c8-4b56-a169-089e400d8a12' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('616f0554-07c8-4b56-a169-089e400d8a12', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'florist', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'f5aa3444-b793-4b8f-835e-3d6033a84d2e';
DELETE FROM overture_poi_type WHERE overture_id = 'f5aa3444-b793-4b8f-835e-3d6033a84d2e';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('f5aa3444-b793-4b8f-835e-3d6033a84d2e', 'florist', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'f5aa3444-b793-4b8f-835e-3d6033a84d2e' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'florist', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'd34c6300-a90e-4357-b4e2-d1a2580dab5f';
DELETE FROM overture_poi_type WHERE overture_id = 'd34c6300-a90e-4357-b4e2-d1a2580dab5f';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d34c6300-a90e-4357-b4e2-d1a2580dab5f', 'florist', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd34c6300-a90e-4357-b4e2-d1a2580dab5f' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'b2414661-57bf-4808-9377-8e9c670ad891';
DELETE FROM overture_poi_type WHERE overture_id = 'b2414661-57bf-4808-9377-8e9c670ad891';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('b2414661-57bf-4808-9377-8e9c670ad891', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'b2414661-57bf-4808-9377-8e9c670ad891' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('b2414661-57bf-4808-9377-8e9c670ad891', 'store_kind', 'books');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'fa490686-d3ee-4459-92a8-d0a3f4aa0758';
DELETE FROM overture_poi_type WHERE overture_id = 'fa490686-d3ee-4459-92a8-d0a3f4aa0758';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('fa490686-d3ee-4459-92a8-d0a3f4aa0758', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'fa490686-d3ee-4459-92a8-d0a3f4aa0758' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('fa490686-d3ee-4459-92a8-d0a3f4aa0758', 'store_kind', 'handbag');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '68e4531c-c175-46fc-8d1d-24cd70e5a499';
DELETE FROM overture_poi_type WHERE overture_id = '68e4531c-c175-46fc-8d1d-24cd70e5a499';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('68e4531c-c175-46fc-8d1d-24cd70e5a499', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '68e4531c-c175-46fc-8d1d-24cd70e5a499' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('68e4531c-c175-46fc-8d1d-24cd70e5a499', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '57368ecd-14a1-4ca8-bda0-9da7991bfb80';
DELETE FROM overture_poi_type WHERE overture_id = '57368ecd-14a1-4ca8-bda0-9da7991bfb80';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('57368ecd-14a1-4ca8-bda0-9da7991bfb80', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '57368ecd-14a1-4ca8-bda0-9da7991bfb80' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '67b337cd-e6e7-4e5e-8dd3-18597f3f23d9';
DELETE FROM overture_poi_type WHERE overture_id = '67b337cd-e6e7-4e5e-8dd3-18597f3f23d9';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('67b337cd-e6e7-4e5e-8dd3-18597f3f23d9', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '67b337cd-e6e7-4e5e-8dd3-18597f3f23d9' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('67b337cd-e6e7-4e5e-8dd3-18597f3f23d9', 'store_kind', 'shoes');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'e1086fa0-9891-4648-9ea4-6fe14450145b';
DELETE FROM overture_poi_type WHERE overture_id = 'e1086fa0-9891-4648-9ea4-6fe14450145b';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('e1086fa0-9891-4648-9ea4-6fe14450145b', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'e1086fa0-9891-4648-9ea4-6fe14450145b' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('e1086fa0-9891-4648-9ea4-6fe14450145b', 'store_kind', 'electronics');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'bb69bed0-9eb0-44c3-9aac-60da74b12cea';
DELETE FROM overture_poi_type WHERE overture_id = 'bb69bed0-9eb0-44c3-9aac-60da74b12cea';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('bb69bed0-9eb0-44c3-9aac-60da74b12cea', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'bb69bed0-9eb0-44c3-9aac-60da74b12cea' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('bb69bed0-9eb0-44c3-9aac-60da74b12cea', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '30757678-600f-44eb-ae65-75ad1c33d7c0';
DELETE FROM overture_poi_type WHERE overture_id = '30757678-600f-44eb-ae65-75ad1c33d7c0';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('30757678-600f-44eb-ae65-75ad1c33d7c0', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '30757678-600f-44eb-ae65-75ad1c33d7c0' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'ice_cream', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '4bc3c100-4a85-4ac6-b836-65c8189b367c';
DELETE FROM overture_poi_type WHERE overture_id = '4bc3c100-4a85-4ac6-b836-65c8189b367c';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('4bc3c100-4a85-4ac6-b836-65c8189b367c', 'ice_cream', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '4bc3c100-4a85-4ac6-b836-65c8189b367c' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'e4e121ee-987d-44fc-9b50-9badc75f4ec0';
DELETE FROM overture_poi_type WHERE overture_id = 'e4e121ee-987d-44fc-9b50-9badc75f4ec0';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('e4e121ee-987d-44fc-9b50-9badc75f4ec0', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'e4e121ee-987d-44fc-9b50-9badc75f4ec0' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('e4e121ee-987d-44fc-9b50-9badc75f4ec0', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'phone_repair', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '601594b2-1db3-4619-8073-713fcaa71603';
DELETE FROM overture_poi_type WHERE overture_id = '601594b2-1db3-4619-8073-713fcaa71603';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('601594b2-1db3-4619-8073-713fcaa71603', 'phone_repair', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '601594b2-1db3-4619-8073-713fcaa71603' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'ead8e8ce-e78e-475c-bb0a-641cb8107044';
DELETE FROM overture_poi_type WHERE overture_id = 'ead8e8ce-e78e-475c-bb0a-641cb8107044';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('ead8e8ce-e78e-475c-bb0a-641cb8107044', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'ead8e8ce-e78e-475c-bb0a-641cb8107044' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '34f70553-8eec-483b-9d9a-83a9d20a826d';
DELETE FROM overture_poi_type WHERE overture_id = '34f70553-8eec-483b-9d9a-83a9d20a826d';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('34f70553-8eec-483b-9d9a-83a9d20a826d', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '34f70553-8eec-483b-9d9a-83a9d20a826d' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('34f70553-8eec-483b-9d9a-83a9d20a826d', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'hairdresser', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '7aaf13a0-4a6d-47aa-b59b-b173c0d8f5f5';
DELETE FROM overture_poi_type WHERE overture_id = '7aaf13a0-4a6d-47aa-b59b-b173c0d8f5f5';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('7aaf13a0-4a6d-47aa-b59b-b173c0d8f5f5', 'hairdresser', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '7aaf13a0-4a6d-47aa-b59b-b173c0d8f5f5' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '1c6e3059-ef5d-44bb-958b-1500d0703683';
DELETE FROM overture_poi_type WHERE overture_id = '1c6e3059-ef5d-44bb-958b-1500d0703683';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('1c6e3059-ef5d-44bb-958b-1500d0703683', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '1c6e3059-ef5d-44bb-958b-1500d0703683' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '9a9f23b7-e60c-4aa0-9f9a-26402a4fd086';
DELETE FROM overture_poi_type WHERE overture_id = '9a9f23b7-e60c-4aa0-9f9a-26402a4fd086';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('9a9f23b7-e60c-4aa0-9f9a-26402a4fd086', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '9a9f23b7-e60c-4aa0-9f9a-26402a4fd086' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('9a9f23b7-e60c-4aa0-9f9a-26402a4fd086', 'store_kind', 'beauty');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'e4387b94-e792-4b9f-a2f1-701b72a0f008';
DELETE FROM overture_poi_type WHERE overture_id = 'e4387b94-e792-4b9f-a2f1-701b72a0f008';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('e4387b94-e792-4b9f-a2f1-701b72a0f008', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'e4387b94-e792-4b9f-a2f1-701b72a0f008' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'a2a106b9-3b7e-453b-b220-9fa02ce3c371';
DELETE FROM overture_poi_type WHERE overture_id = 'a2a106b9-3b7e-453b-b220-9fa02ce3c371';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('a2a106b9-3b7e-453b-b220-9fa02ce3c371', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'a2a106b9-3b7e-453b-b220-9fa02ce3c371' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '4ebc436e-275d-4230-ba4c-e0284cd40fad';
DELETE FROM overture_poi_type WHERE overture_id = '4ebc436e-275d-4230-ba4c-e0284cd40fad';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('4ebc436e-275d-4230-ba4c-e0284cd40fad', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '4ebc436e-275d-4230-ba4c-e0284cd40fad' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('4ebc436e-275d-4230-ba4c-e0284cd40fad', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'b340a42a-18c3-4dfc-b2f9-49648f6682cf';
DELETE FROM overture_poi_type WHERE overture_id = 'b340a42a-18c3-4dfc-b2f9-49648f6682cf';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('b340a42a-18c3-4dfc-b2f9-49648f6682cf', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'b340a42a-18c3-4dfc-b2f9-49648f6682cf' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('b340a42a-18c3-4dfc-b2f9-49648f6682cf', 'store_kind', 'fashion_accessories');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'bf4fff58-8b60-4548-8c02-2307051daf1b';
DELETE FROM overture_poi_type WHERE overture_id = 'bf4fff58-8b60-4548-8c02-2307051daf1b';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('bf4fff58-8b60-4548-8c02-2307051daf1b', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'bf4fff58-8b60-4548-8c02-2307051daf1b' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('bf4fff58-8b60-4548-8c02-2307051daf1b', 'store_kind', 'office_equipment');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '2c1f0387-0a71-4273-9241-c017ac1a8903';
DELETE FROM overture_poi_type WHERE overture_id = '2c1f0387-0a71-4273-9241-c017ac1a8903';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('2c1f0387-0a71-4273-9241-c017ac1a8903', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '2c1f0387-0a71-4273-9241-c017ac1a8903' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('2c1f0387-0a71-4273-9241-c017ac1a8903', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '282b426c-24ff-416b-8c53-7c4cac62bc59';
DELETE FROM overture_poi_type WHERE overture_id = '282b426c-24ff-416b-8c53-7c4cac62bc59';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('282b426c-24ff-416b-8c53-7c4cac62bc59', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '282b426c-24ff-416b-8c53-7c4cac62bc59' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('282b426c-24ff-416b-8c53-7c4cac62bc59', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'e7c2d46b-035a-4c77-ae7b-26a79b6c68ac';
DELETE FROM overture_poi_type WHERE overture_id = 'e7c2d46b-035a-4c77-ae7b-26a79b6c68ac';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('e7c2d46b-035a-4c77-ae7b-26a79b6c68ac', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'e7c2d46b-035a-4c77-ae7b-26a79b6c68ac' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('e7c2d46b-035a-4c77-ae7b-26a79b6c68ac', 'store_kind', 'beauty');
UPDATE overture_poi SET primary_poi_type = 'hairdresser', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '26cf6db8-99e6-4fb7-a891-2147e4189ea7';
DELETE FROM overture_poi_type WHERE overture_id = '26cf6db8-99e6-4fb7-a891-2147e4189ea7';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('26cf6db8-99e6-4fb7-a891-2147e4189ea7', 'hairdresser', 0), ('26cf6db8-99e6-4fb7-a891-2147e4189ea7', 'salon', 1);
DELETE FROM overture_poi_attribute WHERE overture_id = '26cf6db8-99e6-4fb7-a891-2147e4189ea7' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '8e64067e-119d-457d-97f3-7fe8a1d0ac12';
DELETE FROM overture_poi_type WHERE overture_id = '8e64067e-119d-457d-97f3-7fe8a1d0ac12';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('8e64067e-119d-457d-97f3-7fe8a1d0ac12', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '8e64067e-119d-457d-97f3-7fe8a1d0ac12' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('8e64067e-119d-457d-97f3-7fe8a1d0ac12', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '10fbd281-d219-43fc-8b66-f889d4f3e321';
DELETE FROM overture_poi_type WHERE overture_id = '10fbd281-d219-43fc-8b66-f889d4f3e321';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('10fbd281-d219-43fc-8b66-f889d4f3e321', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '10fbd281-d219-43fc-8b66-f889d4f3e321' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'd3e5c645-3a79-4433-8328-1f9017c093ec';
DELETE FROM overture_poi_type WHERE overture_id = 'd3e5c645-3a79-4433-8328-1f9017c093ec';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d3e5c645-3a79-4433-8328-1f9017c093ec', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd3e5c645-3a79-4433-8328-1f9017c093ec' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('d3e5c645-3a79-4433-8328-1f9017c093ec', 'store_kind', 'phone');
UPDATE overture_poi SET primary_poi_type = 'bank', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '8fbd7651-a6bf-4ca4-92af-3ef08611a8a6';
DELETE FROM overture_poi_type WHERE overture_id = '8fbd7651-a6bf-4ca4-92af-3ef08611a8a6';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('8fbd7651-a6bf-4ca4-92af-3ef08611a8a6', 'bank', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '8fbd7651-a6bf-4ca4-92af-3ef08611a8a6' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'ad83be9f-a85d-499e-8798-c7c09f13629c';
DELETE FROM overture_poi_type WHERE overture_id = 'ad83be9f-a85d-499e-8798-c7c09f13629c';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('ad83be9f-a85d-499e-8798-c7c09f13629c', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'ad83be9f-a85d-499e-8798-c7c09f13629c' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('ad83be9f-a85d-499e-8798-c7c09f13629c', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '1e98dddb-f506-43cd-a557-a56062ad2def';
DELETE FROM overture_poi_type WHERE overture_id = '1e98dddb-f506-43cd-a557-a56062ad2def';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('1e98dddb-f506-43cd-a557-a56062ad2def', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '1e98dddb-f506-43cd-a557-a56062ad2def' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('1e98dddb-f506-43cd-a557-a56062ad2def', 'store_kind', 'eyewear_and_optician');
UPDATE overture_poi SET primary_poi_type = 'supermarket', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '6d0837b3-bdfd-41f7-aab8-eff1ca00e9ae';
DELETE FROM overture_poi_type WHERE overture_id = '6d0837b3-bdfd-41f7-aab8-eff1ca00e9ae';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('6d0837b3-bdfd-41f7-aab8-eff1ca00e9ae', 'supermarket', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '6d0837b3-bdfd-41f7-aab8-eff1ca00e9ae' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '6cd82eca-03a6-445a-a97d-1aac19c446fb';
DELETE FROM overture_poi_type WHERE overture_id = '6cd82eca-03a6-445a-a97d-1aac19c446fb';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('6cd82eca-03a6-445a-a97d-1aac19c446fb', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '6cd82eca-03a6-445a-a97d-1aac19c446fb' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '48a7d1e5-995e-4c6f-a9e9-2069a0649b5e';
DELETE FROM overture_poi_type WHERE overture_id = '48a7d1e5-995e-4c6f-a9e9-2069a0649b5e';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('48a7d1e5-995e-4c6f-a9e9-2069a0649b5e', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '48a7d1e5-995e-4c6f-a9e9-2069a0649b5e' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('48a7d1e5-995e-4c6f-a9e9-2069a0649b5e', 'store_kind', 'phone');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '8d02660a-771e-4c85-b41a-d440dce390fb';
DELETE FROM overture_poi_type WHERE overture_id = '8d02660a-771e-4c85-b41a-d440dce390fb';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('8d02660a-771e-4c85-b41a-d440dce390fb', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '8d02660a-771e-4c85-b41a-d440dce390fb' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('8d02660a-771e-4c85-b41a-d440dce390fb', 'store_kind', 'beauty');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'b939b589-d62c-456b-a4e0-90c045cf5d25';
DELETE FROM overture_poi_type WHERE overture_id = 'b939b589-d62c-456b-a4e0-90c045cf5d25';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('b939b589-d62c-456b-a4e0-90c045cf5d25', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'b939b589-d62c-456b-a4e0-90c045cf5d25' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'a9272e11-3fa3-44d3-8f8d-243e606400e3';
DELETE FROM overture_poi_type WHERE overture_id = 'a9272e11-3fa3-44d3-8f8d-243e606400e3';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('a9272e11-3fa3-44d3-8f8d-243e606400e3', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'a9272e11-3fa3-44d3-8f8d-243e606400e3' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('a9272e11-3fa3-44d3-8f8d-243e606400e3', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'e184d0e1-ad42-4ed5-a3ed-8726fd490e04';
DELETE FROM overture_poi_type WHERE overture_id = 'e184d0e1-ad42-4ed5-a3ed-8726fd490e04';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('e184d0e1-ad42-4ed5-a3ed-8726fd490e04', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'e184d0e1-ad42-4ed5-a3ed-8726fd490e04' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('e184d0e1-ad42-4ed5-a3ed-8726fd490e04', 'store_kind', 'jewelry');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '98f44c20-4e40-4237-b770-4c88c95d3557';
DELETE FROM overture_poi_type WHERE overture_id = '98f44c20-4e40-4237-b770-4c88c95d3557';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('98f44c20-4e40-4237-b770-4c88c95d3557', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '98f44c20-4e40-4237-b770-4c88c95d3557' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('98f44c20-4e40-4237-b770-4c88c95d3557', 'store_kind', 'beauty');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '3aff171b-7c54-4b33-9523-94a9412ea8b2';
DELETE FROM overture_poi_type WHERE overture_id = '3aff171b-7c54-4b33-9523-94a9412ea8b2';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('3aff171b-7c54-4b33-9523-94a9412ea8b2', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '3aff171b-7c54-4b33-9523-94a9412ea8b2' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('3aff171b-7c54-4b33-9523-94a9412ea8b2', 'store_kind', 'beauty');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '218ff500-4340-4fcb-8a23-a06a9d9a3826';
DELETE FROM overture_poi_type WHERE overture_id = '218ff500-4340-4fcb-8a23-a06a9d9a3826';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('218ff500-4340-4fcb-8a23-a06a9d9a3826', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '218ff500-4340-4fcb-8a23-a06a9d9a3826' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '2f9aa4ba-0fc4-4053-8820-5f153b381221';
DELETE FROM overture_poi_type WHERE overture_id = '2f9aa4ba-0fc4-4053-8820-5f153b381221';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('2f9aa4ba-0fc4-4053-8820-5f153b381221', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '2f9aa4ba-0fc4-4053-8820-5f153b381221' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('2f9aa4ba-0fc4-4053-8820-5f153b381221', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'bakery', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '0dee01ee-0523-4b57-9df7-68954283ac86';
DELETE FROM overture_poi_type WHERE overture_id = '0dee01ee-0523-4b57-9df7-68954283ac86';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('0dee01ee-0523-4b57-9df7-68954283ac86', 'bakery', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '0dee01ee-0523-4b57-9df7-68954283ac86' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '21815254-0d98-4178-a956-b66cb17146d3';
DELETE FROM overture_poi_type WHERE overture_id = '21815254-0d98-4178-a956-b66cb17146d3';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('21815254-0d98-4178-a956-b66cb17146d3', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '21815254-0d98-4178-a956-b66cb17146d3' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '96fc7188-4978-4197-b8c4-1d217c3cc25b';
DELETE FROM overture_poi_type WHERE overture_id = '96fc7188-4978-4197-b8c4-1d217c3cc25b';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('96fc7188-4978-4197-b8c4-1d217c3cc25b', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '96fc7188-4978-4197-b8c4-1d217c3cc25b' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('96fc7188-4978-4197-b8c4-1d217c3cc25b', 'store_kind', 'sports');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'b296eac3-8e9c-4279-9ba4-ddafb6e102cc';
DELETE FROM overture_poi_type WHERE overture_id = 'b296eac3-8e9c-4279-9ba4-ddafb6e102cc';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('b296eac3-8e9c-4279-9ba4-ddafb6e102cc', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'b296eac3-8e9c-4279-9ba4-ddafb6e102cc' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('b296eac3-8e9c-4279-9ba4-ddafb6e102cc', 'store_kind', 'beauty');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '03795c00-f3e0-4efe-8f69-878f6f52b854';
DELETE FROM overture_poi_type WHERE overture_id = '03795c00-f3e0-4efe-8f69-878f6f52b854';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('03795c00-f3e0-4efe-8f69-878f6f52b854', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '03795c00-f3e0-4efe-8f69-878f6f52b854' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('03795c00-f3e0-4efe-8f69-878f6f52b854', 'store_kind', 'handbag');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'c7ef968c-8d90-427e-873a-07a879b2fe9f';
DELETE FROM overture_poi_type WHERE overture_id = 'c7ef968c-8d90-427e-873a-07a879b2fe9f';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('c7ef968c-8d90-427e-873a-07a879b2fe9f', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'c7ef968c-8d90-427e-873a-07a879b2fe9f' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('c7ef968c-8d90-427e-873a-07a879b2fe9f', 'store_kind', 'shoes');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '9d3da41c-74ce-449a-8683-430a59968692';
DELETE FROM overture_poi_type WHERE overture_id = '9d3da41c-74ce-449a-8683-430a59968692';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('9d3da41c-74ce-449a-8683-430a59968692', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '9d3da41c-74ce-449a-8683-430a59968692' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'a691efff-91f5-4ef0-a4a9-04e6d50a5628';
DELETE FROM overture_poi_type WHERE overture_id = 'a691efff-91f5-4ef0-a4a9-04e6d50a5628';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('a691efff-91f5-4ef0-a4a9-04e6d50a5628', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'a691efff-91f5-4ef0-a4a9-04e6d50a5628' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'fd97eb70-e854-4f02-8da0-b6af08b72672';
DELETE FROM overture_poi_type WHERE overture_id = 'fd97eb70-e854-4f02-8da0-b6af08b72672';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('fd97eb70-e854-4f02-8da0-b6af08b72672', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'fd97eb70-e854-4f02-8da0-b6af08b72672' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('fd97eb70-e854-4f02-8da0-b6af08b72672', 'store_kind', 'sports');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'a825a69c-1f99-4972-8f65-f2f2472eebf8';
DELETE FROM overture_poi_type WHERE overture_id = 'a825a69c-1f99-4972-8f65-f2f2472eebf8';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('a825a69c-1f99-4972-8f65-f2f2472eebf8', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'a825a69c-1f99-4972-8f65-f2f2472eebf8' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('a825a69c-1f99-4972-8f65-f2f2472eebf8', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '9c758e40-de1f-47c8-9fd5-2d1847a35822';
DELETE FROM overture_poi_type WHERE overture_id = '9c758e40-de1f-47c8-9fd5-2d1847a35822';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('9c758e40-de1f-47c8-9fd5-2d1847a35822', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '9c758e40-de1f-47c8-9fd5-2d1847a35822' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('9c758e40-de1f-47c8-9fd5-2d1847a35822', 'store_kind', 'jewelry');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '16be39ba-316d-4e9e-9de9-f809d5a7f1c8';
DELETE FROM overture_poi_type WHERE overture_id = '16be39ba-316d-4e9e-9de9-f809d5a7f1c8';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('16be39ba-316d-4e9e-9de9-f809d5a7f1c8', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '16be39ba-316d-4e9e-9de9-f809d5a7f1c8' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '62ea030d-7f02-4c93-90e5-607600c3989c';
DELETE FROM overture_poi_type WHERE overture_id = '62ea030d-7f02-4c93-90e5-607600c3989c';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('62ea030d-7f02-4c93-90e5-607600c3989c', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '62ea030d-7f02-4c93-90e5-607600c3989c' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('62ea030d-7f02-4c93-90e5-607600c3989c', 'store_kind', 'watch');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'd26de3ed-4af4-490c-b978-4c50ffe1d032';
DELETE FROM overture_poi_type WHERE overture_id = 'd26de3ed-4af4-490c-b978-4c50ffe1d032';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('d26de3ed-4af4-490c-b978-4c50ffe1d032', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'd26de3ed-4af4-490c-b978-4c50ffe1d032' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('d26de3ed-4af4-490c-b978-4c50ffe1d032', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '5797d85c-23c4-46e8-9d38-fbfcead297f0';
DELETE FROM overture_poi_type WHERE overture_id = '5797d85c-23c4-46e8-9d38-fbfcead297f0';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('5797d85c-23c4-46e8-9d38-fbfcead297f0', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '5797d85c-23c4-46e8-9d38-fbfcead297f0' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('5797d85c-23c4-46e8-9d38-fbfcead297f0', 'store_kind', 'jewelry');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '782ccb54-7a53-4036-8e95-f0102520a9f4';
DELETE FROM overture_poi_type WHERE overture_id = '782ccb54-7a53-4036-8e95-f0102520a9f4';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('782ccb54-7a53-4036-8e95-f0102520a9f4', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '782ccb54-7a53-4036-8e95-f0102520a9f4' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('782ccb54-7a53-4036-8e95-f0102520a9f4', 'store_kind', 'clothing');
UPDATE overture_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '241a04c7-3fbb-4063-bbec-0d425d0b09b4';
DELETE FROM overture_poi_type WHERE overture_id = '241a04c7-3fbb-4063-bbec-0d425d0b09b4';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('241a04c7-3fbb-4063-bbec-0d425d0b09b4', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '241a04c7-3fbb-4063-bbec-0d425d0b09b4' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('241a04c7-3fbb-4063-bbec-0d425d0b09b4', 'store_kind', 'home');
UPDATE overture_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15' WHERE overture_id = '06e3a0d5-2a9c-4360-8284-7ef4bc15e69a';
DELETE FROM overture_poi_type WHERE overture_id = '06e3a0d5-2a9c-4360-8284-7ef4bc15e69a';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('06e3a0d5-2a9c-4360-8284-7ef4bc15e69a', 'restaurant', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '06e3a0d5-2a9c-4360-8284-7ef4bc15e69a' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'ice_cream', floor = '1', updated_at = '2026-11-15' WHERE overture_id = '58ccd90a-ecd2-40e7-bcbd-d77a85b2e33a';
DELETE FROM overture_poi_type WHERE overture_id = '58ccd90a-ecd2-40e7-bcbd-d77a85b2e33a';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('58ccd90a-ecd2-40e7-bcbd-d77a85b2e33a', 'ice_cream', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = '58ccd90a-ecd2-40e7-bcbd-d77a85b2e33a' AND dimension = 'store_kind';
UPDATE overture_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15' WHERE overture_id = 'ef3cf7ed-9602-41d8-858e-c0110171a286';
DELETE FROM overture_poi_type WHERE overture_id = 'ef3cf7ed-9602-41d8-858e-c0110171a286';
INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES ('ef3cf7ed-9602-41d8-858e-c0110171a286', 'store', 0);
DELETE FROM overture_poi_attribute WHERE overture_id = 'ef3cf7ed-9602-41d8-858e-c0110171a286' AND dimension = 'store_kind';
INSERT INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('ef3cf7ed-9602-41d8-858e-c0110171a286', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:100-gramas';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:100-gramas' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:a-tarte';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:a-tarte' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:adolfo-dominguez';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:adolfo-dominguez' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:adolfo-dominguez', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'travel_agency', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:agencia-abreu';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:agencia-abreu' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:allways';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:allways' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:area';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:area' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:area', 'store_kind', 'furniture');
UPDATE curated_poi SET primary_poi_type = 'supermarket', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:auchan-gourmet';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:auchan-gourmet' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:auchan-tecnologia';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:auchan-tecnologia' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:auchan-tecnologia', 'store_kind', 'home');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:automovel-club-de-portugal';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:automovel-club-de-portugal' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:automovel-club-de-portugal', 'store_kind', 'auto_parts_and_supply');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:acai-natura';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:acai-natura' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:baebe';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:baebe' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:baebe', 'store_kind', 'beauty');
UPDATE curated_poi SET primary_poi_type = 'bakery', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:balthazar-por-confeitaria-nacional';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:balthazar-por-confeitaria-nacional' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:big-foot';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:big-foot' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:big-foot', 'store_kind', 'shoes');
UPDATE curated_poi SET primary_poi_type = 'shoe_repair', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:botaminuto';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:botaminuto' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:boutique-dos-relogios-plus';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:boutique-dos-relogios-plus' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:boutique-dos-relogios-plus', 'store_kind', 'jewelry');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:bricolage';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:bricolage' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:bricolage', 'store_kind', 'hardware');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:brownie';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:brownie' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:brownie', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:bubbles-company';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:bubbles-company' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:bubbles-company', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:cante';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:cante' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:cante', 'store_kind', 'lingerie');
UPDATE curated_poi SET primary_poi_type = 'church', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:capela-das-amoreiras';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:capela-das-amoreiras' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:casa-simoes';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:casa-simoes' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:casa-simoes', 'store_kind', 'arts_and_crafts');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:cata-vassalo';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:cata-vassalo' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:cata-vassalo', 'store_kind', 'jewelry');
UPDATE curated_poi SET primary_poi_type = 'movie_theater', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:cinemas-nos-salas-1-2-e-3';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:cinemas-nos-salas-1-2-e-3' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'movie_theater', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:cinemas-nos-salas-vip-1-2-3-e-4';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:cinemas-nos-salas-vip-1-2-3-e-4' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:claudie-pierlot';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:claudie-pierlot' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:claudie-pierlot', 'store_kind', 'womens_clothing');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:companhia';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:companhia' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'cafe', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:delta-coffee-house-experience';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:delta-coffee-house-experience' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'cafe', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:delta-espresso';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:delta-espresso' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:dez-pra-uma';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:dez-pra-uma' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:douglas';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:douglas' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:douglas', 'store_kind', 'beauty');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:el-ganso';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:el-ganso' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:el-ganso', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:elements-75-80';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:elements-75-80' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:elements-75-80', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:empanadas-mbq';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:empanadas-mbq' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:espadim-1985';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:espadim-1985' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:espadim-1985', 'store_kind', 'antique');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:espiral-relojoaria';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:espiral-relojoaria' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:espiral-relojoaria', 'store_kind', 'watch');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:favorite-people';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:favorite-people' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:favorite-people', 'store_kind', 'childrens_clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:fotosport';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:fotosport' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:fotosport', 'store_kind', 'photography_store_and_services');
UPDATE curated_poi SET primary_poi_type = 'bakery', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:gleba';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:gleba' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:globe';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:globe' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:globe', 'store_kind', 'womens_clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:gold-suisse';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:gold-suisse' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:gold-suisse', 'store_kind', 'pawn');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:greenkiss';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:greenkiss' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:greenkiss', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:happy-faces';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:happy-faces' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:happy-faces', 'store_kind', 'toys');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:hoss-intropia';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:hoss-intropia' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:hoss-intropia', 'store_kind', 'womens_clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:hurley';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:hurley' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:hurley', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:ibeauty-cosmetics';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:ibeauty-cosmetics' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:ibeauty-cosmetics', 'store_kind', 'beauty');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:instanta';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:instanta' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:instanta', 'store_kind', 'photography_store_and_services');
UPDATE curated_poi SET primary_poi_type = 'tobacco', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:iqos-store';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:iqos-store' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:isto';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:isto' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:isto', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'bakery', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:joana-reymao-nogueira-docarias';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:joana-reymao-nogueira-docarias' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:knot';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:knot' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:knot', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'phone_repair', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:la-casa-de-las-carcasas';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:la-casa-de-las-carcasas' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:la-casa-de-las-carcasas', 'store_kind', 'phone'),
('mall:amoreiras:la-casa-de-las-carcasas', 'poi_type', 'store');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:laranjinha';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:laranjinha' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:laranjinha', 'store_kind', 'childrens_clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:le-laboratoire';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:le-laboratoire' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:le-laboratoire', 'store_kind', 'beauty');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:lion-of-porches';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:lion-of-porches' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:lion-of-porches', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:local-your-healthy-kitchen';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:local-your-healthy-kitchen' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:lola-casademunt';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:lola-casademunt' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:lola-casademunt', 'store_kind', 'fashion_accessories');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:lusitania';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:lusitania' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:m-a-c';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:m-a-c' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:m-a-c', 'store_kind', 'beauty');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:made-in';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:made-in' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:made-in', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:maje';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:maje' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:maje', 'store_kind', 'womens_clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:mango-man';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:mango-man' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:mango-man', 'store_kind', 'mens_clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:merrell';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:merrell' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:merrell', 'store_kind', 'shoes');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:migacho';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:migacho' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:migacho', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'cafe', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:monkey-brain';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:monkey-brain' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'nail_salon', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:nails4-us';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:nails4-us' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:naturapura';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:naturapura' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:naturapura', 'store_kind', 'childrens_clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:nespresso';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:nespresso' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:nespresso', 'store_kind', 'coffee_supplies');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:noon';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:noon' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:noon', 'store_kind', 'womens_clothing');
UPDATE curated_poi SET primary_poi_type = 'currency_exchange', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:novacambios';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:novacambios' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'bank', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:novo-banco';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:novo-banco' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:o-lisboeta';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:o-lisboeta' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'juice', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:oakberry';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:oakberry' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:olhar-de-prata';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:olhar-de-prata' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:olhar-de-prata', 'store_kind', 'jewelry');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:panda-cantina';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:panda-cantina' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:parmeggiana-cia';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:parmeggiana-cia' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:pet-s-park';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:pet-s-park' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:pet-s-park', 'store_kind', 'pet');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:presse-linha';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:presse-linha' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:presse-linha', 'store_kind', 'newspaper_and_magazines');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:pes-de-cereja';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:pes-de-cereja' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:pes-de-cereja', 'store_kind', 'childrens_clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:raquel-poco-jewellery';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:raquel-poco-jewellery' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:raquel-poco-jewellery', 'store_kind', 'jewelry');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:sabor-gaucho';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:sabor-gaucho' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:sacoor-brothers';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:sacoor-brothers' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:sacoor-brothers', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:sandro';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:sandro' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:sandro', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:sanjugo';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:sanjugo' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'ice_cream', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:santini';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:santini' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:scalpers';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:scalpers' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:scalpers', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:security-center';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:security-center' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:security-center', 'store_kind', 'electronics');
UPDATE curated_poi SET primary_poi_type = 'car_repair', floor = '-2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:simple-fast-oficina-auto';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:simple-fast-oficina-auto' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'car_wash', floor = '-1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:simple-eco-wash';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:simple-eco-wash' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:smashville';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:smashville' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:soya-express';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:soya-express' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:sunglass-hut';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:sunglass-hut' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:sunglass-hut', 'store_kind', 'eyewear_and_optician');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:swarovski';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:swarovski' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:swarovski', 'store_kind', 'jewelry');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:teresa-alecrim';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:teresa-alecrim' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:teresa-alecrim', 'store_kind', 'fabric');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:the-cut';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:the-cut' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:tomatino';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:tomatino' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'travel_agency', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:top-atlantico';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:top-atlantico' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'tea', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:u-cha';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:u-cha' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'restaurant', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:verde-coco';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:verde-coco' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'travel_agency', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:viagens-el-corte-ingles';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:viagens-el-corte-ingles' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:vodafone';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:vodafone' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:vodafone', 'store_kind', 'phone');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:wickett-jones';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:wickett-jones' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:wickett-jones', 'store_kind', 'womens_clothing');
UPDATE curated_poi SET primary_poi_type = 'nail_salon', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:wink';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:wink' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:women-secret';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:women-secret' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:women-secret', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'laundry', floor = '1', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:yellow-metric';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:yellow-metric' AND dimension IN ('store_kind', 'poi_type');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:zara-home';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:zara-home' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:zara-home', 'store_kind', 'clothing');
UPDATE curated_poi SET primary_poi_type = 'store', floor = '2', updated_at = '2026-11-15', updated_by = 'kan-439-mall-tenants' WHERE poi_id = 'mall:amoreiras:optica-das-amoreiras';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:amoreiras:optica-das-amoreiras' AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
('mall:amoreiras:optica-das-amoreiras', 'store_kind', 'eyewear_and_optician');

-- Auchan: listed on Piso 1; its type is unresolved, so the floor is set alone.
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-15' WHERE overture_id = 'c32478a1-cebb-403f-824f-390045715691';  -- Auchan
