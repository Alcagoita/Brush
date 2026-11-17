"""KAN-461. A rejected place never re-enters D1: the importers' own SQL, run on SQLite."""
import csv
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

import import_osm_archive as ia  # noqa: E402
import load_overture_candidates as loader  # noqa: E402

SCHEMA = """
CREATE TABLE poi_source_correction (
  source TEXT NOT NULL CHECK (source IN ('foursquare', 'openstreetmap', 'overture')),
  source_id TEXT NOT NULL, visible INTEGER NOT NULL, review_note TEXT NOT NULL,
  created_at TEXT, PRIMARY KEY (source, source_id));
CREATE TABLE curated_poi (
  poi_id TEXT PRIMARY KEY, source TEXT, name TEXT, dedupe_name TEXT, lat REAL, lng REAL, geohash TEXT,
  primary_poi_type TEXT, address TEXT, status TEXT, created_at TEXT, created_by TEXT, updated_at TEXT,
  updated_by TEXT, origin_source TEXT, origin_id TEXT, origin_licence TEXT, imported_at TEXT, import_run_id TEXT);
CREATE UNIQUE INDEX idx_curated_poi_origin ON curated_poi (origin_source, origin_id)
  WHERE origin_source IS NOT NULL AND origin_id IS NOT NULL;
CREATE TABLE curated_poi_attribute (poi_id TEXT, dimension TEXT, value TEXT, PRIMARY KEY (poi_id, dimension, value));
CREATE TABLE overture_candidate (
  overture_id TEXT PRIMARY KEY, name TEXT, name_local TEXT, name_local_lang TEXT, names_json TEXT, country_code TEXT,
  lat REAL, lng REAL, address TEXT, locality TEXT, category TEXT, basic_category TEXT, category_path TEXT,
  confidence REAL, source_datasets TEXT, promotion_status TEXT NOT NULL DEFAULT 'pending', promotion_note TEXT,
  imported_at TEXT, country_source_r2_key TEXT, last_seen_source_key TEXT);
"""


def db():
    con = sqlite3.connect(':memory:')
    con.executescript(SCHEMA)
    return con


def reject(con, source, source_id):
    con.execute("INSERT INTO poi_source_correction VALUES (?, ?, 0, 'test', '2026-11-17')", (source, source_id))


def osm(osm_id, name='Miradouro da Graça', extra=()):
    return {'osm_id': osm_id, 'name': name, 'dedupe_name': name.lower(), 'lat': 38.716, 'lng': -9.131,
            'type': 'viewpoint', 'extra': list(extra), 'address': ''}


class CuratedImportTest(unittest.TestCase):
    def write(self, con, rows):
        for s in ia.statements(rows, '2026-11-17T00:00:00Z', 'test-run'):
            con.execute(s)
        return sorted(r[0] for r in con.execute('SELECT origin_id FROM curated_poi'))

    def test_a_rejected_osm_element_is_not_written(self):
        con = db()
        reject(con, 'openstreetmap', 'node/2')
        self.assertEqual(self.write(con, [osm('node/1'), osm('node/2', 'Rua das Flores')]), ['node/1'])

    def test_a_refused_row_leaves_no_attribute_behind(self):
        con = db()
        reject(con, 'openstreetmap', 'node/2')
        self.write(con, [osm('node/1', extra=['park']), osm('node/2', extra=['park'])])
        self.assertEqual([r[0] for r in con.execute('SELECT poi_id FROM curated_poi_attribute')], ['osm:node/1'])

    def test_a_marker_for_another_source_does_not_block(self):
        con = db()
        reject(con, 'foursquare', 'node/1')  # same text, other namespace
        self.assertEqual(self.write(con, [osm('node/1')]), ['node/1'])

    def test_a_visible_correction_is_not_a_rejection(self):
        con = db()
        con.execute("INSERT INTO poi_source_correction VALUES ('openstreetmap', 'node/1', 1, 'renamed', '')")
        self.assertEqual(self.write(con, [osm('node/1')]), ['node/1'])

    def test_a_rerun_is_still_a_no_op(self):
        con = db()
        self.write(con, [osm('node/1')])
        self.assertEqual(self.write(con, [osm('node/1')]), ['node/1'])


FIELDS = ('overture_id', 'name', 'lat', 'lng', 'category')


class OvertureLoadTest(unittest.TestCase):
    def load(self, con, rows, refresh=False):
        with tempfile.NamedTemporaryFile('w', suffix='.csv', delete=False, newline='') as fh:
            w = csv.DictWriter(fh, fieldnames=FIELDS)
            w.writeheader()
            w.writerows(rows)
        try:
            attach = loader._with_refresh if refresh else loader._with_country_source
            for s in loader.batched(loader.value_tuple(r) for r in loader.candidate_rows(fh.name, 'k')):
                con.execute(attach(s))
        finally:
            os.unlink(fh.name)
        return {r[0]: r[1] for r in con.execute('SELECT overture_id, category FROM overture_candidate')}

    def row(self, gers, category='cafe'):
        return {'overture_id': gers, 'name': 'Café ' + gers, 'lat': '38.7', 'lng': '-9.1', 'category': category}

    def test_a_rejected_gers_id_is_not_staged(self):
        con = db()
        reject(con, 'overture', 'g2')
        self.assertEqual(set(self.load(con, [self.row('g1'), self.row('g2')])), {'g1'})

    def test_a_rejected_gers_id_is_not_staged_on_refresh(self):
        con = db()
        reject(con, 'overture', 'g2')
        self.assertEqual(set(self.load(con, [self.row('g1'), self.row('g2')], refresh=True)), {'g1'})

    def test_a_new_row_in_a_category_we_do_not_serve_is_not_staged(self):
        con = db()
        self.assertEqual(set(self.load(con, [self.row('g1'), self.row('g2', 'hotel')])), {'g1'})

    def test_a_staged_row_moving_into_such_a_category_is_still_updated(self):
        con = db()
        self.load(con, [self.row('g1')])
        self.assertEqual(self.load(con, [self.row('g1', 'hotel')], refresh=True), {'g1': 'hotel'})


if __name__ == '__main__':
    unittest.main()
