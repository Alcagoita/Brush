"""
KAN-453 — preflight for KAN-433: inventory the Foursquare archive against the
served base. Measures, imports nothing.

For each candidate type it sorts the archive's rows into three buckets and
writes a report:

  matched   a served place (Overture promoted row, or an active curated_poi
            row) is the same place under the KAN-388 matcher —
            `name_similarity` + `single_identity_token_match` from
            supplement_osm_pois.py, inside its MATCH_RADIUS_METERS. Any
            served type counts: a Foursquare "viewpoint" whose Overture twin
            is filed as a park is still a duplicate.
  suspect   something about the row says "look before importing": no name
            signal, coordinates shared with another archive row, a
            same-name served place just outside the matcher's radius, a
            toponym for a name, a bank row that is really an ATM.
  unique    none of the above — no served counterpart, name carries signal.

What "typed" means here is exactly what classify_and_load.py means: the
row's Foursquare category ids against the PRIMARY `category_id` of each
entry in poiTypeCategories.json (`build_reverse_map`), then the bank/ATM and
financial-service name rules. The `also` ids that category_ids.py extracts
on are counted separately, because the classifier never reads them.

No D1 writes, no R2 writes. D1 reads are two bounded queries (active curated
rows of the candidate types; Foursquare-keyed poi_source_correction rows),
both skippable with --skip-d1. The archive is fetched from R2 once into the
work dir and never rewritten.

Deterministic: samples come from random.Random(--seed) over rows sorted by
id, so two runs on the same inputs produce the same report.
"""
from __future__ import annotations

import argparse
import csv
import datetime
import json
import math
import os
import random
import sys
from collections import Counter, defaultdict

EXTRACTION_DIR = os.path.dirname(os.path.abspath(__file__))
CLOUDFLARE_DIR = os.path.dirname(EXTRACTION_DIR)
REPO_ROOT = os.path.dirname(CLOUDFLARE_DIR)
sys.path.insert(0, EXTRACTION_DIR)

from classify_and_load import (  # noqa: E402
    build_reverse_map, financial_service_classification, find_brand, is_explicit_atm_name,
    load_brand_dictionary, load_financial_service_name_rules, load_mapping, normalize_text,
)
from enrich_osm_cuisine import MATCH_RADIUS_METERS, NAME_SIMILARITY_THRESHOLD, haversine_m  # noqa: E402
from match_residual_foursquare import distinctive_shared_word  # noqa: E402
from supplement_osm_pois import identity_tokens, name_similarity, names_match, run_d1_query  # noqa: E402

DEFAULT_ARCHIVE_KEY = 'country-sources-unfiltered/PT/4ac4b7ca-6e8d-4e49-92b1-28f3a15e10ca.csv'
DEFAULT_OVERTURE_KEY = 'overture-country-sources/PT/1ea48e22-9b0d-47a2-beb7-29f5203bc204.csv'
DEFAULT_WORK_DIR = os.path.join(REPO_ROOT, 'outputs', 'kan-453')

# KAN-433's list. `atm` is excluded outright — MULTIBANCO is the ATM source.
CANDIDATE_TYPES = (
    'viewpoint', 'tourist_attraction', 'hiking_area', 'plaza', 'botanical_garden',
    'bridge', 'marina', 'surf_spot', 'lighthouse', 'waterfall', 'hot_spring',
    'island', 'bank',
)
EXCLUDED_TYPES = frozenset({'atm'})

# Beyond the matcher's radius a same-name served place is not a match — the
# matcher was measured at 75 m and this report does not loosen it — but it
# is not nothing either: outdoor features are geocoded loosely, and a
# viewpoint 200 m from an Overture viewpoint of the same name is a question
# for a person. Same outer bound as match_residual_foursquare.FAR_M.
FAR_M = 400.0
# One grid cell of 0.005° is ~555 m, so the 3x3 neighbourhood always holds
# everything within FAR_M.
CELL = 0.005
# Two archive rows of one type this close with the same name are one place
# listed twice (the existing `same_location` boundary).
ARCHIVE_TWIN_M = 20.0

