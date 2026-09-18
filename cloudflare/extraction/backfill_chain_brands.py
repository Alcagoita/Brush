"""KAN-448. Emit the exact-id correction that brings prod's chain rows in line.

    python3 backfill_chain_brands.py --overture <archive.csv> --overture-key <r2 key> --out <migration.sql>

Promotion now lets a chain decide its own type and kinds. Rows already in
`overture_poi` were promoted under the old rule — kind per row, from whatever
category Meta gave that branch — and promoted rows are never re-promoted. This
reads the archive once, runs the real decision, fetches the current state of
only the rows the chain rule touches, and writes SQL for exactly the rows that
differ. It executes nothing; the SQL is a migration, reviewed like any other.

Two shapes of correction, both by exact id:

  * kinds: the row's `store_kind` attributes are replaced by the chain's set.
    Replaced, not merged — `pet` leaves Leroy Merlin.
  * type: a brand-headed row the old rule typed `school` or left in generic
    shopping becomes a `store` with the brand set and the chain's kinds.

Idempotent: every statement is conditioned on the id, and a second run
against a corrected database emits nothing.
"""
import argparse
import csv
import json
import os
import re
import subprocess
import sys
from collections import defaultdict

EXTRACTION_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, EXTRACTION_DIR)
os.environ.setdefault('BRUSH_TYPE_RELATION', 'sql')
CLOUDFLARE_DIR = os.path.dirname(EXTRACTION_DIR)
OVERRIDES_PATH = os.path.join(CLOUDFLARE_DIR, 'src', 'overtureCandidateOverrides.json')

import promote_overture_candidates as promote
from analyse_poi_candidates import reachable_types
from classify_and_load import find_brand, sql_escape

BATCH = 150


def reviewed_overrides(overture_key):
    """Every reviewed decision for this source, flattened. A reviewed row is
    decided; the chain rule does not get a second opinion on it."""
    with open(OVERRIDES_PATH) as handle:
        source = json.load(handle).get(overture_key, {})
    return {poi_id: entry for batch in source.values() for poi_id, entry in batch.items()}


def chain_decisions(overture_csv, overture_key):
    """Every archive row the chain rule decides, with its new type and kinds."""
    mapping, reachable, brands = promote.category_map(), reachable_types(), promote.load_brand_dictionary()
    kinds, cuisines = promote.store_kind_alias_index(), promote.food_cuisine_alias_index()
    financial, store_brands = promote.load_financial_service_name_rules(), promote.store_brand_index()
    overrides = reviewed_overrides(overture_key)
    decided = {}
    with open(overture_csv, newline='') as handle:
        for row in csv.DictReader(handle):
            if row['overture_id'] in overrides:
                continue
            status, types, attributes, reason = promote.decide(
                row, mapping, reachable, brands, kinds, cuisines, financial, store_brands, overrides)
            if status != 'promoted' or not reason or not reason.startswith('brand:'):
                continue
            decided[row['overture_id']] = {
                'name': row['name'],
                'primary': types[0],
                'types': list(types),
                'kinds': sorted(value for dimension, value in attributes if dimension == 'store_kind'),
                'brand': find_brand(row['name'], [types[0]], brands),
            }
    return decided


def query(sql, attempts=3):
    last = None
    for _ in range(attempts):
        result = subprocess.run(
            ['npx', 'wrangler', 'd1', 'execute', 'brush-poi-registry', '--remote', '--json', '--command', sql],
            cwd=CLOUDFLARE_DIR, capture_output=True, text=True)
        if result.returncode == 0:
            return json.loads(result.stdout)[0]['results']
        last = (result.stdout + result.stderr)[-400:]
    raise RuntimeError(f'D1 read failed after {attempts} attempts: {last}')


def current_state(ids):
    """type, brand, kinds and ranked types for exactly these ids, from prod."""
    state = {}
    ids = list(ids)
    for start in range(0, len(ids), BATCH):
        chunk = ','.join(sql_escape(i) for i in ids[start:start + BATCH])
        rows = query(
            "SELECT p.overture_id, p.primary_poi_type, p.brand, "
            "(SELECT group_concat(a.value) FROM overture_poi_attribute a WHERE a.overture_id = p.overture_id AND a.dimension = 'store_kind') AS kinds, "
            "(SELECT group_concat(t.poi_type) FROM (SELECT poi_type FROM overture_poi_type WHERE overture_id = p.overture_id ORDER BY rank) t) AS types "
            f"FROM overture_poi p WHERE p.overture_id IN ({chunk})")
        for row in rows:
            state[row['overture_id']] = {
                'primary': row['primary_poi_type'], 'brand': row['brand'],
                'kinds': sorted((row['kinds'] or '').split(',')) if row['kinds'] else [],
                'types': [t for t in (row['types'] or '').split(',') if t],  # in rank order
            }
    return state


