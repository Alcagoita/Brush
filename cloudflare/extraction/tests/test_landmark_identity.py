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
        self.assertEqual(li.describe(place('Mosteiro dos Jerónimos', 0, 0, 'church'), TERMS)[0], {'monastery'})
        self.assertEqual(li.describe(place('Jerónimos Monastery', 0, 0, 'church'), TERMS)[0], {'monastery'})
        self.assertEqual(li.describe(place('Sepultura de Vasco da Gama', 0, 0), TERMS)[0], {'tomb'})
        self.assertEqual(li.describe(place('Monasterio de El Escorial', 0, 0), TERMS)[0], {'monastery'})

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

    def test_the_church_by_the_monastery_needs_a_person(self):
        self.assertEqual(v('Igreja dos Jerónimos', 'Jerónimos Monastery'), 'validate')

    def test_the_cloister_of_the_monastery_is_the_monastery(self):
        # "Claustro do Mosteiro dos Jerónimos" names the monastery: owner folded it in.
        self.assertEqual(v('Claustro do Mosteiro dos Jerónimos', 'Jerónimos Monastery'), 'duplicate')

    def test_the_square_named_after_the_monastery_is_its_own_place(self):
        self.assertEqual(v('Largo dos Jerónimos', 'Jerónimos Monastery'), 'separate')

    def test_distinct_landmarks_stay(self):
        self.assertEqual(v('Monumento ao Suplício dos Tavoras', 'Jerónimos Monastery'), 'separate')
        self.assertEqual(v('Jardim Botânico Tropical', 'Museu da Marinha'), 'separate')


class SeAndTorreTest(unittest.TestCase):
    """Lisbon's Sé and Torre de Belém, 2026-11-16."""
    def test_the_cathedral_in_two_languages_is_one(self):
        a = place('Lisbon Cathedral', 38.70990, -9.13306, 'church')
        b = place('Catedral Lisboa', 38.70990, -9.13426, 'church')  # ~104 m
        self.assertEqual(li.verdict(a, b, TERMS), 'duplicate')

    def test_the_city_in_the_name_does_not_make_two_churches_one(self):
        a = place('Igreja de Santa Maria Maior de Lisboa', 38.70990, -9.13306, 'church')
        b = place('Igreja de Santo António de Lisboa', 38.70990, -9.13375, 'church')  # ~60 m
        self.assertEqual(li.verdict(a, b, TERMS), 'separate')

    def test_the_lighthouse_of_the_tower_is_the_tower(self):
        a = place('Torre de Belém', 38.69158, -9.21598)
        b = place('Phare de la Tour de Belém', 38.69170, -9.21590, 'lighthouse')  # ~15 m
        self.assertEqual(li.verdict(a, b, TERMS), 'duplicate')

    def test_a_saint_in_two_languages_is_one_church(self):
        a = place('Church of Saint Mary Magdalene', 38.70990, -9.13306, 'church')
        b = place('Igreja de Madalena', 38.71000, -9.13310, 'church')  # ~12 m
        self.assertEqual(li.verdict(a, b, TERMS), 'duplicate')

    def test_rentals_addresses_and_bare_place_names_are_not_places(self):
        for name in ('Downtown Alfama RIVER VIEW Apartment', 'Madalena Home Deluxe', 'Rua das Canastras', 'Lisboa Portugal'):
            self.assertIsNotNone(li.not_a_place(place(name, 0, 0), TERMS), name)
        for name in ('Torre de Belém', 'Jerónimos Monastery', 'Elevador da Sé'):
            self.assertIsNone(li.not_a_place(place(name, 0, 0), TERMS), name)


class StatueTest(unittest.TestCase):
    def test_a_bust_is_the_monument_osm_names_after_the_person(self):
        a = place('Busto De Augusto Rosa', 38.71010, -9.13330)
        b = place('Augusto Rosa', 38.71012, -9.13335)  # OSM historic=memorial, ~5 m
        self.assertEqual(li.verdict(a, b, TERMS), 'duplicate')


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
