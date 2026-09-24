"""
KAN-433 — recover the tourism leaves of the Foursquare archive as curated
rows. Tier 1 only; dry-run by default.

The rule (CLAUDE.md, "Registry sources — one rule"): Overture is the base,
and every served place that is not Overture is a curated record of ours.
So every row this script writes is a `curated_poi` row —
`source = 'community'`, `origin_source = 'foursquare_os_places'`,
`origin_id = fsq_place_id`, `origin_licence = 'Apache-2.0'` — never a
`legacy_poi` or `osm_poi` row keyed on a Foursquare id.

What it does, in order:

  1. Reads the archive by Foursquare leaf, exactly as the KAN-453 preflight
     does (`preflight_foursquare_archive.load_archive_by_leaf`), and maps
     each leaf to our type(s) through `docs/kan-433/leaf-type-map.json` —
     the owner's table as data, not code. A row with several mapped leaves
     gets the union of their types. Tier 2, noise, parent and excluded
     leaves are counted and never imported; an in-scope leaf the map does
     not know is reported as unmapped and imports nothing.
  2. Matches every mapped row, type-blind, against everything served —
     Overture promoted rows, active curated rows, MULTIBANCO — with the
     preflight's `best_counterpart`, i.e. the KAN-388 matcher and nothing
     else. The dedupe contract (owner, 2026-09-18) is binding:
       * duplicate = name match AND within the matcher radius. Distance
         alone never removes: different names at the same point are
         different places and are all imported.
       * same name 75–400 m from a served row (the preflight's "same name
         beyond the matcher radius") is a likely stale coordinate: skipped.
       * inside the batch the same rule applies — two archive rows with
         matching names within the radius are one place; the lower fsq id
         is kept, the other is logged, and its types are folded into the
         kept row.
  3. Dry run (default): writes `<report-out>.md` and `<report-out>.jsonl`
     — every row it would insert and every row it skipped, with the
     reason — plus the SQL statement count and byte size. Nothing touches
     D1 beyond the bounded reads.
  4. `--emit`: refused unless `--i-have-applied-0042` is also given AND the
     live `curated_poi` carries all five provenance columns AND the
     `idx_curated_poi_origin` unique index (two bounded reads: `PRAGMA
     table_info`, `sqlite_master`). Then one D1 request per bounded statement
     (`load_overture_candidates.batched` shape, MAX_STATEMENT_BYTES), never
     a batch; transient failures retried three times; 429 is stop. The
     statements are `INSERT … ON CONFLICT (origin_source, origin_id) DO
     NOTHING`, so a second run inserts nothing — the unique index from
     migration 0042 is the guarantee. Nothing is ever updated or deleted.

Deterministic: rows are processed in fsq id order; samples come from
random.Random(--seed). Two runs on the same inputs produce the same
report (bar the generated-at line).
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import random
import sys
from collections import Counter, OrderedDict, defaultdict

EXTRACTION_DIR = os.path.dirname(os.path.abspath(__file__))
CLOUDFLARE_DIR = os.path.dirname(EXTRACTION_DIR)
REPO_ROOT = os.path.dirname(CLOUDFLARE_DIR)
sys.path.insert(0, EXTRACTION_DIR)

import preflight_foursquare_archive as preflight  # noqa: E402
from classify_and_load import MAX_STATEMENT_BYTES, byte_len, encode_geohash, normalize_text, sql_escape  # noqa: E402
from enrich_osm_cuisine import MATCH_RADIUS_METERS, haversine_m  # noqa: E402
from supplement_osm_pois import identity_tokens, name_similarity, names_match  # noqa: E402

DEFAULT_LEAF_MAP = os.path.join(REPO_ROOT, 'docs', 'kan-433', 'leaf-type-map.json')
DEFAULT_WORK_DIR = os.path.join(REPO_ROOT, 'outputs', 'kan-433')

ORIGIN_SOURCE = 'foursquare_os_places'
ORIGIN_LICENCE = 'Apache-2.0'
ACTOR = 'kan-433'
POI_ID_PREFIX = 'fsq:'
# The second type of a two-type row. curated_poi has one primary_poi_type
# and no curated_poi_type table (see the runbook); the extra type is kept
# as an attribute so nothing is lost and the Worker can start reading it.
EXTRA_TYPE_DIMENSION = 'poi_type'
GEOHASH_PRECISION = 7  # what the Worker writes for a moderator-approved row

CURATED_COLUMNS = (
    'poi_id', 'source', 'name', 'name_local', 'name_local_lang', 'dedupe_name', 'lat', 'lng', 'geohash', 'primary_poi_type', 'address',
    'status', 'created_at', 'created_by', 'updated_at', 'updated_by',
    'origin_source', 'origin_id', 'origin_licence', 'imported_at', 'import_run_id',
)
CURATED_INSERT_PREFIX = f'INSERT INTO curated_poi ({", ".join(CURATED_COLUMNS)}) VALUES\n'
# The conflict target names 0042's partial unique index — SQLite requires
# the WHERE to match the index's own — so the idempotency guarantee is the
# index, not this script. The poi_id clause is belt and braces: the id is
# derived from origin_id, so both fire on the same re-run.
CURATED_INSERT_SUFFIX = (
    '\nON CONFLICT (origin_source, origin_id) WHERE origin_source IS NOT NULL AND origin_id IS NOT NULL DO NOTHING'
    '\nON CONFLICT (poi_id) DO NOTHING;\n'
)
ATTRIBUTE_INSERT_PREFIX = 'INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES\n'
ATTRIBUTE_INSERT_SUFFIX = ';\n'
MAX_VALUES_TERMS = 500
D1_ID_BATCH = 150
# The two hand-check samples the owner reads before merge: pairs the
# translation step matched, and look-list rows it left to import.
HAND_CHECK_ROWS = 50

SKIP_ORDER = (
    'excluded leaf', 'noise leaf', 'parent-only leaf', 'tier 2 leaf', 'unmapped leaf',
    'no coordinates', 'empty name', 'hidden by poi_source_correction',
    'matched', 'matched (translated)', 'weak name', 'suspect', 'in-batch duplicate',
)


# ---------------------------------------------------------------------------- leaf map

class LeafMap:
    """The owner's leaf → type table, from JSON."""

    def __init__(self, data):
        self.tier1 = OrderedDict((leaf, list(types)) for leaf, types in data['tier1'].items())
        self.suffix = OrderedDict((suffix, list(types)) for suffix, types in data.get('suffix', {}).items())
        self.tier2 = frozenset(data.get('tier2', ()))
        self.noise = frozenset(data.get('noise', ()))
        self.parent = frozenset(data.get('parent', ()))
        self.excluded = dict(data.get('excluded', {}))

    @classmethod
    def load(cls, path=DEFAULT_LEAF_MAP):
        with open(path) as handle:
            return cls(json.load(handle))

    def emitted_types(self):
        out = []
        for types in list(self.tier1.values()) + list(self.suffix.values()):
            for poi_type in types:
                if poi_type not in out:
                    out.append(poi_type)
        return out

    def rule_for(self, leaf, path):
        """(rule index, types) for one (leaf, full path), or None. The index
        is the rule's position in the map, so a row with several mapped
        leaves takes its primary from the rule the owner listed first."""
        for index, (key, types) in enumerate(self.tier1.items()):
            if ' > ' in key:
                if path.endswith(key):
                    return index, list(types)
            elif key == leaf:
                return index, list(types)
        for index, (suffix, types) in enumerate(self.suffix.items(), len(self.tier1)):
            if leaf.endswith(suffix) and leaf != suffix.strip():
                return index, list(types)
        return None

    def types_for(self, leaf, path):
        """Our types for one (leaf, full path), primary first, or None."""
        rule = self.rule_for(leaf, path)
        return rule[1] if rule else None

    def classify_leaf(self, leaf, path):
        """('tier1', [types]) | ('tier2'|'noise'|'parent'|'excluded'|'unmapped', None)."""
        if leaf in self.excluded:
            return 'excluded', None
        types = self.types_for(leaf, path)
        if types:
            return 'tier1', types
        if leaf in self.tier2:
            return 'tier2', None
        if leaf in self.noise:
            return 'noise', None
        if leaf in self.parent:
            return 'parent', None
        return 'unmapped', None