# Words that name the kind of place, not the place. A row whose name is
# only these — "Miradouro", "Ponte", "Farol" — carries no identity the
# matcher could use, so nothing could ever dedupe it: it is the row that
# imports as a duplicate of an unnamed neighbour. NON_IDENTITY_NAME_TOKENS
# is food-and-retail shaped; these are the landmark equivalents.
TYPE_GENERIC_WORDS = frozenset({
    'miradouro', 'miradouros', 'vista', 'scenic', 'lookout', 'viewpoint', 'mirador', 'aussichtspunkt',
    'aussicht', 'panorama', 'panoramica', 'panoramico', 'belvedere', 'view', 'point', 'ponto', 'zona',
    'ponte', 'pontes', 'bridge', 'viaduto', 'passadico', 'passadicos',
    'farol', 'farois', 'lighthouse', 'farolim',
    'praca', 'pracas', 'largo', 'plaza', 'square', 'rossio', 'terreiro', 'jardim', 'jardins',
    'garden', 'gardens', 'parque', 'park', 'botanico', 'botanical', 'jardim',
    'marina', 'marinas', 'porto', 'doca', 'docas', 'cais', 'harbor', 'harbour', 'pesca',
    'surf', 'spot', 'praia', 'praias', 'beach', 'onda', 'ondas',
    'cascata', 'cascatas', 'queda', 'waterfall', 'poco', 'ribeira',
    'termas', 'termal', 'termais', 'hot', 'spring', 'springs', 'piscina', 'piscinas', 'natural', 'naturais',
    'ilha', 'ilhas', 'island', 'ilheu', 'ilheus',
    'trilho', 'trilhos', 'trail', 'trails', 'levada', 'levadas', 'caminho', 'caminhos', 'percurso',
    'percursos', 'rota', 'hiking', 'pr', 'pedestre',
    'banco', 'bank', 'agencia', 'balcao', 'dependencia', 'sucursal', 'atm', 'multibanco', 'caixa',
    'atracao', 'attraction', 'turistica', 'tourist', 'monumento', 'castelo', 'mirante',
    'sao', 'santa', 'santo', 'nossa', 'senhora', 'senhor', 'da', 'de', 'do', 'das', 'dos', 'e', 'a', 'o',
    'municipal', 'novo', 'nova', 'velho', 'velha', 'grande', 'pequeno', 'pequena',
})

BUCKETS = ('matched', 'unique', 'suspect')

# A match only counts when the served row is the same *kind* of thing. The
# archive's "Miradouro da Bela Vista" and Overture's "Parque da Bela Vista"
# at 64 m are one place under two labels; "The Top" the viewpoint and "The
# TOP" the restaurant 14 m below it are two. Overture files most Portuguese
# viewpoints as historical_landmark or mountain, so the family is wide on
# purpose — but it stops at businesses. A same-name business is reported as
# suspect ("a venue named after the place?") rather than as a duplicate.
LANDMARK_FAMILY = frozenset({
    'viewpoint', 'tourist_attraction', 'hiking_area', 'plaza', 'botanical_garden', 'bridge', 'marina',
    'surf_spot', 'lighthouse', 'waterfall', 'hot_spring', 'island', 'historical_landmark', 'church',
    'mountain', 'park', 'beach', 'lake', 'river', 'nature_preserve', 'museum', 'cultural_center',
    'cemetery', 'amusement_park', 'zoo', 'campground', 'golf_course', 'spa', 'art_gallery', 'playground',
    'stadium', 'dam',
})
FINANCIAL_FAMILY = frozenset({'bank', 'atm', 'financial_service', 'currency_exchange', 'money_transfer', 'post'})


def same_family(archive_type, served_type):
    family = FINANCIAL_FAMILY if archive_type in FINANCIAL_FAMILY else LANDMARK_FAMILY
    return served_type in family


# Bank names that no longer trade in Portugal. brandDictionary.json already
# folds each into its successor (Banif → Santander, BES → Novo Banco …), so a
# row still carrying the old name is a listing nobody has touched since the
# takeover: the branch may be open under the new sign, moved, or closed. A
# person has to look; the importer must not take the name at face value.
DEFUNCT_BANK_NAMES = {
    'banif': 'Santander (2015)', 'bes': 'Novo Banco (2014)', 'banco espirito santo': 'Novo Banco (2014)',
    'bpn': 'ABANCA (2012)', 'finibanco': 'Montepio (2011)', 'barclays': 'Bankinter (2016)',
    'banco popular': 'Santander (2018)', 'deutsche bank': 'ABANCA (2018)',
}

_BRAND_DICTIONARY = None


def brand_of(name, poi_type):
    """The canonical brand classify_and_load would put on the row, if any.
    Loaded lazily so the tests that never touch a brand pay nothing."""
    global _BRAND_DICTIONARY
    if _BRAND_DICTIONARY is None:
        _BRAND_DICTIONARY = load_brand_dictionary()
    return find_brand(name, [poi_type], _BRAND_DICTIONARY)


