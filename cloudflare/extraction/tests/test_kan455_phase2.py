"""KAN-455 phase 2. The brand-leads-name fallback, the Casa hide selection,
the repromote pass over pending rows, and the helper's settle loop."""
import csv
import json
import os
import re
import sys
import tempfile
import types
import unittest
from unittest import mock

EXTRACTION_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, EXTRACTION_DIR)
sys.path.insert(0, os.path.join(EXTRACTION_DIR, 'tests'))
os.environ.setdefault('BRUSH_TYPE_RELATION', 'sql')

from _stubs import stub_missing_dependencies  # noqa: E402
stub_missing_dependencies()

import promote_overture_candidates as promote  # noqa: E402
import hide_casa_word_matches as casa  # noqa: E402
import promote_override_batches as helper  # noqa: E402
from test_chain_brands import Fixture  # noqa: E402

SOURCE_KEY = 'overture-country-sources/PT/test.csv'
THE_SEVEN = (
    'Cafetaria LIDL Sesimbra',
    'Papelaria/Tabacaria Intermarché De Palmela',
    'Papelaria Intermarché Alfena',
    'Snack Bar O Celeiro',
    'Restaurante "O Celeiro" / Loja da Ana',
    'Cafetaria "Tempo Caffé - Supermercado Auchan"',
    'Atlântico pizzaria S. FÉLIX',
)


class BrandLeadsNameFallbackTest(unittest.TestCase):
    def test_the_seven_are_not_overridden_to_a_supermarket_or_bank(self):
        for name in THE_SEVEN:
            for category in ('', 'shopping'):
                status, types, _, reason = Fixture.decide(name, category)
                self.assertNotIn(types[:1], (('supermarket',), ('bank',)), (name, category, reason))
                self.assertFalse((reason or '').startswith('brand:'), (name, category, reason))

    def test_a_brand_that_leads_the_name_still_becomes_what_it_is(self):
        for name, expected in (('Minipreço Carvoeiro', 'supermarket'), ('Lidl Sesimbra', 'supermarket'),
                               ('Banco Atlântico Europa Lisboa', 'bank'), ('ATLANTICO', 'bank'), ('Banco BiG Lisboa', 'bank')):
            for category in ('', 'shopping'):
                status, types, _, reason = Fixture.decide(name, category)
                self.assertEqual((status, types[:1], reason), ('promoted', (expected,), f'brand: {expected}'), name)

    def test_a_generic_word_brand_is_the_whole_name_or_nothing(self):
        # `Atlântico` is the ocean and `Big` is the adjective; the bank's
        # `Banco …` aliases are not words and still match.
        for name in ('Big China', 'Big Foot', 'Atlântico pizzaria S. FÉLIX'):
            self.assertIsNone(promote.fallback_brand(name, 'bank', Fixture.brands), name)
        self.assertEqual(promote.fallback_brand('ATLANTICO', 'bank', Fixture.brands), 'ATLANTICO')
        self.assertEqual(promote.fallback_brand('Big', 'bank', Fixture.brands), 'Banco BiG')

    def test_the_fallback_needs_the_brand_to_lead_the_name(self):
        # Not the venue rule: `Washy Continente`, `Centro Comercial
        # Continente`, `Loja CTT` carry no venue word and are not the chain.
        for name in ('Cafetaria LIDL Sesimbra', 'Papelaria Intermarché', 'Washy Continente Modelo Belas',
                     'Centro Comercial Continente de Leiria', 'Supermercado Lidl'):
            self.assertIsNone(promote.fallback_brand(name, 'supermarket', Fixture.brands), name)
        self.assertIsNone(promote.fallback_brand('Loja CTT', 'bank', Fixture.brands))
        self.assertEqual(promote.fallback_brand('Lidl Sesimbra', 'supermarket', Fixture.brands), 'Lidl')


