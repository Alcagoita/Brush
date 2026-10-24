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
import math
import os

FOOTPRINTS_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), 'mall_lists', 'footprints.json')

# How far outside the outline still counts as the centre.
#
# Strict point-in-polygon is too brittle for this data: source coordinates are
# coarse and often pinned to a street door, so a tenant's own point routinely
# falls just outside its own building. At UBBO the Auchan hypermarket sits
# 39 m outside, UCI Cinemas 35 m, and a door-pin cluster 65 m.
#
# The buffer is PER CENTRE, in `footprints.json`. It was first written as one
# constant on the theory that it only compensates for coordinate quality.
# Measuring both centres disproved that — it also depends on how isolated the
# building is, and the two behave nothing alike:
#
#   UBBO        an isolated retail complex. Matches climb 97 -> 117 as the
#               buffer reaches 75 m and the REMOVE list barely moves, 18 -> 24.
#   Amoreiras   dense Lisbon, with three other shopping centres and a street
#               of shops within 500 m. Matches stop climbing at 50 m (87) while
#               the REMOVE list runs 18 -> 55 and escalations 22 -> 54 — all
#               of it neighbouring shops that were never tenants.
#
# So each centre carries the buffer its own measurement supports, and the
# default below is only for a centre nobody has measured yet.
DEFAULT_BUFFER_M = 75


_CACHE = {}


def load(path=FOOTPRINTS_PATH):
    """{name: {'osm': id, 'centroid': [lat, lng], 'rings': [[[lat, lng], …]]}}

    Cached: the promoter asks `mall_at` once per candidate, and a country
    import decides hundreds of thousands of them.
    """
    if path not in _CACHE:
        with open(path) as handle:
            footprints = json.load(handle)
        # A bounding box per centre, widened by its buffer, so the common
        # case — a candidate nowhere near any mall — costs two comparisons
        # instead of ray casting every edge. A country import asks this of
        # every candidate it decides.
        for footprint in footprints.values():
            points = [p for ring in footprint['rings'] for p in ring]
            pad = footprint.get('buffer_m', DEFAULT_BUFFER_M) / 111320.0
            footprint['_box'] = (min(p[0] for p in points) - pad,
                                 max(p[0] for p in points) + pad,
                                 min(p[1] for p in points) - pad * 1.3,
                                 max(p[1] for p in points) + pad * 1.3)
        _CACHE[path] = footprints
    return _CACHE[path]


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


def _segment_metres(lat, lng, start, end) -> float:
    """Metres from a point to one edge, in a local flat projection. At a
    building's scale that is far more precise than the data it measures."""
    scale = math.cos(math.radians(lat))
    px, py = lng * scale, lat
    ax, ay = start[1] * scale, start[0]
    bx, by = end[1] * scale, end[0]
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        t = 0.0
    else:
        t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy)) * 111320


def metres_outside(lat, lng, footprint) -> float:
    """0.0 inside the outline, else the distance to its nearest edge."""
    if any(in_ring(lat, lng, ring) for ring in footprint['rings']):
        return 0.0
    return min(
        _segment_metres(lat, lng, ring[i], ring[(i + 1) % len(ring)])
        for ring in footprint['rings']
        for i in range(len(ring)))


def buffer_for(footprint, buffer_m=None) -> float:
    """The centre's own measured buffer, unless one is passed explicitly."""
    if buffer_m is not None:
        return buffer_m
    return footprint.get('buffer_m', DEFAULT_BUFFER_M)


def in_footprint(lat, lng, footprint, buffer_m=None) -> bool:
    """Inside the centre, allowing for how coarse POI coordinates are.

    `buffer_m=0` is the strict outline — which the door-duplicate audit wants,
    since a door-pinned row sits on the street address, outside the building.
    """
    box = footprint.get('_box')
    if box and not (box[0] <= lat <= box[1] and box[2] <= lng <= box[3]):
        return False
    return metres_outside(lat, lng, footprint) <= buffer_for(footprint, buffer_m)


def _coordinate(value):
    """A float, or None when the value cannot be one.

    The guard runs inside `promote_overture_candidates.decide`, which is
    called from several places, and they do not agree on types: a row read
    from an archive CSV carries coordinates as STRINGS, and a row can be
    missing one entirely. Blowing up there would take down an import for a
    question that is only ever "is this inside a shopping centre".
    """
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def mall_at(lat, lng, footprints=None, buffer_m=None):
    """The centre containing this point, or None.

    This is the test the manual-only rule needs: a candidate returning a name
    here must not be written by an import, a promotion or a refresh.
    """
    lat, lng = _coordinate(lat), _coordinate(lng)
    if lat is None or lng is None:
        return None
    for name, footprint in (footprints or load()).items():
        if in_footprint(lat, lng, footprint, buffer_m):
            return name
    return None


def inside(rows, name, footprints=None, buffer_m=None):
    """The subset of `rows` inside one named centre. Rows carry `lat`/`lng`."""
    footprint = (footprints or load())[name]
    return [row for row in rows
            if in_footprint(row['lat'], row['lng'], footprint, buffer_m)]


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
