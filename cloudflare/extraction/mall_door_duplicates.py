"""
KAN-439. Find the one duplicate shape a mall produces, under DOUBLE
confirmation — because losing a real shop is not recoverable from a list.

THE SHAPE

Overture is a conflation of several upstream datasets (meta, Microsoft,
Foursquare, AllThePlaces), and its matcher does not always merge them. When
it fails inside a mall we hold one shop twice: one row at the mall's own
street door, one at the real unit.

    Bershka  38.775290,-9.220240  Microsoft   AVENIDA CRUZEIRO SEIXAS 5
    Bershka  38.776258,-9.218830  Foursquare  Av. cruzeiro seixas 5

WHY THE COORDINATE ALONE IS NOT THE TEST

Every upstream dataset pins tenants to the door, so a shared coordinate holds
DIFFERENT shops far more often than a duplicate. Measured 2026-10-04:

    Amoreiras 38.723600,-9.163390   Oysho, Bershka, Zara      (3 shops)
    Ubbo      38.779233,-9.219706   Cacifo Locky, Flying
                                    Tiger, New Yorker, Mayoral (4 shops)
    Amoreiras 38.725420,-9.163010   three hairdressers         (3 shops)

In all of those, every row is the ONLY record we hold of that shop. A rule
that fired on the coordinate would have deleted nine real shops to remove
two duplicates.

THE TEST, BOTH HALVES REQUIRED (owner, 2026-10-04)

  1. NAME TWIN   another row in the same footprint carries the same shop
                 name, from a DIFFERENT upstream dataset. Without this the
                 row is a sole record and must never be touched.
  2. DOOR PIN    the row sits on a coordinate it shares with at least one
                 other row, and its address is the centre's street address
                 rather than a unit. That is what marks it the pinned copy
                 and the twin the real one.

A row satisfying one half and not the other is reported as such and left
alone. This module WRITES NOTHING: it prints what qualifies, and a reviewed
migration applies it.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def fold(value: str) -> str:
    """Accent- and punctuation-free lowercase, for comparing shop names."""
    stripped = ''.join(c for c in unicodedata.normalize('NFKD', value or '')
                       if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', ' ', stripped.lower()).strip()


def name_key(name: str, mall_words) -> str:
    """The shop name with the centre's own words removed.

    A venue inside a mall carries the mall, the city and sometimes the floor
    in its own name ("Wok to Walk UBBO"), and none of that identifies the
    tenant — the same reason `mall_tenants.tenant_key` strips them.
    """
    return ' '.join(w for w in fold(name).split() if w not in mall_words)


def unit_address(address: str | None) -> bool:
    """True when the address names a unit rather than just the street.

    A unit number is what distinguishes the real row from the door-pinned
    one: `C. C. UBBO, Loja 1.103-1.105` against `AVENIDA CRUZEIRO SEIXAS 5`.
    """
    if not address:
        return False
    return bool(re.search(r'\b(loja|lj|piso|store|unit)\b', address, re.I))


def door_coordinates(rows):
    """Coordinates shared by more than one row — the centre's own doors.

    Returned as a map to the rows sharing each, so a caller can say how many
    shops are pinned there.
    """
    shared = defaultdict(list)
    for row in rows:
        shared[(row['lat'], row['lng'])].append(row)
    return {xy: group for xy, group in shared.items() if len(group) > 1}


def dataset(row) -> str:
    """The upstream dataset inside Overture, e.g. `Overture|Microsoft`."""
    return (row.get('source_datasets') or '').split('|')[-1]


def find(rows, mall_words):
    """Rows that pass BOTH halves, and those that pass only one.

    `confirmed` carries the row, its twin and why. `partial` carries every
    row that matched one half, so a reviewer can see what was deliberately
    left alone rather than having to trust that nothing was.
    """
    doors = door_coordinates(rows)
    by_name = defaultdict(list)
    for row in rows:
        key = name_key(row['name'], mall_words)
        if key:
            by_name[key].append(row)

    confirmed, partial = [], []
    for row in rows:
        key = name_key(row['name'], mall_words)
        twins = [t for t in by_name.get(key, [])
                 if t['overture_id'] != row['overture_id']
                 and dataset(t) != dataset(row)]
        at_door = (row['lat'], row['lng']) in doors
        # The twin must look like the real unit, or we cannot tell which of
        # the two is the pinned copy — and then neither may be removed.
        better = [t for t in twins if unit_address(t.get('address'))
                  or not unit_address(row.get('address'))]
        if twins and at_door and better and not unit_address(row.get('address')):
            confirmed.append({
                'row': row, 'twin': better[0],
                'shares_door_with': len(doors[(row['lat'], row['lng'])]) - 1,
            })
        elif twins or (at_door and not unit_address(row.get('address'))):
            partial.append({
                'row': row, 'has_twin': bool(twins), 'at_door': at_door,
                'twin': twins[0] if twins else None,
            })
    return confirmed, partial


def report(confirmed, partial, mall, handle=sys.stdout):
    print(f'\n===== {mall} — door-pinned duplicates, double confirmed =====\n',
          file=handle)
    print(f'  BOTH halves (removable)   : {len(confirmed)}', file=handle)
    print(f'  one half only (left alone): {len(partial)}\n', file=handle)
    for item in confirmed:
        row, twin = item['row'], item['twin']
        print(f"  {row['name']}  [{dataset(row)}]  {row['overture_id']}", file=handle)
        print(f"     at door {row['lat']:.6f},{row['lng']:.6f} "
              f"shared with {item['shares_door_with']} other row(s)", file=handle)
        print(f"     address  {row.get('address')!r}", file=handle)
        print(f"     twin     {twin['name']} [{dataset(twin)}] "
              f"{twin['lat']:.6f},{twin['lng']:.6f} {twin.get('address')!r}", file=handle)
    if partial:
        print('\n  --- one half only: NOT removable ---', file=handle)
        for item in partial:
            row = item['row']
            why = 'twin, not at a door' if item['has_twin'] else 'at a door, no twin'
            print(f"  {row['name'][:38]:38} [{dataset(row):12}] {why}", file=handle)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--held', required=True, help='JSON rows we serve in the footprint')
    parser.add_argument('--mall', required=True, help="the centre's own name")
    parser.add_argument('--mall-words', default='',
                        help='extra words of the centre to strip, comma separated')
    args = parser.parse_args(argv)

    rows = json.load(open(args.held))
    words = set(fold(args.mall).split())
    words |= {w for w in fold(args.mall_words.replace(',', ' ')).split()}
    confirmed, partial = find(rows, words)
    report(confirmed, partial, args.mall)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
