"""
KAN-462. Make production hold exactly a shopping centre's published list.

`import_mall_tenants` only ADDS: a tenant it finds already held is left as it
is, and a held row the operator does not list is not its business. That was
enough while removals were done by hand, one reviewed migration at a time
(KAN-439, 0058–0063). This module does the whole reconciliation in one pass,
because the owner's rule for NorteShopping (2026-11-11) is stated for the
whole centre:

  * only the listed places may exist there — every other row inside goes;
  * two held rows for one listed store are the same store: keep one, give it
    the list's type and floor, and withdraw the other.

ONE LISTED UNIT, ONE ROW

Every listed unit is answered by exactly one row. Assignment is one-to-one and
greedy on the matcher's own score (the 0.86 bar `mall_tenants` uses), with a
person's confirmed pairs from `decisions.md` scoring as certain. Ties go to the
closer name, so `Zara Home` answers `ZARA HOME` and not `ZARA`.

A held row left over whose best tenant is already answered is that tenant's
TWIN — the same shop held twice — and is withdrawn. A held row matching no
tenant at all is UNLISTED and is withdrawn. A listed unit nothing answers is
written by `import_mall_tenants.placements`, at OSM's position or the centre's.

WHAT IS NEVER TOUCHED

  * anything outside the buffered footprint, except a row whose address is
    the centre's own (`far`): at NorteShopping, FNAC, Sephora and Tezenis
    were each held a second time 1.6 km away, under `Rua Sara Afonso 105`.
    That is the same shop with a bad coordinate, shown twice to a user near
    either point. An address that only places a business NEXT to the centre
    (`Junto ao Norte Shopping`) is a neighbour and is left out of `far`;
  * a row between the strict outline and the buffer whose address does not
    name the centre. decisions.md removes from the strict outline only,
    because the buffer ring once swept in another centre's tenants and street
    businesses. The address is the evidence that separates the two: at
    NorteShopping every ring row that gives `Norteshopping` or `Rua Sara
    Afonso` is a unit pinned a few metres off, and every one that gives
    another street — a vet, a tattoo studio, a Galp station, a jeweller on
    Rua Monte da Luz — is a neighbour, the way UBBO's Auchan fuel station is.

Nothing is deleted. An Overture row is tombstoned through
`poi_source_correction`; a curated row gets `status = 'removed'`.

This module WRITES NOTHING BY ITSELF. It prints a plan and the statements;
applying them is a separate, reviewed step.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from classify_and_load import normalize_text, sql_escape  # noqa: E402
import import_mall_tenants as writer  # noqa: E402
import mall_footprints  # noqa: E402
import mall_tenants  # noqa: E402
from mall_tenants import CONFIDENT_THRESHOLD, key_score, mall_tokens, tenant_key  # noqa: E402

def floor_value(floor: str | None) -> str | None:
    """`Piso -4` -> `-4`, the shape `overture_poi.floor` holds (0030)."""
    if not floor:
        return None
    match = re.search(r'-?\d+', floor)
    return match.group(0) if match else None


def row_id(row) -> str:
    return row.get('poi_id') or row['overture_id']


def is_curated(row) -> bool:
    return bool(row.get('poi_id'))


def assign(tenants, held, mall_name, confirmed=None, certain=None):
    """(answers, twins, unlisted).

    answers  {tenant index: held row}
    twins    [(held row, tenant index it duplicates)]
    unlisted [held row]

    `certain(row)` says a row is certainly the centre's — inside the outline,
    or carrying its address. Those answer a unit before any row in the buffer
    ring does, whatever the score: on Rua de Santa Catarina the matcher gave
    `KIKO MILANO` to `Kiko Milano` at no. 412, a street shop past the
    centre's 312–350, and made the `Kiko Store` inside its twin.
    """
    certain = certain or (lambda row: True)
    tokens = mall_tokens(mall_name)
    confirmed = confirmed or {}
    # A row a person has confirmed for a tenant answers only that tenant. The
    # matcher alone would hand `SAT … CONTINENTE BOM DIA` to `CONTINENTE`, the
    # hypermarket, at 0.90 — and put the hypermarket at the Bom Dia's door.
    ruled_for = {}
    for tenant_norm, rows in confirmed.items():
        for row_norm in rows:
            ruled_for.setdefault(row_norm, set()).add(tenant_norm)
    sure_row = [certain(row) for row in held]
    edges = []
    for t, (name, _) in enumerate(tenants):
        t_key = tenant_key(name, tokens)
        t_norm = normalize_text(name)
        sure = confirmed.get(t_norm, set())
        for h, row in enumerate(held):
            r_norm = normalize_text(row['name'])
            if r_norm in ruled_for and t_norm not in ruled_for[r_norm]:
                continue
            r_key = tenant_key(row['name'], tokens)
            score = 1.0 if r_norm in sure else key_score(t_key, r_key)
            if score >= CONFIDENT_THRESHOLD:
                exact = 1 if t_key == r_key else 0
                edges.append((0 if sure_row[h] else 1, -score, -exact, abs(len(t_key) - len(r_key)), t, h))
    edges.sort()

    answers, taken = {}, set()
    for *_, t, h in edges:
        if t in answers or h in taken:
            continue
        answers[t] = held[h]
        taken.add(h)

    twins, unlisted = [], []
    for h, row in enumerate(held):
        if h in taken:
            continue
        best = next((t for *_, t, hh in edges if hh == h and t in answers), None)
        if best is not None:
            twins.append((row, best))
        else:
            unlisted.append(row)
    return answers, twins, unlisted


def withdrawable(row, footprint, address_words=()) -> bool:
    """Inside the building, or in the ring with an address naming the centre."""
    if mall_footprints.in_footprint(row['lat'], row['lng'], footprint, buffer_m=0):
        return True
    address = writer.fold(row.get('address') or '')
    return any(writer.fold(w) in address for w in address_words if w)


def type_set(typing):
    primary, kind, extra, _ = typing
    return [primary] + [t for t in extra if t != primary], kind


def held_updates(answers, tenants, types, today):
    """Give each held row that answers a listed unit the list's type and floor."""
    over, cur = [], []
    for t, row in sorted(answers.items()):
        name, floor = tenants[t]
        typing = types.get(writer.fold(name))
        if not typing:
            continue
        (cur if is_curated(row) else over).append((row, type_set(typing), floor_value(floor)))

    for row, (poi_types, kind), floor in over:
        oid = sql_escape(row['overture_id'])
        yield (f"UPDATE overture_poi SET primary_poi_type = {sql_escape(poi_types[0])}, "
               f"floor = {sql_escape(floor)}, updated_at = {sql_escape(today)} "
               f"WHERE overture_id = {oid};\n")
        yield f"DELETE FROM overture_poi_type WHERE overture_id = {oid};\n"
        yield ('INSERT INTO overture_poi_type (overture_id, poi_type, rank) VALUES '
               + ', '.join(f'({oid}, {sql_escape(p)}, {i})' for i, p in enumerate(poi_types)) + ';\n')
        yield f"DELETE FROM overture_poi_attribute WHERE overture_id = {oid} AND dimension = 'store_kind';\n"
        if kind:
            yield (f"INSERT INTO overture_poi_attribute (overture_id, dimension, value) "
                   f"VALUES ({oid}, 'store_kind', {sql_escape(kind)});\n")

    for row, (poi_types, kind), floor in cur:
        pid = sql_escape(row['poi_id'])
        yield (f"UPDATE curated_poi SET primary_poi_type = {sql_escape(poi_types[0])}, "
               f"floor = {sql_escape(floor)}, updated_at = {sql_escape(today)}, "
               f"updated_by = {sql_escape(writer.ACTOR)} WHERE poi_id = {pid};\n")
        yield (f"DELETE FROM curated_poi_attribute WHERE poi_id = {pid} "
               f"AND dimension IN ('store_kind', {sql_escape(writer.EXTRA_TYPE_DIMENSION)});\n")
        values = ([f"({pid}, 'store_kind', {sql_escape(kind)})"] if kind else []) + [
            f"({pid}, {sql_escape(writer.EXTRA_TYPE_DIMENSION)}, {sql_escape(p)})" for p in poi_types[1:]]
        if values:
            yield writer.ATTRIBUTE_INSERT_PREFIX + ',\n'.join(values) + writer.ATTRIBUTE_INSERT_SUFFIX


