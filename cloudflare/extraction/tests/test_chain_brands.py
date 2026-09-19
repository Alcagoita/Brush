"""KAN-448. A chain decides its own type and kinds, on every branch."""
import os
import sys
import unittest

EXTRACTION_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, EXTRACTION_DIR)
os.environ.setdefault('BRUSH_TYPE_RELATION', 'sql')

import promote_overture_candidates as promote
import backfill_chain_brands as backfill
from analyse_poi_candidates import reachable_types


class Fixture:
    mapping = promote.category_map()
    reachable = reachable_types()
    brands = promote.load_brand_dictionary()
    kinds = promote.store_kind_alias_index()
    cuisines = promote.food_cuisine_alias_index()
    financial = promote.load_financial_service_name_rules()
    store_brands = promote.store_brand_index()

    @classmethod
    def decide(cls, name, category):
        row = {'overture_id': 'x', 'name': name, 'lat': 38.7, 'lng': -9.1, 'address': None,
               'category': category, 'category_path': None, 'confidence': 0.9, 'source_datasets': None}
        status, types, attributes, reason = promote.decide(
            row, cls.mapping, cls.reachable, cls.brands, cls.kinds, cls.cuisines, cls.financial, cls.store_brands, {})
        return status, tuple(types), tuple(sorted(v for d, v in attributes if d == 'store_kind')), reason


class UnionTest(unittest.TestCase):
    def test_a_brand_listed_under_two_kinds_is_both_never_none(self):
        self.assertEqual(promote.store_kinds_from_brand('Decathlon Lisboa', Fixture.store_brands),
                         ('bicycle', 'sports'))
        self.assertEqual(promote.store_kinds_from_brand('Worten Colombo', Fixture.store_brands),
                         ('electronics', 'phone'))

    def test_the_single_kind_helper_still_answers_one_when_there_is_one(self):
        self.assertEqual(promote.store_kind_from_brand('Zara Chiado', Fixture.store_brands), 'clothing')
        self.assertIsNone(promote.store_kind_from_brand('Decathlon', Fixture.store_brands))


class ChainConsistencyTest(unittest.TestCase):
    def test_decathlon_is_a_sports_and_bicycle_store_whatever_the_category_said(self):
        for category in ('sporting_goods', 'bicycle_shop', 'shopping', 'school', 'beach', 'outdoor_gear'):
            status, types, kinds, _ = Fixture.decide('Decathlon Albufeira', category)
            self.assertEqual((status, types[0], kinds), ('promoted', 'store', ('bicycle', 'sports')), category)

    def test_a_chains_noise_kind_is_replaced_not_merged(self):
        _, _, kinds, _ = Fixture.decide('Leroy Merlin Évora', 'pet_store')
        self.assertEqual(kinds, ('hardware', 'home'))

    def test_calzedonia_is_clothing_on_a_branch_meta_called_lingerie(self):
        _, _, kinds, _ = Fixture.decide('Calzedonia Cascais', 'lingerie_store')
        self.assertEqual(kinds, ('clothing',))


