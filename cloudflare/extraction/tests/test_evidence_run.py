"""KAN-446. The one-command evidence join and the validator that gates it."""
import csv
import hashlib
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

import run_evidence_join as job
import validate_evidence_run as validator

OVERTURE_KEY = 'overture-country-sources/XX/test.csv'
BASE_LAT, BASE_LNG = 38.7200, -9.1400


def write_overture(path, rows):
    with open(path, 'w', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=(
            'overture_id', 'name', 'lat', 'lng', 'address', 'locality', 'category',
            'basic_category', 'category_path', 'confidence', 'source_datasets'))
        writer.writeheader()
        for row in rows:
            writer.writerow({'address': None, 'locality': 'Lisboa', 'category': 'shopping',
                             'basic_category': None, 'category_path': 'shopping', 'confidence': 0.9,
                             'source_datasets': 'Overture|meta', 'lat': BASE_LAT, 'lng': BASE_LNG, **row})


def write_foursquare(path, rows):
    with open(path, 'w', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=(
            'fsq_place_id', 'name', 'latitude', 'longitude', 'address', 'locality', 'category_ids', 'category_labels'))
        writer.writeheader()
        for row in rows:
            writer.writerow({'address': '', 'locality': '', 'category_ids': '',
                             'latitude': BASE_LAT, 'longitude': BASE_LNG, **row})


def write_osm(path, rows):
    with open(path, 'w', newline='') as handle:
        writer = csv.writer(handle, delimiter='\t')
        writer.writerow(('osm_id', 'name', 'lat', 'lng', 'family', 'excluding', 'tags'))
        for row in rows:
            writer.writerow(row)


class ResidualDerivationTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.dir)
        self.overture = os.path.join(self.dir, 'overture.csv')

    def residual_with_overrides(self, overrides):
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as handle:
            json.dump({OVERTURE_KEY: overrides}, handle)
        self.addCleanup(os.unlink, handle.name)
        with mock.patch.object(job, 'OVERRIDES_PATH', handle.name):
            return [r['overture_id'] for r in job.residual_rows(self.overture, OVERTURE_KEY)]

    def test_only_generic_shopping_rows_the_real_decision_leaves_pending(self):
        write_overture(self.overture, [
            {'overture_id': 'opaque', 'name': 'Mfobmx'},
            {'overture_id': 'named', 'name': 'Papelaria Central'},      # a name rule types it
            {'overture_id': 'pharmacy', 'name': 'Farmácia', 'category': 'pharmacy'},
        ])
        self.assertEqual(self.residual_with_overrides({}), ['opaque'])

    def test_a_row_in_any_reviewed_batch_is_never_re_audited(self):
        write_overture(self.overture, [{'overture_id': 'opaque', 'name': 'Mfobmx'}])
        decided = {'batch': {'opaque': {'poi_type': 'store', 'store_kind': 'gift', 'reason': 'reviewed'}}}
        self.assertEqual(self.residual_with_overrides(decided), [])


class JoinTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.dir)
        self.fsq = os.path.join(self.dir, 'fsq.csv')
        self.osm = os.path.join(self.dir, 'osm.tsv')

    def test_ambiguous_kinds_fail_closed_rather_than_taking_the_nearest(self):
        write_foursquare(self.fsq, [
            {'fsq_place_id': 'a', 'name': 'Central', 'category_labels': 'Retail > Optometrist'},
            {'fsq_place_id': 'b', 'name': 'Central', 'category_labels': 'Retail > Jewelry Store',
             'latitude': BASE_LAT + 0.0001},
        ])
        write_osm(self.osm, [])
        rows = [{'overture_id': 'x', 'name': 'Central', 'lat': BASE_LAT, 'lng': BASE_LNG, 'locality': 'Lisboa'}]
        suggestions, counts = job.join(rows, self.fsq, self.osm)
        self.assertEqual(suggestions[0]['decision'], 'insufficient_evidence')
        self.assertIn('disagree', suggestions[0]['reason'])
        self.assertEqual(len(suggestions[0]['candidates']), 2, 'both candidates stay in the evidence')

    def test_osm_only_revisits_what_foursquare_left_open(self):
        write_foursquare(self.fsq, [
            {'fsq_place_id': 'a', 'name': 'Ótica Malhoa', 'category_labels': 'Retail > Optometrist'}])
        write_osm(self.osm, [('node/1', 'Ótica Malhoa', BASE_LAT, BASE_LNG, 'shop=jewelry', '',
                              json.dumps({'shop': 'jewelry', 'name': 'Ótica Malhoa'}))])
        rows = [{'overture_id': 'x', 'name': 'Ótica Malhoa', 'lat': BASE_LAT, 'lng': BASE_LNG, 'locality': ''}]
        suggestions, _ = job.join(rows, self.fsq, self.osm)
        self.assertEqual((suggestions[0]['source'], suggestions[0]['store_kind']),
                         ('foursquare', 'eyewear_and_optician'))
        self.assertFalse(any(c['source'] == 'osm' for c in suggestions[0]['candidates']))

    def test_a_row_without_coordinates_is_unresolved_not_a_crash(self):
        write_foursquare(self.fsq, [])
        write_osm(self.osm, [])
        rows = [{'overture_id': 'x', 'name': 'Loja da Ana', 'lat': '', 'lng': '', 'locality': ''}]
        suggestions, counts = job.join(rows, self.fsq, self.osm)
        self.assertEqual(suggestions[0]['decision'], 'insufficient_evidence')
        self.assertIn('no coordinates', suggestions[0]['reason'])
        self.assertEqual(counts[('insufficient_evidence', '')], 1)

    def test_the_draft_holds_only_decided_rows_in_promotion_shape(self):
        suggestions = [
            {'overture_id': 'a', 'decision': 'verified_subtype', 'poi_type': 'store', 'store_kind': 'gift', 'source': 'osm'},
            {'overture_id': 'b', 'decision': 'verified_subtype', 'poi_type': 'supermarket', 'store_kind': '', 'source': 'osm'},
            {'overture_id': 'c', 'decision': 'excluded', 'poi_type': '', 'store_kind': '', 'source': 'foursquare'},
            {'overture_id': 'd', 'decision': 'insufficient_evidence', 'poi_type': '', 'store_kind': '', 'source': ''},
        ]
        draft = job.overrides_draft(suggestions, OVERTURE_KEY, 'run1')[OVERTURE_KEY]
        self.assertEqual(draft['evidence_run1_store_gift']['a'],
                         {'poi_type': 'store', 'store_kind': 'gift', 'reason': 'OSM name and location match'})
        self.assertEqual(draft['evidence_run1_supermarket']['b'],
                         {'poi_type': 'supermarket', 'reason': 'OSM name and location match'})
        self.assertEqual(draft['evidence_run1_exclusions']['c']['decision'], 'rejected')
        self.assertNotIn('d', {i for b in draft.values() for i in b})


