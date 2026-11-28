-- KAN-461. Belém, around Jerónimos: one row per real place (owner, 2026-11-16:
-- "a duplication is even worse than only having Mosteiro dos Jerónimos"). Nothing deleted.

INSERT INTO poi_source_correction (source, source_id, visible, review_note, created_at) VALUES
  ('overture', 'af9a4cd2-63f5-4d4f-81ea-ac624dc2c415', 0, 'KAN-461 (owner, 2026-11-16, Belém): tomb inside Jerónimos Monastery', '2026-11-16'),
  ('overture', 'e5d132b4-d035-467d-aa60-970c5121518d', 0, 'KAN-461 (owner, 2026-11-16, Belém): tomb inside Jerónimos Monastery', '2026-11-16'),
  ('overture', '83b645ac-38e0-41c8-a9f8-e6bda094c620', 0, 'KAN-461 (owner, 2026-11-16, Belém): tomb inside Jerónimos Monastery', '2026-11-16'),
  ('overture', 'c8a5afe1-fb86-4f73-b25e-6e91c4f4eb1b', 0, 'KAN-461 (owner, 2026-11-16, Belém): tomb inside Jerónimos Monastery', '2026-11-16'),
  ('overture', 'd2acdf60-fcc5-4e2c-a682-5b24468aeeed', 0, 'KAN-461 (owner, 2026-11-16, Belém): same as Museu da Marinha', '2026-11-16'),
  ('overture', '741827b9-5e36-4e4c-9bcd-a8096f4210ab', 0, 'KAN-461 (owner, 2026-11-16, Belém): not a place (review-style name)', '2026-11-16'),
  ('overture', '5b85f94d-aba8-4124-bea9-c549a28087b8', 0, 'KAN-461 (owner, 2026-11-16, Belém): not a place (no name)', '2026-11-16'),
  ('overture', '2143eba3-70aa-4944-b76b-b1a56d6bd93f', 0, 'KAN-461 (owner, 2026-11-16, Belém): a car park, not a park', '2026-11-16'),
  ('overture', '1e3903a0-fadc-4384-bd6f-c8bf7c1388c7', 0, 'KAN-461 (owner, 2026-11-16, Belém): an event, not a place', '2026-11-16')
ON CONFLICT (source, source_id) DO UPDATE SET visible = 0, review_note = excluded.review_note;
UPDATE curated_poi SET status = 'removed', removed_at = '2026-11-16', removed_by = 'kan-461', removal_reason = 'KAN-461 (owner, 2026-11-16, Belém): tomb inside Jerónimos Monastery' WHERE status = 'active' AND poi_id = 'fsq:665b310f02bcfd007d902693';  -- Túmulo de Camões
UPDATE curated_poi SET status = 'removed', removed_at = '2026-11-16', removed_by = 'kan-461', removal_reason = 'KAN-461 (owner, 2026-11-16, Belém): part of Jerónimos Monastery' WHERE status = 'active' AND poi_id = 'fsq:526ffc3411d22093eb83ba39';  -- Claustro do Mosteiro dos Jerónimos
UPDATE curated_poi SET status = 'removed', removed_at = '2026-11-16', removed_by = 'kan-461', removal_reason = 'KAN-461 (owner, 2026-11-16, Belém): tomb inside Jerónimos Monastery' WHERE status = 'active' AND poi_id = 'fsq:635bcbbf95fab601730affa5';  -- Sepultura de Luis de Camões
UPDATE curated_poi SET status = 'removed', removed_at = '2026-11-16', removed_by = 'kan-461', removal_reason = 'KAN-461 (owner, 2026-11-16, Belém): part of Jerónimos Monastery' WHERE status = 'active' AND poi_id = 'fsq:50155621e4b0f8ec78f63b28';  -- Igreja dos Jerónimos
