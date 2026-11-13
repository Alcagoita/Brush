-- KAN-463 review. Corrections to rows written by 0070, which is applied.
--
-- 1. FLOORS. Two Braga Parque names carry a "|" (`5 À SEC | 5 À FIL`,
--    `BEONTIME | WATCHES & JEWELS`), which the list reader took as the
--    delimiter: 5 À SEC got floor 5 and BEONTIME no floor (written Piso 0).
--    The operator gives Piso 1 for both. The reader now refuses a stray "|".
--
-- 2. SANJAM is a chain of hair salons (operator: "rede nacional de
--    cabeleireiros"), not a clothing store.
--
-- 3. ARCÁDIA keeps one set everywhere: bakery + cafe — a chocolatier with a
--    café counter, so it answers both "buy chocolates" and "a coffee". The
--    branches were bakery, cafe or restaurant depending on the source. This
--    covers the four mall units on our lists (Braga Parque, Nova Arcada,
--    NorteShopping's Galleria, UBBO) and the rows named "Casa do Chocolate"
--    or "Arcadia Chocolate". A bare "Arcádia" on a street can be an unrelated
--    café and is left as it is. The NorteShopping Nescafé counters are a
--    different concept and stay cafe.
--
-- Idempotent.

-- 1. floors
UPDATE curated_poi SET floor = '1', updated_at = '2026-11-13', updated_by = 'kan-463-review'
 WHERE poi_id IN ('mall:braga_parque:5-a-sec', 'mall:braga_parque:beontime');

-- 2. SANJAM
UPDATE curated_poi SET primary_poi_type = 'hairdresser', updated_at = '2026-11-13', updated_by = 'kan-463-review'
 WHERE poi_id = 'mall:nova_arcada:sanjam';
DELETE FROM curated_poi_attribute WHERE poi_id = 'mall:nova_arcada:sanjam' AND dimension IN ('store_kind', 'poi_type');

-- 3. Arcádia — curated mall units
UPDATE curated_poi SET primary_poi_type = 'bakery', updated_at = '2026-11-13', updated_by = 'kan-463-review'
 WHERE poi_id IN ('mall:braga_parque:arcadia', 'mall:nova_arcada:arcadia-casa-do-chocolate');
DELETE FROM curated_poi_attribute
 WHERE poi_id IN ('mall:braga_parque:arcadia', 'mall:nova_arcada:arcadia-casa-do-chocolate')
   AND dimension IN ('store_kind', 'poi_type');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
  ('mall:braga_parque:arcadia', 'poi_type', 'cafe'),
  ('mall:nova_arcada:arcadia-casa-do-chocolate', 'poi_type', 'cafe');

-- 3. Arcádia — Overture rows
--    915add1f NorteShopping (Arcádia – Galleria)   f77df041 UBBO
--    323688b7 MAR Shopping   69049666 Rua da Misericórdia   6bdbbe22 Av. João Crisóstomo
--    43b64d45 Alameda dos Combatentes   6f29426d (no address)   ba6e7cf9 Rua Campeões e Viena
UPDATE overture_poi SET primary_poi_type = 'bakery', updated_at = '2026-11-13'
 WHERE overture_id IN ('915add1f-99a9-46ba-b5da-21e61498b249', 'f77df041-5692-4f9f-a4be-660ebc726c8a',
                       '323688b7-13dc-4205-be2e-452cd31265c1', '69049666-55b8-4c09-bcb2-21cc46fcd42a',
                       '6bdbbe22-f385-4557-bba5-2dcc6f57a1c6', '43b64d45-2fa1-41e0-a23b-6ede49f17772',
                       '6f29426d-e52c-4edc-b8aa-e1e5e5e99179', 'ba6e7cf9-6e3b-4c9d-90a9-feaba375706d');
DELETE FROM overture_poi_type
 WHERE overture_id IN ('915add1f-99a9-46ba-b5da-21e61498b249', 'f77df041-5692-4f9f-a4be-660ebc726c8a',
                       '323688b7-13dc-4205-be2e-452cd31265c1', '69049666-55b8-4c09-bcb2-21cc46fcd42a',
                       '6bdbbe22-f385-4557-bba5-2dcc6f57a1c6', '43b64d45-2fa1-41e0-a23b-6ede49f17772',
                       '6f29426d-e52c-4edc-b8aa-e1e5e5e99179', 'ba6e7cf9-6e3b-4c9d-90a9-feaba375706d');
INSERT INTO overture_poi_type (overture_id, poi_type, rank)
SELECT p.overture_id, t.poi_type, t.rank
  FROM overture_poi p, (SELECT 'bakery' AS poi_type, 0 AS rank UNION ALL SELECT 'cafe', 1) t
 WHERE p.overture_id IN ('915add1f-99a9-46ba-b5da-21e61498b249', 'f77df041-5692-4f9f-a4be-660ebc726c8a',
                         '323688b7-13dc-4205-be2e-452cd31265c1', '69049666-55b8-4c09-bcb2-21cc46fcd42a',
                         '6bdbbe22-f385-4557-bba5-2dcc6f57a1c6', '43b64d45-2fa1-41e0-a23b-6ede49f17772',
                         '6f29426d-e52c-4edc-b8aa-e1e5e5e99179', 'ba6e7cf9-6e3b-4c9d-90a9-feaba375706d');
DELETE FROM overture_poi_attribute
 WHERE dimension = 'store_kind'
   AND overture_id IN ('915add1f-99a9-46ba-b5da-21e61498b249', 'f77df041-5692-4f9f-a4be-660ebc726c8a',
                       '323688b7-13dc-4205-be2e-452cd31265c1', '69049666-55b8-4c09-bcb2-21cc46fcd42a',
                       '6bdbbe22-f385-4557-bba5-2dcc6f57a1c6', '43b64d45-2fa1-41e0-a23b-6ede49f17772',
                       '6f29426d-e52c-4edc-b8aa-e1e5e5e99179', 'ba6e7cf9-6e3b-4c9d-90a9-feaba375706d');
