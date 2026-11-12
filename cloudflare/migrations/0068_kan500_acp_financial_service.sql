-- KAN-500. ACP is a financial service (insurance) in every branch, and the
-- Colombo branch the operator lists is served.
--
-- WHY THIS TYPE (owner, 2026-11-12). ACP answers three errands: licence
-- renewal, travel documents and car insurance. Of the types a user can ask
-- for today, only insurance has a home — `financial_service` with
-- `financial_service_kind = insurance`, which "car insurance" already
-- resolves to. `travel_agency` exists in our data but no task reaches it,
-- and licence renewal has no type at all. Both of those wait for the
-- motoring-services type, filed as its own ticket; until then this is the
-- whole truthful set. `store` + `auto_parts_and_supply` was wrong on every
-- branch: ACP sells no car parts.
--
-- A brand carries one type set in every branch (KAN-480), so all three rows
-- we hold are retyped, not only the new one:
--
--   d6ab2e2d-181c-4d7d-a43a-03b617ab6be7     ACP … Leiria      (Overture)
--   mall:amoreiras:automovel-club-de-portugal                  (KAN-439)
--   mall:norteshopping:acp                                     (KAN-462)
--
-- `Acp Barbearia` in Gaia is a barber that shares the letters, and is left
-- alone.
--
-- COLOMBO. `colombo_stores.txt` lists `ACP – AUTOMÓVEL CLUB DE PORTUGAL`,
-- Piso 0. KAN-435 never added it; nothing ever removed it. OSM maps the unit
-- itself — way/1466236772, level 0, inside the outline — so the row takes
-- that position and is keyed on it the way KAN-435 keyed Colombo's other
-- tenants (`mall:way-<id>`, source `manual`, origin `osm`).
--
-- Retypes and one insert; no row removed. Idempotent.

UPDATE overture_poi SET primary_poi_type = 'financial_service', updated_at = '2026-11-12'
 WHERE overture_id = 'd6ab2e2d-181c-4d7d-a43a-03b617ab6be7';
DELETE FROM overture_poi_type WHERE overture_id = 'd6ab2e2d-181c-4d7d-a43a-03b617ab6be7';
INSERT INTO overture_poi_type (overture_id, poi_type, rank)
VALUES ('d6ab2e2d-181c-4d7d-a43a-03b617ab6be7', 'financial_service', 0);
DELETE FROM overture_poi_attribute
 WHERE overture_id = 'd6ab2e2d-181c-4d7d-a43a-03b617ab6be7'
   AND dimension IN ('store_kind', 'financial_service_kind');
INSERT INTO overture_poi_attribute (overture_id, dimension, value)
VALUES ('d6ab2e2d-181c-4d7d-a43a-03b617ab6be7', 'financial_service_kind', 'insurance');

UPDATE curated_poi
   SET primary_poi_type = 'financial_service', updated_at = '2026-11-12', updated_by = 'kan-500-acp'
 WHERE poi_id IN ('mall:amoreiras:automovel-club-de-portugal', 'mall:norteshopping:acp');
DELETE FROM curated_poi_attribute
 WHERE poi_id IN ('mall:amoreiras:automovel-club-de-portugal', 'mall:norteshopping:acp')
   AND dimension IN ('store_kind', 'poi_type', 'financial_service_kind');
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES
  ('mall:amoreiras:automovel-club-de-portugal', 'financial_service_kind', 'insurance'),
  ('mall:norteshopping:acp', 'financial_service_kind', 'insurance');

INSERT INTO curated_poi
  (poi_id, source, name, dedupe_name, lat, lng, geohash, primary_poi_type,
   address, floor, country_code, status, created_at, created_by, updated_at,
   updated_by, origin_source, origin_id, origin_licence, imported_at, import_run_id)
VALUES
  ('mall:way-1466236772', 'manual', 'ACP – Automóvel Club de Portugal', 'acp automovel club de portugal',
   38.7537645, -9.1886437, 'eyckqyvj1', 'financial_service',
   NULL, '0', 'PT', 'active', '2026-11-12', 'kan-500-acp', '2026-11-12',
   'kan-500-acp', 'osm', 'way/1466236772', 'ODbL', '2026-11-12', 'kan500-20261112')
ON CONFLICT (poi_id) DO NOTHING;
INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value)
VALUES ('mall:way-1466236772', 'financial_service_kind', 'insurance');
