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

    def test_the_street_door_is_OUTSIDE_the_building(self):
        """This is why the two audits need two scopes. A door-pinned duplicate
        sits on the centre's street address, which is outside its outline, so
        `mall_door_duplicates` must run on a box while the tenant comparison
        runs on the outline."""
        self.assertFalse(mf.in_footprint(*UBBO_DOOR, self.footprints['UBBO']))

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
