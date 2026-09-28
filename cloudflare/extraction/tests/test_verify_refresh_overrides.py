"""KAN-473 — the override checker must compare what the promoter actually
writes. An override names types in the classifier's vocabulary and may name
several of them; `decide()` resolves both through `reachable_types()` before
serving. Comparing the raw strings against `primary_poi_type` reported
correct rows as lost, which made the gate unusable as a gate."""
import os
import sys
import unittest

EXTRACTION_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, EXTRACTION_DIR)
sys.path.insert(0, os.path.join(EXTRACTION_DIR, 'tests'))

from _stubs import stub_missing_dependencies  # noqa: E402
stub_missing_dependencies()

import verify_refresh_overrides as verify  # noqa: E402

# What reachable_types() resolves; the classifier's names on the left.
REACHABLE = {
    'gas': 'gas', 'supermarket': 'supermarket', 'pharmacy': 'pharmacy', 'store': 'store',
    'gas_station': 'gas',          # type_relation bridge
    'grocery_store': 'supermarket',  # KAN-398
}


def served(status='promoted', primary='gas', types=(), kinds=(), retired=None):
    return {'status': status, 'poi_type': primary, 'poi_types': set(types or [primary]),
            'store_kinds': set(kinds), 'retired': retired}


class ExpectedTypesTest(unittest.TestCase):
    def test_a_single_type_is_resolved_through_reachable(self):
        self.assertEqual(verify.expected_types({'poi_type': 'gas_station'}, REACHABLE), ['gas'])
        self.assertEqual(verify.expected_types({'poi_type': 'grocery_store'}, REACHABLE), ['supermarket'])

    def test_a_ranked_list_keeps_its_order(self):
        self.assertEqual(verify.expected_types({'poi_type': ['pharmacy', 'store']}, REACHABLE),
                         ['pharmacy', 'store'])

    def test_an_unknown_name_is_left_alone_rather_than_dropped(self):
        """A name the promoter would refuse must still be compared, so the
        mismatch is reported instead of silently passing."""
        self.assertEqual(verify.expected_types({'poi_type': 'not_a_type'}, REACHABLE), ['not_a_type'])


class CompareTest(unittest.TestCase):
    def verdict(self, entry, row):
        return verify.compare({'x': entry}, {'x': row}, REACHABLE)['x']

    def test_an_aliased_type_served_under_its_app_name_is_kept(self):
        """43bd621a in production: the override says `gas_station`, the row is
        served as `gas`, and that is correct."""
        self.assertEqual(self.verdict({'poi_type': 'gas_station'}, served(primary='gas')), 'kept')
        self.assertEqual(self.verdict({'poi_type': 'grocery_store'}, served(primary='supermarket')), 'kept')

    def test_a_multi_type_override_is_kept_when_every_type_is_served(self):
        """c8761ae1, Opticalia Farmacia Silveira: pharmacy AND store, with the
        optician subtype. Compared against `primary_poi_type` alone it looked
        lost."""
        row = served(primary='pharmacy', types=('pharmacy', 'store'), kinds=('eyewear_and_optician',))
        self.assertEqual(self.verdict({'poi_type': ['pharmacy', 'store'],
                                       'store_kind': 'eyewear_and_optician'}, row), 'kept')

    def test_a_missing_second_type_is_still_a_loss(self):
        row = served(primary='pharmacy', types=('pharmacy',))
        self.assertIn('lost', self.verdict({'poi_type': ['pharmacy', 'store']}, row))

    def test_a_reordered_list_is_a_loss_because_rank_0_is_what_the_app_shows(self):
        row = served(primary='store', types=('pharmacy', 'store'))
        self.assertEqual(self.verdict({'poi_type': ['pharmacy', 'store']}, row),
                         'lost: expected pharmacy first, served as store')

    def test_the_renamed_store_kind_is_a_loss_until_the_data_is_migrated(self):
        """1a43f920 before migration 0050: reviewed as `wine_and_spirits`,
        served as the retired `drinks`."""
        row = served(primary='store', types=('store',), kinds=('drinks',))
        self.assertEqual(self.verdict({'poi_type': 'store', 'store_kind': 'wine_and_spirits'}, row),
                         'lost: store_kind wine_and_spirits missing')
        row_after = served(primary='store', types=('store',), kinds=('wine_and_spirits',))
        self.assertEqual(self.verdict({'poi_type': 'store', 'store_kind': 'wine_and_spirits'}, row_after), 'kept')

    def test_a_rejected_decision_and_a_retired_row_are_unaffected(self):
        self.assertEqual(self.verdict({'decision': 'rejected', 'poi_type': 'store'},
                                      served(status='rejected')), 'kept')
        self.assertEqual(self.verdict({'poi_type': 'gas_station'},
                                      served(retired='2026-10-15.0')), 'retired')

    def test_a_row_in_no_archive_is_absent(self):
        self.assertEqual(verify.compare({'x': {'poi_type': 'gas'}}, {}, REACHABLE)['x'], 'absent')


class RetiredStoreKindTest(unittest.TestCase):
    """KAN-473. `drinks` was renamed to `wine_and_spirits` by KAN-432, but
    migration 0037 carried the data across by listing 791 explicit ids and
    missed 18 rows promoted the day before the rename. Migration 0050 finishes
    it by value. This guards the other half: no committed mapping that feeds
    the served set may emit the retired name again, or the next promotion
    reintroduces exactly what 0050 just cleaned.

    `extraction/apply_kan411_types.py` still maps two Foursquare categories to
    `drinks`, deliberately not covered here: it writes to the retired legacy
    `poi_attribute` table, which the registry has not served since KAN-454."""

    RETIRED = ('drinks',)
    SRC = os.path.join(os.path.dirname(EXTRACTION_DIR), 'src')
    FEEDS_SERVED_SET = (
        'overtureCategories.json', 'venueWords.json', 'storeSubtypeCategories.json',
        'overtureCandidateOverrides.json', 'googlePlaceTypes.json',
    )

    def store_kinds(self, value):
        """Every `store_kind` value anywhere in a mapping document."""
        if isinstance(value, dict):
            for key, child in value.items():
                if key == 'store_kind' and isinstance(child, str):
                    yield child
                else:
                    yield from self.store_kinds(child)
        elif isinstance(value, list):
            for child in value:
                yield from self.store_kinds(child)

    def test_no_mapping_emits_a_retired_store_kind(self):
        import json
        checked = 0
        for name in self.FEEDS_SERVED_SET:
            path = os.path.join(self.SRC, name)
            if not os.path.exists(path):
                continue
            checked += 1
            with open(path) as handle:
                document = json.load(handle)
            found = sorted({kind for kind in self.store_kinds(document) if kind in self.RETIRED})
            self.assertEqual(found, [], f'{name} still emits a retired store_kind: {found}')
        self.assertGreater(checked, 0, 'the mapping files moved; this guard is checking nothing')


if __name__ == '__main__':
    unittest.main()
