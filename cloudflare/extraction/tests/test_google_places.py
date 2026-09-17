"""KAN-449. Google Places as the third evidence source: same rule, same gate,
and nothing of Google's written down but the place id."""
import io
import json
import math
import os
import shutil
import sys
import tempfile
import types
import unittest
from unittest import mock

EXTRACTION_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, EXTRACTION_DIR)
os.environ.setdefault('BRUSH_TYPE_RELATION', 'sql')

import enrich_google_places as google
import run_evidence_join as join

LAT, LNG = 38.7200, -9.1400


def place(pid, name, primary, types=(), north_m=0):
    return {'id': pid, 'displayName': {'text': name}, 'primaryType': primary, 'types': list(types),
            'location': {'latitude': LAT + north_m / 111_000.0, 'longitude': LNG}}


class MappingTest(unittest.TestCase):
    def setUp(self):
        self.mapping, self.deny = google.type_mapping()

    def test_primary_type_decides(self):
        self.assertEqual(google.kinds_for('shoe_store', ['store'], self.mapping, self.deny), ('store', 'shoes'))

    def test_a_generic_primary_falls_back_to_a_specific_secondary(self):
        self.assertEqual(google.kinds_for('store', ['store', 'shoe_store'], self.mapping, self.deny), ('store', 'shoes'))

    def test_generic_buckets_settle_nothing(self):
        self.assertIsNone(google.kinds_for('store', ['store', 'point_of_interest'], self.mapping, self.deny))
        self.assertIsNone(google.kinds_for('shopping_mall', [], self.mapping, self.deny))

    def test_two_specific_secondaries_are_ambiguous(self):
        self.assertIsNone(google.kinds_for('store', ['shoe_store', 'clothing_store'], self.mapping, self.deny))

    def test_an_unreachable_type_is_denied_even_if_listed(self):
        # `convenience_store` is not in the file, but this proves the guard.
        with mock.patch.object(google, 'reachable_types', return_value=['store']):
            mapping, deny = google.type_mapping()
        self.assertIn('pharmacy', deny)


class DecideTest(unittest.TestCase):
    def setUp(self):
        self.mapping, self.deny = google.type_mapping()

    def decide(self, name, places, locality='Lisboa'):
        return google.decide(name, LAT, LNG, locality, places, self.mapping, self.deny)

    def test_a_close_name_match_with_a_usable_type_resolves(self):
        decision, poi_type, kind, _, cands = self.decide('Sapataria Central', [place('g1', 'Sapataria Central', 'shoe_store', north_m=10)])
        self.assertEqual((decision, poi_type, kind), ('verified_subtype', 'store', 'shoes'))
        self.assertEqual(cands[0]['id'], 'g1')

    def test_the_same_ladder_refuses_a_weak_name_far_away(self):
        decision, _, _, reason, _ = self.decide('Sapataria Central', [place('g1', 'Sapatos Centro', 'shoe_store', north_m=300)])
        self.assertEqual(decision, 'insufficient_evidence')

    def test_two_matches_of_different_kinds_fail_closed(self):
        decision, _, _, reason, _ = self.decide('Central', [
            place('g1', 'Central', 'shoe_store', north_m=5), place('g2', 'Central', 'jewelry_store', north_m=20)])
        self.assertEqual(decision, 'insufficient_evidence')
        self.assertIn('disagree', reason)

    def test_a_match_on_a_generic_type_stays_unresolved(self):
        decision, _, _, reason, _ = self.decide('Loja da Ana', [place('g1', 'Loja da Ana', 'store', ['store', 'point_of_interest'], 5)])
        self.assertEqual(decision, 'insufficient_evidence')
        self.assertIn('no usable type', reason)

    def test_no_place_by_this_name_puts_the_row_on_hold(self):
        decision, _, _, reason, cands = self.decide('Sapataria Central', [place('g1', 'Café Lisboa', 'cafe', north_m=20)])
        self.assertEqual(decision, 'unlisted')
        self.assertEqual(cands, [])
        self.assertIn('1 returned', reason)

    def test_a_permanently_closed_match_is_closed_not_typed(self):
        closed = dict(place('g1', 'Sapataria Central', 'shoe_store', north_m=10), businessStatus='CLOSED_PERMANENTLY')
        decision, _, _, _, cands = self.decide('Sapataria Central', [closed])
        self.assertEqual(decision, 'closed')
        self.assertEqual(cands[0]['status'], 'CLOSED_PERMANENTLY')

    def test_a_temporarily_closed_match_still_types(self):
        tmp = dict(place('g1', 'Sapataria Central', 'shoe_store', north_m=10), businessStatus='CLOSED_TEMPORARILY')
        self.assertEqual(self.decide('Sapataria Central', [tmp])[0], 'verified_subtype')

    def test_the_accepted_match_keeps_its_own_type_for_the_control(self):
        _, _, _, _, cands = self.decide('Sapataria Central', [
            place('g1', 'Sapataria Central', 'shoe_store', north_m=10), place('g2', 'Bar Zé', 'bar', north_m=30)])
        self.assertEqual([c.get('_primary_type') for c in cands], ['shoe_store'])

    def test_candidates_carry_no_google_text(self):
        _, _, _, _, cands = self.decide('Sapataria Central', [place('g1', 'Sapataria Central', 'shoe_store', north_m=10)])
        self.assertEqual(set(cands[0]) - {'_primary_type'}, {'source', 'id', 'distance_m', 'similarity', 'exact'})
        self.assertIn('businessStatus', google.FIELD_MASK)


