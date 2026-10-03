-- KAN-471, third owner review (2026-10-03). Same tombstone mechanism as 0051
-- and 0052: `poi_source_correction` with `visible = 0`, which nearby joins
-- and honours. Nothing deleted, so the row keeps its reviewed decision.
--
--   b904499f-…  `Ondix Beach`, served as `beach`, 38.63482,-9.23191 Almada,
--               confidence 0.38 — the lowest of any row in this review.
--               `ONDIX` itself is a dance club 8 km away (4c12ab69-…), which
--               is left alone: a club is a real place, just not a beach.
--
-- `INSERT OR IGNORE`, so a re-run changes nothing.
INSERT OR IGNORE INTO poi_source_correction
  (source, source_id, visible, review_note, created_at)
VALUES
  ('overture', 'b904499f-09b7-4a3c-adcf-1f007d5cb16e', 0,
   'KAN-471: not a place we should serve; owner decision 2026-10-03', '2026-10-03');