class CasaSelectionTest(unittest.TestCase):
    def archive(self, rows):
        handle = tempfile.NamedTemporaryFile('w', suffix='.csv', delete=False, newline='')
        writer = csv.DictWriter(handle, fieldnames=(
            'overture_id', 'name', 'lat', 'lng', 'address', 'locality', 'category',
            'basic_category', 'category_path', 'confidence', 'source_datasets'))
        writer.writeheader()
        for overture_id, name, category in rows:
            writer.writerow({'overture_id': overture_id, 'name': name, 'lat': 38.7, 'lng': -9.1,
                             'category': category, 'confidence': 0.9})
        handle.close()
        self.addCleanup(os.unlink, handle.name)
        return handle.name

    def test_a_generic_shopping_casa_row_is_selected_and_a_home_goods_one_is_not(self):
        path = self.archive([
            ('dores', 'Casa das Dores', 'shopping'),
            ('povo', 'Casa do Povo', ''),
            ('sopa', 'A Casa da Sopa', 'shopping'),
            ('loicas', 'Casa Das Loiças Do Arco Lda.', 'home_goods_store'),
            ('rum', 'Casa do Rum', 'liquor_store'),
            ('colombo', 'Casa Colombo', 'shopping'),
            ('other', 'Charcutaria Central', 'shopping'),
        ])
        with mock.patch.object(casa, 'reviewed_overrides', return_value={}):
            selected = casa.pending_word_rows(path, SOURCE_KEY)
        self.assertEqual(set(selected), {'dores', 'povo', 'sopa', 'colombo'})
        self.assertEqual(selected['dores'], 'Casa das Dores')

    def test_only_rows_prod_serves_as_store_home_are_hidden(self):
        reads = []

        def fake_query(sql):
            reads.append(sql)
            return [
                {'overture_id': 'dores', 'name': 'Casa das Dores', 'primary_poi_type': 'store', 'kinds': 'home'},
                {'overture_id': 'povo', 'name': 'Casa do Povo', 'primary_poi_type': 'store', 'kinds': 'home,gift'},
                {'overture_id': 'sopa', 'name': 'A Casa da Sopa', 'primary_poi_type': 'restaurant', 'kinds': None},
            ]
        with mock.patch.object(casa, 'query', fake_query):
            served = casa.served_as_home(['dores', 'povo', 'sopa', 'absent'])
        self.assertEqual(served, {'dores': 'Casa das Dores'})
        self.assertEqual(len(reads), 1)
        self.assertIn("IN ('dores','povo','sopa','absent')", reads[0])

    def test_reads_are_bounded_to_150_ids(self):
        reads = []
        with mock.patch.object(casa, 'query', lambda sql: reads.append(sql) or []):
            casa.served_as_home([f'id{i}' for i in range(301)])
        self.assertEqual(len(reads), 3)
        self.assertEqual(max(len(re.findall(r"'id\d+'", sql)) for sql in reads), 150)

    def test_the_migration_hides_by_exact_id_and_deletes_nothing(self):
        sql = ''.join(casa.statements([f'id{i}' for i in range(151)], created_at='2026-09-18'))
        self.assertEqual(sql.count('INSERT OR IGNORE INTO poi_source_correction'), 2)
        self.assertIn("('overture','id0',0,", sql)
        self.assertNotIn('DELETE', sql.upper())
        self.assertNotIn('UPDATE', sql.upper())
        self.assertEqual(len(re.findall(r"\('overture','id\d+',0,", sql)), 151)


class FakeCandidateD1:
    """A candidate table that answers paged() and applies the status update."""

    def __init__(self, rows):
        self.rows = {row['overture_id']: dict(row, promotion_status='pending') for row in rows}
        self.executed = []

    def select(self, sql):
        last = re.search(r"overture_id > '([^']*)'", sql).group(1)
        key = re.search(r"country_source_r2_key = '([^']*)'", sql).group(1)
        limit = int(re.search(r'LIMIT (\d+)', sql).group(1))
        matching = sorted(
            (row for row in self.rows.values()
             if row['overture_id'] > last and row['promotion_status'] == 'pending' and row['source'] == key),
            key=lambda row: row['overture_id'])
        return [dict(row) for row in matching[:limit]]

    def execute(self, sql):
        self.executed.append(sql)
        if sql.startswith('UPDATE overture_candidate SET'):
            status = re.search(r"promotion_status = '(\w+)'", sql).group(1)
            self.assertion = "promotion_status = 'pending' AND" in sql
            for overture_id in re.findall(r"'([^']+)'", sql.split('WHERE')[1]):
                if overture_id in self.rows and self.rows[overture_id]['promotion_status'] == 'pending':
                    self.rows[overture_id]['promotion_status'] = status
        return {'changes': 1}


