"""KAN-450. An on-demand Place is built from Overture, and exports Overture.

    MODE=place TARGET=osm-relation-2897141      (the Worker's trigger, unchanged)

Until this, `POST /coverage/request` started a Foursquare pull into the
`poi` table — a table `/poi` stopped reading at KAN-438 — on a JWT renewed
by hand. The Place reported `mapped`, the user got the OSM supplement and
nothing else, and the Trip Planner downloaded a Foursquare-shaped SQLite
nobody was refreshing.

The Place path is now the country path in miniature, on the same code:

  1. Nominatim bbox and country for the Place (one lookup, as before);
  2. `extract_overture.extract_bbox`, filtered on `addresses[].country` so a
     border town does not import the neighbour;
  3. the raw CSV archived to R2 under `overture-place-sources/`, the key
     that `overture_candidate.country_source_r2_key` records and that
     `overtureCandidateOverrides.json` is keyed on — so reviewed overrides
     apply to a Place build exactly as to a country build;
  4. `load_overture_candidates.load` and `promote_overture_candidates
     .run_country`, scoped to that key: chain rules, evidence batches and
     the category map are the same decision the country run makes;
  5. the OSM supplement, unchanged (KAN-394);
  6. an Overture SQLite export of the served rows inside the bbox, the
     contract the app's trip download reads (KAN-451), uploaded to
     `exports/<place_id>/<build_id>.sqlite` where `/export/` already looks;
  7. `build_complete` with the extent actually pulled.

Same failure contract as the Foursquare path: `place-failed` before a
build id exists, `build_complete{failed}` after; a container that never
starts is reset by the Worker. The export is also written for every mapped
settlement after a country run, so PT towns stop serving the snapshot.
"""
import datetime
import os
import sqlite3
import sys
import traceback
import uuid

EXTRACTION_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, EXTRACTION_DIR)

import d1_client
import r2_client
import worker_client
import nominatim_client
import extract
import extract_overture
import load_overture_candidates
import promote_overture_candidates
import supplement_osm_pois
import enrich_osm_cuisine
from analyse_poi_candidates import paged
from load_overture_candidates import sql_escape

EXPORT_VERSION = 'overture-export-v1'
BUILD_SOURCE = 'overture_places'
PROMOTION_PAGE_SIZE = 500
EXPORT_PAGE_SIZE = 1000


# --------------------------------------------------------------------------- export

def bbox_where(min_lat, max_lat, min_lng, max_lng):
    return (f'lat BETWEEN {float(min_lat)!r} AND {float(max_lat)!r} '
            f'AND lng BETWEEN {float(min_lng)!r} AND {float(max_lng)!r}')


def served_rows(min_lat, max_lat, min_lng, max_lng):
    """The rows `/poi` would serve inside the box, with their types and
    attributes, read in keyset pages (D1 charges for skipped rows)."""
    pois = list(paged(
        'overture_poi',
        ('overture_id', 'name', 'lat', 'lng', 'primary_poi_type', 'brand', 'address', 'open_min', 'close_min'),
        'overture_id', EXPORT_PAGE_SIZE, where=bbox_where(min_lat, max_lat, min_lng, max_lng)))
    ids = [row['overture_id'] for row in pois]
    types, attributes = [], []
    # ≤150 ids per IN(...): the request-size limit that broke KAN-448.
    for start in range(0, len(ids), 150):
        chunk = ','.join(sql_escape(i) for i in ids[start:start + 150])
        types.extend(d1_client.select(
            f'SELECT overture_id, poi_type, rank FROM overture_poi_type WHERE overture_id IN ({chunk})'))
        attributes.extend(d1_client.select(
            f'SELECT overture_id, dimension, value FROM overture_poi_attribute WHERE overture_id IN ({chunk})'))
    return pois, types, attributes


