"""KAN-444. Joins the generic-shopping residual audit to the Foursquare backup.

A one-time local evidence join, not an ingestion system. Three files go in —
the residual inventory, the Overture archive the inventory was derived from
(the inventory carries no coordinates), and the unfiltered national Foursquare
snapshot — and a decision manifest comes out. Nothing here promotes, rejects or
touches D1: every decision reaches production later as an explicit id in
overtureCandidateOverrides.json, reviewed first.

Matching is on normalized name plus distance ONLY. Foursquare's category is
never a match prerequisite and never a rejection criterion — it is missing on
7% of rows and inconsistent on more — so it is read only after a match has been
made on name and location, purely to say what the matched place is.

Chains are expected, not an error. Several branches of one brand can match a
single Overture row equally well; the app matches types and brands and never a
specific place, so which branch won is irrelevant as long as the branches agree
on what they are. They disagree, and the row is a conflict rather than a guess.
"""
import argparse
import csv
import json
import math
import os
import sys
import unicodedata
from collections import defaultdict
from difflib import SequenceMatcher

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SUBTYPES = os.path.join(ROOT, 'cloudflare', 'src', 'storeSubtypeCategories.json')

# Overture and Foursquare disagree on rooftop-versus-entrance geocoding, so a
# tight radius drops true matches on a dense high street. 150 m is deliberately
# loose; 400 m is the outer bound where a name match still means something and
# is only ever reported for review, never auto-assigned.
NEAR_M = 150.0
FAR_M = 400.0
STRONG_SIMILARITY = 0.85

# A grid cell of 0.005 degrees is about 555 m at this latitude, so the 3x3
# neighbourhood around a cell always contains everything within FAR_M.
CELL = 0.005

# Portuguese company forms carry no identifying information and appear on one
# side of a pair far more often than both. Stripped from the tail only: a shop
# genuinely called "Lda" does not exist, but "Casa da Sogra" must keep "Casa".
LEGAL_SUFFIXES = (
    'lda', 'ldª', 'limitada', 'sa', 'sas', 'unipessoal', 'sociedade unipessoal',
    'sociedade', 'e filhos', 'filhos', 'irmaos', 'ii', 'cia', 'ca',
)


def strip_accents(value):
    return ''.join(c for c in unicodedata.normalize('NFKD', value) if not unicodedata.combining(c))


def normalize(value):
    text = strip_accents((value or '')).casefold()
    text = ''.join(c if c.isalnum() or c.isspace() else ' ' for c in text)
    words = text.split()
    while words and words[-1] in LEGAL_SUFFIXES:
        words.pop()
    return ' '.join(words)


def similarity(left, right):
    """Sequence ratio, or token overlap when word order differs.

    Jaccard rather than containment: containment scores "Farmacia" against
    "Farmacia Central do Porto" as a perfect match, which across a country of
    pharmacies is a false-match engine.
    """
    if not left or not right:
        return 0.0
    sequence = SequenceMatcher(None, left, right).ratio()
    a, b = set(left.split()), set(right.split())
    tokens = len(a & b) / len(a | b)
    return max(sequence, tokens)


def haversine_m(lat1, lng1, lat2, lng2):
    radius = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(a))


# Foursquare leaf names that mean one of our subtypes without sharing its
# wording. Only unambiguous synonyms belong here: a leaf that merely overlaps a
# subtype is left unmapped, because an unmapped row is reviewable and a wrongly
# mapped one is invisible.
LEAF_ALIASES = {
    'optometrist': 'eyewear_and_optician',
    'eyecare store': 'eyewear_and_optician',
    'gift store': 'gift',
    'construction supplies store': 'hardware',
    'arts and crafts store': 'arts_and_crafts',
    "children's clothing store": 'childrens_clothing',
    'antique store': 'antique',
    'office supply store': 'office_equipment',
}

# A match on one of these is evidence the place is not a consumer store at all.
# It resolves the row by excluding it rather than by naming a subtype.
EXCLUDING_LEAVES = {
    'factory', 'wholesaler', 'business and professional services', 'office',
    'design studio', 'financial service', 'legal service', 'warehouse',
}

# `any` is Foursquare's own "Retail" bucket and `Miscellaneous Store` is its
# catch-all. Both are exactly as generic as the shopping category this audit
# exists to resolve, so neither can settle a row.
GENERIC_SUBTYPES = {'any'}
GENERIC_LEAVES = {'miscellaneous store', 'retail', 'shopping mall', 'department store'}


def subtype_index():
    """Foursquare leaf category name -> our store subtype.

    Inverted from the file classify_and_load already classifies against, so a
    subtype added there is understood here with no second mapping to maintain.
    """
    index = {}
    for subtype, entry in json.load(open(SUBTYPES)).items():
        if subtype in GENERIC_SUBTYPES:
            continue
        for name in (entry.get('category_name'), *(extra.get('category_name') for extra in entry.get('also', ()))):
            if name:
                index[normalize(name)] = subtype
    for leaf, subtype in LEAF_ALIASES.items():
        index[normalize(leaf)] = subtype
    return index


def labelled_subtypes(labels, index):
    """Every subtype the row's category labels resolve to.

    A label is a `>`-separated hierarchy and a row may carry several, joined
    with `|`. Only the leaf is looked up: the ancestors are broad shopping
    buckets that would map everything to `any` and say nothing.
    """
    found, leaves, excluding = set(), [], False
    for label in (labels or '').split('|'):
        for leaf in label.split('>')[-1].split('/'):
            leaf = leaf.strip()
            if not leaf:
                continue
            leaves.append(leaf)
            normalized = normalize(leaf)
            if normalized in {normalize(name) for name in EXCLUDING_LEAVES}:
                excluding = True
            subtype = index.get(normalized)
            if subtype:
                found.add(subtype)
    return found, leaves, excluding


