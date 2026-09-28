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


if __name__ == '__main__':
    unittest.main()


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
