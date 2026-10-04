"""KAN-439. The double-confirmation rule for door-pinned duplicates.

The failure this guards against is deleting a real shop. Every test below is
a shape measured in production on 2026-10-04, not an invented one.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import mall_door_duplicates as door  # noqa: E402

UBBO_WORDS = {'ubbo', 'dolcevita', 'dolce', 'vita', 'tejo', 'amadora',
              'shopping', 'centro', 'comercial', 'cc', 'sc'}
DOOR = (38.775290, -9.220240)


def row(name, lat, lng, source, address=None, overture_id=None):
    return {'overture_id': overture_id or f'{name}-{source}'.lower(),
            'name': name, 'lat': lat, 'lng': lng, 'address': address,
            'source_datasets': f'Overture|{source}'}


class DoubleConfirmationTest(unittest.TestCase):
    def test_the_measured_bershka_and_oysho_pairs_are_removable(self):
        rows = [
            row('Bershka', *DOOR, 'Microsoft', 'AVENIDA CRUZEIRO SEIXAS 5'),
            row('Oysho', *DOOR, 'Microsoft', 'Avenida Cruzeiro Seixas 5'),
            row('Bershka', 38.776258, -9.218830, 'Foursquare', 'Av. cruzeiro seixas 5'),
            row('Oysho', 38.776436, -9.220108, 'Foursquare', 'C. C. UBBO, Loja 1.103-1.105'),
        ]
        confirmed, _ = door.find(rows, UBBO_WORDS)
        self.assertEqual({c['row']['name'] for c in confirmed}, {'Bershka', 'Oysho'})
        for item in confirmed:
            self.assertEqual(door.dataset(item['row']), 'Microsoft')
            self.assertEqual(door.dataset(item['twin']), 'Foursquare')

    def test_the_real_unit_is_never_the_one_removed(self):
        """The Foursquare rows have twins too. They are not at a door, so the
        rule must not offer them — removing both copies loses the shop."""
        rows = [
            row('Bershka', *DOOR, 'Microsoft', 'AVENIDA CRUZEIRO SEIXAS 5'),
            row('Oysho', *DOOR, 'Microsoft', 'Avenida Cruzeiro Seixas 5'),
            row('Bershka', 38.776258, -9.218830, 'Foursquare', 'Av. cruzeiro seixas 5'),
            row('Oysho', 38.776436, -9.220108, 'Foursquare', 'C. C. UBBO, Loja 1.103-1.105'),
        ]
        confirmed, _ = door.find(rows, UBBO_WORDS)
        self.assertTrue(all(door.dataset(c['row']) != 'Foursquare' for c in confirmed))

    def test_four_different_shops_at_one_door_are_all_kept(self):
        """Ubbo 38.779233,-9.219706 — four Microsoft rows, four shops, each the
        only record we hold. The coordinate alone would have deleted all four."""
        xy = (38.779233, -9.219706)
        rows = [row(n, *xy, 'Microsoft', 'Avenida Cruzeiro Seixas 5 e 7, UBBO')
                for n in ('Cacifo Locky', 'Flying Tiger Copenhagen',
                          'New Yorker', 'Mayoral - Loja de Roupa Infantil e Bebés')]
        confirmed, partial = door.find(rows, UBBO_WORDS)
        self.assertEqual(confirmed, [])
        self.assertEqual(len(partial), 4)
        self.assertTrue(all(not p['has_twin'] and p['at_door'] for p in partial))

    def test_three_shops_at_one_door_from_one_dataset_are_kept(self):
        """Amoreiras 38.723600,-9.163390 — Oysho, Bershka and Zara share a door.
        Sole records: removing the Microsoft pair loses two real shops."""
        xy = (38.723600, -9.163390)
        rows = [row('Oysho', *xy, 'Microsoft'), row('Bershka', *xy, 'Microsoft'),
                row('Zara', *xy, 'AllThePlaces')]
        confirmed, _ = door.find(rows, UBBO_WORDS)
        self.assertEqual(confirmed, [])

    def test_a_twin_from_the_same_dataset_is_not_a_twin(self):
        """Two Foursquare rows at one door (Aldo, Intimissimi at Amoreiras) are
        the same provider pinning two shops, not one shop recorded twice."""
        xy = (38.723053, -9.162166)
        rows = [row('Aldo', *xy, 'Foursquare'), row('Aldo', 38.7240, -9.1620, 'Foursquare')]
        confirmed, _ = door.find(rows, UBBO_WORDS)
        self.assertEqual(confirmed, [])

    def test_a_twin_away_from_any_door_is_left_to_a_person(self):
        """`Leroy Merlin` / `Amadora - Leroy Merlin`: a real pair, neither at a
        door, so which is right cannot be decided mechanically."""
        rows = [row('Amadora - Leroy Merlin', 38.774959, -9.218546, 'AllThePlaces'),
                row('Leroy Merlin', 38.780539, -9.218969, 'meta')]
        confirmed, partial = door.find(rows, UBBO_WORDS)
        self.assertEqual(confirmed, [])
        self.assertEqual(len(partial), 2)
        self.assertTrue(all(p['has_twin'] and not p['at_door'] for p in partial))

    def test_the_mall_name_in_a_shop_name_does_not_hide_a_twin(self):
        """We hold `Wok to Walk UBBO`; a twin would read `Wok to Walk`."""
        rows = [row('Wok to Walk UBBO', *DOOR, 'Microsoft', 'Avenida Cruzeiro Seixas 5'),
                row('Wok to Walk', 38.776996, -9.219491, 'Foursquare', 'C. C. UBBO, Loja 2.01'),
                row('Filler', *DOOR, 'Microsoft', 'Avenida Cruzeiro Seixas 5')]
        confirmed, _ = door.find(rows, UBBO_WORDS)
        self.assertEqual([c['row']['name'] for c in confirmed], ['Wok to Walk UBBO'])

    def test_a_row_carrying_a_unit_number_is_never_the_pinned_copy(self):
        """A row that names its own unit is the real one, whatever it shares."""
        rows = [row('Zara', *DOOR, 'Microsoft', 'C. C. UBBO, Loja 1.050'),
                row('Zara', 38.7765, -9.2201, 'Foursquare', 'Loja 1.050'),
                row('Other', *DOOR, 'Microsoft', 'Avenida Cruzeiro Seixas 5')]
        confirmed, _ = door.find(rows, UBBO_WORDS)
        self.assertEqual(confirmed, [])

    def test_a_lone_row_is_never_touched(self):
        rows = [row('Primark', 38.7770, -9.2200, 'meta', 'C. C. UBBO, Loja 0.10')]
        confirmed, partial = door.find(rows, UBBO_WORDS)
        self.assertEqual((confirmed, partial), ([], []))


class AddressReadingTest(unittest.TestCase):
    def test_a_unit_address_is_recognised(self):
        for address in ('C. C. UBBO, Loja 1.103-1.105', 'Loja 2.01',
                        'CC AMOREIRAS, AV. ENG. DUARTE PACHECO LOJA 1080/1081',
                        'Piso 1, lj 55'):
            self.assertTrue(door.unit_address(address), address)

    def test_a_street_address_is_not_a_unit(self):
        for address in ('AVENIDA CRUZEIRO SEIXAS 5', 'Av. cruzeiro seixas 5',
                        'Avenida Cruzeiro Seixas 5 e 7, UBBO', None, ''):
            self.assertFalse(door.unit_address(address), address)


class DoorDetectionTest(unittest.TestCase):
    def test_only_shared_coordinates_count_as_doors(self):
        rows = [row('A', 1.0, 2.0, 'meta'), row('B', 1.0, 2.0, 'Microsoft'),
                row('C', 3.0, 4.0, 'meta')]
        doors = door.door_coordinates(rows)
        self.assertEqual(list(doors), [(1.0, 2.0)])
        self.assertEqual(len(doors[(1.0, 2.0)]), 2)


if __name__ == '__main__':
    unittest.main()
