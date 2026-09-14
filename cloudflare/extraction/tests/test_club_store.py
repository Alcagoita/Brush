"""KAN-447. Club stores are their own kind, typed by brand for every branch."""
import json
import os
import sys
import unittest

EXTRACTION_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, EXTRACTION_DIR)
os.environ.setdefault('BRUSH_TYPE_RELATION', 'sql')
ROOT = os.path.dirname(os.path.dirname(EXTRACTION_DIR))

import promote_overture_candidates as promote
from analyse_poi_candidates import reachable_types


def dictionary():
    with open(os.path.join(ROOT, 'src', 'constants', 'storeSubtypeDictionary.json')) as handle:
        return json.load(handle)


class ClubStoreTest(unittest.TestCase):
    def test_the_kind_is_defined_the_way_every_kind_is(self):
        entry = dictionary()['club_store']
        self.assertEqual(entry['label'], 'Club store')
        self.assertTrue(entry['labelPt'])
        self.assertTrue(entry['aliases'])
        self.assertTrue(entry['stores'])
        with open(os.path.join(ROOT, 'cloudflare', 'src', 'storeSubtypeCategories.json')) as handle:
            self.assertIn('club_store', json.load(handle))

    def test_every_club_store_brand_resolves_to_the_kind_including_branch_suffixes(self):
        index = promote.store_brand_index()
        for name in ('Benfica Official Store Estádio', 'Loja Do Benfica', 'FC Porto Store Colombo',
                     'Loja Verde', 'Força Portugal Colombo'):
            self.assertEqual(promote.store_kind_from_brand(name, index), 'club_store', name)

    def test_a_club_store_is_neither_clothing_nor_sports(self):
        index = promote.store_brand_index()
        self.assertEqual(promote.store_kind_from_brand('Prozis Store Colombo', index), 'sports')
        self.assertEqual(promote.store_kind_from_brand('Zara Chiado', index), 'clothing')
        self.assertNotIn(promote.store_kind_from_brand('Benfica Official Store', index), ('clothing', 'sports'))

    def test_the_lisbon_neighbourhood_and_a_mattress_shop_are_not_club_stores(self):
        # `Benfica` is also a district; `Loja Oficial Colmol` sells mattresses.
        # Brands are the full store names for exactly this reason.
        index = promote.store_brand_index()
        for name in ('Mercado de Benfica', 'Moveisbenficalar', 'Loja Oficial Colmol Lisboa', 'Loja Azul'):
            self.assertIsNone(promote.store_kind_from_brand(name, index), name)

    def test_the_kind_is_reachable_and_promotion_accepts_it(self):
        self.assertIn('club_store', reachable_types())
        mapping, reachable, brands = promote.category_map(), reachable_types(), promote.load_brand_dictionary()
        kinds, cuisines = promote.store_kind_alias_index(), promote.food_cuisine_alias_index()
        financial, store_brands = promote.load_financial_service_name_rules(), promote.store_brand_index()
        row = {'overture_id': 'x', 'name': 'Benfica Official Store Estádio', 'lat': 38.75, 'lng': -9.18,
               'address': None, 'category': 'shopping', 'category_path': None, 'confidence': 0.9,
               'source_datasets': 'Overture|meta'}
        status, types, attributes, _ = promote.decide(row, mapping, reachable, brands, kinds, cuisines,
                                                      financial, store_brands, {})
        self.assertEqual(status, 'promoted')
        self.assertIn(('store_kind', 'club_store'), attributes)


if __name__ == '__main__':
    unittest.main()
