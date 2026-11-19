"""
KAN-461. One served row per landmark: clean what is already in production.

`run_landmark_import.py` checks what comes in. This checks what is already
served — Overture, the KAN-433 Foursquare rows, and the KAN-461 batches —
with the same rule (`landmark_identity`), one area at a time, the same areas
and order as the import. Owner, 2026-11-16: duplicates are worse than a
missing place, and only places valid for the app belong here ("this is not a
Maps app").

Per area:

  * a row that is not a place to visit (rental, address, event, bare place
    name, bare kind word) → hidden;
  * a group of rows the rule calls `duplicate` → one kept, the rest hidden.
    Only certain duplicates: a red flag (`validate`) is never acted on, so two
    real churches 30 m apart both stay.

Which row is kept: Overture first (it is the base), then curated rows of ours
(mall lists, moderator entries), then OSM, then Foursquare; within a source,
the name in the country's language, then the lowest id. Hidden means an
Overture row gets `poi_source_correction.visible = 0`, a curated row
`status = 'removed'`. Nothing is deleted.

Gate: an area that would hide more than HIDE_SHARE of its landmark rows is
HELD for a person — that is the rule misfiring, not real duplicates.

    python3 run_landmark_cleanup.py --overture-key <key> --overture-csv <csv> --date 20261116 [--only Lisboa] [--emit]
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import import_foursquare_tourism as fsq  # noqa: E402
import import_landmarks as il  # noqa: E402
import landmark_identity as li  # noqa: E402
import preflight_foursquare_archive as preflight  # noqa: E402
import run_landmark_import as rli  # noqa: E402
from classify_and_load import sql_escape  # noqa: E402

HIDE_SHARE = 0.30
# The reasons that held up in the 2026-11-17 sample; duplicates and
# "only a place name" wait for a rule fix.
SAFE_REASONS = {'a street address', 'a rental, event or advert, not a place', 'only a kind word, no name'}
PT_WORDS = {w for w, _ in json.load(open(li.KINDS_PATH, encoding='utf-8'))['pt'].items()}


def source_rank(row):
    rid = row['id']
    if row.get('source') == 'overture':
        return 0
    if rid.startswith('osm:'):
        return 2
    if rid.startswith('fsq:'):
        return 3
    return 1


# A row that names a part of a place — its shop, a room, the entrance — is
# never the one kept ("Loja & Livraria do Museu de Marinha" is not the museum).
PART_WORDS = {'loja', 'livraria', 'shop', 'store', 'sala', 'bilheteira', 'entrada', 'entrance', 'cafe', 'cafetaria',
              'restaurante', 'bar', 'auditorio', 'parking', 'estacionamento', 'wc', 'gift', 'ticket', 'tickets',
              # KAN-461, 2026-11-18: the playground of the garden, the social centre of the parish
              'infantil', 'playground', 'centro', 'social',
              # 2026-11-19: the crypt of the castle, the café terrace on the beach
              'cripta', 'crypt', 'esplanada'}


def keeper(group):
    def key(r):
        part = 1 if set(li.fold(r['name'])) & PART_WORDS else 0
        native = 0 if set(li.fold(r['name'])) & PT_WORDS else 1
        return (part, source_rank(r), native, r['id'])
    return sorted(group, key=key)[0]


def groups(rows, terms):
    """Union of 'duplicate' pairs, within the grid neighbourhood."""
    grid = preflight.grid_index(rows)
    parent = {r['id']: r['id'] for r in rows}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for r in rows:
        for q in il.near(r, grid):
            if q['id'] > r['id'] and li.verdict(r, q, terms) == 'duplicate':
                parent[find(r['id'])] = find(q['id'])
    by_root = defaultdict(list)
    by_id = {r['id']: r for r in rows}
    for rid in parent:
        by_root[find(rid)].append(by_id[rid])
    return [g for g in by_root.values() if len(g) > 1]


def statements(hide, date, area_key):
    """hide: [(row, why)] → a few bounded statements per area: one upsert per
    150 Overture ids, one UPDATE … IN (…) per 150 curated ids (the D1 request
    limit, CLAUDE.md). The reason per row is in the area's report."""
    over = [r for r, _ in hide if r.get('source') == 'overture']
    cur = [r for r, _ in hide if r.get('source') != 'overture']
    note = f'KAN-461 cleanup: duplicate or not a place to visit — docs/kan-461/cleanup/{area_key}.md'
    out = []
    for i in range(0, len(over), 150):
        out.append('INSERT INTO poi_source_correction (source, source_id, visible, review_note, created_at) VALUES\n'
                   + ',\n'.join(f"('overture', {sql_escape(r['id'])}, 0, {sql_escape(note)}, {sql_escape(date)})"
                                 for r in over[i:i + 150])
                   + '\nON CONFLICT (source, source_id) DO UPDATE SET visible = 0, review_note = excluded.review_note;\n')
    for i in range(0, len(cur), 150):
        ids = ', '.join(sql_escape(r['id']) for r in cur[i:i + 150])
        out.append(f"UPDATE curated_poi SET status = 'removed', removed_at = {sql_escape(date)}, removed_by = 'kan-461', "
                   f"removal_reason = {sql_escape(note)} WHERE status = 'active' AND poi_id IN ({ids});\n")
    return out


