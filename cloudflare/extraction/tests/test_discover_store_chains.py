"""KAN-457. Chain discovery measures concentration on the mapped kind."""
import csv
import os
import sys
import tempfile
import unittest

EXTRACTION_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, EXTRACTION_DIR)
os.environ.setdefault('BRUSH_TYPE_RELATION', 'sql')

import discover_store_chains as discover

FIELDS = ('overture_id', 'name', 'lat', 'lng', 'address', 'locality', 'category', 'basic_category',
          'category_path', 'confidence', 'source_datasets')

# Paths as the Portugal archive reports them; the `_store` spelling in the
# path over a `_shop` category is Meta's, not ours.
PATHS = {
    'gift_shop': 'shopping|specialty_store|flowers_and_gifts_store|gift_shop',
    'flowers_and_gifts_shop': 'shopping|specialty_store|flowers_and_gifts_store',
    'souvenir_shop': 'shopping|specialty_store|souvenir_store',
    'home_goods_store': 'shopping|home_and_garden|home_goods_store',
    'kitchen_and_bath': 'shopping|home_and_garden|kitchen_and_bath',
    'home_decor': 'shopping|home_and_garden|home_decor',
    'clothing_store': 'shopping|fashion_and_apparel_store|clothing_store',
    'pet_store': 'shopping|pet_store',
    'electronics': 'shopping|electronics',
    'shopping': 'shopping',
}


def archive(rows):
    handle = tempfile.NamedTemporaryFile('w', suffix='.csv', delete=False, newline='')
    writer = csv.DictWriter(handle, fieldnames=FIELDS)
    writer.writeheader()
    for i, (name, category) in enumerate(rows):
        writer.writerow({'overture_id': f'id{i}', 'name': name, 'lat': 1, 'lng': 1,
                         'category': category, 'category_path': PATHS.get(category, category)})
    handle.close()
    return handle.name


def proposals(rows):
    path = archive(rows)
    try:
        return {p['head']: p for p in discover.discover(path)}
    finally:
        os.unlink(path)


class MappedKindTest(unittest.TestCase):
    def test_three_sibling_categories_of_one_kind_are_one_chain(self):
        # 2 + 2 + 2 over three categories: 33% on the raw category, 100%
        # on the kind they all map to.
        found = proposals([('Zé Home Lisboa', 'home_goods_store'), ('Zé Home Porto', 'home_goods_store'),
                           ('Zé Home Faro', 'kitchen_and_bath'), ('Zé Home Braga', 'kitchen_and_bath'),
                           ('Zé Home Évora', 'home_decor'), ('Zé Home Viseu', 'home_decor')])
        self.assertIn('ze home', found)
        self.assertEqual((found['ze home']['poi_type'], found['ze home']['store_kind']), ('store', 'home'))
        self.assertEqual(found['ze home']['concentration'], 1.0)
        self.assertEqual(found['ze home']['rows'], 6)

    def test_unrelated_kinds_are_not_a_chain(self):
        found = proposals([('Zé Tudo Lisboa', 'clothing_store'), ('Zé Tudo Porto', 'clothing_store'),
                           ('Zé Tudo Faro', 'pet_store'), ('Zé Tudo Braga', 'pet_store'),
                           ('Zé Tudo Évora', 'electronics'), ('Zé Tudo Viseu', 'electronics')])
        self.assertNotIn('ze tudo', found)

    def test_the_raw_breakdown_survives_for_review(self):
        found = proposals([('Zé Home Lisboa', 'home_goods_store'), ('Zé Home Porto', 'home_goods_store'),
                           ('Zé Home Faro', 'kitchen_and_bath')])
        self.assertEqual(found['ze home']['categories'], 'home_goods_store:2|kitchen_and_bath:1')
        self.assertEqual(found['ze home']['majority_category'], 'home_goods_store')


class UmbrellaTest(unittest.TestCase):
    ALE_HOP = ([('Ale-Hop', 'flowers_and_gifts_shop')] * 10 + [('Ale-Hop', 'gift_shop')] * 7
               + [('Ale-Hop', 'souvenir_shop'), ('Ale-Hop', 'shopping')])

    def test_a_row_at_the_umbrella_counts_with_the_leaf_under_it(self):
        found = proposals(self.ALE_HOP)
        self.assertIn('ale hop', found)
        self.assertEqual((found['ale hop']['poi_type'], found['ale hop']['store_kind']), ('store', 'gift'))
        # 17 of 18 typed rows; the souvenir row is another kind.
        self.assertEqual(found['ale hop']['concentration'], round(17 / 18, 3))
        self.assertEqual(found['ale hop']['majority_category'], 'gift_shop')
        self.assertEqual(found['ale hop']['in_shopping'], 1)

    def test_an_umbrella_does_not_join_a_leaf_it_is_not_over(self):
        # Souvenirs sit under `souvenir_store`, not `flowers_and_gifts_store`:
        # the umbrella rows stay their own bucket and dilute.
        found = proposals([('Meia Dúzia Lisboa', 'souvenir_shop'), ('Meia Dúzia Porto', 'souvenir_shop'),
                           ('Meia Dúzia Faro', 'flowers_and_gifts_shop'), ('Meia Dúzia Braga', 'flowers_and_gifts_shop')])
        self.assertNotIn('meia duzia', found)

    def test_a_chain_of_florists_is_not_a_store_chain(self):
        found = proposals([('Florista Jardim Lisboa', 'flowers_and_gifts_shop')] * 5)
        self.assertNotIn('florista jardim', found)

    def test_the_tree_is_read_from_the_archive_in_either_spelling(self):
        taxonomy = discover.Taxonomy()
        taxonomy.learn(PATHS['gift_shop'])
        self.assertTrue(taxonomy.is_ancestor('flowers_and_gifts_shop', 'gift_shop'))
        self.assertTrue(taxonomy.is_ancestor('flowers_and_gifts_store', 'gift_shop'))
        self.assertTrue(taxonomy.is_ancestor('shopping', 'gift_shop'))
        self.assertFalse(taxonomy.is_ancestor('gift_shop', 'flowers_and_gifts_shop'))
        self.assertFalse(taxonomy.is_ancestor('gift_shop', 'gift_shop'))


class GuardsTest(unittest.TestCase):
    def test_a_generic_head_is_still_skipped(self):
        found = proposals([('Loja do Gato Lisboa', 'pet_store')] * 4)
        self.assertNotIn('loja do', found)

    def test_min_rows_still_holds(self):
        found = proposals([('Zé Home Lisboa', 'home_goods_store'), ('Zé Home Porto', 'home_decor')])
        self.assertNotIn('ze home', found)


if __name__ == '__main__':
    unittest.main()
