"""KAN-439. Writing a centre's published tenant list into `curated_poi`.

The rule being served: every listed tenant gets a row, nothing unlisted is
ever created, and Overture and OSM only say *where* a listed tenant is.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import import_mall_tenants as writer  # noqa: E402
import mall_footprints as mf  # noqa: E402

UBBO = mf.load()['UBBO']
INSIDE = (38.776436, -9.220108)
FAR_AWAY = (41.150000, -8.610000)

TYPES = {
    'zara': ('store', 'clothing', [], 'ruled by a person'),
    'maria croissant': ('bakery', None, ['cafe'], 'ruled by a person'),
    'starbucks': ('cafe', None, [], 'OSM cafe'),
    'wells': ('store', 'drugstore', [], 'held elsewhere in Portugal'),
}


def tenants(*pairs):
    return list(pairs)


class PlacementTest(unittest.TestCase):
    def place(self, listed, held=(), osm=()):
        return writer.placements(listed, list(held), list(osm), UBBO, 'ubbo', TYPES, 'UBBO')

    def test_a_held_row_carrying_the_mall_or_a_shop_word_still_counts_as_held(self):
        """The regression that wrote 58 duplicates on 2026-10-23. A venue
        inside a mall carries the mall, the city and its own shop word in its
        name, so an exact match misses the row and creates a second one."""
        for held_name in ('Loja Zara', 'Zara, UBBO Shopping', 'Zara Amadora'):
            to_write, already, _ = self.place(
                tenants(('Zara', 'Piso 1')),
                held=[{'name': held_name, 'lat': INSIDE[0], 'lng': INSIDE[1]}])
            self.assertEqual(to_write, [], f'{held_name} is the Zara we already serve')
            self.assertEqual(len(already), 1)

    def test_a_different_shop_with_a_similar_name_is_not_held(self):
        """`Auchan Ótica` is its own unit beside `Auchan` (owner, 2026-10-05),
        so a loose test must not swallow it."""
        to_write, already, _ = self.place(
            tenants(('Starbucks', '')),
            held=[{'name': 'Star Pizza', 'lat': INSIDE[0], 'lng': INSIDE[1]}])
        self.assertEqual(len(to_write), 1)
        self.assertEqual(already, [])

    def test_a_tenant_we_already_hold_is_not_written_again(self):
        to_write, already, untyped = self.place(
            tenants(('Zara', 'Piso 1')), held=[{'name': 'Zara', 'lat': INSIDE[0], 'lng': INSIDE[1]}])
        self.assertEqual(to_write, [])
        self.assertEqual([t for t, _ in already], ['Zara'])

    def test_osm_places_a_listed_tenant_inside_the_centre(self):
        to_write, _, _ = self.place(
            tenants(('Starbucks', '')),
            osm=[{'name': 'Starbucks', 'lat': INSIDE[0], 'lng': INSIDE[1], 'level': '1'}])
        self.assertEqual(len(to_write), 1)
        self.assertEqual(to_write[0]['placed_by'], 'osm')
        self.assertEqual((to_write[0]['lat'], to_write[0]['lng']), INSIDE)
        self.assertEqual(to_write[0]['floor'], 'Piso 1', 'OSM level fills a missing Piso')

    def test_an_osm_row_outside_the_centre_does_not_place_a_tenant(self):
        """A shop of the same name in another town is not this tenant."""
        to_write, _, _ = self.place(
            tenants(('Starbucks', '')),
            osm=[{'name': 'Starbucks', 'lat': FAR_AWAY[0], 'lng': FAR_AWAY[1]}])
        self.assertEqual(to_write[0]['placed_by'], 'centre')

    def test_the_operators_piso_outranks_osm_level(self):
        to_write, _, _ = self.place(
            tenants(('Starbucks', 'Piso 2')),
            osm=[{'name': 'Starbucks', 'lat': INSIDE[0], 'lng': INSIDE[1], 'level': '1'}])
        self.assertEqual(to_write[0]['floor'], 'Piso 2')

    def test_a_tenant_nothing_can_place_goes_at_the_centre(self):
        to_write, _, _ = self.place(tenants(('Zara', 'Piso 1')))
        self.assertEqual(to_write[0]['placed_by'], 'centre')
        self.assertEqual([to_write[0]['lat'], to_write[0]['lng']], UBBO['centroid'])
        self.assertEqual(to_write[0]['floor'], 'Piso 1')

    def test_an_untyped_tenant_is_reported_and_never_written(self):
        """No bare `store`: a tenant we cannot type is skipped, not guessed."""
        to_write, _, untyped = self.place(tenants(('Something Unknown', '')))
        self.assertEqual(to_write, [])
        self.assertEqual(untyped, ['Something Unknown'])


class IdempotenceTest(unittest.TestCase):
    def test_the_id_is_derived_so_a_re_run_writes_nothing(self):
        first = writer.poi_id('ubbo', 'Perfumes & Companhia')
        self.assertEqual(first, writer.poi_id('ubbo', 'Perfumes & Companhia'))
        self.assertEqual(first, writer.poi_id('ubbo', 'perfumes   &  companhia'))

    def test_the_same_brand_in_two_centres_is_two_places(self):
        self.assertNotEqual(writer.poi_id('ubbo', 'Zara'), writer.poi_id('amoreiras', 'Zara'))

    def test_the_insert_does_nothing_on_a_conflict(self):
        self.assertIn('ON CONFLICT (poi_id) DO NOTHING', writer.CURATED_INSERT_SUFFIX)


class StatementTest(unittest.TestCase):
    def rows(self, n=3):
        out = []
        for i in range(n):
            out.append({'tenant': f'Shop {i}', 'poi_id': f'mall:ubbo:shop-{i}',
                        'lat': INSIDE[0], 'lng': INSIDE[1], 'floor': 'Piso 1',
                        'primary': 'store', 'kind': 'clothing', 'extra': [],
                        'placed_by': 'centre', 'evidence': 'test'})
        return out

    def test_every_statement_stays_inside_the_d1_limits(self):
        for statement in writer.statements(self.rows(900), '2026-10-23', 'run-1'):
            self.assertLessEqual(len(statement.encode()), writer.MAX_STATEMENT_BYTES)
            self.assertLessEqual(statement.count('\n('), writer.MAX_VALUES_TERMS + 1)

    def test_a_store_row_carries_its_kind_and_never_a_bare_store(self):
        attributes = list(writer.attribute_values(self.rows(1)[0]))
        self.assertEqual(len(attributes), 1)
        self.assertIn("'store_kind'", attributes[0])
        self.assertIn("'clothing'", attributes[0])

    def test_a_unit_that_is_two_things_carries_both_types(self):
        """Maria Croissant is a bakery AND a cafe (owner, 2026-10-08)."""
        row = {'tenant': 'Maria Croissant', 'poi_id': 'mall:ubbo:maria-croissant',
               'lat': INSIDE[0], 'lng': INSIDE[1], 'floor': None,
               'primary': 'bakery', 'kind': None, 'extra': ['cafe'],
               'placed_by': 'centre', 'evidence': 'ruled'}
        attributes = list(writer.attribute_values(row))
        self.assertEqual(len(attributes), 1)
        self.assertIn(writer.EXTRA_TYPE_DIMENSION, attributes[0])
        self.assertIn("'cafe'", attributes[0])

    def test_the_extra_type_dimension_matches_what_production_uses(self):
        """curated_poi_attribute already holds 245 `poi_type` rows; inventing
        a second name for the same idea would hide them from nearby."""
        self.assertEqual(writer.EXTRA_TYPE_DIMENSION, 'poi_type')

    def test_provenance_is_recorded_on_every_row(self):
        value = writer.curated_value(self.rows(1)[0], '2026-10-23', 'run-1')
        for expected in ("'community'", "'mall_directory'", "'ODbL'", "'run-1'", "'active'"):
            self.assertIn(expected, value)

    def test_the_country_code_is_set_so_the_name_picker_can_resolve(self):
        """KAN-471: a curated row without a country takes the no-country
        branch in selectPoiName and can never show a native name."""
        self.assertIn("'PT'", writer.curated_value(self.rows(1)[0], '2026-10-23', 'run-1'))


if __name__ == '__main__':
    unittest.main()