def candidate(overture_id, name, category, source=SOURCE_KEY):
    return {'overture_id': overture_id, 'name': name, 'lat': 38.7, 'lng': -9.1, 'address': None,
            'category': category, 'category_path': None, 'confidence': 0.9, 'source_datasets': None,
            'source': source}


class RepromoteTest(unittest.TestCase):
    def run_repromote(self, d1, batch=2, overrides=None):
        with mock.patch.dict(os.environ, {'D1_INTERNAL': '1'}), \
                mock.patch.dict(sys.modules, {'d1_client': d1}), \
                mock.patch.object(promote, 'source_overrides_flat', return_value=overrides or {}):
            return promote.run_country_repromote(batch, SOURCE_KEY)

    def test_pages_over_pending_rows_and_decides_them_under_the_current_rules(self):
        d1 = FakeCandidateD1([
            candidate('a', 'Minipreço Carvoeiro', 'shopping'),      # rule 6: supermarket
            candidate('b', 'Charcutaria Central', 'shopping'),      # still pending
            candidate('c', 'Hotel Casa Velha', 'hotel'),            # rejected category
            candidate('d', 'Decathlon Albufeira', 'school'),        # chain overrides school
            candidate('e', 'Lídia Rodrigues', ''),                  # still pending
            candidate('f', 'Minipreço Faro', 'shopping', source='overture-country-sources/PT/other.csv'),
        ])
        stats = self.run_repromote(d1, batch=2)
        self.assertEqual(stats, {'promoted': 2, 'rejected': 1, 'pending': 2})
        self.assertEqual({i: r['promotion_status'] for i, r in d1.rows.items()},
                         {'a': 'promoted', 'b': 'pending', 'c': 'rejected', 'd': 'promoted', 'e': 'pending', 'f': 'pending'})
        inserts = [sql for sql in d1.executed if sql.startswith('INSERT OR IGNORE INTO overture_poi ')]
        self.assertTrue(all('INSERT OR IGNORE' in sql for sql in d1.executed if sql.startswith('INSERT')))
        self.assertIn("'a'", ''.join(inserts))
        self.assertIn("'d'", ''.join(inserts))
        self.assertNotIn("'f'", ''.join(d1.executed))
        # Every status write is guarded on `pending`: a decided row is never re-decided.
        for sql in d1.executed:
            if sql.startswith('UPDATE overture_candidate'):
                self.assertIn("WHERE promotion_status = 'pending' AND", sql)

    def test_a_second_run_over_the_same_source_decides_nothing(self):
        d1 = FakeCandidateD1([
            candidate('a', 'Minipreço Carvoeiro', 'shopping'),
            candidate('b', 'Charcutaria Central', 'shopping'),
        ])
        self.run_repromote(d1)
        first = list(d1.executed)
        stats = self.run_repromote(d1)
        self.assertEqual(stats, {'promoted': 0, 'rejected': 0, 'pending': 1})
        self.assertEqual(d1.executed, first)  # no new write of any kind
        self.assertEqual(d1.rows['a']['promotion_status'], 'promoted')
        self.assertEqual(d1.rows['b']['promotion_status'], 'pending')

    def test_committed_overrides_are_joined(self):
        d1 = FakeCandidateD1([candidate('r', 'Loja Sem Nome Útil', 'shopping')])
        overrides = {'r': {'poi_type': 'store', 'store_kind': 'gift', 'reason': 'reviewed'}}
        stats = self.run_repromote(d1, overrides=overrides)
        self.assertEqual(stats['promoted'], 1)
        self.assertIn("('r','store_kind','gift')", ''.join(d1.executed))

    def test_dry_run_reads_the_archive_and_the_backlog_and_nothing_else(self):
        archive = tempfile.NamedTemporaryFile('w', suffix='.csv', delete=False, newline='')
        writer = csv.DictWriter(archive, fieldnames=(
            'overture_id', 'name', 'lat', 'lng', 'address', 'locality', 'category',
            'basic_category', 'category_path', 'confidence', 'source_datasets'))
        writer.writeheader()
        for overture_id, name, category in (('a', 'Minipreço Carvoeiro', 'shopping'), ('b', 'Charcutaria Central', 'shopping'),
                                            ('c', 'Zara Chiado', 'clothing_store'), ('h', 'Hotel Sol', 'hotel')):
            writer.writerow({'overture_id': overture_id, 'name': name, 'lat': 38.7, 'lng': -9.1, 'category': category, 'confidence': 0.9})
        archive.close()
        backlog = tempfile.NamedTemporaryFile('w', suffix='.tsv', delete=False)
        backlog.write('status\treason\tcategory\tname\tlocality\toverture_id\n'
                      'pending\tno reachable type\tshopping\tMinipreço Carvoeiro\t\ta\n'
                      'pending\tno reachable type\tshopping\tCharcutaria Central\t\tb\n'
                      'rejected\trejected category: hotel\thotel\tHotel Sol\t\th\n')
        backlog.close()
        self.addCleanup(os.unlink, archive.name)
        self.addCleanup(os.unlink, backlog.name)
        with mock.patch.object(promote, 'source_overrides_flat', return_value={}), \
                mock.patch.object(promote, 'query', side_effect=AssertionError('D1 must not be read')):
            report = promote.repromote_dry_run(archive.name, backlog.name, SOURCE_KEY)
        self.assertEqual(report['pending_in_report'], 2)
        self.assertEqual(report['rule'], {'promoted': 1, 'rejected': 0})
        self.assertEqual(report['still_pending'], 1)
        self.assertEqual(report['rule_promoted_by_type'], {'supermarket': 1})
        self.assertEqual([d[0] for d in report['decided']['rule']['promoted']], ['a'])
        self.assertEqual(helper.expected_to_settle(report), ['a'])


