-- KAN-439. UBBO's operator lists one cinema, `UCI Luxe`. Production served it
-- four times. Found by verifying 0058/0059 through `POST /poi/nearby` rather
-- than trusting that they were enough:
--
--   movie_theater at UBBO 400 m -> Isense, UCI Dolce Vita Tejo, UCI Luxe, UCI CINEMAS
--
-- Three Overture rows and one curated row, all the same cinema:
--
--   47983e06-…  `UCI Luxe`            [Foursquare] inside the outline  KEPT —
--               it carries the operator's own name for the unit.
--   b720a58d-…  `UCI Dolce Vita Tejo` [meta] inside the outline. The centre's
--               retired name, the Jumbo/Auchan shape again.
--   92f1f481-…  `UCI CINEMAS`         [Microsoft] 34.6 m outside the outline.
--   fsq:66c538d0…  `Isense`           curated. iSense is UCI's premium screen
--               brand, not a separate venue.
--
-- WHY 0059 MISSED ALL THREE, which is the part worth remembering:
--
--  * `UCI Dolce Vita Tejo` was taken OFF 0059's list by hand, as a "missed
--    match" of the listed `UCI Luxe`. That was half right — it is the same
--    cinema — but a row literally named `UCI Luxe` also exists, and it is the
--    better one to keep. Pulling a row off a withdrawal list because it
--    matches a tenant is only safe after checking whether a better-named row
--    already matches that same tenant.
--  * `UCI CINEMAS` sits in the footprint buffer, and 0059 removes only from
--    the strict outline — the guard that protects Amoreiras Plaza's tenants.
--    The guard is right; it just cannot see a duplicate that straddles it.
--  * `Isense` is a `curated_poi` row, and 0059 considered only `overture_poi`.
--    The operator's list governs everything served inside a centre, whatever
--    table it sits in.
--
-- A NEAR MISS worth recording. A second row named `UCI CINEMAS` exists,
-- fe108120-…, on Avenida António Augusto de Aguiar — 7.4 km away, in central
-- Lisbon, and a different cinema entirely. Selecting these ids by name alone
-- would have withdrawn it. Every id below came from a query filtered on
-- position, and was read in full rather than from an 8-character prefix.
--
-- An Overture row is tombstoned through `poi_source_correction`; a curated row
-- is withdrawn with `status = 'removed'`, which is what nearby's
-- `status = 'active'` filter honours. Nothing is deleted either way.
INSERT OR IGNORE INTO poi_source_correction
  (source, source_id, visible, review_note, created_at)
VALUES
  ('overture', 'b720a58d-5b49-49f2-a15e-15291997c847', 0,
   'KAN-439: same cinema as UCI Luxe under the centre''s retired name; UCI Luxe kept', '2026-10-23'),
  ('overture', '92f1f481-708c-4877-b20f-5840b3021dc9', 0,
   'KAN-439: same cinema as UCI Luxe, pinned 34.6 m outside the outline; UCI Luxe kept', '2026-10-23');

UPDATE curated_poi
   SET status = 'removed',
       removed_at = '2026-10-23',
       removed_by = 'kan-439-mall-tenants',
       removal_reason = 'KAN-439: iSense is UCI''s premium screen brand, not a separate venue; UCI Luxe kept'
 WHERE poi_id = 'fsq:66c538d074ba79026ed14a4f'
   AND status = 'active';
