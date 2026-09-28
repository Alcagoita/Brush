"""KAN-472 — finishing the failed PT refresh by hand: the remaining
candidates move to the run's archive key, the import row becomes true, and
`overture_poi.country_code` is filled from the candidate that decided the
row. Nothing else is written, and a second run writes nothing further."""
import os
import sqlite3
import sys
import unittest

EXTRACTION_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLOUDFLARE_DIR = os.path.dirname(EXTRACTION_DIR)
sys.path.insert(0, EXTRACTION_DIR)
sys.path.insert(0, os.path.join(EXTRACTION_DIR, 'tests'))

from _stubs import stub_missing_dependencies  # noqa: E402
stub_missing_dependencies()

import repair_pt_refresh as repair  # noqa: E402

OLD_KEY = 'overture-country-sources/PT/1ea48e22.csv'
NEW_KEY = 'overture-country-sources/PT/7ac6dab3.csv'
RUN_ID = '7ac6dab3-15fe-4992-aba9-a227daaed380'


class BucketTest(unittest.TestCase):
    def test_every_first_character_lands_in_exactly_one_bucket(self):
        predicates = list(repair.bucket_predicates())
        self.assertEqual(len(predicates), 17)  # 16 hex + everything else
        db = sqlite3.connect(':memory:')
        db.execute('CREATE TABLE t (overture_id TEXT)')
        ids = ['0abc', 'fabc', '9abc', 'zabc', 'Xabc', '-abc', 'é-abc']
        db.executemany('INSERT INTO t VALUES (?)', [(i,) for i in ids])
        seen = []
        for predicate in predicates:
            seen += [r[0] for r in db.execute(f'SELECT overture_id FROM t WHERE {predicate}')]
        self.assertEqual(sorted(seen), sorted(ids), 'a row matched no bucket or more than one')


class StatementTest(unittest.TestCase):
    def test_the_key_move_is_guarded_on_the_old_key(self):
        statements = list(repair.key_move_statements(OLD_KEY, NEW_KEY, 'PT'))
        self.assertEqual(len(statements), 17)
        for statement in statements:
            self.assertIn(f"country_source_r2_key = '{OLD_KEY}'", statement)  # the WHERE
            self.assertIn(f"last_seen_source_key = '{NEW_KEY}'", statement)
            self.assertIn("country_code = 'PT'", statement)
            self.assertNotIn('promotion_status', statement)

    def test_the_country_code_statement_reads_the_candidate_and_never_a_literal(self):
        statements = list(repair.country_code_statements())
        for statement in statements:
            self.assertIn('SELECT candidate.country_code FROM overture_candidate', statement)
            self.assertIn('overture_poi.country_code IS NULL', statement)
            for column in ('name =', 'name_local', 'name_en', 'names_json', 'lat', 'lng', 'primary_poi_type'):
                self.assertNotIn(f'{column} =', statement, f'{column} must not be written')

    def test_the_import_row_statement_is_pinned_to_the_run_and_its_archive(self):
        statement = repair.import_row_statement(
            'PT', RUN_ID, NEW_KEY,
            {'source_rows': 350415, 'staged_rows': 350415, 'promoted': 215994, 'rejected': 44110, 'pending': 90311},
            '2026-09-28T10:00:00.000Z')
        self.assertIn(f"active_run_id = '{RUN_ID}'", statement)
        self.assertIn(f"raw_extract_r2_key = '{NEW_KEY}'", statement)
        self.assertIn("status = 'mapped'", statement)
        self.assertIn('previous_source_r2_key = NULL', statement)
        self.assertIn('dropped_rows = 0', statement)
        self.assertIn('new_rows = 0, changed_rows = 0, retired_rows = 0', statement)


