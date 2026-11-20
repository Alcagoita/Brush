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


class CleanupCasesTest(unittest.TestCase):
    """Lisbon cleanup dry run, 2026-11-16."""
    def test_a_mosque_and_a_church_of_one_parish_are_two_places(self):
        a = place('Masjid BaiturRahim, Arroios, Lisboa', 38.7330, -9.1350, 'mosque')
        b = place('Fabrica da Igreja Paroquial de São Jorge de Arroios', 38.7331, -9.1351, 'church')
        self.assertEqual(li.verdict(a, b, TERMS), 'separate')

    def test_churches_named_after_one_town_are_not_merged_across_it(self):
        li.add_place_names(['Sacavém'])  # as run_landmark_cleanup adds every Overture locality
        a = place('Assembleia de Deus de Sacavém', 38.7900, -9.1050, 'church')
        b = place('Igreja de Sacavém', 38.7905, -9.1050, 'church')  # ~55 m
        self.assertNotEqual(li.verdict(a, b, TERMS), 'duplicate')


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


class SampleCasesTest(unittest.TestCase):
    """KAN-461 import sample through the endpoint, 2026-11-18."""
    def test_the_same_name_under_two_sources_types_is_one_place(self):
        a = place('Reserva Florestal de Recreio da Boca da Baleia', 39.39416, -31.20762, 'hiking_area')
        b = place('Reserva Florestal de Recreio da Boca da Baleia', 39.39490, -31.20700, 'park')  # ~97 m
        self.assertEqual(li.verdict(a, b, TERMS), 'duplicate')

    def test_the_same_name_far_apart_is_still_two(self):
        a = place('Reserva Florestal de Recreio', 39.39416, -31.20762, 'hiking_area')
        b = place('Reserva Florestal de Recreio', 39.39700, -31.20762, 'park')  # ~316 m
        self.assertEqual(li.verdict(a, b, TERMS), 'separate')

    def test_madalena_in_two_languages_is_one_church(self):
        a = place('Igreja de Madalena', 38.71039, -9.13490, 'church')
        b = place('Church of Saint Mary Magdalene', 38.71046, -9.13493, 'church')  # ~8 m
        self.assertEqual(li.verdict(a, b, TERMS), 'duplicate')

    def test_a_chapel_tagged_as_a_viewpoint_is_a_church(self):
        import import_landmarks as il
        c = {'name': 'Capela de Monserrate', 'type': 'viewpoint', 'types': ['viewpoint'], 'lat': 41.81454, 'lng': -8.44285}
        self.assertEqual(il.type_from_name(c, TERMS), 'church')
        self.assertEqual(c['types'], ['church', 'viewpoint'])

    def test_a_viewpoint_without_a_building_name_stays_a_viewpoint(self):
        import import_landmarks as il
        c = {'name': 'Miradouro do Gorito', 'type': 'viewpoint', 'types': ['viewpoint'], 'lat': 41.89575, 'lng': -8.80737}
        self.assertEqual(il.type_from_name(c, TERMS), 'viewpoint')


def off(lat, lng, metres_north):
    return lat + metres_north / 111_320, lng


class LisbonCleanupCasesTest(unittest.TestCase):
    """The 12 wrong rows of the Lisbon cleanup dry run, 2026-11-18."""
    def pair(self, a, ta, b, tb, metres):
        lat, lng = 38.7100, -9.1400
        return place(a, lat, lng, ta), place(b, *off(lat, lng, metres), tb)

    def test_a_statue_of_dom_afonso_henriques_is_not_the_cathedral(self):
        a, b = self.pair('Dom Afonso Henriques', 'historical_landmark', 'Catedral Lisboa', 'church', 184)
        self.assertNotEqual(li.verdict(a, b, TERMS), 'duplicate')

    def test_two_galleries_share_only_the_word_gallery(self):
        a, b = self.pair('Galeria Acervo', 'art_gallery', 'Galeria de Arte de São Bento', 'art_gallery', 13)
        self.assertNotEqual(li.verdict(a, b, TERMS), 'duplicate')

    def test_two_ateliers_share_only_the_word_atelier(self):
        for name in ('Atelier João Figueiredo', 'Galeria / Atelier Travessa'):
            a, b = self.pair(name, 'art_gallery', "39'93 Atelier", 'art_gallery', 27)
            self.assertNotEqual(li.verdict(a, b, TERMS), 'duplicate', name)

    def test_two_rooms_of_one_building_are_two_rooms(self):
        a, b = self.pair('Salle Du Chapitre', 'museum', 'Salle De D. Manuel', 'museum', 8)
        self.assertNotEqual(li.verdict(a, b, TERMS), 'duplicate')

    def test_the_square_named_after_the_museum_is_not_the_museum(self):
        a, b = self.pair('Marinha - Museu Marinha - Planetário Calouste Gulbenkian', 'museum',
                         'Praça do Museu de Marinha e do Planetário', 'plaza', 129)
        self.assertEqual(li.verdict(a, b, TERMS), 'separate')

    def test_the_playground_of_a_garden_is_not_the_garden(self):
        a, b = self.pair('Jardim da Cerca da Graça', 'park', 'Parque Infantil do Jardim da Cerca de Graça', 'park', 52)
        self.assertNotEqual(li.verdict(a, b, TERMS), 'duplicate')

    def test_scouts_and_catechism_are_not_places_to_visit(self):
        for name in ('CNE Agrupamento 1100 Parque das Nações', 'Catequese - Paróquia da Venda Nova - Amadora'):
            self.assertIsNotNone(li.not_a_place(place(name, 0, 0, 'church'), TERMS), name)
        self.assertIsNone(li.not_a_place(place('A Ponte - Igreja Evangélica Baptista Do Parque Das Nações', 0, 0, 'church'), TERMS))