def defunct_bank(dedupe_name):
    padded = f' {dedupe_name} '
    for old, successor in DEFUNCT_BANK_NAMES.items():
        if f' {old} ' in padded:
            return f'{old} → {successor}'
    return None


# ---------------------------------------------------------------------------- inputs

def fetch_if_missing(key, local_path):
    """The R2 object at `key`, downloaded once into the work dir."""
    if os.path.exists(local_path):
        return local_path
    from run_evidence_join import r2_get
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    return r2_get(key, local_path)


def type_mapping(candidate_types):
    """(primary id -> type, also id -> type) for the candidate types, plus
    the types classify_and_load would retype a bank row into."""
    mapping = load_mapping(os.path.join(CLOUDFLARE_DIR, 'src', 'poiTypeCategories.json'))
    primary = {cid: poi_type for cid, poi_type in build_reverse_map(mapping).items()}
    also = {}
    for poi_type, entry in mapping.items():
        for extra in entry.get('also', ()):
            if 'category_id' in extra:
                also.setdefault(extra['category_id'], poi_type)
    wanted = set(candidate_types)
    return ({cid: t for cid, t in primary.items() if t in wanted},
            {cid: t for cid, t in also.items() if t in wanted})


def classify_archive_row(row, primary, also, financial_rules):
    """(types classify_and_load would give, types only an `also` id gives, retyped_to).

    Mirrors classify_and_load.classify(): primary ids only, then the
    explicit-ATM and financial-service name rules that take a row out of
    `bank`. `retyped_to` names where a bank row went, so the report can say
    how many of the archive's "banks" the classifier itself calls ATMs.
    """
    cat_ids = [c for c in (row.get('category_ids') or '').split('|') if c]
    types = {primary[cid] for cid in cat_ids if cid in primary}
    also_only = {also[cid] for cid in cat_ids if cid in also} - types
    retyped_to = None
    if 'bank' in types:
        if is_explicit_atm_name(row['name'], financial_rules):
            types.discard('bank')
            retyped_to = 'atm'
        else:
            service_type, _ = financial_service_classification(row['name'], cat_ids, financial_rules)
            if service_type:
                types.discard('bank')
                retyped_to = service_type
    return types, also_only, retyped_to


def load_archive(path, primary, also, financial_rules, candidate_types):
    """Archive rows of the candidate types, plus the counters the report needs."""
    wanted = set(candidate_types)
    rows_by_type = defaultdict(list)
    counters = Counter()
    also_only_counts = Counter()
    retyped = Counter()
    coordinate_owners = defaultdict(list)
    total = 0
    with open(path, newline='') as handle:
        for row in csv.DictReader(handle):
            total += 1
            types, also_only, retyped_to = classify_archive_row(row, primary, also, financial_rules)
            for poi_type in also_only:
                also_only_counts[poi_type] += 1
            if retyped_to:
                retyped[retyped_to] += 1
            hit = types & wanted
            if not hit:
                continue
            lat, lng = (row.get('latitude') or '').strip(), (row.get('longitude') or '').strip()
            record = {
                'fsq_place_id': row['fsq_place_id'],
                'name': row['name'].strip(),
                'dedupe_name': normalize_text(row['name']),
                'lat': float(lat) if lat else None,
                'lng': float(lng) if lng else None,
                'locality': (row.get('locality') or '').strip(),
                'label': (row.get('category_labels') or '').split('|')[0],
                'types': sorted(hit),
            }
            if record['lat'] is not None:
                coordinate_owners[(record['lat'], record['lng'])].append(record['fsq_place_id'])
            for poi_type in hit:
                rows_by_type[poi_type].append(record)
                counters[poi_type] += 1
    return rows_by_type, counters, also_only_counts, retyped, coordinate_owners, total


# ---------------------------------------------------------------------------- served base

