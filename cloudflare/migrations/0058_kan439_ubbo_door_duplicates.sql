-- KAN-439. Two rows at UBBO where Overture holds one shop twice: once at the
-- centre's street door, once at the real unit. Same tombstone mechanism as
-- 0051–0053 and 0056 — `poi_source_correction` with `visible = 0`, which
-- nearby joins and honours (index.ts: `if (row.correction_visible === 0)
-- continue;`). Nothing is deleted, so each row keeps its reviewed decision
-- and the removal is reversible.
--
-- Overture is a conflation of meta, Microsoft, Foursquare and AllThePlaces,
-- and its own matcher did not merge these. Both halves of the rule the owner
-- set on 2026-10-04 hold for each row below — a name twin from a DIFFERENT
-- upstream dataset, AND a door coordinate with the street address rather
-- than a unit. `mall_door_duplicates.py` checks both and prints what matched
-- only one; the operator's published list confirms one unit for each shop.
--
--   08706da4-…  `Bershka` [Microsoft] 38.775290,-9.220240
--               'AVENIDA CRUZEIRO SEIXAS 5' — the door, shared with the Oysho
--               row below. Twin: `Bershka` [Foursquare] 38.776258,-9.218830.
--   2d35b428-…  `Oysho` [Microsoft] 38.775290,-9.220240
--               'Avenida Cruzeiro Seixas 5' — same door. Twin: `Oysho`
--               [Foursquare] 38.776436,-9.220108 'C. C. UBBO, Loja 1.103-1.105'.
--
-- The Foursquare twins are NOT touched: they carry the unit and are the rows
-- a user should see. Nine other rows sharing a door at UBBO and Amoreiras are
-- left alone — they have no twin and are the only record we hold of those
-- shops (see decisions.md).
--
-- `INSERT OR IGNORE`, so a re-run changes nothing.
INSERT OR IGNORE INTO poi_source_correction
  (source, source_id, visible, review_note, created_at)
VALUES
  ('overture', '08706da4-2674-466e-820c-cb47f09c015b', 0,
   'KAN-439: Microsoft copy pinned to the UBBO door; Foursquare twin holds the unit; owner rule 2026-10-04', '2026-10-04'),
  ('overture', '2d35b428-f4a8-4e5a-b076-68402eae30e5', 0,
   'KAN-439: Microsoft copy pinned to the UBBO door; Foursquare twin holds the unit; owner rule 2026-10-04', '2026-10-04');
