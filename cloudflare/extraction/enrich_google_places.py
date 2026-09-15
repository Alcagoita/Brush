"""KAN-449. Google Places as the third evidence source, for the rows nobody else has.

    python3 enrich_google_places.py --country PT --limit 200                 # pilot, dry-run
    python3 enrich_google_places.py --country PT --limit 200 --control       # precision on resolved rows
    python3 enrich_google_places.py --country PT --all --emit \
        --overture-key overture-country-sources/PT/<run>.csv

Google is not in the runtime chain and stays out of it: no user ever triggers
a call. This is a backend job, run by us, once per country, that edits kind on
rows we already have. It stores two things — Google's `place_id`, which may be
kept indefinitely, and our own kind label from our own vocabulary, decided by
our own matcher. No Google name, address, category or rating is written to
any committed file or to D1.

Same contract as run_evidence_join.py: dry-run by default; the residual is
derived from the archived source and the real promotion decision; matching
is the shared ladder with the venue and toponym guards; Google's category is
payload, never a filter; ambiguous kinds fail closed; `--emit` writes the
four-file run under docs/evidence/ and nothing else. A hard cap keeps a run
inside the free tier unless told otherwise, and a per-row checkpoint means an
interrupted run does not re-spend calls.

The pilot comes first. `--control` runs the rows Foursquare and OSM already
resolved, so Google's per-type precision is measured before any residual row
is decided by it. Meta's alternates were 14% on their most common value; the
deny list is what the pilot says it is, not what seemed reasonable.
"""
import argparse
import csv
import datetime
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request
from collections import Counter, defaultdict

EXTRACTION_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, EXTRACTION_DIR)
os.environ.setdefault('BRUSH_TYPE_RELATION', 'sql')
CLOUDFLARE_DIR = os.path.dirname(EXTRACTION_DIR)
ROOT = os.path.dirname(CLOUDFLARE_DIR)

import match_residual_foursquare as fsq
import run_evidence_join as join
from analyse_poi_candidates import reachable_types

TYPES_PATH = os.path.join(CLOUDFLARE_DIR, 'src', 'googlePlaceTypes.json')
ENDPOINT = 'https://places.googleapis.com/v1/places:searchText'
# Only what the match and the mapping need. `types`/`primaryType` put the
# call in the Pro SKU — 5,000 free a month.
FIELD_MASK = 'places.id,places.displayName,places.location,places.types,places.primaryType'
BIAS_RADIUS_M = 150.0
FREE_TIER_CAP = 4500
REQUEST_SPACING_S = 0.2


class CapReached(RuntimeError):
    pass


# --------------------------------------------------------------------------- mapping

def type_mapping():
    with open(TYPES_PATH) as handle:
        raw = json.load(handle)
    deny = set(raw.get('_deny', ()))
    mapping = {k: v for k, v in raw.items() if not k.startswith('_')}
    reachable = set(reachable_types())
    for google_type, entry in list(mapping.items()):
        if entry['poi_type'] not in reachable:
            # Present in the file for the record, but the app cannot surface
            # it, so it can settle nothing here.
            deny.add(google_type)
    return mapping, deny


def kinds_for(primary_type, types, mapping, deny):
    """(poi_type, store_kind) from Google's classification, or None.

    primaryType decides. The other types are consulted only when the
    primary is generic — `store` with `shoe_store` further down is a shoe
    shop — never to add a second answer.
    """
    candidates = [primary_type] if primary_type and primary_type not in deny else []
    if not candidates:
        candidates = [t for t in (types or ()) if t not in deny and t in mapping]
    found = {(mapping[t]['poi_type'], mapping[t].get('store_kind')) for t in candidates if t in mapping}
    return next(iter(found)) if len(found) == 1 else None


# --------------------------------------------------------------------------- google