class PlanTest(unittest.TestCase):
    def row(self, oid, north_m=0, east_m=0):
        return {'overture_id': oid, 'name': oid, 'lat': LAT + north_m / 111_000.0,
                'lng': LNG + east_m / (111_000.0 * 0.78), 'locality': 'Lisboa'}

    def test_rows_close_together_share_a_circle_sized_to_shop_density(self):
        rows = [self.row('a'), self.row('b', 30), self.row('c', 60), self.row('d', 5000)]
        circles = google.plan_circles(rows, [(r['lat'], r['lng']) for r in rows])
        self.assertEqual([len(m) for _, _, m in circles], [3, 1])
        self.assertEqual(circles[0][1], google.CIRCLE_RADII_M[0], 'four shops fit any radius')

    def test_a_dense_area_gets_a_tight_circle(self):
        rows = [self.row('a'), self.row('b', 30)]
        crowd = [(LAT + i / 111_000.0, LNG) for i in range(60, 200, 4)]  # 35 shops 60-200 m north
        circles = google.plan_circles(rows, [(r['lat'], r['lng']) for r in rows] + crowd)
        self.assertEqual(len(circles), 1)
        self.assertLessEqual(circles[0][1], 100, 'the 500 m default would hold 37 shops')

    def test_the_plan_is_deterministic(self):
        rows = [self.row('a'), self.row('b', 30), self.row('c', 400)]
        pts = [(r['lat'], r['lng']) for r in rows]
        self.assertEqual(google.plan_circles(rows, pts), google.plan_circles(list(reversed(rows)), pts))


class GridTest(unittest.TestCase):
    def test_a_point_due_east_at_the_edge_of_the_circle_is_found_at_high_latitude(self):
        lat = 60.0
        east = (lat, LNG + 480 / (111_000.0 * math.cos(math.radians(lat))))
        grid = google._Grid([(lat, LNG), east])
        self.assertEqual(sorted(grid.within(lat, LNG, 500)), [0, 1])


