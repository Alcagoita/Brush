-- KAN-439. Amoreiras' operator lists its cinema as two units — `Cinemas NOS
-- (Salas 1, 2 e 3)` on Piso 2 and `Cinemas NOS (Salas Vip 1, 2, 3 e 4)` on
-- Piso 1 — and both now exist as curated rows. We also still serve the
-- Overture row `Cinemas NOS Amoreiras`, which is the same cinema under a name
-- the operator does not use, so three rows answer two units.
--
-- The operator decides what is a separate unit (owner, 2026-10-05), so the two
-- listed rows stay and the unlisted third is withdrawn. This is the same shape
-- as UBBO's cinema in 0060, and it was missed there for the same reason: the
-- comparison only ESCALATED `Cinemas NOS Amoreiras` rather than matching it,
-- so the writer treated both listed units as absent and created them beside it.
--
--   d1406ee4-…  `Cinemas NOS Amoreiras` 38.72287,-9.16178 — withdrawn
--   mall:amoreiras:cinemas-nos-salas-1-2-e-3           — kept, Piso 2
--   mall:amoreiras:cinemas-nos-salas-vip-1-2-3-e-4     — kept, Piso 1
--
-- `Loja NOS` is NOT touched: decisions.md already rules `Cinemas NOS` is not
-- `Loja NOS`, a cinema against a telecoms shop, and the operator lists `NOS`
-- separately.
--
-- `INSERT OR IGNORE`, so a re-run changes nothing.
INSERT OR IGNORE INTO poi_source_correction
  (source, source_id, visible, review_note, created_at)
VALUES
  ('overture', 'd1406ee4-80fb-4fe3-bac9-075c7e69ada1', 0,
   'KAN-439: the operator lists this cinema as two units, both now held; this row carries a name it does not use', '2026-10-23');
