"""KAN-459. Run the extraction suite with its modules in a chosen order.

    python3 tests/run_in_order.py reverse
    python3 tests/run_in_order.py shuffle --seed 7
    python3 tests/run_in_order.py sorted

`unittest discover` loads modules in filename order, which is the one order
a stub that leaks between modules is least likely to trip on. This loads the
same modules in another order — reversed, or shuffled by a seed you can
quote in a PR — and runs them in one interpreter, which is where a
module-level stub of `requests` or `duckdb` can shadow a later module.
Exit status is unittest's.
"""
import argparse
import glob
import os
import random
import sys
import unittest

TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
EXTRACTION_DIR = os.path.dirname(TESTS_DIR)


def module_names():
    return sorted(os.path.basename(path)[:-3] for path in glob.glob(os.path.join(TESTS_DIR, 'test_*.py')))


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('order', choices=('sorted', 'reverse', 'shuffle'))
    parser.add_argument('--seed', type=int, default=0)
    parser.add_argument('-v', '--verbosity', type=int, default=1)
    args = parser.parse_args(argv)

    names = module_names()
    if args.order == 'reverse':
        names.reverse()
    elif args.order == 'shuffle':
        random.Random(args.seed).shuffle(names)
    print(f'{args.order}' + (f' (seed {args.seed})' if args.order == 'shuffle' else '') + ': ' + ' '.join(names), file=sys.stderr)

    os.chdir(EXTRACTION_DIR)
    os.environ.setdefault('BRUSH_TYPE_RELATION', 'sql')
    sys.path.insert(0, TESTS_DIR)
    loader = unittest.TestLoader()
    suite = unittest.TestSuite(loader.loadTestsFromName(name) for name in names)
    result = unittest.TextTestRunner(verbosity=args.verbosity).run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
