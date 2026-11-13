"""KAN-439. A mall footprint is the building's outline, not a box.

Every coordinate here was measured in production on 2026-10-05.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import mall_footprints as mf  # noqa: E402

# A unit square, for the geometry itself.
SQUARE = [[0.0, 0.0], [0.0, 1.0], [1.0, 1.0], [1.0, 0.0]]
UBBO_DOOR = (38.775290, -9.220240)
UBBO_BERSHKA_UNIT = (38.776258, -9.218830)
UBBO_OYSHO_UNIT = (38.776436, -9.220108)
# The brand that proves a name test cannot work: the hypermarket is a tenant,
# the two fuel stations sharing its name are 284 m and 288 m away.
AUCHAN_HYPERMARKET = (38.778124, -9.219726)
AUCHAN_FUEL = (38.773786, -9.215978)
GASOLINEIRA_AUCHAN = (38.773630, -9.216152)


class RayCastingTest(unittest.TestCase):
    def test_a_point_inside_and_outside_a_square(self):
        self.assertTrue(mf.in_ring(0.5, 0.5, SQUARE))
        self.assertFalse(mf.in_ring(1.5, 0.5, SQUARE))
        self.assertFalse(mf.in_ring(0.5, 1.5, SQUARE))
        self.assertFalse(mf.in_ring(-0.5, 0.5, SQUARE))

    def test_a_concave_outline_does_not_swallow_its_notch(self):
        """A mall built around an open courtyard: the courtyard is not inside.

        Points are [lat, lng], so the notch spans lat 1..2 at lng 0..2.
        """
        c = [[0, 0], [0, 3], [3, 3], [3, 0], [2, 0], [2, 2], [1, 2], [1, 0]]
        self.assertTrue(mf.in_ring(2.5, 1.5, c), 'the far wing is inside')
        self.assertTrue(mf.in_ring(0.5, 1.5, c), 'the near wing is inside')
        self.assertFalse(mf.in_ring(1.5, 1.0, c), 'the courtyard is not')


class RealFootprintTest(unittest.TestCase):
    def setUp(self):
        self.footprints = mf.load()

    def test_both_centres_are_recorded_with_the_osm_id_they_came_from(self):
        self.assertEqual(self.footprints['UBBO']['osm'], 'relation/14978983')
        self.assertEqual(self.footprints['Amoreiras Shopping Center']['osm'], 'way/755751570')

    def test_a_tenant_unit_is_inside_its_centre(self):
        for point in (UBBO_BERSHKA_UNIT, UBBO_OYSHO_UNIT):
            self.assertTrue(mf.in_footprint(*point, self.footprints['UBBO']), point)

    def test_the_street_door_is_outside_the_OUTLINE_but_within_the_centre(self):
        """This is why the two audits need two scopes. A door-pinned duplicate
        sits on the centre's street address, outside the building itself, so
        `mall_door_duplicates` runs on a box while the tenant comparison runs
        on the buffered footprint — which does include the door, because the
        shop really is part of that centre."""
        ubbo = self.footprints['UBBO']
        self.assertFalse(mf.in_footprint(*UBBO_DOOR, ubbo, buffer_m=0))
        self.assertTrue(mf.in_footprint(*UBBO_DOOR, ubbo))

    def test_each_centre_carries_its_own_measured_buffer(self):
        """One constant was wrong: the buffer depends on how isolated the
        building is, not only on coordinate quality. Amoreiras has three other
        shopping centres within 500 m and stops gaining matches at 50 m, while
        UBBO keeps gaining to 75 m."""
        self.assertEqual(self.footprints['UBBO']['buffer_m'], 75)
        self.assertEqual(self.footprints['Amoreiras Shopping Center']['buffer_m'], 50)
        for footprint in self.footprints.values():
            self.assertTrue(footprint.get('buffer_note'), 'a buffer needs its measurement recorded')

    def test_the_auchan_fuel_station_is_never_a_tenant(self):
        """The hypermarket inside the centre and a fuel station sharing its
        brand 284 m away. The buffer must separate them, since no name test
        can."""
        ubbo = self.footprints['UBBO']
        self.assertTrue(mf.in_footprint(*AUCHAN_HYPERMARKET, ubbo), 'Auchan hypermarket')
        for fuel in (AUCHAN_FUEL, GASOLINEIRA_AUCHAN):
            self.assertFalse(mf.in_footprint(*fuel, ubbo), f'Auchan fuel at {fuel}')

    def test_a_wider_buffer_is_honoured_by_the_cheap_box_test(self):
        """The bounding box is padded with the centre's OWN buffer, so a
        caller asking for a wider one must widen the box too — otherwise the
        fast path rejects a point the real test accepts (review, 2026-10-24)."""
        ubbo = self.footprints['UBBO']
        far = (38.7730, -9.2160)
        self.assertFalse(mf.in_footprint(*far, ubbo))
        self.assertTrue(mf.in_footprint(*far, ubbo, buffer_m=2000))

    def test_the_recorded_centroid_is_the_one_rows_are_written_at(self):
        """`decisions.md` once quoted the `center` OSM reports for the
        relation, ~35 m from the outline's own average. Rows are written at
        the average, so that is what the file must hold."""
        ubbo = self.footprints['UBBO']
        points = [p for ring in ubbo['rings'] for p in ring]
        self.assertAlmostEqual(ubbo['centroid'][0], sum(p[0] for p in points) / len(points), places=5)
        self.assertAlmostEqual(ubbo['centroid'][1], sum(p[1] for p in points) / len(points), places=5)

    def test_metres_outside_is_zero_inside_and_grows_outside(self):
        ubbo = self.footprints['UBBO']
        self.assertEqual(mf.metres_outside(*UBBO_OYSHO_UNIT, ubbo), 0.0)
        self.assertGreater(mf.metres_outside(*UBBO_DOOR, ubbo), 0.0)

    def test_the_centres_do_not_contain_each_other(self):
        self.assertFalse(mf.in_footprint(*UBBO_DOOR, self.footprints['Amoreiras Shopping Center']))
        self.assertIsNone(mf.mall_at(38.7, -9.0, self.footprints))

    def test_mall_at_names_the_centre_a_point_falls_in(self):
        """The test the manual-only rule needs: a candidate here is never
        written by an import, a promotion or a refresh."""
        self.assertEqual(mf.mall_at(*UBBO_BERSHKA_UNIT, self.footprints), 'UBBO')

    def test_norteshopping_is_one_ring_joined_from_its_two_outer_ways(self):
        """KAN-462. OSM draws the outline as two open ways; joined, they must
        close into one ring that holds the centroid rows are written at."""
        norte = self.footprints['NorteShopping']
        self.assertEqual(norte['osm'], 'relation/16708133')
        self.assertEqual(norte['buffer_m'], 50)
        self.assertEqual(len(norte['rings']), 1)
        self.assertTrue(mf.in_footprint(*norte['centroid'], norte, buffer_m=0))
        self.assertIsNone(mf.mall_at(*norte['centroid'], {k: v for k, v in self.footprints.items()
                                                           if k != 'NorteShopping'}))

    def test_via_catarina_is_a_tight_footprint_on_a_shopping_street(self):
        """KAN-462. 30 m, not 50: Rua de Santa Catarina's own shops start at
        the door, and a wider ring sweeps them in."""
        vc = self.footprints['Via Catarina Shopping']
        self.assertEqual(vc['osm'], 'way/365658312')
        self.assertEqual(vc['buffer_m'], 30)
        self.assertTrue(mf.in_footprint(*vc['centroid'], vc, buffer_m=0))
        self.assertEqual(mf.mall_at(*vc['centroid'], self.footprints), 'Via Catarina Shopping')

    def test_colombo_holds_the_acp_unit_osm_maps(self):
        """KAN-500. Colombo's ACP was listed and never written; it is at
        OSM's own unit, way/1466236772, inside the outline."""
        colombo = self.footprints['Centro Comercial Colombo']
        self.assertEqual(colombo['osm'], 'way/42645796')
        self.assertEqual(colombo['buffer_m'], 75)
        self.assertTrue(mf.in_footprint(38.7537645, -9.1886437, colombo, buffer_m=0))
        self.assertEqual(mf.mall_at(*colombo['centroid'], self.footprints), 'Centro Comercial Colombo')

    def test_leiriashopping_takes_in_the_inditex_units_and_not_the_campus(self):
        """KAN-465. Zara, Bershka and Oysho sit 53 m outside the outline; the
        ESTG campus on the same street starts beyond 55 m. Coordinates are the
        held rows, measured in production on 2026-11-12."""
        leiria = self.footprints['LeiriaShopping']
        self.assertEqual(leiria['osm'], 'way/192124002')
        self.assertEqual(leiria['buffer_m'], 55)
        self.assertTrue(mf.in_footprint(*leiria['centroid'], leiria, buffer_m=0))
        self.assertEqual(mf.mall_at(*leiria['centroid'], self.footprints), 'LeiriaShopping')
        inditex = (39.73218, -8.82554)          # Zara, Bershka and Oysho share this pin
        self.assertFalse(mf.in_footprint(*inditex, leiria, buffer_m=0), 'outside the outline')
        self.assertTrue(mf.in_footprint(*inditex, leiria), 'inside the buffer')
        for campus in ((39.7307, -8.8248), (39.73072, -8.82485)):   # ESTG, Games and Multimedia
            self.assertFalse(mf.in_footprint(*campus, leiria), f'ESTG at {campus}')

    def test_braga_parque_takes_in_pandora_and_not_the_avenue(self):
        """KAN-463. Pandora sits 34 m out on the centre's own address; the
        Avenida Antero de Quental shops start beyond 50 m. Coordinates are the
        held rows, measured in production on 2026-11-12."""
        bp = self.footprints['Braga Parque']
        self.assertEqual(bp['osm'], 'way/41679420')
        self.assertEqual(bp['buffer_m'], 50)
        self.assertEqual(mf.mall_at(*bp['centroid'], self.footprints), 'Braga Parque')
        pandora = (41.5573334, -8.4072141)
        self.assertFalse(mf.in_footprint(*pandora, bp, buffer_m=0), 'outside the outline')
        self.assertTrue(mf.in_footprint(*pandora, bp), 'inside the buffer')
        for street in ((41.55684, -8.40352), (41.55922379, -8.40499437)):   # Be InGym, Izturk Doneria
            self.assertFalse(mf.in_footprint(*street, bp), f'street shop at {street}')

    def test_nova_arcada_is_the_landuse_outline_with_its_retail_park(self):
        """KAN-463. The mall building alone leaves out IKEA, JYSK and Kiwoko,
        which the operator lists; the landuse outline holds them."""
        na = self.footprints['Nova Arcada']
        self.assertEqual(na['osm'], 'way/55617020')
        self.assertEqual(na['buffer_m'], 75)
        self.assertEqual(mf.mall_at(*na['centroid'], self.footprints), 'Nova Arcada')
        for unit in ((41.57800104, -8.43068753), (41.5786791, -8.429762), (41.578304, -8.430111)):
            self.assertTrue(mf.in_footprint(*unit, na, buffer_m=0), f'retail park unit at {unit}')
        self.assertTrue(mf.in_footprint(41.5793799, -8.4324919, na), 'Burger King, 57 m out')

    def test_amoreiras_centroid_is_inside_its_own_outline(self):
        amoreiras = self.footprints['Amoreiras Shopping Center']
        self.assertTrue(mf.in_footprint(*amoreiras['centroid'], amoreiras))


if __name__ == '__main__':
    unittest.main()
