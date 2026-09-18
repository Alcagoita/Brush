"""KAN-453. The preflight sorts each archive row into matched / unique /
suspect against a served base, with the KAN-388 matcher and nothing else.

Fixtures are tiny in-memory served bases and archive rows; no D1, no R2.
"""
import os
import sys
import unittest

EXTRACTION_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, EXTRACTION_DIR)

import preflight_foursquare_archive as preflight  # noqa: E402
from classify_and_load import load_financial_service_name_rules, normalize_text  # noqa: E402

LAT, LNG = 38.7200, -9.1400
# ~1° lat = 111 195 m
M = 1 / 111_195


def served(name, dlat_m=0.0, poi_type='historical_landmark', source='overture'):
    return {'source': source, 'id': f'{source}-{name}', 'name': name, 'dedupe_name': normalize_text(name),
            'lat': LAT + dlat_m * M, 'lng': LNG, 'type': poi_type}


def archive(name, dlat_m=0.0, fsq_id=None, locality='', lat=True):
    return {'fsq_place_id': fsq_id or f'fsq-{normalize_text(name).replace(" ", "-")}', 'name': name,
            'dedupe_name': normalize_text(name), 'lat': LAT + dlat_m * M if lat else None,
            'lng': LNG if lat else None, 'locality': locality, 'label': 'Landmarks and Outdoors > Scenic Lookout',
            'types': ['viewpoint']}


def classify(record, base, poi_type='viewpoint', owners=None, twins=None):
    grid = preflight.grid_index(base)
    owners = owners if owners is not None else {(record['lat'], record['lng']): [record['fsq_place_id']]}
    return preflight.classify_record(record, poi_type, grid, owners, twins or {})


class ClassifyRecordTest(unittest.TestCase):
    def test_same_name_same_family_within_radius_is_matched(self):
        bucket, reason, counterpart = classify(archive('Miradouro do Canavial', 8), [served('Miradouro do Canavial')])
        self.assertEqual(bucket, 'matched')
        self.assertIn('overture historical_landmark', reason)
        self.assertEqual(counterpart[0]['id'], 'overture-Miradouro do Canavial')

    def test_matcher_accepts_the_kan388_containment_form(self):
        # "Miradouro do Pico dos Barcelos" vs "Pico dos Barcelos": name_similarity 0.9 by containment.
        bucket, _, _ = classify(archive('Miradouro do Pico dos Barcelos', 50), [served('Pico dos Barcelos', 0, 'mountain')])
        self.assertEqual(bucket, 'matched')

    def test_a_curated_row_counts_as_served(self):
        bucket, reason, _ = classify(archive('Ponte Romana', 5), [served('Ponte Romana', 0, 'bridge', 'curated')], 'bridge')
        self.assertEqual(bucket, 'matched')
        self.assertIn('curated bridge', reason)

    def test_same_name_business_is_suspect_not_matched(self):
        bucket, reason, _ = classify(archive('The Top', 14), [served('The TOP', 0, 'restaurant')])
        self.assertEqual(bucket, 'suspect')
        self.assertTrue(reason.startswith('same name as a served business'))

    def test_bank_family_matches_a_bank_but_not_a_store(self):
        self.assertEqual(classify(archive('Banco BPI', 3), [served('BPI', 0, 'bank')], 'bank')[0], 'matched')
        bucket, reason, _ = classify(archive('Banco BPI', 3), [served('BPI', 0, 'store')], 'bank')
        self.assertEqual(bucket, 'suspect')
        self.assertIn('served business', reason)

    def test_same_name_beyond_the_matcher_radius_is_suspect_not_matched(self):
        # 200 m apart: the matcher (75 m) refuses, but a person should look.
        bucket, reason, counterpart = classify(archive('Miradouro da Vigia', 200), [served('Miradouro da Vigia')])
        self.assertEqual(bucket, 'suspect')
        self.assertTrue(reason.startswith('same name beyond the matcher radius'))
        self.assertAlmostEqual(counterpart[1], 200, delta=1)

    def test_far_same_name_beyond_400m_is_unique(self):
        bucket, _, counterpart = classify(archive('Miradouro da Vigia', 600), [served('Miradouro da Vigia')])
        self.assertEqual(bucket, 'unique')
        self.assertIsNone(counterpart)

    def test_no_counterpart_is_unique(self):
        bucket, reason, _ = classify(archive('Miradouro das Pedras Negras'), [served('Farol da Barra', 30, 'lighthouse')])
        self.assertEqual(bucket, 'unique')

    def test_a_match_outranks_every_suspicion(self):
        # Shared coordinates would make it suspect; it is served, so it is matched.
        record = archive('Miradouro do Castelo', 2)
        owners = {(record['lat'], record['lng']): [record['fsq_place_id'], 'fsq-other']}
        self.assertEqual(classify(record, [served('Miradouro do Castelo')], owners=owners)[0], 'matched')

    def test_only_type_words_is_no_name_signal(self):
        for name in ('Miradouro', 'Ponte', 'Praça Municipal', 'Aussichtspunkt', 'Farol'):
            bucket, reason, _ = classify(archive(name), [])
            self.assertEqual((name, bucket), (name, 'suspect'))
            self.assertIn('no name signal', reason)

    def test_a_real_name_has_signal(self):
        self.assertTrue(preflight.has_name_signal('miradouro da quebrada dos fanais'))
        self.assertFalse(preflight.has_name_signal('miradouro'))
        self.assertFalse(preflight.has_name_signal(''))

    def test_name_that_is_the_locality_is_suspect(self):
        bucket, reason, _ = classify(archive('Odivelas', locality='Odivelas'), [])
        self.assertEqual(bucket, 'suspect')
        self.assertIn('locality', reason)
        # A real name that merely contains the town is fine.
        self.assertEqual(classify(archive('Miradouro Fenais da Ajuda', locality='Ribeira Grande'), [])[0], 'unique')

    def test_shared_coordinates_are_suspect(self):
        record = archive('Miradouro da Contenda')
        owners = {(record['lat'], record['lng']): [record['fsq_place_id'], 'fsq-a', 'fsq-b']}
        bucket, reason, _ = classify(record, [], owners=owners)
        self.assertEqual(bucket, 'suspect')
        self.assertIn('2 other archive row', reason)

    def test_archive_twin_is_suspect(self):
        record = archive('Miradouro da Contenda', fsq_id='fsq-2')
        bucket, reason, _ = classify(record, [], twins={'fsq-2': 'fsq-1'})
        self.assertEqual(bucket, 'suspect')
        self.assertIn('twin', reason)

    def test_no_coordinates_is_suspect(self):
        bucket, reason, _ = classify(archive('Miradouro da Contenda', lat=False), [])
        self.assertEqual((bucket, reason), ('suspect', 'no coordinates'))


