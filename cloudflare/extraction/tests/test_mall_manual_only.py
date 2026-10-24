"""KAN-439. A shopping centre's contents are manual-only.

The operator's published tenant list is the source of truth for what is inside
a centre, and Overture is a helper there, never a source. So no import,
promotion or refresh may decide a row inside one.

Without this guard every ruling in KAN-439 is undone by the next Overture
refresh, which is why it is tested rather than trusted.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import mall_footprints as mf  # noqa: E402
import promote_overture_candidates as promoter  # noqa: E402
import refresh_overture_country as refresh  # noqa: E402

INSIDE_UBBO = (38.776436, -9.220108)        # the Oysho unit
INSIDE_AMOREIRAS = (38.723400, -9.161700)   # the Amoreiras centroid
OUTSIDE = (41.150000, -8.610000)            # Porto, far from either


def candidate(lat, lng, name='Zara', category='clothing_store'):
    return {'overture_id': 'x', 'name': name, 'lat': lat, 'lng': lng,
            'category': category, 'category_path': category,
            'address': None, 'confidence': 0.9, 'source_datasets': 'Overture|meta'}


class PromoterGuardTest(unittest.TestCase):
    def setUp(self):
        # `reachable_types()` reads `type_relation` from live D1; a unit test
        # must not depend on the network, so the bridge is stubbed the same
        # way test_overture_promotion.py does it.
        import analyse_poi_candidates as analyse
        from classify_and_load import load_brand_dictionary
        self.analyse = analyse
        self._real_pairs = analyse._type_relation_pairs
        analyse._type_relation_pairs = lambda: [
            ('fitness_center', 'gym'), ('grocery_store', 'supermarket'),
        ]
        self.reachable = analyse.reachable_types()
        self.mapping = promoter.category_map()
        self.brands = load_brand_dictionary()

    def tearDown(self):
        self.analyse._type_relation_pairs = self._real_pairs

    def decide(self, row):
        return promoter.decide(row, self.mapping, self.reachable, self.brands)

    def test_a_candidate_inside_a_centre_is_never_promoted(self):
        for point in (INSIDE_UBBO, INSIDE_AMOREIRAS):
            status, types, attributes, reason = self.decide(candidate(*point))
            self.assertEqual(status, 'rejected', point)
            self.assertEqual(types, ())
            self.assertIn('manual only', reason)

    def test_the_reason_names_the_centre_so_the_row_is_auditable(self):
        _, _, _, reason = self.decide(candidate(*INSIDE_UBBO))
        self.assertIn('UBBO', reason)

    def test_a_candidate_outside_every_centre_is_decided_normally(self):
        status, _, _, reason = self.decide(candidate(*OUTSIDE))
        self.assertNotIn('manual only', reason or '')

    def test_a_candidate_with_no_coordinates_does_not_crash_the_guard(self):
        row = candidate(*OUTSIDE)
        row['lat'] = None
        status, _, _, reason = self.decide(row)
        self.assertNotIn('manual only', reason or '')

    def test_coordinates_that_are_not_floats_do_not_crash_the_guard(self):
        """CI caught this: `backfill_chain_brands` reads rows from an archive
        CSV, so lat and lng arrive as STRINGS, and `decide` is shared. A guard
        that raises there takes down an import over a question that is only
        ever "is this inside a shopping centre"."""
        for lat, lng in ((str(OUTSIDE[0]), str(OUTSIDE[1])), ('n/a', 'x'),
                         (OUTSIDE[0], None), ('', '')):
            row = candidate(OUTSIDE[0], OUTSIDE[1])
            row['lat'], row['lng'] = lat, lng
            status, _, _, reason = self.decide(row)
            self.assertNotIn('manual only', reason or '', f'{lat!r},{lng!r}')

    def test_a_string_coordinate_inside_a_centre_is_still_caught(self):
        """Tolerating strings must not mean ignoring them."""
        row = candidate(*INSIDE_UBBO)
        row['lat'], row['lng'] = str(INSIDE_UBBO[0]), str(INSIDE_UBBO[1])
        status, _, _, reason = self.decide(row)
        self.assertEqual(status, 'rejected')
        self.assertIn('manual only', reason)


class RefreshGuardTest(unittest.TestCase):
    def test_a_row_inside_a_centre_is_recognised(self):
        self.assertTrue(refresh.in_a_mall({'lat': INSIDE_UBBO[0], 'lng': INSIDE_UBBO[1]}))
        self.assertFalse(refresh.in_a_mall({'lat': OUTSIDE[0], 'lng': OUTSIDE[1]}))

    def test_a_row_without_coordinates_is_not_in_a_mall(self):
        self.assertFalse(refresh.in_a_mall({'lat': None, 'lng': None}))
        self.assertFalse(refresh.in_a_mall({}))

    def test_a_changed_mall_row_is_not_refreshed_and_a_vanished_one_not_retired(self):
        """Both directions. A release that renames a tenant must not overwrite
        the operator's name, and a release that drops one must not retire a
        shop the operator still lists."""
        def row(oid, name, lat, lng):
            return {'overture_id': oid, 'name': name, 'lat': lat, 'lng': lng,
                    'name_local': None, 'name_local_lang': None, 'names_json': None,
                    'country_code': 'PT', 'address': None, 'category': 'clothing_store',
                    'confidence': 0.9}
        previous = {'in': row('in', 'Oysho', *INSIDE_UBBO),
                    'out': row('out', 'Shop', *OUTSIDE),
                    'gone': row('gone', 'Closed Tenant', *INSIDE_UBBO)}
        current = {'in': row('in', 'Oysho Renamed Upstream', *INSIDE_UBBO),
                   'out': row('out', 'Shop Renamed', *OUTSIDE)}

        executed = []
        import refresh_overture_country as r
        real = r.currently_retired_ids
        r.currently_retired_ids = lambda: set()
        try:
            sets = r.diff_archives(previous, current)
            held = {i for i, _ in sets['changed'] if r.in_a_mall(current[i])}
            retired_in_mall = {i for i in sets['retired'] if r.in_a_mall(previous[i])}
        finally:
            r.currently_retired_ids = real

        self.assertEqual(held, {'in'}, 'the mall tenant must be held back')
        self.assertEqual(retired_in_mall, {'gone'}, 'a vanished mall tenant is not retired')
        self.assertIn('out', [i for i, _ in sets['changed']])


class FootprintCostTest(unittest.TestCase):
    def test_the_guard_is_cheap_enough_for_a_country_import(self):
        """A country import decides hundreds of thousands of candidates, so a
        bounding box answers the common case before any ray casting."""
        import time
        mf.load()
        start = time.time()
        for _ in range(20000):
            mf.mall_at(*OUTSIDE)
        self.assertLess(time.time() - start, 1.0)


if __name__ == '__main__':
    unittest.main()
