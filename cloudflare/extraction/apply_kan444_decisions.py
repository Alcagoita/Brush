"""KAN-444. Turns the decision manifest into reviewed exact-ID override batches.

Writes nothing to D1 and promotes nothing. It only adds batches to
overtureCandidateOverrides.json, which promote_overture_candidates.py then runs
one batch at a time against explicit ids.

Three properties this must never lose:

  * Existing batches are never touched. KAN-432's reviewed decisions stay
    exactly as they are; a rerun adds and never rewrites.
  * An id already decided in any earlier batch is skipped, so no id can carry
    two answers.
  * `insufficient_evidence` produces no batch at all. It is a terminal audit
    state, not a promotion and not an exclusion, and it stays in the manifest
    where its evidence is readable.
"""
import argparse
import csv
import json
import os
import sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OVERRIDES = os.path.join(ROOT, 'cloudflare', 'src', 'overtureCandidateOverrides.json')
SOURCE_KEY = 'overture-country-sources/PT/1ea48e22-9b0d-47a2-beb7-29f5203bc204.csv'


def batch_name(row):
    if row['decision'] == 'excluded':
        return 'kan444_exclusions'
    kind = row['store_kind']
    return f"kan444_{'store_' + kind if kind else row['subtype']}"


def reason_for(row):
    where = 'Foursquare' if row['source'] == 'foursquare' else 'OSM'
    if row['decision'] == 'excluded':
        return f'reviewed exclusion: {where} match shows this is not a consumer store'
    evidence = row['osm_family'] or row['fsq_categories'].split('|')[0].strip() or 'matched category'
    return f'reviewed {where} name and location match ({evidence})'


def run(manifest_path, dry_run):
    with open(OVERRIDES) as handle:
        overrides = json.load(handle)
    source = overrides.setdefault(SOURCE_KEY, {})
    already = {poi_id for batch in source.values() for poi_id in batch}

    additions, skipped = defaultdict(dict), 0
    with open(manifest_path, newline='') as handle:
        for row in csv.DictReader(handle, delimiter='\t'):
            if row['decision'] == 'insufficient_evidence':
                continue
            if row['overture_id'] in already:
                skipped += 1
                continue
            entry = {'poi_type': row['subtype'] or 'store', 'reason': reason_for(row)}
            if row['store_kind']:
                entry['store_kind'] = row['store_kind']
            if row['decision'] == 'excluded':
                # A reviewed exclusion carries its reason and no type at all.
                entry = {'decision': 'rejected', 'reason': reason_for(row)}
            additions[batch_name(row)][row['overture_id']] = entry

    total = sum(len(batch) for batch in additions.values())
    for name in sorted(additions):
        collision = ' (EXISTING BATCH — would merge)' if name in source else ''
        print(f'  {name:34s} {len(additions[name]):>4}{collision}', file=sys.stderr)
    print(f'{total:,} ids across {len(additions)} batches; {skipped:,} already decided elsewhere',
          file=sys.stderr)

    if dry_run:
        print('dry run: overrides not written', file=sys.stderr)
        return 0
    for name, batch in additions.items():
        source.setdefault(name, {}).update(batch)
    with open(OVERRIDES, 'w') as handle:
        # Insertion order, not sorted: sorting rewrites every existing batch and
        # buries this ticket's additions in a whole-file diff nobody can review.
        json.dump(overrides, handle, indent=2, ensure_ascii=False)
        handle.write('\n')
    print(f'-> {OVERRIDES}', file=sys.stderr)
    return 0


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', required=True)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args(argv)
    return run(args.manifest, args.dry_run)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
