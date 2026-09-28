"""
KAN-471 stage 2. The Portuguese name for a place Overture names in English,
from Wikidata — which records the name rather than deriving it.

WHY NOT TRANSLATE

A place's name in a language is a fact, not a string transform. Word-swap
gives `Museu Marítimo` for a museum called **Museu de Marinha**, and
`Mosteiro Jerónimos` for **Mosteiro dos Jerónimos**. Both are names nobody
uses, and writing them breaks the rule that the app never lies. Wikidata
labels are CC0 and are the recorded name, so this looks one up instead.

THE JOIN RULE, AND WHY IT IS THIS STRICT

Measured around Jerónimos on 2026-09-25: a loose join — token overlap plus
≤ 150 m — paired `Antiga Ermida de Nossa Senhora da Conceição` to
`Antiga Confeitaria`, a bakery 70 m away. Distance plus overlap is not
identity. The rule here is the one that produced 5 pairs and no false
positives:

  * the candidate's name, folded, equals the item's `en` OR `pt` label,
    folded — an exact name match, never a partial one;
  * the item is within MAX_DISTANCE_M;
  * the item has both labels and they differ, so there is a Portuguese name
    to record that is not just the English one again;
  * exactly one item qualifies. Two candidates for one place is a question
    for a human, not a coin toss.

Everything that fails goes to the review list. Nothing here writes to D1.

Wikidata is queried by 0.5° box, one request per box, cached on disk so a
re-run costs nothing. HTTP 429 is stop, never retry-harder — the same rule
Overpass and D1 get.

    python3 wikidata_native_names.py --candidates docs/kan-471/…json \\
        --out docs/kan-471/native-name-proposals.json
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

EXTRACTION_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, EXTRACTION_DIR)

ENDPOINT = 'https://query.wikidata.org/sparql'
USER_AGENT = ('BrushPOI/0.20 (https://brushaway.app; olegarioncnascimento@gmail.com) '
              'KAN-471 native place names')
CELL = 0.5           # degrees; one request per cell, ~3k items in the densest
MAX_DISTANCE_M = 100
PAUSE_SECONDS = 1.0  # between requests, unprompted; the service is a shared one

BOX_QUERY = """SELECT ?item ?en ?pt ?lat ?lon WHERE {
  SERVICE wikibase:box {
    ?item wdt:P625 ?loc .
    bd:serviceParam wikibase:cornerSouthWest "Point(%(west)s %(south)s)"^^geo:wktLiteral .
    bd:serviceParam wikibase:cornerNorthEast "Point(%(east)s %(north)s)"^^geo:wktLiteral .
  }
  ?item rdfs:label ?en FILTER(lang(?en) = "en")
  ?item rdfs:label ?pt FILTER(lang(?pt) = "pt")
  BIND(geof:latitude(?loc) AS ?lat) BIND(geof:longitude(?loc) AS ?lon)
}"""


def fold(value):
    """Accent-free, punctuation-free lower case. `Jerónimos Monastery` and
    `Jeronimos  Monastery!` are the same name; `Monastery` is not."""
    text = unicodedata.normalize('NFKD', value or '').encode('ascii', 'ignore').decode()
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', text.lower())).strip()


def metres(lat_a, lng_a, lat_b, lng_b):
    phi_a, phi_b = math.radians(lat_a), math.radians(lat_b)
    inner = (math.sin(phi_a) * math.sin(phi_b)
             + math.cos(phi_a) * math.cos(phi_b) * math.cos(math.radians(lng_a - lng_b)))
    return 6371000 * math.acos(max(-1.0, min(1.0, inner)))


def cell_of(lat, lng):
    return (math.floor(lat / CELL) * CELL, math.floor(lng / CELL) * CELL)


def fetch_cell(south, west, cache_dir, opener=None):
    """Every Wikidata item in one box that has both an English and a
    Portuguese label. Cached: the box is a fact about a release of Wikidata,
    and a re-run should not re-ask for it."""
    key = hashlib.sha256(f'{south},{west},{CELL}'.encode()).hexdigest()[:16]
    path = os.path.join(cache_dir, f'box-{key}.json')
    if os.path.exists(path):
        with open(path) as handle:
            return json.load(handle)
    query = BOX_QUERY % {'south': south, 'west': west,
                         'north': south + CELL, 'east': west + CELL}
    url = f'{ENDPOINT}?{urllib.parse.urlencode({"query": query})}'
    request = urllib.request.Request(url, headers={
        'Accept': 'application/sparql-results+json', 'User-Agent': USER_AGENT})
    try:
        with (opener or urllib.request.urlopen)(request, timeout=120) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as error:
        if error.code == 429:
            raise SystemExit('Wikidata answered 429; stopping. Re-run later — the cache keeps what was fetched.')
        raise
    items = [{
        'qid': row['item']['value'].rsplit('/', 1)[1],
        'en': row['en']['value'], 'pt': row['pt']['value'],
        'lat': float(row['lat']['value']), 'lng': float(row['lon']['value']),
    } for row in payload['results']['bindings']]
    os.makedirs(cache_dir, exist_ok=True)
    with open(path, 'w') as handle:
        json.dump(items, handle)
    return items


def match(candidate, items, max_distance=MAX_DISTANCE_M):
    """The single item that IS this place, or None. See the module docstring
    for why each condition is there."""
    wanted = fold(candidate['name'])
    if not wanted:
        return None, 'the row has no usable name'
    near = [item for item in items
            if metres(candidate['lat'], candidate['lng'], item['lat'], item['lng']) <= max_distance]
    exact = [item for item in near if wanted in (fold(item['en']), fold(item['pt']))]
    if not exact:
        return None, f'no Wikidata item within {max_distance} m carries this exact name'
    usable = [item for item in exact if fold(item['en']) != fold(item['pt'])]
    if not usable:
        return None, 'the item names the place identically in both languages'
    if len({item['qid'] for item in usable}) > 1:
        return None, 'several items carry this name here; a human decides'
    item = usable[0]
    if fold(item['pt']) == wanted:
        return None, 'the default name already IS the Portuguese name'
    if '(' in item['pt']:
        # `Praça da Liberdade (Porto)` — Wikidata disambiguates labels that
        # collide. The suffix is not part of the name, and stripping it is a
        # guess about a label we did not write, so a human decides.
        return None, 'the Wikidata label carries a disambiguator in parentheses'
    return item, None


def propose(candidates, cache_dir, fetch=fetch_cell, pause=PAUSE_SECONDS):
    """{proposals, review} — never a write, and never a guess."""
    cells = sorted({cell_of(row['lat'], row['lng']) for row in candidates})
    boxes = {}
    for index, (south, west) in enumerate(cells, 1):
        print(f'[{index}/{len(cells)}] Wikidata box {south},{west}', file=sys.stderr)
        boxes[(south, west)] = fetch(south, west, cache_dir)
        if pause and index < len(cells):
            time.sleep(pause)

    proposals, review = [], []
    for row in candidates:
        items = boxes.get(cell_of(row['lat'], row['lng']), [])
        item, why = match(row, items)
        if item is None:
            review.append({**row, 'why': why})
            continue
        proposals.append({
            'overture_id': row['overture_id'], 'name': row['name'],
            'name_local': item['pt'], 'name_local_lang': 'pt',
            'category': row['category'],
            'source': 'wikidata', 'wikidata_qid': item['qid'],
            'matched_distance_m': round(metres(row['lat'], row['lng'], item['lat'], item['lng'])),
            'wikidata_en': item['en'],
        })
    return {'proposals': proposals, 'review': review}


def main(argv=None):
    parser = argparse.ArgumentParser(description='KAN-471 stage 2: propose native names from Wikidata')
    parser.add_argument('--candidates', required=True, help='stage 1 output (JSON)')
    parser.add_argument('--out', help='write the proposals and the review list here')
    parser.add_argument('--cache-dir', default=os.path.join(EXTRACTION_DIR, '.wikidata-cache'))
    parser.add_argument('--show', type=int, default=40)
    args = parser.parse_args(argv)

    with open(args.candidates) as handle:
        candidates = json.load(handle)['candidates']
    report = propose(candidates, args.cache_dir)
    proposals, review = report['proposals'], report['review']
    print(f'\n{len(candidates):,} candidates -> {len(proposals):,} proposals, '
          f'{len(review):,} for review', file=sys.stderr)

    for row in proposals[:args.show]:
        print(f"{row['overture_id'][:8]}  {row['name'][:40]:40} -> {row['name_local'][:40]:40} "
              f"{row['matched_distance_m']:3}m  {row['wikidata_qid']}")

    if args.out:
        os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
        with open(args.out, 'w') as handle:
            json.dump(report, handle, ensure_ascii=False, indent=1, sort_keys=True)
        print(f'\nwritten {args.out}', file=sys.stderr)
    print('nothing written to D1: these are proposals for review', file=sys.stderr)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
