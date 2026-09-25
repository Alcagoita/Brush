"""KAN-450 — an on-demand Place is an Overture build with an Overture export.

Exercised through the same d1_client / r2_client / worker_client contract
production uses, with the network pieces (Nominatim, DuckDB, Overpass)
replaced at the module boundary.
"""
import os
import sqlite3
import sys
import tempfile
import unittest

EXTRACTION_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, EXTRACTION_DIR)
sys.path.insert(0, os.path.join(EXTRACTION_DIR, 'tests'))

from _stubs import stub_missing_dependencies  # noqa: E402
stub_missing_dependencies()

import overture_place  # noqa: E402
import run_job  # noqa: E402
import extract_overture  # noqa: E402

BBOX = (38.70, 38.75, -9.20, -9.10)
POIS = [
    {'overture_id': 'g1', 'name': 'Farmácia Central', 'name_local': 'Farmácia Central',
     'name_en': 'Central Pharmacy', 'name_local_lang': 'pt', 'lat': 38.71, 'lng': -9.15, 'primary_poi_type': 'pharmacy',
     'brand': None, 'address': 'Rua A', 'open_min': 540, 'close_min': 1140},
    {'overture_id': 'g2', 'name': 'Sapataria Sol', 'lat': 38.72, 'lng': -9.14, 'primary_poi_type': 'store',
     'brand': None, 'address': None, 'open_min': None, 'close_min': None},
]
TYPES = [{'overture_id': 'g1', 'poi_type': 'pharmacy', 'rank': 1}, {'overture_id': 'g2', 'poi_type': 'store', 'rank': 1}]
ATTRIBUTES = [{'overture_id': 'g2', 'dimension': 'store_kind', 'value': 'shoes'}]


class FakeD1:
    def __init__(self, pois=POIS):
        self.executed, self.selected, self.pois = [], [], pois

    def execute(self, sql):
        self.executed.append(sql)
        return {'changes': 1}

    def select(self, sql):
        self.selected.append(sql)
        if 'FROM overture_poi_type' in sql:
            return [t for t in TYPES if f"'{t['overture_id']}'" in sql]
        if 'FROM overture_poi_attribute' in sql:
            return [a for a in ATTRIBUTES if f"'{a['overture_id']}'" in sql]
        if 'FROM overture_poi ' in sql:
            # keyset pagination: one page, then nothing
            return [] if "overture_id > 'g2'" in sql else self.pois
        if 'FROM place ' in sql:
            return [{'place_id': 'osm-relation-1', 'min_lat': BBOX[0], 'max_lat': BBOX[1], 'min_lng': BBOX[2], 'max_lng': BBOX[3]}]
        return []


class FakeR2:
    def __init__(self):
        self.uploads = []

    def upload_file(self, path, key):
        self.uploads.append((path, key))


class FakeWorker:
    def __init__(self):
        self.complete, self.failed, self.build_failed_calls = [], [], []

    def build_complete(self, **kwargs):
        self.complete.append(kwargs)

    def build_failed(self, place_id, build_id):
        self.build_failed_calls.append((place_id, build_id))

    def place_failed(self, place_id, stage=None, error=None):
        self.failed.append((place_id, stage, error))