def withdrawals(rows, ticket, today):
    """(row, reason) pairs -> tombstones. Nothing is deleted."""
    over = [(r, why) for r, why in rows if not is_curated(r)]
    cur = [(r, why) for r, why in rows if is_curated(r)]
    if over:
        yield ('INSERT OR IGNORE INTO poi_source_correction (source, source_id, visible, review_note, created_at) VALUES\n'
               + ',\n'.join(f"  ('overture', {sql_escape(r['overture_id'])}, 0, "
                            f"{sql_escape(f'{ticket}: {why}')}, {sql_escape(today)})" for r, why in over)
               + ';\n')
    for r, why in cur:
        yield (f"UPDATE curated_poi SET status = 'removed', removed_at = {sql_escape(today)}, "
               f"removed_by = {sql_escape(writer.ACTOR)}, removal_reason = {sql_escape(f'{ticket}: {why}')} "
               f"WHERE status = 'active' AND poi_id = {sql_escape(r['poi_id'])};\n")


def plan(tenants, held, osm, mall_name, slug, types, confirmed=None, address_words=(), far=()):
    """`far` are rows outside the buffer whose address is the centre's own —
    the same shop pinned 100 m to 2 km away. Their coordinate is wrong, so
    they never answer a unit; each is withdrawn, as a twin or as unlisted."""
    footprint = mall_footprints.load()[mall_name]
    certain = lambda row: withdrawable(row, footprint, address_words)  # noqa: E731
    answers, twins, unlisted = assign(tenants, held, mall_name, confirmed, certain)

    withdraw, kept_outside = [], []
    for row, t in twins:
        if certain(row):
            withdraw.append((row, f'same shop as listed {tenants[t][0]!r}, held twice; the other row kept'))
        else:
            kept_outside.append(row)      # a branch on the street, not a second copy
    tokens = mall_tokens(mall_name)
    for row in far:
        r_key = tenant_key(row['name'], tokens)
        best = max(((key_score(tenant_key(n, tokens), r_key), n) for n, _ in tenants), default=(0, None))
        metres = round(mall_footprints.metres_outside(row['lat'], row['lng'], footprint))
        if best[0] >= CONFIDENT_THRESHOLD:
            withdraw.append((row, f'listed {best[1]!r} pinned {metres} m outside {mall_name}; '
                                  f'the unit is held inside'))
        else:
            withdraw.append((row, f"{mall_name}'s address but not on its tenant list, pinned {metres} m outside"))
    for row in unlisted:
        if withdrawable(row, footprint, address_words):
            withdraw.append((row, f'not on the {mall_name} tenant list'))
        else:
            kept_outside.append(row)

    # Unanswered units are written. OSM rows the comparison paired with a
    # tenant are renamed to it, so `placements` can find them by name.
    missing = [(name, floor_value(floor)) for t, (name, floor) in enumerate(tenants) if t not in answers]
    result = mall_tenants.compare([n for n, _ in missing], [], osm, mall_name, covers=None)
    paired = [dict(o, name=tenant) for tenant, o in result['add'] if o is not None]
    to_write, _, untyped = writer.placements(missing, [], paired, footprint, slug, types, mall_name)
    return {'answers': answers, 'withdraw': withdraw, 'kept_outside': kept_outside,
            'to_write': to_write, 'untyped': untyped}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--list', required=True)
    parser.add_argument('--types', required=True)
    parser.add_argument('--held', required=True, help='JSON rows served inside the buffered footprint')
    parser.add_argument('--osm', required=True)
    parser.add_argument('--mall', required=True, help="the centre's name in footprints.json")
    parser.add_argument('--slug', required=True)
    parser.add_argument('--ticket', required=True)
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--today', required=True)
    parser.add_argument('--out', help='write the statements here')
    parser.add_argument('--plan', help='write the plan as JSON here')
    parser.add_argument('--address-words', default='',
                        help='comma-separated: an address containing one marks a ring row as the centre\'s')
    parser.add_argument('--far', help="JSON rows outside the buffer carrying the centre's own address")
    args = parser.parse_args(argv)

    tenants = mall_tenants.read_tenant_list(args.list)
    types = writer.read_types(args.types)
    held = json.load(open(args.held, encoding='utf-8'))
    osm = json.load(open(args.osm, encoding='utf-8'))
    result = plan(tenants, held, osm, args.mall, args.slug, types,
                  mall_tenants.confirmed_pairs(mall_name=args.mall),
                  [w.strip() for w in args.address_words.split(',')],
                  json.load(open(args.far, encoding='utf-8')) if args.far else ())

    print(f"{len(tenants)} listed: {len(result['answers'])} held, {len(result['to_write'])} to write "
          f"({sum(r['placed_by'] == 'osm' for r in result['to_write'])} by OSM), "
          f"{len(result['untyped'])} untyped; {len(result['withdraw'])} to withdraw, "
          f"{len(result['kept_outside'])} neighbours kept", file=sys.stderr)
    for name in result['untyped']:
        print(f'  UNTYPED, not written: {name}', file=sys.stderr)

    if args.plan:
        json.dump({
            'held': [{'tenant': tenants[t][0], 'row': row_id(r), 'name': r['name']}
                     for t, r in sorted(result['answers'].items())],
            'write': [{k: r[k] for k in ('tenant', 'poi_id', 'placed_by', 'floor', 'primary', 'kind')}
                      for r in result['to_write']],
            'withdraw': [{'row': row_id(r), 'name': r['name'], 'why': why} for r, why in result['withdraw']],
            'kept_outside': [{'row': row_id(r), 'name': r['name'], 'type': r.get('primary_poi_type')}
                             for r in result['kept_outside']],
        }, open(args.plan, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    out = open(args.out, 'w', encoding='utf-8') if args.out else sys.stdout
    for statement in withdrawals(result['withdraw'], args.ticket, args.today):
        out.write(statement)
    for statement in held_updates(result['answers'], tenants, types, args.today):
        out.write(statement)
    for statement in writer.statements(result['to_write'], args.today, args.run_id):
        out.write(statement)
    if args.out:
        out.close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