class OverrideScopeTest(unittest.TestCase):
    def test_a_commercial_category_is_never_overruled(self):
        for name, category, expected in (('Em Forma - Café Decathlon', 'cafe', 'cafe'),
                                         ('Nespresso', 'coffee_shop', 'cafe'),
                                         ('Decathlon Express Penafiel', 'hotel', None)):
            status, types, _, _ = Fixture.decide(name, category)
            self.assertEqual(types[0] if types else None, expected, name)

    def test_a_non_generic_override_is_refused_by_a_venue_word(self):
        status, types, _, _ = Fixture.decide('Parque Infantil Decathlon', 'school')
        self.assertNotEqual(types[:1], ('store',))

    def test_a_venue_word_refuses_the_chain_wherever_the_brand_sits(self):
        # KAN-455. The chain matches anywhere in the name unless another word
        # names a different kind of place (src/venueWords.json).
        for name, category in (('Salsa e Canela', 'shopping'), ('Tasquinha O Salsa', ''),
                               ('Wok to Walk IKEA Matosinhos', ''), ('Humana Mente', ''),
                               ('Humana - O seu espaço de saúde', ''),
                               ('Óptica Vodafone', ''), ('Parque Infantil Decathlon', 'school')):
            status, types, kinds, reason = Fixture.decide(name, category)
            self.assertFalse((reason or '').startswith('brand:'), (name, reason))
        # `Zara by Castro` (a pastelaria) and `AM Rebouças Tintas CIN` (a
        # paint shop that is not CIN) carry no word that contradicts the
        # chain; they are the rule's known residual, listed in the runbook.
        self.assertEqual(Fixture.decide('Zara by Castro', '')[2], ('clothing',))
        self.assertEqual(Fixture.decide('AM Rebouças Tintas CIN', '')[2], ('hardware',))

    def test_a_branch_with_a_shop_word_or_a_prefix_is_still_the_chain(self):
        for name, category, expected in (('Loja MEO Braga', 'shopping', ('phone',)),
                                         ('Ópticas MultiOpticas Faro', '', ('eyewear_and_optician',)),
                                         ('Armazém Conforama Palmela', '', ('furniture', 'home')),
                                         ('The Phone House', 'shopping', ('phone',)),
                                         ('LA Outlet by Lanidor', '', ('clothing',)),
                                         ('A Desportiva Adidas', '', ('shoes', 'sports')),
                                         ('Decathlon Albufeira', 'shopping', ('bicycle', 'sports')),
                                         ('Decathlon Parque das Nações', 'shopping', ('bicycle', 'sports')),
                                         ('Desportos Aquáticos Decathlon Algarve', 'shopping', ('bicycle', 'sports')),
                                         ('Worten Colombo', '', ('electronics', 'phone')),
                                         ('Minipreço Carvoeiro', 'shopping', ())):
            status, types, kinds, _ = Fixture.decide(name, category)
            self.assertEqual((status, kinds), ('promoted', expected), name)
        self.assertEqual(Fixture.decide('Ale-Hop Faro', 'flowers_and_gifts_shop')[1:3], (('store',), ('gift',)))
        # `salsa` and `humana` are words; the chains are `Salsa`/`Salsa Jeans …`, `HUMANA`/`HUMANA Vintage`.
        self.assertEqual(promote.store_kinds_from_brand('Salsa', Fixture.store_brands), ('clothing',))
        self.assertEqual(promote.store_kinds_from_brand('Salsa Jeans Alameda', Fixture.store_brands), ('clothing',))
        self.assertEqual(promote.store_kinds_from_brand('Salsa Bistro', Fixture.store_brands), ())
        self.assertEqual(promote.store_kinds_from_brand('HUMANA Vintage', Fixture.store_brands), ('clothing',))

    def test_a_store_typed_row_takes_the_chains_kinds_unless_a_venue_word_contradicts(self):
        _, types, kinds, reason = Fixture.decide('Papelaria Zara Fan', 'gift_shop')
        self.assertEqual((types[0], kinds), ('store', ('gift',)))
        self.assertFalse((reason or '').startswith('brand:'))
        _, types, kinds, reason = Fixture.decide('Loja Zara Chiado', 'gift_shop')
        self.assertEqual((types[0], kinds, reason), ('store', ('clothing',), 'brand: store/clothing'))

    def test_venue_contradiction_names_the_word(self):
        self.assertEqual(promote.venue_contradiction('tasquinha o salsa', 'salsa', 'store', {'clothing'}), 'tasquinha')
        self.assertEqual(promote.venue_contradiction('optica vodafone', 'vodafone', 'store', {'phone'}), 'optica')
        self.assertIsNone(promote.venue_contradiction('opticas multiopticas faro', 'multiopticas', 'store', {'eyewear_and_optician'}))
        self.assertIsNone(promote.venue_contradiction('supermercado lidl', 'lidl', 'supermarket'))
        self.assertEqual(promote.venue_contradiction('papelaria intermarche', 'intermarche', 'supermarket'), 'papelaria')
        self.assertIsNone(promote.venue_contradiction('loja meo braga', 'meo', 'store', {'phone'}))

    def test_a_supermarket_chain_in_generic_shopping_becomes_a_supermarket(self):
        status, types, _, reason = Fixture.decide('Minipreço Cinfães', 'shopping')
        self.assertEqual((status, types[0]), ('promoted', 'supermarket'))
        self.assertEqual(reason, 'brand: supermarket')


