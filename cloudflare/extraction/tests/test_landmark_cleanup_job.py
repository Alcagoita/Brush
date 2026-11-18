"""KAN-461. The landmark cleanup container job: dry run decides and reports, emit replays and deletes."""
import gzip
import json
import os
import sqlite3
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)

from _stubs import stub_missing_dependencies  # noqa: E402
stub_missing_dependencies()

import landmark_cleanup_job as job  # noqa: E402

SCHEMA = """
CREATE TABLE poi_source_correction (source TEXT, source_id TEXT, visible INTEGER, name_override TEXT,
  review_note TEXT, created_at TEXT, PRIMARY KEY (source, source_id));
CREATE TABLE overture_poi (overture_id TEXT PRIMARY KEY, name TEXT, lat REAL, lng REAL, primary_poi_type TEXT,
  retired_in_release TEXT);
CREATE TABLE overture_poi_type (overture_id TEXT, poi_type TEXT);
CREATE TABLE overture_poi_attribute (overture_id TEXT, dimension TEXT, value TEXT);
CREATE TABLE overture_candidate (overture_id TEXT PRIMARY KEY, locality TEXT);
CREATE TABLE curated_poi (poi_id TEXT PRIMARY KEY, source TEXT, name TEXT, lat REAL, lng REAL, primary_poi_type TEXT,
  status TEXT, origin_source TEXT, origin_id TEXT);
CREATE TABLE curated_poi_attribute (poi_id TEXT, dimension TEXT, value TEXT);
CREATE TABLE landmark_cleanup_scope (run_id TEXT, area_key TEXT, name TEXT, seq INTEGER,
  min_lat REAL, max_lat REAL, min_lng REAL, max_lng REAL);
"""


class FakeD1:
    def __init__(self):
        self.db = sqlite3.connect(':memory:')
        self.db.row_factory = sqlite3.Row
        self.db.executescript(SCHEMA)

    def select(self, sql):
        return [dict(r) for r in self.db.execute(sql).fetchall()]

    def execute(self, sql):
        cur = self.db.execute(sql)
        return {'changes': cur.rowcount}


class FakeR2:
    def __init__(self):
        self.objects = {}

    def upload_bytes(self, data, key, content_type='application/json'):
        self.objects[key] = data.encode('utf-8') if isinstance(data, str) else data

    def download_file(self, key, path):
        if key not in self.objects:
            raise Exception(f'R2 outbound download failed (404) for {key}')
        open(path, 'wb').write(self.objects[key])


class FakeWorker:
    def __init__(self, scopes, mode='dry_run', source=None, emit_filter='all'):
        self.scopes, self.mode, self.source, self.filter, self.results = scopes, mode, source, emit_filter, {}

    def landmark_cleanup_claim(self, run_id, worker_id, batch_size, job_version):
        self.job_version = job_version
        return {'locked': True, 'mode': self.mode, 'sourceRunId': self.source, 'emitFilter': self.filter, 'scopes': self.scopes}

    def landmark_cleanup_completed(self, run_id, area_key, worker_id, rows, to_remove, removed, held, report):
        self.results[area_key] = {'rows': rows, 'to_remove': to_remove, 'removed': removed, 'held': held}

    def landmark_cleanup_failed(self, run_id, area_key, worker_id, error):
        self.results[area_key] = {'error': error}

    def landmark_cleanup_release(self, run_id, worker_id):
        return {'finalized': True}


LISBOA = {'areaKey': 'relation/1', 'name': 'Lisboa', 'seq': 1, 'minLat': 38.69, 'maxLat': 38.80, 'minLng': -9.23, 'maxLng': -9.09}


