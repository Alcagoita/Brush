"""KAN-455. Reviewed override batches: which are promoted in prod, and run the rest.

    python3 promote_override_batches.py status
    BUILD_TRIGGER_SECRET=… python3 promote_override_batches.py run <batch> [<batch> …]
    BUILD_TRIGGER_SECRET=… python3 promote_override_batches.py run --all-pending

`status` is read-only: for every batch in `overtureCandidateOverrides.json`
it samples up to SAMPLE ids, fetches their `promotion_status` from prod in
lists of at most 150, and says whether the batch is promoted, pending, or
mixed. That is the only way to know — the batch runs leave no ledger and
the wrangler migration tracker is not in use (CLAUDE.md).

`run` writes to production and is the owner's call. It POSTs one batch to
`/internal/overture-country/overrides` — the Worker starts an
`overture-overrides` container for exactly that batch's ids, the same path
KAN-432 used — waits until the sampled ids have left `pending`, then moves
to the next. Sequential on purpose: one container at a time, and a batch
that does not settle stops the run instead of piling more on.

Reversals (`docs/evidence/reversals.jsonl`) need nothing here: a withdrawn id
is no longer in its batch, so a run never touches it. Whether prod already
served it is `status`'s business — run `status --reversals` to see.
"""
import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

EXTRACTION_DIR = os.path.dirname(os.path.abspath(__file__))
CLOUDFLARE_DIR = os.path.dirname(EXTRACTION_DIR)
ROOT = os.path.dirname(CLOUDFLARE_DIR)
OVERRIDES_PATH = os.path.join(CLOUDFLARE_DIR, 'src', 'overtureCandidateOverrides.json')
REVERSALS_PATH = os.path.join(ROOT, 'docs', 'evidence', 'reversals.jsonl')
SOURCE_KEY = 'overture-country-sources/PT/1ea48e22-9b0d-47a2-beb7-29f5203bc204.csv'
WORKER = 'https://poi-api.brushaway.app'
BATCH = 150
SAMPLE = 5
POLL_SECONDS = 20
SETTLE_TIMEOUT = 600


def load_batches(path=OVERRIDES_PATH, source_key=SOURCE_KEY):
    with open(path) as handle:
        return json.load(handle)[source_key]


def sql_escape(value):
    return "'" + value.replace("'", "''") + "'"


def query(sql, attempts=3):
    last = None
    for _ in range(attempts):
        result = subprocess.run(
            ['npx', 'wrangler', 'd1', 'execute', 'brush-poi-registry', '--remote', '--json', '--command', sql],
            cwd=CLOUDFLARE_DIR, capture_output=True, text=True)
        if result.returncode == 0:
            return json.loads(result.stdout)[0]['results']
        last = (result.stdout + result.stderr)[-400:]
        if '429' in last:
            raise SystemExit(f'D1 answered 429 — stop: {last}')
        time.sleep(2)
    raise RuntimeError(f'D1 read failed after {attempts} attempts: {last}')


def candidate_status(ids):
    """promotion_status per id from prod, in bounded lists. Ids prod does not
    know come back as 'missing'."""
    ids = list(ids)
    status = {i: 'missing' for i in ids}
    for start in range(0, len(ids), BATCH):
        chunk = ','.join(sql_escape(i) for i in ids[start:start + BATCH])
        for row in query(f'SELECT overture_id, promotion_status FROM overture_candidate WHERE overture_id IN ({chunk})'):
            status[row['overture_id']] = row['promotion_status']
    return status


def classify(batches, status):
    """One word per batch from the statuses of its sampled ids."""
    verdict = {}
    for name, entries in batches.items():
        seen = {status.get(i, 'missing') for i in sample_ids(entries)}
        if seen <= {'promoted', 'rejected'}:
            verdict[name] = 'promoted'
        elif seen == {'pending'} or seen == {'pending', 'missing'}:
            verdict[name] = 'pending'
        else:
            verdict[name] = 'mixed:' + ','.join(sorted(seen))
    return verdict


