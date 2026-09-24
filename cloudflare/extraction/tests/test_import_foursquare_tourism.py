"""KAN-433. The importer maps Foursquare leaves to our types through the
owner's JSON table, dedupes by name AND distance (never distance alone),
writes idempotent curated_poi SQL, and refuses --emit without the 0042
assertion.

Fixtures are in-memory. The "fake D1" is sqlite3 loaded with the committed
schema.sql, which carries 0042's partial unique index — so the ON CONFLICT
shape and the re-run no-op are proved against the real DDL.
"""
import json
import os
import sqlite3
import sys
import unittest
from unittest import mock

EXTRACTION_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLOUDFLARE_DIR = os.path.dirname(EXTRACTION_DIR)
sys.path.insert(0, EXTRACTION_DIR)

import import_foursquare_tourism as importer  # noqa: E402
import preflight_foursquare_archive as preflight  # noqa: E402
from classify_and_load import encode_geohash, normalize_text  # noqa: E402

LAT, LNG = 38.6979, -9.2067
M = 1 / 111_195  # degrees of latitude per metre


def served(name, dlat_m=0.0, poi_type='historical_landmark', source='overture'):
    return {'source': source, 'id': f'{source}-{normalize_text(name).replace(" ", "-")}', 'name': name,
            'dedupe_name': normalize_text(name), 'lat': LAT + dlat_m * M, 'lng': LNG, 'type': poi_type}


def archive(name, dlat_m=0.0, fsq_id=None, leaves=('Church',), locality='Lisboa', coords=True, address='Praça do Império'):
    return {'fsq_place_id': fsq_id or 'fsq-' + normalize_text(name).replace(' ', '-'), 'name': name,
            'dedupe_name': normalize_text(name), 'lat': LAT + dlat_m * M if coords else None,
            'lng': LNG if coords else None, 'address': address, 'locality': locality,
            'label': f'Community and Government > Spiritual Center > {leaves[0]}', 'leaves': sorted(leaves)}


def paths(record, prefix='Community and Government > Spiritual Center'):
    return [(leaf, f'{prefix} > {leaf}') for leaf in record['leaves']]


class LeafMapTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.leaf_map = importer.LeafMap.load()

    def test_every_emitted_type_is_reachable(self):
        with mock.patch.dict(os.environ, {'BRUSH_TYPE_RELATION': 'sql'}):
            importer.check_types_reachable(self.leaf_map)  # raises otherwise

    def test_single_type_leaves(self):
        for leaf, expected in (('Castle', 'historical_landmark'), ('Church', 'church'), ('Mosque', 'mosque'),
                               ('Synagogue', 'synagogue'), ('Museum', 'museum'), ('Theater', 'theatre'),
                               ('Movie Theater', 'movie_theater'), ('Hiking Trail', 'hiking_area'),
                               ('Harbor or Marina', 'marina'), ('Night Club', 'night_club'), ('Botanical Garden', 'botanical_garden')):
            self.assertEqual(self.leaf_map.types_for(leaf, f'X > {leaf}'), [expected], leaf)

    def test_double_type_leaves_keep_the_owner_order(self):
        self.assertEqual(self.leaf_map.types_for('Monastery', 'X > Monastery'), ['historical_landmark', 'church'])
        self.assertEqual(self.leaf_map.types_for('Shrine', 'X > Shrine'), ['church', 'historical_landmark'])
        self.assertEqual(self.leaf_map.types_for('Temple', 'X > Temple'), ['church', 'historical_landmark'])

    def test_museum_and_stadium_suffixes(self):
        for leaf in ('Art Museum', 'History Museum', 'Science Museum', 'Erotic Museum'):
            self.assertEqual(self.leaf_map.types_for(leaf, f'Arts and Entertainment > Museum > {leaf}'), ['museum'], leaf)
        for leaf in ('Soccer Stadium', 'Tennis Stadium', 'Hockey Stadium', 'Stadium'):
            self.assertEqual(self.leaf_map.types_for(leaf, f'Arts and Entertainment > Stadium > {leaf}'), ['stadium'], leaf)

    def test_attraction_only_under_amusement_park(self):
        self.assertEqual(self.leaf_map.types_for('Attraction', 'Arts and Entertainment > Amusement Park > Attraction'), ['amusement_park'])
        self.assertIsNone(self.leaf_map.types_for('Attraction', 'Somewhere Else > Attraction'))

    def test_tier2_noise_parent_excluded_and_unmapped(self):
        self.assertEqual(self.leaf_map.classify_leaf('Scenic Lookout', 'Landmarks and Outdoors > Scenic Lookout'), ('tier2', None))
        self.assertEqual(self.leaf_map.classify_leaf('Structure', 'Landmarks and Outdoors > Structure'), ('noise', None))
        self.assertEqual(self.leaf_map.classify_leaf('Arts and Entertainment', 'Arts and Entertainment'), ('parent', None))
        self.assertEqual(self.leaf_map.classify_leaf('ATM', 'Business and Professional Services > ATM'), ('excluded', None))
        self.assertEqual(self.leaf_map.classify_leaf('Strip Club', 'Arts and Entertainment > Strip Club'), ('unmapped', None))
        # Neither Indie Theater nor Drive-in Theater is Theater.
        self.assertEqual(self.leaf_map.classify_leaf('Indie Theater', 'X > Indie Theater')[0], 'unmapped')
        self.assertEqual(self.leaf_map.classify_leaf('Drive-in Theater', 'X > Drive-in Theater')[0], 'unmapped')

    def test_row_with_several_leaves_gets_the_union(self):
        record = archive('Mosteiro dos Jerónimos', leaves=('Church', 'Monastery', 'Structure'))
        decision, types, kinds = importer.map_row_types(record, self.leaf_map, [
            ('Church', 'X > Church'), ('Monastery', 'X > Monastery'), ('Structure', 'X > Structure')])
        self.assertEqual(decision, 'import')
        # The map lists Monastery before Church, so the primary is historical_landmark
        # whatever order the row's paths come in; church appears once.
        self.assertEqual(types, ['historical_landmark', 'church'])
        self.assertEqual(kinds, {'Church': 'tier1', 'Monastery': 'tier1', 'Structure': 'noise'})

    def test_row_with_only_unmapped_or_noise_leaves_is_skipped_by_the_strongest_reason(self):
        record = archive('Praça do Comércio', leaves=('Plaza', 'Structure'))
        decision, types, _ = importer.map_row_types(record, self.leaf_map, [('Plaza', 'X > Plaza'), ('Structure', 'X > Structure')])
        self.assertEqual((decision, types), ('tier 2 leaf', []))
        record = archive('Bairro Alto', leaves=('Neighborhood',))
        self.assertEqual(importer.map_row_types(record, self.leaf_map, [('Neighborhood', 'X > Neighborhood')])[0], 'noise leaf')
        record = archive('Club X', leaves=('Strip Club',))
        self.assertEqual(importer.map_row_types(record, self.leaf_map, [('Strip Club', 'X > Strip Club')])[0], 'unmapped leaf')