def check_types_reachable(leaf_map):
    """Every type the map emits must be a catalogue type and reachable
    under the committed type_relation (BRUSH_TYPE_RELATION=sql)."""
    from analyse_poi_candidates import reachable_types
    reachable = reachable_types()
    missing = [t for t in leaf_map.emitted_types() if reachable.get(t) != t]
    if missing:
        raise SystemExit(f'leaf map emits types that are not catalogue types reachable as themselves: {missing}')


def map_row_types(record, leaf_map, paths_by_id):
    """(decision, types, leaf_kinds) for one archive record.

    decision is 'import' with the union of the mapped leaves' types (the
    first mapped leaf, in map order, gives the primary), or the skip reason
    when no leaf on the row maps. leaf_kinds is {leaf: kind} for the report.
    """
    kinds = {}
    mapped = []
    for leaf, path in paths_by_id:
        kind, _ = leaf_map.classify_leaf(leaf, path)
        kinds[leaf] = kind
        if kind == 'tier1':
            mapped.append(leaf_map.rule_for(leaf, path))
    types = []
    for _, leaf_types in sorted(mapped, key=lambda rule: rule[0]):
        for poi_type in leaf_types:
            if poi_type not in types:
                types.append(poi_type)
    if types:
        return 'import', types, kinds
    for kind, reason in (('tier2', 'tier 2 leaf'), ('unmapped', 'unmapped leaf'), ('parent', 'parent-only leaf'),
                         ('noise', 'noise leaf'), ('excluded', 'excluded leaf')):
        if kind in kinds.values():
            return reason, [], kinds
    return 'unmapped leaf', [], kinds


# ---------------------------------------------------------------------------- archive

def load_archive(archive_csv):
    """Distinct in-scope records in fsq id order, plus {fsq id: [(leaf, path)]}."""
    import csv
    records = {}
    paths_by_id = defaultdict(list)
    total = 0
    with open(archive_csv, newline='') as handle:
        for row in csv.DictReader(handle):
            total += 1
            leaves = preflight.leaf_paths(row)
            if not leaves:
                continue
            fsq_id = row['fsq_place_id']
            lat, lng = preflight.archive_coordinates(row)
            records[fsq_id] = {
                'fsq_place_id': fsq_id, 'name': row['name'].strip(), 'dedupe_name': normalize_text(row['name']),
                'lat': lat, 'lng': lng, 'address': (row.get('address') or '').strip(),
                'locality': (row.get('locality') or '').strip(),
                'label': (row.get('category_labels') or '').split('|')[0],
                'leaves': sorted({leaf for leaf, _ in leaves}),
            }
            for leaf, path in leaves:
                if (leaf, path) not in paths_by_id[fsq_id]:
                    paths_by_id[fsq_id].append((leaf, path))
    ordered = [records[k] for k in sorted(records)]
    return ordered, paths_by_id, total


# ---------------------------------------------------------------------------- served base

def in_batches(items, size=D1_ID_BATCH):
    items = list(items)
    for start in range(0, len(items), size):
        yield items[start:start + size]


def served_multibanco_for(records, d1_read=None):
    """MULTIBANCO rows that could match a candidate by name, bounded.

    The table is ~10k rows nationwide and reading it whole is a
    countrywide scan. It carries a handful of distinct dedupe_names (every
    row is an ATM named for its operator), so: one GROUP BY read of the
    names, a local check of which candidate names the KAN-388 matcher could
    ever pair with one of them, then the rows for exactly those names in
    ≤150-name IN lists. Usually nothing qualifies and no row is fetched.
    """
    d1_read = d1_read or preflight.d1_read
    names = [r['dedupe_name'] for r in d1_read('SELECT dedupe_name FROM multibanco_poi GROUP BY dedupe_name')]
    wanted = set()
    for record in records:
        for name in names:
            if could_match_by_name(record['dedupe_name'], name):
                wanted.add(name)
    served = []
    for batch in in_batches(sorted(wanted)):
        quoted = ', '.join(sql_escape(name) for name in batch)
        rows = d1_read('SELECT source_id, name, dedupe_name, lat, lng, primary_poi_type FROM multibanco_poi '
                       f'WHERE dedupe_name IN ({quoted})')
        served.extend({'source': 'multibanco', 'id': r['source_id'], 'name': r['name'], 'dedupe_name': r['dedupe_name'],
                       'lat': float(r['lat']), 'lng': float(r['lng']), 'type': r['primary_poi_type']} for r in rows)
    return served, len(names)


def could_match_by_name(a, b):
    """Whether names_match could ever say yes for these two names at any
    distance — the name half of the KAN-388 matcher, distance-free."""
    if not a or not b:
        return False
    if name_similarity(a, b) >= preflight.NAME_SIMILARITY_THRESHOLD:
        return True
    return bool(set(identity_tokens(a)) & set(identity_tokens(b)))


def foursquare_corrections(d1_read=None):
    """{fsq id: row} for every poi_source_correction keyed on a Foursquare id."""
    d1_read = d1_read or preflight.d1_read
    rows = d1_read("SELECT source_id, visible, name_override, review_note FROM poi_source_correction WHERE source = 'foursquare'")
    return {row['source_id']: row for row in rows}


# ---------------------------------------------------------------------------- decisions

def name_quality(record):
    """The preflight's name-quality flags, or None. Kept as skips, reported
    separately: a row named only 'Castelo' or named for its town carries
    nothing the matcher could ever dedupe against, so it is the row that
    imports as a duplicate of an unnamed neighbour."""
    if preflight.toponym_only(record['dedupe_name'], record['locality']):
        return 'locality only'
    if not preflight.has_name_signal(record['dedupe_name']) and not preflight.names_its_town(record['dedupe_name'], record['locality']):
        return 'type words only'
    return None


