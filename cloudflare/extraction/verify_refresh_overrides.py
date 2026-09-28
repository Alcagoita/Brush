"""
KAN-456. After an Overture refresh: did every reviewed decision survive?

    python3 verify_refresh_overrides.py --country PT [--source-key <mapped key>]

The reviewed overrides (`src/overtureCandidateOverrides.json`) are keyed on
the archive that decided them; a refresh moves the country to a new key.
This reads production for exactly the ids the overrides name — ≤ 150 per
query, retried per CLAUDE.md, never a country scan — and checks, id by id:

  * an id the override promotes is `promoted` in overture_candidate, its
    `overture_poi.primary_poi_type` is the override's `poi_type`, and its
    `store_kind` attribute (when the override names one) is present;
  * an id the override rejects is `rejected`;
  * an id the new release no longer carries is reported as retired, not as
    lost — the decision stays on the row for the day it comes back;
  * an id that is in no archive at all (KAN-455's known `d6d19c2f…`) is
    reported as absent.

Exit 0 only when no decision is lost. Read-only.
"""
from __future__ import annotations

import argparse
import json
import os
import sys

EXTRACTION_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, EXTRACTION_DIR)

import preflight_foursquare_archive as preflight  # noqa: E402
import promote_overture_candidates as promote  # noqa: E402
from classify_and_load import sql_escape  # noqa: E402

D1_ID_BATCH = 150


def expected_decisions(country_code, source_key=None):
    """{overture_id: entry} — every reviewed decision that applies to the
    country's current source, through the lineage."""
    key = source_key or f'overture-country-sources/{country_code}/current.csv'
    return promote.source_overrides_flat(key)


def in_batches(items, size=D1_ID_BATCH):
    items = list(items)
    for start in range(0, len(items), size):
        yield items[start:start + size]


def expected_types(entry, reachable):
    """The served types an override asks for, in the promoter's own
    vocabulary. `poi_type` is one type or a ranked list of them (KAN-455),
    and the names are the classifier's, not the app's — `gas_station` lands
    on `gas`, `grocery_store` on `supermarket`. `decide()` resolves them
    through `reachable`, so comparing the raw strings to what is served
    reports correct rows as lost."""
    value = entry.get('poi_type')
    names = value if isinstance(value, list) else [value]
    return [reachable.get(name, name) for name in names if name]


def prod_state(ids, d1_read=None):
    """{overture_id: {status, poi_type, poi_types, store_kinds, retired}} for
    the ids, in bounded reads. `poi_types` is every type the row is served
    as, because an override may name several and only rank 0 is primary."""
    d1_read = d1_read or preflight.d1_read
    out = {}
    for batch in in_batches(ids):
        values = ','.join(sql_escape(i) for i in batch)
        for row in d1_read(
                'SELECT c.overture_id, c.promotion_status, p.primary_poi_type, p.retired_in_release '
                'FROM overture_candidate AS c LEFT JOIN overture_poi AS p ON p.overture_id = c.overture_id '
                f'WHERE c.overture_id IN ({values})'):
            out[row['overture_id']] = {
                'status': row['promotion_status'], 'poi_type': row['primary_poi_type'],
                'retired': row['retired_in_release'], 'store_kinds': set(), 'poi_types': set(),
            }
        for row in d1_read(
                'SELECT overture_id, poi_type FROM overture_poi_type '
                f'WHERE overture_id IN ({values})'):
            if row['overture_id'] in out:
                out[row['overture_id']]['poi_types'].add(row['poi_type'])
        for row in d1_read(
                "SELECT overture_id, value FROM overture_poi_attribute "
                f"WHERE dimension = 'store_kind' AND overture_id IN ({values})"):
            if row['overture_id'] in out:
                out[row['overture_id']]['store_kinds'].add(row['value'])
    return out


def compare(expected, state, reachable=None):
    """Per id: kept | retired | absent | lost:<why>."""
    if reachable is None:
        from analyse_poi_candidates import reachable_types
        reachable = reachable_types()
    verdicts = {}
    for overture_id, entry in expected.items():
        got = state.get(overture_id)
        if got is None:
            verdicts[overture_id] = 'absent'
            continue
        if entry.get('decision') == 'rejected':
            verdicts[overture_id] = 'kept' if got['status'] == 'rejected' else f"lost: expected rejected, is {got['status']}"
            continue
        if got['retired']:
            verdicts[overture_id] = 'retired'
            continue
        wanted = expected_types(entry, reachable)
        missing = [name for name in wanted if name not in got['poi_types']]
        if got['status'] != 'promoted':
            verdicts[overture_id] = f"lost: expected promoted, is {got['status']}"
        elif missing:
            verdicts[overture_id] = (
                f"lost: expected {'+'.join(wanted)}, served as "
                f"{'+'.join(sorted(got['poi_types'])) or got['poi_type']}")
        elif wanted and got['poi_type'] != wanted[0]:
            # rank 0 is what the app shows, so a reordered list is a loss.
            verdicts[overture_id] = f"lost: expected {wanted[0]} first, served as {got['poi_type']}"
        elif entry.get('store_kind') and entry['store_kind'] not in got['store_kinds']:
            verdicts[overture_id] = f"lost: store_kind {entry['store_kind']} missing"
        else:
            verdicts[overture_id] = 'kept'
    return verdicts


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument('--country', default='PT')
    parser.add_argument('--source-key', help='the mapped archive key (any key of the country resolves the same lineage)')
    args = parser.parse_args(argv)
    expected = expected_decisions(args.country, args.source_key)
    print(f'{len(expected):,} reviewed decisions apply to {args.country}', file=sys.stderr)
    verdicts = compare(expected, prod_state(expected))
    counts = {}
    for verdict in verdicts.values():
        counts[verdict.split(':')[0]] = counts.get(verdict.split(':')[0], 0) + 1
    print(json.dumps(counts, indent=1))
    lost = {i: v for i, v in verdicts.items() if v.startswith('lost')}
    for overture_id, why in sorted(lost.items()):
        print(f'{overture_id}\t{why}')
    return 1 if lost else 0


if __name__ == '__main__':
    raise SystemExit(main())
