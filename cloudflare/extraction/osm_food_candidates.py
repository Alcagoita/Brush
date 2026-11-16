"""
KAN-461. Cafés, bakeries and pastelarias from a Geofabrik Portugal extract.

The archived `osm_poi` (August) holds only part of OSM's cafés — 165 in
Lisbon against 1,096 in the 2026-11-14 extract — and none at the Odivelas
block that opened this ticket. This reads the extract for that family only
and writes candidates for `import_osm_archive.py --candidates`.

  amenity=cafe                      -> cafe
  shop=bakery                       -> bakery
  shop=pastry / shop=confectionery  -> bakery
A name that says pastelaria / confeitaria / padaria adds the other of the
two, so a pastelaria is found by a café task and a bread task alike (the
owner's Arcádia ruling, bakery + cafe).

Skipped: no name; a lifecycle prefix (disused:, was:, abandoned:, demolished:,
removed:) on the amenity/shop key; opening_hours=closed. The last-edit date
and check_date are kept on every candidate so freshness can be reported.

    python3 osm_food_candidates.py <portugal.osm.pbf> <out.json> [--family outings]

`--family outings` reads places to visit instead (KAN-461, owner 2026-11-16):
historic, religious, cultural, natural and built landmarks, typed by the
KAN-408 OSM tag rules (`supplement_osm_pois.types_for`) and kept only when
the type is in OUTING_TYPES. Memorial plaques and stumbling stones are
`historic=memorial` but not a place to visit, so they are skipped.
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata

import os

import osmium

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from supplement_osm_pois import types_for as tag_types  # noqa: E402

OUTING_TYPES = frozenset({
    'historical_landmark', 'church', 'mosque', 'museum', 'art_gallery', 'viewpoint', 'waterfall', 'river',
    'mountain', 'lake', 'hot_spring', 'nature_preserve', 'beach', 'botanical_garden', 'hiking_area', 'bridge',
    'lighthouse', 'marina', 'plaza', 'aquarium', 'amusement_park', 'zoo', 'tourist_attraction',
})
NOT_A_VISIT = {('memorial', 'plaque'), ('memorial', 'blue_plaque'), ('memorial', 'stolperstein')}

LIFECYCLE = ('disused:', 'was:', 'abandoned:', 'demolished:', 'removed:')
BAKERY_SHOPS = {'bakery', 'pastry', 'confectionery'}
BAKERY_WORDS = r'\b(pastelaria|confeitaria|padaria|panificadora|pao quente|boulangerie)\b'
CAFE_WORDS = r'\b(pastelaria|confeitaria|cafe|cafetaria|snack)\b'


def fold(value):
    return ''.join(c for c in unicodedata.normalize('NFKD', value.lower()) if not unicodedata.combining(c))


def outing_types(tags):
    """Our types for a place to visit, or [] when the tags are not one."""
    if (tags.get('historic'), tags.get('memorial')) in {(a, b) for a, b in NOT_A_VISIT} or \
            (tags.get('historic') == 'memorial' and tags.get('memorial') in {b for _, b in NOT_A_VISIT}):
        return []
    kept = [t for t in tag_types(tags) if t in OUTING_TYPES]
    return list(dict.fromkeys(kept))


def types_for(tags):
    """[primary, extra?] for the tags, or [] when not in the family."""
    name = fold(tags.get('name', ''))
    if tags.get('amenity') == 'cafe':
        return ['cafe', 'bakery'] if re.search(BAKERY_WORDS, name) else ['cafe']
    if tags.get('shop') in BAKERY_SHOPS:
        return ['bakery', 'cafe'] if re.search(CAFE_WORDS, name) else ['bakery']
    return []


def closed(tags):
    if any(k.startswith(LIFECYCLE) and k.split(':', 1)[1] in ('amenity', 'shop') for k in tags):
        return True
    return (tags.get('opening_hours') or '').strip().lower() == 'closed'


class Reader(osmium.SimpleHandler):
    def __init__(self, family='food'):
        super().__init__()
        self.typer = outing_types if family == 'outings' else types_for
        self.rows, self.skipped = [], {'closed': 0, 'no name': 0}

    def _take(self, kind, oid, tags, lat, lng, ts):
        tags = {t.k: t.v for t in tags}
        poi_types = self.typer(tags)
        if not poi_types:
            return
        if not tags.get('name', '').strip():
            self.skipped['no name'] += 1
            return
        if closed(tags):
            self.skipped['closed'] += 1
            return
        self.rows.append({'osm_id': f'{kind}/{oid}', 'name': tags['name'].strip(), 'lat': lat, 'lng': lng,
                          'types': poi_types, 'edited': ts, 'check_date': tags.get('check_date'),
                          'opening_hours': tags.get('opening_hours'),
                          'address': ', '.join(v for v in (tags.get('addr:street'), tags.get('addr:housenumber'),
                                                           tags.get('addr:city')) if v) or None})

    def node(self, n):
        if n.location.valid():
            self._take('node', n.id, n.tags, n.location.lat, n.location.lon, n.timestamp.strftime('%Y-%m-%d'))

    def area(self, a):
        # A building drawn as an outline: its centre, under the way/relation id.
        try:
            lats, lngs = [], []
            for ring in a.outer_rings():
                for node in ring:
                    lats.append(node.lat); lngs.append(node.lon)
            if lats:
                kind = 'way' if a.from_way() else 'relation'
                self._take(kind, a.orig_id(), a.tags, sum(lats) / len(lats), sum(lngs) / len(lngs),
                           a.timestamp.strftime('%Y-%m-%d'))
        except osmium.InvalidLocationError:
            pass


def main(argv=None):
    argv = argv or sys.argv[1:]
    family = argv[argv.index('--family') + 1] if '--family' in argv else 'food'
    keys = argv[argv.index('--key') + 1].split(',') if '--key' in argv else None
    reader = Reader(family)
    if keys:
        # One phase: only objects carrying one of `keys` reach Python; the
        # filter runs in C++, so a phase reads Portugal in minutes.
        wanted = osmium.filter.KeyFilter(*keys)
        processor = (osmium.FileProcessor(argv[0]).with_locations()
                     .with_areas(osmium.filter.KeyFilter(*keys)).with_filter(wanted))
        for obj in processor:
            if obj.is_node():
                reader.node(obj)
            elif obj.is_area():
                reader.area(obj)
    else:
        reader.apply_file(argv[0], locations=True)
    json.dump({'source': argv[0].rsplit('/', 1)[-1], 'skipped': reader.skipped, 'rows': reader.rows},
              open(argv[1], 'w', encoding='utf-8'), ensure_ascii=False)
    print(f"{len(reader.rows):,} candidates; skipped {reader.skipped}", file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
