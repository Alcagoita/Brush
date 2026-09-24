"""KAN-443 — country orchestration preserves its raw R2 checkpoint."""
import csv
import os
import sys
import tempfile
import unittest

EXTRACTION_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, EXTRACTION_DIR)
sys.path.insert(0, os.path.join(EXTRACTION_DIR, 'tests'))

from _stubs import stub_missing_dependencies  # noqa: E402
stub_missing_dependencies()

import run_job  # noqa: E402


class FakeWorker:
    def __init__(self):
        self.source = []
        self.complete = []
        self.failed = []
        self.fail_completion_once = False

    def overture_country_source(self, *args):
        self.source.append(args)

    def overture_country_complete(self, *args):
        self.complete.append(args)
        if self.fail_completion_once:
            self.fail_completion_once = False
            raise RuntimeError('completion callback failed')

    def overture_country_failed(self, *args):
        self.failed.append(args)


class FakeR2:
    def __init__(self):
        self.uploads = []
        self.downloads = []

    def upload_file(self, path, key):
        self.uploads.append((path, key))

    def download_file(self, key, path):
        self.downloads.append((key, path))
        write_csv(path)


class FakeD1:
    def __init__(self):
        self.queries = []

    def execute(self, sql):
        self.queries.append(sql)
        return {'changes': 1}

    def select(self, _sql):
        return [{'promotion_status': 'promoted', 'count': 1}]


def write_csv(path):
    with open(path, 'w', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=('overture_id', 'name', 'lat', 'lng'))
        writer.writeheader()
        writer.writerow({'overture_id': 'gers-1', 'name': 'Farmácia', 'lat': '38.7', 'lng': '-9.1'})


def write_text(path, value):
    with open(path, 'w') as handle:
        handle.write(value)