def statements(decided, state):
    for overture_id, new in decided.items():
        old = state.get(overture_id)
        if old is None:
            continue  # not promoted in prod; promotion will apply the rule itself
        identifier = sql_escape(overture_id)
        # Rank is meaningful — rank 0 is what the app shows — so the whole
        # ordered list is compared, not just the primary.
        if old['primary'] != new['primary'] or old['types'] != new['types']:
            yield (f"UPDATE overture_poi SET primary_poi_type = {sql_escape(new['primary'])}, "
                   f"brand = {sql_escape(new['brand'])} WHERE overture_id = {identifier};\n")
            yield f"DELETE FROM overture_poi_type WHERE overture_id = {identifier};\n"
            for rank, poi_type in enumerate(new['types']):
                yield ("INSERT OR IGNORE INTO overture_poi_type (overture_id, poi_type, rank) VALUES "
                       f"({identifier},{sql_escape(poi_type)},{rank});\n")
        elif old['brand'] != new['brand'] and new['brand']:
            yield f"UPDATE overture_poi SET brand = {sql_escape(new['brand'])} WHERE overture_id = {identifier};\n"
        if old['kinds'] != new['kinds']:
            yield f"DELETE FROM overture_poi_attribute WHERE overture_id = {identifier} AND dimension = 'store_kind';\n"
            for kind in new['kinds']:
                yield ("INSERT OR IGNORE INTO overture_poi_attribute (overture_id, dimension, value) VALUES "
                       f"({identifier},'store_kind',{sql_escape(kind)});\n")


def rows_named_by(migration_paths):
    """The ids an earlier generated migration already corrects. KAN-457: when
    the earlier file is reviewed but not yet applied, prod still shows its
    rows as wrong, and a fresh run would name them all again. The later
    file carries only what the earlier one does not; it assumes the earlier
    one is applied first, and says so in its header."""
    named = set()
    for path in migration_paths:
        with open(path) as handle:
            named.update(re.findall(r"overture_id = '([^']+)'", handle.read()))
    return named


def run(overture_csv, overture_key, out_path, ticket='KAN-448', after=()):
    decided = chain_decisions(overture_csv, overture_key)
    print(f'{len(decided):,} archive rows decided by the chain rule', file=sys.stderr)
    already = rows_named_by(after)
    if already:
        decided = {i: d for i, d in decided.items() if i not in already}
        print(f'{len(already):,} rows are named by an earlier migration and left to it', file=sys.stderr)
    state = current_state(decided)
    print(f'{len(state):,} of them are promoted in prod', file=sys.stderr)
    lines = list(statements(decided, state))
    touched = {match for line in lines for match in re.findall(r"overture_id = '([^']+)'", line)}
    header = (
        f"-- {ticket}. Chains decide their own type and kinds. Generated by\n"
        "-- backfill_chain_brands.py from the archived Portugal source; every\n"
        "-- statement names its row. Idempotent.\n"
        f"-- {len(touched):,} rows corrected.\n")
    if after:
        header += ''.join(f"-- Applies after {os.path.basename(path)}, whose rows it does not repeat.\n" for path in after)
    with open(out_path, 'w') as handle:
        handle.write(header)
        handle.writelines(lines)
    print(f'{len(lines):,} statements over {len(touched):,} rows -> {out_path}', file=sys.stderr)
    return 0


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--overture', required=True, help='archived Overture CSV')
    parser.add_argument('--overture-key', required=True, help='its R2 key — the overrides are scoped to it')
    parser.add_argument('--out', required=True)
    parser.add_argument('--ticket', default='KAN-448', help='named in the migration header')
    parser.add_argument('--after', action='append', default=[],
                        help='an earlier generated migration whose rows this one leaves alone')
    args = parser.parse_args(argv)
    return run(args.overture, args.overture_key, args.out, args.ticket, tuple(args.after))


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