def localities(overture_csv):
    """Every Overture locality in the country: place names, not landmark names."""
    import csv
    csv.field_size_limit(10 ** 8)
    with open(overture_csv, newline='', encoding='utf-8') as fh:
        return {(r.get('locality') or '').strip() for r in csv.DictReader(fh)} - {''}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--overture-key', required=True)
    ap.add_argument('--overture-csv', required=True)
    ap.add_argument('--date', required=True, help='YYYY-MM-DD for removed_at / created_at')
    ap.add_argument('--work-dir', default=os.path.join(il.REPO_ROOT, 'outputs', 'kan-461'))
    ap.add_argument('--report-dir', default=os.path.join(il.REPO_ROOT, 'docs', 'kan-461', 'cleanup'))
    ap.add_argument('--only')
    ap.add_argument('--emit', action='store_true')
    ap.add_argument('--safe-only', action='store_true',
                    help='hide only street addresses, rentals/events/adverts and bare kind words')
    ap.add_argument('--sql-out', help='write every area\'s statements to this one migration file instead of sending them')
    args = ap.parse_args(argv)

    os.makedirs(args.report_dir, exist_ok=True)
    state_path = os.path.join(args.report_dir, 'state.json')
    state = json.load(open(state_path)) if os.path.exists(state_path) else {}
    terms = li.load_terms()
    li.add_place_names(localities(args.overture_csv))

    hidden = {r['source_id'] for r in preflight.d1_read(
        "SELECT source_id FROM poi_source_correction WHERE source = 'overture' AND visible = 0")}
    served, _ = preflight.served_overture(args.overture_csv, args.overture_key)
    served = [s for s in served if s['id'] not in hidden] + preflight.served_curated_all()
    served = [s for s in served if s.get('type') in li.LANDMARK_TYPES]
    li.learn_common_words(served, terms)
    print(f'{len(served):,} served landmark rows; common words learned for {len(li.COMMON)} kinds', file=sys.stderr, flush=True)

    areas = rli.municipalities()
    if args.only:
        wanted = {n.strip() for n in args.only.split(',')}
        areas = [a for a in areas if a[1] in wanted]
    done = set()
    for key, name, box in areas:
        if state.get(key, {}).get('status') in ('written', 'held', 'clean', 'planned'):
            done.update(state[key].get('ids', []))
            continue
        rows = [s for s in served if il.inside(s, box) and s['id'] not in done]
        hide = []
        for r in rows:
            why = li.not_a_place(r, terms)
            if why:
                hide.append((r, why))
        if args.safe_only:
            hide = [(r, w) for r, w in hide if w in SAFE_REASONS]
        bad = {r['id'] for r, _ in hide}
        for g in ([] if args.safe_only else groups([r for r in rows if r['id'] not in bad], terms)):
            k = keeper(g)
            # Only a direct duplicate of the kept row goes: A=B and B=C does not make A=C.
            hide += [(r, f'same place as {k["id"]} "{k["name"]}"') for r in g
                     if r is not k and li.verdict(r, k, terms) == 'duplicate']
        share = len(hide) / len(rows) if rows else 0
        gate = f'would hide {len(hide)} of {len(rows)} ({share:.0%})' if share > HIDE_SHARE else None
        status = 'clean' if not hide else ('held' if gate else
                                           ('planned' if args.sql_out else 'written' if args.emit else 'dry-run'))
        changes = fsq.emit(statements(hide, args.date, key), args.work_dir) if status == 'written' else None
        if status == 'planned':
            with open(args.sql_out, 'a', encoding='utf-8') as fh:
                fh.write(f'\n-- {name}: {len(hide)} hidden (docs/kan-461/cleanup/{key}-planned.md)\n')
                fh.writelines(statements(hide, args.date, key + '-planned'))
        by = Counter('not a place' if w.startswith(('a ', 'only', 'no ')) else 'duplicate' for _, w in hide)
        lines = [f"# KAN-461 cleanup — {name} — {status.upper()}", '', f'Served landmark rows: {len(rows):,}. '
                 f"To hide: {len(hide):,} (duplicates {by['duplicate']:,}, not a place {by['not a place']:,})."
                 + (f' **HELD: {gate}.**' if gate else '') + (f' Emitted: {changes} change(s).' if changes is not None else ''), '',
                 '| hidden | source | why |', '|---|---|---|']
        lines += [f"| {r['name']} | {r.get('source', '')} | {w} |" for r, w in hide]
        open(os.path.join(args.report_dir, f"{key}{'' if status == 'written' else '-' + status}.md"), 'w',
             encoding='utf-8').write('\n'.join(lines) + '\n')
        ids = [r['id'] for r in rows]
        done.update(ids)
        state[key] = {'name': name, 'status': status, 'rows': len(rows), 'hidden': len(hide) if status == 'written' else 0,
                      'to_hide': len(hide), 'gate': gate, 'ids': ids if status != 'dry-run' else []}
        json.dump(state, open(state_path, 'w'), indent=1)
        print(f"{name:28} {status:8} rows {len(rows):5}  to hide {len(hide):4}" + (f'  HELD: {gate}' if gate else ''),
              file=sys.stderr, flush=True)
    t = Counter()
    for v in state.values():
        t[v['status']] += 1
        t['rows hidden'] += v.get('hidden', 0)
    print('done', dict(t), file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
