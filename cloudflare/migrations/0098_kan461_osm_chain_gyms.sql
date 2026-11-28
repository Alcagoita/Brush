-- KAN-461. OSM gyms that carry a known chain (9), with the chain as brand so a chain task
-- finds them (KAN-364: a gym task matches only its chain). Same rules as batches 1-2: not served
-- today and no served gym within 50 m. The 209 local gyms without a chain are held for
-- KAN-544 (a gym task can be any gym): docs/kan-461/osm-batch2-gyms-held.md.
-- Withdraw with: UPDATE curated_poi SET status = 'removed' WHERE import_run_id = 'kan461-osm-gyms-20261128';
INSERT INTO curated_poi (poi_id, source, name, dedupe_name, lat, lng, geohash, primary_poi_type, address, status, created_at, created_by, updated_at, updated_by, origin_source, origin_id, origin_licence, imported_at, import_run_id) SELECT * FROM (VALUES
('osm:node/10248150260', 'community', 'Fitness Hut', 'fitness hut', 40.6623108, -7.9135016, 'ez4r7fm', 'gym', NULL, 'active', '2026-11-28T03:51:52Z', 'kan-461', '2026-11-28T03:51:52Z', 'kan-461', 'openstreetmap', 'node/10248150260', 'ODbL-1.0', '2026-11-28T03:51:52Z', 'kan461-osm-gyms-20261128'),
('osm:node/11319732041', 'community', 'Fitness Factory', 'fitness factory', 41.2857733, -8.3611278, 'ez64cez', 'gym', NULL, 'active', '2026-11-28T03:51:52Z', 'kan-461', '2026-11-28T03:51:52Z', 'kan-461', 'openstreetmap', 'node/11319732041', 'ODbL-1.0', '2026-11-28T03:51:52Z', 'kan461-osm-gyms-20261128'),
('osm:node/12553639678', 'community', 'Time To Fitness', 'time to fitness', 38.5311495, -8.886661, 'eycejy2', 'gym', 'Praça do Brasil, 17, 2900-285, Setúbal', 'active', '2026-11-28T03:51:52Z', 'kan-461', '2026-11-28T03:51:52Z', 'kan-461', 'openstreetmap', 'node/12553639678', 'ODbL-1.0', '2026-11-28T03:51:52Z', 'kan461-osm-gyms-20261128'),
('osm:node/12684651264', 'community', 'Solinca Classic', 'solinca classic', 41.1605829, -8.5839596, 'ez3fhtj', 'gym', 'Via Futebol Clube do Porto, 4350-415, Porto', 'active', '2026-11-28T03:51:52Z', 'kan-461', '2026-11-28T03:51:52Z', 'kan-461', 'openstreetmap', 'node/12684651264', 'ODbL-1.0', '2026-11-28T03:51:52Z', 'kan461-osm-gyms-20261128'),
('osm:node/14049576633', 'community', 'Fitness Factory', 'fitness factory', 40.9573201, -8.6518788, 'ez3c505', 'gym', NULL, 'active', '2026-11-28T03:51:52Z', 'kan-461', '2026-11-28T03:51:52Z', 'kan-461', 'openstreetmap', 'node/14049576633', 'ODbL-1.0', '2026-11-28T03:51:52Z', 'kan461-osm-gyms-20261128'),
('osm:way/106759547', 'community', 'Solinca Classic', 'solinca classic', 41.5275618, -8.4488994, 'ez3upxz', 'gym', '4705-319, Braga', 'active', '2026-11-28T03:51:52Z', 'kan-461', '2026-11-28T03:51:52Z', 'kan-461', 'openstreetmap', 'way/106759547', 'ODbL-1.0', '2026-11-28T03:51:52Z', 'kan461-osm-gyms-20261128'),
('osm:way/1196904837', 'community', 'Fitness Factory Samora Correia', 'fitness factory samora correia', 38.9160107, -8.8631006, 'eyctqk6', 'gym', NULL, 'active', '2026-11-28T03:51:52Z', 'kan-461', '2026-11-28T03:51:52Z', 'kan-461', 'openstreetmap', 'way/1196904837', 'ODbL-1.0', '2026-11-28T03:51:52Z', 'kan461-osm-gyms-20261128'),
('osm:way/1412247282', 'community', 'Solinca Smart Fitness', 'solinca smart fitness', 41.1191206, -8.619622, 'ez3cgve', 'gym', 'Avenida dos Descobrimentos, 549, 4404-403, Vila Nova de Gaia', 'active', '2026-11-28T03:51:52Z', 'kan-461', '2026-11-28T03:51:52Z', 'kan-461', 'openstreetmap', 'way/1412247282', 'ODbL-1.0', '2026-11-28T03:51:52Z', 'kan461-osm-gyms-20261128'),
('osm:way/1460376704', 'community', 'Solinca Classic', 'solinca classic', 41.2374884, -8.5973774, 'ez3fs75', 'gym', 'Rua de Agostinho da Silva Rocha, 4475-451, Maia', 'active', '2026-11-28T03:51:52Z', 'kan-461', '2026-11-28T03:51:52Z', 'kan-461', 'openstreetmap', 'way/1460376704', 'ODbL-1.0', '2026-11-28T03:51:52Z', 'kan461-osm-gyms-20261128')
) AS v WHERE NOT EXISTS (SELECT 1 FROM poi_source_correction c WHERE c.visible = 0 AND c.source = CASE v.column15 WHEN 'openstreetmap' THEN 'openstreetmap' WHEN 'osm' THEN 'openstreetmap' WHEN 'foursquare' THEN 'foursquare' WHEN 'foursquare_os_places' THEN 'foursquare' WHEN 'overture' THEN 'overture' END AND c.source_id = v.column16)
ON CONFLICT (origin_source, origin_id) WHERE origin_source IS NOT NULL AND origin_id IS NOT NULL DO NOTHING
ON CONFLICT (poi_id) DO NOTHING;

UPDATE curated_poi SET brand = 'Fitness Hut' WHERE poi_id = 'osm:node/10248150260' AND import_run_id = 'kan461-osm-gyms-20261128';
UPDATE curated_poi SET brand = 'Fitness Factory' WHERE poi_id = 'osm:node/11319732041' AND import_run_id = 'kan461-osm-gyms-20261128';
UPDATE curated_poi SET brand = 'Time to Fitness' WHERE poi_id = 'osm:node/12553639678' AND import_run_id = 'kan461-osm-gyms-20261128';
UPDATE curated_poi SET brand = 'Solinca' WHERE poi_id = 'osm:node/12684651264' AND import_run_id = 'kan461-osm-gyms-20261128';
UPDATE curated_poi SET brand = 'Fitness Factory' WHERE poi_id = 'osm:node/14049576633' AND import_run_id = 'kan461-osm-gyms-20261128';
UPDATE curated_poi SET brand = 'Solinca' WHERE poi_id = 'osm:way/106759547' AND import_run_id = 'kan461-osm-gyms-20261128';
UPDATE curated_poi SET brand = 'Fitness Factory' WHERE poi_id = 'osm:way/1196904837' AND import_run_id = 'kan461-osm-gyms-20261128';
UPDATE curated_poi SET brand = 'Solinca' WHERE poi_id = 'osm:way/1412247282' AND import_run_id = 'kan461-osm-gyms-20261128';
UPDATE curated_poi SET brand = 'Solinca' WHERE poi_id = 'osm:way/1460376704' AND import_run_id = 'kan461-osm-gyms-20261128';
