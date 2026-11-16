"""
KAN-461. The landmark import, unattended: every municipality, one at a time.

Same rule as `import_landmarks.py` (Lisbon, reviewed by the owner), run over
every PT municipality in the D1 `place` table, Lisbon first. Owner,
2026-11-16: "We don't need to stay here waiting if we know what we need, and
where the data is."

Per municipality: OSM candidates in its box → `import_landmarks.plan` (not a
place, OSM duplicates, anything that duplicates or red-flags a served row) →
gates → write. A gate that fails HOLDS the area for a person instead of
writing it:

  * red flags above RED_FLAG_SHARE of the area's candidates (the rule is
    unsure here);
  * more than MAX_BATCH rows to write (an abnormal area).

What one area writes counts as served for the next, and the KAN-452 origin
index makes a re-written OSM element a no-op, so overlapping boxes write
nothing twice. Every row carries `kan461-landmarks-<place>-<date>`, so an
area can be withdrawn in one statement. A state file makes the run
resumable; reports land in docs/kan-461/landmarks/.

    python3 run_landmark_import.py --candidates outing-all.json \\
        --overture-key overture-country-sources/PT/<run>.csv --overture-csv <csv> --date 20261116 [--emit]
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import import_foursquare_tourism as fsq  # noqa: E402
import import_landmarks as il  # noqa: E402
import import_osm_archive as ia  # noqa: E402
import landmark_identity as li  # noqa: E402
import preflight_foursquare_archive as preflight  # noqa: E402
from classify_and_load import normalize_text  # noqa: E402

REPO_ROOT = il.REPO_ROOT
RED_FLAG_SHARE = 0.25
MAX_BATCH = 1500
FIRST = 'Lisboa'


def slug(name):
    return '-'.join(li.fold(name))


REST_OF_COUNTRY = ('Resto de Portugal', (32.0, 42.2, -31.5, -6.1))


def municipalities():
    """Lisbon first; then every municipality-level place (some are stored as a
    city or a town: Lisboa, Viana do Castelo, Ponte de Lima); then the three
    county boxes; then whatever no box covered, as one area."""
    rows = preflight.d1_read(
        "SELECT name, place_kind, min_lat, max_lat, min_lng, max_lng FROM place WHERE country_code = 'PT' "
        "AND place_kind IN ('municipality', 'city', 'town', 'city_district', 'county') AND min_lat IS NOT NULL")
    out = [(r['name'], (float(r['min_lat']), float(r['max_lat']), float(r['min_lng']), float(r['max_lng'])),
            r['place_kind'] == 'county') for r in rows]
    out = sorted(out, key=lambda p: (p[0] != FIRST, p[2], p[0]))
    areas = [(slug(n) + ('-county' if county else ''), n, b) for n, b, county in out]
    return areas + [(slug(REST_OF_COUNTRY[0]), REST_OF_COUNTRY[0], REST_OF_COUNTRY[1])]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--candidates', required=True)
    ap.add_argument('--overture-key', required=True)
    ap.add_argument('--overture-csv', required=True)
    ap.add_argument('--date', required=True, help='YYYYMMDD, part of every run id')
    ap.add_argument('--work-dir', default=os.path.join(REPO_ROOT, 'outputs', 'kan-461'))
    ap.add_argument('--report-dir', default=os.path.join(REPO_ROOT, 'docs', 'kan-461', 'landmarks'))
    ap.add_argument('--only', help='comma-separated municipality names (default: all)')
    ap.add_argument('--emit', action='store_true')
    args = ap.parse_args(argv)

    os.makedirs(args.report_dir, exist_ok=True)
    os.makedirs(args.work_dir, exist_ok=True)
    state_path = os.path.join(args.report_dir, 'state.json')
    state = json.load(open(state_path)) if os.path.exists(state_path) else {}

    terms = li.load_terms()
    cands = [dict(r, id=r['osm_id'], type=r['types'][0]) for r in json.load(open(args.candidates, encoding='utf-8'))['rows']]
    served, _ = preflight.served_overture(args.overture_csv, args.overture_key)
    served = [s for s in served + preflight.served_curated_all() if s.get('type') in li.LANDMARK_TYPES]
    print(f'{len(cands):,} candidates; {len(served):,} served landmark rows', file=sys.stderr, flush=True)

    places = municipalities()
    if args.only:
        wanted = {n.strip() for n in args.only.split(',')}
        places = [p for p in places if p[1] in wanted]
    done_ids = set()
    for key, name, box in places:
        if state.get(key, {}).get('status') in ('written', 'held', 'empty'):
            done_ids.update(state[key].get('ids', []))
            continue
        area = [c for c in cands if il.inside(c, box) and c['id'] not in done_ids]
        area_served = [s for s in served if il.inside(s, box, il.MARGIN)]
        write, dropped = il.plan([dict(c) for c in area], area_served, terms)
        by = Counter(r for _, r, _ in dropped)
        run_id = f'kan461-landmarks-{key}-{args.date}'
        gate = None
        if area and by['red flag with a served row'] / len(area) > RED_FLAG_SHARE:
            gate = f"red flags {by['red flag with a served row']} of {len(area)} candidates"
        elif len(write) > MAX_BATCH:
            gate = f'{len(write)} rows to write, above {MAX_BATCH}'
        status = 'empty' if not write else ('held' if gate else ('written' if args.emit else 'dry-run'))
        emitted = None
        if status == 'written':
            now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
            recs = [{'osm_id': r['id'], 'name': r['name'], 'dedupe_name': normalize_text(r['name']), 'lat': r['lat'],
                     'lng': r['lng'], 'type': r['type'], 'extra': [x for x in r['types'][1:] if x != r['type']],
                     'address': r.get('address') or ''} for r in write]
            emitted = fsq.emit(ia.statements(recs, now, run_id), args.work_dir)
            # What this area wrote is served for the next one.
            served += [{'source': 'curated', 'id': 'osm:' + r['id'], 'name': r['name'], 'lat': r['lat'],
                        'lng': r['lng'], 'type': r['type']} for r in write]
        report = il.render(run_id, name, emitted, write, dropped, len(area_served))
        if gate:
            report = report.replace('\n\n', f'\n\n**HELD for review: {gate}.** Nothing written.\n\n', 1)
        fname = f"{key}{'' if status == 'written' else '-' + status}.md"
        open(os.path.join(args.report_dir, fname), 'w', encoding='utf-8').write(report)
        ids = [c['id'] for c in area]
        done_ids.update(ids)
        state[key] = {'name': name, 'status': status, 'candidates': len(area), 'written': len(write) if status == 'written' else 0,
                      'to_write': len(write), 'gate': gate, 'run_id': run_id, 'changes': emitted, 'ids': ids if status != 'dry-run' else []}
        json.dump(state, open(state_path, 'w'), indent=1)
        print(f"{name:28} {status:8} candidates {len(area):5}  to write {len(write):5}" + (f"  HELD: {gate}" if gate else ''),
              file=sys.stderr, flush=True)

    totals = Counter()
    for v in state.values():
        totals[v['status']] += 1
        totals['rows written'] += v.get('written', 0)
    lines = ['# KAN-461 — OSM landmarks by municipality', '', f'Gates: red flags above {RED_FLAG_SHARE:.0%} of candidates, '
             f'or more than {MAX_BATCH} rows → held.', '', f"Written areas: {totals['written']}, held: {totals['held']}, "
             f"empty: {totals['empty']}, rows written: {totals['rows written']:,}.", '',
             '| municipality | status | candidates | written | held because |', '|---|---|---:|---:|---|']
    for v in sorted(state.values(), key=lambda v: v['name']):
        lines.append(f"| {v['name']} | {v['status']} | {v['candidates']:,} | {v.get('written', 0):,} | {v.get('gate') or ''} |")
    open(os.path.join(args.report_dir, 'SUMMARY.md'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    print('done', dict(totals), file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
