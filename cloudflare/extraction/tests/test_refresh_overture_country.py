"""KAN-456 — an Overture refresh is an upsert on the GERS id: changed rows
brought up to date, dropped rows retired (never deleted), re-listed rows
un-retired, reviewed overrides carried across archive keys."""
import csv
import json
import os
import sqlite3
import sys
import tempfile
import unittest

EXTRACTION_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLOUDFLARE_DIR = os.path.dirname(EXTRACTION_DIR)
sys.path.insert(0, EXTRACTION_DIR)
sys.path.insert(0, os.path.join(EXTRACTION_DIR, 'tests'))

from _stubs import stub_missing_dependencies  # noqa: E402
stub_missing_dependencies()

import refresh_overture_country as refresh  # noqa: E402
import load_overture_candidates as loader  # noqa: E402
import promote_overture_candidates as promote  # noqa: E402
import analyse_poi_candidates  # noqa: E402

OLD_KEY = 'overture-country-sources/PT/old.csv'
NEW_KEY = 'overture-country-sources/PT/new.csv'
RELEASE = '2026-10-15.0'


def write_archive(path, rows):
    with open(path, 'w', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=('overture_id', 'name', 'name_local', 'name_en', 'name_local_lang', 'lat', 'lng', 'address', 'category', 'confidence'))
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, '') for field in writer.fieldnames})


def row(overture_id, name, lat=38.7, lng=-9.1, address='Rua A', category='pharmacy', confidence='0.9'):
    return {'overture_id': overture_id, 'name': name, 'lat': lat, 'lng': lng, 'address': address, 'category': category, 'confidence': confidence}


class DiffTest(unittest.TestCase):
    def test_the_four_sets(self):
        with tempfile.TemporaryDirectory() as tmp:
            old, new = os.path.join(tmp, 'old.csv'), os.path.join(tmp, 'new.csv')
            write_archive(old, [row('a', 'Farmácia A'), row('b', 'Loja B', category='shopping'), row('c', 'Café C'), row('d', 'Same D')])
            write_archive(new, [row('a', 'Farmácia A Nova'), row('b', 'Loja B', category='supermarket'), row('d', 'Same D'), row('e', 'New E')])
            sets = refresh.diff_archives(refresh.archive_rows(old), refresh.archive_rows(new))
        self.assertEqual(sets['new'], ['e'])
        self.assertEqual(sets['changed'], [('a', ('name',)), ('b', ('category',))])
        self.assertEqual(sets['retired'], ['c'])
        self.assertEqual(sets['unchanged'], ['d'])

    def test_a_row_the_loader_would_drop_is_not_compared(self):
        with tempfile.TemporaryDirectory() as tmp:
            old, new = os.path.join(tmp, 'old.csv'), os.path.join(tmp, 'new.csv')
            write_archive(old, [row('a', 'A')])
            write_archive(new, [row('a', 'A'), {'overture_id': 'x', 'name': '', 'lat': '1', 'lng': '2'}])
            sets = refresh.diff_archives(refresh.archive_rows(old), refresh.archive_rows(new))
        self.assertEqual((sets['new'], sets['unchanged']), ([], ['a']))

    def test_a_new_source_translation_refreshes_the_existing_place(self):
        with tempfile.TemporaryDirectory() as tmp:
            old, new = os.path.join(tmp, 'old.csv'), os.path.join(tmp, 'new.csv')
            write_archive(old, [row('a', 'Livraria')])
            write_archive(new, [{**row('a', 'Livraria'), 'name_local': 'Livraria',
                                 'name_en': 'Bookshop', 'name_local_lang': 'pt'}])
            sets = refresh.diff_archives(refresh.archive_rows(old), refresh.archive_rows(new))
        self.assertEqual(sets['changed'], [('a', ('name_local', 'name_en', 'name_local_lang'))])


class StatementBoundsTest(unittest.TestCase):
    def test_id_lists_never_exceed_150(self):
        ids = [f'id-{i}' for i in range(400)]
        statements = list(refresh.retire_statements(ids, RELEASE))
        self.assertEqual(len(statements), 3)
        self.assertTrue(all(s.count("'id-") <= 150 for s in statements))
        self.assertTrue(all('retired_in_release IS NULL' in s for s in statements))

    def test_served_refresh_is_bounded_and_matches_by_id(self):
        rows = [{'overture_id': f'id-{i}', 'name': f'Name {i}', 'lat': 38.0 + i / 1000, 'lng': -9.0, 'address': None, 'category': 'cafe', 'confidence': None} for i in range(1200)]
        statements = list(refresh.served_refresh_statements(rows, '2026-10-16'))
        self.assertEqual(len(statements), 3)
        self.assertTrue(all(len(s.encode()) <= refresh.MAX_STATEMENT_BYTES for s in statements))
        self.assertIn('WHERE overture_poi.overture_id = v.overture_id', statements[0])


