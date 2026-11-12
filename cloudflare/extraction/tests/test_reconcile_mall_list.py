"""KAN-462. One listed unit, one row — and nothing else inside the centre.

Coordinates are NorteShopping's, measured in production on 2026-11-11.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import mall_footprints as mf  # noqa: E402
import reconcile_mall_list as rec  # noqa: E402

MALL = 'NorteShopping'
INSIDE = (41.1806563, -8.6560149)          # the outline's centroid
RING = (41.18036458, -8.65436377)          # United Colors of Benetton, 8 m out
GALP = (41.17976142, -8.65367875)          # the fuel station, 46 m out


def held(name, oid, at=INSIDE, address=None, poi_type='store'):
    return {'overture_id': oid, 'name': name, 'lat': at[0], 'lng': at[1],
            'address': address, 'primary_poi_type': poi_type}


class FloorTest(unittest.TestCase):
    def test_the_operator_piso_becomes_the_stored_floor(self):
        self.assertEqual(rec.floor_value('Piso -4'), '-4')
        self.assertEqual(rec.floor_value('Piso 1'), '1')
        self.assertEqual(rec.floor_value('2'), '2')
        self.assertIsNone(rec.floor_value(''))
        self.assertIsNone(rec.floor_value(None))


class AssignTest(unittest.TestCase):
    def test_each_unit_takes_the_closest_name_not_the_first(self):
        """`Zara Home` contains `Zara`; the matcher scores both pairings 1.0,
        so the tie must go to the exact name or ZARA HOME is left unanswered."""
        tenants = [('ZARA', 'Piso 1'), ('ZARA HOME', 'Piso 1')]
        rows = [held('Zara Home', 'a'), held('Zara', 'b')]
        answers, twins, unlisted = rec.assign(tenants, rows, MALL)
        self.assertEqual(answers[0]['overture_id'], 'b')
        self.assertEqual(answers[1]['overture_id'], 'a')
        self.assertEqual((twins, unlisted), ([], []))

    def test_a_shop_held_twice_keeps_one_row_and_the_other_is_its_twin(self):
        """Owner, 2026-11-11: two held rows for one listed store are the same
        store."""
        tenants = [('PULL & BEAR', 'Piso 1')]
        rows = [held('Pull&Bear', 'a'), held('Pull & Bear', 'b')]
        answers, twins, unlisted = rec.assign(tenants, rows, MALL)
        self.assertEqual(len(answers), 1)
        self.assertEqual(len(twins), 1)
        self.assertEqual(twins[0][1], 0)
        self.assertEqual(unlisted, [])

    def test_two_listed_units_of_one_brand_each_get_a_row(self):
        tenants = [('NOS', 'Piso 0'), ('NOS', 'Piso 0')]
        rows = [held('NOS', 'a'), held('Loja NOS', 'b')]
        answers, twins, _ = rec.assign(tenants, rows, MALL)
        self.assertEqual({r['overture_id'] for r in answers.values()}, {'a', 'b'})
        self.assertEqual(twins, [])

    def test_a_row_confirmed_for_one_tenant_never_answers_another(self):
        """Without this the hypermarket `CONTINENTE` takes the Bom Dia's second
        row at 0.90 and is served at the Bom Dia's door."""
        tenants = [('CONTINENTE', 'Piso 0'), ('CONTINENTE BOM DIA', 'Piso 0')]
        rows = [held('Continente Bom Dia NorteShopping', 'a'),
                held('SAT MATOSINHOS CONTINENTE BOM DIA NORTESHOPPING', 'b')]
        confirmed = {'continente bom dia': {'continente bom dia norteshopping',
                                            'sat matosinhos continente bom dia norteshopping'}}
        answers, twins, _ = rec.assign(tenants, rows, MALL, confirmed)
        self.assertNotIn(0, answers, 'the hypermarket is not held, so it is written')
        self.assertIn(answers[1]['overture_id'], {'a', 'b'})
        self.assertEqual([t for _, t in twins], [1])

    def test_scoring_agrees_with_compare_so_no_unit_is_written_twice(self):
        """Scored with `name_similarity` alone, `MaxMara` missed `Weekend Max
        Mara` and `GRANDOPTICAL` missed `Opticas GrandOptical NorteShopping
        Porto`: each was withdrawn as unlisted and written again (2026-11-11)."""
        tenants = [('MaxMara', 'Piso 1'), ('GRANDOPTICAL', 'Piso 0')]
        rows = [held('Weekend Max Mara', 'a'), held('Opticas GrandOptical NorteShopping Porto', 'b')]
        answers, _, unlisted = rec.assign(tenants, rows, MALL)
        self.assertEqual({t: r['overture_id'] for t, r in answers.items()}, {0: 'a', 1: 'b'})
        self.assertEqual(unlisted, [])

    def test_a_row_certainly_inside_answers_before_a_better_named_one_in_the_ring(self):
        """Via Catarina, 2026-11-12: `Kiko Milano` at Rua de Santa Catarina 412
        is a street shop 15 m outside; the unit is `Kiko Store` inside."""
        tenants = [('KIKO MILANO', 'Piso 2')]
        street = held('Kiko Milano', 'street', RING, 'Rua de Santa Catarina 412')
        unit = held('Kiko Store', 'unit', INSIDE, 'R. de Santa Catarina, 312-350')
        answers, twins, _ = rec.assign(tenants, [street, unit], MALL,
                                       certain=lambda r: r['overture_id'] == 'unit')
        self.assertEqual(answers[0]['overture_id'], 'unit')
        self.assertEqual([r['overture_id'] for r, _ in twins], ['street'])

    def test_a_twin_on_the_street_is_kept_not_withdrawn(self):
        tenants = [('KIKO MILANO', 'Piso 2')]
        street = held('Kiko Milano', 'street', RING, 'Rua de Santa Catarina 412')
        unit = held('Kiko Store', 'unit', INSIDE, 'NorteShopping')
        result = rec.plan(tenants, [street, unit], [], MALL, 'norteshopping',
                          {'kiko milano': ('store', 'beauty', [], 'x')},
                          address_words=('norteshopping',))
        self.assertEqual([r['overture_id'] for r, _ in result['withdraw']], [])
        self.assertEqual([r['overture_id'] for r in result['kept_outside']], ['street'])

    def test_a_row_matching_no_listed_unit_is_unlisted(self):
        answers, twins, unlisted = rec.assign([('ZARA', 'Piso 1')],
                                              [held('Rádio Popular', 'x')], MALL)
        self.assertEqual((answers, twins), ({}, []))
        self.assertEqual([r['overture_id'] for r in unlisted], ['x'])