class ExportTest(unittest.TestCase):
    def test_the_export_is_overture_shaped_and_self_describing(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = overture_place.write_export('osm-relation-1', 'b1', POIS, TYPES, ATTRIBUTES, os.path.join(tmp, 'e.sqlite'))
            db = sqlite3.connect(path)
            self.assertEqual(db.execute('SELECT overture_id, primary_poi_type, open_min FROM poi ORDER BY 1').fetchall(),
                             [('g1', 'pharmacy', 540), ('g2', 'store', None)])
            self.assertEqual(db.execute('SELECT name_local, name_en, name_local_lang FROM poi WHERE overture_id = ?',
                                        ('g1',)).fetchone(), ('Farmácia Central', 'Central Pharmacy', 'pt'))
            self.assertEqual(db.execute('SELECT overture_id, dimension, value FROM poi_attribute').fetchall(),
                             [('g2', 'store_kind', 'shoes')])
            self.assertEqual(db.execute('SELECT place_id, build_id, pipeline_version, source, row_count FROM _export_meta').fetchone(),
                             ('osm-relation-1', 'b1', overture_place.EXPORT_VERSION, 'overture_places', 2))
            columns = [c[1] for c in db.execute('PRAGMA table_info(poi)')]
            self.assertNotIn('fsq_place_id', columns)

    def test_served_rows_reads_types_in_bounded_id_chunks(self):
        d1 = FakeD1()
        with self._patched(d1=d1):
            pois, types_, attributes = overture_place.served_rows(*BBOX)
        self.assertEqual([p['overture_id'] for p in pois], ['g1', 'g2'])
        self.assertEqual(len(types_), 2)
        self.assertEqual(attributes, ATTRIBUTES)
        in_clauses = [s for s in d1.selected if ' IN (' in s]
        self.assertTrue(all(s.count("'") // 2 <= 150 for s in in_clauses))

    def _patched(self, **fakes):
        return _Patched(**fakes)


class _Patched:
    def __init__(self, d1=None, r2=None, worker=None, nominatim=None, extract=None, promote=None, load=None):
        self.fakes = dict(d1_client=d1, r2_client=r2, worker_client=worker)
        self.nominatim, self.extract_fn, self.promote_fn, self.load_fn = nominatim, extract, promote, load
        self.saved = {}
        self.overpass_calls = []

    def __enter__(self):
        import analyse_poi_candidates
        self.saved['query'] = analyse_poi_candidates.query
        if self.fakes['d1_client']:
            analyse_poi_candidates.query = self.fakes['d1_client'].select
        for name, fake in self.fakes.items():
            if fake is not None:
                self.saved[name] = getattr(overture_place, name)
                setattr(overture_place, name, fake)
        if self.nominatim:
            self.saved['lookup_place'] = overture_place.nominatim_client.lookup_place
            overture_place.nominatim_client.lookup_place = self.nominatim
        if self.extract_fn:
            self.saved['extract_bbox'] = overture_place.extract_overture.extract_bbox
            overture_place.extract_overture.extract_bbox = self.extract_fn
        if self.promote_fn:
            self.saved['run_country'] = overture_place.promote_overture_candidates.run_country
            overture_place.promote_overture_candidates.run_country = self.promote_fn
        if self.load_fn:
            self.saved['load'] = overture_place.load_overture_candidates.load
            overture_place.load_overture_candidates.load = self.load_fn
        # KAN-454: a Place build makes no Overpass call. The supplement module
        # still exists (KAN-433's matcher lives there); its entry point is
        # trapped so any path back into it is a test failure, not a request.
        import supplement_osm_pois
        self.saved['supplement_scope'] = supplement_osm_pois.supplement_scope
        supplement_osm_pois.supplement_scope = lambda *a, **k: self.overpass_calls.append((a, k)) or ([], {}, [])
        self.saved['BUILD_DIR'] = overture_place.extract.BUILD_DIR
        self.tmp = tempfile.TemporaryDirectory()
        overture_place.extract.BUILD_DIR = self.tmp.name
        return self

    def __exit__(self, *exc):
        import analyse_poi_candidates
        analyse_poi_candidates.query = self.saved['query']
        for name in self.fakes:
            if name in self.saved:
                setattr(overture_place, name, self.saved[name])
        if 'lookup_place' in self.saved:
            overture_place.nominatim_client.lookup_place = self.saved['lookup_place']
        if 'extract_bbox' in self.saved:
            overture_place.extract_overture.extract_bbox = self.saved['extract_bbox']
        if 'run_country' in self.saved:
            overture_place.promote_overture_candidates.run_country = self.saved['run_country']
        if 'load' in self.saved:
            overture_place.load_overture_candidates.load = self.saved['load']
        import supplement_osm_pois
        supplement_osm_pois.supplement_scope = self.saved['supplement_scope']
        overture_place.extract.BUILD_DIR = self.saved['BUILD_DIR']
        self.tmp.cleanup()
        return False


class MapPlaceTest(unittest.TestCase):
    def setUp(self):
        self.d1, self.r2, self.worker = FakeD1(), FakeR2(), FakeWorker()
        self.calls = {'extract': [], 'load': [], 'promote': []}

        def extract(min_lat, max_lat, min_lng, max_lng, out_path, release=None, country=None):
            self.calls['extract'].append({'bbox': (min_lat, max_lat, min_lng, max_lng), 'country': country})
            with open(out_path, 'w') as handle:
                handle.write('overture_id,name,lat,lng\n')
            return out_path

        def load(csv_path, key):
            self.calls['load'].append(key)
            return 2

        def promote(batch, key):
            self.calls['promote'].append(key)
            return {'promoted': 2, 'rejected': 0, 'pending': 0}

        self.patch = dict(d1=self.d1, r2=self.r2, worker=self.worker, extract=extract, promote=promote, load=load,
                          nominatim=lambda pid: (BBOX, 'PT'))

    def test_a_place_is_extracted_promoted_exported_and_reported(self):
        with _Patched(**self.patch) as patched:
            result = overture_place.map_place('osm-relation-1')
        self.assertEqual(patched.overpass_calls, [], 'KAN-454: a Place build makes no Overpass call')
        build_id = result['build_id']
        self.assertEqual(self.calls['extract'][0], {'bbox': BBOX, 'country': 'PT'})
        raw_key = f'overture-place-sources/osm-relation-1/{build_id}.csv'
        self.assertEqual(self.calls['load'], [raw_key], 'overrides key on the Place archive')
        self.assertEqual(self.calls['promote'], [raw_key])
        self.assertEqual([k for _, k in self.r2.uploads], [raw_key, f'exports/osm-relation-1/{build_id}.sqlite'])
        self.assertTrue(any('INSERT INTO build_log' in s and "'overture_places'" in s for s in self.d1.executed))
        done = self.worker.complete[0]
        self.assertEqual((done['place_id'], done['build_id'], done['rows_loaded'], done['r2_key']),
                         ('osm-relation-1', build_id, 2, raw_key))
        self.assertEqual(done['extent'], {'min_lat': 38.71, 'max_lat': 38.72, 'min_lng': -9.15, 'max_lng': -9.14})

    def test_no_country_from_nominatim_means_an_unfiltered_pull(self):
        self.patch['nominatim'] = lambda pid: (BBOX, None)
        with _Patched(**self.patch):
            overture_place.map_place('osm-relation-1')
        self.assertIsNone(self.calls['extract'][0]['country'])

    def test_a_failure_before_the_build_log_reports_place_failed(self):
        self.patch['nominatim'] = lambda pid: (_ for _ in ()).throw(RuntimeError('no nominatim'))
        with _Patched(**self.patch), self.assertRaises(RuntimeError):
            overture_place.map_place('osm-relation-1')
        self.assertEqual(self.worker.failed, [('osm-relation-1', 'resolve_place_bounds', 'RuntimeError')])
        self.assertEqual(self.worker.build_failed_calls, [])

    def test_a_failure_after_the_build_log_closes_the_build_as_failed(self):
        def promote(batch, key):
            raise RuntimeError('d1 down')
        self.patch['promote'] = promote
        with _Patched(**self.patch), self.assertRaises(RuntimeError):
            overture_place.map_place('osm-relation-1')
        self.assertEqual(len(self.worker.build_failed_calls), 1)
        self.assertEqual(self.worker.failed, [])
        self.assertEqual(self.worker.complete, [])

    def test_a_place_build_writes_no_osm_poi(self):
        # KAN-454: nothing a Place build executes touches osm_poi — the
        # supplement is gone, not merely skipped.
        with _Patched(**self.patch) as patched:
            overture_place.map_place('osm-relation-1')
        self.assertEqual(patched.overpass_calls, [])
        self.assertFalse(any('osm_poi' in s for s in self.d1.executed))
        self.assertEqual(len(self.worker.complete), 1)

    def test_run_job_place_mode_is_the_overture_build(self):
        with _Patched(**self.patch):
            saved = run_job.overture_place.map_place
            seen = []
            run_job.overture_place.map_place = lambda pid: seen.append(pid)
            try:
                run_job.run_place('osm-relation-1')
            finally:
                run_job.overture_place.map_place = saved
        self.assertEqual(seen, ['osm-relation-1'])


class CountryExportTest(unittest.TestCase):
    def test_every_mapped_settlement_gets_an_export_keyed_on_the_run(self):
        d1, r2, worker = FakeD1(), FakeR2(), FakeWorker()
        with _Patched(d1=d1, r2=r2, worker=worker):
            stats = overture_place.export_country_places('PT', 'run7')
        self.assertEqual(stats, {'exported': 1, 'failed': 0})
        self.assertEqual([k for _, k in r2.uploads], ['exports/osm-relation-1/run7-osm-relation-1.sqlite'])
        self.assertEqual(worker.complete[0]['build_id'], 'run7-osm-relation-1')

    def test_the_local_export_file_is_removed_after_upload_and_after_a_failed_upload(self):
        for fail in (False, True):
            d1, r2, worker = FakeD1(), FakeR2(), FakeWorker()
            if fail:
                r2.upload_file = lambda path, key: (_ for _ in ()).throw(RuntimeError('r2'))
            with _Patched(d1=d1, r2=r2, worker=worker) as patched:
                overture_place.export_country_places('PT', 'run7')
                self.assertEqual([f for f in os.listdir(patched.tmp.name) if f.endswith('.sqlite')], [])

    def test_a_settlement_export_failure_does_not_stop_the_others(self):
        d1, r2, worker = FakeD1(), FakeR2(), FakeWorker()
        r2.upload_file = lambda path, key: (_ for _ in ()).throw(RuntimeError('r2'))
        with _Patched(d1=d1, r2=r2, worker=worker):
            stats = overture_place.export_country_places('PT', 'run7')
        self.assertEqual(stats, {'exported': 0, 'failed': 1})


class ExtractBboxTest(unittest.TestCase):
    def test_the_country_filter_is_exact_and_validated(self):
        with self.assertRaises(ValueError):
            extract_overture.extract_bbox(*BBOX, out_path='/dev/null', country='Portugal')


if __name__ == '__main__':
    unittest.main()