# ---------------------------------------------------------------------------- translation-aware equality (owner, 2026-09-19)
#
# Overture files Portugal's big landmarks under English names ("Jerónimos
# Monastery", "Guimarães Castle"); the archive has them in Portuguese. The
# KAN-388 matcher compares surface strings and cannot pair them, so both
# would be served. This step maps each token through a per-language table
# of landmark words (docs/kan-433/landmark-terms.json, canonical English),
# drops the function words on both sides, and then asks the SAME matcher
# whether the translated names match. It applies only to landmark/tourism
# rows against a served landmark, and only within the coordinate-twin
# radius: translation must never widen the 75 m rule for untranslated names.

DEFAULT_LANDMARK_TERMS = os.path.join(REPO_ROOT, 'docs', 'kan-433', 'landmark-terms.json')
TRANSLATED_MATCH_M = preflight.COORDINATE_TWIN_M  # 25 m
# Function words the matcher does not already drop, plus their English forms.
TRANSLATION_STOP_WORDS = frozenset({'de', 'da', 'do', 'dos', 'das', 'of', 'the', 'e', 'a', 'o', 'and', 'em', 'no', 'na', 'nos', 'nas'})
# Rows the translation step applies to: landmarks, places of worship,
# museums, nature — never a business. A restaurant named "Castelo" is not a
# castle. `spa` is in the preflight's family for hot springs; dropped here.
TRANSLATED_TYPES = (preflight.LANDMARK_FAMILY | {'mosque', 'synagogue'}) - {'spa'}


class LandmarkTerms:
    """The per-language tables, accent-insensitive on both sides."""

    def __init__(self, data):
        self.countries = {code.upper(): lang for code, lang in data.get('countries', {}).items()}
        self.tables = {}
        for lang, table in data.items():
            if lang in ('_comment', 'countries'):
                continue
            self.tables[lang] = {normalize_text(k): normalize_text(v) for k, v in table.items()}

    @classmethod
    def load(cls, path=DEFAULT_LANDMARK_TERMS):
        with open(path) as handle:
            return cls(json.load(handle))

    def table_for(self, country):
        """The country's table merged over the English variants, or None
        when the country has no table (then the step is a no-op)."""
        lang = self.countries.get((country or '').upper())
        if not lang or lang not in self.tables:
            return None
        return {**self.tables.get('en', {}), **self.tables[lang]}

    def translate(self, dedupe_name, table):
        """Tokens mapped to canonical English, stop-words dropped, sorted so
        word order carries no weight ("mosteiro dos jeronimos" and
        "jeronimos monastery" become the same string)."""
        tokens = [table.get(token, token) for token in dedupe_name.split()]
        return ' '.join(sorted(token for token in tokens if token not in TRANSLATION_STOP_WORDS))


def translated_names_match(left, right, distance, table, terms):
    """The KAN-388 name verdict on the translated names, inside
    TRANSLATED_MATCH_M — its strong rungs only: equal, containment, or the
    same identity terms (`name_similarity` ≥ SAME_NAME_SIMILARITY).

    Not the SequenceMatcher rung and not the single-token rule. Translation
    compresses a name to a few canonical words, and on those the fuzzy
    ratio pairs "church covo harbor" with "beach covinho harbor" (a church
    and a beach, 13 m apart) and "aveiro marina ria" with "aveiro canais";
    the hand-check of the first PT run found four such pairs in fifty. The
    single-token rule would pair anything on a shared canonical word
    ("church") — the words this step exists to translate."""
    if distance > TRANSLATED_MATCH_M or table is None:
        return False
    a, b = terms.translate(left, table), terms.translate(right, table)
    if not a or not b:
        return False
    return name_similarity(a, b) >= SAME_NAME_SIMILARITY


def translated_counterpart(record, grid, table, terms):
    """The nearest served landmark within TRANSLATED_MATCH_M whose translated
    name matches the row's, as (place, distance), or None. Landmark rows
    only, landmark counterparts only."""
    if table is None or not (set(record.get('types', ())) & TRANSLATED_TYPES):
        return None
    best = None
    for place in preflight.near(grid, record['lat'], record['lng']):
        if preflight.business_typed(place['type']) or place['type'] == 'spa':
            continue
        distance = haversine_m(record['lat'], record['lng'], place['lat'], place['lng'])
        if distance <= TRANSLATED_MATCH_M and translated_names_match(record['dedupe_name'], place['dedupe_name'], distance, table, terms):
            if best is None or distance < best[1]:
                best = (place, distance)
    return best


def source_name_counterpart(record, grid):
    """Match source-supplied aliases before consulting the translation table."""
    best = None
    for place in preflight.near(grid, record['lat'], record['lng']):
        distance = haversine_m(record['lat'], record['lng'], place['lat'], place['lng'])
        if distance > MATCH_RADIUS_METERS:
            continue
        for alias in (place.get('name_local'), place.get('name_en')):
            if alias and names_match(record['dedupe_name'], normalize_text(alias), distance):
                if best is None or distance < best[1]:
                    best = (place, distance)
                break
    return best


# "Same name" for the 75–400 m skip. name_similarity has three rungs: 1.0
# for equal names, 0.9 for containment ("Pico dos Barcelos" in "Miradouro
# do Pico dos Barcelos") or the same identity terms reordered, and below
# that a SequenceMatcher ratio against a 0.72 threshold. That last rung was
# measured at 75 m, where "Lagar" / "Lagar restaurante" is the same door;
# at 300 m it calls "Castelo de Guimarães" and "Liceu de Guimarães" one
# place and would have skipped the castle, and "Largo dos Jerónimos" the
# monastery. The contract says "same or near-same name", so the far skip
# takes the two strong rungs and leaves the fuzzy one to the matcher's own
# radius. The fuzzy-far count is still reported, as a look-list.
SAME_NAME_SIMILARITY = 0.9


def far_same_name(record, grid):
    """The nearest served row 75–400 m away with the same or near-same
    name, as (place, distance, similarity), or None. Also returns the
    fuzzy-only counterpart the preflight would have called suspect, for
    the report."""
    same, fuzzy = None, None
    for place in preflight.near(grid, record['lat'], record['lng']):
        distance = haversine_m(record['lat'], record['lng'], place['lat'], place['lng'])
        if not MATCH_RADIUS_METERS < distance <= preflight.FAR_M:
            continue
        similarity = name_similarity(record['dedupe_name'], place['dedupe_name'])
        if similarity >= SAME_NAME_SIMILARITY:
            if same is None or (similarity, -distance) > (same[2], -same[1]):
                same = (place, distance, similarity)
        elif similarity >= preflight.NAME_SIMILARITY_THRESHOLD and preflight.distinctive_shared_word(
                record['dedupe_name'], place['dedupe_name'], record['locality']):
            if fuzzy is None or (similarity, -distance) > (fuzzy[2], -fuzzy[1]):
                fuzzy = (place, distance, similarity)
    return same, fuzzy


