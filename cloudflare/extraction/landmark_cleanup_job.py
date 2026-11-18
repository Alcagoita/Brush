"""
KAN-461. The landmark cleanup as a container job (docs/kan-461/landmark-cleanup-job.md).

`MODE=landmark-cleanup`, `LANDMARK_CLEANUP_RUN_ID=<run>`. The Worker owns the
run and its areas (src/landmarkCleanup.ts); this claims a batch of areas,
does each, checkpoints it, and releases. Cron starts the next batch.

Dry run, per area:
  * the area's served landmark rows, from one snapshot of D1 taken by the
    run's first batch (`context.json.gz` in R2) — every batch judges with the
    same rows, place names and common words;
  * a row belongs to the first area (in run order) whose box holds it, so
    overlapping boxes never judge a row twice;
  * not a place (the reasons that held up in the 2026-11-17 sample) and
    certain duplicates (`landmark_identity`, one kept, never a part) → to
    remove; a red flag is never acted on; a contributor's row (`manual`) is
    never removed;
  * more than HIDE_SHARE of the area's rows → HELD, nothing decided for it;
  * the decisions (JSON) and a readable report (Markdown) go to R2.

Emit, per area: replay the source dry run's decisions — a rejection marker
in `poi_source_correction` first, then the delete (the 0093 pattern). Rows
already gone are no-ops. Nothing is recomputed.
"""
from __future__ import annotations

import datetime
import gzip
import json
import os
import sys
import time
import traceback
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import landmark_identity as li  # noqa: E402
import rejection_registry as rr  # noqa: E402
import run_landmark_cleanup as rlc  # noqa: E402
from classify_and_load import sql_escape  # noqa: E402

BATCH_SIZE = 40
PAGE = 5000
IN_LIST = 150  # CLAUDE.md: IN lists of at most 150 ids
HIDE_SHARE = rlc.HIDE_SHARE
NOT_A_PLACE_REASONS = rlc.SAFE_REASONS
PREFIX = 'reviews/kan-461/landmark-cleanup'
LANDMARK_TYPES_SQL = ', '.join(sql_escape(t) for t in sorted(li.LANDMARK_TYPES))


def key_for(run_id, name):
    return f'{PREFIX}/{run_id}/{name}'


# ----------------------------------------------------------------------------- D1 with bounded retry

def _retry(call, *args):
    """7403/7500 happen on a valid binding: three tries, then fail with the text. 429 is stop."""
    for attempt in range(3):
        try:
            return call(*args)
        except Exception as error:  # d1_client.D1Error, requests errors
            text = str(error)
            if '429' in text or attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))


def paged(d1, sql_page):
    """Keyset pages: sql_page(after) → rows ordered by `id`."""
    after, out = '', []
    while True:
        rows = _retry(d1.select, sql_page(after))
        out += rows
        if len(rows) < PAGE:
            return out
        after = rows[-1]['id']


# ----------------------------------------------------------------------------- context

def build_context(d1, run_id):
    """One snapshot of what is served, taken once per run."""
    overture = paged(d1, lambda after: (
        "SELECT o.overture_id AS id, COALESCE(c.name_override, o.name) AS name, o.lat, o.lng, o.primary_poi_type AS type "
        "FROM overture_poi o LEFT JOIN poi_source_correction c ON c.source = 'overture' AND c.source_id = o.overture_id "
        f"WHERE (c.visible IS NULL OR c.visible = 1) AND o.retired_in_release IS NULL "
        f"AND o.primary_poi_type IN ({LANDMARK_TYPES_SQL}) AND o.overture_id > {sql_escape(after)} "
        f"ORDER BY o.overture_id LIMIT {PAGE}"))
    curated = paged(d1, lambda after: (
        "SELECT poi_id AS id, name, lat, lng, primary_poi_type AS type, source AS curated_source FROM curated_poi "
        f"WHERE status = 'active' AND primary_poi_type IN ({LANDMARK_TYPES_SQL}) AND poi_id > {sql_escape(after)} "
        f"ORDER BY poi_id LIMIT {PAGE}"))
    rows = [dict(r, source='overture') for r in overture] + [dict(r, source='curated') for r in curated]
    for r in rows:
        r['lat'], r['lng'] = float(r['lat']), float(r['lng'])
    localities = sorted({r['locality'] for r in _retry(d1.select,
                         "SELECT DISTINCT locality FROM overture_candidate WHERE locality IS NOT NULL AND locality <> ''")})
    areas = _retry(d1.select, f"SELECT area_key, name, seq, min_lat, max_lat, min_lng, max_lng FROM landmark_cleanup_scope "
                              f"WHERE run_id = {sql_escape(run_id)} ORDER BY seq")
    assign_areas(rows, areas)
    return {'run_id': run_id, 'taken_at': now_iso(), 'rows': rows, 'localities': localities}