class SafeguardsTest(unittest.TestCase):
    def test_emit_without_explicit_keys_is_refused_before_any_download(self):
        args = types.SimpleNamespace(country='xx', emit=True, overture_key=None, source_key='k', osm_key='k',
                                     pbf=None, run_id=None, work_dir=None, worker_url=None, secret=None, reaudit_prefix=None)
        with mock.patch.object(job, 'r2_get') as download, self.assertRaises(job.EmitRefused):
            job.run(args)
        download.assert_not_called()

    def test_dry_run_writes_nothing_and_uploads_nothing(self):
        work = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, work)
        evidence = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, evidence)
        write_overture(os.path.join(work, 'src-overture.csv'), [{'overture_id': 'x', 'name': 'Mfobmx'}])
        write_foursquare(os.path.join(work, 'src-fsq.csv'), [])
        write_osm(os.path.join(work, 'src-osm.tsv'), [])

        def fake_get(key, local):
            shutil.copy(os.path.join(work, {'o': 'src-overture.csv', 'f': 'src-fsq.csv', 's': 'src-osm.tsv'}[key]), local)
            return local

        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as handle:
            json.dump({'o': {}}, handle)
        self.addCleanup(os.unlink, handle.name)
        args = types.SimpleNamespace(country='xx', emit=False, overture_key='o', source_key='f', osm_key='s',
                                     pbf=None, run_id="r", work_dir=work, worker_url=None, secret=None, reaudit_prefix=None)
        with mock.patch.object(job, 'r2_get', side_effect=fake_get), \
                mock.patch.object(job, 'r2_put') as upload, \
                mock.patch.object(job, 'EVIDENCE_DIR', evidence), \
                mock.patch.object(job, 'OVERRIDES_PATH', handle.name):
            self.assertEqual(job.run(args), 0)
        upload.assert_not_called()
        self.assertEqual(os.listdir(evidence), [])

    def emit_args(self, work, **overrides):
        base = dict(country='xx', emit=True, overture_key='o', source_key='f', osm_key='s', pbf=None,
                    run_id='r', work_dir=work, worker_url=None, secret=None, reaudit_prefix=None)
        base.update(overrides)
        return types.SimpleNamespace(**base)

    def prepared_emit(self):
        work = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, work)
        evidence = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, evidence)
        write_overture(os.path.join(work, 'src-overture.csv'), [{'overture_id': 'x', 'name': 'Mfobmx'}])
        write_foursquare(os.path.join(work, 'src-fsq.csv'), [])
        write_osm(os.path.join(work, 'src-osm.tsv'), [])

        def fake_get(key, local):
            shutil.copy(os.path.join(work, {'o': 'src-overture.csv', 'f': 'src-fsq.csv', 's': 'src-osm.tsv'}[key]), local)
            return local

        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as handle:
            json.dump({'o': {}}, handle)
        self.addCleanup(os.unlink, handle.name)
        return work, evidence, fake_get, handle.name

    def test_emit_refuses_to_overwrite_an_existing_run(self):
        work, evidence, fake_get, overrides = self.prepared_emit()
        os.makedirs(os.path.join(evidence, 'XX', 'r'))
        with mock.patch.object(job, 'r2_get', side_effect=fake_get), mock.patch.object(job, 'r2_put'), \
                mock.patch.object(job, 'EVIDENCE_DIR', evidence), mock.patch.object(job, 'OVERRIDES_PATH', overrides), \
                self.assertRaisesRegex(SystemExit, 'refusing to overwrite'):
            job.run(self.emit_args(work))

    def test_a_failed_archive_upload_leaves_no_run_directory(self):
        work, evidence, fake_get, overrides = self.prepared_emit()
        with mock.patch.object(job, 'r2_get', side_effect=fake_get), \
                mock.patch.object(job, 'r2_put', side_effect=RuntimeError('r2 down')), \
                mock.patch.object(job, 'EVIDENCE_DIR', evidence), mock.patch.object(job, 'OVERRIDES_PATH', overrides), \
                mock.patch.object(job, 'geofabrik_pbf', return_value=(os.path.join(work, 'src-osm.tsv'), {'url': 'u', 'last_modified': 'l', 'sha256': 'x'})), \
                mock.patch.dict(sys.modules, {'extract_osm_retail_pbf': types.SimpleNamespace(
                    run=lambda pbf, out, report: shutil.copy(os.path.join(work, 'src-osm.tsv'), out))}), \
                self.assertRaises(RuntimeError):
            job.run(self.emit_args(work, osm_key=None))
        self.assertFalse(os.path.exists(os.path.join(evidence, 'XX', 'r')))

    def test_emit_needs_the_archive_keys_but_not_an_osm_key(self):
        for missing in ('overture_key', 'source_key'):
            args = self.emit_args('/nonexistent', **{missing: None})
            with mock.patch.object(job, 'r2_get') as download, self.assertRaises(job.EmitRefused):
                job.run(args)
            download.assert_not_called()

    def test_config_hash_changes_when_a_decision_constant_changes(self):
        before = job.config_hash()
        with mock.patch.object(job.fsq, 'MATCH_LADDER', ((25.0, 0.10),)):
            self.assertNotEqual(job.config_hash(), before)
        self.assertEqual(job.config_hash(), before)


class OfflineTypeRelationTest(unittest.TestCase):
    def test_the_committed_sql_yields_the_relation_without_d1(self):
        from analyse_poi_candidates import type_relation_pairs_from_sql
        pairs = set(type_relation_pairs_from_sql())
        self.assertIn(('supermarket', 'grocery_store'), pairs)
        self.assertIn(('atm', 'bank'), pairs)
        self.assertGreater(len(pairs), 40)

    def test_the_validator_never_reaches_for_d1(self):
        with mock.patch.object(validator, 'subprocess') as sub:
            sub.run.side_effect = AssertionError('validator must not shell out for the type relation')
            from analyse_poi_candidates import reachable_types
            self.assertIn('store', reachable_types())