class ApplyTest(unittest.TestCase):
    """The whole repair over the committed schema in sqlite."""

    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        with open(os.path.join(CLOUDFLARE_DIR, 'schema.sql')) as handle:
            self.db.executescript(handle.read())
        self.db.execute(
            'INSERT INTO overture_country_import (country_code, status, active_run_id, raw_extract_r2_key, '
            'previous_source_r2_key, release, started_at, last_error, source_rows) '
            "VALUES ('PT', 'failed', ?, ?, ?, '2026-08-19.0', 's', 'Read timed out.', 4)",
            (RUN_ID, NEW_KEY, OLD_KEY))
        self.db.commit()

    def candidate(self, overture_id, key, status='promoted', country='PT'):
        self.db.execute(
            'INSERT INTO overture_candidate (overture_id, name, lat, lng, imported_at, promotion_status, '
            'country_source_r2_key, last_seen_source_key, country_code) VALUES (?, ?, 38.7, -9.1, \'i\', ?, ?, ?, ?)',
            (overture_id, f'Place {overture_id}', status, key,
             key if country else None, country))
        self.db.commit()

    def serve(self, overture_id, name='Jerónimos Monastery'):
        self.db.execute(
            'INSERT INTO overture_poi (overture_id, name, dedupe_name, lat, lng, geohash, primary_poi_type, '
            "imported_at, updated_at) VALUES (?, ?, ?, 38.7, -9.1, 'eyckq', 'church', 'd', 'd')",
            (overture_id, name, name.lower()))
        self.db.commit()

    def rows(self, sql):
        cursor = self.db.execute(sql)
        names = [d[0] for d in cursor.description]
        return [dict(zip(names, r)) for r in cursor.fetchall()]

    def run_repair(self):
        """Every statement main() would send, in the same order."""
        executed = 0
        for statement in list(repair.key_move_statements(OLD_KEY, NEW_KEY, 'PT')):
            self.db.executescript(statement)
            executed += 1
        counts = self.rows(
            "SELECT COUNT(*) AS staged_rows, SUM(promotion_status = 'promoted') AS promoted, "
            "SUM(promotion_status = 'rejected') AS rejected, SUM(promotion_status = 'pending') AS pending "
            'FROM overture_candidate')[0]
        counts['source_rows'] = 4
        self.db.executescript(repair.import_row_statement(
            'PT', RUN_ID, NEW_KEY, counts, '2026-09-28T10:00:00.000Z'))
        for statement in repair.country_code_statements():
            self.db.executescript(statement)
            executed += 1
        self.db.commit()
        return executed

    def test_the_repair_moves_the_keys_fills_the_country_and_leaves_names_alone(self):
        # two candidates already moved by the failed load, two left behind
        self.candidate('a1', NEW_KEY)
        self.candidate('b2', NEW_KEY, status='pending')
        self.candidate('c3', OLD_KEY, country=None)
        self.candidate('d4', OLD_KEY, status='rejected', country=None)
        for overture_id in ('a1', 'c3'):
            self.serve(overture_id)

        self.run_repair()

        candidates = {r['overture_id']: r for r in self.rows('SELECT * FROM overture_candidate')}
        self.assertEqual({c['country_source_r2_key'] for c in candidates.values()}, {NEW_KEY})
        self.assertEqual({c['last_seen_source_key'] for c in candidates.values()}, {NEW_KEY})
        self.assertEqual({c['country_code'] for c in candidates.values()}, {'PT'})
        # the decisions the failed run never touched are still the decisions
        self.assertEqual([candidates[i]['promotion_status'] for i in ('a1', 'b2', 'c3', 'd4')],
                         ['promoted', 'pending', 'promoted', 'rejected'])

        served = {r['overture_id']: r for r in self.rows('SELECT * FROM overture_poi')}
        self.assertEqual({s['country_code'] for s in served.values()}, {'PT'})
        self.assertEqual(served['a1']['name'], 'Jerónimos Monastery')
        for row in served.values():
            self.assertIsNone(row['name_local'])
            self.assertIsNone(row['name_en'])
            self.assertIsNone(row['names_json'])

        imports = self.rows('SELECT * FROM overture_country_import')[0]
        self.assertEqual(imports['status'], 'mapped')
        self.assertIsNone(imports['previous_source_r2_key'])
        self.assertIsNone(imports['last_error'])
        self.assertEqual(imports['raw_extract_r2_key'], NEW_KEY, 'KAN-471 reads this archive')
        self.assertEqual((imports['promoted_rows'], imports['rejected_rows'], imports['pending_rows']), (2, 1, 1))
        self.assertEqual((imports['new_rows'], imports['changed_rows'], imports['retired_rows']), (0, 0, 0))

    def test_a_second_run_writes_nothing_further(self):
        self.candidate('a1', NEW_KEY)
        self.candidate('c3', OLD_KEY, country=None)
        self.serve('a1')
        self.serve('c3')
        self.run_repair()
        before = self.rows('SELECT * FROM overture_poi ORDER BY overture_id') + \
            self.rows('SELECT * FROM overture_candidate ORDER BY overture_id')
        self.run_repair()
        after = self.rows('SELECT * FROM overture_poi ORDER BY overture_id') + \
            self.rows('SELECT * FROM overture_candidate ORDER BY overture_id')
        self.assertEqual(before, after)

    def test_a_served_row_whose_candidate_has_no_country_is_left_null(self):
        """Not every served row has to be in the archive; one that is not
        keeps NULL rather than being guessed at."""
        self.db.execute("UPDATE overture_country_import SET previous_source_r2_key = NULL")
        self.candidate('a1', NEW_KEY)
        self.db.execute("UPDATE overture_candidate SET country_code = NULL WHERE overture_id = 'a1'")
        self.serve('a1')
        self.serve('orphan')  # no candidate row at all
        self.db.commit()
        for statement in repair.country_code_statements():
            self.db.executescript(statement)
        served = {r['overture_id']: r['country_code'] for r in self.rows('SELECT * FROM overture_poi')}
        self.assertEqual(served, {'a1': None, 'orphan': None})

    def test_the_import_row_is_untouched_when_the_run_id_does_not_match(self):
        self.db.executescript(repair.import_row_statement(
            'PT', 'some-other-run', NEW_KEY,
            {'source_rows': 4, 'staged_rows': 4, 'promoted': 2, 'rejected': 1, 'pending': 1},
            '2026-09-28T10:00:00.000Z'))
        self.assertEqual(self.rows('SELECT status FROM overture_country_import')[0]['status'], 'failed')


if __name__ == '__main__':
    unittest.main()
