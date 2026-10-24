"""
KAN-439. What type each listed mall tenant gets, and on what evidence.

THE ORDER OF EVIDENCE, STRONGEST FIRST

  1. a person's ruling          `mall_lists/tenant_type_overrides.json`
  2. a row we already hold      the same name elsewhere in Portugal, under
                                exactly one set of types
  3. OSM                        one dominant tag for that name in Portugal
  4. the operator's category    only where it implies exactly one type

Anything none of those answers is **reported, never guessed**. The operator's
category is last on purpose: it is a marketing grouping, not a type.
`Serviços` covers a barber, a car wash and a currency exchange, and reading it
as a type is how `Mandarim`, a Chinese restaurant, came to be held as
`store` + `home`.

WHY THIS IS A SCRIPT AND NOT A ONE-OFF

The first pass at this was done by hand across a dozen ad-hoc queries, and the
intermediate files lived in /tmp. They were deleted, and the evidence behind
67 typings went with them. The answer has to be reproducible from what the
repository holds, so it is derived here and written to
`mall_lists/<centre>_types.tsv` with the evidence on every row.

A brand carries the same type set in every branch (owner, 2026-10-08), which
is why tier 2 looks the brand up nationally rather than near the centre.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from classify_and_load import normalize_text, sql_escape  # noqa: E402
import mall_tenants  # noqa: E402

LISTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mall_lists')
OVERRIDES_PATH = os.path.join(LISTS_DIR, 'tenant_type_overrides.json')
D1_ID_BATCH = 120

# A category that implies exactly one type. Both centres are here because they
# use different words for the same idea — Amoreiras says `Restaurantes` where
# UBBO says `Restauração`, and leaving one out silently turns every unit under
# it into "unanswerable".
SINGLE_CATEGORY = {
    'Restauração': ('restaurant',), 'Restaurantes': ('restaurant',),
    'Cafetaria, Gelataria e Doçaria': ('cafe',),
    'Moda Feminina': ('store', 'womens_clothing'),
    'Moda Masculina': ('store', 'mens_clothing'),
    'Moda Infantil': ('store', 'childrens_clothing'),
    'Moda Íntima': ('store', 'lingerie'),
    'Sapataria': ('store', 'shoes'),
    'Ótica': ('store', 'eyewear_and_optician'),
    'Perfumaria e Cosmética': ('store', 'beauty'),
    'Acessórios de Moda e Bijuteria': ('store', 'fashion_accessories'),
    'Ourivesaria, Joalharia e Relojoaria': ('store', 'jewelry'),
    'Decoração, Casa e Bricolage': ('store', 'home'),
    'Casa e Decoração': ('store', 'home'),
    'Brinquedos, Prendas e Brindes': ('store', 'toys'),
    'Eletrodomésticos, Telecomunicações e Informática': ('store', 'electronics'),
    'Tecnologia e Telecomunicações': ('store', 'electronics'),
    'Livraria, Tabacaria e Papelaria': ('store', 'books'),
    'Desporto': ('store', 'sports'),
}

# OSM's own vocabulary, mapped to ours. Only the unambiguous ones: an OSM tag
# we cannot place is reported rather than forced.
OSM_TAG = {
    'bakery': ('bakery',), 'cafe': ('cafe',), 'restaurant': ('restaurant',),
    'fast_food': ('restaurant',), 'ice_cream': ('ice_cream',), 'bar': ('bar',),
    'pub': ('bar',), 'pharmacy': ('pharmacy',), 'chemist': ('store', 'drugstore'),
    'clothes': ('store', 'clothing'), 'shoes': ('store', 'shoes'),
    'jewelry': ('store', 'jewelry'), 'watches': ('store', 'watch'),
    'optician': ('store', 'eyewear_and_optician'), 'perfumery': ('store', 'beauty'),
    'cosmetics': ('store', 'beauty'), 'books': ('store', 'books'),
    'toys': ('store', 'toys'), 'electronics': ('store', 'electronics'),
    'mobile_phone': ('store', 'phone'), 'computer': ('store', 'electronics'),
    'sports': ('store', 'sports'), 'furniture': ('store', 'furniture'),
    'houseware': ('store', 'home'), 'hardware': ('store', 'hardware'),
    'doityourself': ('store', 'hardware'), 'florist': ('florist',),
    'pet': ('store', 'pet'), 'travel_agency': ('travel_agency',),
    'hairdresser': ('hairdresser',), 'beauty': ('beauty_salon',),
    'bank': ('bank',), 'supermarket': ('supermarket',),
    'newsagent': ('store', 'newspaper_and_magazines'),
    'tobacco': ('tobacco',), 'bag': ('store', 'handbag'),
    'gift': ('store', 'gift'), 'confectionery': ('bakery',),
    'variety_store': ('store', 'discount_store'), 'tea': ('tea',),
    'repair': ('phone_repair',), 'laundry': ('laundry',), 'car_repair': ('car_repair',),
}


def fold(value: str) -> str:
    value = ''.join(c for c in unicodedata.normalize('NFKD', value or '')
                    if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', ' ', value.lower()).strip()


def split_ruling(value):
    """A ruling is [poi_type] or [poi_type, store_kind], or several poi types
    for a unit that genuinely is more than one thing. Only a `store` carries a
    kind, so anything after a non-store primary is another type."""
    value = tuple(value)
    if value and value[0] == 'store' and len(value) == 2:
        return (value[:1], value[1])
    return (value, None)


def load_overrides(path=OVERRIDES_PATH):
    with open(path, encoding='utf-8') as handle:
        return {fold(k): split_ruling(v) for k, v in json.load(handle)['types'].items()}


def load_categories(centre_slug):
    """The operator's own category per tenant — a helper, never a source."""
    path = os.path.join(LISTS_DIR, f'{centre_slug}_operator_categories.tsv')
    out = {}
    if not os.path.exists(path):
        return out
    for line in open(path, encoding='utf-8'):
        if line.startswith('#') or line.startswith('name\t'):
            continue
        name, _, category = line.rstrip('\n').partition('\t')
        out[fold(name)] = category.strip()
    return out