def seed(d1):
    d1.db.execute("INSERT INTO landmark_cleanup_scope VALUES ('dry', 'relation/1', 'Lisboa', 1, 38.69, 38.80, -9.23, -9.09)")
    d1.db.executemany("INSERT INTO overture_poi VALUES (?, ?, ?, ?, ?, NULL)", [
        ('g-madalena', 'Church of Saint Mary Magdalene', 38.71046, -9.13493, 'church'),
        ('g-street', 'Rua das Canastras', 38.7110, -9.1310, 'historical_landmark'),
        ('g-hidden', 'Igreja Escondida', 38.7200, -9.1400, 'church'),
        ('g-cafe', 'Café Madalena', 38.71046, -9.13493, 'cafe'),
    ] + [(f'g-m{i}', name, 38.70 + i * 0.005, -9.20 + i * 0.005, 'museum') for i, name in enumerate(
        ('Museu do Oriente', 'Museu Nacional do Azulejo', 'Museu da Marioneta', 'Museu do Fado', 'Museu de Lisboa',
         'Museu Calouste Gulbenkian', 'Museu Bordalo Pinheiro', 'Museu da Música'))])
    d1.db.execute("INSERT INTO overture_poi_type VALUES ('g-street', 'historical_landmark')")
    d1.db.execute("INSERT INTO overture_candidate VALUES ('g-street', 'Lisboa')")
    d1.db.execute("INSERT INTO poi_source_correction VALUES ('overture', 'g-hidden', 0, NULL, 'x', '')")
    d1.db.executemany("INSERT INTO curated_poi VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)", [
        ('fsq:mad', 'community', 'Igreja de Madalena', 38.71039, -9.13490, 'church', 'foursquare_os_places', 'mad'),
        ('man:1', 'manual', 'Igreja da Madalena', 38.71040, -9.13491, 'church', None, None),
        ('osm:node/9', 'community', 'Torre de Belém', 38.69158, -9.21598, 'historical_landmark', 'openstreetmap', 'node/9'),
    ])
    d1.db.execute("INSERT INTO curated_poi_attribute VALUES ('fsq:mad', 'poi_type', 'church')")


class CleanupJobTest(unittest.TestCase):
    def setUp(self):
        self.d1, self.r2, self.tmp = FakeD1(), FakeR2(), tempfile.mkdtemp()
        seed(self.d1)

    def dry(self):
        worker = FakeWorker([LISBOA])
        job.run_batch('dry', self.d1, self.r2, worker, self.tmp)
        return worker.results['relation/1'], json.loads(self.r2.objects['reviews/kan-461/landmark-cleanup/dry/areas/relation/1.json'])

    def test_the_dry_run_decides_and_writes_nothing(self):
        result, decisions = self.dry()
        removed = {x['id']: x['why'] for x in decisions['remove']}
        self.assertIn('g-street', removed)                     # a street, not a place
        self.assertEqual(len([i for i in removed if i in ('fsq:mad', 'g-madalena')]), 1)  # one Madalena kept
        self.assertNotIn('man:1', removed)                     # a contributor's row is never removed
        self.assertNotIn('g-hidden', [r['id'] for r in json.loads(gzip.decompress(
            self.r2.objects['reviews/kan-461/landmark-cleanup/dry/context.json.gz']))['rows']])  # hidden is not served
        self.assertEqual(self.d1.select('SELECT COUNT(*) AS n FROM overture_poi')[0]['n'], 12)  # nothing deleted
        self.assertEqual(result['removed'], 0)

    def test_emit_replays_the_dry_run_markers_first(self):
        _, decisions = self.dry()
        worker = FakeWorker([LISBOA], mode='emit', source='dry')
        job.run_batch('emit-1', self.d1, self.r2, worker, self.tmp)
        gone = {x['id'] for x in decisions['remove']}
        left = {r['overture_id'] for r in self.d1.select('SELECT overture_id FROM overture_poi')} | \
               {r['poi_id'] for r in self.d1.select('SELECT poi_id FROM curated_poi')}
        self.assertFalse(gone & left)
        self.assertEqual(worker.results['relation/1']['removed'], len(gone))
        markers = {(r['source'], r['source_id']) for r in self.d1.select('SELECT source, source_id FROM poi_source_correction WHERE visible = 0')}
        self.assertIn(('overture', 'g-street'), markers)
        if 'fsq:mad' in gone:
            self.assertIn(('foursquare', 'mad'), markers)
        self.assertEqual(self.d1.select("SELECT COUNT(*) AS n FROM overture_poi_type WHERE overture_id = 'g-street'")[0]['n'], 0)
        # a second emit of the same decisions changes nothing
        again = FakeWorker([LISBOA], mode='emit', source='dry')
        job.run_batch('emit-2', self.d1, self.r2, again, self.tmp)
        self.assertEqual(again.results['relation/1']['removed'], 0)

    def test_an_area_that_would_lose_too_much_is_held(self):
        rows = [{'id': f'g{i}', 'source': 'overture', 'name': 'Rua X' if i else 'Torre', 'lat': 38.7, 'lng': -9.1,
                 'type': 'historical_landmark'} for i in range(4)]
        remove, held = job.decide_area(rows, job.li.load_terms())
        self.assertIsNotNone(held)

    def test_the_job_sends_its_version_and_stops_when_refused(self):
        worker = FakeWorker([LISBOA])
        job.run_batch('dry', self.d1, self.r2, worker, self.tmp)
        self.assertEqual(worker.job_version, job.JOB_VERSION)

        class Refusing(FakeWorker):
            def landmark_cleanup_claim(self, run_id, worker_id, batch_size, job_version):
                return {'locked': False, 'scopes': [], 'refused': 'container job version 1 is older than 3'}
        out = job.run_batch('dry', self.d1, self.r2, Refusing([LISBOA]), self.tmp)
        self.assertEqual(out['refused'], 'container job version 1 is older than 3')

    def test_a_row_is_judged_in_one_area_only(self):
        rows = [{'lat': 38.75, 'lng': -9.15}]
        job.assign_areas(rows, [{'area_key': 'b', 'seq': 2, 'min_lat': 38, 'max_lat': 39, 'min_lng': -10, 'max_lng': -9},
                                {'area_key': 'a', 'seq': 1, 'min_lat': 38, 'max_lat': 39, 'min_lng': -10, 'max_lng': -9}][::-1])
        self.assertEqual(rows[0]['area'], 'a')