class DedupeDecisionTest(unittest.TestCase):
    def decide(self, record, base):
        return importer.decide_against_served(record, preflight.grid_index(base))

    def test_same_name_within_radius_is_matched(self):
        decision, detail = self.decide(archive('Mosteiro dos Jerónimos', 20), [served('Mosteiro dos Jerónimos', 0, 'church')])
        self.assertEqual(decision, 'matched')
        self.assertIn('overture:overture-mosteiro-dos-jeronimos', detail)

    def test_source_supplied_alias_matches_before_translation(self):
        place = served('Jerónimos Monastery', 0, 'church')
        place['name_local'] = 'Mosteiro dos Jerónimos'
        decision, detail = self.decide(archive('Mosteiro dos Jerónimos', 20), [place])
        self.assertEqual(decision, 'matched')
        self.assertIn('source alias', detail)

    def test_match_is_type_blind_and_reaches_curated_and_multibanco(self):
        self.assertEqual(self.decide(archive('Capela de São Jorge', 5), [served('Capela de São Jorge', 0, 'restaurant')])[0], 'matched')
        self.assertEqual(self.decide(archive('Ponte Romana', 5), [served('Ponte Romana', 0, 'bridge', 'curated')])[0], 'matched')
        self.assertEqual(self.decide(archive('Multibanco Castelo', 5), [served('Multibanco Castelo', 0, 'atm', 'multibanco')])[0], 'matched')

    def test_different_name_at_the_same_point_is_imported(self):
        # A statue 2 m from a church, a fountain in a square: distance alone never removes.
        self.assertEqual(self.decide(archive('Estátua de Camões', 2), [served('Igreja de São Roque', 0, 'church')])[0], 'import')
        self.assertEqual(self.decide(archive('Fonte da Telha', 0), [served('Praça da República', 0, 'plaza')])[0], 'import')

    def test_same_name_75_to_400_m_away_is_suspect_and_skipped(self):
        decision, detail = self.decide(archive('Castelo de Guimarães', 200), [served('Castelo de Guimarães')])
        self.assertEqual(decision, 'suspect')
        self.assertIn('200 m', detail)

    def test_near_same_name_75_to_400_m_is_suspect_too(self):
        # Containment and reordered identity terms are the matcher's strong rungs.
        self.assertEqual(self.decide(archive('Miradouro do Pico dos Barcelos', 150), [served('Pico dos Barcelos', 0, 'mountain')])[0], 'suspect')
        self.assertEqual(self.decide(archive('Batalha Mosteiro', 150), [served('Mosteiro Batalha')])[0], 'suspect')

    def test_fuzzy_far_name_is_imported_and_flagged_for_curation(self):
        # 0.72 ≤ SequenceMatcher < 0.9: the same door at 75 m, a different place at 300 m.
        record = archive('Castelo de Guimarães', 300, locality='Oliveira do Castelo')
        self.assertEqual(self.decide(record, [served('Liceu de Guimarães', 0, 'school')])[0], 'import')
        self.assertIn('Liceu de Guimarães', record['fuzzy_far'])
        record = archive('Mosteiro dos Jerónimos', 258)
        self.assertEqual(self.decide(record, [served('Largo dos Jerónimos', 0, 'plaza')])[0], 'import')
        # Inside the radius the matcher's own verdict stands, fuzzy rung included.
        self.assertEqual(self.decide(archive('Lagar', 18), [served('Lagar restaurante', 0, 'restaurant')])[0], 'matched')

    def test_same_name_beyond_400_m_is_imported(self):
        self.assertEqual(self.decide(archive('Castelo de Guimarães', 600), [served('Castelo de Guimarães')])[0], 'import')

    def test_no_coordinates_and_empty_name(self):
        self.assertEqual(self.decide(archive('Sé', coords=False), [])[0], 'no coordinates')
        self.assertEqual(self.decide(archive('', fsq_id='x'), [])[0], 'empty name')

    def test_weak_names_are_reported_not_imported(self):
        self.assertEqual(self.decide(archive('Castelo'), []), ('weak name', 'type words only'))
        self.assertEqual(self.decide(archive('Sintra', locality='Sintra'), []), ('weak name', 'locality only'))
        # A type word plus the town is a real name.
        self.assertEqual(self.decide(archive('Castelo de Sintra', locality='Sintra'), [])[0], 'import')

    def test_in_batch_duplicate_keeps_the_lower_id_and_folds_types(self):
        a = archive('Mosteiro da Batalha', 0, 'fsq-a', ('Monastery',))
        b = archive('Mosteiro da Batalha', 30, 'fsq-b', ('Church',))
        c = archive('Mosteiro da Batalha', 300, 'fsq-c', ('Church',))  # 300 m: not a duplicate under the contract
        a['types'], b['types'], c['types'] = ['historical_landmark', 'church'], ['church'], ['church']
        kept, dropped = importer.dedupe_within_batch([a, b, c])
        self.assertEqual([r['fsq_place_id'] for r in kept], ['fsq-a', 'fsq-c'])
        self.assertEqual(dropped, [(b, 'fsq-a')])
        self.assertEqual(a['types'], ['historical_landmark', 'church'])
        self.assertEqual([(x, y) for x, y, _, _ in importer.batch_name_near_misses(kept)], [('fsq-a', 'fsq-c')])

    def test_in_batch_different_names_at_one_point_both_kept(self):
        # No shared identity token: "Santa Maria" in both names WOULD be a KAN-388 match at 0 m, and rightly so.
        a = archive('Igreja de São Roque', 0, 'fsq-a')
        b = archive('Estátua de Camões', 0, 'fsq-b')
        a['types'] = b['types'] = ['church']
        kept, dropped = importer.dedupe_within_batch([a, b])
        self.assertEqual(len(kept), 2)
        self.assertEqual(dropped, [])

    def test_alias_twins_list_served_landmarks_under_another_name_not_businesses(self):
        # Overture holds the monastery in English; the matcher cannot pair the names, the row imports, the list flags it.
        record = archive('Mosteiro dos Jerónimos', 12)
        record['types'] = ['historical_landmark', 'church']
        base = [served('Jerónimos Monastery', 0, 'church'), served('Pastéis de Belém', 5, 'bakery')]
        twins = importer.served_alias_twins([record], preflight.grid_index(base))
        self.assertEqual([(t[0]['fsq_place_id'], t[1]['name']) for t in twins], [('fsq-mosteiro-dos-jeronimos', 'Jerónimos Monastery')])
        self.assertIn('Jerónimos Monastery', record['alias_twin'])
        record = archive('Estátua de Camões', 3)
        record['types'] = ['historical_landmark']
        self.assertEqual(importer.served_alias_twins([record], preflight.grid_index([served('Café Camões', 0, 'cafe')])), [])

    def test_plan_honours_foursquare_corrections(self):
        leaf_map = importer.LeafMap.load()
        hidden = archive('Igreja Velha', 0, 'fsq-hidden')
        renamed = archive('Igreja Nova', 0, 'fsq-renamed')
        records = [hidden, renamed]
        by_id = {r['fsq_place_id']: paths(r) for r in records}
        corrections = {'fsq-hidden': {'visible': 0, 'name_override': None, 'review_note': 'closed'},
                       'fsq-renamed': {'visible': 1, 'name_override': 'Igreja Nova de Lisboa', 'review_note': None}}
        inserts, skips = importer.plan(records, by_id, leaf_map, preflight.grid_index([]), corrections)
        self.assertEqual([r['name'] for r in inserts], ['Igreja Nova de Lisboa'])
        self.assertEqual([(s[0]['fsq_place_id'], s[1]) for s in skips], [('fsq-hidden', 'hidden by poi_source_correction')])