def load_coordinates(archive_path, wanted):
    coords = {}
    with open(archive_path, newline='') as handle:
        for row in csv.DictReader(handle):
            overture_id = row.get('overture_id')
            if overture_id in wanted and row.get('lat') and row.get('lng'):
                coords[overture_id] = (float(row['lat']), float(row['lng']))
    return coords


def load_foursquare(path):
    """Grid-indexed provider rows. Rows without coordinates cannot be matched
    on location and are dropped rather than matched on name alone."""
    grid = defaultdict(list)
    kept = skipped = 0
    with open(path, newline='') as handle:
        for row in csv.DictReader(handle):
            lat, lng = row['latitude'].strip(), row['longitude'].strip()
            if not lat or not lng:
                skipped += 1
                continue
            lat, lng = float(lat), float(lng)
            grid[(int(lat // CELL), int(lng // CELL))].append(
                (row['fsq_place_id'], normalize(row['name']), lat, lng, row['category_labels']))
            kept += 1
    return grid, kept, skipped


def candidates(grid, lat, lng):
    cell_lat, cell_lng = int(lat // CELL), int(lng // CELL)
    for dlat in (-1, 0, 1):
        for dlng in (-1, 0, 1):
            yield from grid[(cell_lat + dlat, cell_lng + dlng)]


def decide(name, lat, lng, grid, index):
    """(decision, subtype, reason, matches) for one residual row."""
    normalized = normalize(name)
    scored = []
    for fsq_id, fsq_name, fsq_lat, fsq_lng, labels in candidates(grid, lat, lng):
        distance = haversine_m(lat, lng, fsq_lat, fsq_lng)
        if distance > FAR_M:
            continue
        score = similarity(normalized, fsq_name)
        exact = bool(normalized) and normalized == fsq_name
        if exact or score >= STRONG_SIMILARITY:
            scored.append((fsq_id, fsq_name, distance, score, exact, labels))
    if not scored:
        return 'insufficient_evidence', '', 'no Foursquare place within 400 m shares this name', []

    near = [m for m in scored if m[2] <= NEAR_M]
    if not near:
        best = sorted(scored, key=lambda m: (m[2], -m[3]))[:5]
        return 'insufficient_evidence', '', f'name match only at {best[0][2]:.0f} m, beyond the 150 m bound', best

    near.sort(key=lambda m: (not m[4], m[2], -m[3]))
    subtypes = set()
    unmapped = []
    excluding = False
    for match in near:
        found, leaves, match_excludes = labelled_subtypes(match[5], index)
        subtypes |= found
        excluding = excluding or match_excludes
        if not found:
            unmapped.extend(leaves)
    if subtypes:
        pass
    elif excluding:
        return 'excluded', '', 'matched place is not a consumer store', near[:5]
    if not subtypes:
        detail = f"category {'/'.join(sorted(set(unmapped))[:3])} maps to no store subtype" if unmapped \
            else 'matched place carries no category'
        return 'insufficient_evidence', '', detail, near[:5]
    if len(subtypes) > 1:
        return 'insufficient_evidence', '', f"matched places disagree: {', '.join(sorted(subtypes))}", near[:5]
    return 'verified_subtype', next(iter(subtypes)), 'name and location matched, category agreed', near[:5]


def run(inventory_path, archive_path, foursquare_path, out_path):
    with open(inventory_path, newline='') as handle:
        residual = list(csv.DictReader(handle, delimiter='\t'))
    coords = load_coordinates(archive_path, {row['overture_id'] for row in residual})
    print(f'{len(residual):,} residual rows, {len(coords):,} with coordinates', file=sys.stderr)

    grid, kept, skipped = load_foursquare(foursquare_path)
    print(f'{kept:,} Foursquare rows indexed, {skipped:,} without coordinates', file=sys.stderr)

    index = subtype_index()
    counts = defaultdict(int)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', newline='') as handle:
        writer = csv.writer(handle, delimiter='\t')
        writer.writerow((
            'overture_id', 'name', 'locality', 'lat', 'lng', 'decision', 'subtype',
            'reason', 'fsq_place_id', 'fsq_name', 'distance_m', 'similarity', 'fsq_categories'))
        for row in residual:
            position = coords.get(row['overture_id'])
            if not position:
                counts['insufficient_evidence'] += 1
                writer.writerow((row['overture_id'], row['name'], row.get('locality', ''), '', '',
                                 'insufficient_evidence', '', 'no coordinates in the Overture archive',
                                 '', '', '', '', ''))
                continue
            lat, lng = position
            decision, subtype, reason, matches = decide(row['name'], lat, lng, grid, index)
            counts[decision] += 1
            best = matches[0] if matches else None
            writer.writerow((
                row['overture_id'], row['name'], row.get('locality', ''), f'{lat:.6f}', f'{lng:.6f}',
                decision, subtype, reason,
                best[0] if best else '', best[1] if best else '',
                f'{best[2]:.0f}' if best else '', f'{best[3]:.2f}' if best else '',
                best[5] if best else ''))
    for decision, count in sorted(counts.items(), key=lambda item: -item[1]):
        print(f'{decision:24s} {count:,}', file=sys.stderr)
    print(f'-> {out_path}', file=sys.stderr)
    return counts


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inventory', required=True)
    parser.add_argument('--overture-archive', required=True)
    parser.add_argument('--foursquare', required=True)
    parser.add_argument('--out', required=True)
    args = parser.parse_args(argv)
    run(args.inventory, args.overture_archive, args.foursquare, args.out)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