class SettleLoopTest(unittest.TestCase):
    def test_waits_until_every_expected_id_has_left_pending(self):
        answers = iter([
            {'a': 'pending', 'b': 'promoted'},
            {'a': 'promoted', 'b': 'promoted'},
        ])
        reads, slept = [], []
        found = helper.wait_until_settled(
            'x', ['a', 'b'], deadline_seconds=100, poll_seconds=5,
            read=lambda ids: reads.append(list(ids)) or next(answers), sleep=slept.append, clock=lambda: 0)
        self.assertEqual(found, {'a': 'promoted', 'b': 'promoted'})
        self.assertEqual(len(reads), 2)
        self.assertEqual(slept, [5, 5])

    def test_stops_with_the_ids_still_pending_at_the_ceiling(self):
        ticks = iter([0, 50, 200, 200])
        with self.assertRaises(SystemExit) as stop:
            helper.wait_until_settled(
                'x', ['a', 'b'], deadline_seconds=100, poll_seconds=1,
                read=lambda ids: {'a': 'pending', 'b': 'rejected'}, sleep=lambda _s: None, clock=lambda: next(ticks))
        self.assertIn("['a']", str(stop.exception))


if __name__ == '__main__':
    unittest.main()


class VenueWordsTest(unittest.TestCase):
    """KAN-455 review: the file is validated at load time and phrases win
    over their words whatever order the file lists them in."""

    def load(self, entries):
        handle = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False)
        json.dump(entries, handle)
        handle.close()
        self.addCleanup(os.unlink, handle.name)
        return promote.load_venue_words(handle.name)

    def test_an_unknown_type_kind_or_category_fails_the_load(self):
        for bad in ({'x': {'poi_type': 'hotel'}}, {'x': {'store_kind': 'sunglasses'}},
                    {'x': {'category': 'no_such_category'}}, {'x': {'colour': 'red'}}, {'x': {}}):
            with self.assertRaises(ValueError, msg=bad):
                self.load(bad)

    def test_the_committed_file_loads_and_every_entry_is_known(self):
        words = promote.load_venue_words()
        self.assertIn('tasquinha', words)
        self.assertEqual(words['posto']['poi_type'], 'gas')
        self.assertEqual(promote.CATEGORY_NAME_WORDS['parking'][:1], ['parque de estacionamento'])

    def test_longest_phrase_is_matched_first_whatever_the_file_order(self):
        words = self.load({'bar': {'poi_type': 'bar'}, 'snack bar': {'poi_type': 'cafe'},
                           'parque': {'category': 'beach'}, 'parque infantil': {'poi_type': 'playground'}})
        self.assertEqual(list(words)[:2], ['parque infantil', 'snack bar'])
        with mock.patch.object(promote, 'VENUE_WORDS', words):
            # `snack bar` is read as one cafe word, so a cafe chain is not refused by `bar`.
            self.assertIsNone(promote.venue_contradiction('snack bar nespresso', 'nespresso', 'cafe'))
            self.assertEqual(promote.venue_contradiction('snack bar decathlon', 'decathlon', 'store', {'sports'}), 'snack bar')
            # `parque infantil` refuses; bare `parque` is a place word and does not.
            self.assertEqual(promote.venue_contradiction('parque infantil decathlon', 'decathlon', 'store', {'sports'}), 'parque infantil')
            self.assertIsNone(promote.venue_contradiction('decathlon parque das nacoes', 'decathlon', 'store', {'sports'}))


