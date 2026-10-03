-- KAN-471. Three rows the owner decided should not be served (2026-09-28),
-- found while reviewing the English-named candidates.
--
--   59277518-…  Tickets office Jerónimos Monastery  museum
--               A ticket desk, not a place to run an errand at. It is also
--               the row that made `Jerónimos Monastery` look duplicated.
--   9a39bbec-…  Pinus Urban Garden                 historical_landmark
--   b941ff8a-…  Tagus Park!                        park
--
-- The mechanism is the Overture row's tombstone (KAN-452): a
-- `poi_source_correction` with `visible = 0`, which `queryNearbyPoiDb`
-- already joins and honours, and which the moderation lookup treats as
-- hidden. Nothing is deleted — cleanup means code paths, never data — so the
-- row keeps its reviewed decision and comes back if the owner reverses this.
--
-- `INSERT OR IGNORE`, so a re-run changes nothing.
INSERT OR IGNORE INTO poi_source_correction
  (source, source_id, visible, review_note, created_at)
VALUES
  ('overture', '59277518-5c11-49aa-9a35-446170764ed9', 0,
   'KAN-471: a ticket office, not a place; owner decision 2026-09-28', '2026-09-28'),
  ('overture', '9a39bbec-8dd1-49b9-bb9e-d444e5907e4c', 0,
   'KAN-471: not a place we should serve; owner decision 2026-09-28', '2026-09-28'),
  ('overture', 'b941ff8a-5312-4179-961f-23fd035ce349', 0,
   'KAN-471: not a place we should serve; owner decision 2026-09-28', '2026-09-28');