def search(name, lat, lng, api_key, fetch=None):
    """One Text Search (New) call. Returns Google's places, raw, for the
    matcher; nothing from here is written anywhere but the checkpoint."""
    body = json.dumps({
        'textQuery': name,
        'locationBias': {'circle': {'center': {'latitude': lat, 'longitude': lng}, 'radius': BIAS_RADIUS_M}},
        'maxResultCount': 5,
        'languageCode': 'pt',
    }).encode('utf-8')
    request = urllib.request.Request(ENDPOINT, data=body, method='POST', headers={
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': api_key,
        'X-Goog-FieldMask': FIELD_MASK,
    })
    opener = fetch or urllib.request.urlopen
    with opener(request, timeout=30) as response:
        return json.load(response).get('places', [])


def decide(name, lat, lng, locality, places, mapping, deny):
    """(decision, poi_type, store_kind, reason, candidates) — the shared rule."""
    normalized = fsq.normalize(name)
    seen = [(p['id'], fsq.normalize((p.get('displayName') or {}).get('text', '')),
             p['location']['latitude'], p['location']['longitude'], p.get('primaryType'), p.get('types', []))
            for p in places if p.get('location')]
    in_radius = [(pid, pname, fsq.haversine_m(lat, lng, plat, plng), ptype, ptypes)
                 for pid, pname, plat, plng, ptype, ptypes in seen]
    in_radius = [c for c in in_radius if c[2] <= fsq.FAR_M]
    venue = fsq.venue_words(c[1] for c in in_radius)
    scored, near = [], []
    for pid, pname, distance, ptype, ptypes in in_radius:
        score = fsq.similarity(normalized, pname)
        exact = bool(normalized) and normalized == pname
        if not (exact or score >= fsq.MATCH_LADDER[0][1]):
            continue
        distinctive = fsq.distinctive_shared_word(normalized, pname, locality, venue)
        place_only = bool(set(normalized.split()) & set(pname.split())) and not distinctive
        candidate = {'source': 'google', 'id': pid, 'distance_m': round(distance), 'similarity': round(score, 2),
                     'exact': exact}
        scored.append((candidate, ptype, ptypes))
        if fsq.accepts(distance, score, exact, distinctive) and \
                not (place_only and not exact and score < fsq.STRONG_SIMILARITY):
            near.append((candidate, ptype, ptypes))
    candidates = [c for c, _, _ in scored]
    if not scored:
        return 'insufficient_evidence', '', '', 'no Google place within 400 m shares this name', candidates
    if not near:
        best = min(scored, key=lambda s: s[0]['distance_m'])[0]
        return ('insufficient_evidence', '', '',
                f"Google name agreement {best['similarity']} too weak for {best['distance_m']} m", candidates)
    resolved = {kinds_for(ptype, ptypes, mapping, deny) for _, ptype, ptypes in near}
    resolved.discard(None)
    if len(resolved) == 1:
        poi_type, kind = next(iter(resolved))
        return 'verified_subtype', poi_type, kind or '', 'Google name and location matched', candidates
    if len(resolved) > 1:
        return 'insufficient_evidence', '', '', 'matched Google places disagree', candidates
    return 'insufficient_evidence', '', '', 'matched Google place has no usable type', candidates


# --------------------------------------------------------------------------- checkpoint

def checkpoint_load(path):
    done = {}
    if os.path.exists(path):
        with open(path) as handle:
            for line in handle:
                if line.strip():
                    try:
                        record = json.loads(line)
                        done[record['overture_id']] = record
                    except (ValueError, KeyError):
                        continue
    return done


# --------------------------------------------------------------------------- run