class TranslatedMatchTest(unittest.TestCase):
    """Owner, 2026-09-19: landmark words mapped to English before the
    KAN-388 comparison, within 25 m, landmark rows only."""

    @classmethod
    def setUpClass(cls):
        cls.terms = importer.LandmarkTerms.load()
        cls.pt = cls.terms.table_for('PT')

    def decide(self, record, base, country='PT'):
        table = self.terms.table_for(country)
        return importer.decide_against_served(record, preflight.grid_index(base), (table, self.terms) if table else None)

    def landmark(self, name, dlat_m=0.0, leaves=('Monastery',), types=('historical_landmark', 'church')):
        record = archive(name, dlat_m, leaves=leaves)
        record['types'] = list(types)
        return record

    def test_tokens_translate_accent_insensitively_and_drop_function_words(self):
        self.assertEqual(self.terms.translate('mosteiro dos jeronimos', self.pt), 'jeronimos monastery')
        self.assertEqual(self.terms.translate('jeronimos monastery', self.pt), 'jeronimos monastery')
        self.assertEqual(self.terms.translate(normalize_text('Sé de Lisboa'), self.pt), 'cathedral lisboa')
        self.assertEqual(self.terms.translate('castle of the moors', self.pt), 'castle moors')
        # Unknown tokens stay as they are; English spelling variants fold.
        self.assertEqual(self.terms.translate('teatro nacional', self.pt), 'national theater')
        self.assertEqual(self.terms.translate('lisbon theatre', self.pt), 'lisbon theater')

    def test_reference_landmarks_match_within_25_m(self):
        self.assertEqual(self.decide(self.landmark('Mosteiro dos Jerónimos', 12), [served('Jerónimos Monastery', 0, 'church')])[0], 'matched (translated)')
        self.assertEqual(self.decide(self.landmark('Castelo de Guimarães', 20, ('Castle',), ('historical_landmark',)),
                                     [served('Guimarães Castle')])[0], 'matched (translated)')
        self.assertEqual(self.decide(self.landmark('Mosteiro da Batalha', 5), [served('Batalha Monastery')])[0], 'matched (translated)')
        decision, detail = self.decide(self.landmark('Capelas Imperfeitas do Mosteiro da Batalha', 5), [served('Capelas Imperfeitas')])
        # Already a KAN-388 match on the untranslated names: the translation step never runs first.
        self.assertEqual(decision, 'matched')

    def test_translation_does_not_widen_the_distance(self):
        self.assertEqual(self.decide(self.landmark('Mosteiro dos Jerónimos', 80), [served('Jerónimos Monastery', 0, 'church')])[0], 'import')
        self.assertEqual(self.decide(self.landmark('Mosteiro dos Jerónimos', 26), [served('Jerónimos Monastery', 0, 'church')])[0], 'import')
        # And the untranslated 75 m rule is untouched.
        self.assertEqual(self.decide(self.landmark('Mosteiro dos Jerónimos', 60), [served('Mosteiro dos Jerónimos', 0, 'church')])[0], 'matched')

    def test_a_statue_next_to_an_english_church_still_imports(self):
        record = self.landmark('Estátua de Camões', 3, ('Monument',), ('historical_landmark',))
        self.assertEqual(self.decide(record, [served('Jerónimos Monastery', 0, 'church')])[0], 'import')
        self.assertEqual(self.decide(self.landmark('Fonte da Telha', 0, ('Fountain',), ('historical_landmark',)),
                                     [served('Praça da República', 0, 'plaza')])[0], 'import')

    def test_non_landmark_rows_and_business_counterparts_are_never_translated(self):
        # The same translatable pair, as a night club: the step does not run for the row.
        club = self.landmark('Castelo de Sintra', 3, ('Night Club',), ('night_club',))
        grid = preflight.grid_index([served('Sintra Castle', 0, 'historical_landmark')])
        self.assertIsNone(importer.translated_counterpart(club, grid, self.pt, self.terms))
        self.assertNotEqual(self.decide(club, [served('Sintra Castle', 0, 'historical_landmark')])[0], 'matched (translated)')
        # A landmark row against a served business: not a translation candidate either.
        castle = self.landmark('Castelo de Sintra', 3, ('Castle',), ('historical_landmark',))
        self.assertEqual(self.decide(castle, [served('Sintra Castle', 0, 'restaurant')])[0], 'import')
        self.assertEqual(self.decide(castle, [served('Sintra Castle', 0, 'historical_landmark')])[0], 'matched (translated)')

    def test_a_second_country_table_works_and_an_unknown_country_is_a_no_op(self):
        terms = importer.LandmarkTerms({'countries': {'ES': 'es'}, 'en': {'theatre': 'theater'}, 'es': {'castillo': 'castle', 'de': 'de'}})
        table = terms.table_for('ES')
        self.assertEqual(terms.translate('castillo de bellver', table), 'bellver castle')
        record = self.landmark('Castillo de Bellver', 10, ('Castle',), ('historical_landmark',))
        grid = preflight.grid_index([served('Bellver Castle')])
        self.assertEqual(importer.decide_against_served(record, grid, (table, terms))[0], 'matched (translated)')
        self.assertIsNone(terms.table_for('FR'))
        self.assertEqual(importer.decide_against_served(record, grid, None)[0], 'import')


