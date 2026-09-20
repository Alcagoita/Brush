"""KAN-455. Reviewed override batches: which are promoted in prod, and run the rest.

    python3 promote_override_batches.py status
    BUILD_TRIGGER_SECRET=… python3 promote_override_batches.py run <batch> [<batch> …]
    BUILD_TRIGGER_SECRET=… python3 promote_override_batches.py run --all-pending

`status` is read-only: for every batch in `overtureCandidateOverrides.json`
it fetches the `promotion_status` of every one of its ids from prod, in
lists of at most 150 ids per read (CLAUDE.md, "D1 from scripts"), and says
whether the batch is promoted, pending, or mixed. All ids, never a sample:
a batch of 179 whose first five are promoted can still hold a pending id.
That is the only way to know — the batch runs leave no ledger and the
wrangler migration tracker is not in use (CLAUDE.md).

`run` writes to production and is the owner's call. It POSTs one batch to
`/internal/overture-country/overrides` — the Worker starts an
`overture-overrides` container for exactly that batch's ids, the same path
KAN-432 used — waits until every id of the batch has left `pending`, then
moves to the next. Sequential on purpose: one container at a time, and a batch
that does not settle stops the run instead of piling more on.

Reversals (`docs/evidence/reversals.jsonl`) need nothing here: a withdrawn id
is no longer in its batch, so a run never touches it. Whether prod already
served it is `status`'s business — run `status --reversals` to see.

    python3 promote_override_batches.py repromote --archive <overture.csv> --backlog <report.tsv> [--out <tsv>]
    BUILD_TRIGGER_SECRET=… python3 promote_override_batches.py repromote --archive … --backlog … --run

`repromote` is the KAN-455 path for the rows a rule change newly decides:
without `--run` it is a local dry run — the archived source and the country
run's own backlog report (`overture-country-reports/PT/<run>.tsv`, every row
the run left pending) decide what `overture-repromote` would promote and
reject, and nothing is read from or written to D1. With `--run` it POSTs
`/internal/overture-repromote`, the Worker starts one `overture-repromote`
container over the mapped source, and this waits until every id the dry run
expected to leave `pending` has done so (all ids, ≤150 per read).
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
POLL_SECONDS = 20
SETTLE_TIMEOUT = 600


class NoRedirect(urllib.request.HTTPRedirectHandler):
    """A credentialed request goes to the fixed endpoint and nowhere else: a
    3xx is an error, never a second request carrying the secret to another host."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


OPENER = urllib.request.build_opener(NoRedirect)


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
    """One word per batch from the statuses of all of its ids."""
    verdict = {}
    for name, entries in batches.items():
        seen = {status.get(i, 'missing') for i in entries}
        if seen <= {'promoted', 'rejected'}:
            verdict[name] = 'promoted'
        elif seen == {'pending'} or seen == {'pending', 'missing'}:
            verdict[name] = 'pending'
        else:
            verdict[name] = 'mixed:' + ','.join(sorted(seen))
    return verdict


def status(args):
    batches = load_batches()
    ids = [i for entries in batches.values() for i in entries]
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


def post_internal(path, body, secret):
    request = urllib.request.Request(
        f'{WORKER}{path}', data=json.dumps(body).encode(), method='POST',
        headers={'X-Build-Secret': secret, 'User-Agent': 'curl/8.0', 'Content-Type': 'application/json'})
    try:
        with OPENER.open(request, timeout=60) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise SystemExit(f'{path} -> {error.code}: {error.read()[:300]!r}')


def trigger(batch, secret):
    return post_internal('/internal/overture-country/overrides', {'countryCode': 'PT', 'batch': batch}, secret)


def wait_until_settled(label, ids, deadline_seconds=SETTLE_TIMEOUT, poll_seconds=POLL_SECONDS,
                       read=candidate_status, sleep=time.sleep, clock=time.time):
    """Poll prod until no id is still pending — every id, ≤150 per read — or
    stop with the ids still pending once the ceiling is reached."""
    ids = list(ids)
    deadline = clock() + deadline_seconds
    while True:
        sleep(poll_seconds)
        found = read(ids)
        if settled(ids, found):
            print(f'[{label}] settled: {sorted(set(found.values()))} (all {len(ids)} ids verified)', file=sys.stderr)
            return found
        if clock() > deadline:
            still = sorted(i for i, v in found.items() if v == 'pending')
            raise SystemExit(f'[{label}] did not settle in {deadline_seconds}s; stopping. Still pending ({len(still)}): {still}')


