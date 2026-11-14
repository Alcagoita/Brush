"""
KAN-517. Give the served rows of a reconciled centre the floor its operator
publishes.

The mall flow (KAN-512 → KAN-514) shows a unit's floor, never a distance, so a
listed unit with no floor shows its name and nothing else. Some operators keep
the floor off the directory and only on each store's own page — UBBO's reads
`Localização: Piso 0 Loja 0.004 C`. This module turns those pages into floors
and writes them onto the rows that already answer the listed units. It adds
no row, withdraws none and changes no type: that is `reconcile_mall_list`.

READING A LOCATION

`floor_from_location` takes the operator's text and returns (floor, how):

  * `Piso N …` states the floor: N.
  * no `Piso`, but a unit number `0.040` / `L0.040` / `Lojas 0.013 + 0.014`:
    the unit's leading digit. At UBBO the unit number agrees with the stated
    Piso on every page that gives both, bar one (below).
  * a named place the centre itself puts on a floor (`Praça Central`, where
    UBBO's own pages put units 0.003 and 0.004): the caller passes it as an
    alias, scoped to that centre.
  * `Piso 0 e 1`: a unit on two floors. The first is true of it and is
    stored; the record says it spans both.
  * a stated Piso that disagrees with the unit number, or nothing to go on:
    no floor. A person decides; nothing is guessed.

Every floor written carries its evidence in the committed record
(`mall_lists/<slug>_floors.tsv`), the way `<slug>_types.tsv` does for types.

    python3 mall_floors.py --pages mall_lists/ubbo_store_pages.tsv \\
        --list mall_lists/ubbo_stores.txt --mall UBBO \\
        --rows served.json [--rows more.json] --alias 'Praça Central=0' \\
        --ticket KAN-517 --today 2026-11-14 \\
        --record mall_lists/ubbo_floors.tsv --out ../migrations/0078_….sql
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import import_mall_tenants as writer  # noqa: E402
import mall_tenants  # noqa: E402
import reconcile_mall_list as reconcile  # noqa: E402

PISO = re.compile(r'\bpiso\s*(-?\d+)(?:\s*e\s*(-?\d+))?', re.I)
UNIT = re.compile(r'(?:^|[\s,.L])(-?\d)\.\d{2,3}', re.I)
CLOSED = re.compile(r'\s*[|–-]\s*encerrad[ao]s?\s+temporariamente\s*$', re.I)


def floor_from_location(text: str, aliases: dict | None = None):
    """(floor | None, how) from an operator's location text."""
    text = (text or '').strip()
    if not text:
        return None, 'the operator states no location'
    stated = PISO.search(text)
    unit = UNIT.search(text)
    if stated:
        floor = writer.floor_value(stated.group(1))
        if unit and writer.floor_value(unit.group(1)) != floor and not stated.group(2):
            return None, f'conflict: Piso {floor} but unit {unit.group(0).strip()}'
        if stated.group(2):
            return floor, f'spans Piso {floor} and {stated.group(2)}; first stored'
        return floor, 'Piso stated'
    if unit:
        return writer.floor_value(unit.group(1)), 'unit number'
    folded = writer.fold(text)
    for place, floor in (aliases or {}).items():
        if writer.fold(place) in folded:
            return writer.floor_value(floor), f'{place} is Piso {floor} (operator)'
    return None, 'the operator states no floor'


def read_pages(path):
    """name, category, location, page — one line per store page."""
    pages = []
    for line in Path(path).read_text(encoding='utf-8').splitlines():
        if not line.strip() or line.startswith('#'):
            continue
        name, _category, location, page = (line.split('\t') + [''] * 4)[:4]
        pages.append({'name': CLOSED.sub('', name).strip(), 'location': location, 'page': page})
    return pages


def row_key(row):
    """(table, id) for a row from a `/poi/nearby` dump."""
    if row.get('source') == 'overture':
        return 'overture', row['poi_id']
    return 'curated', row['poi_id']