class WithdrawableTest(unittest.TestCase):
    def setUp(self):
        self.footprint = mf.load()[MALL]
        self.words = ('norteshopping', 'norte shopping', 'sara afonso')

    def test_inside_the_building_is_always_the_centres(self):
        self.assertTrue(rec.withdrawable(held('X', 'x', INSIDE), self.footprint, self.words))

    def test_the_ring_is_the_centres_only_when_the_address_says_so(self):
        """decisions.md: remove from the strict outline only, because the
        buffer once swept in another centre's shops. An address naming the
        centre is the evidence that a ring row is a unit pinned a few metres
        off."""
        ours = held('Benetton', 'b', RING, 'SH CTR NORTESHOPPING, LOJA 1 0.226')
        street = held('Clinicanimal', 'c', RING, 'Rua Henrique Pousão', 'veterinary_care')
        self.assertTrue(rec.withdrawable(ours, self.footprint, self.words))
        self.assertFalse(rec.withdrawable(street, self.footprint, self.words))

    def test_the_fuel_station_on_the_ring_road_is_never_withdrawn(self):
        galp = held('Galp', 'g', GALP, 'Loteamento, Qta. das Sedas Lt. 7', 'gas')
        self.assertFalse(rec.withdrawable(galp, self.footprint, self.words))

    def test_no_address_in_the_ring_means_a_neighbour(self):
        self.assertFalse(rec.withdrawable(held('X', 'x', RING), self.footprint, self.words))


