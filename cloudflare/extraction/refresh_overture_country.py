"""
KAN-456. An Overture refresh: the same country on a newer release, as an
upsert on the GERS id — never a second copy, never a delete.

The country run (`run_job.run_overture_country`) becomes a refresh when the
Worker hands it the archive key of the source it is replacing
(`OVERTURE_PREVIOUS_SOURCE_KEY`). Both archives are then local files, and
the whole diff is computed locally, the way the KAN-455 repromote dry run
is: nothing here scans a country in D1.

  new       ids in the new archive, absent from the previous one
  changed   ids in both whose name, coordinates, address or category differ
  retired   ids in the previous archive, absent from the new one
  unchanged the rest

What each set does to production, all through bounded statements (≤ 150 ids
per IN list, ≤ MAX_STATEMENT_BYTES / MAX_VALUES_TERMS per VALUES list, one
request each, idempotent):

  * every row of the new archive is upserted into `overture_candidate` by
    `load_overture_candidates.load` (moved to the new source key, its
    values refreshed, `last_seen_source_key` set); a row whose category
    changed goes back to `pending` so the rules decide it again. A name or
    coordinate change alone keeps the decision — it is the same place;
  * changed rows already served get their served fields refreshed in
    `overture_poi` (name, dedupe_name, coordinates, geohash, address,
    category, confidence). Types, brand, attributes and overrides are the
    decision, not the source, and stay;
  * retired rows get `overture_poi.retired_in_release = <release>`; nearby
    serves only NULL. Nothing else about the row changes, so a later release
    that lists the id again clears the mark (`unretire`) and the row is
    served with its reviewed decision intact;
  * the pending rows of the new key (new + category-changed) are promoted by
    `promote_overture_candidates.run_country`, which now joins the reviewed
    overrides of every earlier archive of the same country (the lineage), so
    an exact-id decision survives the key change.

Dry run: `python3 refresh_overture_country.py <previous.csv> <new.csv>`
prints the four counts and writes nothing.
"""
from __future__ import annotations

import csv
import os
import sys

EXTRACTION_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, EXTRACTION_DIR)

from classify_and_load import MAX_STATEMENT_BYTES, byte_len, encode_geohash, normalize_text, sql_escape  # noqa: E402

D1_ID_BATCH = 150
MAX_VALUES_TERMS = 500
# The source fields whose change means the served row must be refreshed.
COMPARED_FIELDS = ('name', 'lat', 'lng', 'address', 'category')


def archive_rows(csv_path):
    """{overture_id: row} for the rows the loader would stage (same rule as
    load_overture_candidates.candidate_rows: id, name and both coordinates
    present; first occurrence wins)."""
    out = {}
    with open(csv_path, newline='') as handle:
        for row in csv.DictReader(handle):
            overture_id = (row.get('overture_id') or '').strip()
            name = (row.get('name') or '').strip()
            lat = (row.get('lat') or '').strip()
            lng = (row.get('lng') or '').strip()
            if not overture_id or not name or not lat or not lng or overture_id in out:
                continue
            out[overture_id] = {
                'overture_id': overture_id, 'name': name, 'lat': float(lat), 'lng': float(lng),
                'address': (row.get('address') or '').strip() or None,
                'category': (row.get('category') or '').strip() or None,
                'confidence': float(row['confidence']) if (row.get('confidence') or '').strip() else None,
            }
    return out


def diff_archives(previous, current):
    """The four sets, from two {id: row} maps. `changed` carries the new row
    and which fields moved, so the report can say what a release did."""
    new, changed, retired, unchanged = [], [], [], []
    for overture_id, row in current.items():
        before = previous.get(overture_id)
        if before is None:
            new.append(overture_id)
            continue
        moved = tuple(f for f in COMPARED_FIELDS if before.get(f) != row.get(f))
        if moved:
            changed.append((overture_id, moved))
        else:
            unchanged.append(overture_id)
    for overture_id in previous:
        if overture_id not in current:
            retired.append(overture_id)
    return {'new': new, 'changed': changed, 'retired': retired, 'unchanged': unchanged}


def in_batches(items, size=D1_ID_BATCH):
    items = list(items)
    for start in range(0, len(items), size):
        yield items[start:start + size]


def id_list(ids):
    return ','.join(sql_escape(i) for i in ids)


def retire_statements(retired_ids, release):
    """Mark the rows the release stopped carrying. Guarded on NULL so a rerun
    changes nothing and an earlier retirement keeps its own release."""
    for batch in in_batches(retired_ids):
        yield (
            f"UPDATE overture_poi SET retired_in_release = {sql_escape(release)}, "
            f"updated_at = {sql_escape(release)} "
            f"WHERE retired_in_release IS NULL AND overture_id IN ({id_list(batch)});\n")


def unretire_statements(ids):
    """Clear the mark on rows the release lists again."""
    for batch in in_batches(ids):
        yield (
            "UPDATE overture_poi SET retired_in_release = NULL "
            f"WHERE retired_in_release IS NOT NULL AND overture_id IN ({id_list(batch)});\n")


