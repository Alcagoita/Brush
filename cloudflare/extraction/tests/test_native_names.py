"""KAN-471 — find the places Overture names in English, and propose the
Portuguese name Wikidata records for them. Nothing here writes: the output is
a proposal a human accepts or rejects."""
import json
import os
import sys
import tempfile
import unittest

EXTRACTION_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLOUDFLARE_DIR = os.path.dirname(EXTRACTION_DIR)
sys.path.insert(0, EXTRACTION_DIR)
sys.path.insert(0, os.path.join(EXTRACTION_DIR, 'tests'))

from _stubs import stub_missing_dependencies  # noqa: E402
stub_missing_dependencies()

import detect_english_names as detect  # noqa: E402
import wikidata_native_names as wikidata  # noqa: E402

HEADER = 'overture_id,name,lat,lng,category\n'


def archive(tmp, rows):
    path = os.path.join(tmp, 'pt.csv')
    with open(path, 'w') as handle:
        handle.write(HEADER)
        for overture_id, name, lat, lng, category in rows:
            handle.write(f'{overture_id},"{name}",{lat},{lng},{category}\n')
    return path


class HeritageCategoryTest(unittest.TestCase):
    """The filter is derived from the committed category mapping, not written
    by hand: a hand-written list missed `religious_organization`, which is how
    Overture files Jerónimos Monastery."""

    def test_it_comes_from_the_committed_mapping(self):
        categories = detect.heritage_categories()
        self.assertIn('religious_organization', categories)
        self.assertIn('landmark_and_historical_building', categories)
        self.assertIn('beach', categories)

    def test_substring_lookalikes_are_not_in_it(self):
        categories = detect.heritage_categories()
        for category in ('parking', 'beer_garden', 'nursery_and_gardening',
                         'home_and_garden', 'rv_park', 'amusement_park'):
            self.assertNotIn(category, categories)

    def test_facilities_are_excluded_by_name_with_a_reason(self):
        """A skate park IS a park to a searcher, which is why the mapping says
        so; it still has no Portuguese name to record."""
        self.assertNotIn('skate_park', detect.heritage_categories())
        self.assertIn('skate_park', detect.FACILITY_CATEGORIES)


