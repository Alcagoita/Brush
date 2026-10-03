-- KAN-471, second review (owner, 2026-10-03). Same mechanism as 0051: the
-- Overture row's tombstone (`poi_source_correction`, `visible = 0`,
-- KAN-452), which nearby already joins and honours. Nothing is deleted, so
-- every row keeps its reviewed decision if the owner reverses this.
--
-- 1. `Rua Azores Park`, 37.76843,-25.62452 Ponta Delgada, confidence 0.52 —
--    not a place we serve (owner decision).
--
-- 2. `Badoca Safari Park` arrived FIVE times. The park is one place, in Vila
--    Nova de Santo André: `0e2b3245-…`, filed as `zoo`, confidence 1.00,
--    38.04158,-8.74450. That row stays and is the one the owner keeps. The
--    four withdrawn here carry the same name at:
--
--      0dbe7be0-…  `Badoca Park`         3.9 km away, confidence 0.73
--      13db4597-…  `Badoka Safari Park`  21.2 km away, Grândola
--      ce3d793b-…  `Badoca Safari Park`  83.4 km away, filed in Lisboa
--      1bd142b2-…  `Badoca Safari Park`  86.1 km away, filed in Lisboa
--
--    Two more rows share the name and are NOT withdrawn, because they are
--    not the same claim and want a separate decision:
--      54eeb83d-…  `Badoca Safari Park`, `amusement_park`, 5.1 km away
--      d064f951-…  `Badoka Park`, `petting_zoo`, 100.9 km away in Lagos
--    Neither reached the naming review; both are listed in the KAN-471
--    runbook for the owner.
--
-- `INSERT OR IGNORE`, so a re-run changes nothing.
INSERT OR IGNORE INTO poi_source_correction
  (source, source_id, visible, review_note, created_at)
VALUES
  ('overture', '37fe6a62-e67d-4916-b2ca-c9cf9b4fde29', 0,
   'KAN-471: not a place we should serve; owner decision 2026-10-03', '2026-10-03'),
  ('overture', '0dbe7be0-473c-4566-b40b-1cfd87b2a1ba', 0,
   'KAN-471: duplicate of Badoca Safari Park 0e2b3245 (3.9 km); owner decision 2026-10-03', '2026-10-03'),
  ('overture', '13db4597-bda0-4711-9b13-09b8ab55c4db', 0,
   'KAN-471: duplicate of Badoca Safari Park 0e2b3245 (21.2 km); owner decision 2026-10-03', '2026-10-03'),
  ('overture', 'ce3d793b-1911-4f5a-8fcb-33ebaa4a6601', 0,
   'KAN-471: duplicate of Badoca Safari Park 0e2b3245 (83.4 km, filed in Lisboa); owner decision 2026-10-03', '2026-10-03'),
  ('overture', '1bd142b2-5a51-4a85-80c8-a4734e30ceba', 0,
   'KAN-471: duplicate of Badoca Safari Park 0e2b3245 (86.1 km, filed in Lisboa); owner decision 2026-10-03', '2026-10-03');