def decide_against_served(record, grid, translation=None):
    """(decision, detail) for one row against the served base: 'import',
    'matched', 'matched (translated)', 'suspect', 'no coordinates',
    'empty name', 'weak name'. `translation` is (table, terms) for the
    country, or None to leave the translation step out.
    An import that the preflight would have called suspect on a fuzzy far
    name carries that counterpart in record['fuzzy_far'] for the report."""
    if record['lat'] is None:
        return 'no coordinates', ''
    if not record['dedupe_name']:
        return 'empty name', ''
    counterpart = preflight.best_counterpart(record, None, grid)
    if counterpart and counterpart[3] == 'matched':
        place, distance, similarity, _ = counterpart
        return 'matched', f'{place["source"]}:{place["id"]} "{place["name"]}" ({place["type"]}) at {distance:.0f} m, sim {similarity:.2f}'
    source_match = source_name_counterpart(record, grid)
    if source_match:
        place, distance = source_match
        return 'matched', f'{place["source"]}:{place["id"]} "{place["name"]}" ({place["type"]}) at {distance:.0f} m, source alias'
    if translation:
        translated = translated_counterpart(record, grid, *translation)
        if translated:
            place, distance = translated
            return 'matched (translated)', f'{place["source"]}:{place["id"]} "{place["name"]}" ({place["type"]}) at {distance:.0f} m'
    weak = name_quality(record)
    if weak:
        return 'weak name', weak
    same, fuzzy = far_same_name(record, grid)
    if same:
        place, distance, similarity = same
        return 'suspect', f'same name {distance:.0f} m from {place["source"]}:{place["id"]} "{place["name"]}" ({place["type"]})'
    if fuzzy:
        place, distance, similarity = fuzzy
        record['fuzzy_far'] = f'{place["source"]}:{place["id"]} "{place["name"]}" ({place["type"]}) at {distance:.0f} m, sim {similarity:.2f}'
    return 'import', ''


