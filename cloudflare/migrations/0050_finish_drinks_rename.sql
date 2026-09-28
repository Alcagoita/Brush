-- KAN-473. Finish the rename migration 0037 started.
--
-- KAN-432 renamed the wine/spirits store subtype from `drinks` to
-- `wine_and_spirits` on 2026-09-05 (0dc0aee), and 0037 carried the data
-- across by listing 791 explicit ids. Eighteen rows were promoted the day
-- BEFORE that commit — their `promotion_note` still reads "reviewed Drinks
-- batch: garrafeira" — and were not in the list, so they still serve the
-- retired value. The reviewed decision for every one of them says
-- `wine_and_spirits`.
--
-- This is the same rename by VALUE rather than by id, so it cannot miss a
-- row the way an id list can. No live code path writes `drinks` into the
-- served set: `overtureCategories.json`, `venueWords.json` and the reviewed
-- overrides all say `wine_and_spirits`, and the one file that still mentions
-- `drinks` (`extraction/apply_kan411_types.py`, KAN-411) writes to the
-- retired legacy `poi_attribute` table, which holds none.
--
-- Measured in production 2026-09-28 before applying:
--   overture_poi_attribute  store_kind = 'drinks'            18
--   overture_poi_attribute  store_kind = 'wine_and_spirits' 791
--   curated_poi_attribute   store_kind = 'drinks'             0
--   poi_attribute (legacy)  store_kind = 'drinks'             0
--
-- Re-runnable: a second apply matches nothing.
UPDATE overture_poi_attribute
   SET value = 'wine_and_spirits'
 WHERE dimension = 'store_kind'
   AND value = 'drinks';

UPDATE curated_poi_attribute
   SET value = 'wine_and_spirits'
 WHERE dimension = 'store_kind'
   AND value = 'drinks';
