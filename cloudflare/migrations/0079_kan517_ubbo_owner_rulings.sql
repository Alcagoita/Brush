-- KAN-517. UBBO, owner rulings 2026-11-14.
-- 1. Floors from the owner for six units whose pages state none (or contradict
--    themselves). Evidence: mall_lists/ubbo_floors.tsv.
-- 2. Withdraw every row inside UBBO that is not on ubbo.pt: 27 rows the operator
--    never listed, and Havaianas, O meu Olá and ONLY, gone from the site.
--    Nothing is deleted. Idempotent.

-- 1. Floors
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:carrossel-experience';  -- Carrossel Experience
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '790e7b34-b13f-4a3c-989a-7a1be6cd8453';  -- KidZania
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'd37b6b47-4291-45e9-851b-bd7384f6afa1';  -- NEOON
UPDATE curated_poi SET floor = '0', updated_at = '2026-11-14', updated_by = 'kan-517-mall-floors' WHERE poi_id = 'fsq:66cf46b745e7843b5555deed';  -- Sould Park Jump
UPDATE overture_poi SET floor = '1', updated_at = '2026-11-14' WHERE overture_id = '47983e06-6f07-48ed-bcec-1c02e50e825c';  -- UCI Luxe
UPDATE overture_poi SET floor = '0', updated_at = '2026-11-14' WHERE overture_id = 'c4d0dc64-a5e6-401b-b575-ab0249632b58';  -- Zero Latency

-- 2. Withdrawals
INSERT INTO poi_source_correction (source, source_id, visible, review_note, created_at) VALUES
  ('overture', '260db432-bce2-4f6d-b836-cb49a329749d', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', '43b9e8ee-b302-4114-a902-3ba678d8552a', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', '5d6368bf-fe31-4ba0-a419-6f6554ede118', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', '60b50573-c065-4dfd-91eb-f9a016aa3c14', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', '6e48ba1d-9952-4c7b-8f3f-c003856db3fb', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', '7401483a-bf63-48af-9fc8-00443a383b8e', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', '95c67973-fd82-49a8-954f-c85ec097d11d', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', '9bd65037-ea37-46af-b4c0-eecf2e81fe9c', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', 'bf3a568e-caed-412a-a31b-adf9c3166362', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', 'cb20f5f9-9301-4cdc-a7cd-5ab0f68f9d7c', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', 'd47c44c5-a45e-4280-9219-c648df0e4cfc', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', 'd80019c9-3975-4d89-8203-ff3b511651a7', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', 'f2f28d67-c8c9-4135-86b4-85ff3746b945', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', '7670d40d-a341-4368-b99c-9362d44f9ec3', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', '8409a4ed-a5fb-4aa3-b1a7-0561cff8c174', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', '3fe9a720-7b29-43f2-92cf-514f6649e16b', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', '52d96395-1858-41b6-8660-68e91cff06db', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', 'ea15a594-5bdd-4707-b911-49a50d03b33a', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', 'a79f406c-654e-4489-8d9d-4f80fe8c18f1', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', 'f81328b7-5333-4085-8117-b794fa8fe20f', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', 'bba9563c-c9dd-423c-a57a-d0a1ce9c2aa0', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', 'aff95c96-5552-4e51-a695-257efd89c8ee', 0, 'KAN-517: Havaianas is no longer on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', 'a1a3dac4-40e7-4ba9-af3c-1b499e1f6d1c', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', 'c3cb9045-46e4-4c29-aa14-0ec00efbd420', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', '23a0c273-4f79-4bd4-afa6-8571f24f2642', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14'),
  ('overture', '51900c6b-f9bc-4b65-855f-3246f7b1abb8', 0, 'KAN-517: not on the UBBO site (owner, 2026-11-14)', '2026-11-14')
ON CONFLICT (source, source_id) DO UPDATE SET visible = 0, review_note = excluded.review_note;
UPDATE curated_poi SET status = 'removed', removed_at = '2026-11-14', removed_by = 'kan-439-mall-tenants', removal_reason = 'KAN-517: O meu Olá is no longer on the UBBO site (owner, 2026-11-14)' WHERE status = 'active' AND poi_id = 'mall:ubbo:o-meu-ola';
UPDATE curated_poi SET status = 'removed', removed_at = '2026-11-14', removed_by = 'kan-439-mall-tenants', removal_reason = 'KAN-517: ONLY is no longer on the UBBO site (owner, 2026-11-14)' WHERE status = 'active' AND poi_id = 'mall:ubbo:only';
UPDATE curated_poi SET status = 'removed', removed_at = '2026-11-14', removed_by = 'kan-439-mall-tenants', removal_reason = 'KAN-517: not on the UBBO site (owner, 2026-11-14)' WHERE status = 'active' AND poi_id = 'mall:ubbo:sould-park-jump';
UPDATE curated_poi SET status = 'removed', removed_at = '2026-11-14', removed_by = 'kan-439-mall-tenants', removal_reason = 'KAN-517: not on the UBBO site (owner, 2026-11-14)' WHERE status = 'active' AND poi_id = 'fsq:61ed97b873b464380ec6932c';