def run(args, fetch=None):
    api_key = args.api_key or os.environ.get('GOOGLE_PLACES_API_KEY')
    if not api_key:
        raise SystemExit('GOOGLE_PLACES_API_KEY is not set (cloudflare/.dev.vars, never the repo)')
    if args.emit and not (args.limit or args.all):
        raise join.EmitRefused('--emit needs --limit N or an explicit --all')
    if args.emit and not args.overture_key:
        raise join.EmitRefused('--emit requires --overture-key')
    if args.emit and args.control:
        raise join.EmitRefused('--control is a measurement; it cannot be emitted')

    country = args.country.upper()
    run_id = args.run_id or datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    work_dir = args.work_dir or os.path.join(ROOT, 'outputs', f'google-{country}-{run_id}')
    os.makedirs(work_dir, exist_ok=True)
    overture_csv = args.overture or join.r2_get(args.overture_key, os.path.join(work_dir, 'overture.csv'))
    mapping, deny = type_mapping()

    if args.control:
        rows = control_rows(args.control_manifest)
    else:
        rows = list(join.residual_rows(overture_csv, args.overture_key or ''))
    if args.limit:
        rows = rows[:args.limit]
    print(f'{len(rows):,} rows to look up', file=sys.stderr)

    checkpoint = os.path.join(work_dir, 'google-checkpoint.jsonl')
    done = checkpoint_load(checkpoint)
    calls = 0
    suggestions, counts = [], Counter()
    with open(checkpoint, 'a') as handle:
        for row in rows:
            record = done.get(row['overture_id'])
            if record is None:
                if calls >= args.cap:
                    raise CapReached(f'{calls} calls this run; raise --cap deliberately to go past the free tier')
                try:
                    places = search(row['name'], float(row['lat']), float(row['lng']), api_key, fetch)
                except urllib.error.HTTPError as error:
                    if error.code == 429:
                        print('Google returned 429; stopping. Rerun later to resume from the checkpoint.', file=sys.stderr)
                        break
                    raise
                calls += 1
                time.sleep(REQUEST_SPACING_S)
                decision, poi_type, kind, reason, candidates = decide(
                    row['name'], float(row['lat']), float(row['lng']), row.get('locality') or '', places, mapping, deny)
                # The checkpoint keeps Google's types so the pilot can measure
                # precision; it lives in the work dir and is never committed.
                record = {'overture_id': row['overture_id'], 'decision': decision, 'poi_type': poi_type,
                          'store_kind': kind, 'reason': reason, 'candidates': candidates,
                          'google_types': [(p.get('primaryType'), p.get('types', [])) for p in places]}
                handle.write(json.dumps(record) + '\n')
                handle.flush()
            suggestion = {
                'overture_id': row['overture_id'], 'name': row['name'], 'locality': row.get('locality') or '',
                'lat': round(float(row['lat']), 6), 'lng': round(float(row['lng']), 6),
                'candidates': record['candidates'], 'decision': record['decision'],
                'poi_type': record['poi_type'], 'store_kind': record['store_kind'],
                'reason': record['reason'], 'source': 'google' if record['decision'] != 'insufficient_evidence' else '',
            }
            if args.control:
                suggestion['established'] = (row['subtype'], row['store_kind'])
                suggestion['google_types'] = record['google_types']
            suggestions.append(suggestion)
            counts[(record['decision'], suggestion['source'])] += 1

    print(f'{calls:,} Google calls this run', file=sys.stderr)
    report = join.residual_report(counts, len(suggestions))
    for state, entry in sorted(report['by_state'].items(), key=lambda kv: -kv[1]['rows']):
        print(f"  {state:24s} {entry['rows']:>6,}  ({entry['share']:.1%})", file=sys.stderr)

    if args.control:
        return control_report(suggestions, mapping, deny, args.report_out)

    if not args.emit:
        print('dry run: nothing written', file=sys.stderr)
        return 0

    draft = join.overrides_draft(suggestions, args.overture_key, run_id)
    outputs = join.serialise(suggestions, draft, report)
    manifest = {
        'country': country, 'run_id': run_id, 'source': 'google-places-text-search-v1',
        'field_mask': FIELD_MASK, 'bias_radius_m': BIAS_RADIUS_M,
        'generated_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'tool_commit': join.repo_commit(), 'config_sha256': config_hash(),
        'inputs': {'overture': {'key': args.overture_key, 'sha256': join.sha256_of(overture_csv)}},
        'outputs': {name: join.sha256_bytes(data) for name, data in outputs.items()},
        'google_calls': calls,
    }
    out_dir = os.path.join(join.EVIDENCE_DIR, country, run_id)
    if os.path.exists(out_dir):
        raise SystemExit(f'refusing to overwrite an existing run: {out_dir}')
    os.makedirs(out_dir)
    for name, data in outputs.items():
        with open(os.path.join(out_dir, name), 'wb') as handle:
            handle.write(data)
    with open(os.path.join(out_dir, 'manifest.json'), 'w') as handle:
        json.dump(manifest, handle, indent=2)
        handle.write('\n')
    print(f'-> {out_dir}', file=sys.stderr)
    return 0


