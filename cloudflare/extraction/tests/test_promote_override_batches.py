"""KAN-455. The batch helper's pure parts: classification, settling, the
bounded D1 reads, and the no-redirect rule on the credentialed request."""
import email
import io
import os
import sys
import unittest
import urllib.error
import urllib.request
import urllib.response
from unittest import mock

EXTRACTION_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, EXTRACTION_DIR)

import promote_override_batches as helper  # noqa: E402
import verify_prod_decisions as verify  # noqa: E402

BATCHES = {
    'done': {f'd{i}': {'poi_type': 'store', 'store_kind': 'x', 'reason': 'r'} for i in range(7)},
    'excluded': {'e1': {'decision': 'rejected', 'reason': 'r'}},
    'todo': {f't{i}': {'poi_type': 'store', 'store_kind': 'x', 'reason': 'r'} for i in range(3)},
    'half': {'h1': {'poi_type': 'store', 'store_kind': 'x', 'reason': 'r'}, 'h2': {'poi_type': 'store', 'store_kind': 'x', 'reason': 'r'}},
    'lost': {'l1': {'decision': 'rejected', 'reason': 'r'}, 'l2': {'decision': 'rejected', 'reason': 'r'}},
    # Six ids: the first five promoted, the sixth still pending. A sample of
    # five would call this batch done; it is not.
    'tail': {f'x{i}': {'poi_type': 'store', 'store_kind': 'x', 'reason': 'r'} for i in range(6)},
}
STATUS = {**{f'd{i}': 'promoted' for i in range(7)}, 'e1': 'rejected', 't0': 'pending', 't1': 'pending', 't2': 'pending',
          'h1': 'promoted', 'h2': 'pending', 'l1': 'pending', 'l2': 'missing',
          **{f'x{i}': 'promoted' for i in range(5)}, 'x5': 'pending'}


class ClassifyTest(unittest.TestCase):
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

    def test_a_pending_id_past_the_first_five_still_counts(self):
        # Every id decides, not a sample: the batch is mixed, not promoted.
        self.assertEqual(helper.classify(BATCHES, STATUS)['tail'], 'mixed:pending,promoted')

    def test_settled_means_no_id_at_all_is_pending(self):
        self.assertTrue(helper.settled(BATCHES['done'], STATUS))
        self.assertFalse(helper.settled(BATCHES['todo'], STATUS))
        self.assertFalse(helper.settled(BATCHES['tail'], STATUS))
        self.assertTrue(helper.settled(BATCHES['todo'], {'t0': 'promoted', 't1': 'rejected', 't2': 'missing'}))
        self.assertTrue(helper.settled(BATCHES['tail'], {**STATUS, 'x5': 'promoted'}))


class CandidateStatusTest(unittest.TestCase):
    def test_every_id_is_read_in_lists_of_at_most_150(self):
        ids = [f'id{i}' for i in range(331)]
        asked = []

        def fake_query(sql):
            asked.append(sql)
            return [{'overture_id': i, 'promotion_status': 'pending'} for i in ids if f"'{i}'" in sql]

        with mock.patch.object(helper, 'query', fake_query):
            found = helper.candidate_status(ids)
        self.assertEqual(len(asked), 3)
        self.assertEqual([sql.count("'id") for sql in asked], [150, 150, 31])
        self.assertEqual(set(found), set(ids))
        self.assertTrue(all(v == 'pending' for v in found.values()))


def transport_answering_302(opener, sent):
    """Patch only the transport of `opener`: every request is recorded and
    answered with a 302 elsewhere, so the opener's own handler chain — the
    redirect handler included — runs exactly as it would against prod."""
    https = next(h for h in opener.handlers if isinstance(h, urllib.request.HTTPSHandler))

    def https_open(req):
        sent.append(req)
        headers = email.message_from_string('Location: https://elsewhere.example/steal\n')
        response = urllib.response.addinfourl(io.BytesIO(b''), headers, req.full_url, 302)
        response.msg = 'Found'
        return response

    return mock.patch.object(https, 'https_open', https_open)


class NoRedirectTest(unittest.TestCase):
    """A 3xx from the endpoint fails; the credential is never re-sent."""

    def test_redirect_handler_refuses_every_3xx(self):
        req = urllib.request.Request('https://poi-api.brushaway.app/x', headers={'X-Build-Secret': 's'})
        for cls in (helper.NoRedirect, verify.NoRedirect):
            for code in (301, 302, 303, 307, 308):
                self.assertIsNone(cls().redirect_request(req, None, code, 'moved', {}, 'https://elsewhere.example/'))

    def test_both_openers_use_it(self):
        for opener, cls in ((helper.OPENER, helper.NoRedirect), (verify.OPENER, verify.NoRedirect)):
            redirectors = [h for h in opener.handlers if isinstance(h, urllib.request.HTTPRedirectHandler)]
            self.assertEqual([type(h) for h in redirectors], [cls])

    def test_trigger_fails_loudly_on_302_and_sends_the_secret_once(self):
        sent = []
        with transport_answering_302(helper.OPENER, sent):
            with self.assertRaises(SystemExit) as stop:
                helper.trigger('todo', 'the-secret')
        self.assertIn('302', str(stop.exception))
        self.assertEqual(len(sent), 1)
        self.assertEqual(sent[0].full_url, f'{helper.WORKER}/internal/overture-country/overrides')
        self.assertEqual(sent[0].get_header('X-build-secret'), 'the-secret')

    def test_nearby_fails_loudly_on_302_and_sends_the_key_once(self):
        sent = []
        with transport_answering_302(verify.OPENER, sent):
            with self.assertRaises(SystemExit) as stop:
                verify.nearby('the-key', 38.0, -9.0, 100, ['store'])
        self.assertIn('302', str(stop.exception))
        self.assertEqual(len(sent), 1)
        self.assertEqual(sent[0].full_url, verify.ENDPOINT)
        self.assertEqual(sent[0].get_header('X-api-key'), 'the-key')


class RunGuardTest(unittest.TestCase):
    def test_run_refuses_without_the_secret(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop('BUILD_TRIGGER_SECRET', None)
            with self.assertRaises(SystemExit):
                helper.main(['run', 'todo'])

    def test_run_needs_a_batch_or_all_pending(self):
        with self.assertRaises(SystemExit):
            helper.main(['run'])


if __name__ == '__main__':
    unittest.main()
