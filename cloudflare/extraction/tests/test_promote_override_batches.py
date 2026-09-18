"""KAN-455. The batch helper's pure parts: sampling, classification, settling."""
import os
import sys
import unittest

EXTRACTION_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, EXTRACTION_DIR)

import promote_override_batches as helper  # noqa: E402

BATCHES = {
    'done': {f'd{i}': {'poi_type': 'store', 'store_kind': 'x', 'reason': 'r'} for i in range(7)},
    'excluded': {'e1': {'decision': 'rejected', 'reason': 'r'}},
    'todo': {f't{i}': {'poi_type': 'store', 'store_kind': 'x', 'reason': 'r'} for i in range(3)},
    'half': {'h1': {'poi_type': 'store', 'store_kind': 'x', 'reason': 'r'}, 'h2': {'poi_type': 'store', 'store_kind': 'x', 'reason': 'r'}},
    'lost': {'l1': {'decision': 'rejected', 'reason': 'r'}, 'l2': {'decision': 'rejected', 'reason': 'r'}},
}
STATUS = {**{f'd{i}': 'promoted' for i in range(7)}, 'e1': 'rejected', 't0': 'pending', 't1': 'pending', 't2': 'pending',
          'h1': 'promoted', 'h2': 'pending', 'l1': 'pending', 'l2': 'missing'}


class ClassifyTest(unittest.TestCase):
    def test_a_sample_is_bounded(self):
        self.assertEqual(len(helper.sample_ids(BATCHES['done'])), helper.SAMPLE)

    def test_promoted_and_rejected_both_count_as_done(self):
        verdict = helper.classify(BATCHES, STATUS)
        self.assertEqual(verdict['done'], 'promoted')
        self.assertEqual(verdict['excluded'], 'promoted')

    def test_pending_with_an_id_prod_never_staged_is_still_pending(self):
        # `reviewed_exclusions_professional` has one such id in Portugal; the
        # batch still has to run for the rest.
        verdict = helper.classify(BATCHES, STATUS)
        self.assertEqual(verdict['todo'], 'pending')
        self.assertEqual(verdict['lost'], 'pending')

    def test_a_half_run_batch_is_named_mixed(self):
        self.assertEqual(helper.classify(BATCHES, STATUS)['half'], 'mixed:pending,promoted')

    def test_settled_means_no_sampled_id_is_pending(self):
        self.assertTrue(helper.settled(BATCHES['done'], STATUS))
        self.assertFalse(helper.settled(BATCHES['todo'], STATUS))
        self.assertTrue(helper.settled(BATCHES['todo'], {'t0': 'promoted', 't1': 'rejected', 't2': 'missing'}))


class RunGuardTest(unittest.TestCase):
    def test_run_refuses_without_the_secret(self):
        os.environ.pop('BUILD_TRIGGER_SECRET', None)
        with self.assertRaises(SystemExit):
            helper.main(['run', 'todo'])

    def test_run_needs_a_batch_or_all_pending(self):
        with self.assertRaises(SystemExit):
            helper.main(['run'])


if __name__ == '__main__':
    unittest.main()