def plan(tenants, pages, rows, mall_name, aliases=None, confirmed=None):
    """One record per listed unit: (tenant, page, floor, how, row)."""
    confirmed = confirmed or {}
    page_for, _, _ = reconcile.assign(tenants, pages, mall_name, confirmed=confirmed)
    row_for, _, _ = reconcile.assign(tenants, rows, mall_name, confirmed=confirmed)
    out = []
    for t, (name, _) in enumerate(tenants):
        page = page_for.get(t)
        if page is None:
            floor, how = None, 'no page on the operator site'
        else:
            floor, how = floor_from_location(page['location'], aliases)
        out.append((name, page, floor, how, row_for.get(t)))
    return out


def sql_escape(value):
    return 'NULL' if value is None else "'" + str(value).replace("'", "''") + "'"


def updates(records, today, actor):
    """UPDATE statements for every row whose floor changes."""
    for name, _page, floor, _how, row in records:
        if row is None or floor is None or row.get('floor') == floor:
            continue
        table, rid = row_key(row)
        if table == 'overture':
            yield (f"UPDATE overture_poi SET floor = {sql_escape(floor)}, updated_at = {sql_escape(today)} "
                   f"WHERE overture_id = {sql_escape(rid)};  -- {name}\n")
        else:
            yield (f"UPDATE curated_poi SET floor = {sql_escape(floor)}, updated_at = {sql_escape(today)}, "
                   f"updated_by = {sql_escape(actor)} WHERE poi_id = {sql_escape(rid)};  -- {name}\n")


def record_lines(records, site):
    yield '# tenant\tfloor\thow\toperator location\tpage\trow\n'
    for name, page, floor, how, row in records:
        rid = '' if row is None else ':'.join(row_key(row))
        yield '\t'.join([name, floor or '', how, page['location'] if page else '',
                         (site + page['page']) if page and page['page'] else '', rid]) + '\n'


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pages', required=True)
    ap.add_argument('--list', required=True)
    ap.add_argument('--mall', required=True)
    ap.add_argument('--rows', action='append', required=True, help='/poi/nearby dump(s) inside the outline')
    ap.add_argument('--alias', action='append', default=[], help="'Place=floor', scoped to this centre")
    ap.add_argument('--site', default='')
    ap.add_argument('--ticket', required=True)
    ap.add_argument('--today', required=True)
    ap.add_argument('--record', required=True)
    ap.add_argument('--out', required=True)
    args = ap.parse_args(argv)

    tenants = mall_tenants.read_tenant_list(args.list)
    pages = read_pages(args.pages)
    rows = {}
    for path in args.rows:
        for row in json.load(open(path, encoding='utf-8')):
            if row.get('source') != 'multibanco':
                rows[row['poi_id']] = row
    aliases = dict(a.split('=', 1) for a in args.alias)
    confirmed = mall_tenants.confirmed_pairs(mall_name=args.mall)
    records = plan(tenants, pages, list(rows.values()), args.mall, aliases, confirmed)

    Path(args.record).write_text(''.join(record_lines(records, args.site)), encoding='utf-8')
    actor = f'{args.ticket.lower()}-mall-floors'
    sql = list(updates(records, args.today, actor))
    header = (f'-- {args.ticket}. {args.mall}: the floor each listed unit\'s own page states,\n'
              f'-- written onto the row that answers it. Evidence: {args.record}.\n'
              '-- Floors only: no row added, withdrawn or retyped. Idempotent.\n\n')
    Path(args.out).write_text(header + ''.join(sql), encoding='utf-8')

    placed = sum(1 for r in records if r[2] is not None)
    print(f'{len(records)} listed; {placed} with a floor; {len(sql)} rows updated')
    for name, page, floor, how, row in records:
        if floor is None or row is None:
            print(f'  {name}: {how}' + ('' if row else '; no served row'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
