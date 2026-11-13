-- KAN-503. One stored floor shape: a bare integer string ("-1", "0", "2").
--
-- 0030 added `floor` as the floor "as the operator states it — the digit".
-- KAN-439's `import_mall_tenants.placements` copied the operator's `Piso N`
-- verbatim instead (and wrote `Piso {level}` from OSM), so Amoreiras and UBBO
-- rows hold `Piso N` while every later centre holds the digit. The app adds
-- the word itself, in the user's language ("Floor 1" / "Piso 1"); a stored
-- prefix would read "Piso Piso 1" and wouldn't sort.
--
-- Measured in production 2026-11-13, the only non-integer values anywhere:
--   curated_poi  `Piso 1` ×73, `Piso 2` ×60, `Piso 0` ×2   (135 rows)
--   overture_poi none
--
-- The rewrite is general anyway: `Piso -1` -> `-1`, and a trailing zone word
-- (`Piso 0 GARE`) is dropped, as the mall-list README rules.
--
-- Idempotent: once rewritten, no row matches `Piso %`.

UPDATE curated_poi
   SET floor = CASE
         WHEN instr(trim(substr(floor, 6)), ' ') > 0
           THEN substr(trim(substr(floor, 6)), 1, instr(trim(substr(floor, 6)), ' ') - 1)
         ELSE trim(substr(floor, 6))
       END,
       updated_at = '2026-11-13',
       updated_by = 'kan-503'
 WHERE floor LIKE 'Piso %';

UPDATE overture_poi
   SET floor = CASE
         WHEN instr(trim(substr(floor, 6)), ' ') > 0
           THEN substr(trim(substr(floor, 6)), 1, instr(trim(substr(floor, 6)), ' ') - 1)
         ELSE trim(substr(floor, 6))
       END,
       updated_at = '2026-11-13'
 WHERE floor LIKE 'Piso %';