def sample_ids(entries):
    return list(entries)[:SAMPLE]


def status(args):
    batches = load_batches()
    ids = [i for entries in batches.values() for i in sample_ids(entries)]
    found = candidate_status(ids)
    verdict = classify(batches, found)
    for name, entries in batches.items():
        print(f'{verdict[name]:10} {len(entries):4}  {name}')
    counts = {}
    for v in verdict.values():
        counts[v.split(':')[0]] = counts.get(v.split(':')[0], 0) + 1
    print(f'\n{counts}', file=sys.stderr)
    missing = [i for i, s in found.items() if s == 'missing']
    if missing:
        print(f'ids not in overture_candidate at all: {missing}', file=sys.stderr)
    if args.reversals:
        with open(REVERSALS_PATH) as handle:
            reversed_ids = [json.loads(line)['overture_id'] for line in handle if line.strip()]
        served = set()
        for start in range(0, len(reversed_ids), BATCH):
            chunk = ','.join(sql_escape(i) for i in reversed_ids[start:start + BATCH])
            served.update(r['overture_id'] for r in query(f'SELECT overture_id FROM overture_poi WHERE overture_id IN ({chunk})'))
        print(f'\nreversed ids: {len(reversed_ids)}; still served by prod: {sorted(served) or "none"}', file=sys.stderr)
    return 0


def trigger(batch, secret):
    body = json.dumps({'countryCode': 'PT', 'batch': batch}).encode()
    request = urllib.request.Request(
        f'{WORKER}/internal/overture-country/overrides', data=body, method='POST',
        headers={'X-Build-Secret': secret, 'User-Agent': 'curl/8.0', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise SystemExit(f'overrides {batch} -> {error.code}: {error.read()[:300]!r}')


def settled(entries, found):
    return all(found.get(i, 'missing') != 'pending' for i in sample_ids(entries))


def run(args):
    secret = os.environ.get('BUILD_TRIGGER_SECRET')
    if not secret:
        raise SystemExit('BUILD_TRIGGER_SECRET is required to run a batch (it is a Worker secret, never in the repo)')
    batches = load_batches()
    if args.all_pending:
        verdict = classify(batches, candidate_status(i for e in batches.values() for i in sample_ids(e)))
        names = [n for n, v in verdict.items() if v == 'pending']
    else:
        names = args.batches
        unknown = [n for n in names if n not in batches]
        if unknown:
            raise SystemExit(f'not a batch: {unknown}')
    print(f'{len(names)} batch(es) to run, one at a time', file=sys.stderr)
    for name in names:
        entries = batches[name]
        answer = trigger(name, secret)
        print(f'[{name}] started: {answer}', file=sys.stderr)
        deadline = time.time() + SETTLE_TIMEOUT
        while True:
            time.sleep(POLL_SECONDS)
            found = candidate_status(sample_ids(entries))
            if settled(entries, found):
                print(f'[{name}] settled: {sorted(set(found.values()))} ({len(entries)} ids in the batch)', file=sys.stderr)
                break
            if time.time() > deadline:
                raise SystemExit(f'[{name}] did not settle in {SETTLE_TIMEOUT}s; stopping before the next batch. Sampled: {found}')
    return 0


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='command', required=True)
    s = sub.add_parser('status', help='read-only: which batches prod has promoted')
    s.add_argument('--reversals', action='store_true', help='also check the withdrawn ids are not served')
    s.set_defaults(func=status)
    r = sub.add_parser('run', help='WRITES TO PRODUCTION: trigger batches one at a time')
    r.add_argument('batches', nargs='*')
    r.add_argument('--all-pending', action='store_true')
    r.set_defaults(func=run)
    args = parser.parse_args(argv)
    if args.command == 'run' and not args.batches and not args.all_pending:
        parser.error('name batches or pass --all-pending')
    return args.func(args)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
