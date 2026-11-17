"""
KAN-461. A place we rejected never comes back.

`poi_source_correction` with `visible = 0` is the rejection list: one row
per source id we decided against (source, id, reason in `review_note`). It
outlives the row it rejected — the served row can be deleted to free space,
the marker stays, and every importer refuses that id again (owner,
2026-11-17: "If they were rejected, there is a reason").

The check is in the SQL each importer sends, not in a list the script reads
first, so a script that forgets to load the list still cannot write a
rejected id:

  * `overture_candidate`  — `load_overture_candidates` stages nothing whose
    GERS id is rejected;
  * `curated_poi`         — the OSM and Foursquare importers write nothing
    whose origin (OSM element, Foursquare id) is rejected;
  * `curated_poi_attribute` — no attribute without its curated row, so a
    refused insert leaves nothing behind.

Rows rejected by a *rule* (a category we do not serve) need no marker: the
loader does not stage them (`load_overture_candidates.REJECTED_CATEGORIES`),
and a later decision to serve the category brings them back on purpose.
"""

# curated_poi.origin_source → poi_source_correction.source. The curated
# table names its origins in more than one spelling; the registry has one.
CORRECTION_SOURCE = {
    'openstreetmap': 'openstreetmap',
    'osm': 'openstreetmap',
    'foursquare': 'foursquare',
    'foursquare_os_places': 'foursquare',
    'overture': 'overture',
}


def _source_case(column):
    whens = ' '.join(f"WHEN '{k}' THEN '{v}'" for k, v in CORRECTION_SOURCE.items())
    return f'CASE {column} {whens} END'


def rejected_overture(id_column):
    """SQL predicate: this GERS id is on the rejection list."""
    return (f"{id_column} IN (SELECT source_id FROM poi_source_correction "
            f"WHERE source = 'overture' AND visible = 0)")


def rejected_origin(source_column, id_column):
    """SQL predicate: this curated origin (source, id) is on the rejection list."""
    return (f'EXISTS (SELECT 1 FROM poi_source_correction c WHERE c.visible = 0 '
            f'AND c.source = {_source_case(source_column)} AND c.source_id = {id_column})')


def guarded_values(table_and_columns, where):
    """(prefix, middle) for `INSERT INTO t (…) SELECT * FROM (VALUES …) AS v WHERE …`.

    SQLite names the VALUES columns column1…columnN. The WHERE is also what
    lets an ON CONFLICT clause follow an INSERT … SELECT without the parser
    reading it as a join constraint."""
    return f'INSERT INTO {table_and_columns} SELECT * FROM (VALUES\n', f'\n) AS v WHERE {where}'
