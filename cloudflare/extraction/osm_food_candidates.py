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

    python3 osm_food_candidates.py <portugal.osm.pbf> <out.json>
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata

import osmium

LIFECYCLE = ('disused:', 'was:', 'abandoned:', 'demolished:', 'removed:')
BAKERY_SHOPS = {'bakery', 'pastry', 'confectionery'}
BAKERY_WORDS = r'\b(pastelaria|confeitaria|padaria|panificadora|pao quente|boulangerie)\b'
CAFE_WORDS = r'\b(pastelaria|confeitaria|cafe|cafetaria|snack)\b'


def fold(value):
    return ''.join(c for c in unicodedata.normalize('NFKD', value.lower()) if not unicodedata.combining(c))


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
    def __init__(self):
        super().__init__()
        self.rows, self.skipped = [], {'closed': 0, 'no name': 0}

    def _take(self, kind, oid, tags, lat, lng, ts):
        tags = {t.k: t.v for t in tags}
        poi_types = types_for(tags)
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
    reader = Reader()
    reader.apply_file(argv[0], locations=True)
    json.dump({'source': argv[0].rsplit('/', 1)[-1], 'skipped': reader.skipped, 'rows': reader.rows},
              open(argv[1], 'w', encoding='utf-8'), ensure_ascii=False)
    print(f"{len(reader.rows):,} candidates; skipped {reader.skipped}", file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