def settled(entries, found):
    """True once no id of the batch is still pending — every id, not a sample."""
    return all(found.get(i, 'missing') != 'pending' for i in entries)


def run(args):
    secret = os.environ.get('BUILD_TRIGGER_SECRET')
    if not secret:
        raise SystemExit('BUILD_TRIGGER_SECRET is required to run a batch (it is a Worker secret, never in the repo)')
    batches = load_batches()
    if args.all_pending:
        verdict = classify(batches, candidate_status(i for e in batches.values() for i in e))
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
        wait_until_settled(name, entries)
    return 0


def repromote_expected(archive, backlog, source_key=SOURCE_KEY):
    """The dry run: what the current rules and overrides decide of the rows
    the country run left pending. Local; no D1."""
    sys.path.insert(0, EXTRACTION_DIR)
    os.environ.setdefault('BRUSH_TYPE_RELATION', 'sql')
    import promote_overture_candidates as promote
    return promote.repromote_dry_run(archive, backlog, source_key)


def expected_to_settle(report):
    """Every id the dry run decided — by rule or by override — in one list."""
    return [overture_id for basis in ('rule', 'override') for status in ('promoted', 'rejected')
            for overture_id, *_ in report['decided'][basis][status]]


def print_repromote_report(report, out_path=None):
    print(f"pending in the country run's report: {report['pending_in_report']:,}")
    print(f"by rule:      promoted {report['rule']['promoted']:,}  rejected {report['rule']['rejected']:,}")
    print(f"by override:  promoted {report['override']['promoted']:,}  rejected {report['override']['rejected']:,}"
          '  (upper bound: a batch already run has promoted its share)')
    print(f"still pending: {report['still_pending']:,}")
    print('rule promotions by type:')
    for poi_type, count in report['rule_promoted_by_type'].items():
        print(f'  {count:6,}  {poi_type}')
    if out_path:
        with open(out_path, 'w') as handle:
            handle.write('basis\tstatus\toverture_id\tcategory\treason\tname\n')
            for basis in ('rule', 'override'):
                for status in ('promoted', 'rejected'):
                    for overture_id, name, category, reason in report['decided'][basis][status]:
                        handle.write(f'{basis}\t{status}\t{overture_id}\t{category}\t{reason or ""}\t{name}\n')
        print(f'decisions -> {out_path}', file=sys.stderr)


def repromote(args):
    report = repromote_expected(args.archive, args.backlog)
    print_repromote_report(report, args.out)
    if not args.run:
        print('\ndry run: nothing read from or written to D1', file=sys.stderr)
        return 0
    secret = os.environ.get('BUILD_TRIGGER_SECRET')
    if not secret:
        raise SystemExit('BUILD_TRIGGER_SECRET is required to run (it is a Worker secret, never in the repo)')
    expected = expected_to_settle(report)
    answer = post_internal('/internal/overture-repromote', {'countryCode': 'PT', 'rawExtractR2Key': SOURCE_KEY}, secret)
    print(f'[repromote] started: {answer}', file=sys.stderr)
    if answer.get('rawExtractR2Key') != SOURCE_KEY:
        raise SystemExit(f"[repromote] the Worker's mapped source is {answer.get('rawExtractR2Key')!r}, not {SOURCE_KEY!r}; the dry run above was for the wrong archive")
    wait_until_settled('repromote', expected)
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
    p = sub.add_parser('repromote', help='dry run locally; with --run, WRITES TO PRODUCTION through overture-repromote')
    p.add_argument('--archive', required=True, help='the archived Overture CSV for SOURCE_KEY')
    p.add_argument('--backlog', required=True, help="the country run's backlog report TSV (overture-country-reports/PT/<run>.tsv)")
    p.add_argument('--out', help='write every expected decision to this TSV')
    p.add_argument('--run', action='store_true', help='trigger the container and wait for every expected id to settle')
    p.set_defaults(func=repromote)
    args = parser.parse_args(argv)
    if args.command == 'run' and not args.batches and not args.all_pending:
        parser.error('name batches or pass --all-pending')
    return args.func(args)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
