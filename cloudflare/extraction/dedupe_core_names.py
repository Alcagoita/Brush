"""
KAN-461. One food-and-drink place, one row: the same core name within 50 m.

Owner, 2026-11-16, at Rua Aquilino Ribeiro in Odivelas: "Café Encontro" and
"O Encontro - Odivelas" are clearly the same café. The rule is
`import_osm_archive.core_twin`: generic words and a trailing "- <place>" off,
what is left equal, within 50 m, both in the food-and-drink family.

Two clean-ups, one migration, nothing deleted:

  * a row KAN-461 imported that twins a row we already served: the import is
    withdrawn (`curated_poi.status = 'removed'`), the older row stays;
  * Overture rows that twin each other: one is kept — the one with a street
    address, else the lowest id — and the rest hidden (`poi_source_correction`
    visible = 0).

    python3 dedupe_core_names.py --overture-csv <csv> --overture-key <key> \\
        --imported <json from D1> --migration <sql> --report <md>
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import import_osm_archive as ia  # noqa: E402
import preflight_foursquare_archive as preflight  # noqa: E402
from classify_and_load import sql_escape  # noqa: E402

TICKET = 'KAN-461'


def addresses(overture_csv):
    csv.field_size_limit(10 ** 8)
    out = {}
    with open(overture_csv, newline='', encoding='utf-8') as fh:
        for row in csv.DictReader(fh):
            if (row.get('address') or '').strip():
                out[row['overture_id']] = row['address'].strip()
    return out


def hide_note(kept):
    return f'{TICKET}: same place as overture:{kept["id"]} "{kept["name"]}"'


def groups(rows):
    """Union of same-core twins among `rows` (all food-and-drink, with core names)."""
    grid = preflight.grid_index(rows)
    parent = {id(r): id(r) for r in rows}
    by_id = {id(r): r for r in rows}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for r in rows:
        key = ia.core_name(r['name'])
        if not key:
            continue
        cl, cg = int(r['lat'] // preflight.CELL), int(r['lng'] // preflight.CELL)
        for i in (-1, 0, 1):
            for j in (-1, 0, 1):
                for q in grid.get((cl + i, cg + j), ()):
                    if q is not r and ia.core_name(q['name']) == key and \
                            ia._metres(r['lat'], r['lng'], q['lat'], q['lng']) <= ia.CORE_TWIN_METRES ** 2:
                        parent[find(id(r))] = find(id(q))
    out = defaultdict(list)
    for x in parent:
        out[find(x)].append(by_id[x])
    return [g for g in out.values() if len(g) > 1]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--overture-csv', required=True)
    ap.add_argument('--overture-key', required=True)
    ap.add_argument('--imported', required=True, help='wrangler --json of the KAN-461 curated rows')
    ap.add_argument('--today', required=True)
    ap.add_argument('--migration', required=True)
    ap.add_argument('--report', required=True)
    args = ap.parse_args(argv)

    served, _ = preflight.served_overture(args.overture_csv, args.overture_key)
    curated = preflight.served_curated_all()
    imported = json.load(open(args.imported, encoding='utf-8'))[0]['results']
    imported_ids = {r['poi_id'] for r in imported}
    addr = addresses(args.overture_csv)

    # 1. today's imports that twin an older served row
    older = [p for p in served + curated if p['type'] in ia.FOOD_FAMILY and p['id'] not in imported_ids]
    grid = preflight.grid_index(older)
    withdraw = []
    for r in imported:
        rec = {'name': r['name'], 'lat': r['lat'], 'lng': r['lng'], 'type': r['primary_poi_type']}
        twin = ia.core_twin(rec, grid)
        if twin:
            withdraw.append((r, twin))

    # 2. Overture rows that twin each other
    food = [p for p in served if p['type'] in ia.FOOD_FAMILY]
    hide = []
    for g in groups(food):
        keep = sorted(g, key=lambda p: (0 if addr.get(p['id']) else 1, p['id']))[0]
        hide += [(p, keep) for p in g if p is not keep]

    sql = [f'-- {TICKET}. One food-and-drink place, one row: same core name within 50 m (owner, 2026-11-16).\n'
           f'-- {len(withdraw)} KAN-461 imports withdrawn; {len(hide)} Overture twins hidden. Nothing deleted.\n\n']
    for r, twin in withdraw:
        why = f'{TICKET}: same place as {twin["source"]}:{twin["id"]} "{twin["name"]}"'
        sql.append(f"UPDATE curated_poi SET status = 'removed', removed_at = {sql_escape(args.today)}, "
                   f"removed_by = 'kan-461', removal_reason = {sql_escape(why)} "
                   f"WHERE status = 'active' AND poi_id = {sql_escape(r['poi_id'])};\n")
    if hide:
        sql.append('INSERT INTO poi_source_correction (source, source_id, visible, review_note, created_at) VALUES\n'
                   + ',\n'.join(f"  ('overture', {sql_escape(p['id'])}, 0, {sql_escape(hide_note(k))}, "
                                f"{sql_escape(args.today)})" for p, k in hide)
                   + '\nON CONFLICT (source, source_id) DO UPDATE SET visible = 0, review_note = excluded.review_note;\n')
    open(args.migration, 'w', encoding='utf-8').write(''.join(sql))

    md = [f'# {TICKET} — same place, one row ({args.today})', '',
          'Rule: generic words (café, pastelaria, snack-bar, o/a/do/da, ...) and a trailing "- <place>" removed; '
          'what is left equal; within 50 m; both café, bakery, bar, restaurant or ice cream.', '',
          f'## Imports withdrawn ({len(withdraw)})', '', '| imported | stays |', '|---|---|']
    md += [f"| {r['name']} (`{r['poi_id']}`) | {t['name']} (`{t['source']}:{t['id']}`, {t['type']}) |" for r, t in withdraw]
    md += ['', f'## Overture twins hidden ({len(hide)})', '', '| hidden | stays |', '|---|---|']
    md += [f"| {p['name']} (`{p['id']}`) | {k['name']} (`{k['id']}`){' — ' + addr[k['id']] if addr.get(k['id']) else ''} |"
           for p, k in hide]
    open(args.report, 'w', encoding='utf-8').write('\n'.join(md) + '\n')
    print(f'{len(withdraw)} imports to withdraw; {len(hide)} Overture twins to hide', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
