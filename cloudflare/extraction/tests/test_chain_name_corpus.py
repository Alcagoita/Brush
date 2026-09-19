"""KAN-455. The reviewed corpus of real Portuguese names, run through decide().

`fixtures/chain_name_corpus.tsv` holds every chain-matching example this
sprint produced, with the decision the owner expects. A new edge case is a
new row there, not a new unit test. `expected` is one of:

  chain:<kind>[+<kind>]  promoted by the store-chain rule with exactly these kinds
  fallback:<type>        promoted by the non-store fallback as this type
  refused                the brand is in the name but no chain decision is made
  pending                left pending
"""
import csv
import os
import sys
import unittest

EXTRACTION_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, EXTRACTION_DIR)
sys.path.insert(0, os.path.join(EXTRACTION_DIR, 'tests'))
os.environ.setdefault('BRUSH_TYPE_RELATION', 'sql')

from test_chain_brands import Fixture  # noqa: E402

CORPUS = os.path.join(EXTRACTION_DIR, 'tests', 'fixtures', 'chain_name_corpus.tsv')


def corpus():
    with open(CORPUS, newline='') as handle:
        return list(csv.DictReader(handle, delimiter='\t'))


class ChainNameCorpusTest(unittest.TestCase):
    def test_the_corpus_is_well_formed(self):
        rows = corpus()
        self.assertGreater(len(rows), 60)
        for row in rows:
            self.assertTrue(row['name'] and row['expected'] and row['reason'], row)
            kind, _, detail = row['expected'].partition(':')
            self.assertIn(kind, ('chain', 'fallback', 'refused', 'pending'), row)
            self.assertEqual(bool(detail), kind in ('chain', 'fallback'), row)

    def test_every_row_decides_as_reviewed(self):
        failures = []
        for row in corpus():
            status, types, kinds, reason = Fixture.decide(row['name'], row['category'])
            kind, _, detail = row['expected'].partition(':')
            reason = reason or ''
            if kind == 'chain':
                ok = status == 'promoted' and reason.startswith('brand: store/') and kinds == tuple(sorted(detail.split('+')))
            elif kind == 'fallback':
                ok = status == 'promoted' and reason == f'brand: {detail}' and types[:1] == (detail,)
            elif kind == 'refused':
                ok = not reason.startswith('brand:')
            else:
                ok = status == 'pending'
            if not ok:
                failures.append(f"{row['name']!r} ({row['category'] or 'no category'}): expected {row['expected']}, "
                                f"got {status} {'/'.join(types)} {kinds} {reason!r} — {row['reason']}")
        self.assertEqual(failures, [], '\n' + '\n'.join(failures))


if __name__ == '__main__':
    unittest.main()
