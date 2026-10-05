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

    def test_amoreiras_centroid_is_inside_its_own_outline(self):
        amoreiras = self.footprints['Amoreiras Shopping Center']
        self.assertTrue(mf.in_footprint(*amoreiras['centroid'], amoreiras))


if __name__ == '__main__':
    unittest.main()