class KeeperTest(unittest.TestCase):
    """Which row of a duplicate stays: the place, never its playground or social centre."""
    def keep(self, *names):
        import run_landmark_cleanup as rlc
        rows = [{'id': f'fsq:{i}', 'source': 'curated', 'name': n, 'lat': 38.71, 'lng': -9.14, 'type': 'park'}
                for i, n in enumerate(names)]
        rows[-1]['source'], rows[-1]['id'] = 'overture', 'gers-1'  # the part comes from the base: still not kept
        return rlc.keeper(rows)['name']

    def test_the_park_is_kept_over_its_playground(self):
        self.assertEqual(self.keep('Mata de Benfica - Parque Silva Porto', 'Parque Infantil do Parque Silva Porto'),
                         'Mata de Benfica - Parque Silva Porto')

    def test_the_parish_is_kept_over_its_social_centre(self):
        self.assertEqual(self.keep('Paróquia de Cristo Rei de Algés - Miraflores', 'Centro Social da Paroquia Cristo Rei de Algés'),
                         'Paróquia de Cristo Rei de Algés - Miraflores')


class CountryDryRunCasesTest(unittest.TestCase):
    """The country cleanup dry run d1fb28ab, sampled 2026-11-18/19."""
    @classmethod
    def setUpClass(cls):
        li.add_place_names(['Castelo Branco', 'Estoril', 'Albufeira', 'Maia', 'Ajuda', 'Alcácer do Sal', 'Abrantes'])

    def v(self, a, ta, b, tb, metres):
        lat, lng = 38.7100, -9.1400
        return li.verdict(place(a, lat, lng, ta), place(b, *off(lat, lng, metres), tb), TERMS)

    def test_a_town_named_castle_is_not_a_castle(self):
        self.assertNotEqual(self.v('Sé Catedral de Castelo Branco', 'church',
                                   'Pastoral Familiar Portalegre - Castelo Branco', 'church', 38), 'duplicate')

    def test_the_beach_named_after_the_fort_is_the_beach(self):
        self.assertEqual(self.v('Castelo Do Queijo', 'historical_landmark', 'Praia do Castelo do Queijo', 'beach', 40), 'separate')

    def test_two_beaches_do_not_share_the_word_beach(self):
        self.assertNotEqual(self.v('Praia Marinha, Algarve', 'beach', 'Praia da Cala', 'beach', 0), 'duplicate')
        self.assertNotEqual(self.v('Praia da Coelha, Albufeira, Algarve - Portugal', 'beach', 'Albufeira , Praia Da Galé', 'beach', 11), 'duplicate')
        self.assertNotEqual(self.v('praia do calhau da maia', 'beach', 'Praia De Maia', 'beach', 33), 'duplicate')

    def test_a_church_named_after_its_town_is_not_every_church_there(self):
        self.assertNotEqual(self.v('Igreja dos Salesianos Estoril', 'church', 'Igreja de Santo António do Estoril', 'church', 27), 'duplicate')

    def test_short_names_need_the_same_word_not_a_similar_one(self):
        self.assertNotEqual(self.v('Paulo & Marta Madeira', 'park', 'Leonel Paulino Santos Husqvarna Alcobaça', 'park', 186), 'duplicate')

    def test_two_social_centres_share_only_the_words(self):
        self.assertNotEqual(self.v('Centro Social Interparoquial de Abrantes', 'church',
                                   'Centro Social do Pessoal do Município de Abrantes', 'church', 95), 'duplicate')

    def test_the_castle_is_kept_over_its_crypt(self):
        import run_landmark_cleanup as rlc
        rows = [{'id': 'gers-1', 'source': 'overture', 'name': 'Cripta Arqueológica do Castelo de Alcácer do Sal',
                 'lat': 38.37, 'lng': -8.51, 'type': 'museum'},
                {'id': 'fsq:1', 'source': 'curated', 'name': 'Castillo de Alcácer do Sal', 'lat': 38.37, 'lng': -8.51,
                 'type': 'historical_landmark'}]
        self.assertEqual(rlc.keeper(rows)['name'], 'Castillo de Alcácer do Sal')

    def test_a_museum_of_the_scouts_is_a_museum(self):
        self.assertIsNone(li.not_a_place(place('Museu do CNE', 0, 0, 'museum'), TERMS))

    def test_the_parish_church_in_two_names_is_one(self):
        self.assertEqual(self.v('Igreja Paroquial da Ajuda', 'church', 'Igreja de Nossa Senhora da Ajuda', 'church', 13), 'duplicate')

    def test_madalena_and_the_martires_still_merge(self):
        self.assertEqual(self.v('Igreja de Madalena', 'church', 'Church of Saint Mary Magdalene', 'church', 8), 'duplicate')
        self.assertEqual(self.v('Basílica de Nossa Senhora dos Mártires', 'church', 'Basílica dos Mártires', 'church', 20), 'duplicate')


