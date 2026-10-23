"""
KAN-439. Write a shopping centre's published tenant list into `curated_poi`.

THE RULE THIS SERVES (owner, 2026-10-05)

  * If the store is in the list of stores from the Mall, we need to have it.
  * Never create stores that aren't there.
  * Overture and OSM aren't the source, only the helper.

So the operator's list is the complete tenant set, and this module's whole job
is to make production hold exactly it. A tenant nothing can place still gets a
row, at the centre's own coordinate: "in that building" is an honest answer,
and refusing to add it would lose a shop we know is there.

WHERE EACH ROW IS PUT, IN ORDER

  1. already held     a row inside the footprint matched the tenant — nothing
                      is written, the row stays as it is
  2. OSM              OSM places that tenant inside the centre, so the row
                      takes its coordinate and its `level` as the floor
  3. the centre       nothing can place it, so it takes the centre's polygon
                      centroid and the operator's published Piso

The floor comes from the operator's Piso wherever the operator publishes one,
and from OSM's `level` only where it does not — UBBO publishes none, Amoreiras
publishes one for 195 of 196 (see mall_lists/README.md).

WHAT IT WRITES

`curated_poi` rows with `source = 'community'`, provenance recorded the same
way `import_foursquare_tourism` records it, plus `curated_poi_attribute` for
the store kind and any extra type. Idempotent: `poi_id` is derived from the
centre and the tenant, and the insert is `ON CONFLICT … DO NOTHING`, so a
second run writes nothing.

This module WRITES NOTHING BY ITSELF. It prints the statements; applying them
is a separate, reviewed step.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from classify_and_load import byte_len, encode_geohash, normalize_text, sql_escape  # noqa: E402
import mall_footprints  # noqa: E402
import mall_tenants  # noqa: E402

MAX_STATEMENT_BYTES = 80000
MAX_VALUES_TERMS = 500
GEOHASH_PRECISION = 9
ACTOR = 'kan-439-mall-tenants'
# The name is a fact from the operator's own directory; the coordinate comes
# from OpenStreetMap, either the tenant's node or the centre's outline. ODbL
# is the licence that travels with the position, so it is the one recorded.
ORIGIN_SOURCE = 'mall_directory'
ORIGIN_LICENCE = 'ODbL'
POI_ID_PREFIX = 'mall:'
EXTRA_TYPE_DIMENSION = 'poi_type'  # what curated_poi_attribute already uses (245 rows in prod)

CURATED_COLUMNS = (
    'poi_id', 'source', 'name', 'dedupe_name', 'lat', 'lng', 'geohash',
    'primary_poi_type', 'address', 'floor', 'country_code',
    'status', 'created_at', 'created_by', 'updated_at', 'updated_by',
    'origin_source', 'origin_id', 'origin_licence', 'imported_at', 'import_run_id',
)
CURATED_INSERT_PREFIX = f'INSERT INTO curated_poi ({", ".join(CURATED_COLUMNS)}) VALUES\n'
CURATED_INSERT_SUFFIX = '\nON CONFLICT (poi_id) DO NOTHING;\n'
ATTRIBUTE_INSERT_PREFIX = 'INSERT OR IGNORE INTO curated_poi_attribute (poi_id, dimension, value) VALUES\n'
ATTRIBUTE_INSERT_SUFFIX = ';\n'


def fold(value: str) -> str:
    value = ''.join(c for c in unicodedata.normalize('NFKD', value or '')
                    if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', ' ', value.lower()).strip()


def poi_id(centre_slug: str, tenant: str) -> str:
    """Derived, not random, so a re-run produces the same id and writes
    nothing. The centre is part of it because two centres can hold the same
    brand, and those are two different places."""
    return POI_ID_PREFIX + centre_slug + ':' + re.sub(r'\s+', '-', fold(tenant))


def read_types(path):
    """{folded name: (primary, store_kind, [extra types], evidence)}"""
    out = {}
    for line in open(path):
        if line.startswith('#') or line.startswith('name\t'):
            continue
        parts = line.rstrip('\n').split('\t')
        if len(parts) < 5:
            continue
        name, primary, kind, extra, evidence = parts[:5]
        out[fold(name)] = (primary, kind or None,
                           [t for t in extra.split(',') if t], evidence)
    return out


def placements(tenants, held, osm, footprint, centre_slug, types):
    """One decision per listed tenant: already held, placed by OSM, or at the
    centre. Returns (to_write, already_held, untyped)."""
    held_by_name = {fold(r['name']): r for r in held}
    osm_by_name = {fold(r['name']): r for r in osm}
    centroid = footprint['centroid']

    to_write, already, untyped = [], [], []
    for tenant, floor in tenants:
        key = fold(tenant)
        if key in held_by_name:
            already.append((tenant, held_by_name[key]))
            continue
        typing = types.get(key)
        if not typing:
            untyped.append(tenant)
            continue
        primary, kind, extra, evidence = typing
        match = osm_by_name.get(key)
        if match and mall_footprints.in_footprint(match['lat'], match['lng'], footprint):
            lat, lng, source = match['lat'], match['lng'], 'osm'
            # the operator's Piso wins; OSM's level only fills a gap
            shown_floor = floor or (f"Piso {match['level']}" if match.get('level') else None)
        else:
            lat, lng, source = centroid[0], centroid[1], 'centre'
            shown_floor = floor or None
        to_write.append({
            'tenant': tenant, 'poi_id': poi_id(centre_slug, tenant),
            'lat': lat, 'lng': lng, 'floor': shown_floor,
            'primary': primary, 'kind': kind, 'extra': extra,
            'placed_by': source, 'evidence': evidence,
        })
    return to_write, already, untyped


def curated_value(row, imported_at, run_id, country_code='PT'):
    name = row['tenant']
    return '(' + ', '.join((
        sql_escape(row['poi_id']), sql_escape('community'), sql_escape(name),
        sql_escape(normalize_text(name) or name.strip().lower()),
        repr(float(row['lat'])), repr(float(row['lng'])),
        sql_escape(encode_geohash(row['lat'], row['lng'], GEOHASH_PRECISION)),
        sql_escape(row['primary']), 'NULL', sql_escape(row['floor']),
        sql_escape(country_code), sql_escape('active'),
        sql_escape(imported_at), sql_escape(ACTOR), sql_escape(imported_at), sql_escape(ACTOR),
        sql_escape(ORIGIN_SOURCE), sql_escape(row['poi_id']), sql_escape(ORIGIN_LICENCE),
        sql_escape(imported_at), sql_escape(run_id),
    )) + ')'


def attribute_values(row):
    if row['kind']:
        yield f"({sql_escape(row['poi_id'])}, {sql_escape('store_kind')}, {sql_escape(row['kind'])})"
    for extra in row['extra']:
        yield f"({sql_escape(row['poi_id'])}, {sql_escape(EXTRA_TYPE_DIMENSION)}, {sql_escape(extra)})"


def batched(pieces, prefix, suffix):
    """One bounded statement at a time — never over MAX_STATEMENT_BYTES or
    MAX_VALUES_TERMS, the limits that broke KAN-446 and KAN-448."""
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


def statements(rows, imported_at, run_id):
    yield from batched((curated_value(r, imported_at, run_id) for r in rows),
                       CURATED_INSERT_PREFIX, CURATED_INSERT_SUFFIX)
    attributes = [v for r in rows for v in attribute_values(r)]
    if attributes:
        yield from batched(attributes, ATTRIBUTE_INSERT_PREFIX, ATTRIBUTE_INSERT_SUFFIX)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--list', required=True)
    parser.add_argument('--types', required=True, help='mall_lists/<centre>_types.tsv')
    parser.add_argument('--held', required=True, help='JSON rows we serve inside the centre')
    parser.add_argument('--osm', required=True, help='JSON rows from OSM')
    parser.add_argument('--mall', required=True, help="the centre's name in footprints.json")
    parser.add_argument('--slug', required=True)
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--imported-at', required=True)
    parser.add_argument('--out', help='write the statements here instead of stdout')
    args = parser.parse_args(argv)

    tenants = mall_tenants.read_tenant_list(args.list)
    footprint = mall_footprints.load()[args.mall]
    to_write, already, untyped = placements(
        tenants, json.load(open(args.held)), json.load(open(args.osm)),
        footprint, args.slug, read_types(args.types))

    print(f'{len(tenants)} listed  {len(already)} already held  '
          f'{len(to_write)} to create  {len(untyped)} untyped (not written)',
          file=sys.stderr)
    by_source = {}
    for row in to_write:
        by_source[row['placed_by']] = by_source.get(row['placed_by'], 0) + 1
    print(f'  placed by OSM {by_source.get("osm", 0)}, '
          f'at the centre {by_source.get("centre", 0)}', file=sys.stderr)
    for name in untyped:
        print(f'  UNTYPED, skipped: {name}', file=sys.stderr)

    out = open(args.out, 'w') if args.out else sys.stdout
    for statement in statements(to_write, args.imported_at, args.run_id):
        out.write(statement)
    if args.out:
        out.close()
        print(f'written: {args.out}', file=sys.stderr)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