class GenericWordBrandTest(unittest.TestCase):
    def test_casa_matches_only_when_it_is_the_whole_name(self):
        self.assertEqual(promote.store_kinds_from_brand('Casa', Fixture.store_brands), ('home',))
        for name in ('Casa Amarela', 'Casa do Rum', 'Casa dos Óculos', 'Casa da Avó', 'Casa Colombo'):
            self.assertEqual(promote.store_kinds_from_brand(name, Fixture.store_brands), (), name)

    def test_casa_do_rum_keeps_the_kind_its_category_gave(self):
        _, _, kinds, _ = Fixture.decide('Casa do Rum', 'liquor_store')
        self.assertNotEqual(kinds, ('home',))

    def test_an_initials_form_does_not_become_a_chain(self):
        # brand_form_matches' ampersand rule, still enforced.
        self.assertEqual(promote.store_kinds_from_brand('C.A. Residência Sénior', Fixture.store_brands), ())
        self.assertEqual(promote.store_kinds_from_brand('C&A Colombo', Fixture.store_brands), ('clothing',))

    def test_a_name_that_agrees_with_its_category_is_not_overruled(self):
        # `IKEA Parking` is the car park; `Escola Decathlon` would be a school.
        for name, category in (('IKEA Parking', 'parking'), ('Vodafone Portugal - Garagem', 'parking'),
                               ('Escola Decathlon', 'school'), ('Decathlon Praia', 'beach')):
            _, types, _, _ = Fixture.decide(name, category)
            self.assertNotEqual(types[:1], ('store',), name)
        _, types, _, _ = Fixture.decide('Decathlon Albufeira', 'school')
        self.assertEqual(types[:1], ('store',))

    def test_a_sponsored_park_is_not_a_phone_shop(self):
        status, types, _, _ = Fixture.decide('MEO Suil Park', 'park')
        self.assertNotEqual(types[:1], ('store',))


class UmbrellaRefinementTest(unittest.TestCase):
    """KAN-457. A chain refines an umbrella bucket it has a child in."""

    def test_ale_hop_is_a_gift_store_on_every_kind_of_branch(self):
        for name, category in (('ALE-HOP Rua do Ouro', 'gift_shop'), ('Ale-Hop Faro', 'flowers_and_gifts_shop'),
                               ('Ale Hop', 'office_equipment'), ('Ale-Hop', 'souvenir_shop'),
                               ('Ale-Hop', 'department_store'), ('Ale-Hop', 'shopping')):
            status, types, kinds, reason = Fixture.decide(name, category)
            self.assertEqual((status, types[0], kinds), ('promoted', 'store', ('gift',)), (name, category))
            self.assertEqual(reason, 'brand: store/gift')

    def test_the_umbrella_is_refined_not_overruled(self):
        # A florist chain would not refine it either way; a gift chain is a
        # child of "flowers and gifts", so the row was never wrong.
        _, types, kinds, _ = Fixture.decide('Ale-Hop Faro', 'flowers_and_gifts_shop')
        self.assertEqual((types, kinds), (('store',), ('gift',)))

    def test_a_florist_at_the_umbrella_stays_a_florist(self):
        status, types, _, _ = Fixture.decide('Florista Jardim', 'flowers_and_gifts_shop')
        self.assertEqual(types[:1], ('florist',))

    def test_a_chain_of_another_kind_does_not_refine_the_umbrella(self):
        # Decathlon is not a child of "flowers and gifts"; the commercial
        # category holds, exactly as KAN-448 rule 2 says.
        _, types, _, _ = Fixture.decide('Decathlon Faro', 'flowers_and_gifts_shop')
        self.assertEqual(types[:1], ('florist',))

    def test_a_name_that_says_florist_is_not_refined(self):
        _, types, _, _ = Fixture.decide('Ale-Hop Florista', 'flowers_and_gifts_shop')
        self.assertEqual(types[:1], ('florist',))

    def test_a_commercial_category_still_holds_against_the_chain(self):
        status, types, kinds, _ = Fixture.decide('Ale-Hop', 'convenience_store')
        self.assertEqual(types[:1], ('mini_market',))