class ApplyTest(unittest.TestCase):
    """The whole refresh over the committed schema in sqlite."""

    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.executescript(open(os.path.join(CLOUDFLARE_DIR, 'schema.sql')).read())
        self.executed = []
        self.saved_query = analyse_poi_candidates.query
        analyse_poi_candidates.query = self.select

    def tearDown(self):
        analyse_poi_candidates.query = self.saved_query

    def execute(self, sql):
        self.executed.append(sql)
        cursor = self.db.executescript(sql)
        self.db.commit()
        return {'changes': cursor.rowcount}

    def select(self, sql):
        cursor = self.db.execute(sql)
        names = [d[0] for d in cursor.description]
        return [dict(zip(names, r)) for r in cursor.fetchall()]

    def stage(self, path, key, refresh_mode):
        for statement in loader.batched(loader.value_tuple(r) for r in loader.candidate_rows(path, key)):
            self.execute((loader._with_refresh if refresh_mode else loader._with_country_source)(statement))

    def serve(self, overture_id, name, poi_type='pharmacy'):
        self.db.execute(
            "INSERT INTO overture_poi (overture_id, name, dedupe_name, lat, lng, geohash, primary_poi_type, imported_at, updated_at) "
            "VALUES (?, ?, ?, 38.7, -9.1, 'eyckq', ?, 'd', 'd')", (overture_id, name, name.lower(), poi_type))
        self.db.execute("UPDATE overture_candidate SET promotion_status = 'promoted' WHERE overture_id = ?", (overture_id,))
        self.db.commit()

    def test_upsert_retire_unretire_and_repending(self):
        with tempfile.TemporaryDirectory() as tmp:
            old, new = os.path.join(tmp, 'old.csv'), os.path.join(tmp, 'new.csv')
            write_archive(old, [row('a', 'Farmácia A'), row('b', 'Loja B', category='shopping'), row('c', 'Café C'), row('d', 'Same D')])
            self.stage(old, OLD_KEY, refresh_mode=False)
            for i, n in (('a', 'Farmácia A'), ('b', 'Loja B'), ('c', 'Café C'), ('d', 'Same D')):
                self.serve(i, n)
            # c was retired by an even earlier release and is back now.
            self.db.execute("UPDATE overture_poi SET retired_in_release = '2026-09-01.0' WHERE overture_id = 'c'")
            self.db.commit()
            write_archive(new, [row('a', 'Farmácia A Nova', lat=38.71), row('b', 'Loja B', category='supermarket'), row('c', 'Café C'), row('e', 'New E')])
            self.stage(new, NEW_KEY, refresh_mode=True)
            stats = refresh.apply(old, new, RELEASE, '2026-10-16', self.execute)

        self.assertEqual(stats, {'new_rows': 1, 'changed_rows': 2, 'category_changed_rows': 1, 'retired_rows': 1,
                                 'unretired_rows': 1, 'unchanged_rows': 1})
        cand = {r['overture_id']: r for r in self.select('SELECT * FROM overture_candidate')}
        # every seen row moved to the new key; the dropped row stayed on the old one
        self.assertEqual({i: c['country_source_r2_key'] for i, c in cand.items()},
                         {'a': NEW_KEY, 'b': NEW_KEY, 'c': NEW_KEY, 'd': OLD_KEY, 'e': NEW_KEY})
        self.assertEqual({i: c['last_seen_source_key'] for i, c in cand.items()},
                         {'a': NEW_KEY, 'b': NEW_KEY, 'c': NEW_KEY, 'd': OLD_KEY, 'e': NEW_KEY})
        # decisions: name change keeps it, category change re-asks, new is pending, dropped keeps its old decision
        self.assertEqual({i: c['promotion_status'] for i, c in cand.items()},
                         {'a': 'promoted', 'b': 'pending', 'c': 'promoted', 'd': 'promoted', 'e': 'pending'})
        self.assertIn('category changed', cand['b']['promotion_note'])
        served = {r['overture_id']: r for r in self.select('SELECT * FROM overture_poi')}
        # the served row followed the source; its type (the decision) did not move
        self.assertEqual((served['a']['name'], served['a']['lat'], served['a']['primary_poi_type']), ('Farmácia A Nova', 38.71, 'pharmacy'))
        self.assertEqual(served['a']['dedupe_name'], 'farmacia a nova')
        # dropped row retired, not deleted; re-listed row un-retired
        self.assertEqual(served['d']['retired_in_release'], RELEASE)
        self.assertIsNone(served['c']['retired_in_release'])
        self.assertEqual(len(served), 4)
        # no statement deletes anything
        self.assertFalse(any('DELETE' in s or 'DROP' in s for s in self.executed))

    def test_a_second_refresh_over_the_same_archives_changes_nothing(self):
        with tempfile.TemporaryDirectory() as tmp:
            old, new = os.path.join(tmp, 'old.csv'), os.path.join(tmp, 'new.csv')
            write_archive(old, [row('a', 'A'), row('c', 'C')])
            self.stage(old, OLD_KEY, refresh_mode=False)
            self.serve('a', 'A'); self.serve('c', 'C')
            write_archive(new, [row('a', 'A2')])
            self.stage(new, NEW_KEY, refresh_mode=True)
            refresh.apply(old, new, RELEASE, '2026-10-16', self.execute)
            before = self.select('SELECT * FROM overture_poi ORDER BY overture_id') + self.select('SELECT * FROM overture_candidate ORDER BY overture_id')
            self.stage(new, NEW_KEY, refresh_mode=True)
            refresh.apply(old, new, RELEASE, '2026-10-16', self.execute)
            after = self.select('SELECT * FROM overture_poi ORDER BY overture_id') + self.select('SELECT * FROM overture_candidate ORDER BY overture_id')
        self.assertEqual(before, after)


