"""
KAN-461. Put the curated Portugal OSM rows we already own back into the
registry, one type at a time, as `curated_poi` rows.

The source is the archived `osm_poi` table (`archives/openstreetmap/2026-09-03/
osm-poi.sql` in R2): the August run over all 307 municipalities (`084e3511`),
duplicates reviewed (KAN-392) and types inferred from names (KAN-391). It
was taken out of nearby by KAN-442/454 and archived before the table was
emptied. Nothing is re-sourced and nothing is downloaded from outside.

Rules (owner, 2026-11-15):

  * only the types asked for (`--types cafe,park`); schools are never imported;
  * Overture wins: a row whose name matches a served row within 75 m is
    skipped, and the same name 75–400 m away is skipped as suspect (the
    KAN-433 matcher, type-blind, against promoted Overture + active curated);
  * nothing inside a reconciled shopping centre — its site is the truth there;
  * provenance on every row: origin_source `openstreetmap`, origin_id the OSM
    element, licence ODbL-1.0. The KAN-452 unique index makes a re-run a no-op.

Dry run by default; `--emit` writes, one bounded statement per request.

    python3 import_osm_archive.py --osm-sql <osm-poi.sql> --types cafe,park \\
        --overture-key overture-country-sources/PT/<run>.csv --run-id kan461-cafe-park-YYYYMMDD \\
        [--emit]
"""
from __future__ import annotations

import argparse
import datetime
import os
import sqlite3
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import import_foursquare_tourism as fsq  # noqa: E402
import mall_footprints  # noqa: E402
import preflight_foursquare_archive as preflight  # noqa: E402
from classify_and_load import encode_geohash, normalize_text, sql_escape  # noqa: E402

ORIGIN_SOURCE = 'openstreetmap'
ORIGIN_LICENCE = 'ODbL-1.0'
ACTOR = 'kan-461'
POI_ID_PREFIX = 'osm:'
NEVER = {'school'}
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_WORK_DIR = os.path.join(REPO_ROOT, 'outputs', 'kan-461')


import re  # noqa: E402
import unicodedata  # noqa: E402

# OSM's `leisure=park` covers more than parks: squares, sanctuaries, river
# beaches, viewpoints, woods. All are places the app recommends (owner,
# 2026-11-15), so none is dropped; the name gives each its own type. First
# rule that matches wins; a name no rule matches keeps OSM's `park`.
PARK_RETYPE = (
    ('playground', r'\bparque infantil\b|\binfantil\b|\bplayground\b'),
    ('beach', r'\bpraia fluvial\b|^praia\b'),
    ('church', r'\bsantuario\b|\bcalvario\b|\bvia sacra\b|\bcapela\b|\bigreja\b|\bermida\b|\bcruzeiro\b'),
    ('historical_landmark', r'\bcitania\b|\bcastro\b|\bmemorial\b|\bmonumento\b|\bescultura\b|\bcastelo\b'
                            r'|\bruinas\b|\bpelourinho\b|\bfonte\b|\bchafariz\b|\bmoinho\b|\banta\b|\bgruta\b|\bsepulturas\b'),
    ('viewpoint', r'\bmiradouro\b|\bmirador\b|\bobservacao de aves\b|\bobservatorio\b'),
    ('plaza', r'^(praca|largo|terreiro|rossio|pracinha|praceta|praza)\b'),
    ('bridge', r'^ponte\b'),
    ('nature_preserve', r'^(mata|bosque|reserva|pinhal|floresta|tapada)\b'),
)


def _fold(value):
    return ''.join(c for c in unicodedata.normalize('NFKD', value.lower()) if not unicodedata.combining(c))


def park_type(name):
    """(type, how) for a row the archive holds as `park`."""
    folded = _fold(name.strip())
    for poi_type, pattern in PARK_RETYPE:
        if re.search(pattern, folded):
            return poi_type, 'name'
    if re.search(r'\bparque\b|\bjardim\b|\bjardins\b|^quinta\b|\blazer\b|\bmerendas\b|\bverde\b|^alameda\b', folded):
        return 'park', 'name'
    return 'park', 'osm tag only'