def config_hash():
    digest = hashlib.sha256(join.config_hash().encode())
    with open(TYPES_PATH, 'rb') as handle:
        digest.update(handle.read())
    digest.update(f'{FIELD_MASK}|{BIAS_RADIUS_M}'.encode())
    return digest.hexdigest()


def control_rows(manifest_path):
    """Rows Foursquare/OSM resolved, with what they established — the control."""
    with open(manifest_path, newline='') as handle:
        return [dict(r) for r in csv.DictReader(handle, delimiter='\t') if r['decision'] == 'verified_subtype']


def control_report(suggestions, mapping, deny, report_out):
    """Per Google type: how often its kind agrees with Foursquare/OSM."""
    per_type = defaultdict(lambda: {'n': 0, 'hits': 0})
    matched = agreed = 0
    for s in suggestions:
        if s['decision'] != 'verified_subtype':
            continue
        matched += 1
        established = tuple(s['established'])
        got = (s['poi_type'], s['store_kind'] or None)
        established = (established[0], established[1] or None)
        for primary, _ in s['google_types']:
            if primary and primary not in deny:
                per_type[primary]['n'] += 1
                per_type[primary]['hits'] += int(got == established)
                break
        agreed += int(got == established)
    print(f'\ncontrol: {len(suggestions):,} resolved rows looked up, {matched:,} matched by Google, '
          f'{agreed:,} agree with Foursquare/OSM ({agreed / matched:.0%} of matches)' if matched else
          '\ncontrol: no matches', file=sys.stderr)
    print(f"  {'google primaryType':<30}{'n':>5}{'precision':>11}", file=sys.stderr)
    table = {}
    for google_type, c in sorted(per_type.items(), key=lambda kv: -kv[1]['n']):
        table[google_type] = {'n': c['n'], 'precision': round(c['hits'] / c['n'], 3)}
        if c['n'] >= 3:
            print(f"  {google_type:<30}{c['n']:>5}{c['hits'] / c['n']:>10.0%}", file=sys.stderr)
    if report_out:
        with open(report_out, 'w') as handle:
            json.dump({'looked_up': len(suggestions), 'matched': matched, 'agreed': agreed, 'per_type': table},
                      handle, indent=2)
        print(f'-> {report_out}', file=sys.stderr)
    return 0


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--country', required=True)
    parser.add_argument('--overture-key', help='archived Overture CSV key; required to emit')
    parser.add_argument('--overture', help='local copy of the archive, to skip the download')
    parser.add_argument('--limit', type=int, help='look up only the first N rows')
    parser.add_argument('--all', action='store_true', help='look up every residual row')
    parser.add_argument('--emit', action='store_true')
    parser.add_argument('--control', action='store_true', help='run the already-resolved rows and measure precision')
    parser.add_argument('--control-manifest', default=os.path.join(ROOT, 'docs', 'kan-444', 'decision-manifest.tsv'))
    parser.add_argument('--report-out', help='where --control writes its JSON report')
    parser.add_argument('--cap', type=int, default=FREE_TIER_CAP, help='max Google calls this run')
    parser.add_argument('--run-id')
    parser.add_argument('--work-dir')
    parser.add_argument('--api-key', help='prefer GOOGLE_PLACES_API_KEY in the environment')
    args = parser.parse_args(argv)
    try:
        return run(args)
    except (join.EmitRefused, CapReached) as refused:
        print(f'refused: {refused}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