def assign_areas(rows, areas):
    """Each row to the first area (by seq) whose box holds it."""
    boxes = [(a['area_key'], float(a['min_lat']), float(a['max_lat']), float(a['min_lng']), float(a['max_lng'])) for a in areas]
    for r in rows:
        r['area'] = next((k for k, a, b, c, d in boxes if a <= r['lat'] <= b and c <= r['lng'] <= d), None)


def load_context(d1, r2, run_id, work_dir):
    path = os.path.join(work_dir, f'context-{run_id}.json.gz')
    key = key_for(run_id, 'context.json.gz')
    try:
        r2.download_file(key, path)
        context = json.loads(gzip.decompress(open(path, 'rb').read()))
    except Exception as error:
        if '404' not in str(error) and 'not found' not in str(error).lower():
            raise
        context = build_context(d1, run_id)
        r2.upload_bytes(gzip.compress(json.dumps(context, ensure_ascii=False).encode('utf-8')), key, 'application/gzip')
    terms = li.load_terms()
    li.add_place_names(context['localities'])
    li.learn_common_words(context['rows'], terms)
    return context, terms


# ----------------------------------------------------------------------------- one area

def decide_area(rows, terms):
    """(remove [(row, why, keeper_id)], held_reason or None)."""
    remove = []
    for r in rows:
        why = li.not_a_place(r, terms)
        if why in NOT_A_PLACE_REASONS:
            remove.append((r, why, None))
    bad = {r['id'] for r, _, _ in remove}
    for g in rlc.groups([r for r in rows if r['id'] not in bad], terms):
        k = rlc.keeper(g)
        # Only a direct duplicate of the kept row goes: A=B and B=C does not make A=C.
        remove += [(r, f'same place as "{k["name"]}"', k['id']) for r in g
                   if r is not k and li.verdict(r, k, terms) == 'duplicate']
    # A contributor's row is its own audit trail: never removed here.
    remove = [x for x in remove if x[0].get('curated_source') != 'manual']
    share = len(remove) / len(rows) if rows else 0
    held = f'would remove {len(remove)} of {len(rows)} ({share:.0%})' if share > HIDE_SHARE else None
    return remove, held


def render(scope, rows, remove, held, by_id):
    lines = [f"# KAN-461 landmark cleanup — {scope['name']} — {'HELD' if held else 'dry run'}", '',
             f"Served landmark rows: {len(rows):,}. To remove: {len(remove):,}." + (f' **HELD: {held}.**' if held else ''), '',
             '| removed | source | why | kept |', '|---|---|---|---|']
    for r, why, keep in remove:
        kept = by_id.get(keep, {}).get('source', '') if keep else ''
        lines.append(f"| {r['name']} | {r['source']} | {why} | {kept} |")
    return '\n'.join(lines) + '\n'


def dry_run_area(scope, context, terms, run_id, r2):
    rows = [r for r in context['rows'] if r.get('area') == scope['areaKey']]
    remove, held = decide_area(rows, terms)
    by_id = {r['id']: r for r in rows}
    decisions = {'area': scope['areaKey'], 'name': scope['name'], 'held': held, 'rows': len(rows),
                 'remove': [] if held else [{'id': r['id'], 'source': r['source'], 'name': r['name'], 'why': why,
                                             'keeper': keep} for r, why, keep in remove]}
    r2.upload_bytes(json.dumps(decisions, ensure_ascii=False), key_for(run_id, f"areas/{scope['areaKey']}.json"))
    report_key = key_for(run_id, f"areas/{scope['areaKey']}.md")
    r2.upload_bytes(render(scope, rows, remove, held, by_id), report_key, 'text/markdown')
    return len(rows), 0 if held else len(remove), held, report_key


# ----------------------------------------------------------------------------- emit