class BeachTest(unittest.TestCase):
    """Owner, 2026-11-19: beaches merge only on the same name words."""
    @classmethod
    def setUpClass(cls):
        li.add_place_names(['Albufeira', 'Maia'])

    def v(self, a, b, metres):
        lat, lng = 37.09, -8.25
        return li.verdict(place(a, lat, lng, 'beach'), place(b, *off(lat, lng, metres), 'beach'), TERMS)

    def test_the_same_beach_under_similar_names_is_one(self):
        self.assertEqual(self.v('Praia da Oura', 'Praia Da Oura (Oura Beach)', 50), 'duplicate')
        self.assertEqual(self.v('Praia da Falésia', 'Falésia Bay', 120), 'duplicate')
        self.assertEqual(self.v('Playa De Falesia', 'Praia da Falésia', 80), 'duplicate')
        self.assertEqual(self.v('Praia Maria Luísa', 'Praia Maria Luisa', 30), 'duplicate')
        self.assertEqual(self.v('Albufeira Playa De Los Pescadores', 'Praia dos Pescadores', 60), 'duplicate')

    def test_different_names_side_by_side_are_two_beaches(self):
        for a, b in (('Praia De Castelo Albufeira', 'Albufeira , Praia Da Galé'),
                     ('Praia da Ponta Pequena', 'Praia Ponta Grande Cala'),
                     ('Praia Marinha, Algarve', 'Praia da Cala'),
                     ('praia do calhau da maia', 'Praia De Maia'),
                     ('AlfaMar Praia da Falesia', 'Praia da Falésia')):
            self.assertEqual(self.v(a, b, 10), 'separate', a)

    def test_far_apart_the_same_name_is_two_beaches(self):
        self.assertEqual(self.v('Praia da Rocha', 'Praia da Rocha', 900), 'separate')


class AllWordsWithinTest(unittest.TestCase):
    """The dry run 31209166, sampled 2026-11-19: one place only when one name is inside the other."""
    @classmethod
    def setUpClass(cls):
        li.add_place_names(['Porto', 'Mateus', 'Alfornelos', 'Mafamude'])

    def v(self, a, ta, b, tb, metres):
        lat, lng = 41.147, -8.616
        return li.verdict(place(a, lat, lng, ta), place(b, *off(lat, lng, metres), tb), TERMS)

    def test_the_twin_churches_of_porto_are_two(self):
        self.assertNotEqual(self.v('Ordem do Carmo', 'church', 'Igreja da Nossa Senhora do Carmo das Carmelitas', 'church', 20), 'duplicate')

    def test_a_shared_town_name_is_not_a_place(self):
        self.assertNotEqual(self.v('Matriz Associação de Gravura do Porto', 'art_gallery', 'Eye Origin Porto', 'art_gallery', 20), 'duplicate')

    def test_one_name_inside_the_other_is_one_place(self):
        self.assertEqual(self.v('Museu Escola de Artes Decorativas da Fundação Ricardo do Espírito Santo Silva', 'museum',
                                'Museu de Artes Decorativas', 'museum', 30), 'duplicate')
        self.assertEqual(self.v('Parque de Lazer das Camélias', 'park', 'Parque das Camélias', 'park', 60), 'duplicate')
        self.assertEqual(self.v('Miradouro Da Garganta Funda', 'viewpoint', 'Garganta Funda', 'viewpoint', 30), 'duplicate')
        self.assertEqual(self.v('Igreja Paroquial De Mafamude', 'church', 'Igreja de Mafamude', 'church', 20), 'duplicate')

    def test_the_ruins_and_their_museum_are_two(self):
        self.assertNotEqual(self.v('Ruínas de Conímbriga', 'historical_landmark', 'Museu Monográfico de Conimbriga', 'museum', 80), 'duplicate')


if __name__ == '__main__':
    unittest.main()
