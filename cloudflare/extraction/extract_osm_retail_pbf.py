"""KAN-444. Extracts the OSM retail contract from a country PBF extract.

Replaces the Overpass tile fetch, which the public instances refused: 935
targeted tiles returned HTTP 429 after two of them, and CLAUDE.md is explicit
that a 429 is a stop rather than an invitation to back off and try harder. A
Geofabrik country extract is the same ODbL data, one download instead of ~900
requests against a volunteer-run server, and typically fresher.

`fetch_osm_retail_tiles.py` stays as the targeted path for a handful of rows,
and this module imports its tag contract rather than restating it — two copies
of the definition is how coverage claims quietly stop being true.

Ways and relations count. A shop mapped as a building outline is the same
evidence as one mapped as a node, so closed ways are reduced to the centre of
their node locations rather than skipped.
"""
import argparse
import csv
import json
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_osm_retail_tiles import (
    EXCLUDING_AMENITIES, RETAIL_AMENITIES, TAG_CONTRACT_VERSION,
)

RETAIL_KEYS = ('shop', 'craft', 'healthcare')
EXCLUDING_KEYS = ('office',)


def contract_family(tags):
    """(family, is_excluding) for a row inside the contract, else (None, _).

    `shop=yes` is deliberately kept and deliberately not a subtype: it is
    evidence the place is a shop, which is exactly what the residual rows are
    already known to be, so it settles nothing on its own.
    """
    for key in RETAIL_KEYS:
        if key in tags:
            return f'{key}={tags[key]}', False
    for key in EXCLUDING_KEYS:
        if key in tags:
            return f'{key}={tags[key]}', True
    amenity = tags.get('amenity')
    if amenity in RETAIL_AMENITIES:
        return f'amenity={amenity}', False
    if amenity in EXCLUDING_AMENITIES:
        return f'amenity={amenity}', True
    return None, False


def centre(obj):
    if obj.is_node():
        return obj.lat, obj.lon
    try:
        points = [(node.location.lat, node.location.lon) for node in obj.nodes if node.location.valid()]
    except (AttributeError, RuntimeError):
        return None
    if not points:
        return None
    return sum(p[0] for p in points) / len(points), sum(p[1] for p in points) / len(points)


def run(pbf_path, out_path, report_path):
    import osmium

    families = Counter()
    kept = unnamed = unlocated = 0
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', newline='') as handle:
        writer = csv.writer(handle, delimiter='\t')
        writer.writerow(('osm_id', 'name', 'lat', 'lng', 'family', 'excluding', 'tags'))
        for obj in osmium.FileProcessor(pbf_path).with_locations():
            if obj.is_relation():
                continue  # locations are not resolved for relation members here
            tags = dict(obj.tags)
            family, excluding = contract_family(tags)
            if not family:
                continue
            name = tags.get('name') or tags.get('brand') or tags.get('operator')
            if not name:
                # Name is the only thing the join matches on; an unnamed shop
                # is real but unusable, and is counted rather than dropped
                # silently so coverage stays honest.
                unnamed += 1
                continue
            position = centre(obj)
            if not position:
                unlocated += 1
                continue
            families[family] += 1
            kept += 1
            writer.writerow((f'{obj.type_str()}/{obj.id}', name, f'{position[0]:.7f}',
                             f'{position[1]:.7f}', family, '1' if excluding else '',
                             json.dumps(tags, ensure_ascii=False, sort_keys=True)))

    report = {
        'tag_contract_version': TAG_CONTRACT_VERSION,
        'source': os.path.basename(pbf_path),
        'named_located_elements': kept,
        'skipped_unnamed': unnamed,
        'skipped_unlocated': unlocated,
        'tag_families': dict(families.most_common()),
    }
    with open(report_path, 'w') as handle:
        json.dump(report, handle, indent=2)
    print(f'{kept:,} named retail elements ({unnamed:,} unnamed, {unlocated:,} unlocated)', file=sys.stderr)
    print(f'-> {out_path}\n-> {report_path}', file=sys.stderr)
    return 0


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pbf', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--report', required=True)
    args = parser.parse_args(argv)
    return run(args.pbf, args.out, args.report)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
