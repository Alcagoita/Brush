"""KAN-517. A floor from the operator's own store page, onto the row that answers the unit.

Location texts are UBBO's, read from its store pages on 2026-11-14.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import mall_floors as mf  # noqa: E402

ALIASES = {'Praça Central': '0'}


class FloorFromLocationTest(unittest.TestCase):
    def test_stated_piso(self):
        self.assertEqual(mf.floor_from_location('Piso 0 Loja 0.004 C'), ('0', 'Piso stated'))
        self.assertEqual(mf.floor_from_location('Piso 1, L1.083'), ('1', 'Piso stated'))
        self.assertEqual(mf.floor_from_location('Piso -1, Zona Azul'), ('-1', 'Piso stated'))
        self.assertEqual(mf.floor_from_location('Piso 1'), ('1', 'Piso stated'))

    def test_piso_without_a_unit_number_is_enough(self):
        self.assertEqual(mf.floor_from_location('Piso 0, em frente à Emma')[0], '0')
        self.assertEqual(mf.floor_from_location('Átrio do Piso 0')[0], '0')

    def test_unit_number_when_no_piso_is_stated(self):
        for text in ('L0.040', 'Lojas 0.013 + 0.014', 'Piso Loja 0.060', 'Praça Central, Loja 0.003'):
            self.assertEqual(mf.floor_from_location(text, ALIASES), ('0', 'unit number'), text)

    def test_a_place_the_centre_puts_on_a_floor(self):
        floor, how = mf.floor_from_location('Praça Central, R6', ALIASES)
        self.assertEqual(floor, '0')
        self.assertIn('Praça Central', how)

    def test_the_alias_belongs_to_one_centre(self):
        self.assertEqual(mf.floor_from_location('Praça Central')[0], None)

    def test_conflict_between_piso_and_unit_is_no_floor(self):
        floor, how = mf.floor_from_location('Piso 1 Loja 0.073')
        self.assertIsNone(floor)
        self.assertIn('conflict', how)

    def test_two_floors_stores_the_first_and_says_so(self):
        floor, how = mf.floor_from_location('Piso 0 e 1 Loja 0.020+0.021+0.022+1.027')
        self.assertEqual(floor, '0')
        self.assertIn('spans', how)

    def test_nothing_stated_is_no_floor(self):
        self.assertEqual(mf.floor_from_location('')[0], None)
        self.assertEqual(mf.floor_from_location('Praça da Alimentação')[0], None)

    def test_kiosk_numbers_are_not_unit_numbers(self):
        self.assertEqual(mf.floor_from_location('Piso 1 Quiosque 112A'), ('1', 'Piso stated'))


def page(name, location):
    return {'name': name, 'location': location, 'page': name.lower() + '/'}


def row(name, rid, source='overture', floor=None):
    return {'poi_id': rid, 'name': name, 'source': source, 'floor': floor,
            'lat': 38.7769534, 'lng': -9.2204064}


class PlanTest(unittest.TestCase):
    def test_each_unit_gets_its_own_page_and_row(self):
        tenants = [('Mango', ''), ('Mango Man', ''), ('Salsa', '')]
        pages = [page('Mango', 'Piso 1 Loja 1.128'), page('Mango Man', 'Piso 1 Loja 1.038'),
                 page('Salsa Jeans', 'Piso 1 Loja 1.146')]
        rows = [row('Mango', 'o1'), row('Mango Man', 'mall:ubbo:mango-man', 'community'), row('Salsa', 'o2')]
        out = mf.plan(tenants, pages, rows, 'UBBO')
        self.assertEqual([(n, p['name'], f, r['poi_id']) for n, p, f, _, r in out], [
            ('Mango', 'Mango', '1', 'o1'),
            ('Mango Man', 'Mango Man', '1', 'mall:ubbo:mango-man'),
            ('Salsa', 'Salsa Jeans', '1', 'o2')])

    def test_a_unit_with_no_page_keeps_no_floor(self):
        out = mf.plan([('Havaianas', '')], [page('Mango', 'Piso 1')], [row('Havaianas', 'o1')], 'UBBO')
        self.assertEqual(out[0][2], None)
        self.assertEqual(out[0][3], 'no page on the operator site')


class UpdatesTest(unittest.TestCase):
    def test_each_table_and_only_changes(self):
        records = [
            ('A', None, '0', 'Piso stated', row('A', 'o1')),
            ('B', None, '1', 'Piso stated', row('B', 'mall:ubbo:b', 'community')),
            ('C', None, '1', 'Piso stated', row('C', 'o3', floor='1')),      # already right
            ('D', None, None, 'no page', row('D', 'o4')),                    # nothing to write
            ('E', None, '0', 'Piso stated', None),                           # nothing answers it
        ]
        sql = list(mf.updates(records, '2026-11-14', 'kan-517-mall-floors'))
        self.assertEqual(len(sql), 2)
        self.assertIn("UPDATE overture_poi SET floor = '0'", sql[0])
        self.assertIn("WHERE overture_id = 'o1'", sql[0])
        self.assertIn("UPDATE curated_poi SET floor = '1'", sql[1])
        self.assertIn("updated_by = 'kan-517-mall-floors' WHERE poi_id = 'mall:ubbo:b'", sql[1])

    def test_a_quote_in_an_id_is_escaped(self):
        sql = list(mf.updates([('X', None, '0', '', row('X', "o'1"))], 'd', 'a'))
        self.assertIn("'o''1'", sql[0])


class ReadPagesTest(unittest.TestCase):
    def test_temporarily_closed_suffix_is_not_part_of_the_name(self):
        import tempfile
        with tempfile.NamedTemporaryFile('w', suffix='.tsv', delete=False, encoding='utf-8') as fh:
            fh.write('# header\nJeronymo | Encerrada temporariamente\tCafé\tPiso 1 Loja 1.116A\tjeronymo/\n'
                     'La Casa de las Carcasas – Encerrada Temporariamente\tX\tPiso 0 Loja 0.085\tla-casa/\n')
        pages = mf.read_pages(fh.name)
        os.unlink(fh.name)
        self.assertEqual([p['name'] for p in pages], ['Jeronymo', 'La Casa de las Carcasas'])


if __name__ == '__main__':
    unittest.main()