class BackfillTest(unittest.TestCase):
    def test_a_row_already_correct_produces_no_statement(self):
        decided = {'id1': {'primary': 'store', 'types': ['store'], 'kinds': ['bicycle', 'sports'], 'brand': 'Decathlon'}}
        state = {'id1': {'primary': 'store', 'brand': 'Decathlon', 'kinds': ['bicycle', 'sports'], 'types': ['store']}}
        self.assertEqual(list(backfill.statements(decided, state)), [])

    def test_a_secondary_type_out_of_order_rebuilds_the_ranked_list(self):
        decided = {'id1': {'primary': 'store', 'types': ['store', 'phone_repair'], 'kinds': ['phone'], 'brand': 'MEO'}}
        state = {'id1': {'primary': 'store', 'brand': 'MEO', 'kinds': ['phone'], 'types': ['store']}}
        sql = ''.join(backfill.statements(decided, state))
        self.assertIn("DELETE FROM overture_poi_type WHERE overture_id = 'id1'", sql)
        self.assertIn("('id1','phone_repair',1)", sql)

    def test_a_reviewed_row_is_never_touched_by_the_backfill(self):
        import tempfile, csv as _csv
        from unittest import mock
        with tempfile.NamedTemporaryFile('w', suffix='.csv', delete=False, newline='') as archive:
            writer = _csv.DictWriter(archive, fieldnames=('overture_id', 'name', 'lat', 'lng', 'address', 'locality', 'category', 'basic_category', 'category_path', 'confidence', 'source_datasets'))
            writer.writeheader()
            writer.writerow({'overture_id': 'reviewed', 'name': 'Decathlon Reviewed', 'lat': 1, 'lng': 1, 'category': 'shopping'})
            writer.writerow({'overture_id': 'fresh', 'name': 'Decathlon Fresh', 'lat': 1, 'lng': 1, 'category': 'shopping'})
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as overrides:
            import json
            json.dump({'key': {'batch': {'reviewed': {'poi_type': 'store', 'store_kind': 'eyewear_and_optician', 'reason': 'r'}}}}, overrides)
        with mock.patch.object(backfill, 'OVERRIDES_PATH', overrides.name):
            decided = backfill.chain_decisions(archive.name, 'key')
        self.assertNotIn('reviewed', decided)
        self.assertIn('fresh', decided)
        os.unlink(archive.name); os.unlink(overrides.name)

    def test_kinds_are_replaced_by_exact_id(self):
        decided = {'id1': {'primary': 'store', 'types': ['store'], 'kinds': ['hardware', 'home'], 'brand': 'Leroy Merlin'}}
        state = {'id1': {'primary': 'store', 'brand': 'Leroy Merlin', 'kinds': ['pet'], 'types': ['store']}}
        sql = ''.join(backfill.statements(decided, state))
        self.assertIn("DELETE FROM overture_poi_attribute WHERE overture_id = 'id1' AND dimension = 'store_kind'", sql)
        self.assertIn("('id1','store_kind','hardware')", sql)
        self.assertIn("('id1','store_kind','home')", sql)
        self.assertNotIn('UPDATE overture_poi SET primary_poi_type', sql)

    def test_a_school_that_is_a_decathlon_is_retyped_and_branded(self):
        decided = {'id1': {'primary': 'store', 'types': ['store'], 'kinds': ['bicycle', 'sports'], 'brand': 'Decathlon'}}
        state = {'id1': {'primary': 'school', 'brand': None, 'kinds': [], 'types': ['school']}}
        sql = ''.join(backfill.statements(decided, state))
        self.assertIn("SET primary_poi_type = 'store', brand = 'Decathlon' WHERE overture_id = 'id1'", sql)
        self.assertIn("DELETE FROM overture_poi_type WHERE overture_id = 'id1'", sql)

    def test_a_row_not_in_prod_is_left_to_promotion(self):
        decided = {'id1': {'primary': 'store', 'types': ['store'], 'kinds': ['sports'], 'brand': 'X'}}
        self.assertEqual(list(backfill.statements(decided, {})), [])

    def test_an_earlier_migration_keeps_its_rows(self):
        # KAN-457. 0041 was generated, reviewed and not yet applied when 0043
        # was generated; the later file names only what the earlier does not.
        import tempfile
        with tempfile.NamedTemporaryFile('w', suffix='.sql', delete=False) as earlier:
            earlier.write("UPDATE overture_poi SET brand = 'Decathlon' WHERE overture_id = 'old1';\n"
                          "DELETE FROM overture_poi_attribute WHERE overture_id = 'old2' AND dimension = 'store_kind';\n"
                          "INSERT OR IGNORE INTO overture_poi_attribute (overture_id, dimension, value) VALUES ('old2','store_kind','sports');\n")
        self.assertEqual(backfill.rows_named_by([earlier.name]), {'old1', 'old2'})
        os.unlink(earlier.name)


if __name__ == '__main__':
    unittest.main()