class MultiTypeOverrideTest(unittest.TestCase):
    """KAN-455: a reviewed override may carry a ranked list of types, and
    applies to either generic category."""

    def decide(self, name, category, override):
        row = {'overture_id': 'x', 'name': name, 'lat': 38.7, 'lng': -9.1, 'address': None,
               'category': category, 'category_path': None, 'confidence': 0.9, 'source_datasets': None}
        return promote.decide(row, Fixture.mapping, Fixture.reachable, Fixture.brands, Fixture.kinds,
                              Fixture.cuisines, Fixture.financial, Fixture.store_brands, {'x': override})

    def test_a_pharmacy_that_is_also_an_optician_carries_both_types(self):
        status, types, attributes, reason = self.decide(
            'Opticalia Farmacia Silveira', 'shopping',
            {'poi_type': ['pharmacy', 'store'], 'store_kind': 'eyewear_and_optician', 'reason': 'reviewed'})
        self.assertEqual((status, types, attributes), ('promoted', ('pharmacy', 'store'), (('store_kind', 'eyewear_and_optician'),)))

    def test_a_single_type_override_still_works_and_the_empty_category_is_generic(self):
        status, types, _, _ = self.decide('Zara by Castro', '', {'poi_type': 'bakery', 'reason': 'a pastelaria'})
        self.assertEqual((status, types), ('promoted', ('bakery',)))
        status, _, _, reason = self.decide('Auchan Gasolineira', '', {'decision': 'rejected', 'reason': 'gas station'})
        self.assertEqual((status, reason), ('rejected', 'gas station'))

    def test_invalid_lists_are_refused(self):
        for override in ({'poi_type': [], 'reason': 'r'},
                         {'poi_type': ['pharmacy', 'pharmacy'], 'reason': 'r'},
                         {'poi_type': ['pharmacy', 'store'], 'reason': 'r'},            # store without a kind
                         {'poi_type': ['pharmacy'], 'store_kind': 'books', 'reason': 'r'},  # kind without store
                         {'poi_type': ['no_such_type'], 'reason': 'r'}):
            with self.assertRaises(ValueError, msg=override):
                self.decide('x', 'shopping', override)
        with self.assertRaises(ValueError):
            self.decide('x', 'clothing_store', {'poi_type': 'bakery', 'reason': 'r'})  # a typed row is never overridden

    def test_the_committed_kan455_batch_is_promotable(self):
        batch = promote.candidate_overrides(
            'overture-country-sources/PT/1ea48e22-9b0d-47a2-beb7-29f5203bc204.csv', 'kan455_reviewed_multi_type')
        self.assertEqual(len(batch), 4)
        for poi_id, entry in batch.items():
            row = {'overture_id': poi_id, 'name': 'validation', 'lat': 0.0, 'lng': 0.0, 'address': None,
                   'category': 'shopping', 'category_path': None, 'confidence': 1.0, 'source_datasets': None}
            status, *_ = promote.decide(row, Fixture.mapping, Fixture.reachable, Fixture.brands, Fixture.kinds,
                                        Fixture.cuisines, Fixture.financial, Fixture.store_brands, {poi_id: entry})
            self.assertIn(status, ('promoted', 'rejected'), poi_id)