class ValidatorTest(unittest.TestCase):
    def setUp(self):
        self.run_dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.run_dir)
        self.suggestions = [
            {'overture_id': 'a', 'decision': 'verified_subtype', 'poi_type': 'store', 'store_kind': 'gift',
             'candidates': [{'source': 'osm', 'id': 'node/1'}]},
            {'overture_id': 'b', 'decision': 'insufficient_evidence', 'poi_type': '', 'store_kind': '', 'candidates': []},
        ]
        self.draft = {OVERTURE_KEY: {'evidence_r_store_gift': {
            'a': {'poi_type': 'store', 'store_kind': 'gift', 'reason': 'r'}}}}
        self.write_run()

    def write_run(self, draft=None):
        draft = self.draft if draft is None else draft
        outputs = {
            'suggestions.jsonl': ''.join(json.dumps(s) + '\n' for s in self.suggestions).encode(),
            'overrides-draft.json': json.dumps(draft).encode(),
            'residual-report.json': b'{}',
        }
        for name, data in outputs.items():
            with open(os.path.join(self.run_dir, name), 'wb') as handle:
                handle.write(data)
        with open(os.path.join(self.run_dir, 'manifest.json'), 'w') as handle:
            json.dump({'run_id': 'r', 'outputs': {n: hashlib.sha256(d).hexdigest() for n, d in outputs.items()}}, handle)
        # The overrides file carries exactly the draft unless a test says otherwise.
        self.write_overrides(draft)

    def write_overrides(self, content):
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as handle:
            json.dump(content, handle)
        self.addCleanup(os.unlink, handle.name)
        patcher_root = mock.patch.object(validator, 'ROOT', os.path.dirname(handle.name))
        patcher_rel = mock.patch.object(validator, 'OVERRIDES_RELATIVE', os.path.basename(handle.name))
        patcher_root.start(); patcher_rel.start()
        self.addCleanup(patcher_root.stop); self.addCleanup(patcher_rel.stop)

    def test_a_coherent_run_validates(self):
        self.assertEqual(validator.validate(self.run_dir, None), 1)

    def test_a_manifest_missing_an_output_fails(self):
        with open(os.path.join(self.run_dir, 'manifest.json')) as handle:
            manifest = json.load(handle)
        del manifest['outputs']['residual-report.json']
        with open(os.path.join(self.run_dir, 'manifest.json'), 'w') as handle:
            json.dump(manifest, handle)
        with self.assertRaisesRegex(validator.Invalid, 'exactly'):
            validator.validate(self.run_dir, None)

    def test_a_tampered_output_fails_the_hash_check(self):
        with open(os.path.join(self.run_dir, 'overrides-draft.json'), 'a') as handle:
            handle.write(' ')
        with self.assertRaisesRegex(validator.Invalid, 'hashes to'):
            validator.validate(self.run_dir, None)

    def test_an_id_absent_from_suggestions_fails(self):
        self.draft[OVERTURE_KEY]['evidence_r_store_gift']['ghost'] = {'poi_type': 'store', 'store_kind': 'gift', 'reason': 'r'}
        self.write_run()
        with self.assertRaisesRegex(validator.Invalid, 'not in suggestions'):
            validator.validate(self.run_dir, None)

    def test_an_id_in_two_batches_fails(self):
        self.draft[OVERTURE_KEY]['evidence_r_store_home'] = {'a': {'poi_type': 'store', 'store_kind': 'home', 'reason': 'r'}}
        self.write_run()
        with self.assertRaisesRegex(validator.Invalid, 'appears in both'):
            validator.validate(self.run_dir, None)

    def test_an_unresolved_row_promoted_anyway_fails(self):
        self.draft[OVERTURE_KEY]['evidence_r_store_gift']['b'] = {'poi_type': 'store', 'store_kind': 'gift', 'reason': 'r'}
        self.write_run()
        with self.assertRaisesRegex(validator.Invalid, 'insufficient_evidence'):
            validator.validate(self.run_dir, None)

    def test_an_unreachable_type_fails_the_promotion_gate(self):
        self.draft[OVERTURE_KEY]['evidence_r_store_gift']['a'] = {'poi_type': 'car_repair', 'reason': 'r'}
        self.write_run()
        with self.assertRaisesRegex(validator.Invalid, 'promotion'):
            validator.validate(self.run_dir, None)

    def test_overrides_that_differ_from_the_draft_fail(self):
        edited = json.loads(json.dumps(self.draft))
        edited[OVERTURE_KEY]['evidence_r_store_gift']['a']['store_kind'] = 'home'
        self.write_overrides(edited)
        with self.assertRaisesRegex(validator.Invalid, 'entries differ'):
            validator.validate(self.run_dir, None)

    def test_an_undrafted_batch_for_the_run_fails(self):
        extra = json.loads(json.dumps(self.draft))
        extra[OVERTURE_KEY]['evidence_r_store_home'] = {'z': {'poi_type': 'store', 'store_kind': 'home', 'reason': 'r'}}
        self.write_overrides(extra)
        with self.assertRaisesRegex(validator.Invalid, 'not in draft'):
            validator.validate(self.run_dir, None)

    def test_a_modified_existing_batch_fails(self):
        old = {'src': {'reviewed': {'x': {'poi_type': 'store', 'store_kind': 'gift', 'reason': 'r'}}}}
        new = {'src': {'reviewed': {'x': {'poi_type': 'store', 'store_kind': 'home', 'reason': 'r'}},
                       'evidence_new': {}}}
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as handle:
            json.dump(new, handle)
        self.addCleanup(os.unlink, handle.name)
        fake = types.SimpleNamespace(stdout=json.dumps(old))
        with mock.patch.object(validator.subprocess, 'run', return_value=fake), \
                mock.patch.object(validator, 'ROOT', os.path.dirname(handle.name)), \
                mock.patch.object(validator, 'OVERRIDES_RELATIVE', os.path.basename(handle.name)), \
                self.assertRaisesRegex(validator.Invalid, 'was modified'):
            validator.check_existing_batches_unchanged('base')

    def test_a_logged_reversal_may_leave_a_reviewed_batch(self):
        old = {'src': {'reviewed': {'x': {'poi_type': 'store', 'store_kind': 'gift', 'reason': 'r'},
                                    'y': {'poi_type': 'store', 'store_kind': 'gift', 'reason': 'r'}}}}
        new = {'src': {'reviewed': {'y': old['src']['reviewed']['y']}}}
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as handle:
            json.dump(new, handle)
        self.addCleanup(os.unlink, handle.name)
        fake = types.SimpleNamespace(stdout=json.dumps(old))
        logged = {('src', 'reviewed', 'x'): {'reason': 'kiosk promoted as pharmacy'}}
        with mock.patch.object(validator.subprocess, 'run', return_value=fake), \
                mock.patch.object(validator, 'ROOT', os.path.dirname(handle.name)), \
                mock.patch.object(validator, 'OVERRIDES_RELATIVE', os.path.basename(handle.name)):
            with mock.patch.object(validator, 'reversals', return_value={}), \
                    self.assertRaisesRegex(validator.Invalid, 'without a reversal entry'):
                validator.check_existing_batches_unchanged('base')
            with mock.patch.object(validator, 'reversals', return_value=logged):
                validator.check_existing_batches_unchanged('base')

    def test_an_old_batch_may_not_gain_ids(self):
        old = {'src': {'reviewed': {'x': {'poi_type': 'store', 'store_kind': 'gift', 'reason': 'r'}}}}
        new = {'src': {'reviewed': {**old['src']['reviewed'], 'z': {'poi_type': 'store', 'store_kind': 'gift', 'reason': 'r'}}}}
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as handle:
            json.dump(new, handle)
        self.addCleanup(os.unlink, handle.name)
        fake = types.SimpleNamespace(stdout=json.dumps(old))
        with mock.patch.object(validator.subprocess, 'run', return_value=fake), \
                mock.patch.object(validator, 'ROOT', os.path.dirname(handle.name)), \
                mock.patch.object(validator, 'OVERRIDES_RELATIVE', os.path.basename(handle.name)), \
                self.assertRaisesRegex(validator.Invalid, 'gained ids'):
            validator.check_existing_batches_unchanged('base')

    def test_adding_a_batch_leaves_existing_ones_valid(self):
        old = {'src': {'reviewed': {'x': {'poi_type': 'store', 'store_kind': 'gift', 'reason': 'r'}}}}
        new = {'src': {**old['src'], 'evidence_new': {'y': {'poi_type': 'store', 'store_kind': 'home', 'reason': 'r'}}}}
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as handle:
            json.dump(new, handle)
        self.addCleanup(os.unlink, handle.name)
        fake = types.SimpleNamespace(stdout=json.dumps(old))
        with mock.patch.object(validator.subprocess, 'run', return_value=fake), \
                mock.patch.object(validator, 'ROOT', os.path.dirname(handle.name)), \
                mock.patch.object(validator, 'OVERRIDES_RELATIVE', os.path.basename(handle.name)):
            validator.check_existing_batches_unchanged('base')


if __name__ == '__main__':
    unittest.main()
