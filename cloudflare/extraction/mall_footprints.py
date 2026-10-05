"""
KAN-439. Which shopping centre a point is inside.

TWO JOBS, ONE ANSWER

1. **Scoping a tenant audit.** A lat/lng box around a mall is not the mall.
   Measured 2026-10-05: a box around Amoreiras holds 308 served rows, of which
   **109** are inside the building. The other 199 are the surrounding Lisbon
   streets — and three *other* shopping centres share that box (`Amoreiras
   Plaza`, `Amoreiras Square`, `Amoreiras Shopping Center`). Comparing a box
   against an operator's list produces a REMOVE list full of shops that were
   never in the centre: 139 of them, before this module existed.

2. **The manual-only rule.** A shopping centre's contents are never updated
   automatically (owner, 2026-10-04) — no import, promotion or refresh may
   touch a row inside one, because an automated source writing into a
   building we maintain by hand will always eventually disagree with the
   operator's own list. That rule needs "inside a mall" to be something code
   can test. This is it.

THE FOOTPRINT IS THE BUILDING'S OUTLINE

Not a radius. A centre is an irregular building, often with a car park and a
retail park beside it, and a radius either swallows the neighbours or clips
the far end. The outline comes from OpenStreetMap's own `shop=mall` polygon,
recorded in `mall_lists/footprints.json` with the OSM id it came from so it
can be re-fetched and checked.

Coordinates are plain lat/lng and the test is ray casting — at a building's
scale the Earth's curvature is far below the precision of the data, and a
projection would add a dependency for nothing.
"""
from __future__ import annotations

import json
import os

FOOTPRINTS_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), 'mall_lists', 'footprints.json')


def load(path=FOOTPRINTS_PATH):
    """{name: {'osm': id, 'centroid': [lat, lng], 'rings': [[[lat, lng], …]]}}"""
    with open(path) as handle:
        return json.load(handle)


def in_ring(lat, lng, ring) -> bool:
    """Ray casting: does a ray east from the point cross the outline an odd
    number of times. A point exactly on an edge is not defined either way,
    which does not matter for a shop inside a building."""
    hit = False
    count = len(ring)
    for index in range(count):
        y1, x1 = ring[index]
        y2, x2 = ring[(index + 1) % count]
        if (y1 > lat) != (y2 > lat):
            crossing = (x2 - x1) * (lat - y1) / (y2 - y1) + x1
            if lng < crossing:
                hit = not hit
    return hit


def in_footprint(lat, lng, footprint) -> bool:
    """Inside any outer ring of one centre. A centre with two buildings — a
    mall and its annex across the road — is two rings, not two centres."""
    return any(in_ring(lat, lng, ring) for ring in footprint['rings'])


def mall_at(lat, lng, footprints=None):
    """The centre containing this point, or None.

    This is the test the manual-only rule needs: a candidate returning a name
    here must not be written by an import, a promotion or a refresh.
    """
    for name, footprint in (footprints or load()).items():
        if in_footprint(lat, lng, footprint):
            return name
    return None


def inside(rows, name, footprints=None):
    """The subset of `rows` inside one named centre. Rows carry `lat`/`lng`."""
    footprint = (footprints or load())[name]
    return [row for row in rows if in_footprint(row['lat'], row['lng'], footprint)]


def main(argv=None):
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--rows', required=True, help='JSON rows carrying lat/lng')
    parser.add_argument('--mall', help='keep only rows inside this centre')
    parser.add_argument('--out', help='write the kept rows here')
    args = parser.parse_args(argv)

    footprints = load()
    rows = json.load(open(args.rows))
    if not args.mall:
        for name, footprint in footprints.items():
            kept = inside(rows, name, footprints)
            print(f"{name}: {len(kept)} of {len(rows)} rows inside ({footprint['osm']})")
        return 0

    kept = inside(rows, args.mall, footprints)
    print(f'{args.mall}: {len(kept)} of {len(rows)} rows inside the building')
    if args.out:
        json.dump(kept, open(args.out, 'w'), ensure_ascii=False)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
