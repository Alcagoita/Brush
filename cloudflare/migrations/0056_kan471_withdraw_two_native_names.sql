-- KAN-471. Two native names written under a rule the review then rejected.
--
-- `strip_locality_tail` used to drop a comma tail on sight. It now drops one
-- only when every segment is a verified locality — one the archive's own
-- `locality` column names, or a region. These two were written before that,
-- and both are wrong:
--
--   76cf4cf3-…  `@ Porto Santo Island, Atlantic Ocean <3`
--               had become `Ilha do @ Porto Santo`: the `@` survived into
--               the name, and `Atlantic Ocean <3` is not a locality.
--   abf22b37-…  `Lagoinha Park, Lda`
--               had become `Parque de Lagoinha`. `Lda` is the Portuguese
--               company suffix, so the tail named the company, not a place.
--
-- Only the native name and its provenance are cleared; `name` was never
-- written and is untouched, so these rows return to displaying exactly what
-- Overture called them. Guarded on `name_local_source = 'translated'`, so a
-- name looked up in Wikidata or confirmed by the owner cannot be cleared by
-- this, and a re-run changes nothing.
UPDATE overture_poi
   SET name_local = NULL, name_local_lang = NULL,
       name_local_source = NULL, name_local_source_ref = NULL,
       name_local_updated_at = NULL
 WHERE name_local_source = 'translated'
   AND overture_id IN ('76cf4cf3-0928-46af-879a-9c2f4c8f370a',
                       'abf22b37-1d3b-4556-9e42-3336adc720bd');