def load_archive(sql_path, types):
    con = sqlite3.connect(':memory:')
    with open(sql_path, encoding='utf-8') as handle:
        con.executescript(handle.read())
    rows = []
    marks = ','.join('?' * len(types))
    for oid, name, lat, lng, poi_type, address in con.execute(
            f'SELECT osm_element_id, name, lat, lng, primary_poi_type, address FROM osm_poi '
            f'WHERE primary_poi_type IN ({marks}) ORDER BY osm_element_id', sorted(types)):
        typed, how = park_type(name or '') if poi_type == 'park' else (poi_type, 'archive')
        rows.append({'osm_id': oid, 'name': (name or '').strip(), 'dedupe_name': normalize_text(name or ''),
                     'lat': lat, 'lng': lng, 'archive_type': poi_type, 'type': typed, 'how': how,
                     'address': address or '', 'locality': '', 'fsq_place_id': oid})
    return rows


def load_candidates(json_path, types):
    """Rows from `osm_food_candidates.py`: a fresh extract, with a second
    type where the name gives one and the last-edit date."""
    import json
    data = json.load(open(json_path, encoding='utf-8'))
    rows = []
    for c in sorted(data['rows'], key=lambda c: c['osm_id']):
        if c['types'][0] not in types:
            continue
        rows.append({'osm_id': c['osm_id'], 'name': c['name'], 'dedupe_name': normalize_text(c['name']),
                     'lat': c['lat'], 'lng': c['lng'], 'archive_type': c['types'][0], 'type': c['types'][0],
                     'extra': c['types'][1:], 'how': 'extract', 'edited': c.get('edited'),
                     'check_date': c.get('check_date'), 'address': c.get('address') or '',
                     'locality': '', 'fsq_place_id': c['osm_id']})
    return rows, data['source']


def freshness(row):
    year = int((row.get('edited') or '0')[:4] or 0)
    if row.get('check_date') or year >= 2024:
        return '2024 or later / checked'
    if year >= 2020:
        return '2020–2023'
    if year >= 2015:
        return '2015–2019'
    return 'before 2015'


def decide(record, grid, footprints):
    if not record['dedupe_name']:
        return 'empty name'
    if mall_footprints.mall_at(record['lat'], record['lng'], footprints):
        return 'inside a reconciled centre'
    counterpart = preflight.best_counterpart(record, None, grid)
    if counterpart and counterpart[3] == 'matched':
        return 'served'
    same, _ = fsq.far_same_name(record, grid)
    return 'suspect' if same else 'import'


def curated_value(r, imported_at, run_id):
    values = (
        sql_escape(POI_ID_PREFIX + r['osm_id']), sql_escape('community'), sql_escape(r['name']),
        sql_escape(r['dedupe_name']), repr(float(r['lat'])), repr(float(r['lng'])),
        sql_escape(encode_geohash(r['lat'], r['lng'], fsq.GEOHASH_PRECISION)), sql_escape(r['type']),
        sql_escape(r['address'] or None), sql_escape('active'),
        sql_escape(imported_at), sql_escape(ACTOR), sql_escape(imported_at), sql_escape(ACTOR),
        sql_escape(ORIGIN_SOURCE), sql_escape(r['osm_id']), sql_escape(ORIGIN_LICENCE),
        sql_escape(imported_at), sql_escape(run_id),
    )
    return '(' + ', '.join(values) + ')'


def statements(inserts, imported_at, run_id):
    out = list(fsq.batched((curated_value(r, imported_at, run_id) for r in inserts),
                           fsq.CURATED_INSERT_PREFIX, fsq.CURATED_INSERT_SUFFIX))
    extra = [f"({sql_escape(POI_ID_PREFIX + r['osm_id'])}, {sql_escape(fsq.EXTRA_TYPE_DIMENSION)}, {sql_escape(t)})"
             for r in inserts for t in r.get('extra', [])]
    out += list(fsq.batched(extra, fsq.ATTRIBUTE_INSERT_PREFIX, fsq.ATTRIBUTE_INSERT_SUFFIX))
    return out


