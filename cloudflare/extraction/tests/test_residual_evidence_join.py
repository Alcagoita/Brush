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

    def test_folded_surnames_are_not_mistaken_for_company_forms(self):
        # `Sá` and `Cá` fold to `sa` and `ca`; stripping them turns
        # "Padaria Sá" into every bakery in town.
        self.assertEqual(fsq.normalize('Padaria Sá'), 'padaria sa')
        self.assertEqual(fsq.normalize('A. de Sousa & Ca.'), 'a de sousa ca')

    def test_a_name_is_never_stripped_to_nothing(self):
        self.assertEqual(fsq.normalize('Lda'), 'lda')

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
        self.assertIn('too weak', reason)
        self.assertTrue(matches, 'the far match is still reported as evidence')


class MatchLadderTest(unittest.TestCase):
    def test_a_close_match_is_accepted_on_a_weaker_name(self):
        # `Artipel cork` and `artipel` at 12 m: the same shop, at a score a
        # street away would not justify.
        self.assertTrue(fsq.accepts(12, 0.60))

    def test_the_same_weak_name_is_refused_further_out(self):
        self.assertFalse(fsq.accepts(120, 0.60))

    def test_the_ladder_never_reaches_past_its_last_rung(self):
        self.assertFalse(fsq.accepts(fsq.NEAR_M + 1, 1.0))

    def test_an_exact_name_still_needs_to_be_within_the_near_bound(self):
        self.assertTrue(fsq.accepts(140, 0.0, exact=True))
        self.assertFalse(fsq.accepts(300, 0.0, exact=True))

    def test_names_sharing_only_the_town_are_not_a_match(self):
        # Two different optician chains in Santo Tirso score 0.80 on the
        # town alone, which the looser rungs would otherwise take.
        self.assertTrue(fsq.toponym_only(
            fsq.normalize('Opticalia Santo Tirso'),
            fsq.normalize('Multiopticas Santo Tirso'), 'Santo Tirso'))

    def test_sharing_a_real_word_as_well_as_the_town_is_still_a_match(self):
        self.assertFalse(fsq.toponym_only(
            fsq.normalize('Opticalia Santo Tirso'),
            fsq.normalize('Opticalia Santo Tirso Centro'), 'Santo Tirso'))

    def test_a_loose_rung_needs_a_shared_word_not_just_shared_letters(self):
        # `Livraria Isamira` and `perfumaria riviera` score 0.59 on `-aria`
        # alone, 18 m apart. Morphology, not identity.
        left, right = fsq.normalize('Livraria Isamira'), fsq.normalize('perfumaria riviera')
        self.assertGreaterEqual(fsq.similarity(left, right), 0.55)
        self.assertFalse(fsq.shares_a_word(left, right))
        self.assertFalse(fsq.accepts(18, fsq.similarity(left, right), shared_word=False))

    def test_a_shared_word_lets_the_loose_rung_accept(self):
        self.assertTrue(fsq.shares_a_word('artipel cork', 'artipel'))
        self.assertTrue(fsq.accepts(12, 0.74, shared_word=True))

    def test_a_name_joined_into_one_word_still_shares_it(self):
        self.assertTrue(fsq.shares_a_word('open waters', 'openwaters dive'))

    def test_a_strong_score_needs_no_shared_word(self):
        # 0.85+ is near-identical strings; a typo can break every token.
        self.assertTrue(fsq.accepts(100, 0.90, shared_word=False))

    def test_a_close_strong_pair_is_not_refused_by_the_looser_rung_tried_first(self):
        # `samsonite` against `samsonit3` at 4 m scores 0.89: the 25 m rung
        # wants a shared word and has none, but the 0.85 rung does not care.
        self.assertTrue(fsq.accepts(4, 0.89, shared_word=False))

    def test_a_word_every_nearby_candidate_shares_names_the_venue_not_the_shop(self):
        tenants = ['carlos santos hairshop norteshopping', 'midas norteshopping',
                   'geostar norteshopping', 'norteshopping']
        venue = fsq.venue_words(tenants)
        self.assertIn('norteshopping', venue)
        self.assertFalse(fsq.distinctive_shared_word(
            fsq.normalize('Timberland NorteShopping'), tenants[0], 'Matosinhos', venue))
        self.assertTrue(fsq.distinctive_shared_word(
            fsq.normalize('Timberland NorteShopping'), 'timberland norteshopping', 'Matosinhos', venue))

    def test_a_venue_name_split_on_one_side_and_joined_on_the_other_is_still_the_venue(self):
        venue = {'norteshopping'}
        self.assertFalse(fsq.distinctive_shared_word('norte shopping', 'norteshopping timberland', 'Matosinhos', venue))
        self.assertFalse(fsq.distinctive_shared_word('timberland norte shopping', 'norteshopping', 'Matosinhos', venue))
        # …and a joined word that is not the venue still counts.
        self.assertTrue(fsq.distinctive_shared_word('open waters', 'openwaters dive', 'Lisboa', venue))

    def test_a_one_word_name_does_not_join_with_itself(self):
        # `zsmart` compacts to `zsmart`, which is in its own token set. That is
        # not a shared word with `zsmartbuy`.
        self.assertFalse(fsq.distinctive_shared_word('zsmart', 'zsmartbuy'))

    def test_a_mall_tenant_is_refused_end_to_end(self):
        grid = fsq_grid([
            ('Carlos Santos Hairshop NorteShopping', offset(7), BASE_LNG, 'Retail > Clothing Store'),
            ('Midas NorteShopping', offset(20), BASE_LNG, 'Retail > Clothing Store'),
            ('Geostar NorteShopping', offset(30), BASE_LNG, 'Retail > Clothing Store'),
        ])
        decision, _, _, _ = fsq.decide('Timberland NorteShopping', BASE_LAT, BASE_LNG, grid,
                                       fsq.subtype_index(), 'Matosinhos')
        self.assertEqual(decision, 'insufficient_evidence')

    def test_a_full_name_match_is_the_identity_however_common_its_words(self):
        # `The Shop` against `the shop`, on a street where `the` and `shop`
        # recur: the whole name agreeing is not a partial overlap.
        grid = fsq_grid([
            ('The Shop', offset(10), BASE_LNG, 'Retail > Clothing Store'),
            ('The Coffee Shop', offset(40), BASE_LNG, 'Dining > Cafe'),
            ('The Book Shop', offset(60), BASE_LNG, 'Retail > Bookstore'),
        ])
        decision, subtype, _, _ = fsq.decide('The Shop', BASE_LAT, BASE_LNG, grid, fsq.subtype_index(), 'Lisboa')
        self.assertEqual((decision, subtype), ('verified_subtype', 'clothing'))

    def test_the_guard_does_nothing_without_a_locality(self):
        self.assertFalse(fsq.toponym_only('artipel cork', 'artipel', ''))

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