def write_export(place_id, build_id, pois, types, attributes, out_path):
    """The client-download export, Overture-shaped.

    Same idea as classify_and_load.write_sqlite_export: one Place, one build,
    flattened, with `_export_meta` carrying what the app compares against
    `/coverage` before re-downloading. `overture_id` is the key, named for
    what it is — the app records provenance per source (CLAUDE.md), and a
    column called `fsq_place_id` holding Overture ids is how that gets lost.
    """
    if os.path.exists(out_path):
        os.remove(out_path)
    connection = sqlite3.connect(out_path)
    connection.executescript("""
        CREATE TABLE poi (
          overture_id      TEXT PRIMARY KEY,
          name             TEXT NOT NULL,
          lat              REAL NOT NULL,
          lng              REAL NOT NULL,
          primary_poi_type TEXT NOT NULL,
          brand            TEXT,
          address          TEXT,
          open_min         INTEGER,
          close_min        INTEGER
        );
        CREATE TABLE poi_type (
          overture_id TEXT NOT NULL,
          poi_type    TEXT NOT NULL,
          rank        INTEGER NOT NULL,
          PRIMARY KEY (overture_id, poi_type)
        );
        CREATE TABLE poi_attribute (
          overture_id TEXT NOT NULL,
          dimension   TEXT NOT NULL,
          value       TEXT NOT NULL,
          PRIMARY KEY (overture_id, dimension, value)
        );
        CREATE INDEX idx_poi_type_lookup ON poi_type (poi_type);
        CREATE TABLE _export_meta (
          place_id         TEXT NOT NULL,
          build_id         TEXT NOT NULL,
          generated_at     TEXT NOT NULL,
          pipeline_version TEXT NOT NULL,
          source           TEXT NOT NULL,
          row_count        INTEGER NOT NULL
        );
    """)
    connection.executemany(
        'INSERT INTO poi VALUES (?,?,?,?,?,?,?,?,?)',
        [(r['overture_id'], r['name'], r['lat'], r['lng'], r['primary_poi_type'], r.get('brand'),
          r.get('address'), r.get('open_min'), r.get('close_min')) for r in pois])
    connection.executemany('INSERT OR IGNORE INTO poi_type VALUES (?,?,?)',
                           [(r['overture_id'], r['poi_type'], r['rank']) for r in types])
    connection.executemany('INSERT OR IGNORE INTO poi_attribute VALUES (?,?,?)',
                           [(r['overture_id'], r['dimension'], r['value']) for r in attributes])
    connection.execute('INSERT INTO _export_meta VALUES (?,?,?,?,?,?)', (
        place_id, build_id, datetime.datetime.now(datetime.timezone.utc).isoformat(),
        EXPORT_VERSION, BUILD_SOURCE, len(pois)))
    connection.commit()
    connection.close()
    return out_path


def export_place(place_id, build_id, bbox):
    """Write and upload the export for one Place; returns (rows, extent)."""
    pois, types, attributes = served_rows(*bbox)
    local = os.path.join(extract.BUILD_DIR, f'export_{place_id}_{build_id}.sqlite')
    try:
        write_export(place_id, build_id, pois, types, attributes, local)
        r2_client.upload_file(local, f'exports/{place_id}/{build_id}.sqlite')
    finally:
        # A country run writes one of these per settlement; R2 holds the
        # copy that matters.
        if os.path.exists(local):
            os.remove(local)
    return len(pois), extent_of(pois)


# --------------------------------------------------------------------------- build log

def open_build(place_id, build_id, started_at):
    d1_client.execute(
        'INSERT INTO build_log (build_id, place_id, started_at, status, pipeline_version, source) VALUES '
        f"({sql_escape(build_id)}, {sql_escape(place_id)}, {sql_escape(started_at)}, 'building', "
        f"{sql_escape(EXPORT_VERSION)}, {sql_escape(BUILD_SOURCE)})")


def extent_of(pois):
    if not pois:
        return None
    lats = [r['lat'] for r in pois]
    lngs = [r['lng'] for r in pois]
    return {'min_lat': min(lats), 'max_lat': max(lats), 'min_lng': min(lngs), 'max_lng': max(lngs)}


# --------------------------------------------------------------------------- place