class MultibancoReadTest(unittest.TestCase):
    def test_reads_names_then_only_the_rows_a_candidate_could_match(self):
        calls = []

        def fake_read(sql):
            calls.append(sql)
            if 'GROUP BY' in sql:
                return [{'dedupe_name': 'multibanco'}, {'dedupe_name': 'caixa geral de depositos'}]
            return [{'source_id': 'mb-1', 'name': 'Multibanco', 'dedupe_name': 'multibanco', 'lat': LAT, 'lng': LNG, 'primary_poi_type': 'atm'}]

        rows, names = importer.served_multibanco_for([archive('Igreja de Santa Maria')], fake_read)
        self.assertEqual((rows, names), ([], 2))
        self.assertEqual(len(calls), 1)  # nothing could match, nothing fetched
        rows, _ = importer.served_multibanco_for([archive('Largo do Multibanco')], fake_read)
        self.assertEqual([r['id'] for r in rows], ['mb-1'])
        self.assertIn("IN ('multibanco')", calls[-1])


class SqlShapeTest(unittest.TestCase):
    """The fake D1: sqlite3 with the committed schema, index 0042 included."""

    @classmethod
    def setUpClass(cls):
        with open(os.path.join(CLOUDFLARE_DIR, 'schema.sql')) as handle:
            cls.schema = handle.read()

    def fresh_db(self):
        db = sqlite3.connect(':memory:')
        db.executescript(self.schema)
        return db

    def inserts(self):
        a = archive('Mosteiro dos Jerónimos', 0, 'fsq-a', ('Monastery',))
        b = archive("Igreja d'Ajuda", 500, 'fsq-b', ('Church',), address='')
        a['types'], b['types'] = ['historical_landmark', 'church'], ['church']
        return [a, b]

    def test_statements_are_idempotent_against_the_0042_index(self):
        db = self.fresh_db()
        stmts = importer.statements(self.inserts(), '2026-09-18T12:00:00Z', 'run-1')
        self.assertEqual(len(stmts), 2)
        self.assertTrue(stmts[0].startswith('INSERT INTO curated_poi ('))
        self.assertIn('ON CONFLICT (origin_source, origin_id) WHERE origin_source IS NOT NULL AND origin_id IS NOT NULL DO NOTHING', stmts[0])
        self.assertTrue(stmts[1].startswith('INSERT OR IGNORE INTO curated_poi_attribute'))
        for statement in stmts:
            db.execute(statement)
        first = db.total_changes
        for statement in importer.statements(self.inserts(), '2026-09-19T00:00:00Z', 'run-2'):
            db.execute(statement)
        self.assertEqual(db.total_changes, first, 'a re-run must insert nothing')
        rows = db.execute("SELECT poi_id, source, name, dedupe_name, geohash, primary_poi_type, address, status, created_by, "
                          "origin_source, origin_id, origin_licence, imported_at, import_run_id FROM curated_poi ORDER BY poi_id").fetchall()
        self.assertEqual(rows, [
            ('fsq:fsq-a', 'community', 'Mosteiro dos Jerónimos', 'mosteiro dos jeronimos', encode_geohash(LAT, LNG, 7), 'historical_landmark',
             'Praça do Império, Lisboa', 'active', 'kan-433', 'foursquare_os_places', 'fsq-a', 'Apache-2.0', '2026-09-18T12:00:00Z', 'run-1'),
            ('fsq:fsq-b', 'community', "Igreja d'Ajuda", 'igreja d ajuda', encode_geohash(LAT + 500 * M, LNG, 7), 'church',
             'Lisboa', 'active', 'kan-433', 'foursquare_os_places', 'fsq-b', 'Apache-2.0', '2026-09-18T12:00:00Z', 'run-1'),
        ])
        self.assertEqual(db.execute('SELECT poi_id, dimension, value FROM curated_poi_attribute').fetchall(),
                         [('fsq:fsq-a', 'poi_type', 'church')])
        self.assertEqual(db.execute('SELECT name_local, name_en, name_local_lang FROM curated_poi WHERE poi_id = ?',
                                    ('fsq:fsq-a',)).fetchone(), ('Mosteiro dos Jerónimos', None, 'pt'))

    def test_statements_stay_under_the_byte_cap(self):
        rows = []
        for index in range(3000):
            record = archive(f'Igreja Paroquial de Freguesia Número {index}', index, f'fsq-{index:05d}')
            record['types'] = ['church']
            rows.append(record)
        stmts = importer.statements(rows, '2026-09-18T12:00:00Z', 'run-1')
        self.assertGreater(len(stmts), 1)
        for statement in stmts:
            self.assertLessEqual(len(statement.encode('utf-8')), importer.MAX_STATEMENT_BYTES)
            self.assertLessEqual(statement.count('\n('), importer.MAX_VALUES_TERMS)
        db = self.fresh_db()
        for statement in stmts:
            db.execute(statement)
        self.assertEqual(db.execute('SELECT COUNT(*) FROM curated_poi').fetchone()[0], 3000)

    def test_emit_is_one_request_per_statement_and_sums_changes(self):
        sent = []
        total = importer.emit(['S1;', 'S2;'], '/nowhere', write=lambda statement, work_dir: sent.append(statement) or 1)
        self.assertEqual((sent, total), (['S1;', 'S2;'], 2))