class RunTest(unittest.TestCase):
    def setUp(self):
        self.work = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.work)
        self.overture = os.path.join(self.work, 'overture.csv')
        with open(self.overture, 'w', newline='') as handle:
            handle.write('overture_id,name,lat,lng,address,locality,category,basic_category,category_path,confidence,source_datasets\n')
            handle.write(f'r1,Sapataria Central,{LAT},{LNG},,Lisboa,shopping,,shopping,0.9,Overture|meta\n')
            handle.write(f'r2,Mfobmx,{LAT},{LNG},,Lisboa,shopping,,shopping,0.9,Overture|meta\n')
        self.calls = []

        self.nearby_places = [place('g1', 'Sapataria Central', 'shoe_store', north_m=10)]

        def fetch(request, timeout=None):
            payload = json.loads(request.data)
            payload['_endpoint'] = 'nearby' if request.full_url == google.NEARBY_ENDPOINT else 'text'
            self.calls.append(payload)
            if payload['_endpoint'] == 'nearby':
                body = {'places': self.nearby_places}
            else:
                body = {'places': [place('g1', 'Sapataria Central', 'shoe_store', north_m=10)]} \
                    if 'Sapataria' in payload['textQuery'] else {'places': []}
            return io.BytesIO(json.dumps(body).encode())

        class Ctx:
            def __init__(self, buf): self.buf = buf
            def __enter__(self): return self.buf
            def __exit__(self, *a): return False

        self.fetch = lambda request, timeout=None: Ctx(fetch(request, timeout))

    def args(self, **overrides):
        base = dict(country='xx', overture_key='o', overture=self.overture, limit=None, all=False, emit=False,
                    control=False, control_manifest=None, report_out=None, cap=google.FREE_TIER_CAP,
                    run_id='r', work_dir=self.work, api_key='k', plan=False, circles=None, singles=None,
                    method='auto', fallback=True)
        base.update(overrides)
        return types.SimpleNamespace(**base)

    def run_with_empty_overrides(self, args):
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as handle:
            json.dump({}, handle)
        self.addCleanup(os.unlink, handle.name)
        with mock.patch.object(join, 'OVERRIDES_PATH', handle.name):
            return google.run(args, fetch=self.fetch)

    def test_two_rows_in_one_circle_are_one_nearby_call(self):
        evidence = tempfile.mkdtemp(); self.addCleanup(shutil.rmtree, evidence)
        with mock.patch.object(join, 'EVIDENCE_DIR', evidence):
            self.assertEqual(self.run_with_empty_overrides(self.args(limit=2, fallback=False)), 0)
        self.assertEqual([c['_endpoint'] for c in self.calls], ['nearby'])
        self.assertEqual(self.calls[0]['maxResultCount'], google.NEARBY_MAX_RESULTS)
        self.assertIn('shoe_store', self.calls[0]['includedPrimaryTypes'])
        self.assertNotIn('store', self.calls[0]['includedPrimaryTypes'], 'generic buckets are not asked for')
        self.assertEqual(os.listdir(evidence), [])

    def test_a_row_its_circle_did_not_name_falls_back_to_text(self):
        self.run_with_empty_overrides(self.args(limit=2))
        self.assertEqual([c['_endpoint'] for c in self.calls], ['nearby', 'text'])
        self.assertEqual(self.calls[1]['textQuery'], 'Mfobmx')

    def test_forcing_text_asks_by_name_for_every_row(self):
        self.run_with_empty_overrides(self.args(limit=2, method='text'))
        self.assertEqual([c['_endpoint'] for c in self.calls], ['text', 'text'])

    def test_a_row_without_coordinates_is_never_sent_to_google(self):
        with open(self.overture, 'a') as handle:
            handle.write('r3,Sem Sitio,,,,Lisboa,shopping,,shopping,0.9,Overture|meta\n')
        evidence = tempfile.mkdtemp(); self.addCleanup(shutil.rmtree, evidence)
        with mock.patch.object(join, 'EVIDENCE_DIR', evidence):
            self.run_with_empty_overrides(self.args(limit=3, method='text', emit=True))
        self.assertEqual([c['textQuery'] for c in self.calls], ['Sapataria Central', 'Mfobmx'])
        lines = [json.loads(l) for l in open(os.path.join(evidence, 'XX', 'r', 'suggestions.jsonl'))]
        r3 = next(l for l in lines if l['overture_id'] == 'r3')
        self.assertEqual((r3['decision'], r3['lat']), ('insufficient_evidence', None))

    def test_a_checkpoint_from_other_inputs_is_refused(self):
        self.run_with_empty_overrides(self.args(limit=2, method='text'))
        with self.assertRaises(google.CheckpointMismatch):
            self.run_with_empty_overrides(self.args(limit=2, method='auto'))
        with open(self.overture, 'a') as handle:
            handle.write('r3,Outra,38.72,-9.14,,Lisboa,shopping,,shopping,0.9,Overture|meta\n')
        with self.assertRaises(google.CheckpointMismatch):
            self.run_with_empty_overrides(self.args(limit=2, method='text'))
        self.assertEqual(len(self.calls), 2, 'a refused resume spends nothing')

    def test_plan_makes_no_call(self):
        self.run_with_empty_overrides(self.args(plan=True))
        self.assertEqual(self.calls, [])

    def test_a_run_must_say_how_much_to_look_up(self):
        with self.assertRaises(join.EmitRefused):
            self.run_with_empty_overrides(self.args())

    def test_a_resumed_run_does_not_respend_calls(self):
        self.run_with_empty_overrides(self.args(limit=2))
        self.run_with_empty_overrides(self.args(limit=2))
        self.assertEqual(len(self.calls), 2, 'second run served from the checkpoint')

    def test_the_cap_stops_a_run_and_keeps_what_it_got(self):
        self.assertEqual(self.run_with_empty_overrides(self.args(limit=2, cap=1)), 0)
        self.assertEqual(len(self.calls), 1)
        # The circle was paid for; a rerun spends only the fallback.
        self.run_with_empty_overrides(self.args(limit=2, cap=5))
        self.assertEqual([c['_endpoint'] for c in self.calls], ['nearby', 'text'])

    def test_emit_needs_a_limit_or_an_explicit_all(self):
        with self.assertRaises(join.EmitRefused):
            self.run_with_empty_overrides(self.args(emit=True))

    def test_the_request_asks_only_for_the_fields_the_match_needs(self):
        self.run_with_empty_overrides(self.args(limit=1))
        self.assertEqual(self.calls[0]['_endpoint'], 'text', 'a row alone is a text search')
        self.assertEqual(self.calls[0]['locationBias']['circle']['radius'], google.BIAS_RADIUS_M)
        self.assertNotIn('rating', google.FIELD_MASK)
        self.assertNotIn('formattedAddress', google.FIELD_MASK)

    def test_a_circle_never_declares_a_row_unlisted(self):
        self.run_with_empty_overrides(self.args(limit=2, fallback=False))
        records = [json.loads(l) for l in open(os.path.join(self.work, 'google-checkpoint.jsonl')) if '"kind": "row"' in l]
        self.assertEqual({r['decision'] for r in records}, {'verified_subtype', 'insufficient_evidence'})

    def test_a_row_google_does_not_list_goes_on_hold_reversibly(self):
        evidence = tempfile.mkdtemp(); self.addCleanup(shutil.rmtree, evidence)
        with mock.patch.object(join, 'EVIDENCE_DIR', evidence):
            self.run_with_empty_overrides(self.args(limit=2, method='text', emit=True))
        out = os.path.join(evidence, 'XX', 'r')
        draft = json.load(open(os.path.join(out, 'overrides-draft.json')))
        self.assertEqual(draft['o']['evidence_r_on_hold']['r2'],
                         {'decision': 'rejected', 'reason': 'on hold: not listed on Google Places (run r)'})
        lines = [json.loads(l) for l in open(os.path.join(out, 'suggestions.jsonl'))]
        unlisted = next(l for l in lines if l['overture_id'] == 'r2')
        self.assertEqual(unlisted['absence'], {'places_returned': 0, 'radius_m': 400})
        import validate_evidence_run as validate
        validate.check_ids(out, draft)  # the validator accepts absence as evidence for a hold

    def test_the_validator_refuses_a_hold_without_an_absence_record(self):
        import validate_evidence_run as validate
        run_dir = tempfile.mkdtemp(); self.addCleanup(shutil.rmtree, run_dir)
        with open(os.path.join(run_dir, 'suggestions.jsonl'), 'w') as handle:
            handle.write(json.dumps({'overture_id': 'x', 'decision': 'unlisted', 'candidates': []}) + '\n')
        draft = {'o': {'evidence_r_on_hold': {'x': {'decision': 'rejected', 'reason': 'on hold'}}}}
        with self.assertRaises(validate.Invalid):
            validate.check_ids(run_dir, draft)

    def test_emit_writes_the_four_files_with_google_as_the_source(self):
        evidence = tempfile.mkdtemp(); self.addCleanup(shutil.rmtree, evidence)
        with mock.patch.object(join, 'EVIDENCE_DIR', evidence):
            self.run_with_empty_overrides(self.args(limit=2, emit=True))
        out = os.path.join(evidence, 'XX', 'r')
        self.assertEqual(sorted(os.listdir(out)), ['manifest.json', 'overrides-draft.json', 'residual-report.json', 'suggestions.jsonl'])
        draft = json.load(open(os.path.join(out, 'overrides-draft.json')))
        self.assertEqual(draft['o']['evidence_r_store_shoes']['r1']['reason'], 'Google Places name and location match')
        text = open(os.path.join(out, 'suggestions.jsonl')).read()
        self.assertNotIn('Sapataria Central"', text.split('"name": "Sapataria Central"')[1] if '"name": "Sapataria Central"' in text else text,
                         'the only Google-derived text is the place id')
        self.assertNotIn('shoe_store', text)
        self.assertNotIn('_primary_type', text)


if __name__ == '__main__':
    unittest.main()
