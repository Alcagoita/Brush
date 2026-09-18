"""KAN-455. What production serves at the points the reviewed decisions touch.

    python3 verify_prod_decisions.py --out docs/kan-455/verification-<date>.json
    python3 verify_prod_decisions.py --before docs/kan-455/verification-before.json

Reads `POST /poi/nearby` only — the app's contract — never D1. Re-runnable;
no writes anywhere but `--out`. With `--before`, prints a before/after table
against an earlier `--out` file. Exit status is 0 when every check passes,
1 otherwise, so it can gate a deploy.

Each check names a point, the row expected there, and what the reviewed
decision says the row must be. A check that fails before the migrations are
applied is expected to; the point of the table is to show the change.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request

ENDPOINT = 'https://poi-api.brushaway.app/poi/nearby'
DEV_VARS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.dev.vars')
CLOUDFLARE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAX_REQUESTS = 32  # the Worker's MAX_NEARBY_REQUESTS
ODIVELAS_PARQUE = (38.78247076856684, -9.192561695448394)

# Every type the catalogue can serve, for the Odivelas Parque snapshot.
def catalogue_types():
    with open(os.path.join(CLOUDFLARE_DIR, 'src', 'overtureCategories.json')) as handle:
        overture = {v['poi_type'] for k, v in json.load(handle).items() if not k.startswith('_') and v.get('poi_type')}
    with open(os.path.join(CLOUDFLARE_DIR, 'src', 'poiTypeCategories.json')) as handle:
        foursquare = {k for k in json.load(handle) if not k.startswith('_')}
    return sorted(overture | foursquare)


CHECKS = [
    # name, lat, lng, radius, expected-row name fragment, expectation
    {'id': 'decathlon_albufeira', 'lat': 37.128150, 'lng': -8.283346, 'radius': 100, 'name': 'decathlon',
     'expect': {'type': 'store', 'kinds_include': ['bicycle', 'sports'], 'not_type': 'school'},
     'by': '0041 (KAN-448)'},
    {'id': 'casa_do_rum_porto_da_cruz', 'lat': 32.773764, 'lng': -16.828062, 'radius': 100, 'name': 'casa do rum',
     'expect': {'type': 'store', 'kinds_exclude': ['home']},
     'by': 'already right in prod (liquor_store kept its kind); KAN-448 rule 5 keeps it so'},
    {'id': 'casa_das_dores_generic_shopping', 'lat': 38.72858, 'lng': -9.1584299, 'radius': 100, 'name': 'casa das dores',
     'expect': {'absent_or_not_kind': 'home'},
     'by': 'NO STEP YET — one of 329 generic-shopping "Casa …" rows served as home; needs the owner\'s decision (see runbook)'},
    {'id': 'minipreco_carvoeiro_generic_shopping', 'lat': 37.098224, 'lng': -8.465716, 'radius': 100, 'name': 'minipre',
     'expect': {'type': 'supermarket'},
     'by': 'NO STEP YET — pending row the current rule promotes as a supermarket; needs a promotion pass over pending (see runbook)'},
    {'id': 'benfica_official_store_jardim_regedor', 'lat': 38.715261581189004, 'lng': -9.139722008113933, 'radius': 100, 'name': 'benfica official',
     'expect': {'type': 'store', 'kinds_include': ['club_store']},
     'by': '0041 (KAN-447/448)'},
    {'id': 'ale_hop_rua_do_ouro', 'lat': 38.71251400048556, 'lng': -9.139430262558422, 'radius': 100, 'name': 'ale-hop',
     'expect': {'type': 'store', 'kinds_include': ['gift'], 'brand': 'Ale-Hop'},
     'by': '0043 (KAN-457)'},
    {'id': 'ale_hop_faro', 'lat': 37.01632303, 'lng': -7.93233707, 'radius': 100, 'name': 'ale-hop',
     'expect': {'type': 'store', 'kinds_include': ['gift'], 'brand': 'Ale-Hop', 'not_type': 'florist'},
     'by': '0043 (KAN-457)'},
]


def api_key():
    with open(DEV_VARS) as handle:
        for line in handle:
            if line.startswith('API_KEY'):
                return line.split('=', 1)[1].strip().strip('"\'')
    raise SystemExit(f'API_KEY not found in {DEV_VARS}')


def nearby(key, lat, lng, radius, types, limit=50):
    results = {}
    for start in range(0, len(types), MAX_REQUESTS):
        body = {'lat': lat, 'lng': lng, 'radius': radius,
                'requests': [{'key': t, 'type': t} for t in types[start:start + MAX_REQUESTS]],
                'limitPerRequest': limit}
        request = urllib.request.Request(
            ENDPOINT, data=json.dumps(body).encode(), method='POST',
            headers={'X-Api-Key': key, 'User-Agent': 'curl/8.0', 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                payload = json.load(response)
        except urllib.error.HTTPError as error:
            raise SystemExit(f'{ENDPOINT} -> {error.code}: {error.read()[:300]!r}')
        results.update(payload.get('results', {}))
    return results


def rows_named(results, fragment):
    """Every served row whose name carries the fragment, with the types it was returned under."""
    found = {}
    for served_as, rows in results.items():
        for row in rows:
            if fragment in row['name'].lower().replace(' ', '-' if '-' in fragment else ' '):
                entry = found.setdefault(row['poi_id'], {
                    'name': row['name'], 'primary': row['primary_poi_type'], 'brand': row.get('brand'),
                    'kinds': sorted((row.get('attributes') or {}).get('store_kind', [])), 'served_as': set(), 'distance': round(row['distanceMeters'])})
                entry['served_as'].add(served_as)
    for entry in found.values():
        entry['served_as'] = sorted(entry['served_as'])
    return found


def evaluate(check, found):
    expect, problems = check['expect'], []
    if 'absent_or_not_kind' in expect:
        offenders = [e['name'] for e in found.values() if expect['absent_or_not_kind'] in e['kinds']]
        return (not offenders), (f"served as {expect['absent_or_not_kind']}: {offenders}" if offenders else 'absent or not that kind')
    if not found:
        return False, 'not served at this point'
    for entry in found.values():
        if 'type' in expect and entry['primary'] != expect['type']:
            problems.append(f"{entry['name']}: primary {entry['primary']}, expected {expect['type']}")
        if 'not_type' in expect and expect['not_type'] in entry['served_as'] + [entry['primary']]:
            problems.append(f"{entry['name']}: still served as {expect['not_type']}")
        for kind in expect.get('kinds_include', []):
            if kind not in entry['kinds']:
                problems.append(f"{entry['name']}: kinds {entry['kinds']} lack {kind}")
        for kind in expect.get('kinds_exclude', []):
            if kind in entry['kinds']:
                problems.append(f"{entry['name']}: kinds {entry['kinds']} carry {kind}")
        if 'brand' in expect and entry['brand'] != expect['brand']:
            problems.append(f"{entry['name']}: brand {entry['brand']!r}, expected {expect['brand']!r}")
    return (not problems), ('; '.join(problems) if problems else 'ok')


def snapshot_odivelas(key, types):
    results = nearby(key, *ODIVELAS_PARQUE, 200, types)
    rows = {}
    for served_as, entries in results.items():
        for row in entries:
            item = rows.setdefault(row['poi_id'], {
                'name': row['name'], 'primary': row['primary_poi_type'], 'brand': row.get('brand'),
                'source': row.get('source'), 'kinds': sorted((row.get('attributes') or {}).get('store_kind', [])), 'served_as': set()})
            item['served_as'].add(served_as)
    for item in rows.values():
        item['served_as'] = sorted(item['served_as'])
    return rows


def describe(entry):
    return f"{entry['primary']}{'/' + '+'.join(entry['kinds']) if entry['kinds'] else ''}{' brand=' + entry['brand'] if entry['brand'] else ''}"


def run(out_path, before_path):
    key = api_key()
    types = catalogue_types()
    report = {'checks': {}, 'odivelas_parque': {}}
    for check in CHECKS:
        results = nearby(key, check['lat'], check['lng'], check['radius'], types)
        found = rows_named(results, check['name'])
        passed, detail = evaluate(check, found)
        report['checks'][check['id']] = {'passed': passed, 'detail': detail, 'by': check['by'],
                                         'rows': {i: {k: v for k, v in e.items()} for i, e in found.items()}}
    report['odivelas_parque'] = snapshot_odivelas(key, types)

    before = None
    if before_path:
        with open(before_path) as handle:
            before = json.load(handle)

    print(f"{'check':42} {'before':34} {'now':34} result")
    for check in CHECKS:
        now = report['checks'][check['id']]
        prior = (before or {}).get('checks', {}).get(check['id'])
        def state(entry):
            if not entry:
                return '—'
            rows = list(entry['rows'].values())
            return ', '.join(describe(r) for r in rows) if rows else 'absent'
        print(f"{check['id']:42} {state(prior)[:34]:34} {state(now)[:34]:34} {'PASS' if now['passed'] else 'FAIL'}  {now['detail'] if not now['passed'] else ''}")
        print(f"{'':42} by: {check['by']}")

    odivelas = report['odivelas_parque']
    print(f"\nOdivelas Parque, 200 m, {len(types)} types: {len(odivelas)} rows")
    if before:
        prior = before.get('odivelas_parque', {})
        gone = sorted(prior[i]['name'] for i in prior if i not in odivelas)
        new = sorted(odivelas[i]['name'] for i in odivelas if i not in prior)
        changed = [(prior[i]['name'], describe(prior[i]), describe(odivelas[i])) for i in odivelas if i in prior and describe(prior[i]) != describe(odivelas[i])]
        print(f"  before {len(prior)} rows; gone {len(gone)} {gone[:10]}; new {len(new)} {new[:10]}")
        for name, was, now in changed:
            print(f"  changed: {name}: {was} -> {now}")
        if not (gone or new or changed):
            print('  unchanged')
    brands = {}
    for row in odivelas.values():
        if row['brand'] and row['primary'] == 'store':
            brands.setdefault(row['brand'], set()).add(tuple(row['kinds']))
    mixed = {b: sorted(k) for b, k in brands.items() if len(k) > 1}
    print(f"  store brands present: {len(brands)}; with inconsistent kinds: {mixed if mixed else 'none'}")

    if out_path:
        os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)
        with open(out_path, 'w') as handle:
            json.dump(report, handle, indent=1, ensure_ascii=False, sort_keys=True)
        print(f'\nwritten {out_path}')
    return 0 if all(c['passed'] for c in report['checks'].values()) else 1


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--out', help='write the full report (JSON) here')
    parser.add_argument('--before', help='an earlier --out file to diff against')
    args = parser.parse_args(argv)
    return run(args.out, args.before)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
