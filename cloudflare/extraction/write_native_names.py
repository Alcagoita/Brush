"""
KAN-471 stage 3. Write the reviewed native names into `overture_poi`.

WHAT IT WRITES, AND WHAT IT REFUSES TO

Only `name_local`, `name_local_lang` and the three provenance columns 0054
added. **`name` is never written** — the source's own name stays exactly as
Overture gave it, and the app chooses between the two at display time
(`selectPoiName`). Nothing else is touched: no coordinates, category, types,
attributes, decisions or `name_en`.

Every write is guarded on `name_local IS NULL`, so a row that already has a
native name is left alone and a re-run is a no-op. A row the owner withdrew
(`detect_english_names.WITHDRAWN`) or held back over its type
(`WRONG_TYPE`) is skipped even if a proposal exists for it.

Only `confidence == 'high'` proposals are written. The flagged ones are a
question for a human, and this script is not that human.

THIS IS A VISIBLE CHANGE

With `country_code` set (KAN-472) and no stored preference,
`selectPoiName` defaults to `'native'` and returns `nonBlank(name_local) ||
name`. So a row that gains a `name_local` starts displaying in Portuguese:
`Jerónimos Monastery` becomes `Mosteiro dos Jerónimos` on screen. That is
the point of the ticket, and it is the first change in it a user can see.

ROLLBACK

`--record` lists only the rows THIS run wrote, read back before the write
from the ids that still had `name_local IS NULL`. Recording every proposal
instead would put earlier batches' ids in the file, and a rollback built
from it would clear names this run never touched.

    python3 write_native_names.py --wikidata docs/kan-471/native-name-proposals.json \\
        --translated docs/kan-471/translated-names.json            # dry run
    python3 write_native_names.py … --apply --record docs/kan-471/written-<date>.json
"""
from __future__ import annotations

import argparse
import json
import os
import sys

EXTRACTION_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, EXTRACTION_DIR)

from classify_and_load import MAX_STATEMENT_BYTES, byte_len, sql_escape  # noqa: E402

MAX_VALUES_TERMS = 500

UPDATE_PREFIX = (
    'UPDATE overture_poi SET name_local = v.name_local, name_local_lang = v.name_local_lang, '
    'name_local_source = v.name_local_source, name_local_source_ref = v.name_local_source_ref, '
    'name_local_updated_at = v.name_local_updated_at '
    'FROM (SELECT column1 AS overture_id, column2 AS name_local, column3 AS name_local_lang, '
    'column4 AS name_local_source, column5 AS name_local_source_ref, '
    'column6 AS name_local_updated_at, column7 AS reviewed_name FROM (VALUES '
)
# The native name was reviewed against a PARTICULAR source name. If the row
# has been renamed since — a refresh does exactly that — the review no
# longer applies to what is there, so the write skips it rather than
# attaching a name to a place that may have become something else.
UPDATE_SUFFIX = (')) AS v WHERE overture_poi.overture_id = v.overture_id '
                'AND overture_poi.name = v.reviewed_name '
                'AND overture_poi.name_local IS NULL;\n')


def proposals(wikidata_path, translated_path, skip=None):
    """Every reviewed name to write, newest decision winning. Wikidata first,
    then the translated and owner-confirmed ones, so a name the owner
    confirmed by hand overrides a looked-up one for the same id."""
    import detect_english_names as detect

    skip = set(skip) if skip is not None else (detect.WITHDRAWN | detect.WRONG_TYPE)
    rows = {}
    with open(wikidata_path) as handle:
        for row in json.load(handle)['proposals']:
            rows[row['overture_id']] = {
                'overture_id': row['overture_id'], 'name': row['name'],
                'name_local': row['name_local'], 'name_local_lang': row.get('name_local_lang', 'pt'),
                'source': 'wikidata', 'source_ref': row.get('wikidata_qid'),
            }
    with open(translated_path) as handle:
        for row in json.load(handle)['translated']:
            if row.get('confidence') != 'high':
                continue
            owner = row.get('rule') == 'owner-confirmed'
            # Wikidata records the name; this module derives one. So a
            # derived name must NOT displace a looked-up one for the same id
            # — only a name the owner confirmed by hand outranks it. (The two
            # files are disjoint today, because the translator runs over
            # Wikidata's review list, but nothing in the shapes guarantees
            # that.)
            if row['overture_id'] in rows and not owner:
                continue
            rows[row['overture_id']] = {
                'overture_id': row['overture_id'], 'name': row['name'],
                'name_local': row['name_local'], 'name_local_lang': row.get('name_local_lang', 'pt'),
                'source': 'owner' if owner else 'translated',
                'source_ref': None if owner else row.get('rule'),
            }
    return [row for overture_id, row in sorted(rows.items()) if overture_id not in skip]


