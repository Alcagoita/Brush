"""KAN-444. The residual evidence join: normalization, tiers, and what a
provider category is and is not allowed to settle."""
import json
import os
import sys
import unittest

EXTRACTION_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, EXTRACTION_DIR)

import match_residual_foursquare as fsq
import match_residual_osm as osm


def fsq_grid(entries):
    """entries: (name, lat, lng, category_labels)"""
    grid = {}
    for name, lat, lng, labels in entries:
        grid.setdefault((int(lat // fsq.CELL), int(lng // fsq.CELL)), []).append(
            (f'fsq-{name}', fsq.normalize(name), lat, lng, labels))
    return _Defaulting(grid)


def osm_grid(entries):
    """entries: (name, lat, lng, family, tags dict)"""
    grid = {}
    for name, lat, lng, family, tags in entries:
        grid.setdefault((int(lat // fsq.CELL), int(lng // fsq.CELL)), []).append(
            (f'node/{name}', fsq.normalize(name), lat, lng, family, json.dumps(tags)))
    return _Defaulting(grid)


class _Defaulting(dict):
    def __missing__(self, key):
        return []


BASE_LAT, BASE_LNG = 38.7200, -9.1400


def offset(metres):
    """A latitude that many metres north of the base point."""
    return BASE_LAT + metres / 111_000.0


class NormalizationTest(unittest.TestCase):
    def test_accents_and_case_are_folded(self):
        self.assertEqual(fsq.normalize('Ótica Malhoa'), fsq.normalize('OTICA MALHOA'))

    def test_trailing_company_forms_are_dropped(self):
        self.assertEqual(fsq.normalize('Casa Ferreira, Lda'), 'casa ferreira')

    def test_a_leading_word_is_never_treated_as_a_company_form(self):
        # "Casa da Sogra" must keep "Casa"; only trailing forms are noise.
        self.assertEqual(fsq.normalize('Casa da Sogra'), 'casa da sogra')

    def test_similarity_of_unrelated_names_stays_below_the_threshold(self):
        self.assertLess(fsq.similarity(fsq.normalize('Atelier do Algodão'),
                                       fsq.normalize('Padaria da Sargaça')),
                        fsq.STRONG_SIMILARITY)

    def test_a_common_word_does_not_match_a_longer_name(self):
        # Containment would score this 1.0 and match every pharmacy in Portugal.
        self.assertLess(fsq.similarity('farmacia', 'farmacia central do porto'),
                        fsq.STRONG_SIMILARITY)


class FoursquareTierTest(unittest.TestCase):
    def test_a_name_and_location_match_inside_the_near_bound_is_verified(self):
        grid = fsq_grid([('Ótica Malhoa', offset(40), BASE_LNG, 'Retail > Optical Shop > Optometrist')])
        decision, subtype, _, _ = fsq.decide('Ótica Malhoa', BASE_LAT, BASE_LNG, grid, fsq.subtype_index())
        self.assertEqual((decision, subtype), ('verified_subtype', 'eyewear_and_optician'))

    def test_the_same_match_beyond_the_near_bound_is_not_auto_assigned(self):
        grid = fsq_grid([('Ótica Malhoa', offset(300), BASE_LNG, 'Retail > Optical Shop > Optometrist')])
        decision, subtype, reason, matches = fsq.decide(
            'Ótica Malhoa', BASE_LAT, BASE_LNG, grid, fsq.subtype_index())
        self.assertEqual(decision, 'insufficient_evidence')
        self.assertIn('150 m', reason)
        self.assertTrue(matches, 'the far match is still reported as evidence')

    def test_no_candidate_at_all_is_evidence_of_absence(self):
        decision, _, reason, matches = fsq.decide(
            'Loja da Ana', BASE_LAT, BASE_LNG, fsq_grid([]), fsq.subtype_index())
        self.assertEqual(decision, 'insufficient_evidence')
        self.assertIn('400 m', reason)
        self.assertEqual(matches, [])


class GenericBucketTest(unittest.TestCase):
    def test_the_providers_own_retail_bucket_never_becomes_a_subtype(self):
        # `any` is Foursquare's "Retail" — exactly as generic as the shopping
        # category this audit exists to resolve.
        self.assertNotIn('any', fsq.subtype_index().values())

    def test_a_match_on_a_generic_category_stays_unresolved(self):
        grid = fsq_grid([('Casa Ferreira', offset(20), BASE_LNG, 'Retail > Miscellaneous Store')])
        decision, subtype, _, _ = fsq.decide('Casa Ferreira', BASE_LAT, BASE_LNG, grid, fsq.subtype_index())
        self.assertEqual((decision, subtype), ('insufficient_evidence', ''))

    def test_shop_yes_is_generic_for_osm_too(self):
        self.assertEqual(osm.mapped_type({'shop': 'yes', 'name': 'X'}), (None, None, False))


class ChainAgreementTest(unittest.TestCase):
    def test_two_branches_agreeing_resolve_the_row(self):
        # Which branch matched is irrelevant: the app matches types and brands,
        # never a specific place.
        grid = fsq_grid([
            ('Opticalia', offset(30), BASE_LNG, 'Retail > Optometrist'),
            ('Opticalia', offset(90), BASE_LNG, 'Retail > Eyecare Store'),
        ])
        decision, subtype, _, _ = fsq.decide('Opticalia', BASE_LAT, BASE_LNG, grid, fsq.subtype_index())
        self.assertEqual((decision, subtype), ('verified_subtype', 'eyewear_and_optician'))

    def test_two_branches_disagreeing_produce_a_conflict_not_a_guess(self):
        grid = fsq_grid([
            ('Central', offset(30), BASE_LNG, 'Retail > Optometrist'),
            ('Central', offset(60), BASE_LNG, 'Retail > Jewelry Store'),
        ])
        decision, subtype, reason, _ = fsq.decide('Central', BASE_LAT, BASE_LNG, grid, fsq.subtype_index())
        self.assertEqual((decision, subtype), ('insufficient_evidence', ''))
        self.assertIn('disagree', reason)


class ExclusionEvidenceTest(unittest.TestCase):
    def test_a_matched_office_excludes_the_row(self):
        grid = osm_grid([('Paula Joao Arquitectura', offset(20), BASE_LNG, 'office=architect',
                          {'office': 'architect', 'name': 'Paula Joao Arquitectura'})])
        decision, poi_type, kind, _, _ = osm.decide('Paula João Arquitectura', BASE_LAT, BASE_LNG, grid)
        self.assertEqual(decision, 'excluded')
        self.assertEqual((poi_type, kind), ('', ''))

    def test_a_matched_shop_resolves_to_a_type_and_kind(self):
        grid = osm_grid([('Ferragens Silva', offset(25), BASE_LNG, 'shop=hardware',
                          {'shop': 'hardware', 'name': 'Ferragens Silva'})])
        decision, poi_type, kind, _, _ = osm.decide('Ferragens Silva', BASE_LAT, BASE_LNG, grid)
        self.assertEqual((decision, poi_type, kind), ('verified_subtype', 'store', 'hardware'))

    def test_a_non_store_type_carries_no_store_kind(self):
        # promote_overture_candidates.decide() rejects an override that has
        # both, so the mapping must never produce one.
        for value, (poi_type, kind) in osm.SHOP_TO_TYPE.items():
            if poi_type != 'store':
                self.assertIsNone(kind, f'{value} maps to {poi_type} with a store_kind')
            else:
                self.assertIsNotNone(kind, f'{value} maps to store with no store_kind')

    def test_every_mapped_store_kind_exists_in_the_subtype_file(self):
        path = os.path.join(os.path.dirname(EXTRACTION_DIR), 'src', 'storeSubtypeCategories.json')
        known = set(json.load(open(path)))
        for value, (poi_type, kind) in osm.SHOP_TO_TYPE.items():
            if poi_type == 'store':
                self.assertIn(kind, known, f'{value} maps to unknown store kind {kind}')

    def test_every_mapped_poi_type_is_reachable(self):
        # Existing in poiTypeCategories.json is not enough: the promotion
        # runner refuses an override whose type the app cannot surface, so a
        # mapping to one produces a batch that can never be applied.
        from analyse_poi_candidates import reachable_types
        reachable = set(reachable_types())
        tables = (osm.SHOP_TO_TYPE, osm.AMENITY_TO_TYPE, osm.CRAFT_TO_TYPE, osm.HEALTHCARE_TO_TYPE)
        for table in tables:
            for value, (poi_type, _) in table.items():
                self.assertIn(poi_type, reachable, f'{value} maps to unreachable poi_type {poi_type}')


class DecidedRowsAreNotReopenedTest(unittest.TestCase):
    def test_osm_only_revisits_rows_foursquare_left_unresolved(self):
        # A second opinion on a decided row is how an audit starts
        # contradicting itself.
        source = os.path.join(EXTRACTION_DIR, 'match_residual_osm.py')
        body = open(source).read()
        self.assertIn("if row['decision'] == 'insufficient_evidence'", body)


if __name__ == '__main__':
    unittest.main()