class ArchiveTwinsTest(unittest.TestCase):
    def test_second_listing_of_one_place_points_at_the_first(self):
        first = archive('Miradouro do Castelo', 0, 'fsq-1')
        second = archive('Miradouro do Castelo', 8, 'fsq-2')
        other = archive('Miradouro do Castelo', 500, 'fsq-3')
        self.assertEqual(preflight.archive_twins([first, second, other]), {'fsq-2': 'fsq-1'})


class ClassifyArchiveRowTest(unittest.TestCase):
    """The mapping is classify_and_load's: primary ids, then the bank rules."""

    def setUp(self):
        self.primary, self.also = preflight.type_mapping(preflight.CANDIDATE_TYPES)
        self.rules = load_financial_service_name_rules()

    def row(self, name, *category_ids):
        return {'fsq_place_id': 'x', 'name': name, 'category_ids': '|'.join(category_ids)}

    def test_primary_id_types_the_row(self):
        types, also_only, retyped = preflight.classify_archive_row(
            self.row('Miradouro do Cruzeiro', '4bf58dd8d48988d165941735'), self.primary, self.also, self.rules)
        self.assertEqual((types, also_only, retyped), ({'viewpoint'}, set(), None))

    def test_also_id_alone_is_counted_but_never_typed(self):
        # "Garden" is an `also` of botanical_garden: extracted by category_ids.py, not classified.
        types, also_only, _ = preflight.classify_archive_row(
            self.row('Jardim Municipal', '4bf58dd8d48988d15a941735'), self.primary, self.also, self.rules)
        self.assertEqual(types, set())
        self.assertEqual(also_only, {'botanical_garden'})

    def test_explicit_atm_name_leaves_bank(self):
        types, _, retyped = preflight.classify_archive_row(
            self.row('Banco Montepio ATM', '4bf58dd8d48988d10a951735'), self.primary, self.also, self.rules)
        self.assertEqual((types, retyped), (set(), 'atm'))

    def test_atm_is_refused_as_a_candidate_type(self):
        with self.assertRaises(SystemExit):
            preflight.run(_Args(types='viewpoint,atm'))


class _Args:
    def __init__(self, **overrides):
        self.archive_key = self.overture_key = 'k'
        self.archive_csv = self.overture_csv = None
        self.work_dir = '/nonexistent'
        self.report_out = '/nonexistent/report.md'
        self.types = ','.join(preflight.CANDIDATE_TYPES)
        self.country = 'PT'
        self.sample_size, self.seed, self.skip_d1, self.notes = 30, 453, True, None
        self.__dict__.update(overrides)


class SampleTest(unittest.TestCase):
    def test_sampling_is_deterministic_and_id_ordered(self):
        items = [(archive(f'Miradouro {i}', fsq_id=f'fsq-{i:03d}'), 'r', None) for i in range(100)]
        first = preflight.sample(items, 10, 453)
        second = preflight.sample(items, 10, 453)
        self.assertEqual([r['fsq_place_id'] for r, _, _ in first], [r['fsq_place_id'] for r, _, _ in second])
        self.assertEqual([r['fsq_place_id'] for r, _, _ in first], sorted(r['fsq_place_id'] for r, _, _ in first))
        self.assertEqual(len(preflight.sample(items[:5], 10, 453)), 5)


if __name__ == '__main__':
    unittest.main()