def emit_statements(remove, note, date):
    """Markers first, then deletes, ≤ IN_LIST ids per statement."""
    over = [x['id'] for x in remove if x['source'] == 'overture']
    cur = [x['id'] for x in remove if x['source'] != 'overture']
    why = {x['id']: x['why'] for x in remove}
    out = []
    for i in range(0, len(over), IN_LIST):
        chunk = over[i:i + IN_LIST]
        ids = ', '.join(sql_escape(x) for x in chunk)
        out.append('INSERT INTO poi_source_correction (source, source_id, visible, review_note, created_at) VALUES '
                   + ', '.join(f"('overture', {sql_escape(x)}, 0, {sql_escape(note + ': ' + why[x])}, {sql_escape(date)})" for x in chunk)
                   + ' ON CONFLICT (source, source_id) DO UPDATE SET visible = 0, review_note = excluded.review_note;')
        out += [f'DELETE FROM overture_poi_type WHERE overture_id IN ({ids});',
                f'DELETE FROM overture_poi_attribute WHERE overture_id IN ({ids});',
                f'DELETE FROM overture_poi WHERE overture_id IN ({ids});',
                f'DELETE FROM overture_candidate WHERE overture_id IN ({ids});']
    origins = ', '.join(sql_escape(k) for k in rr.CORRECTION_SOURCE if k != 'overture')
    for i in range(0, len(cur), IN_LIST):
        ids = ', '.join(sql_escape(x) for x in cur[i:i + IN_LIST])
        out.append('INSERT INTO poi_source_correction (source, source_id, visible, review_note, created_at) '
                   f"SELECT {rr._source_case('origin_source')}, origin_id, 0, {sql_escape(note)}, {sql_escape(date)} "
                   f"FROM curated_poi WHERE poi_id IN ({ids}) AND source <> 'manual' "
                   f'AND origin_source IN ({origins}) AND origin_id IS NOT NULL '
                   'ON CONFLICT (source, source_id) DO UPDATE SET visible = 0;')
        out += [f"DELETE FROM curated_poi_attribute WHERE poi_id IN ({ids}) "
                f"AND poi_id IN (SELECT poi_id FROM curated_poi WHERE source <> 'manual');",
                f"DELETE FROM curated_poi WHERE poi_id IN ({ids}) AND source <> 'manual';"]
    return out


def emit_area(scope, source_run_id, run_id, d1, r2, work_dir):
    path = os.path.join(work_dir, f"decisions-{scope['areaKey'].replace('/', '_')}.json")
    r2.download_file(key_for(source_run_id, f"areas/{scope['areaKey']}.json"), path)
    decisions = json.load(open(path, encoding='utf-8'))
    if decisions.get('held'):
        return decisions.get('rows', 0), 0, 0, decisions['held'], None
    remove = decisions['remove']
    note = f"KAN-461 landmark cleanup {source_run_id} ({key_for(source_run_id, 'areas/' + scope['areaKey'] + '.md')})"
    removed = 0
    for statement in emit_statements(remove, note, now_iso()[:10]):
        meta = _retry(d1.execute, statement) or {}
        if statement.startswith(('DELETE FROM overture_poi WHERE', 'DELETE FROM curated_poi WHERE')):
            removed += int(meta.get('changes') or 0)
    return decisions.get('rows', 0), len(remove), removed, None, None


# ----------------------------------------------------------------------------- batch

def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def run_batch(run_id, d1, r2, worker, work_dir='/tmp'):
    worker_id = str(uuid.uuid4())
    claim = worker.landmark_cleanup_claim(run_id, worker_id, BATCH_SIZE)
    if not claim.get('locked'):
        print(f'[landmark-cleanup] {run_id}: another batch holds the run')
        return {'locked': False}
    scopes = claim.get('scopes') or []
    done = 0
    try:
        if scopes and claim.get('mode') == 'dry_run':
            context, terms = load_context(d1, r2, run_id, work_dir)
        for scope in scopes:
            try:
                if claim.get('mode') == 'emit':
                    rows, to_remove, removed, held, report = emit_area(scope, claim['sourceRunId'], run_id, d1, r2, work_dir)
                else:
                    rows, to_remove, held, report = dry_run_area(scope, context, terms, run_id, r2)
                    removed = 0
                worker.landmark_cleanup_completed(run_id, scope['areaKey'], worker_id, rows, to_remove, removed, held, report)
                done += 1
                print(f"[landmark-cleanup] {scope['name']}: rows {rows}, remove {to_remove}, removed {removed}"
                      + (f', HELD {held}' if held else ''))
            except Exception as error:
                traceback.print_exc()
                if '429' in str(error):
                    break
                worker.landmark_cleanup_failed(run_id, scope['areaKey'], worker_id, f'{type(error).__name__}: {error}')
    finally:
        released = worker.landmark_cleanup_release(run_id, worker_id)
    print(f"[landmark-cleanup] {run_id}: {done} of {len(scopes)} areas this batch; finalized={released.get('finalized')}")
    return {'locked': True, 'done': done, 'released': released}