def repending_statements(ids, release):
    """A category change is a new question for the rules: back to pending,
    with the reason on the row. Guarded so a rejected/pending row is not
    turned into a promoted one by accident (only promoted rows move)."""
    note = sql_escape(f'KAN-456: category changed in {release}; re-decided')
    for batch in in_batches(ids):
        yield (
            f"UPDATE overture_candidate SET promotion_status = 'pending', promotion_note = {note} "
            f"WHERE promotion_status = 'promoted' AND overture_id IN ({id_list(batch)});\n")


# UPDATE … FROM (SQLite ≥ 3.33; D1 is newer). SQLite has no `AS v(a, b)`
# column-alias list, so the VALUES rows are named through a SELECT.
SERVED_REFRESH_PREFIX = (
    'UPDATE overture_poi SET name = v.name, dedupe_name = v.dedupe_name, lat = v.lat, lng = v.lng, '
    'geohash = v.geohash, address = v.address, category = v.category, confidence = v.confidence, '
    'updated_at = v.updated_at FROM (SELECT column1 AS overture_id, column2 AS name, column3 AS dedupe_name, '
    'column4 AS lat, column5 AS lng, column6 AS geohash, column7 AS address, column8 AS category, '
    'column9 AS confidence, column10 AS updated_at FROM (VALUES '
)
SERVED_REFRESH_SUFFIX = ')) AS v WHERE overture_poi.overture_id = v.overture_id;\n'


def served_refresh_value(row, refreshed):
    name = row['name']
    confidence = row.get('confidence')
    return (
        f"({sql_escape(row['overture_id'])},{sql_escape(name)},"
        f"{sql_escape(normalize_text(name) or name.strip().lower())},"
        f"{row['lat']},{row['lng']},{sql_escape(encode_geohash(row['lat'], row['lng']))},"
        f"{sql_escape(row.get('address'))},{sql_escape(row.get('category'))},"
        f"{'NULL' if confidence is None else confidence},{sql_escape(refreshed)})"
    )


def served_refresh_statements(rows, refreshed):
    """Refresh the served fields of changed rows in one bounded UPDATE … FROM
    (VALUES …) per statement. A row not in overture_poi (never promoted,
    rejected, pending) matches nothing and is untouched."""
    overhead = byte_len(SERVED_REFRESH_PREFIX) + byte_len(SERVED_REFRESH_SUFFIX) + 2
    values, size = [], overhead
    for row in rows:
        piece = served_refresh_value(row, refreshed)
        piece_size = byte_len(piece) + 2
        if values and (size + piece_size > MAX_STATEMENT_BYTES or len(values) >= MAX_VALUES_TERMS):
            yield SERVED_REFRESH_PREFIX + ',\n'.join(values) + SERVED_REFRESH_SUFFIX
            values, size = [], overhead
        values.append(piece)
        size += piece_size
    if values:
        yield SERVED_REFRESH_PREFIX + ',\n'.join(values) + SERVED_REFRESH_SUFFIX


def currently_retired_ids():
    """Every retired id in overture_poi — the small set the un-retire pass
    intersects with the new archive. Keyset-paged on the retired index
    through analyse_poi_candidates.paged (its `query` is d1_client.select
    inside the container)."""
    from analyse_poi_candidates import paged
    return {row['overture_id'] for row in paged(
        'overture_poi', ('overture_id',), 'overture_id', 1000,
        where='retired_in_release IS NOT NULL')}


def apply(previous_csv, current_csv, release, refreshed, execute):
    """The refresh's own writes, after the loader has upserted the archive.
    Returns the report counts. `execute` is d1_client.execute."""
    previous = archive_rows(previous_csv)
    current = archive_rows(current_csv)
    sets = diff_archives(previous, current)
    changed_ids = [i for i, _ in sets['changed']]
    category_changed = [i for i, moved in sets['changed'] if 'category' in moved]

    for statement in served_refresh_statements((current[i] for i in changed_ids), refreshed):
        execute(statement)
    for statement in repending_statements(category_changed, release):
        execute(statement)
    for statement in retire_statements(sets['retired'], release):
        execute(statement)
    back = sorted(currently_retired_ids() & set(current))
    for statement in unretire_statements(back):
        execute(statement)
    return {
        'new_rows': len(sets['new']), 'changed_rows': len(changed_ids),
        'category_changed_rows': len(category_changed), 'retired_rows': len(sets['retired']),
        'unretired_rows': len(back), 'unchanged_rows': len(sets['unchanged']),
    }


def main(argv=None):
    import argparse
    parser = argparse.ArgumentParser(description='dry run: diff two Overture country archives')
    parser.add_argument('previous_csv')
    parser.add_argument('current_csv')
    args = parser.parse_args(argv)
    sets = diff_archives(archive_rows(args.previous_csv), archive_rows(args.current_csv))
    category_changed = sum(1 for _, moved in sets['changed'] if 'category' in moved)
    print(f"new {len(sets['new']):,}  changed {len(sets['changed']):,} (category {category_changed:,})  "
          f"retired {len(sets['retired']):,}  unchanged {len(sets['unchanged']):,}")
    print('dry run: nothing read from or written to D1')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
