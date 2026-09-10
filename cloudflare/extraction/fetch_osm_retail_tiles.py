"""KAN-444. Fetches OSM retail evidence for the residual rows Foursquare missed.

Targeted, not a country sweep: the tiles fetched are only those that actually
contain an unresolved Overture row. For Portugal's 4,372 unresolved rows that is
~900 small queries instead of one national extract, which is both far less data
and much kinder to a volunteer-run Overpass.

Runs locally and on purpose. Overpass rate-limits datacenter egress harder than
residential, and a 429 here means stop for everyone — so this is a job to run
once, politely, from a workstation, not a container.

Every tile is checkpointed as it lands. An interrupted run resumes instead of
replaying 900 queries, which is the difference between a retry being free and
a retry being another hour of somebody else's server time.
"""
import argparse
import csv
import json
import os
import sys
import time
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from enrich_osm_cuisine import OverpassRateLimited, fetch_overpass

# Version the contract. `shop=*` is not "all stores" and must never be reported
# as though it were: this is the list we actually asked for, and the report
# names it so a future reader can tell coverage from omission.
TAG_CONTRACT_VERSION = 'kan-444-retail-v1'

RETAIL_AMENITIES = ('marketplace', 'pharmacy', 'fuel', 'post_office', 'bank',
                    'bureau_de_change', 'veterinary')
# Ruling a row out resolves it just as well as naming its subtype, so the
# query deliberately also asks for the things a consumer store is not.
EXCLUDING_AMENITIES = ('clinic', 'dentist', 'doctors', 'school', 'driving_school')

TILE = 0.05  # ~5.5 km; the tile the point sits in, plus its own margin
REQUEST_SPACING_S = 1.5


def tile_query(min_lat, min_lng, max_lat, max_lng):
    bbox = f'{min_lat:.4f},{min_lng:.4f},{max_lat:.4f},{max_lng:.4f}'
    clauses = [
        f'nwr["shop"]({bbox});',
        f'nwr["craft"]({bbox});',
        f'nwr["healthcare"]({bbox});',
        f'nwr["office"]({bbox});',
        f'nwr["amenity"~"^({"|".join(RETAIL_AMENITIES + EXCLUDING_AMENITIES)})$"]({bbox});',
    ]
    # `out center tags` so a way or relation reports one coordinate; a shop
    # mapped as a building outline is the same evidence as one mapped as a node.
    return f'[out:json][timeout:90];({"".join(clauses)});out center tags;'


def tiles_for(points):
    cells = defaultdict(int)
    for lat, lng in points:
        cells[(int(lat // TILE), int(lng // TILE))] += 1
    return sorted(cells)


def done_tiles(checkpoint_path):
    if not os.path.exists(checkpoint_path):
        return set()
    with open(checkpoint_path) as handle:
        return {tuple(json.loads(line)['tile']) for line in handle if line.strip()}


def element_rows(payload):
    for element in payload.get('elements', ()):
        tags = element.get('tags') or {}
        lat = element.get('lat', (element.get('center') or {}).get('lat'))
        lng = element.get('lon', (element.get('center') or {}).get('lon'))
        name = tags.get('name') or tags.get('brand') or tags.get('operator')
        # A place with no name cannot be matched to an Overture row by name,
        # and name is the only thing this join matches on.
        if lat is None or lng is None or not name:
            continue
        yield {
            'osm_id': f"{element['type']}/{element['id']}",
            'name': name,
            'lat': lat,
            'lng': lng,
            'tags': tags,
        }


def tag_families(tags):
    families = []
    for key in ('shop', 'craft', 'healthcare', 'office', 'amenity'):
        if key in tags:
            families.append(f'{key}={tags[key]}')
    return families


def run(points_path, checkpoint_path, report_path):
    with open(points_path, newline='') as handle:
        points = [(float(row['lat']), float(row['lng']))
                  for row in csv.DictReader(handle, delimiter='\t')
                  if row['decision'] == 'insufficient_evidence' and row['lat']]
    tiles = tiles_for(points)
    already = done_tiles(checkpoint_path)
    pending = [tile for tile in tiles if tile not in already]
    print(f'{len(points):,} unresolved points -> {len(tiles):,} tiles '
          f'({len(already):,} already fetched, {len(pending):,} pending)', file=sys.stderr)

    families = Counter()
    elements = 0
    started = time.monotonic()
    with open(checkpoint_path, 'a') as handle:
        for index, (cell_lat, cell_lng) in enumerate(pending, 1):
            min_lat, min_lng = cell_lat * TILE, cell_lng * TILE
            query = tile_query(min_lat, min_lng, min_lat + TILE, min_lng + TILE)
            try:
                payload = fetch_overpass(query)
            except OverpassRateLimited:
                # Stop the batch. Another endpoint or a shorter sleep is the
                # wrong answer to a 429 and gets the whole project blocked.
                print(f'\nOverpass returned 429 after {index - 1} tiles this run. '
                      f'Stopping; rerun later to resume from the checkpoint.', file=sys.stderr)
                return 2
            except Exception as error:  # transport failure on one tile
                print(f'  tile {cell_lat},{cell_lng} failed: {error}', file=sys.stderr)
                continue
            rows = list(element_rows(payload))
            elements += len(rows)
            for row in rows:
                families.update(tag_families(row['tags']))
            handle.write(json.dumps({'tile': [cell_lat, cell_lng], 'elements': rows}) + '\n')
            handle.flush()
            if index % 25 == 0 or index == len(pending):
                rate = index / max(time.monotonic() - started, 1e-9)
                remaining = (len(pending) - index) / rate if rate else 0
                print(f'  {index:,}/{len(pending):,} tiles, {elements:,} named elements, '
                      f'~{remaining / 60:.0f} min left', file=sys.stderr)
            time.sleep(REQUEST_SPACING_S)

    report = {
        'tag_contract_version': TAG_CONTRACT_VERSION,
        'retail_amenities': list(RETAIL_AMENITIES),
        'excluding_amenities': list(EXCLUDING_AMENITIES),
        'tiles_total': len(tiles),
        'tiles_fetched_this_run': len(pending),
        'named_elements_this_run': elements,
        'tag_families': dict(families.most_common()),
    }
    with open(report_path, 'w') as handle:
        json.dump(report, handle, indent=2)
    print(f'-> {checkpoint_path}\n-> {report_path}', file=sys.stderr)
    return 0


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--points', required=True, help='decision manifest from match_residual_foursquare.py')
    parser.add_argument('--checkpoint', required=True, help='JSONL, appended per tile, resumable')
    parser.add_argument('--report', required=True)
    args = parser.parse_args(argv)
    return run(args.points, args.checkpoint, args.report)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