class OvertureCountryRunTest(unittest.TestCase):
    def setUp(self):
        self.originals = {name: getattr(run_job, name) for name in (
            'worker_client', 'r2_client', 'd1_client')}
        self.extract = run_job.extract_overture.extract_country
        self.report = run_job.report_overture_backlog.write_report
        self.stage = run_job.load_overture_candidates.load
        self.promote = run_job.promote_overture_candidates.run_country
        self.build_dir = run_job.extract.BUILD_DIR
        self.temp = tempfile.TemporaryDirectory()
        run_job.extract.BUILD_DIR = self.temp.name
        self.worker, self.r2, self.d1 = FakeWorker(), FakeR2(), FakeD1()
        run_job.worker_client, run_job.r2_client, run_job.d1_client = self.worker, self.r2, self.d1
        self.stage_calls, self.promote_calls = [], []
        def report(_csv, out):
            write_text(out, 'report\n')
        def stage(csv_path, source_key, refresh=False):
            self.stage_calls.append((csv_path, source_key, refresh))
            return 1
        def promote(batch, source_key):
            self.promote_calls.append((batch, source_key))
            return {'promoted': 1, 'rejected': 0, 'pending': 0}
        run_job.report_overture_backlog.write_report = report
        run_job.load_overture_candidates.load = stage
        run_job.promote_overture_candidates.run_country = promote

    def tearDown(self):
        for name, value in self.originals.items():
            setattr(run_job, name, value)
        run_job.extract_overture.extract_country = self.extract
        run_job.report_overture_backlog.write_report = self.report
        run_job.load_overture_candidates.load = self.stage
        run_job.promote_overture_candidates.run_country = self.promote
        run_job.extract.BUILD_DIR = self.build_dir
        self.temp.cleanup()

    def test_extracts_archives_then_stages_and_completes(self):
        run_job.extract_overture.extract_country = lambda _country, path, release=None: write_csv(path)
        run_job.run_overture_country('PT', 'run-1')
        self.assertEqual(self.r2.uploads[0][1], 'overture-country-sources/PT/run-1.csv')
        self.assertEqual(self.worker.source[0][2], 'overture-country-sources/PT/run-1.csv')
        self.assertEqual(self.stage_calls[0][1], 'overture-country-sources/PT/run-1.csv')
        self.assertEqual(self.promote_calls, [(run_job.OVERTURE_PROMOTION_PAGE_SIZE,
                                               'overture-country-sources/PT/run-1.csv')])
        self.assertEqual(self.worker.complete[0][3]['source_rows'], 1)
        self.assertEqual(self.worker.complete[0][3]['staged_rows'], 1)
        self.assertEqual(self.worker.failed, [])

    def test_resume_downloads_existing_archive_without_extracting_again(self):
        run_job.extract_overture.extract_country = lambda *_args: self.fail('must not extract on resume')
        run_job.run_overture_country('PT', 'run-2', 'overture-country-sources/PT/old-run.csv')
        self.assertEqual(self.r2.downloads[0][0], 'overture-country-sources/PT/old-run.csv')
        self.assertEqual(self.r2.uploads[0][1], 'overture-country-reports/PT/run-2.tsv')
        self.assertEqual(self.worker.source[0][2], 'overture-country-sources/PT/old-run.csv')

    def test_retry_after_promotion_uses_scoped_decision_counts_for_completion(self):
        run_job.extract_overture.extract_country = lambda _country, path, release=None: write_csv(path)
        self.worker.fail_completion_once = True
        with self.assertRaisesRegex(RuntimeError, 'completion callback failed'):
            run_job.run_overture_country('PT', 'run-1')
        # This is the same immutable source a Worker re-queue passes in. The
        # promotion fake still reports no per-run counts, so only the scoped
        # D1 aggregate can make the retry's terminal accounting correct.
        run_job.run_overture_country('PT', 'run-2', 'overture-country-sources/PT/run-1.csv')
        self.assertEqual(self.worker.complete[-1][3], {
            'source_rows': 1, 'staged_rows': 1, 'dropped_rows': 0,
            'promoted_rows': 1, 'rejected_rows': 0, 'pending_rows': 0,
            'release': run_job.extract_overture.OVERTURE_RELEASE,
            'new_rows': 1, 'changed_rows': 0, 'retired_rows': 0,
            'name_languages': [],
        })

    def test_a_first_import_stages_with_insert_or_ignore(self):
        run_job.extract_overture.extract_country = lambda _country, path, release=None: write_csv(path)
        run_job.run_overture_country('PT', 'run-1')
        self.assertEqual(self.stage_calls[0][2], False)
        self.assertEqual([k for k, _ in self.r2.downloads], [])

    def test_a_refresh_upserts_applies_the_diff_and_pins_the_release(self):
        # KAN-456: the previous archive is downloaded beside the new extract,
        # the loader upserts, the diff is applied, and the report carries the
        # release and the new/changed/retired counts.
        seen = {}
        run_job.extract_overture.extract_country = lambda _country, path, release=None: (seen.__setitem__('release', release), write_csv(path))
        applied = []
        saved = run_job.refresh_overture_country.apply
        run_job.refresh_overture_country.apply = lambda prev, cur, release, refreshed, execute: (
            applied.append((os.path.basename(prev), os.path.basename(cur), release)) or
            {'new_rows': 3, 'changed_rows': 2, 'retired_rows': 1})
        try:
            run_job.run_overture_country('PT', 'run-9', previous_source_r2_key='overture-country-sources/PT/old.csv', release='2026-10-15.0')
        finally:
            run_job.refresh_overture_country.apply = saved
        self.assertEqual(seen['release'], '2026-10-15.0')
        self.assertEqual(self.stage_calls[0][1:], ('overture-country-sources/PT/run-9.csv', True))
        self.assertEqual(self.r2.downloads[0][0], 'overture-country-sources/PT/old.csv')
        self.assertEqual(applied, [('PT-previous.csv', 'PT.csv', '2026-10-15.0')])
        stats = self.worker.complete[-1][3]
        self.assertEqual((stats['release'], stats['new_rows'], stats['changed_rows'], stats['retired_rows']), ('2026-10-15.0', 3, 2, 1))


if __name__ == '__main__':
    unittest.main()