class EnglishNameTest(unittest.TestCase):
    def words(self, name):
        return detect.english_place_words(name)[0]

    def test_an_english_place_word_is_found(self):
        self.assertEqual(self.words('Jerónimos Monastery'), ['monastery'])
        self.assertEqual(self.words('Castle of the Moors'), ['castle'])

    def test_a_portuguese_name_is_not_a_candidate(self):
        for name in ('Mosteiro dos Jerónimos', 'Praia de Machico', 'Café Central'):
            self.assertEqual(self.words(name), [], name)

    def test_a_name_carrying_both_languages_is_left_alone(self):
        """`Igreja de São Miguel Church` already says it in Portuguese."""
        self.assertEqual(self.words('Igreja de São Miguel Church'), [])

    def test_a_word_inside_another_word_does_not_match(self):
        self.assertEqual(self.words('Parkour Lisboa'), [])
        self.assertEqual(self.words('Bridgestone Pneus'), [])

    def test_businesses_are_set_aside(self):
        for name in ('The Beach House', 'Burgau Beach Bar',
                     'Pestana Porto Santo Beach Resort & Spa', 'Car Hire Madeira Airport | SIXT'):
            self.assertTrue(detect.looks_like_a_business(name), name)
        self.assertFalse(detect.looks_like_a_business('Machico Beach'))

    def test_the_scan_keeps_heritage_and_drops_the_rest(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = archive(tmp, [
                ('a', 'Jerónimos Monastery', 38.6979, -9.2067, 'religious_organization'),
                ('b', 'Mosteiro da Batalha', 39.6594, -8.8256, 'landmark_and_historical_building'),
                ('c', 'The Beach House', 32.6, -16.9, 'beach'),
                ('d', 'Lisbon Park Hotel', 38.7, -9.1, 'hotel'),
                ('e', 'Skate Park do Porto', 41.1, -8.6, 'skate_park'),
            ])
            report = detect.candidates(path)
        self.assertEqual([row['overture_id'] for row in report['candidates']], ['a'])
        self.assertEqual([row['overture_id'] for row in report['businesses']], ['c'])


class MatchTest(unittest.TestCase):
    """The join rule, including the false pair that proved a loose one unsafe."""

    JERONIMOS = {'name': 'Jerónimos Monastery', 'lat': 38.6979, 'lng': -9.2067}

    def item(self, qid, en, pt, lat=38.6979, lng=-9.2067):
        return {'qid': qid, 'en': en, 'pt': pt, 'lat': lat, 'lng': lng}

    def test_an_exact_name_within_range_matches(self):
        item, why = wikidata.match(self.JERONIMOS, [self.item('Q272781', 'Jerónimos Monastery', 'Mosteiro dos Jerónimos')])
        self.assertEqual((item['qid'], item['pt']), ('Q272781', 'Mosteiro dos Jerónimos'))
        self.assertIsNone(why)

    def test_the_chapel_and_the_bakery_do_not_pair(self):
        """`Antiga Ermida de Nossa Senhora da Conceição` was paired to
        `Antiga Confeitaria`, a bakery 70 m away, by token overlap. Exact
        names refuse it."""
        candidate = {'name': 'Antiga Ermida de Nossa Senhora da Conceição', 'lat': 38.6979, 'lng': -9.2067}
        item, why = wikidata.match(candidate, [self.item('Q1', 'Antiga Confeitaria', 'Antiga Confeitaria',
                                                         38.69849, -9.2067)])
        self.assertIsNone(item)
        self.assertIn('exact name', why)

    def test_a_far_item_does_not_match(self):
        item, why = wikidata.match(
            self.JERONIMOS, [self.item('Q272781', 'Jerónimos Monastery', 'Mosteiro dos Jerónimos', lat=38.71)],
        )
        self.assertIsNone(item)
        self.assertIn('within', why)

    def test_two_items_of_the_same_name_go_to_a_human(self):
        items = [self.item('Q1', 'Jerónimos Monastery', 'Mosteiro dos Jerónimos'),
                 self.item('Q2', 'Jerónimos Monastery', 'Mosteiro Jerónimo')]
        item, why = wikidata.match(self.JERONIMOS, items)
        self.assertIsNone(item)
        self.assertIn('several items', why)

    def test_identical_labels_offer_nothing(self):
        item, why = wikidata.match(self.JERONIMOS, [self.item('Q1', 'Jerónimos Monastery', 'Jerónimos Monastery')])
        self.assertIsNone(item)
        self.assertIn('identically', why)

    def test_a_disambiguated_label_is_not_a_name(self):
        """`Praça da Liberdade (Porto)` — the suffix is Wikidata's, not the
        place's, and stripping it is a guess about a label we did not write."""
        candidate = {'name': 'Liberdade Square', 'lat': 41.1466, 'lng': -8.6110}
        item, why = wikidata.match(candidate, [self.item('Q1', 'Liberdade Square', 'Praça da Liberdade (Porto)',
                                                         41.1466, -8.6110)])
        self.assertIsNone(item)
        self.assertIn('disambiguator', why)

    def test_a_row_already_named_in_portuguese_is_not_rewritten(self):
        candidate = {'name': 'Mosteiro dos Jerónimos', 'lat': 38.6979, 'lng': -9.2067}
        item, why = wikidata.match(candidate, [self.item('Q272781', 'Jerónimos Monastery', 'Mosteiro dos Jerónimos')])
        self.assertIsNone(item)
        self.assertIn('already IS', why)


class ProposeTest(unittest.TestCase):
    def test_a_proposal_carries_its_provenance_and_the_rest_goes_to_review(self):
        candidates = [
            {'overture_id': 'a', 'name': 'Jerónimos Monastery', 'lat': 38.6979, 'lng': -9.2067, 'category': 'religious_organization'},
            {'overture_id': 'b', 'name': 'Unknown Chapel', 'lat': 38.6979, 'lng': -9.2067, 'category': 'church_cathedral'},
        ]
        items = [{'qid': 'Q272781', 'en': 'Jerónimos Monastery', 'pt': 'Mosteiro dos Jerónimos',
                  'lat': 38.6979, 'lng': -9.2067}]
        report = wikidata.propose(candidates, cache_dir='unused', fetch=lambda s, w, c: items, pause=0)
        self.assertEqual(len(report['proposals']), 1)
        proposal = report['proposals'][0]
        self.assertEqual(proposal['name_local'], 'Mosteiro dos Jerónimos')
        self.assertEqual(proposal['name_local_lang'], 'pt')
        self.assertEqual((proposal['source'], proposal['wikidata_qid']), ('wikidata', 'Q272781'))
        self.assertEqual(proposal['name'], 'Jerónimos Monastery', 'the default name is carried, never changed')
        self.assertEqual([row['overture_id'] for row in report['review']], ['b'])

    def test_one_request_per_cell_not_per_candidate(self):
        asked = []
        candidates = [{'overture_id': str(i), 'name': f'Church {i}', 'lat': 38.71 + i / 1000,
                       'lng': -9.14, 'category': 'church_cathedral'} for i in range(20)]
        wikidata.propose(candidates, cache_dir='unused',
                         fetch=lambda s, w, c: asked.append((s, w)) or [], pause=0)
        self.assertEqual(len(asked), 1, 'twenty candidates in one 0.5 degree cell is one request')


class TranslateTest(unittest.TestCase):
    """Stage 2b: a descriptor plus a proper noun IS translatable, and the
    owner's own examples are the specification."""

    LEARNED = {'porto santo': 'do', 'falesia': 'da', 'merendas': 'das',
               'mouros': 'dos', 'monte': 'do', 'faial': 'do'}
    VOCAB = {'porto', 'santo', 'machico', 'falesia', 'merendas', 'monte',
             'rocha', 'nossa', 'senhora', 'andre', 'faial', 'jorge'}

    def say(self, name):
        import translate_place_names as translate
        result = translate.translate(name, self.LEARNED, self.VOCAB)
        return None if result is None else (result['name_local'], result['confidence'])

    def test_the_owners_examples(self):
        self.assertEqual(self.say('Porto Santo Beach'), ('Praia do Porto Santo', 'high'))
        self.assertEqual(self.say('Church of our Lady of Monte'),
                         ('Igreja de Nossa Senhora do Monte', 'high'))
        self.assertEqual(self.say('Chapel Nossa Senhora da Rocha'),
                         ('Capela Nossa Senhora da Rocha', 'high'))

    def test_the_preposition_comes_from_the_archive_not_a_rule(self):
        """`Praia do Porto Santo` but `Praia de Machico`: the article belongs
        to the toponym, and 6,399 names in the archive say which."""
        self.assertEqual(self.say('Machico Beach')[0], 'Praia de Machico')
        self.assertEqual(self.say('Falésia Beach')[0], 'Praia da Falésia')
        self.assertEqual(self.say('Merendas Park')[0], 'Parque das Merendas')

    def test_a_leading_descriptor_on_a_portuguese_phrase_joins_directly(self):
        self.assertEqual(self.say('Chapel Nossa Senhora da Rocha')[0], 'Capela Nossa Senhora da Rocha')

    def test_a_trailing_descriptor_on_a_toponym_takes_a_preposition(self):
        """`Santo André Beach` is `Praia DE Santo André`, even though the
        remainder starts with `Santo`."""
        self.assertEqual(self.say('Santo André Beach')[0], 'Praia de Santo André')

    def test_the_remainder_is_sliced_from_the_correct_end(self):
        """Taking the last words for both shapes turned `Machico Beach` into
        `Praia de Beach`."""
        self.assertNotIn('Beach', self.say('Machico Beach')[0])

    def test_a_portuguese_common_noun_takes_its_own_article(self):
        self.assertEqual(self.say('Lighthouse of Praia da Barra')[0], 'Farol da Praia da Barra')

    def test_a_surviving_english_word_is_flagged_not_guessed(self):
        for name in ('All Saints Anglican Church', 'Castle of the Moors', 'Avenue Park'):
            self.assertEqual(self.say(name)[1], 'needs_review', name)

    def test_a_possessive_a_comma_and_an_unknown_saint_are_flagged(self):
        self.assertEqual(self.say('Funchal´s Botanical Garden')[1], 'needs_review')
        self.assertEqual(self.say('Church of the Son, Ponta do Sol, Madeira')[1], 'needs_review')
        self.assertEqual(self.say('St Eulalia Beach')[1], 'needs_review')

    def test_a_known_saint_is_rendered_in_portuguese(self):
        self.assertEqual(self.say('Ruins of St. George')[0], 'Ruínas de São Jorge')
        self.assertEqual(self.say('Church of Saint Anthony')[0], 'Igreja de Santo António')

    def test_a_name_with_no_descriptor_is_left_alone(self):
        self.assertIsNone(self.say('Aviva Portugal'))

    def test_the_vocabulary_is_learned_from_connector_bearing_names(self):
        """Built from every name, it fills with the English business names
        the archive also holds, and then vouches for the words it exists to
        catch."""
        import tempfile, os as _os
        import translate_place_names as translate
        with tempfile.TemporaryDirectory() as tmp:
            path = _os.path.join(tmp, 'a.csv')
            with open(path, 'w') as handle:
                handle.write('overture_id,name,lat,lng,category\n')
                for i in range(3):
                    handle.write(f'p{i},"Praia da Falésia",1,1,beach\n')
                    handle.write(f'h{i},"Atlantic Gardens Resort",1,1,hotel\n')
            vocabulary = translate.learn_vocabulary(path)
        self.assertIn('falesia', vocabulary)
        self.assertNotIn('atlantic', vocabulary)


class OwnerRulesTest(unittest.TestCase):
    """The rules the owner gave on 2026-09-28, as the specification.

    Rule: with more than one English word, neither of them is the name — both
    get translated."""

    LEARNED = {'monserrate': 'de', 'ria formosa': 'da', 'sintra': 'de'}

    def say(self, name):
        import translate_place_names as translate
        result = translate.translate(name, self.LEARNED)
        return None if result is None else result['name_local']

    def test_more_than_one_english_word_means_both_translate(self):
        self.assertEqual(self.say('Waterfall Lake'), 'Cascata do Lago')
        self.assertEqual(self.say('The Roman Bridge'), 'Ponte Romana')
        self.assertEqual(self.say('Park and Palace of Monserrate'), 'Parque e Palácio de Monserrate')

    def test_an_adjective_agrees_with_its_descriptor(self):
        """`Ponte` is feminine and `Parque` masculine, so the same English
        adjective lands differently."""
        self.assertEqual(self.say('Roman Bridge'), 'Ponte Romana')
        self.assertEqual(self.say('Urban Park'), 'Parque Urbano')

    def test_the_english_article_is_not_part_of_the_name(self):
        self.assertEqual(self.say('The Roman Bridge'), 'Ponte Romana')

    def test_the_set_phrases_the_owner_added(self):
        self.assertEqual(self.say('Ria Formosa National Park'), 'Parque Nacional da Ria Formosa')
        self.assertEqual(self.say('Sintra National Palace'), 'Palácio Nacional de Sintra')
        self.assertEqual(self.say('Pinus Urban Garden'), 'Jardim Urbano de Pinus')

    def test_a_castle_keep_is_a_torre_de_menagem(self):
        """`Tower of the Keep` was flagged on `keep` being an unknown word."""
        self.assertEqual(self.say('Tower of the Keep'), 'Torre de Menagem')

    def test_the_names_the_owner_confirmed_are_left_alone(self):
        for name in ('Yuppi kids park', 'UnderGround Park', 'Under The Bridge',
                     'Tempo de Adorar - Cosmopolitan Church', 'Sirius Park',
                     'Silver Coast Non Denominational English Church',
                     'Quinta do Mouricão Mobile Home Park', 'Pink Palace'):
            self.assertIsNone(self.say(name), name)

    def test_a_title_takes_no_preposition(self):
        self.assertEqual(self.say('Urban Park Dr. Mário Fonseca'), 'Parque Urbano Dr. Mário Fonseca')

    def test_the_withdrawn_rows_are_not_candidates(self):
        """Migration 0051 stops serving them, so they are not candidates for a
        name either."""
        import detect_english_names as detect
        self.assertIn('b941ff8a-5312-4179-961f-23fd035ce349', detect.WITHDRAWN)
        with tempfile.TemporaryDirectory() as tmp:
            path = archive(tmp, [
                ('b941ff8a-5312-4179-961f-23fd035ce349', 'Tagus Park!', 38.74, -9.30, 'park'),
                ('keeper', 'Machico Beach', 32.7, -16.7, 'beach'),
            ])
            report = detect.candidates(path)
        self.assertEqual([row['overture_id'] for row in report['candidates']], ['keeper'])


class SecondReviewTest(unittest.TestCase):
    """Owner's second pass, 2026-10-03."""

    LEARNED = {'rocha': 'da', 'tomar': 'de'}

    def say(self, name):
        import translate_place_names as translate
        result = translate.translate(name, self.LEARNED)
        return None if result is None else result['name_local']

    def test_the_names_confirmed_by_hand_win_over_every_rule(self):
        """`Castle of the Knights Templar, Tomar, Portugal` is `Castelo de
        Tomar`, which no rule produces — and it carries commas, which would
        otherwise flag it."""
        for english, portuguese in (
                ('Playa De Rocha Beach', 'Praia da Rocha'),
                ('Prainha Beach', 'Prainha'),
                ('San Jorge Castle', 'Castelo de São Jorge'),
                ('Castle of the Knights Templar, Tomar, Portugal', 'Castelo de Tomar'),
                ('Central Park', 'Parque Central'),
                ('Chapel of Bones', 'Capela dos Ossos'),
                ('Chapel of Bones of Faro', 'Capela dos Ossos de Faro'),
                ('Chapel of the Lord Jesus of the Navigators', 'Ermida do Senhor Jesus dos Navegantes'),
                ('Christopher Columbus Monument', 'Monumento de Cristovão Colombo'),
                ('Tesouro- Braga Cathedral Museum', 'Museu da Catedral de Braga'),
                ('Church of Christ Ministry Nova Terra', 'Igreja de Cristo Ministerio Nova Terra Portugal'),
                ('Church of Our Lady of the Glory', 'Igreja de Nossa Senhora da Glória')):
            self.assertEqual(self.say(english), portuguese, english)

    def test_church_of_translates_the_complete_name(self):
        """Owner's rule: with `Church of …` everything translates, not only
        the descriptor."""
        self.assertEqual(self.say('Church of the Sacred Heart'), 'Igreja do Sagrado Coração')
        self.assertEqual(self.say('Chapel of Our Lady of the Conception'),
                         'Capela de Nossa Senhora da Conceição')
        self.assertEqual(self.say('Church of the Ascension of Christ'), 'Igreja da Ascensão de Cristo')
        self.assertEqual(self.say('Church of the Assemblies of God'), 'Igreja das Assembleias de Deus')

    def test_the_second_batch_of_confirmed_names_is_left_alone(self):
        for name in ('Piscina Da Rita Park', 'Radical Park', 'Skate Park',
                     'Badoca Safari Park', 'Brinca + Fun Park', 'Caceira Bike Park',
                     'Christ The King Anglican Church', 'Vila Retail Park'):
            self.assertIsNone(self.say(name), name)

    def test_the_badoca_copies_are_withdrawn_and_the_real_one_is_not(self):
        import detect_english_names as detect
        for duplicate in ('0dbe7be0-473c-4566-b40b-1cfd87b2a1ba', '13db4597-bda0-4711-9b13-09b8ab55c4db',
                          'ce3d793b-1911-4f5a-8fcb-33ebaa4a6601', '1bd142b2-5a51-4a85-80c8-a4734e30ceba'):
            self.assertIn(duplicate, detect.WITHDRAWN)
        self.assertNotIn('0e2b3245-352f-43f4-a838-c552e52574d3', detect.WITHDRAWN,
                         'the zoo row at confidence 1.00 is the park')

    def test_every_override_key_is_already_folded(self):
        """A key that is not folded can never match, so the override would be
        silently dead."""
        import translate_place_names as translate
        for key in translate.load_overrides():
            self.assertEqual(key, translate.fold(key), key)


class ThirdReviewTest(unittest.TestCase):
    """Owner's third pass, 2026-10-03."""

    def test_the_names_confirmed_as_the_places_own_are_left_alone(self):
        import translate_place_names as translate
        for name in ('Tejo Fan Park', 'Tag Park', 'Portoland Park',
                     'Pestana Palms Beach', 'New life church'):
            self.assertIsNone(translate.translate(name, {}), name)

    def test_tejo_fan_park_is_not_translated_despite_the_earlier_example(self):
        """It was given as `Parque Urbano do Tejo` earlier in the same review
        and then reversed. The later instruction stands, and no override may
        contradict it."""
        import translate_place_names as translate
        self.assertIn(translate.fold('Tejo Fan Park'), translate.DO_NOT_TRANSLATE)
        self.assertNotIn(translate.fold('Tejo Fan Park'), translate.load_overrides())

    def test_ondix_beach_is_withdrawn_and_the_club_is_not(self):
        import detect_english_names as detect
        self.assertIn('b904499f-09b7-4a3c-adcf-1f007d5cb16e', detect.WITHDRAWN)
        self.assertNotIn('4c12ab69-92d0-471a-9de9-a11b3cdebdc4', detect.WITHDRAWN,
                         'ONDIX the dance club is a real place, just not a beach')


class WriteTest(unittest.TestCase):
    """Stage 3 writes `name_local` and its provenance, and nothing else."""

    def setUp(self):
        import sqlite3
        self.db = sqlite3.connect(':memory:')
        with open(os.path.join(os.path.dirname(EXTRACTION_DIR), 'schema.sql')) as handle:
            self.db.executescript(handle.read())

    def serve(self, overture_id, name):
        self.db.execute(
            'INSERT INTO overture_poi (overture_id, name, dedupe_name, lat, lng, geohash, '
            "primary_poi_type, imported_at, updated_at, country_code) "
            "VALUES (?, ?, ?, 38.7, -9.1, 'eyckq', 'church', 'd', 'd', 'PT')",
            (overture_id, name, name.lower()))
        self.db.commit()

    def row(self, overture_id):
        cursor = self.db.execute('SELECT * FROM overture_poi WHERE overture_id = ?', (overture_id,))
        names = [d[0] for d in cursor.description]
        return dict(zip(names, cursor.fetchone()))

    def files(self, tmp, wikidata, translated):
        import json as _json
        a, b = os.path.join(tmp, 'wd.json'), os.path.join(tmp, 'tr.json')
        with open(a, 'w') as handle:
            _json.dump({'proposals': wikidata}, handle)
        with open(b, 'w') as handle:
            _json.dump({'translated': translated, 'untouched': []}, handle)
        return a, b

    def test_it_writes_the_name_and_its_provenance_and_nothing_else(self):
        import write_native_names as writer
        self.serve('a', 'Jerónimos Monastery')
        before = self.row('a')
        with tempfile.TemporaryDirectory() as tmp:
            wd, tr = self.files(tmp, [{'overture_id': 'a', 'name': 'Jerónimos Monastery',
                                       'name_local': 'Mosteiro dos Jerónimos', 'name_local_lang': 'pt',
                                       'wikidata_qid': 'Q272781'}], [])
            rows = writer.proposals(wd, tr, skip=set())
            for statement in writer.statements(rows, '2026-10-03'):
                self.db.executescript(statement)
        after = self.row('a')
        self.assertEqual(after['name_local'], 'Mosteiro dos Jerónimos')
        self.assertEqual((after['name_local_lang'], after['name_local_source'],
                          after['name_local_source_ref'], after['name_local_updated_at']),
                         ('pt', 'wikidata', 'Q272781', '2026-10-03'))
        self.assertEqual(after['name'], 'Jerónimos Monastery', 'the source name is never written')
        for column, value in before.items():
            if not column.startswith('name_local'):
                self.assertEqual(after[column], value, f'{column} must not change')

    def test_an_owner_confirmed_name_outranks_a_looked_up_one(self):
        import write_native_names as writer
        with tempfile.TemporaryDirectory() as tmp:
            wd, tr = self.files(
                tmp,
                [{'overture_id': 'a', 'name': 'Central Park', 'name_local': 'Parque da Cidade',
                  'wikidata_qid': 'Q1'}],
                [{'overture_id': 'a', 'name': 'Central Park', 'name_local': 'Parque Central',
                  'confidence': 'high', 'rule': 'owner-confirmed'}])
            rows = writer.proposals(wd, tr, skip=set())
        self.assertEqual([(r['name_local'], r['source']) for r in rows], [('Parque Central', 'owner')])

    def test_a_flagged_proposal_is_not_written(self):
        import write_native_names as writer
        with tempfile.TemporaryDirectory() as tmp:
            wd, tr = self.files(tmp, [], [
                {'overture_id': 'a', 'name': 'Avenue Park', 'name_local': 'Parque de Avenue',
                 'confidence': 'needs_review', 'rule': 'park -> Parque'},
                {'overture_id': 'b', 'name': 'Machico Beach', 'name_local': 'Praia de Machico',
                 'confidence': 'high', 'rule': 'beach -> Praia'}])
            rows = writer.proposals(wd, tr, skip=set())
        self.assertEqual([r['overture_id'] for r in rows], ['b'])

    def test_a_withdrawn_row_is_skipped_even_with_a_proposal(self):
        import write_native_names as writer
        with tempfile.TemporaryDirectory() as tmp:
            wd, tr = self.files(tmp, [], [
                {'overture_id': 'b941ff8a-5312-4179-961f-23fd035ce349', 'name': 'Tagus Park!',
                 'name_local': 'Parque do Tejo', 'confidence': 'high', 'rule': 'park -> Parque'}])
            rows = writer.proposals(wd, tr)  # the real withdrawal lists
        self.assertEqual(rows, [])

    def test_a_row_that_already_has_a_native_name_is_left_alone(self):
        import write_native_names as writer
        self.serve('a', 'Jerónimos Monastery')
        self.db.execute("UPDATE overture_poi SET name_local = 'Mosteiro dos Jerónimos', "
                        "name_local_source = 'owner' WHERE overture_id = 'a'")
        self.db.commit()
        rows = [{'overture_id': 'a', 'name': 'Jerónimos Monastery', 'name_local': 'Something Else',
                 'name_local_lang': 'pt', 'source': 'translated', 'source_ref': 'x'}]
        for statement in writer.statements(rows, '2026-10-03'):
            self.db.executescript(statement)
        self.assertEqual(self.row('a')['name_local'], 'Mosteiro dos Jerónimos')
        self.assertEqual(self.row('a')['name_local_source'], 'owner')

    def test_statements_stay_within_the_d1_limits(self):
        import write_native_names as writer
        rows = [{'overture_id': f'id-{i}', 'name': 'x', 'name_local': 'Praia de Teste',
                 'name_local_lang': 'pt', 'source': 'translated', 'source_ref': 'beach -> Praia'}
                for i in range(1200)]
        planned = list(writer.statements(rows, '2026-10-03'))
        self.assertEqual(len(planned), 3)  # 500 + 500 + 200
        for statement in planned:
            self.assertLessEqual(len(statement.encode()), 80000)
            self.assertIn('name_local IS NULL', statement)


class RefreshKeepsReviewedNamesTest(unittest.TestCase):
    """KAN-471. A refresh refreshes SOURCE fields. A reviewed native name is
    not one: Overture supplies no language variants at all, so taking the
    archive's empty value would wipe every name the moment a refresh touched
    the row."""

    def setUp(self):
        import sqlite3
        self.db = sqlite3.connect(':memory:')
        with open(os.path.join(os.path.dirname(EXTRACTION_DIR), 'schema.sql')) as handle:
            self.db.executescript(handle.read())

    def serve(self, overture_id, name, local=None, source=None):
        self.db.execute(
            'INSERT INTO overture_poi (overture_id, name, dedupe_name, lat, lng, geohash, '
            "primary_poi_type, imported_at, updated_at, name_local, name_local_source) "
            "VALUES (?, ?, ?, 38.7, -9.1, 'eyckq', 'church', 'd', 'd', ?, ?)",
            (overture_id, name, name.lower(), local, source))
        self.db.commit()

    def refresh(self, rows):
        """The refresh's own served update, over the committed schema."""
        import refresh_overture_country as refresh
        for statement in refresh.served_refresh_statements(rows, '2026-11-01'):
            self.db.executescript(statement)
        self.db.commit()

    def row(self, overture_id):
        cursor = self.db.execute(
            'SELECT name, name_local, name_local_source FROM overture_poi WHERE overture_id = ?',
            (overture_id,))
        return cursor.fetchone()

    def source_row(self, overture_id, name):
        """What the archive carries: a name, and no language variants at all."""
        return {'overture_id': overture_id, 'name': name, 'lat': 38.71, 'lng': -9.11,
                'address': 'Rua B', 'category': 'church_cathedral', 'confidence': 0.9,
                'name_local': None, 'name_en': None, 'name_local_lang': None,
                'names_json': None, 'country_code': 'PT'}

    def test_a_reviewed_name_survives_a_refresh(self):
        self.serve('a', 'Jerónimos Monastery', 'Mosteiro dos Jerónimos', 'wikidata')
        self.refresh([self.source_row('a', 'Jerónimos Monastery (renamed upstream)')])
        name, local, source = self.row('a')
        self.assertEqual(local, 'Mosteiro dos Jerónimos', 'the reviewed name must not be wiped')
        self.assertEqual(source, 'wikidata')
        self.assertEqual(name, 'Jerónimos Monastery (renamed upstream)', 'the source name still refreshes')

    def test_a_row_with_no_recorded_source_still_takes_what_the_source_offers(self):
        """A future release that does start carrying variants is not locked
        out."""
        self.serve('b', 'Some Place')
        row = self.source_row('b', 'Some Place')
        row['name_local'] = 'Algum Lugar'
        self.refresh([row])
        self.assertEqual(self.row('b')[1], 'Algum Lugar')

    def test_an_empty_source_value_never_overwrites_anything(self):
        self.serve('c', 'Another Place', 'Outro Lugar', 'translated')
        self.refresh([self.source_row('c', 'Another Place')])
        self.assertEqual(self.row('c')[1], 'Outro Lugar')


class LocalityTailTest(unittest.TestCase):
    """A region tacked onto the end is where the place is, not part of its
    name. Without stripping it the descriptor sits neither first nor last and
    nothing matches, which is why 188 rows came back untouched."""

    LEARNED = {'porches': 'de', 'guincho': 'do', 'amoreira': 'da', 'amado': 'do',
               'estrela': 'da', 'sines': 'de'}
    # What `learn_localities` reads out of the archive's own locality column.
    LOCALITIES = {'cascais', 'aljezur', 'algarve', 'lisbon', 'ponta do sol'}

    def say(self, name):
        import translate_place_names as translate
        result = translate.translate(name, self.LEARNED, overrides={}, localities=self.LOCALITIES)
        return None if result is None else result['name_local']

    def test_a_comma_tail_is_dropped(self):
        self.assertEqual(self.say('Porches Beach, Algarve'), 'Praia de Porches')
        self.assertEqual(self.say('Guincho Beach, Cascais'), 'Praia do Guincho')
        self.assertEqual(self.say('Estrela Park, Lisbon'), 'Parque da Estrela')

    def test_several_comma_tails_are_dropped(self):
        self.assertEqual(self.say('Amoreira Beach, Aljezur, Algarve'), 'Praia da Amoreira')

    def test_a_bare_trailing_region_is_dropped(self):
        self.assertEqual(self.say('Sines beach Portugal'), 'Praia de Sines')

    def test_a_toponym_that_IS_a_region_keeps_it(self):
        """`Praia da Madeira` must not become `Praia`. A bare trailing word is
        dropped only from a name that still has two words left."""
        import translate_place_names as translate
        self.assertEqual(translate.strip_locality_tail('Praia da Madeira')[0], 'Praia da Madeira')
        self.assertEqual(translate.strip_locality_tail('Ilha da Madeira')[0], 'Ilha da Madeira')

    def test_the_dropped_locality_is_recorded_in_the_rule(self):
        """The reviewer has to be able to see that something was removed."""
        import translate_place_names as translate
        result = translate.translate('Porches Beach, Algarve', self.LEARNED, overrides={},
                                     localities=self.LOCALITIES)
        self.assertIn('dropped the locality', result['rule'])
        self.assertIn('Algarve', result['rule'])

    def test_a_trailing_phrase_that_is_not_a_locality_is_left_flagged(self):
        self.assertIsNone(self.say('Carcavelos Beach Stunning Views'))



class ReviewFixesTest(unittest.TestCase):
    """The review of the KAN-471 branch, 2026-10-03."""

    def test_a_comma_tail_is_dropped_only_when_it_is_a_real_locality(self):
        """Dropping it on sight shortened names whose tail was a description,
        and the shortened name came back `high` because the comma guard only
        ever saw the core."""
        import translate_place_names as translate
        localities = {'cascais', 'algarve'}
        self.assertEqual(translate.strip_locality_tail('Guincho Beach, Cascais', localities)[0],
                         'Guincho Beach')
        unverified = 'Carcavelos Beach, Stunning Views Over The Sea'
        self.assertEqual(translate.strip_locality_tail(unverified, localities)[0], unverified,
                         'an unverified tail must survive, so the comma guard still flags it')

    def test_every_segment_of_the_tail_has_to_be_a_locality(self):
        import translate_place_names as translate
        localities = {'aljezur', 'algarve'}
        self.assertEqual(translate.strip_locality_tail('Amoreira Beach, Aljezur, Algarve', localities)[0],
                         'Amoreira Beach')
        self.assertEqual(
            translate.strip_locality_tail('Amoreira Beach, Aljezur, open all summer', localities)[0],
            'Amoreira Beach, Aljezur, open all summer')

    def test_the_localities_come_from_the_archive(self):
        import translate_place_names as translate
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, 'a.csv')
            with open(path, 'w') as handle:
                handle.write('overture_id,name,lat,lng,category,locality\n')
                handle.write('a,"Praia X",1,1,beach,Cascais\n')
                handle.write('b,"Praia Y",1,1,beach,\n')
            self.assertEqual(translate.learn_localities(path), {'cascais'})

    def test_a_translated_file_cannot_be_produced_without_an_archive(self):
        """Without one there is no vocabulary to vouch for a word and no
        locality list to verify a tail, so everything would come back
        `high` — and that file feeds the writer."""
        import translate_place_names as translate
        with self.assertRaises(SystemExit):
            translate.main(['--review', 'unused.json', '--out', 'out.json'])

    def test_wikidata_looks_across_a_cell_boundary(self):
        """A cell is 0.5 degrees. A candidate metres from an edge had its
        match in the next cell and could never be found."""
        import wikidata_native_names as wikidata
        self.assertEqual(wikidata.cells_near(38.70, -9.20), {(38.5, -9.5)})
        self.assertEqual(wikidata.cells_near(38.9999, -9.20), {(38.5, -9.5), (39.0, -9.5)})
        self.assertEqual(len(wikidata.cells_near(39.0, -9.0)), 4, 'a corner touches four cells')

    def test_a_match_across_the_boundary_is_found(self):
        import wikidata_native_names as wikidata
        candidate = {'overture_id': 'a', 'name': 'Boundary Chapel', 'category': 'church_cathedral',
                     'lat': 38.99995, 'lng': -9.20}
        item = {'qid': 'Q9', 'en': 'Boundary Chapel', 'pt': 'Capela da Fronteira',
                'lat': 39.00005, 'lng': -9.20}
        # The item sits in the cell NORTH of the candidate's.
        def fetch(south, west, cache_dir):
            return [item] if (south, west) == (39.0, -9.5) else []
        report = wikidata.propose([candidate], cache_dir='unused', fetch=fetch, pause=0)
        self.assertEqual([row['name_local'] for row in report['proposals']], ['Capela da Fronteira'])

    def test_name_en_is_not_frozen_by_a_reviewed_name_local(self):
        """`name_local_source` records where name_LOCAL came from. Gating
        `name_en` on it froze the English variant of every reviewed row."""
        import refresh_overture_country as refresh
        self.assertIn("name_en = COALESCE(NULLIF(v.name_en, ''), overture_poi.name_en)",
                      refresh.SERVED_REFRESH_PREFIX)
        self.assertIn('name_local = CASE WHEN overture_poi.name_local_source IS NOT NULL',
                      refresh.SERVED_REFRESH_PREFIX)

    def test_the_write_requires_the_name_it_was_reviewed_against(self):
        """A refresh can rename a row between the review and the write."""
        import write_native_names as writer
        self.assertIn('overture_poi.name = v.reviewed_name', writer.UPDATE_SUFFIX)
        self.assertIn('overture_poi.name_local IS NULL', writer.UPDATE_SUFFIX)

    def test_a_derived_name_does_not_displace_a_looked_up_one(self):
        import write_native_names as writer
        with tempfile.TemporaryDirectory() as tmp:
            wikidata_path = os.path.join(tmp, 'wd.json')
            translated_path = os.path.join(tmp, 'tr.json')
            with open(wikidata_path, 'w') as handle:
                json.dump({'proposals': [{'overture_id': 'a', 'name': 'Lisbon Cathedral',
                                          'name_local': 'Sé de Lisboa', 'wikidata_qid': 'Q432290'}]}, handle)
            with open(translated_path, 'w') as handle:
                json.dump({'translated': [{'overture_id': 'a', 'name': 'Lisbon Cathedral',
                                           'name_local': 'Catedral de Lisboa', 'confidence': 'high',
                                           'rule': 'cathedral -> Sé'}], 'untouched': []}, handle)
            rows = writer.proposals(wikidata_path, translated_path, skip=set())
        self.assertEqual([(row['name_local'], row['source']) for row in rows],
                         [('Sé de Lisboa', 'wikidata')])

    def test_the_rollback_record_lists_only_what_this_run_wrote(self):
        import write_native_names as writer
        asked = []

        def d1_read(sql):
            asked.append(sql)
            return [{'overture_id': 'fresh'}]

        self.assertEqual(writer.unwritten_ids(['fresh', 'already'], d1_read), {'fresh'})
        self.assertIn('name_local IS NULL', asked[0])

    def test_reads_for_the_record_are_bounded(self):
        import write_native_names as writer
        seen = []

        def d1_read(sql):
            seen.append(sql.count("'id-"))
            return []

        writer.unwritten_ids([f'id-{i}' for i in range(400)], d1_read)
        self.assertTrue(all(count <= 150 for count in seen))
        self.assertEqual(len(seen), 3)

    def test_an_empty_plan_does_not_crash_the_dry_run(self):
        import write_native_names as writer
        with tempfile.TemporaryDirectory() as tmp:
            wikidata_path = os.path.join(tmp, 'wd.json')
            translated_path = os.path.join(tmp, 'tr.json')
            with open(wikidata_path, 'w') as handle:
                json.dump({'proposals': []}, handle)
            with open(translated_path, 'w') as handle:
                json.dump({'translated': [], 'untouched': []}, handle)
            self.assertEqual(writer.main(['--wikidata', wikidata_path, '--translated', translated_path]), 0)


if __name__ == '__main__':
    unittest.main()
