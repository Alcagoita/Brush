"""KAN-461. When two landmark rows are one place — Belém, ruled by the owner on 2026-11-16."""
import json
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

import landmark_identity as li  # noqa: E402

TERMS = li.load_terms()
BELEM = {r['name']: r for r in json.load(open(os.path.join(HERE, 'fixtures', 'belem_landmarks.json'), encoding='utf-8'))['rows']}


def v(a, b):
    return li.verdict(BELEM[a], BELEM[b], TERMS)


def place(name, lat, lng, poi_type='historical_landmark'):
    return {'name': name, 'lat': lat, 'lng': lng, 'type': poi_type}


class KindTest(unittest.TestCase):
    def test_kind_comes_from_the_name_in_any_language(self):
        self.assertEqual(li.describe(place('Mosteiro dos Jerónimos', 0, 0, 'church'), TERMS)[0], 'monastery')
        self.assertEqual(li.describe(place('Jerónimos Monastery', 0, 0, 'church'), TERMS)[0], 'monastery')
        self.assertEqual(li.describe(place('Sepultura de Vasco da Gama', 0, 0), TERMS)[0], 'tomb')
        self.assertEqual(li.describe(place('Monasterio de El Escorial', 0, 0), TERMS)[0], 'monastery')

    def test_two_languages_share_the_distinctive_word(self):
        pt = li.describe(place('Mosteiro dos Jerónimos', 0, 0), TERMS)[1]
        en = li.describe(place('Jerónimos Monastery', 0, 0), TERMS)[1]
        self.assertEqual(pt, en)


class BelemTest(unittest.TestCase):
    def test_the_same_tomb_under_three_names_is_one(self):
        self.assertEqual(v('Túmulos de Luís de Camões e Vasco da Gama', 'Túmulo de Camões'), 'duplicate')
        self.assertEqual(v('Sepultura de Luis de Camões', 'Túmulo de Camões'), 'duplicate')
        self.assertEqual(v('Túmulo de Fernando Pessoa', 'Tumulo De Fernando Pessoa'), 'duplicate')

    def test_the_same_museum_under_two_names_is_one(self):
        self.assertEqual(v('Marinha - CulturaMar', 'Museu da Marinha'), 'duplicate')

    def test_church_and_cloister_by_the_monastery_need_a_person(self):
        self.assertEqual(v('Igreja dos Jerónimos', 'Jerónimos Monastery'), 'validate')
        self.assertEqual(v('Claustro do Mosteiro dos Jerónimos', 'Jerónimos Monastery'), 'validate')

    def test_the_square_named_after_the_monastery_is_its_own_place(self):
        self.assertEqual(v('Largo dos Jerónimos', 'Jerónimos Monastery'), 'separate')

    def test_distinct_landmarks_stay(self):
        self.assertEqual(v('Monumento ao Suplício dos Tavoras', 'Jerónimos Monastery'), 'separate')
        self.assertEqual(v('Jardim Botânico Tropical', 'Museu da Marinha'), 'separate')


class OwnerRulesTest(unittest.TestCase):
    def test_a_monastery_a_fountain_and_a_tower_are_three_places(self):
        mon = place('Mosteiro de Alcobaça', 39.5481, -8.9800, 'church')
        fountain = place('Chafariz de Alcobaça', 39.5482, -8.9801)
        tower = place('Torre de Alcobaça', 39.5480, -8.9799)
        self.assertEqual(li.verdict(mon, fountain, TERMS), 'separate')
        self.assertEqual(li.verdict(mon, tower, TERMS), 'separate')
        self.assertEqual(li.verdict(fountain, tower, TERMS), 'separate')

    def test_two_monasteries_close_together_are_a_red_flag(self):
        a = place('Mosteiro de Santa Maria', 39.5481, -8.9800, 'church')
        b = place('Real Abadia', 39.5484, -8.9800, 'church')  # ~33 m, another name
        self.assertEqual(li.verdict(a, b, TERMS), 'validate')

    def test_far_apart_the_same_name_is_two_places(self):
        a = place('Capela de São João', 38.70, -9.14)
        b = place('Capela de São João', 38.71, -9.14)  # ~1.1 km
        self.assertEqual(li.verdict(a, b, TERMS), 'separate')


if __name__ == '__main__':
    unittest.main()