class LineageTest(unittest.TestCase):
    OVERRIDES = {
        'overture-country-sources/PT/old.csv': {
            'reviewed_sports': {'id-1': {'poi_type': 'store', 'store_kind': 'sports', 'reason': 'r'}},
            'kan444_exclusions': {'id-2': {'decision': 'rejected', 'reason': 'r'}},
        },
        'overture-country-sources/PT/mid.csv': {
            'reviewed_sports': {'id-1': {'poi_type': 'store', 'store_kind': 'bicycle', 'reason': 'later review'}},
        },
        'overture-country-sources/ES/es.csv': {
            'reviewed_sports': {'id-9': {'poi_type': 'store', 'store_kind': 'sports', 'reason': 'r'}},
        },
        'overture-place-sources/osm-relation-1/p.csv': {
            'reviewed_sports': {'id-8': {'poi_type': 'store', 'store_kind': 'sports', 'reason': 'r'}},
        },
    }

    def test_lineage_is_the_country_s_keys_oldest_first_then_self(self):
        self.assertEqual(promote.source_lineage(NEW_KEY, self.OVERRIDES),
                         ['overture-country-sources/PT/old.csv', 'overture-country-sources/PT/mid.csv', NEW_KEY])
        self.assertEqual(promote.source_lineage('overture-place-sources/osm-relation-2/q.csv', self.OVERRIDES),
                         ['overture-place-sources/osm-relation-2/q.csv'])

    def test_flat_overrides_and_batches_are_found_through_the_lineage(self):
        saved = promote.OVERRIDES_PATH
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, 'overrides.json')
            with open(path, 'w') as handle:
                json.dump(self.OVERRIDES, handle)
            promote.OVERRIDES_PATH = path
            try:
                flat = promote.source_overrides_flat(NEW_KEY)
                batch = promote.candidate_overrides(NEW_KEY, 'reviewed_sports')
                first_import = promote.source_overrides_flat('overture-country-sources/FR/first.csv')
            finally:
                promote.OVERRIDES_PATH = saved
        # the later key wins for the same id; another country's ids never leak
        self.assertEqual(flat, {'id-1': {'poi_type': 'store', 'store_kind': 'bicycle', 'reason': 'later review'},
                                'id-2': {'decision': 'rejected', 'reason': 'r'}})
        self.assertEqual(batch, {'id-1': {'poi_type': 'store', 'store_kind': 'bicycle', 'reason': 'later review'}})
        self.assertEqual(first_import, {})


if __name__ == '__main__':
    unittest.main()


class VerifyRefreshOverridesTest(unittest.TestCase):
    def test_verdicts(self):
        import verify_refresh_overrides as verify
        expected = {
            'kept-1': {'poi_type': 'store', 'store_kind': 'sports'},
            'kept-2': {'decision': 'rejected'},
            'retired-1': {'poi_type': 'store', 'store_kind': 'gift'},
            'lost-type': {'poi_type': 'supermarket'},
            'lost-kind': {'poi_type': 'store', 'store_kind': 'pet'},
            'lost-status': {'poi_type': 'bank'},
            'absent-1': {'poi_type': 'store'},
        }
        rows = {
            'kept-1': ('promoted', 'store', None, {'sports'}), 'kept-2': ('rejected', None, None, set()),
            'retired-1': ('promoted', 'store', '2026-10-15.0', {'gift'}), 'lost-type': ('promoted', 'store', None, set()),
            'lost-kind': ('promoted', 'store', None, {'toys'}), 'lost-status': ('pending', None, None, set()),
        }
        def d1_read(sql):
            if 'store_kind' in sql:
                return [{'overture_id': i, 'value': v} for i, (_, _, _, kinds) in rows.items() for v in kinds if f"'{i}'" in sql]
            return [{'overture_id': i, 'promotion_status': s, 'primary_poi_type': t, 'retired_in_release': r}
                    for i, (s, t, r, _) in rows.items() if f"'{i}'" in sql]
        verdicts = verify.compare(expected, verify.prod_state(expected, d1_read))
        self.assertEqual(verdicts, {
            'kept-1': 'kept', 'kept-2': 'kept', 'retired-1': 'retired',
            'lost-type': 'lost: expected supermarket, served as store',
            'lost-kind': 'lost: store_kind pet missing',
            'lost-status': 'lost: expected promoted, is pending',
            'absent-1': 'absent',
        })

    def test_reads_are_bounded(self):
        import verify_refresh_overrides as verify
        seen = []
        def d1_read(sql):
            seen.append(sql.count("'id-"))
            return []
        verify.prod_state([f'id-{i}' for i in range(400)], d1_read)
        self.assertTrue(all(n <= 150 for n in seen))
        self.assertEqual(len(seen), 6)
