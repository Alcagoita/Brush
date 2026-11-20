"""KAN-461. The same café under two spellings is one place."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import import_osm_archive as ia  # noqa: E402
import preflight_foursquare_archive as preflight  # noqa: E402

# Odivelas, Rua Aquilino Ribeiro (owner, 2026-11-16).
ENCONTRO = {'source': 'overture', 'id': 'o1', 'name': 'Café Encontro', 'lat': 38.79749, 'lng': -9.179078, 'type': 'cafe'}


def record(name, lat=38.79729, lng=-9.17919, poi_type='cafe'):
    return {'name': name, 'lat': lat, 'lng': lng, 'type': poi_type}


class CoreNameTest(unittest.TestCase):
    def test_generic_words_and_place_suffix_come_off(self):
        self.assertEqual(ia.core_name('O Encontro - Odivelas'), 'encontro')
        self.assertEqual(ia.core_name('Café Encontro'), 'encontro')
        self.assertEqual(ia.core_name('Pastelaria 109'), ia.core_name('109 Pastelaria'))
        self.assertEqual(ia.core_name('Pão Quente Magirus'), ia.core_name('Padaria Magirus'))

    def test_a_name_that_is_only_generic_has_no_core(self):
        self.assertEqual(ia.core_name('Café Snack-Bar'), '')


class CoreTwinTest(unittest.TestCase):
    def grid(self, *places):
        return preflight.grid_index(list(places))

    def test_the_encontro_pair_is_one_place(self):
        self.assertIs(ia.core_twin(record('O Encontro - Odivelas'), self.grid(ENCONTRO)), ENCONTRO)

    def test_further_than_fifty_metres_is_another_place(self):
        far = record('O Encontro', lat=38.79749 + 0.0006)  # ~67 m north
        self.assertIsNone(ia.core_twin(far, self.grid(ENCONTRO)))

    def test_a_cafe_in_a_petrol_station_is_two_places(self):
        bp = {'source': 'overture', 'id': 'g', 'name': 'BP', 'lat': 38.79749, 'lng': -9.179078, 'type': 'gas'}
        self.assertIsNone(ia.core_twin(record('Café BP'), self.grid(bp)))

    def test_a_bar_and_a_cafe_of_one_name_are_one_place(self):
        bar = dict(ENCONTRO, name='Sai de Gatas - Rock Bar', type='bar')
        self.assertIs(ia.core_twin(record('Café Sai de Gatas'), self.grid(bar)), bar)

    def test_outside_the_food_family_the_rule_does_not_apply(self):
        self.assertIsNone(ia.core_twin(record('Parque Encontro', poi_type='park'), self.grid(ENCONTRO)))


if __name__ == '__main__':
    unittest.main()