def dedupe_within_batch(candidates):
    """Rows in fsq id order; a row whose name matches an already-kept row
    within the matcher radius is the same place listed twice. Returns
    (kept, dropped) where dropped is [(record, kept fsq id)]. The dropped
    row's types are folded into the kept row so a Monastery listed once as
    a Church loses nothing."""
    grid = defaultdict(list)
    kept, dropped = [], []
    for record in candidates:
        twin = None
        for other in preflight.near(grid, record['lat'], record['lng']):
            distance = haversine_m(record['lat'], record['lng'], other['lat'], other['lng'])
            if distance <= MATCH_RADIUS_METERS and names_match(record['dedupe_name'], other['dedupe_name'], distance):
                twin = other
                break
        if twin:
            for poi_type in record['types']:
                if poi_type not in twin['types']:
                    twin['types'].append(poi_type)
            dropped.append((record, twin['fsq_place_id']))
            continue
        grid[(int(record['lat'] // preflight.CELL), int(record['lng'] // preflight.CELL))].append(record)
        kept.append(record)
    return kept, dropped


def batch_name_near_misses(kept):
    """Kept rows with the same normalised name 75–400 m apart: both import
    under the contract (name match needs distance), listed for curation."""
    by_name = defaultdict(list)
    for record in kept:
        by_name[record['dedupe_name']].append(record)
    pairs = []
    for same in by_name.values():
        for i, record in enumerate(same):
            for other in same[i + 1:]:
                distance = haversine_m(record['lat'], record['lng'], other['lat'], other['lng'])
                if MATCH_RADIUS_METERS < distance <= preflight.FAR_M:
                    pairs.append((record['fsq_place_id'], other['fsq_place_id'], record['name'], distance))
    return pairs


def served_alias_twins(inserts, grid):
    """Would-insert rows with a served landmark or venue within the
    preflight's coordinate-twin distance under a name the matcher cannot
    pair — "Mosteiro dos Jerónimos" 12 m from Overture's "Jerónimos
    Monastery". The contract imports them (different names are different
    places; distance alone never removes) and the Worker's read-time
    suppression is exact-name too, so they are the cross-language and
    alias duplicates a person has to look at. Returns [(record, place,
    distance)], nearest served landmark per row. Businesses are left out:
    a café 10 m from a church is not an alias of it."""
    twins = []
    for record in inserts:
        nearest = None
        for place in preflight.near(grid, record['lat'], record['lng']):
            # `spa` sits in the preflight's landmark family for hot springs; here it is a hairdresser next door.
            if preflight.business_typed(place['type']) or place['type'] == 'spa':
                continue
            distance = haversine_m(record['lat'], record['lng'], place['lat'], place['lng'])
            if distance <= preflight.COORDINATE_TWIN_M and (nearest is None or distance < nearest[1]):
                nearest = (place, distance)
        if nearest:
            record['alias_twin'] = f'{nearest[0]["source"]}:{nearest[0]["id"]} "{nearest[0]["name"]}" ({nearest[0]["type"]}) at {nearest[1]:.0f} m'
            twins.append((record, nearest[0], nearest[1]))
    return sorted(twins, key=lambda twin: (twin[2], twin[0]['fsq_place_id']))


def plan(records, paths_by_id, leaf_map, grid, corrections, translation=None):
    """Every record → a decision. Returns (inserts, skips) where inserts
    are records with 'types' set and skips are (record, reason, detail)."""
    skips = []
    candidates = []
    for record in records:
        decision, types, kinds = map_row_types(record, leaf_map, paths_by_id[record['fsq_place_id']])
        record['leaf_kinds'] = kinds
        if decision != 'import':
            skips.append((record, decision, ', '.join(f'{leaf} ({kind})' for leaf, kind in sorted(kinds.items()))))
            continue
        record['types'] = types
        correction = corrections.get(record['fsq_place_id'])
        if correction and int(correction.get('visible') or 0) == 0:
            skips.append((record, 'hidden by poi_source_correction', correction.get('review_note') or ''))
            continue
        if correction and correction.get('name_override'):
            record['name'] = correction['name_override']
            record['dedupe_name'] = normalize_text(record['name'])
        decision, detail = decide_against_served(record, grid, translation)
        if decision != 'import':
            skips.append((record, decision, detail))
            continue
        candidates.append(record)
    kept, dropped = dedupe_within_batch(candidates)
    for record, kept_id in dropped:
        skips.append((record, 'in-batch duplicate', f'same place as fsq:{kept_id}'))
    return kept, skips


# ---------------------------------------------------------------------------- SQL

def curated_address(record):
    parts = [p for p in (record['address'], record['locality']) if p]
    return ', '.join(parts) if parts else None


def curated_value(record, imported_at, run_id, country='PT'):
    fsq_id = record['fsq_place_id']
    local_lang = {'PT': 'pt', 'ES': 'es'}.get(country.upper())
    values = (
        sql_escape(POI_ID_PREFIX + fsq_id), sql_escape('community'), sql_escape(record['name']),
        sql_escape(record['name']) if local_lang else 'NULL', sql_escape(local_lang),
        sql_escape(record['dedupe_name']), repr(float(record['lat'])), repr(float(record['lng'])),
        sql_escape(encode_geohash(record['lat'], record['lng'], GEOHASH_PRECISION)), sql_escape(record['types'][0]),
        sql_escape(curated_address(record)), sql_escape('active'),
        sql_escape(imported_at), sql_escape(ACTOR), sql_escape(imported_at), sql_escape(ACTOR),
        sql_escape(ORIGIN_SOURCE), sql_escape(fsq_id), sql_escape(ORIGIN_LICENCE), sql_escape(imported_at), sql_escape(run_id),
    )
    return '(' + ', '.join(values) + ')'


def attribute_values(record):
    for poi_type in record['types'][1:]:
        yield f'({sql_escape(POI_ID_PREFIX + record["fsq_place_id"])}, {sql_escape(EXTRA_TYPE_DIMENSION)}, {sql_escape(poi_type)})'


def batched(pieces, prefix, suffix):
    """load_overture_candidates.batched with a suffix: one bounded statement
    at a time, never over MAX_STATEMENT_BYTES or MAX_VALUES_TERMS."""
    overhead = byte_len(prefix) + byte_len(suffix) + 2
    values, size = [], overhead
    for piece in pieces:
        piece_size = byte_len(piece) + 2
        if values and (size + piece_size > MAX_STATEMENT_BYTES or len(values) >= MAX_VALUES_TERMS):
            yield prefix + ',\n'.join(values) + suffix
            values, size = [], overhead
        values.append(piece)
        size += piece_size
    if values:
        yield prefix + ',\n'.join(values) + suffix


def statements(inserts, imported_at, run_id, country='PT'):
    """Every SQL statement the run would execute, curated rows first."""
    out = list(batched((curated_value(r, imported_at, run_id, country) for r in inserts), CURATED_INSERT_PREFIX, CURATED_INSERT_SUFFIX))
    out += list(batched((v for r in inserts for v in attribute_values(r)), ATTRIBUTE_INSERT_PREFIX, ATTRIBUTE_INSERT_SUFFIX))
    return out


# ---------------------------------------------------------------------------- emit

D1_WRITE_ATTEMPTS = 3


def d1_write_wrangler(statement, work_dir):
    """One statement, one request: wrangler `d1 execute --file` on a file
    holding exactly that statement."""
    import subprocess
    os.makedirs(work_dir, exist_ok=True)
    path = os.path.join(work_dir, 'emit-statement.sql')
    with open(path, 'w') as handle:
        handle.write(statement)
    result = subprocess.run(
        ['npx', 'wrangler', 'd1', 'execute', 'brush-poi-registry', '--remote', '--file', path, '--json'],
        cwd=CLOUDFLARE_DIR, capture_output=True, text=True, check=True)
    meta = json.loads(wrangler_json(result.stdout))[0].get('meta') or {}
    return meta.get('changes', 0)


def wrangler_json(stdout):
    """The JSON document in wrangler's stdout. Even with `--json`, a file
    near the upload threshold gets progress lines first (`├ Checking if
    file needs uploading`), which broke the first KAN-433 emit at
    statement 1 of 48 (2026-09-20)."""
    start = min((i for i in (stdout.find('['), stdout.find('{')) if i >= 0), default=-1)
    if start < 0:
        raise ValueError(f'no JSON in wrangler output: {stdout[-300:]!r}')
    return stdout[start:]


def d1_write(statement, work_dir):
    """Transient failures get three attempts (the statement is idempotent,
    so a retry after a half-applied request is safe); 429 is stop."""
    import subprocess
    if os.environ.get('D1_INTERNAL') == '1':
        import d1_client
        meta = d1_client.execute(statement) or {}
        return meta.get('changes', 0)
    last = ''
    for attempt in range(1, D1_WRITE_ATTEMPTS + 1):
        try:
            return d1_write_wrangler(statement, work_dir)
        except subprocess.CalledProcessError as error:
            output = f'{error.stdout or ""}{error.stderr or ""}'
            if '429' in output:
                raise SystemExit(f'D1 answered 429; stopping. {output[-500:]}')
            last = output
            print(f'[import] D1 write failed (attempt {attempt}/{D1_WRITE_ATTEMPTS}): {output[-300:].strip()}', file=sys.stderr)
    raise SystemExit(f'D1 write failed {D1_WRITE_ATTEMPTS} times: {last}'[-1000:])


ORIGIN_INDEX = 'idx_curated_poi_origin'


def curated_provenance_missing(d1_read=None):
    """What of migration 0042 the live curated_poi lacks: the column names
    and/or the unique index, as a list of short descriptions; empty when
    the migration is fully applied. Two bounded reads. The index is checked
    on its own because 0042 is applied with `d1 execute --file`, which can
    stop halfway: with the columns present and the index absent, the guard
    would pass and the first ON CONFLICT (origin_source, origin_id)
    statement would fail against a target that has no unique index."""
    d1_read = d1_read or preflight.d1_read
    columns = {row['name'] for row in d1_read('PRAGMA table_info(curated_poi)')}
    missing = [f'column {c}' for c in ('origin_source', 'origin_id', 'origin_licence', 'imported_at', 'import_run_id') if c not in columns]
    indexes = {row['name'] for row in d1_read(
        f"SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'curated_poi' AND name = '{ORIGIN_INDEX}'")}
    if ORIGIN_INDEX not in indexes:
        missing.append(f'unique index {ORIGIN_INDEX}')
    return missing


def curated_has_provenance(d1_read=None):
    return not curated_provenance_missing(d1_read)


def emit(stmts, work_dir, write=None):
    """Runs every statement, one request each, and returns the D1 change
    count — 0 on a re-run, which is the idempotency proof. `write` is
    resolved at call time so a patched `d1_write` reaches `run()`."""
    write = write or d1_write
    changes = 0
    for index, statement in enumerate(stmts, 1):
        delta = write(statement, work_dir)
        changes += delta
        print(f'[import] statement {index}/{len(stmts)}: {delta} change(s)', file=sys.stderr)
    return changes


# ---------------------------------------------------------------------------- report

def md_cell(value):
    return preflight.md_cell(value)


def leaf_table(inserts, skips, leaf_map):
    """Per leaf: would-insert and each skip reason. A row with two mapped
    leaves counts under each, so the column sums exceed the distinct totals."""
    per_leaf = defaultdict(Counter)
    for record in inserts:
        for leaf in record['leaves']:
            per_leaf[leaf]['insert'] += 1
    for record, reason, _ in skips:
        for leaf in record['leaves']:
            per_leaf[leaf][reason] += 1
    kind_of = {}
    for record in inserts + [s[0] for s in skips]:
        kind_of.update(record.get('leaf_kinds', {}))
    return per_leaf, kind_of


def render(c):
    out = [f"# KAN-433 — Foursquare tourism import, {c['country']}, Tier 1 — {'DRY RUN' if c['dry_run'] else 'EMITTED'}\n"]
    out.append(f"Run `{c['run_id']}`, generated {c['generated_at']} by `cloudflare/extraction/import_foursquare_tourism.py`. "
               + ('Nothing was written to D1 or R2; this is what `--emit` would do.\n' if c['dry_run']
                  else f"Emitted: {c['changes']:,} D1 change(s).\n"))
    out.append('## Inputs\n')
    out.append(f"- Foursquare archive: `{c['archive_key']}` — {c['archive_total']:,} rows (sha256 `{c['archive_sha256']}`); "
               f"{c['in_scope']:,} distinct rows carry an in-scope leaf.")
    out.append(f"- Leaf → type map: `{c['leaf_map_path']}` ({len(c['leaf_map'].tier1)} leaf rules, "
               f"{len(c['leaf_map'].suffix)} suffix rules, {len(c['leaf_map'].tier2)} tier-2 leaves).")
    out.append(f"- Overture base: `{c['overture_key']}` — {c['overture_stats'].get('promoted', 0):,} promoted of "
               f"{sum(c['overture_stats'].values()):,} rows under the committed overrides.")
    out.append(f"- Curated rows (active, all types): {c['curated_count']:,}.")
    out.append(f"- MULTIBANCO: {c['multibanco_names']} distinct name(s) read; {c['multibanco_count']:,} row(s) fetched as possible name matches.")
    out.append(f"- Foursquare-keyed `poi_source_correction` rows honoured: {c['corrections']:,}.")
    out.append(f"- Matcher: `supplement_osm_pois.names_match` within {MATCH_RADIUS_METERS} m, type-blind, against every served row. "
               f"Same name {MATCH_RADIUS_METERS}–{preflight.FAR_M:.0f} m away is skipped as suspect. Distance alone never skips.\n")
    out.append('## Totals\n')
    out.append('| | rows |')
    out.append('|---|---:|')
    out.append(f"| **would insert** | **{len(c['inserts']):,}** |")
    for reason in SKIP_ORDER:
        n = c['skip_counts'].get(reason, 0)
        if n:
            out.append(f"| skipped — {reason} | {n:,} |")
    out.append(f"| in-scope rows, total | {c['in_scope']:,} |")
    out.append('')
    out.append(f"SQL: {len(c['statements'])} statement(s), {c['sql_bytes']:,} bytes "
               f"({c['curated_statements']} `curated_poi` + {len(c['statements']) - c['curated_statements']} `curated_poi_attribute`), "
               f"largest {c['largest_statement']:,} bytes (cap {MAX_STATEMENT_BYTES:,}). "
               f"Rows with a second type (written as `curated_poi_attribute` `{EXTRA_TYPE_DIMENSION}`): {c['two_type_rows']:,}.\n")
    out.append('## Would insert, by our type\n')
    out.append('| primary_poi_type | rows | + as second type |')
    out.append('|---|---:|---:|')
    for poi_type, n in sorted(c['by_type'].items(), key=lambda kv: (-kv[1], kv[0])):
        out.append(f"| `{poi_type}` | {n:,} | {c['by_second_type'].get(poi_type, 0):,} |")
    out.append('')
    out.append('## Per leaf\n')
    out.append('A row with several in-scope leaves counts under each, so columns sum past the distinct totals above. '
               'Skip reasons that are the same for every row of a leaf (tier 2, noise, parent, excluded, unmapped) show the leaf\'s whole count.\n')
    reasons = [r for r in SKIP_ORDER if c['skip_counts'].get(r)]
    out.append('| leaf | kind | our type(s) | rows | would insert | ' + ' | '.join(reasons) + ' |')
    out.append('|---|---|---|---:|---:|' + '---:|' * len(reasons))
    for leaf in c['leaf_order']:
        counts = c['per_leaf'][leaf]
        total = sum(counts.values())
        kind = c['kind_of'].get(leaf, '')
        types = ', '.join(f'`{t}`' for t in (c['leaf_map'].types_for(leaf, c['leaf_paths'].get(leaf, leaf)) or ()))
        out.append(f"| {md_cell(leaf)} | {kind} | {types} | {total:,} | {counts.get('insert', 0):,} | "
                   + ' | '.join(f"{counts.get(r, 0):,}" for r in reasons) + ' |')
    out.append('')
    if c['unmapped']:
        out.append('## Unmapped leaves — in scope, not in the map, imported nothing\n')
        out.append('| leaf | rows | paths |')
        out.append('|---|---:|---|')
        for leaf, n in c['unmapped']:
            out.append(f"| {md_cell(leaf)} | {n:,} | {md_cell(c['leaf_paths'].get(leaf, ''))} |")
        out.append('')
    out.append('## Weak-name skips — an owner decision the contract did not cover\n')
    out.append('The dedupe contract says name match + distance, nothing about rows with no usable name. These rows are '
               'skipped by the preflight\'s name-quality flags and listed so the owner can flip them: a name that is '
               'only its type word ("Castelo", "Igreja") or only its town names nothing the matcher could dedupe later.\n')
    out.append(f"- type words only: {c['weak_counts'].get('type words only', 0):,}")
    out.append(f"- locality only: {c['weak_counts'].get('locality only', 0):,}\n")
    translated = c['skip_samples_hand'].get('matched (translated)', [])
    out.append('## Matched through translation — hand-check sample\n')
    out.append(f"Rows skipped because their name, with landmark words mapped to English through `{c['terms_path']}` and "
               f"function words dropped, matches a served landmark's translated name within {TRANSLATED_MATCH_M:.0f} m. "
               f"{c['skip_counts'].get('matched (translated)', 0):,} row(s); a seeded sample of {len(translated)} for a person to check — "
               'any pair here that is NOT the same place is a bug in the term table or the step.\n')
    if translated:
        out.append('| fsq_place_id | archive name | served name | served type | m | translated (archive ↔ served) |')
        out.append('|---|---|---|---|---:|---|')
        for record, _, detail in translated:
            served_name = detail.split('"')[1] if '"' in detail else ''
            out.append('| ' + ' | '.join(md_cell(v) for v in (
                record['fsq_place_id'], record['name'], served_name, detail.rsplit('(', 1)[-1].split(')')[0],
                detail.rsplit(' at ', 1)[-1].replace(' m', ''),
                f"{c['translate'](record['dedupe_name'])} ↔ {c['translate'](normalize_text(served_name))}")) + ' |')
        out.append('')
    out.append('## Served landmark within 25 m under another name — imported, for curation\n')
    out.append(f"Would-insert rows with a served landmark or venue (not a business) within {preflight.COORDINATE_TWIN_M:.0f} m whose name the "
               'matcher cannot pair. The contract imports them — different names are different places, distance alone never '
               'removes — and the Worker\'s read-time suppression is exact-name too. Some are real neighbours (a statue by a '
               'church); the ones that are the same place under another language or alias ("Mosteiro dos Jerónimos" / "Jerónimos '
               f"Monastery\") are what this list is for — what the translation step above did not pair. "
               f"{len(c['alias_twins']):,} row(s); a seeded hand-check sample of {len(c['alias_sample'])}:\n")
    if c['alias_sample']:
        out.append('| fsq_place_id | name | our type(s) | served neighbour | translated (archive ↔ served) |')
        out.append('|---|---|---|---|---|')
        for record, place, _ in c['alias_sample']:
            out.append('| ' + ' | '.join(md_cell(v) for v in (
                record['fsq_place_id'], record['name'], ', '.join(record['types']), record['alias_twin'],
                f"{c['translate'](record['dedupe_name'])} ↔ {c['translate'](place['dedupe_name'])}")) + ' |')
        out.append('')
    out.append('## Fuzzy far names — imported, for curation\n')
    out.append(f"Would-insert rows whose nearest served row {MATCH_RADIUS_METERS}–{preflight.FAR_M:.0f} m away scores between "
               f"{preflight.NAME_SIMILARITY_THRESHOLD} and {SAME_NAME_SIMILARITY} on name_similarity — the rung the preflight counted as "
               f"suspect and this importer does not (see `SAME_NAME_SIMILARITY`). {len(c['fuzzy_far']):,} row(s); first {c['sample_size']}:\n")
    if c['fuzzy_far']:
        out.append('| fsq_place_id | name | our type(s) | nearest fuzzy far name |')
        out.append('|---|---|---|---|')
        for record in c['fuzzy_far'][:c['sample_size']]:
            out.append('| ' + ' | '.join(md_cell(v) for v in (record['fsq_place_id'], record['name'], ', '.join(record['types']), record['fuzzy_far'])) + ' |')
        out.append('')
    out.append('## In-batch name near-misses — both imported, for curation\n')
    out.append(f"Kept rows sharing a normalised name {MATCH_RADIUS_METERS}–{preflight.FAR_M:.0f} m apart. Under the contract both "
               f"import (a name match needs the distance too); {len(c['near_misses']):,} pair(s), first {c['sample_size']}:\n")
    if c['near_misses']:
        out.append('| fsq_place_id | fsq_place_id | name | m |')
        out.append('|---|---|---|---:|')
        for a, b, name, distance in c['near_misses'][:c['sample_size']]:
            out.append(f'| {a} | {b} | {md_cell(name)} | {distance:.0f} |')
        out.append('')
    out.append('## Samples of would-insert rows, per leaf\n')
    for leaf in c['leaf_order']:
        rows = c['samples'].get(leaf)
        if not rows:
            continue
        out.append(f"### {leaf} — {c['per_leaf'][leaf].get('insert', 0):,} would insert, sample of {len(rows)}\n")
        out.append('| fsq_place_id | name | locality | lat | lng | our type(s) |')
        out.append('|---|---|---|---:|---:|---|')
        for record in rows:
            out.append('| ' + ' | '.join(md_cell(v) for v in (
                record['fsq_place_id'], record['name'], record['locality'], f"{record['lat']:.5f}", f"{record['lng']:.5f}",
                ', '.join(record['types']))) + ' |')
        out.append('')
    out.append('## Samples of skipped rows, per reason\n')
    for reason in SKIP_ORDER:
        rows = c['skip_samples'].get(reason)
        if not rows:
            continue
        out.append(f"### {reason} — {c['skip_counts'][reason]:,}, sample of {len(rows)}\n")
        out.append('| fsq_place_id | name | locality | leaves | detail |')
        out.append('|---|---|---|---|---|')
        for record, _, detail in rows:
            out.append('| ' + ' | '.join(md_cell(v) for v in (
                record['fsq_place_id'], record['name'], record['locality'], ', '.join(record['leaves']), detail)) + ' |')
        out.append('')
    return '\n'.join(out)


def jsonl_rows(inserts, skips, run_id):
    for record in inserts:
        yield {'action': 'insert', 'run_id': run_id, 'fsq_place_id': record['fsq_place_id'], 'poi_id': POI_ID_PREFIX + record['fsq_place_id'],
               'name': record['name'], 'lat': record['lat'], 'lng': record['lng'], 'leaves': record['leaves'],
               'types': record['types'], 'address': curated_address(record), 'fuzzy_far': record.get('fuzzy_far'), 'alias_twin': record.get('alias_twin')}
    for record, reason, detail in skips:
        yield {'action': 'skip', 'run_id': run_id, 'fsq_place_id': record['fsq_place_id'], 'name': record['name'],
               'lat': record['lat'], 'lng': record['lng'], 'leaves': record['leaves'],
               'types': record.get('types', []), 'reason': reason, 'detail': detail}


def sample(items, size, seed, key):
    picker = random.Random(seed)
    if len(items) <= size:
        return sorted(items, key=key)
    return sorted(picker.sample(items, size), key=key)


# ---------------------------------------------------------------------------- run

def run(args):
    leaf_map = LeafMap.load(args.leaf_map)
    check_types_reachable(leaf_map)
    if args.tier != 1:
        raise SystemExit('only --tier 1 is implemented in this run; Tier 2 is counted, never imported')
    work_dir = args.work_dir
    archive_csv = args.archive_csv or preflight.fetch_if_missing(args.archive_key, work_dir, 'foursquare')
    overture_csv = args.overture_csv or preflight.fetch_if_missing(args.overture_key, work_dir, 'overture')
    if args.emit:
        if not args.i_have_applied_0042:
            raise SystemExit('--emit refused: pass --i-have-applied-0042 once migration 0042 is on production and the owner said go')
        missing = curated_provenance_missing()
        if missing:
            raise SystemExit('--emit refused: the live curated_poi is missing ' + ', '.join(missing)
                             + '; apply migration 0042 in full first (d1 execute --file), then check again')

    print(f'[import] reading archive {archive_csv}', file=sys.stderr)
    records, paths_by_id, archive_total = load_archive(archive_csv)
    print(f'[import] deciding Overture base {overture_csv}', file=sys.stderr)
    served, overture_stats = preflight.served_overture(overture_csv, args.overture_key)
    curated = preflight.served_curated_all()
    corrections = foursquare_corrections()
    mapped = [r for r in records if map_row_types(r, leaf_map, paths_by_id[r['fsq_place_id']])[0] == 'import']
    multibanco, multibanco_names = served_multibanco_for(mapped)
    grid = preflight.grid_index(served + curated + multibanco)

    print(f'[import] planning {len(records):,} in-scope rows', file=sys.stderr)
    terms = LandmarkTerms.load(args.landmark_terms)
    table = terms.table_for(args.country)
    if table is None:
        print(f'[import] no landmark-terms table for {args.country}: translation step off', file=sys.stderr)
    inserts, skips = plan(records, paths_by_id, leaf_map, grid, corrections, (table, terms) if table else None)
    inserts.sort(key=lambda r: r['fsq_place_id'])
    skips.sort(key=lambda s: s[0]['fsq_place_id'])
    imported_at = args.imported_at or datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    stmts = statements(inserts, imported_at, args.run_id, args.country)

    skip_counts = Counter(reason for _, reason, _ in skips)
    weak_counts = Counter(detail for _, reason, detail in skips if reason == 'weak name')
    per_leaf, kind_of = leaf_table(inserts, skips, leaf_map)
    leaf_paths = {}
    for fsq_id, pairs in paths_by_id.items():
        for leaf, path in pairs:
            leaf_paths.setdefault(leaf, path)
    kind_rank = {'tier1': 0, 'tier2': 1, 'unmapped': 2, 'parent': 3, 'noise': 4, 'excluded': 5}
    leaf_order = sorted(per_leaf, key=lambda leaf: (kind_rank.get(kind_of.get(leaf), 9), -per_leaf[leaf].get('insert', 0), -sum(per_leaf[leaf].values()), leaf))
    unmapped = [(leaf, sum(per_leaf[leaf].values())) for leaf in leaf_order if kind_of.get(leaf) == 'unmapped']
    by_type = Counter(r['types'][0] for r in inserts)
    by_second_type = Counter(t for r in inserts for t in r['types'][1:])
    inserts_by_leaf = defaultdict(list)
    for record in inserts:
        for leaf in record['leaves']:
            if kind_of.get(leaf) == 'tier1':
                inserts_by_leaf[leaf].append(record)
    samples = {leaf: sample(rows, args.sample_size, args.seed, key=lambda r: r['fsq_place_id']) for leaf, rows in inserts_by_leaf.items()}
    skips_by_reason = defaultdict(list)
    for item in skips:
        skips_by_reason[item[1]].append(item)
    skip_samples = {reason: sample(rows, args.sample_size, args.seed, key=lambda s: s[0]['fsq_place_id']) for reason, rows in skips_by_reason.items()}
    skip_samples_hand = {reason: sample(rows, HAND_CHECK_ROWS, args.seed, key=lambda s: s[0]['fsq_place_id']) for reason, rows in skips_by_reason.items()}
    alias_twins = served_alias_twins(inserts, grid)
    alias_sample = sample(alias_twins, HAND_CHECK_ROWS, args.seed, key=lambda twin: twin[0]['fsq_place_id'])

    changes = None
    if args.emit:
        print(f'[import] emitting {len(stmts)} statement(s)', file=sys.stderr)
        changes = emit(stmts, work_dir)

    context = {
        'country': args.country, 'run_id': args.run_id, 'dry_run': not args.emit, 'changes': changes,
        'generated_at': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'),
        'archive_key': args.archive_key, 'archive_total': archive_total, 'archive_sha256': preflight.sha256_of(archive_csv),
        'in_scope': len(records), 'leaf_map_path': os.path.relpath(args.leaf_map, REPO_ROOT), 'leaf_map': leaf_map,
        'overture_key': args.overture_key, 'overture_stats': overture_stats, 'curated_count': len(curated),
        'multibanco_names': multibanco_names, 'multibanco_count': len(multibanco), 'corrections': len(corrections),
        'inserts': inserts, 'skip_counts': skip_counts, 'weak_counts': weak_counts, 'statements': stmts,
        'sql_bytes': sum(byte_len(s) for s in stmts), 'largest_statement': max((byte_len(s) for s in stmts), default=0),
        'curated_statements': sum(1 for s in stmts if s.startswith(CURATED_INSERT_PREFIX)),
        'two_type_rows': sum(1 for r in inserts if len(r['types']) > 1),
        'by_type': by_type, 'by_second_type': by_second_type, 'per_leaf': per_leaf, 'kind_of': kind_of,
        'leaf_order': leaf_order, 'leaf_paths': leaf_paths, 'unmapped': unmapped,
        'alias_twins': alias_twins, 'alias_sample': alias_sample, 'skip_samples_hand': skip_samples_hand,
        'terms_path': os.path.relpath(args.landmark_terms, REPO_ROOT),
        'translate': (lambda name: terms.translate(name, table)) if table else (lambda name: name),
        'near_misses': batch_name_near_misses(inserts), 'fuzzy_far': [r for r in inserts if r.get('fuzzy_far')], 'samples': samples, 'skip_samples': skip_samples,
        'sample_size': args.sample_size,
    }
    os.makedirs(os.path.dirname(os.path.abspath(args.report_out)), exist_ok=True)
    with open(args.report_out, 'w') as handle:
        handle.write(render(context))
    jsonl_path = os.path.splitext(args.report_out)[0] + '.jsonl'
    with open(jsonl_path, 'w') as handle:
        for row in jsonl_rows(inserts, skips, args.run_id):
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + '\n')
    if args.sql_out:
        with open(args.sql_out, 'w') as handle:
            handle.write(''.join(stmts))
    summary = {
        'run_id': args.run_id, 'dry_run': not args.emit, 'changes': changes, 'in_scope_rows': len(records),
        'would_insert': len(inserts), 'skipped': dict(skip_counts), 'statements': len(stmts), 'sql_bytes': context['sql_bytes'],
        'by_type': dict(by_type), 'unmapped_leaves': dict(unmapped), 'fuzzy_far_imported': len(context['fuzzy_far']), 'alias_twins_imported': len(context['alias_twins']),
    }
    print(json.dumps(summary, indent=2), file=sys.stderr)
    return summary


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--archive-key', default=preflight.DEFAULT_ARCHIVE_KEY)
    parser.add_argument('--overture-key', default=preflight.DEFAULT_OVERTURE_KEY)
    parser.add_argument('--archive-csv', help='local copy of the archive (skips the R2 fetch)')
    parser.add_argument('--overture-csv', help='local copy of the Overture country CSV (skips the R2 fetch)')
    parser.add_argument('--leaf-map', default=DEFAULT_LEAF_MAP)
    parser.add_argument('--landmark-terms', default=DEFAULT_LANDMARK_TERMS,
                        help='per-language landmark word table for the translation-aware match (keyed by --country)')
    parser.add_argument('--tier', type=int, default=1)
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--report-out', required=True, help='markdown path; the .jsonl goes beside it')
    parser.add_argument('--sql-out', help='also write every statement to this file (dry run inspection)')
    parser.add_argument('--work-dir', default=DEFAULT_WORK_DIR, help='where R2 objects are downloaded; never committed')
    parser.add_argument('--country', default='PT')
    parser.add_argument('--sample-size', type=int, default=20)
    parser.add_argument('--seed', type=int, default=433)
    parser.add_argument('--imported-at', help='ISO timestamp to stamp rows with (default: now, UTC)')
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--dry-run', action='store_true', default=True, help='the default: report only')
    mode.add_argument('--emit', action='store_true', help='write to D1 — requires --i-have-applied-0042')
    parser.add_argument('--i-have-applied-0042', action='store_true',
                        help='assert that migration 0042 is on production and the owner said go')
    args = parser.parse_args(argv)
    return run(args)


if __name__ == '__main__':
    main()
