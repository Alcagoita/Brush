"""
KAN-461. OSM landmarks that Overture lacks, one area at a time.

Overture is the base; OSM fills gaps (owner, 2026-11-16). Every candidate
goes through `landmark_identity` before anything is written:

  1. not a place (rental, event, address, bare place or kind word) → dropped;
  2. OSM's own duplicates → one kept (the first by OSM id);
  3. against every row we serve in the area (promoted Overture + active
     curated), any 'duplicate' or 'validate' verdict → skipped. A missed place
     is better than a duplicate (owner).

Only 'separate' from everything served is written, as curated_poi with
origin openstreetmap / the OSM element / ODbL-1.0 and this run's id. Dry run
by default; `--emit` writes.

The area is a `place` row's bounding box (D1 `place`, by name), e.g. Lisboa.

    python3 import_landmarks.py --candidates outing-all.json --place Lisboa \\
        --overture-key overture-country-sources/PT/<run>.csv --run-id kan461-landmarks-lisboa-YYYYMMDD [--emit]
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import import_foursquare_tourism as fsq  # noqa: E402
import import_osm_archive as ia  # noqa: E402
import landmark_identity as li  # noqa: E402
import preflight_foursquare_archive as preflight  # noqa: E402
from classify_and_load import normalize_text  # noqa: E402

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MARGIN = 0.004  # ~400 m around the box, so a served row just outside still counts


def place_box(name):
    rows = preflight.d1_read(
        "SELECT name, min_lat, max_lat, min_lng, max_lng FROM place WHERE country_code = 'PT' AND name = "
        + "'" + name.replace("'", "''") + "' AND min_lat IS NOT NULL")
    if not rows:
        raise SystemExit(f'no place named {name!r} with a bounding box')
    r = rows[0]
    return float(r['min_lat']), float(r['max_lat']), float(r['min_lng']), float(r['max_lng'])


def inside(row, box, margin=0.0):
    return box[0] - margin <= row['lat'] <= box[1] + margin and box[2] - margin <= row['lng'] <= box[3] + margin


def near(row, grid):
    cl, cg = int(row['lat'] // preflight.CELL), int(row['lng'] // preflight.CELL)
    for i in (-1, 0, 1):
        for j in (-1, 0, 1):
            yield from grid.get((cl + i, cg + j), ())


FOOD_SHOP = {'cafe', 'restaurant', 'bar', 'pub', 'fast_food', 'ice_cream'}
WATER_OK = {'lake', 'pond', 'lagoon', 'reservoir', 'oxbow', 'river'}


def _fold(value):
    return ' '.join(li.fold(value))


def tag_check(c):
    """(reason to drop, or None; type to write). OSM tags tell a zoo enclosure,
    a café tagged as an attraction or a sewage pond from a place to visit."""
    t, name = c.get('tags') or {}, _fold(c['name'])
    poi_type = c['type']
    if t.get('zoo') or t.get('animal') or t.get('attraction') in ('animal', 'animals', 'enclosure'):
        return 'part of a zoo', poi_type
    if t.get('natural') in ('tree', 'tree_row'):
        return 'a single tree', poi_type
    if t.get('shop') or t.get('amenity') in FOOD_SHOP:
        return 'a business tagged as a landmark', poi_type
    if t.get('access') in ('private', 'no'):
        return 'private', poi_type
    if name.startswith(('plantas ', 'colecao ', 'collection ')) and t.get('leisure') == 'garden':
        return 'a section of a garden', poi_type
    if t.get('leisure') == 'garden':
        if t.get('garden:type') in ('residential', 'private', 'community'):
            return 'a private or community garden', poi_type
        poi_type = 'botanical_garden' if (t.get('garden:type') == 'botanical' or 'botan' in name) else 'park'
    if poi_type == 'lake':
        if set(name.split()) & {'etar', 'tank', 'tanque', 'bacia', 'reservatorio'} or \
                t.get('water') in ('wastewater', 'basin', 'reflecting_pool', 'fountain'):
            return 'not a lake (water works or basin)', poi_type
        if t.get('water') not in WATER_OK and not name.startswith(('lago', 'lagoa', 'albufeira', 'barragem', 'pond', 'lake')):
            return 'water without a lake name or tag', poi_type
    return None, poi_type


ZOO_METRES = 350


def in_a_zoo(c, zoos, terms):
    """An attraction with no landmark word in its name, inside a zoo's reach:
    an enclosure ("Chimpanzé", "Búfalos", "Comboio do Zoo"), not a place."""
    if c['type'] != 'tourist_attraction':
        return False
    if set(li.fold(c['name'])) & set(li.KIND_WORDS):
        return False
    return any(li.metres(c, z) <= ZOO_METRES for z in zoos)


def plan(candidates, served, terms):
    """(write, dropped) — dropped is [(row, reason, other)]."""
    zoos = [r for r in list(candidates) + list(served) if r.get('type') == 'zoo' or (r.get('tags') or {}).get('tourism') == 'zoo']
    dropped, kept = [], []
    kept_grid = {}
    for c in sorted(candidates, key=lambda r: r['id']):
        why, c['type'] = tag_check(c)
        why = why or ('part of a zoo' if in_a_zoo(c, zoos, terms) else None) or li.not_a_place(c, terms)
        if why:
            dropped.append((c, 'not a place', why))
            continue
        twin = next((k for k in near(c, kept_grid) if li.verdict(c, k, terms) == 'duplicate'), None)
        if twin:
            dropped.append((c, 'OSM duplicate', twin['name']))
            continue
        kept.append(c)
        kept_grid.setdefault((int(c['lat'] // preflight.CELL), int(c['lng'] // preflight.CELL)), []).append(c)
    grid = preflight.grid_index(served)
    write = []
    for c in kept:
        hit = None
        for s in near(c, grid):
            v = li.verdict(c, s, terms)
            if v != 'separate':
                hit = (v, s)
                break
        if hit:
            dropped.append((c, 'served duplicate' if hit[0] == 'duplicate' else 'red flag with a served row',
                            f"{hit[1]['name']} ({hit[1].get('source', '')})"))
        else:
            write.append(c)
    return write, dropped


def render(run, place, emitted, write, dropped, n_served):
    by = Counter(r for _, r, _ in dropped)
    lines = [f"# KAN-461 — OSM landmarks, {place} — {'EMITTED' if emitted is not None else 'DRY RUN'}", '',
             f'Run `{run}`. Source: Geofabrik `portugal-261114.osm.pbf` (OSM data to 2026-11-14). '
             f'Rule: `landmark_identity` (owner, 2026-11-16). Served landmark rows in the area: {n_served:,}.', '',
             '| step | rows |', '|---|---:|',
             f"| OSM candidates in {place} | {len(write) + len(dropped):,} |"]
    for reason in ('not a place', 'OSM duplicate', 'served duplicate', 'red flag with a served row'):
        lines.append(f'| dropped — {reason} | {by[reason]:,} |')
    lines.append(f'| **to write** | **{len(write):,}** |')
    if emitted is not None:
        lines += ['', f'Emitted: {emitted:,} D1 change(s).']
    lines += ['', '## To write, by type', '', '| type | rows |', '|---|---:|']
    for t, n in Counter(r['type'] for r in write).most_common():
        lines.append(f'| `{t}` | {n:,} |')
    lines += ['', '## To write', '']
    lines += [f"- {r['name']} — `{r['type']}` — {r['lat']:.5f}, {r['lng']:.5f} ({r['id']})" for r in write]
    for reason in ('served duplicate', 'red flag with a served row', 'OSM duplicate', 'not a place'):
        rows = [(c, o) for c, r, o in dropped if r == reason]
        lines += ['', f'## Dropped — {reason} ({len(rows)})', '']
        lines += [f"- {c['name']} ↔ {o}" for c, o in rows]
    return '\n'.join(lines) + '\n'


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--candidates', required=True)
    ap.add_argument('--place', required=True)
    ap.add_argument('--overture-key', required=True)
    ap.add_argument('--overture-csv')
    ap.add_argument('--run-id', required=True)
    ap.add_argument('--work-dir', default=os.path.join(REPO_ROOT, 'outputs', 'kan-461'))
    ap.add_argument('--report-dir', default=os.path.join(REPO_ROOT, 'docs', 'kan-461'))
    ap.add_argument('--emit', action='store_true')
    args = ap.parse_args(argv)

    terms = li.load_terms()
    box = place_box(args.place)
    cands = [dict(r, id=r['osm_id'], type=r['types'][0]) for r in json.load(open(args.candidates, encoding='utf-8'))['rows']]
    cands = [c for c in cands if inside(c, box)]
    os.makedirs(args.work_dir, exist_ok=True)
    overture_csv = args.overture_csv or preflight.fetch_if_missing(args.overture_key, args.work_dir, 'overture')
    served, _ = preflight.served_overture(overture_csv, args.overture_key)
    served = [s for s in served + preflight.served_curated_all()
              if inside(s, box, MARGIN) and s.get('type') in li.LANDMARK_TYPES]
    write, dropped = plan(cands, served, terms)

    emitted = None
    if args.emit:
        now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        recs = [{'osm_id': r['id'], 'name': r['name'], 'dedupe_name': normalize_text(r['name']), 'lat': r['lat'],
                 'lng': r['lng'], 'type': r['type'], 'extra': [x for x in r['types'][1:] if x != r['type']],
                 'address': r.get('address') or ''}
                for r in write]
        emitted = fsq.emit(ia.statements(recs, now, args.run_id), args.work_dir)
    os.makedirs(args.report_dir, exist_ok=True)
    path = os.path.join(args.report_dir, f"import-{args.run_id}{'' if args.emit else '-dry-run'}.md")
    open(path, 'w', encoding='utf-8').write(render(args.run_id, args.place, emitted, write, dropped, len(served)))
    print(f'{len(write):,} to write of {len(cands):,}; report {path}', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