def unwritten_ids(ids, d1_read=None):
    """Which of these rows still have no native name, read in bounded
    batches (<= 150 ids per IN, CLAUDE.md's D1 rule).

    This is what makes the rollback record honest: the write is guarded on
    `name_local IS NULL`, so a proposal whose row already carries a name is
    silently skipped, and recording it anyway would let a rollback clear a
    name from an earlier batch."""
    import preflight_foursquare_archive as preflight

    d1_read = d1_read or preflight.d1_read
    ids = list(ids)
    out = set()
    for start in range(0, len(ids), 150):
        batch = ids[start:start + 150]
        values = ','.join(sql_escape(i) for i in batch)
        for row in d1_read('SELECT overture_id FROM overture_poi '
                           f'WHERE name_local IS NULL AND overture_id IN ({values})'):
            out.add(row['overture_id'])
    return out


def value_tuple(row, written_at):
    return (
        f"({sql_escape(row['overture_id'])},{sql_escape(row['name_local'])},"
        f"{sql_escape(row['name_local_lang'])},{sql_escape(row['source'])},"
        f"{sql_escape(row['source_ref'])},{sql_escape(written_at)},"
        f"{sql_escape(row['name'])})"
    )


def statements(rows, written_at):
    """Bounded `UPDATE … FROM (VALUES …)`, one per request, the same shape
    `refresh_overture_country.served_refresh_statements` uses."""
    overhead = byte_len(UPDATE_PREFIX) + byte_len(UPDATE_SUFFIX) + 2
    values, size = [], overhead
    for row in rows:
        piece = value_tuple(row, written_at)
        piece_size = byte_len(piece) + 2
        if values and (size + piece_size > MAX_STATEMENT_BYTES or len(values) >= MAX_VALUES_TERMS):
            yield UPDATE_PREFIX + ',\n'.join(values) + UPDATE_SUFFIX
            values, size = [], overhead
        values.append(piece)
        size += piece_size
    if values:
        yield UPDATE_PREFIX + ',\n'.join(values) + UPDATE_SUFFIX


def main(argv=None):
    parser = argparse.ArgumentParser(description='KAN-471 stage 3: write the reviewed native names')
    parser.add_argument('--wikidata', required=True)
    parser.add_argument('--translated', required=True)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--record', help='write the rollback record (JSON) here')
    parser.add_argument('--work-dir')
    args = parser.parse_args(argv)

    rows = proposals(args.wikidata, args.translated)
    by_source = {}
    for row in rows:
        by_source[row['source']] = by_source.get(row['source'], 0) + 1
    print(f'{len(rows):,} reviewed names to write: ' +
          ', '.join(f'{count:,} {source}' for source, count in sorted(by_source.items())), file=sys.stderr)
    for row in rows[:10]:
        print(f"  {row['name'][:40]:40} -> {row['name_local'][:40]:40} [{row['source']}]", file=sys.stderr)

    from datetime import datetime, timezone
    written_at = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    planned = list(statements(rows, written_at))
    print(f'{len(planned)} statements planned', file=sys.stderr)

    if not args.apply:
        if planned:
            print(planned[0][:400] + '…')
        else:
            print('nothing to write: every proposal is already written, withdrawn or flagged')
        print('\ndry run: nothing written. Re-run with --apply.', file=sys.stderr)
        return 0

    import tempfile
    from import_foursquare_tourism import d1_write

    # Read, BEFORE writing, which rows this run will actually touch.
    writing = unwritten_ids([row['overture_id'] for row in rows]) if args.record else None
    if writing is not None:
        print(f'{len(writing):,} of {len(rows):,} rows have no native name yet; '
              f'the rest are already written', file=sys.stderr)

    work_dir = args.work_dir or tempfile.mkdtemp(prefix='kan471-write-')
    for index, statement in enumerate(planned, 1):
        changes = d1_write(statement, work_dir)
        print(f'[{index}/{len(planned)}] changes={changes}', file=sys.stderr)

    if args.record:
        written = [row for row in rows if row['overture_id'] in writing]
        with open(args.record, 'w') as handle:
            json.dump({'written_at': written_at, 'prior_value': None,
                       'rows': written}, handle, ensure_ascii=False, indent=1, sort_keys=True)
        print(f'rollback record written to {args.record}: {len(written):,} rows', file=sys.stderr)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