def held_elsewhere(names, query):
    """{folded name: (types…)} for names we already hold in Portugal under
    exactly ONE set of types. A name held under several sets is left out — our
    own data disagreeing with itself is not evidence (KAN-480)."""
    keys = sorted({normalize_text(n) or n.strip().lower() for n in names})
    sets = defaultdict(set)
    for start in range(0, len(keys), D1_ID_BATCH):
        batch = keys[start:start + D1_ID_BATCH]
        rows = query(
            'SELECT p.dedupe_name AS dedupe_name, '
            "(SELECT GROUP_CONCAT(x.poi_type) FROM (SELECT poi_type FROM overture_poi_type "
            'WHERE overture_id = p.overture_id ORDER BY poi_type) x) AS ts, '
            "(SELECT GROUP_CONCAT(DISTINCT a.value) FROM overture_poi_attribute a "
            "WHERE a.overture_id = p.overture_id AND a.dimension = 'store_kind') AS kinds "
            'FROM overture_poi p WHERE p.retired_in_release IS NULL AND p.dedupe_name IN ('
            + ','.join(sql_escape(k) for k in batch) + ')')
        for row in rows:
            if row.get('ts'):
                sets[row['dedupe_name']].add((row['ts'], row.get('kinds') or ''))
    out = {}
    for key, found in sets.items():
        if len(found) != 1:
            continue                      # our own rows disagree; not evidence
        types, kinds = next(iter(found))
        # A store kind is NOT a poi type and the two must never share a tuple.
        # Appending `phone` to ('store',) and reading position 1 as the kind
        # works until the row has two real types, and then the second type is
        # written as a kind and the kind as a type — which put `poi_type=phone`
        # on four production rows (found in review, 2026-10-24).
        out[key] = (tuple(types.split(',')), kinds.split(',')[0] if kinds else None)
    return out