def render(c):
    lines = [f"# KAN-461 — OSM archive import, {', '.join(c['types'])} — {'DRY RUN' if c['dry_run'] else 'EMITTED'}", '',
             f"Run `{c['run_id']}`, {c['generated_at']}. Archive `{c['archive']}`; served base {c['served']}.", '',
             '| type | archive rows | import | served | suspect | inside a centre | empty name |',
             '|---|---:|---:|---:|---:|---:|---:|']
    for t in c['types']:
        k = c['by_type'][t]
        lines.append(f"| `{t}` | {sum(k.values()):,} | **{k['import']:,}** | {k['served']:,} | {k['suspect']:,} "
                     f"| {k['inside a reconciled centre']:,} | {k['empty name']:,} |")
    lines += ['', '## Imports by the type they are written as', '',
              '| archive type | written as | rows | how |', '|---|---|---:|---|']
    for (arch, typed, how), n in sorted(c['written'].items(), key=lambda kv: -kv[1]):
        lines.append(f'| `{arch}` | `{typed}` | {n:,} | {how} |')
    if c.get('fresh'):
        lines += ['', '## Freshness of the imports (last edit in OSM, or a check_date)', '',
                  '| type | written with a second type | 2024 or later / checked | 2020–2023 | 2015–2019 | before 2015 |',
                  '|---|---:|---:|---:|---:|---:|']
        for t in c['types']:
            f = c['fresh'].get(t, Counter())
            lines.append(f"| `{t}` | {c['two_types'].get(t, 0):,} | {f['2024 or later / checked']:,} | {f['2020–2023']:,} "
                         f"| {f['2015–2019']:,} | {f['before 2015']:,} |")
    lines += ['', '### Parks kept as `park` on the OSM tag alone (case by case)', '']
    lines += [f"- {r['name']} — {r['lat']:.5f}, {r['lng']:.5f} ({r['osm_id']})" for r in c['tag_only']]
    lines += ['', f"SQL: {c['statements']} statement(s).", '']
    if c['changes'] is not None:
        lines += [f"Emitted: {c['changes']:,} D1 change(s).", '']
    for t in c['types']:
        lines += [f'## Sample `{t}` imports', '']
        lines += [f"- {r['name']} — {r['lat']:.5f}, {r['lng']:.5f} ({r['osm_id']})" for r in c['samples'][t]]
        lines.append('')
    return '\n'.join(lines)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--osm-sql', help='the archived osm_poi dump')
    ap.add_argument('--candidates', help='osm_food_candidates.py output, instead of --osm-sql')
    ap.add_argument('--types', required=True)
    ap.add_argument('--overture-key', required=True)
    ap.add_argument('--overture-csv')
    ap.add_argument('--run-id', required=True)
    ap.add_argument('--work-dir', default=DEFAULT_WORK_DIR)
    ap.add_argument('--report-dir', default=os.path.join(REPO_ROOT, 'docs', 'kan-461'))
    ap.add_argument('--emit', action='store_true')
    args = ap.parse_args(argv)

    types = [t.strip() for t in args.types.split(',') if t.strip()]
    if NEVER & set(types):
        raise SystemExit(f'refused: {sorted(NEVER & set(types))} is never imported (owner, 2026-11-15)')
    os.makedirs(args.work_dir, exist_ok=True)
    overture_csv = args.overture_csv or preflight.fetch_if_missing(args.overture_key, args.work_dir, 'overture')
    served, _ = preflight.served_overture(overture_csv, args.overture_key)
    curated = preflight.served_curated_all()
    grid = preflight.grid_index(served + curated)
    footprints = mall_footprints.load()

    if args.candidates:
        rows, source_name = load_candidates(args.candidates, types)
    elif args.osm_sql:
        rows, source_name = load_archive(args.osm_sql, types), os.path.basename(args.osm_sql)
    else:
        raise SystemExit('one of --osm-sql or --candidates is required')
    by_type, inserts, samples = {t: Counter() for t in types}, [], {t: [] for t in types}
    written, tag_only = Counter(), []
    fresh, two_types = {t: Counter() for t in types}, Counter()
    for r in rows:
        d = decide(r, grid, footprints)
        by_type[r['archive_type']][d] += 1
        if d == 'import':
            inserts.append(r)
            written[(r['archive_type'], r['type'], r['how'])] += 1
            if r['how'] == 'osm tag only':
                tag_only.append(r)
            if r['how'] == 'extract':
                fresh[r['archive_type']][freshness(r)] += 1
                two_types[r['archive_type']] += bool(r.get('extra'))
            if len(samples[r['archive_type']]) < 15:
                samples[r['archive_type']].append(r)
    imported_at = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    stmts = statements(inserts, imported_at, args.run_id)
    changes = fsq.emit(stmts, args.work_dir) if args.emit else None

    context = {'types': types, 'dry_run': not args.emit, 'run_id': args.run_id,
               'generated_at': imported_at, 'archive': source_name,
               'fresh': fresh if args.candidates else None, 'two_types': two_types,
               'served': f'{len(served):,} Overture + {len(curated):,} curated',
               'by_type': by_type, 'statements': len(stmts), 'changes': changes, 'samples': samples,
               'written': written, 'tag_only': tag_only}
    os.makedirs(args.report_dir, exist_ok=True)
    path = os.path.join(args.report_dir, f"import-{args.run_id}{'' if args.emit else '-dry-run'}.md")
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(render(context))
    print(f'{len(inserts):,} to import; report {path}', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
