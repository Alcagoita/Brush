-- KAN-466 review. Corrections to rows written or retyped by 0075 (applied),
-- and to the same brand where we hold it elsewhere.
--
-- 1. HEY DOC is Grupo Lusíadas Saúde's network of dental clinics (heydoc.pt),
--    not a beauty shop: `clinic`, as Mollaris (`dentist` is not reachable).
--    Every branch we hold: Forum Algarve, NorteShopping, LeiriaShopping, and
--    the Overture row at Oeiras Parque.
-- 2. LEGO FAN FACTORY at MAR Shopping Algarve is a free play space for
--    children, not a toy shop: `playground`, as Luna Kids.
--
-- Idempotent.

-- 1. Hey Doc — curated mall rows
UPDATE curated_poi SET primary_poi_type = 'clinic', updated_at = '2026-11-13', updated_by = 'kan-466-review'
 WHERE poi_id IN ('mall:forum_algarve:hey-doc', 'mall:norteshopping:heydoc', 'mall:leiriashopping:heydoc');
DELETE FROM curated_poi_attribute
 WHERE poi_id IN ('mall:forum_algarve:hey-doc', 'mall:norteshopping:heydoc', 'mall:leiriashopping:heydoc')
   AND dimension IN ('store_kind', 'poi_type');

-- 1. Hey Doc — Overture row (Oeiras Parque)
UPDATE overture_poi SET primary_poi_type = 'clinic', updated_at = '2026-11-13'
 WHERE overture_id = '57b7db71-84a9-4550-a780-36fcff3db99b';
DELETE FROM overture_poi_type WHERE overture_id = '57b7db71-84a9-4550-a780-36fcff3db99b';
INSERT INTO overture_poi_type (overture_id, poi_type, rank)
SELECT overture_id, 'clinic', 0 FROM overture_poi WHERE overture_id = '57b7db71-84a9-4550-a780-36fcff3db99b';
DELETE FROM overture_poi_attribute
 WHERE overture_id = '57b7db71-84a9-4550-a780-36fcff3db99b' AND dimension = 'store_kind';

-- 2. LEGO Fan Factory — the held Overture row at MAR Shopping Algarve
UPDATE overture_poi SET primary_poi_type = 'playground', updated_at = '2026-11-13'
 WHERE overture_id = 'adfad45b-a406-47c9-b931-59038169496e';
DELETE FROM overture_poi_type WHERE overture_id = 'adfad45b-a406-47c9-b931-59038169496e';
INSERT INTO overture_poi_type (overture_id, poi_type, rank)
SELECT overture_id, 'playground', 0 FROM overture_poi WHERE overture_id = 'adfad45b-a406-47c9-b931-59038169496e';
DELETE FROM overture_poi_attribute
 WHERE overture_id = 'adfad45b-a406-47c9-b931-59038169496e' AND dimension = 'store_kind';