class EmitFilterBackupRestoreTest(unittest.TestCase):
    def setUp(self):
        self.d1, self.r2, self.tmp = FakeD1(), FakeR2(), tempfile.mkdtemp()
        seed(self.d1)
        # a fuzzy duplicate next to an identical one
        self.d1.db.execute("INSERT INTO overture_poi VALUES ('g-twin', 'Torre de Belém', 38.69160, -9.21600, 'historical_landmark', NULL)")
        job.run_batch('dry', self.d1, self.r2, FakeWorker([LISBOA]), self.tmp)
        self.decisions = json.loads(self.r2.objects['reviews/kan-461/landmark-cleanup/dry/areas/relation/1.json'])

    def emit(self, run, emit_filter):
        worker = FakeWorker([LISBOA], mode='emit', source='dry', emit_filter=emit_filter)
        job.run_batch(run, self.d1, self.r2, worker, self.tmp)
        return worker.results['relation/1']

    def served(self):
        return {r['overture_id'] for r in self.d1.select('SELECT overture_id FROM overture_poi')} | \
               {r['poi_id'] for r in self.d1.select('SELECT poi_id FROM curated_poi')}

    def test_safe_emits_only_not_a_place_and_identical_names(self):
        fuzzy = [x['id'] for x in self.decisions['remove'] if not job.is_safe(x)]
        safe = [x['id'] for x in self.decisions['remove'] if job.is_safe(x)]
        self.assertTrue(fuzzy and safe, self.decisions['remove'])   # the fixture has both
        self.emit('e1', 'safe')
        left = self.served()
        self.assertFalse(set(safe) & left)
        self.assertTrue(set(fuzzy) <= left)

    def test_the_backup_is_in_r2_and_restore_puts_everything_back(self):
        before_rows = self.served()
        before_markers = self.d1.select('SELECT * FROM poi_source_correction ORDER BY source, source_id')
        self.emit('e2', 'all')
        self.assertNotEqual(self.served(), before_rows)
        backup = json.loads(self.r2.objects['reviews/kan-461/landmark-cleanup/e2/backup/relation/1.json'])
        for statement in job.restore_statements(backup):
            self.d1.db.execute(statement)
        self.assertEqual(self.served(), before_rows)
        self.assertEqual(self.d1.select('SELECT * FROM poi_source_correction ORDER BY source, source_id'), before_markers)
        self.assertEqual(self.d1.select("SELECT COUNT(*) AS n FROM overture_poi_type WHERE overture_id = 'g-street'")[0]['n'], 1)
        self.assertEqual(self.d1.select("SELECT COUNT(*) AS n FROM curated_poi_attribute WHERE poi_id = 'fsq:mad'")[0]['n'],
                         1 if 'fsq:mad' in before_rows else 0)

    def test_no_backup_no_delete(self):
        class BrokenR2(FakeR2):
            def upload_bytes(self, data, key, content_type='application/json'):
                if '/backup/' in key:
                    raise Exception('R2 outbound upload failed (500)')
                super().upload_bytes(data, key, content_type)
        broken = BrokenR2()
        broken.objects = self.r2.objects
        before = self.served()
        worker = FakeWorker([LISBOA], mode='emit', source='dry', emit_filter='all')
        job.run_batch('e3', self.d1, broken, worker, self.tmp)
        self.assertEqual(self.served(), before)
        self.assertIn('error', worker.results['relation/1'])


if __name__ == '__main__':
    unittest.main()
