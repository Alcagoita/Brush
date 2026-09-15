"""KAN-449. Google Places as the third evidence source: same rule, same gate,
and nothing of Google's written down but the place id."""
import io
import json
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

    def test_candidates_carry_no_google_text(self):
        _, _, _, _, cands = self.decide('Sapataria Central', [place('g1', 'Sapataria Central', 'shoe_store', north_m=10)])
        self.assertEqual(set(cands[0]), {'source', 'id', 'distance_m', 'similarity', 'exact'})


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

        def fetch(request, timeout=None):
            self.calls.append(json.loads(request.data))
            body = {'places': [place('g1', 'Sapataria Central', 'shoe_store', north_m=10)]} \
                if 'Sapataria' in request.data.decode() else {'places': []}
            return io.BytesIO(json.dumps(body).encode())

        class Ctx:
            def __init__(self, buf): self.buf = buf
            def __enter__(self): return self.buf
            def __exit__(self, *a): return False

        self.fetch = lambda request, timeout=None: Ctx(fetch(request, timeout))

    def args(self, **overrides):
        base = dict(country='xx', overture_key='o', overture=self.overture, limit=None, all=False, emit=False,
                    control=False, control_manifest=None, report_out=None, cap=google.FREE_TIER_CAP,
                    run_id='r', work_dir=self.work, api_key='k')
        base.update(overrides)
        return types.SimpleNamespace(**base)

    def run_with_empty_overrides(self, args):
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as handle:
            json.dump({}, handle)
        self.addCleanup(os.unlink, handle.name)
        with mock.patch.object(join, 'OVERRIDES_PATH', handle.name):
            return google.run(args, fetch=self.fetch)

    def test_dry_run_calls_google_and_writes_no_run(self):
        evidence = tempfile.mkdtemp(); self.addCleanup(shutil.rmtree, evidence)
        with mock.patch.object(join, 'EVIDENCE_DIR', evidence):
            self.assertEqual(self.run_with_empty_overrides(self.args(limit=2)), 0)
        self.assertEqual(len(self.calls), 2)
        self.assertEqual(os.listdir(evidence), [])

    def test_a_resumed_run_does_not_respend_calls(self):
        self.run_with_empty_overrides(self.args(limit=2))
        self.run_with_empty_overrides(self.args(limit=2))
        self.assertEqual(len(self.calls), 2, 'second run served from the checkpoint')

    def test_the_cap_stops_a_run_before_it_leaves_the_free_tier(self):
        with self.assertRaises(google.CapReached):
            self.run_with_empty_overrides(self.args(limit=2, cap=1))
        self.assertEqual(len(self.calls), 1)

    def test_emit_needs_a_limit_or_an_explicit_all(self):
        with self.assertRaises(join.EmitRefused):
            self.run_with_empty_overrides(self.args(emit=True))

    def test_the_request_asks_only_for_the_fields_the_match_needs(self):
        self.run_with_empty_overrides(self.args(limit=1))
        self.assertEqual(self.calls[0]['locationBias']['circle']['radius'], google.BIAS_RADIUS_M)
        self.assertNotIn('rating', google.FIELD_MASK)
        self.assertNotIn('formattedAddress', google.FIELD_MASK)

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


if __name__ == '__main__':
    unittest.main()