class OsmTagPrecedenceTest(unittest.TestCase):
    def test_a_shop_that_also_has_an_office_is_a_shop(self):
        # Same precedence as the PBF extractor's contract_family.
        self.assertEqual(osm.mapped_type({'shop': 'hardware', 'office': 'company'}),
                         ('store', 'hardware', False))

    def test_an_office_with_only_a_generic_shop_tag_is_still_an_office(self):
        self.assertEqual(osm.mapped_type({'shop': 'yes', 'office': 'company'}), (None, None, True))

    def test_ambiguous_shop_values_stay_unmapped(self):
        # `outdoor` is hiking gear and `collector` is collectibles; neither is
        # a subtype we have, so neither may become an override.
        for value in ('outdoor', 'collector'):
            self.assertNotIn(value, osm.SHOP_TO_TYPE)


class BatchEmitterTest(unittest.TestCase):
    def test_one_id_in_two_batches_is_refused_before_anything_is_written(self):
        import tempfile
        from unittest import mock
        import apply_kan444_decisions as apply
        header = 'overture_id\tname\tlocality\tlat\tlng\tdecision\tsubtype\treason\tfsq_place_id\tfsq_name\tdistance_m\tsimilarity\tfsq_categories\tosm_id\tosm_distance_m\tosm_family\tstore_kind\tsource\n'
        row = 'id-1\tX\tL\t1\t1\tverified_subtype\tstore\tr\t\t\t\t\t\tnode/1\t5\tshop=hardware\t{kind}\tosm\n'
        with tempfile.NamedTemporaryFile('w', suffix='.tsv', delete=False) as manifest:
            manifest.write(header + row.format(kind='hardware') + row.format(kind='clothing'))
        with mock.patch.object(apply, 'OVERRIDES', os.devnull), \
                mock.patch('json.load', return_value={}), \
                self.assertRaises(ValueError):
            apply.run(manifest.name, dry_run=True)
        os.unlink(manifest.name)


class CheckpointTest(unittest.TestCase):
    def test_a_truncated_final_record_does_not_lose_the_ones_before_it(self):
        import tempfile
        import fetch_osm_retail_tiles as tiles
        with tempfile.NamedTemporaryFile('w', suffix='.jsonl', delete=False) as checkpoint:
            checkpoint.write('{"tile": [1, 2], "elements": []}\n{"tile": [3, 4], "elem')
        try:
            self.assertEqual(tiles.done_tiles(checkpoint.name), {(1, 2)})
        finally:
            os.unlink(checkpoint.name)


class DecidedRowsAreNotReopenedTest(unittest.TestCase):
    def test_osm_only_revisits_rows_foursquare_left_unresolved(self):
        # A second opinion on a decided row is how an audit starts
        # contradicting itself.
        source = os.path.join(EXTRACTION_DIR, 'match_residual_osm.py')
        body = open(source).read()
        self.assertIn("if row['decision'] == 'insufficient_evidence'", body)


if __name__ == '__main__':
    unittest.main()