def map_place(place_id):
    """The Overture Place build. Raises after reporting, like the old path."""
    print(f'[overture_place] mapping place: {place_id}')
    # Reads through the binding, as run_overture_country does; the Worker
    # sets this too, and a propagation regression must not reach npx.
    os.environ['D1_INTERNAL'] = '1'
    stage = 'resolve_place_bounds'
    try:
        bbox, country_code = nominatim_client.lookup_place(place_id)
    except Exception as error:
        print(f'[overture_place] {error} — cannot scope extraction, failing the Place')
        worker_client.place_failed(place_id, stage, type(error).__name__)
        raise
    if not country_code:
        print(f'[overture_place] {place_id}: Nominatim gave no country; the bbox pull is unfiltered')

    build_id = str(uuid.uuid4())
    work_dir = os.path.join(extract.BUILD_DIR, f'overture-place-{build_id}')
    os.makedirs(work_dir, exist_ok=True)
    csv_path = os.path.join(work_dir, f'{place_id}.csv')
    raw_key = f'overture-place-sources/{place_id}/{build_id}.csv'
    opened = False
    try:
        stage = 'overture_extract'
        extract_overture.extract_bbox(*bbox, out_path=csv_path, country=country_code)
        stage = 'raw_extract_upload'
        r2_client.upload_file(csv_path, raw_key)
        stage = 'build_log'
        open_build(place_id, build_id, datetime.datetime.now(datetime.timezone.utc).isoformat())
        opened = True
        stage = 'stage_candidates'
        staged = load_overture_candidates.load(csv_path, raw_key)
        stage = 'promote'
        decisions = promote_overture_candidates.run_country(PROMOTION_PAGE_SIZE, raw_key)
        # KAN-394 — before the Place is reported mapped, so `mapped` means the
        # same thing however the Place got here. Never fails the Place.
        stage = 'osm_supplement'
        supplement_place_with_osm(place_id, *bbox, country_code=country_code)
        stage = 'export'
        rows_loaded, extent = export_place(place_id, build_id, bbox)
        stage = 'build_complete_callback'
        worker_client.build_complete(
            place_id=place_id, build_id=build_id,
            rows_loaded=rows_loaded, rows_skipped=max(staged - rows_loaded, 0),
            r2_key=raw_key, extent=extent)
        print(f'[overture_place] place {place_id} mapped: {rows_loaded} rows served, decisions {decisions}')
        return {'build_id': build_id, 'rows_loaded': rows_loaded, 'staged': staged, 'decisions': decisions}
    except Exception as error:
        traceback.print_exc()
        if opened:
            worker_client.build_failed(place_id, build_id)
        else:
            worker_client.place_failed(place_id, stage, type(error).__name__)
        raise


def supplement_place_with_osm(place_id, min_lat, max_lat, min_lng, max_lng, country_code=None):
    """The per-Place OSM pass (KAN-394), unchanged from the Foursquare path:
    additive, idempotent on element id, and never fails the Place."""
    try:
        imports, stats, conflicts = supplement_osm_pois.supplement_scope(
            place_id, min_lat, max_lat, min_lng, max_lng)
        for statement in supplement_osm_pois.statements_for_pois(imports):
            d1_client.execute(statement)
        for statement in supplement_osm_pois.statements_for_conflicts(
                conflicts, country_code=country_code, place_id=place_id):
            d1_client.execute(statement)
        print(f"[overture_place] {place_id}: OSM supplement added "
              f"{stats.get('unique_rows_to_write', 0)} rows, {len(conflicts)} source conflicts")
        return stats
    except enrich_osm_cuisine.OverpassRateLimited:
        traceback.print_exc()
        print(f'[overture_place] {place_id}: Overpass rate limited — completing with Overture only')
        return None
    except Exception:
        traceback.print_exc()
        print(f'[overture_place] {place_id}: OSM supplement failed — completing with Overture only')
        return None


# --------------------------------------------------------------------------- country

def export_country_places(country_code, run_id):
    """After a country run: an export for every mapped settlement, so the
    trip download stops serving the Foursquare snapshot.

    One build per settlement, keyed on the country run; a settlement whose
    export fails is logged and left on its previous build rather than
    failing the run — the D1 rows are already served.
    """
    try:
        places = d1_client.select(
            'SELECT place_id, min_lat, max_lat, min_lng, max_lng FROM place '
            f"WHERE country_code = {sql_escape(country_code)} AND status = 'mapped' AND min_lat IS NOT NULL")
    except Exception:
        traceback.print_exc()
        print(f'[overture_place] {country_code}: could not list settlements; no exports written')
        return {'exported': 0, 'failed': 0}
    written = failed = 0
    for place in places:
        build_id = f'{run_id}-{place["place_id"]}'
        bbox = (place['min_lat'], place['max_lat'], place['min_lng'], place['max_lng'])
        try:
            started = datetime.datetime.now(datetime.timezone.utc).isoformat()
            open_build(place['place_id'], build_id, started)
            rows, _ = export_place(place['place_id'], build_id, bbox)
            worker_client.build_complete(place_id=place['place_id'], build_id=build_id,
                                         rows_loaded=rows, rows_skipped=0, r2_key=None)
            written += 1
        except Exception:
            traceback.print_exc()
            failed += 1
    print(f'[overture_place] {country_code}: exports written for {written} settlements, {failed} failed')
    return {'exported': written, 'failed': failed}