def osm_tags(names, fetch=None, pause=2.0):
    """{folded name: dominant OSM tag} for names across Portugal.

    Overpass enforces its usage policy by blocking, so this backs off and
    treats 429 as stop — never retry-harder (CLAUDE.md).
    """
    found = defaultdict(lambda: defaultdict(int))
    ordered = sorted(set(names))
    for start in range(0, len(ordered), 20):
        batch = ordered[start:start + 20]
        pattern = '^(' + '|'.join(re.escape(n) for n in batch) + ')$'
        query = (f'[out:json][timeout:120];area["ISO3166-1"="PT"]->.pt;'
                 f'nwr(area.pt)[name~"{pattern}",i]'
                 f'[~"^(shop|amenity|leisure|office|healthcare|tourism)$"~"."];out tags center 200;')
        payload = (fetch or _overpass)(query)
        for element in payload.get('elements', []):
            tags = element.get('tags', {})
            name = fold(tags.get('name', ''))
            tag = (tags.get('shop') or tags.get('amenity') or tags.get('leisure')
                   or tags.get('office') or tags.get('healthcare') or tags.get('tourism'))
            if name and tag:
                found[name][tag] += 1
        time.sleep(pause)
    dominant = {}
    for name, counts in found.items():
        ranked = sorted(counts.items(), key=lambda kv: -kv[1])
        # a clear winner only: a tie says OSM does not know either
        if len(ranked) == 1 or ranked[0][1] >= 2 * ranked[1][1]:
            dominant[name] = ranked[0][0]
    return dominant


def _overpass(query):
    request = urllib.request.Request(
        'https://overpass-api.de/api/interpreter',
        data=urllib.parse.urlencode({'data': query}).encode(),
        headers={'User-Agent': 'BrushAway/1.0 (KAN-439 mall tenant typing; '
                               'olegarioncnascimento@gmail.com)'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=150) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code == 429:
                raise SystemExit('Overpass 429 — stop, never retry harder')
            time.sleep(8 * (attempt + 1))
        except Exception:
            time.sleep(8 * (attempt + 1))
    raise SystemExit('Overpass unavailable after 3 attempts')


def resolve(tenants, overrides, held, osm, categories):
    """[(tenant, types, evidence)] plus the ones nothing could answer."""
    resolved, unresolved = [], []
    for name in tenants:
        key = fold(name)
        dedupe = normalize_text(name) or name.strip().lower()
        if key in overrides:
            resolved.append((name, overrides[key], 'ruled by a person'))
        elif dedupe in held:
            resolved.append((name, held[dedupe], 'held elsewhere in Portugal'))
        elif key in osm and osm[key] in OSM_TAG:
            resolved.append((name, split_ruling(OSM_TAG[osm[key]]), f'OSM {osm[key]}'))
        elif categories.get(key) in SINGLE_CATEGORY:
            resolved.append((name, split_ruling(SINGLE_CATEGORY[categories[key]]),
                             f'operator category: {categories[key]}'))
        else:
            unresolved.append((name, categories.get(key, '')))
    return resolved, unresolved


def write_table(centre_slug, resolved, unresolved):
    path = os.path.join(LISTS_DIR, f'{centre_slug}_types.tsv')
    with open(path, 'w', encoding='utf-8') as handle:
        handle.write('# KAN-439. Derived by resolve_mall_types.py — do not hand-edit.\n')
        handle.write('# A ruling belongs in tenant_type_overrides.json, which outranks\n')
        handle.write('# every other row of evidence here.\n')
        handle.write('name\tpoi_type\tstore_kind\textra_types\tevidence\n')
        for name, (types, kind), evidence in resolved:
            handle.write(f'{name}\t{types[0]}\t{kind or ""}\t'
                         f'{",".join(types[1:])}\t{evidence}\n')
    return path


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--list', required=True, help='mall_lists/<centre>.txt')
    parser.add_argument('--slug', required=True, help='name for the output table')
    parser.add_argument('--no-osm', action='store_true', help='skip the OSM pass')
    args = parser.parse_args(argv)

    from analyse_poi_candidates import query
    tenants = [name for name, _ in mall_tenants.read_tenant_list(args.list)]
    overrides = load_overrides()
    categories = load_categories(args.slug)

    held = held_elsewhere(tenants, query)
    missing = [n for n in tenants
               if fold(n) not in overrides
               and (normalize_text(n) or n.strip().lower()) not in held]
    osm = {} if args.no_osm else osm_tags([fold(n) for n in missing])

    resolved, unresolved = resolve(tenants, overrides, held, osm, categories)
    path = write_table(args.slug, resolved, unresolved)
    print(f'{len(tenants)} tenants -> {len(resolved)} typed, {len(unresolved)} unresolved')
    print(f'written: {path}')
    for name, category in unresolved:
        print(f'  UNRESOLVED  {name}  (operator: {category or "—"})')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
