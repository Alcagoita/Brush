-- KAN-439. Four curated rows sitting inside a shopping centre that the
-- operator does not list. Ruled individually by the owner 2026-10-24, because
-- a curated row is ours and `0059`'s sweep covered only `overture_poi`.
--
--   fsq:5235a3c7…  `Gymboree`   [amusement_park]  inside UBBO
--   fsq:526d4575…  `Iupy Ei`    [amusement_park]  inside UBBO
--                  Neither is at the centre — owner.
--
--   fsq:5290d3db…  `Mapa`       [amusement_park]  inside Amoreiras
--                  Removed on the owner's instruction.
--
--   fsq:534c8d70…  `Paulo Santos - Arte Contemporânea` [art_gallery] inside UBBO
--                  The gallery is real but it is in PONTINHA, not in the
--                  centre — so this row is MISLOCATED, not imaginary. It is
--                  withdrawn because a correctly-typed place at the wrong
--                  address is somewhere a user walks to for nothing, which is
--                  worse than not holding it. Re-adding it at Pontinha needs a
--                  source that can place it, and is not this ticket.
--
-- KEPT, ruled correct by the owner: `Capela de Nossa Senhora das Amoreiras`
-- (fsq:50b792c2…), a chapel inside the Amoreiras footprint. It is a real place
-- that happens to stand there, not a shop claiming to be a tenant, so the
-- "not on the operator's list" rule does not reach it.
--
-- A second `Gymboree` (fsq:56d18211…) sits outside both footprints and is not
-- touched — nothing in this ticket says anything about it.
--
-- A curated row is withdrawn with `status = 'removed'`, which nearby's
-- `status = 'active'` filter honours. Nothing is deleted.
UPDATE curated_poi
   SET status = 'removed',
       removed_at = '2026-10-24',
       removed_by = 'kan-439-mall-tenants',
       removal_reason = 'KAN-439: inside a shopping centre the operator does not list it in; owner ruling 2026-10-24'
 WHERE status = 'active'
   AND poi_id IN (
    'fsq:5235a3c711d2b264068d1ebb',
    'fsq:526d457511d2c0a1b17c8086',
    'fsq:5290d3db11d281f66adcdbbf',
    'fsq:534c8d70498ebc8bfac0a762'
  );