def served_overture(overture_csv, overture_key):
    """Promoted Overture rows — the real promotion decision with the
    committed overrides, exactly as run_overture_country makes it — so
    'served' means what nearby can return, not every archive row."""
    import promote_overture_candidates as promote
    from analyse_poi_candidates import reachable_types
    mapping, reachable, brands = promote.category_map(), reachable_types(), promote.load_brand_dictionary()
    kinds, cuisines = promote.store_kind_alias_index(), promote.food_cuisine_alias_index()
    financial, store_brands = promote.load_financial_service_name_rules(), promote.store_brand_index()
    overrides_path = os.path.join(CLOUDFLARE_DIR, 'src', 'overtureCandidateOverrides.json')
    with open(overrides_path) as handle:
        source = json.load(handle).get(overture_key, {})
    overrides = {poi_id: entry for batch in source.values() for poi_id, entry in batch.items()}
    served = []
    stats = Counter()
    with open(overture_csv, newline='') as handle:
        for row in csv.DictReader(handle):
            status, types, _, _ = promote.decide(row, mapping, reachable, brands, kinds, cuisines,
                                                 financial, store_brands, overrides)
            stats[status] += 1
            if status != 'promoted' or not row.get('lat'):
                continue
            served.append({
                'source': 'overture', 'id': row['overture_id'], 'name': row['name'],
                'dedupe_name': normalize_text(row['name'] or ''),
                'lat': float(row['lat']), 'lng': float(row['lng']), 'type': types[0],
            })
    return served, stats


def served_curated(candidate_types):
    """Active curated rows of the candidate types — one bounded query."""
    quoted = ', '.join(f"'{t}'" for t in candidate_types)
    rows = run_d1_query(
        'SELECT poi_id, name, dedupe_name, lat, lng, primary_poi_type FROM curated_poi '
        f"WHERE status = 'active' AND primary_poi_type IN ({quoted})")
    return [{'source': 'curated', 'id': r['poi_id'], 'name': r['name'], 'dedupe_name': r['dedupe_name'],
             'lat': float(r['lat']), 'lng': float(r['lng']), 'type': r['primary_poi_type']} for r in rows]


def foursquare_corrections():
    """Every human decision recorded against a Foursquare id."""
    return run_d1_query(
        "SELECT source_id, visible, name_override, dedupe_name_override, review_note, created_at "
        "FROM poi_source_correction WHERE source = 'foursquare' ORDER BY created_at")