class CliGuardTest(unittest.TestCase):
    def test_emit_refused_without_the_0042_flag(self):
        with mock.patch.object(importer, 'curated_provenance_missing', side_effect=AssertionError('must not read D1')):
            with self.assertRaises(SystemExit) as ctx:
                importer.main(['--run-id', 'r', '--report-out', '/nowhere/r.md', '--archive-csv', '/nowhere.csv',
                               '--overture-csv', '/nowhere.csv', '--emit'])
        self.assertIn('--i-have-applied-0042', str(ctx.exception))

    def test_emit_refused_when_the_live_table_lacks_provenance(self):
        with mock.patch.object(importer, 'curated_provenance_missing', return_value=['column origin_source']), \
                mock.patch.object(importer, 'd1_write', side_effect=AssertionError('must not write')):
            with self.assertRaises(SystemExit) as ctx:
                importer.main(['--run-id', 'r', '--report-out', '/nowhere/r.md', '--archive-csv', '/nowhere.csv',
                               '--overture-csv', '/nowhere.csv', '--emit', '--i-have-applied-0042'])
        self.assertIn('missing column origin_source', str(ctx.exception))
        self.assertIn('apply migration 0042', str(ctx.exception))

    @staticmethod
    def fake_d1(columns, indexes):
        def read(sql):
            if sql.startswith('PRAGMA table_info'):
                return [{'name': c} for c in columns]
            if 'sqlite_master' in sql:
                return [{'name': i} for i in indexes if i in sql]
            raise AssertionError(sql)
        return read

    def test_provenance_check_needs_the_columns_and_the_unique_index(self):
        full = self.fake_d1(importer.CURATED_COLUMNS, [importer.ORIGIN_INDEX, 'idx_curated_poi_geo'])
        self.assertEqual(importer.curated_provenance_missing(full), [])
        self.assertTrue(importer.curated_has_provenance(full))
        no_columns = self.fake_d1(['poi_id', 'name'], [importer.ORIGIN_INDEX])
        self.assertEqual(importer.curated_provenance_missing(no_columns)[:2], ['column origin_source', 'column origin_id'])
        # A half-applied 0042: columns there, index not. The ON CONFLICT target would have nothing to conflict on.
        half = self.fake_d1(importer.CURATED_COLUMNS, ['idx_curated_poi_geo'])
        self.assertEqual(importer.curated_provenance_missing(half), ['unique index idx_curated_poi_origin'])
        self.assertFalse(importer.curated_has_provenance(half))

    def test_emit_refused_on_a_half_applied_0042_before_any_write(self):
        sent = []
        with mock.patch.object(preflight, 'd1_read', self.fake_d1(importer.CURATED_COLUMNS, [])), \
                mock.patch.object(importer, 'd1_write', side_effect=lambda statement, work_dir: sent.append(statement)):
            with self.assertRaises(SystemExit) as ctx:
                importer.main(['--run-id', 'r', '--report-out', '/nowhere/r.md', '--archive-csv', '/nowhere.csv',
                               '--overture-csv', '/nowhere.csv', '--emit', '--i-have-applied-0042'])
        self.assertIn('unique index idx_curated_poi_origin', str(ctx.exception))
        self.assertEqual(sent, [])

    def test_emit_through_run_uses_the_patched_writer(self):
        """The writer is resolved at call time: a patched importer.d1_write
        is what run() sends the statements to (fake guard, fake base)."""
        import tempfile
        from collections import Counter

        def fake_read(sql):
            if sql.startswith('PRAGMA table_info'):
                return [{'name': c} for c in importer.CURATED_COLUMNS]
            if 'sqlite_master' in sql:
                return [{'name': importer.ORIGIN_INDEX}]
            return []  # curated rows, corrections, multibanco names

        sent = []
        with tempfile.TemporaryDirectory() as tmp:
            archive_csv = os.path.join(tmp, 'archive.csv')
            with open(archive_csv, 'w') as handle:
                handle.write('fsq_place_id,name,latitude,longitude,address,locality,category_ids,category_labels\n')
                handle.write(f'fsq-1,Igreja de Santa Maria,{LAT},{LNG},,Lisboa,x,Community and Government > Spiritual Center > Church\n')
            with mock.patch.dict(os.environ, {'BRUSH_TYPE_RELATION': 'sql'}), \
                    mock.patch.object(preflight, 'd1_read', fake_read), \
                    mock.patch.object(preflight, 'served_overture', return_value=([], Counter())), \
                    mock.patch.object(preflight, 'sha256_of', return_value='sha'), \
                    mock.patch.object(importer, 'd1_write', side_effect=lambda statement, work_dir: sent.append(statement) or 1):
                summary = importer.main(['--run-id', 'r', '--report-out', os.path.join(tmp, 'r.md'), '--archive-csv', archive_csv,
                                         '--overture-csv', '/nowhere.csv', '--work-dir', tmp, '--emit', '--i-have-applied-0042'])
        self.assertEqual(len(sent), 1)
        self.assertIn("'fsq:fsq-1'", sent[0])
        self.assertEqual((summary['would_insert'], summary['changes']), (1, 1))

    def test_tier_2_is_refused(self):
        with self.assertRaises(SystemExit) as ctx:
            importer.main(['--run-id', 'r', '--report-out', '/nowhere/r.md', '--archive-csv', '/nowhere.csv',
                           '--overture-csv', '/nowhere.csv', '--tier', '2'])
        self.assertIn('Tier 2', str(ctx.exception))


if __name__ == '__main__':
    unittest.main()


class WranglerJsonTest(unittest.TestCase):
    """2026-09-20: wrangler --json prints progress lines before the document
    for a file near the upload threshold; the first emit died at 1/48."""

    def test_skips_progress_preamble(self):
        stdout = '├ Checking if file needs uploading\n│\n[{"meta": {"changes": 3}}]\n'
        self.assertEqual(json.loads(importer.wrangler_json(stdout))[0]['meta']['changes'], 3)

    def test_plain_document_unchanged(self):
        self.assertEqual(importer.wrangler_json('[{"meta": {}}]'), '[{"meta": {}}]')

    def test_no_json_is_an_error(self):
        with self.assertRaises(ValueError):
            importer.wrangler_json('├ Checking\n')