class FarRowTest(unittest.TestCase):
    def test_a_listed_shop_pinned_far_away_is_withdrawn_never_kept(self):
        """FNAC was held at NorteShopping AND 1.6 km away under the centre's
        own address. The far row's coordinate is wrong, so it never answers
        the unit, even when it is the only row with the name."""
        far = [held('Tezenis', 'far-1', (41.1660, -8.6700), 'CC NorteShopping, R. Sara Afonso'),
               held('Zenith Brunch & Cocktails - Norteshopping', 'far-2', (41.1790, -8.6560))]
        result = rec.plan([('TEZENIS', 'Piso 0')], [], [], MALL, 'norteshopping',
                          {'tezenis': ('store', 'clothing', [], 'x')}, far=far)
        withdrawn = {r['overture_id']: why for r, why in result['withdraw']}
        self.assertIn("listed 'TEZENIS' pinned", withdrawn['far-1'])
        self.assertIn('not on its tenant list', withdrawn['far-2'])
        self.assertEqual([r['tenant'] for r in result['to_write']], ['TEZENIS'],
                         'the unit itself is written inside the centre')


class StatementTest(unittest.TestCase):
    def test_an_overture_row_is_tombstoned_and_a_curated_row_withdrawn(self):
        over = held('Rádio Popular', 'ov-1')
        cur = {'poi_id': 'fsq:abc', 'name': 'Praça do Vapor', 'lat': INSIDE[0], 'lng': INSIDE[1]}
        sql = ''.join(rec.withdrawals([(over, 'not listed'), (cur, 'not listed')],
                                      'KAN-462', '2026-11-11'))
        self.assertIn("('overture', 'ov-1', 0, 'KAN-462: not listed', '2026-11-11')", sql)
        self.assertIn("SET status = 'removed'", sql)
        self.assertIn("poi_id = 'fsq:abc'", sql)
        self.assertNotIn('DELETE', sql, 'nothing is deleted')

    def test_a_row_with_an_existing_correction_is_still_hidden(self):
        """INSERT OR IGNORE would keep a `visible = 1` correction and leave the
        row served. Run the statement against a real table to prove it."""
        import sqlite3
        db = sqlite3.connect(':memory:')
        db.execute('CREATE TABLE poi_source_correction (source TEXT NOT NULL, source_id TEXT NOT NULL, '
                   'visible INTEGER NOT NULL, name_override TEXT, review_note TEXT NOT NULL, '
                   'created_at TEXT, PRIMARY KEY (source, source_id))')
        db.execute("INSERT INTO poi_source_correction VALUES ('overture', 'ov-1', 1, 'Kept Name', 'old', 'd')")
        for statement in rec.withdrawals([(held('X', 'ov-1'), 'not listed'), (held('Y', 'ov-2'), 'not listed')],
                                         'KAN-462', '2026-11-12'):
            db.executescript(statement)
        rows = dict((r[0], r[1:]) for r in db.execute(
            'SELECT source_id, visible, name_override, review_note FROM poi_source_correction'))
        self.assertEqual(rows['ov-1'], (0, 'Kept Name', 'KAN-462: not listed'))
        self.assertEqual(rows['ov-2'], (0, None, 'KAN-462: not listed'))

    def test_a_held_unit_without_a_typing_is_reported_not_skipped(self):
        result = rec.plan([('ZARA HOME', 'Piso 1')], [held('Zara Home', 'zh')], [], MALL,
                          'norteshopping', {})
        self.assertEqual(result['untyped'], ['ZARA HOME'])

    def test_a_held_row_takes_the_lists_type_and_floor(self):
        tenants = [('ZARA HOME', 'Piso 1')]
        types = {'zara home': ('store', 'home', [], 'ruled by a person')}
        sql = ''.join(rec.held_updates({0: held('Zara Home', 'zh')}, tenants, types, '2026-11-11'))
        self.assertIn("primary_poi_type = 'store', floor = '1'", sql)
        self.assertIn("VALUES ('zh', 'store', 0);", sql)
        self.assertIn("VALUES ('zh', 'store_kind', 'home');", sql)

    def test_several_types_keep_their_rank(self):
        tenants = [('Nata Sweet Nata', 'Piso 0')]
        types = {'nata sweet nata': ('bakery', None, ['cafe'], 'ruled by a person')}
        sql = ''.join(rec.held_updates({0: held('Nata Sweet Nata', 'n')}, tenants, types, 'd'))
        self.assertIn("('n', 'bakery', 0), ('n', 'cafe', 1)", sql)
        self.assertNotIn("'store_kind', ", sql.split('DELETE FROM overture_poi_attribute')[1].split(';')[1])


if __name__ == '__main__':
    unittest.main()