def grid_index(served):
    grid = defaultdict(list)
    for place in served:
        grid[(int(place['lat'] // CELL), int(place['lng'] // CELL))].append(place)
    return grid


def near(grid, lat, lng):
    cell_lat, cell_lng = int(lat // CELL), int(lng // CELL)
    for dlat in (-1, 0, 1):
        for dlng in (-1, 0, 1):
            yield from grid.get((cell_lat + dlat, cell_lng + dlng), ())


# ---------------------------------------------------------------------------- classification

def has_name_signal(dedupe_name):
    """Whether anything is left of the name once the words that only say
    what kind of place it is are removed."""
    tokens = identity_tokens(dedupe_name)
    return any(token not in TYPE_GENERIC_WORDS for token in tokens)


def toponym_only(dedupe_name, locality):
    """The name is the town and nothing else: "Odivelas" filed as a plaza
    names nothing. "Marina de Vilamoura" or "Farol de Lagos" is a real
    name — there is one marina in Vilamoura, and the type word plus the
    town is exactly how Portuguese names it — so a type word rescues it."""
    words = set(dedupe_name.split()) - {'da', 'de', 'do', 'das', 'dos', 'e', 'a', 'o'}
    place = set(normalize_text(locality or '').split())
    return bool(words) and words <= place


def names_its_town(dedupe_name, locality):
    """A type word plus the locality ("Cais do Pinhão") carries signal: it
    is the one such place in that town, which is what dedupe needs."""
    place = set(normalize_text(locality or '').split())
    return bool(set(dedupe_name.split()) & place)


def best_counterpart(record, poi_type, grid):
    """(place, distance, similarity, verdict) for the most telling served
    place near the row, or None.

    verdict is 'matched' (KAN-388 says same place, same family), 'business'
    (KAN-388 says same name, but the served row is a business, not a
    landmark) or 'far' (same name between the matcher radius and FAR_M).
    A 'matched' always outranks the other two.
    """
    rank = {'matched': 2, 'other_kind': 1, 'far': 0}
    best = None
    for place in near(grid, record['lat'], record['lng']):
        distance = haversine_m(record['lat'], record['lng'], place['lat'], place['lng'])
        if distance > FAR_M:
            continue
        similarity = name_similarity(record['dedupe_name'], place['dedupe_name'])
        if distance <= MATCH_RADIUS_METERS and names_match(record['dedupe_name'], place['dedupe_name'], distance):
            similarity = max(similarity, NAME_SIMILARITY_THRESHOLD)
            verdict = 'matched' if same_family(poi_type, place['type']) else 'other_kind'
        elif similarity >= NAME_SIMILARITY_THRESHOLD:
            verdict = 'far'
        else:
            continue
        # The matcher's verdict inside its radius is taken as it is. The two
        # weaker signals get KAN-444's toponym guard: "Barclays - Tomar" and
        # the "Tomar" fuel station 300 m away agree on the town alone, and
        # name_similarity's containment rule scores that 0.9.
        if verdict != 'matched' and not distinctive_shared_word(
                record['dedupe_name'], place['dedupe_name'], record['locality']):
            continue
        candidate = (place, distance, similarity, verdict)
        if best is None or (rank[verdict], similarity, -distance) > (rank[best[3]], best[2], -best[1]):
            best = candidate
    return best


def classify_record(record, poi_type, grid, coordinate_owners, twins):
    """(bucket, reason, counterpart) for one archive row of one type.

    A match is a match, whatever else is odd about the row: the row is
    already served and importing it would be a duplicate. Suspicion is
    only worth raising about rows that would otherwise be imported.
    """
    if record['lat'] is None:
        return 'suspect', 'no coordinates', None
    counterpart = best_counterpart(record, poi_type, grid)
    if counterpart and counterpart[3] == 'matched':
        place, distance, similarity, _ = counterpart
        return 'matched', f'KAN-388 match: {place["source"]} {place["type"]}', counterpart
    if not record['dedupe_name']:
        return 'suspect', 'empty name', counterpart
    # For a bank the brand IS the identity — "Novo Banco" is a full name, and
    # "Novo Banco, Almeirim" is not "the locality" — so the two name rules
    # below defer to the brand dictionary, exactly as classify_and_load does.
    brand = brand_of(record['name'], poi_type) if poi_type in FINANCIAL_FAMILY else None
    if not brand and toponym_only(record['dedupe_name'], record['locality']):
        return 'suspect', 'name is the locality', counterpart
    if not brand and not has_name_signal(record['dedupe_name']) \
            and not names_its_town(record['dedupe_name'], record['locality']):
        return 'suspect', 'no name signal (only type words)', counterpart
    defunct = defunct_bank(record['dedupe_name']) if poi_type in FINANCIAL_FAMILY else None
    if defunct:
        return 'suspect', f'defunct brand name: {defunct}', counterpart
    owners = coordinate_owners.get((record['lat'], record['lng']), ())
    if len(owners) > 1:
        return 'suspect', f'coordinates shared with {len(owners) - 1} other archive row(s)', counterpart
    if record['fsq_place_id'] in twins:
        return 'suspect', f'archive twin within {ARCHIVE_TWIN_M:.0f} m: {twins[record["fsq_place_id"]]}', counterpart
    if counterpart and counterpart[3] == 'other_kind':
        place, distance, similarity, _ = counterpart
        return 'suspect', f'same name as a served place of another kind: {place["source"]} {place["type"]} at {distance:.0f} m', counterpart
    if counterpart:
        place, distance, similarity, _ = counterpart
        return 'suspect', f'same name beyond the matcher radius: {place["source"]} {place["type"]} at {distance:.0f} m', counterpart
    return 'unique', 'no served counterpart within 400 m', None


def archive_twins(records):
    """fsq id -> the other archive row of this type it duplicates."""
    grid = defaultdict(list)
    for record in records:
        if record['lat'] is not None:
            grid[(int(record['lat'] // CELL), int(record['lng'] // CELL))].append(record)
    twins = {}
    for record in records:
        if record['lat'] is None or record['fsq_place_id'] in twins:
            continue
        for other in near(grid, record['lat'], record['lng']):
            if other['fsq_place_id'] <= record['fsq_place_id']:
                continue
            distance = haversine_m(record['lat'], record['lng'], other['lat'], other['lng'])
            if distance <= ARCHIVE_TWIN_M and names_match(record['dedupe_name'], other['dedupe_name'], distance):
                twins[other['fsq_place_id']] = record['fsq_place_id']
    return twins


def inventory(rows_by_type, grid, coordinate_owners, candidate_types):
    """{type: {bucket: [(record, reason, counterpart), ...]}}, rows in id order."""
    result = {}
    for poi_type in candidate_types:
        records = sorted(rows_by_type.get(poi_type, ()), key=lambda r: r['fsq_place_id'])
        twins = archive_twins(records)
        buckets = {bucket: [] for bucket in BUCKETS}
        for record in records:
            bucket, reason, counterpart = classify_record(record, poi_type, grid, coordinate_owners, twins)
            buckets[bucket].append((record, reason, counterpart))
        result[poi_type] = buckets
    return result


def sample(items, size, seed):
    picker = random.Random(seed)
    if len(items) <= size:
        return list(items)
    return sorted(picker.sample(items, size), key=lambda item: item[0]['fsq_place_id'])


# ---------------------------------------------------------------------------- report

def md_cell(value):
    return str(value if value is not None else '').replace('|', '\\|').replace('\n', ' ')


def sample_table(rows, with_counterpart):
    if not rows:
        return '_none_\n'
    if with_counterpart:
        lines = ['| fsq_place_id | archive name | served name | source / type | m | sim | note |',
                 '|---|---|---|---|---:|---:|---|']
        for record, reason, counterpart in rows:
            place, distance, similarity = (counterpart[0], counterpart[1], counterpart[2]) if counterpart else ({}, None, None)
            lines.append('| ' + ' | '.join(md_cell(v) for v in (
                record['fsq_place_id'], record['name'], place.get('name', ''),
                f"{place.get('source', '')} {place.get('type', '')}".strip(),
                f'{distance:.0f}' if distance is not None else '', f'{similarity:.2f}' if similarity is not None else '',
                reason)) + ' |')
    else:
        lines = ['| fsq_place_id | name | locality | Foursquare label | note |', '|---|---|---|---|---|']
        for record, reason, _ in rows:
            lines.append('| ' + ' | '.join(md_cell(v) for v in (
                record['fsq_place_id'], record['name'], record['locality'], record['label'], reason)) + ' |')
    return '\n'.join(lines) + '\n'


def render(context):
    c = context
    out = []
    out.append(f"# KAN-453 — Foursquare archive preflight, {c['country']}\n")
    out.append(f"Generated {c['generated_at']} by `cloudflare/extraction/preflight_foursquare_archive.py`. "
               "Measurement only: nothing was written to D1 or R2.\n")
    out.append('## Inputs\n')
    out.append(f"- Foursquare archive: `{c['archive_key']}` — {c['archive_total']:,} rows (sha256 `{c['archive_sha256']}`).")
    out.append(f"- Overture base: `{c['overture_key']}` — {c['overture_stats'].get('promoted', 0):,} promoted of "
               f"{sum(c['overture_stats'].values()):,} rows under the committed overrides "
               f"({', '.join(f'{k} {v:,}' for k, v in sorted(c['overture_stats'].items()))}).")
    out.append(f"- Curated rows of the candidate types (active): {c['curated_count']:,}"
               + ('' if c['d1'] else ' — **D1 not read (`--skip-d1`)**') + '.')
    out.append('- MULTIBANCO: not read. `atm` is excluded from recovery, so no archive row is compared against it.')
    out.append(f"- Matcher: `supplement_osm_pois.names_match` (name_similarity ≥ {NAME_SIMILARITY_THRESHOLD} within "
               f"{MATCH_RADIUS_METERS} m, or a single shared identity token within 20 m). Same-name served places "
               f"between {MATCH_RADIUS_METERS} m and {FAR_M:.0f} m are reported as suspect, never as matched.\n")
    out.append('## Mapping used\n')
    out.append('An archive row is typed the way `classify_and_load.py` types it: its Foursquare category ids against the '
               '**primary** `category_id` of each `poiTypeCategories.json` entry (`build_reverse_map`), then the explicit-ATM '
               'and financial-service name rules that move a row out of `bank`. Category `also` ids are what '
               '`category_ids.py` extracts on but the classifier never reads; they are counted here and not typed.\n')
    out.append('| type | primary Foursquare leaf | rows typed by primary id | rows carrying only an `also` id |')
    out.append('|---|---|---:|---:|')
    for poi_type in c['candidate_types']:
        out.append(f"| `{poi_type}` | {c['leaf_names'].get(poi_type, '')} | {c['counters'].get(poi_type, 0):,} | "
                   f"{c['also_only'].get(poi_type, 0):,} |")
    out.append('')
    if c['retyped']:
        out.append('Bank rows the classifier itself moves elsewhere (not counted as `bank` above): '
                   + ', '.join(f'`{k}` {v:,}' for k, v in sorted(c['retyped'].items())) + '.\n')
    out.append('## Per type\n')
    out.append('"served today" is what the base holds under this type name (Overture promoted + active curated); '
               'a match may land on another type in the same family, so it is context, not a denominator.\n')
    out.append('| type | served today | archive rows | matched | unique | suspect | matched % |')
    out.append('|---|---:|---:|---:|---:|---:|---:|')
    for poi_type in c['candidate_types']:
        buckets = c['inventory'][poi_type]
        total = sum(len(v) for v in buckets.values())
        pct = f"{100 * len(buckets['matched']) / total:.0f}%" if total else '—'
        out.append(f"| `{poi_type}` | {c['served_counts'].get(poi_type, 0):,} | {total:,} | {len(buckets['matched']):,} | "
                   f"{len(buckets['unique']):,} | {len(buckets['suspect']):,} | {pct} |")
    out.append('')
    for poi_type in c['candidate_types']:
        buckets = c['inventory'][poi_type]
        total = sum(len(v) for v in buckets.values())
        out.append(f"### `{poi_type}` — {total:,} rows\n")
        matched_by = Counter(f"{cp[0]['source']} {cp[0]['type']}" for _, _, cp in buckets['matched'])
        if matched_by:
            out.append('Matched against: ' + ', '.join(f'{k} {v:,}' for k, v in matched_by.most_common()) + '.\n')
        suspect_by = Counter(reason.split(':')[0].split(' (')[0] for _, reason, _ in buckets['suspect'])
        if suspect_by:
            out.append('Suspect because: ' + ', '.join(f'{k} {v:,}' for k, v in suspect_by.most_common()) + '.\n')
        for prefix, label in (('same name beyond', 'Same name beyond the matcher radius, by served type'),
                              ('same name as a served place of another kind', 'Same name as a served place of another kind, by served type')):
            by_type = Counter(f"{cp[0]['source']} {cp[0]['type']}" for _, reason, cp in buckets['suspect']
                              if reason.startswith(prefix))
            if by_type:
                out.append(f'{label}: ' + ', '.join(f'{k} {v:,}' for k, v in by_type.most_common()) + '.\n')
        out.append(f"#### Already served (matched) — sample of {min(c['sample_size'], len(buckets['matched']))} of {len(buckets['matched']):,}\n")
        out.append(sample_table(c['samples'][poi_type]['matched'], True))
        out.append(f"#### Unique — sample of {min(c['sample_size'], len(buckets['unique']))} of {len(buckets['unique']):,}\n")
        out.append(sample_table(c['samples'][poi_type]['unique'], False))
        out.append(f"#### Suspect — sample of {min(c['sample_size'], len(buckets['suspect']))} of {len(buckets['suspect']):,}\n")
        out.append(sample_table(c['samples'][poi_type]['suspect'], True))
    out.append('## `poi_source_correction` rows keyed on Foursquare ids\n')
    if not c['d1']:
        out.append('_D1 not read (`--skip-d1`)._\n')
    elif not c['corrections']:
        out.append('_None._\n')
    else:
        out.append('| fsq_place_id | visible | name_override | review_note | in archive as | bucket | what KAN-433 would need |')
        out.append('|---|---:|---|---|---|---|---|')
        for row in c['corrections']:
            out.append('| ' + ' | '.join(md_cell(v) for v in (
                row['source_id'], row['visible'], row.get('name_override'), row.get('review_note'),
                row['archive_types'], row['bucket'], row['needs'])) + ' |')
        out.append('')
    if c['notes']:
        out.append(c['notes'].rstrip() + '\n')
    return '\n'.join(out)


def correction_needs(row, records_by_id, inventory_by_id):
    """What KAN-433 has to do with one Foursquare-keyed correction."""
    record = records_by_id.get(row['source_id'])
    if not record:
        return 'not a candidate-type row', '—', 'nothing — the row is outside the recovery scope; the correction stays as the record of a past decision'
    types = ', '.join(record['types'])
    bucket = inventory_by_id.get(row['source_id'], '—')
    if int(row['visible']) == 0:
        return types, bucket, 'retire: keep this id on the importer skip-list so a hidden place is never recovered'
    if row.get('name_override'):
        return types, bucket, 're-point: the curated row must be created with name_override as its name (origin_id = this fsq id)'
    return types, bucket, 'review: visible with no override — carry the note onto the curated row or retire'


def sha256_of(path):
    from run_evidence_join import sha256_of as digest
    return digest(path)


def run(args):
    candidate_types = [t.strip() for t in args.types.split(',') if t.strip()]
    excluded = [t for t in candidate_types if t in EXCLUDED_TYPES]
    if excluded:
        raise SystemExit(f"{', '.join(excluded)} is excluded from recovery (MULTIBANCO is the ATM source)")
    work_dir = args.work_dir
    archive_csv = args.archive_csv or fetch_if_missing(args.archive_key, os.path.join(work_dir, 'foursquare.csv'))
    overture_csv = args.overture_csv or fetch_if_missing(args.overture_key, os.path.join(work_dir, 'overture.csv'))

    primary, also = type_mapping(candidate_types)
    financial_rules = load_financial_service_name_rules()
    mapping = load_mapping(os.path.join(CLOUDFLARE_DIR, 'src', 'poiTypeCategories.json'))
    leaf_names = {t: mapping[t].get('category_name', '') for t in candidate_types if t in mapping}

    print(f'[preflight] reading archive {archive_csv}', file=sys.stderr)
    rows_by_type, counters, also_only, retyped, coordinate_owners, archive_total = load_archive(
        archive_csv, primary, also, financial_rules, candidate_types)
    print(f'[preflight] deciding Overture base {overture_csv}', file=sys.stderr)
    served, overture_stats = served_overture(overture_csv, args.overture_key)
    curated = [] if args.skip_d1 else served_curated(candidate_types)
    corrections = [] if args.skip_d1 else foursquare_corrections()
    grid = grid_index(served + curated)
    served_counts = Counter(place['type'] for place in served + curated)

    print('[preflight] classifying', file=sys.stderr)
    result = inventory(rows_by_type, grid, coordinate_owners, candidate_types)
    samples = {poi_type: {bucket: sample(result[poi_type][bucket], args.sample_size, args.seed)
                          for bucket in BUCKETS} for poi_type in candidate_types}

    records_by_id = {r['fsq_place_id']: r for rows in rows_by_type.values() for r in rows}
    inventory_by_id = {record['fsq_place_id']: bucket for poi_type in candidate_types
                       for bucket in BUCKETS for record, _, _ in result[poi_type][bucket]}
    for row in corrections:
        row['archive_types'], row['bucket'], row['needs'] = correction_needs(row, records_by_id, inventory_by_id)

    notes = ''
    if args.notes:
        with open(args.notes) as handle:
            notes = handle.read()
    context = {
        'country': args.country, 'generated_at': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'),
        'archive_key': args.archive_key, 'archive_total': archive_total, 'archive_sha256': sha256_of(archive_csv),
        'overture_key': args.overture_key, 'overture_stats': overture_stats,
        'curated_count': len(curated), 'd1': not args.skip_d1, 'candidate_types': candidate_types,
        'leaf_names': leaf_names, 'counters': counters, 'also_only': also_only, 'retyped': retyped,
        'inventory': result, 'samples': samples, 'sample_size': args.sample_size, 'served_counts': served_counts,
        'corrections': corrections, 'notes': notes,
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.report_out)), exist_ok=True)
    with open(args.report_out, 'w') as handle:
        handle.write(render(context))
    summary = {
        'archive_key': args.archive_key, 'archive_rows': archive_total, 'archive_sha256': context['archive_sha256'],
        'overture_key': args.overture_key, 'overture_promoted': overture_stats.get('promoted', 0),
        'curated_rows': len(curated), 'd1_read': not args.skip_d1,
        'types': {poi_type: {bucket: len(result[poi_type][bucket]) for bucket in BUCKETS}
                  | {'also_only': also_only.get(poi_type, 0), 'served_today': served_counts.get(poi_type, 0)}
                  for poi_type in candidate_types},
        'bank_retyped': dict(retyped), 'foursquare_corrections': len(corrections),
    }
    with open(os.path.splitext(args.report_out)[0] + '.json', 'w') as handle:
        json.dump(summary, handle, indent=2, sort_keys=True)
        handle.write('\n')
    print(json.dumps(summary['types'], indent=2), file=sys.stderr)
    return summary


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--archive-key', default=DEFAULT_ARCHIVE_KEY)
    parser.add_argument('--overture-key', default=DEFAULT_OVERTURE_KEY)
    parser.add_argument('--archive-csv', help='local copy of the archive (skips the R2 fetch)')
    parser.add_argument('--overture-csv', help='local copy of the Overture country CSV (skips the R2 fetch)')
    parser.add_argument('--work-dir', default=DEFAULT_WORK_DIR, help='where R2 objects are downloaded; never committed')
    parser.add_argument('--report-out', required=True)
    parser.add_argument('--types', default=','.join(CANDIDATE_TYPES))
    parser.add_argument('--country', default='PT')
    parser.add_argument('--sample-size', type=int, default=30)
    parser.add_argument('--seed', type=int, default=453)
    parser.add_argument('--skip-d1', action='store_true', help='do not read curated_poi / poi_source_correction')
    parser.add_argument('--notes', help='markdown appended to the report (the recommendations)')
    run(parser.parse_args(argv))


if __name__ == '__main__':
    main()
