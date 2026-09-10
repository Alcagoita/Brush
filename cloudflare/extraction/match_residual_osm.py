"""KAN-444. Second evidence pass: OSM retail against the rows Foursquare missed.

Reads the decision manifest the Foursquare join produced and revisits only its
`insufficient_evidence` rows. A row Foursquare already settled is never
reopened here — the first source's answer stands, and a second opinion on a
decided row is how an audit starts contradicting itself.

Matching is the same rule as the Foursquare pass and shares its code:
normalized name plus distance, never the tag. The tag is read only after a
match, to say what the matched place is.

An OSM value that maps to nothing is left unmapped and its raw tag recorded,
rather than guessed into the nearest subtype. `shop=yes`, `shop=general` and
`shop=department_store` are explicitly generic: they confirm the row is a shop,
which is what the residual already is, so they settle nothing.
"""
import argparse
import csv
import json
import os
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from match_residual_foursquare import (
    CELL, FAR_M, MATCH_LADDER, accepts, haversine_m, normalize, similarity,
    toponym_only,
)

# OSM value -> (poi_type, store_kind). store_kind is set only for poi_type
# 'store'; promote_overture_candidates.decide() rejects an override carrying
# both a non-store type and a kind, so the shape is enforced there too.
#
# Every poi_type here must also be *reachable*. A type the app cannot surface
# is evidence about the place but not an answer we can promote, so those values
# (convenience, car, car_repair, mall, alcohol) are deliberately absent and
# their rows stay unresolved rather than becoming an override the runner
# refuses.
SHOP_TO_TYPE = {
    # clothing and accessories
    'clothes': ('store', 'clothing'), 'boutique': ('store', 'boutique'),
    'fashion': ('store', 'fashion'), 'fashion_accessories': ('store', 'fashion_accessories'),
    'shoes': ('store', 'shoes'), 'bag': ('store', 'handbag'), 'leather': ('store', 'leather_goods'),
    'jewelry': ('store', 'jewelry'), 'watches': ('store', 'watch'), 'hat': ('store', 'hat'),
    'lingerie': ('store', 'lingerie'), 'swimwear': ('store', 'swimwear'),
    'baby_goods': ('store', 'baby_gear_and_furniture'), 'maternity': ('store', 'maternity_wear'),
    'tailor': ('store', 'custom_clothing'), 'sewing': ('store', 'fabric'),
    'fabric': ('store', 'fabric'), 'wedding': ('store', 'bridal'), 'costume': ('store', 'costume'),
    'bridal': ('store', 'bridal'), 'second_hand': ('store', 'thrift'), 'charity': ('store', 'thrift'),
    # home and hardware
    'furniture': ('store', 'furniture'), 'houseware': ('store', 'home'),
    'interior_decoration': ('store', 'home'), 'curtain': ('store', 'home'),
    'bathroom_furnishing': ('store', 'home'), 'kitchen': ('store', 'kitchen_supply'),
    'bed': ('store', 'mattress'), 'carpet': ('store', 'carpet'), 'lighting': ('store', 'lighting'),
    'hardware': ('store', 'hardware'), 'doityourself': ('store', 'hardware'),
    'paint': ('store', 'hardware'), 'trade': ('store', 'hardware'),
    'garden_centre': ('store', 'nursery_and_gardening'), 'florist': ('florist', None),
    'houseware;hardware': ('store', 'hardware'),
    # technology and media
    'electronics': ('store', 'electronics'), 'computer': ('store', 'electronics'),
    'hifi': ('store', 'electronics'), 'mobile_phone': ('store', 'phone'),
    'video_games': ('store', 'video_game'), 'music': ('store', 'music_and_dvd'),
    'musical_instrument': ('store', 'musical_instrument'), 'photo': ('store', 'photography_store_and_services'),
    'books': ('store', 'books'), 'newsagent': ('store', 'newspaper_and_magazines'),
    'stationery': ('store', 'cards_and_stationery'), 'copyshop': ('store', 'copy_shop'),
    # health and personal care
    'chemist': ('store', 'drugstore'), 'optician': ('store', 'eyewear_and_optician'),
    'hearing_aids': ('store', 'hearing_aid_provider'), 'medical_supply': ('store', 'medical_supply'),
    'beauty': ('store', 'beauty'), 'cosmetics': ('store', 'beauty'), 'perfumery': ('store', 'beauty'),
    'herbalist': ('store', 'vitamins_and_supplements'), 'nutrition_supplements': ('store', 'vitamins_and_supplements'),
    'erotic': ('store', 'adult'), 'tobacco': ('store', 'tobacco'), 'e-cigarette': ('store', 'e_cigarette'),
    # leisure and specialist
    'sports': ('store', 'sports'), 'bicycle': ('store', 'bicycle'), 'outdoor': ('store', 'hunting_and_fishing_supplies'),
    'fishing': ('store', 'hunting_and_fishing_supplies'), 'hunting': ('store', 'hunting_and_fishing_supplies'),
    'toys': ('store', 'toys'), 'games': ('store', 'hobby'), 'model': ('store', 'hobby'),
    'art': ('store', 'art_supply'), 'craft': ('store', 'craft'), 'frame': ('store', 'arts_and_crafts'),
    'antiques': ('store', 'antique'), 'collector': ('store', 'comic_books'),
    'gift': ('store', 'gift'), 'party': ('store', 'party_supply'), 'pet': ('store', 'pet'),
    'pawnbroker': ('store', 'pawn'), 'variety_store': ('store', 'discount_store'),
    'travel_agency': ('store', 'travel_agency'), 'luggage': ('store', 'luggage'),
    'motorcycle': ('store', 'motorsports'), 'car_parts': ('store', 'auto_parts_and_supply'),
    'agrarian': ('store', 'nursery_and_gardening'), 'trophy': ('store', 'trophy'),
    # non-store types the residual can legitimately turn out to be
    'supermarket': ('supermarket', None),
    'greengrocer': ('grocery_store', None), 'grocery': ('grocery_store', None),
    'bakery': ('bakery', None), 'pastry': ('bakery', None),
    'hairdresser': ('hair_care', None), 'beauty_salon': ('beauty_salon', None),
    'laundry': ('laundry', None), 'dry_cleaning': ('laundry', None),
    'shoe_repair': ('shoe_repair', None),
    'lottery': ('lottery', None), 'ticket': ('lottery', None),
}

AMENITY_TO_TYPE = {
    'pharmacy': ('pharmacy', None), 'bank': ('bank', None), 'fuel': ('gas_station', None),
    'post_office': ('post_office', None), 'bureau_de_change': ('currency_exchange', None),
    'veterinary': ('veterinary_care', None),
}

CRAFT_TO_TYPE = {
    'bakery': ('bakery', None), 'shoemaker': ('shoe_repair', None),
    'tailor': ('store', 'custom_clothing'), 'dressmaker': ('store', 'custom_clothing'),
    'photographer': ('store', 'photography_store_and_services'),
    'jeweller': ('store', 'jewelry'), 'optician': ('store', 'eyewear_and_optician'),
    'upholsterer': ('store', 'furniture'), 'carpenter': ('store', 'furniture'),
}

HEALTHCARE_TO_TYPE = {
    'optometrist': ('store', 'eyewear_and_optician'), 'pharmacy': ('pharmacy', None),
}

# Confirm the row is a shop, which the residual already is. They resolve nothing
# and must never be written as a subtype.
GENERIC_SHOP_VALUES = {'yes', 'general', 'department_store', 'variety_store;general', 'shop'}


def mapped_type(tags):
    """(poi_type, store_kind, excluding) for one OSM element."""
    if 'office' in tags:
        return None, None, True
    amenity = tags.get('amenity')
    if amenity in ('clinic', 'dentist', 'doctors', 'school', 'driving_school'):
        return None, None, True
    shop = tags.get('shop')
    if shop and shop not in GENERIC_SHOP_VALUES:
        found = SHOP_TO_TYPE.get(shop)
        if found:
            return found[0], found[1], False
    for key, table in (('craft', CRAFT_TO_TYPE), ('healthcare', HEALTHCARE_TO_TYPE)):
        value = tags.get(key)
        if value and value in table:
            found = table[value]
            return found[0], found[1], False
    if amenity in AMENITY_TO_TYPE:
        found = AMENITY_TO_TYPE[amenity]
        return found[0], found[1], False
    return None, None, False


def load_osm(path):
    grid = defaultdict(list)
    count = 0
    with open(path, newline='') as handle:
        for row in csv.DictReader(handle, delimiter='\t'):
            lat, lng = float(row['lat']), float(row['lng'])
            grid[(int(lat // CELL), int(lng // CELL))].append(
                (row['osm_id'], normalize(row['name']), lat, lng, row['family'], row['tags']))
            count += 1
    return grid, count


def candidates(grid, lat, lng):
    cell_lat, cell_lng = int(lat // CELL), int(lng // CELL)
    for dlat in (-1, 0, 1):
        for dlng in (-1, 0, 1):
            yield from grid[(cell_lat + dlat, cell_lng + dlng)]


def decide(name, lat, lng, grid, locality=''):
    normalized = normalize(name)
    scored, near = [], []
    for osm_id, osm_name, osm_lat, osm_lng, family, raw in candidates(grid, lat, lng):
        distance = haversine_m(lat, lng, osm_lat, osm_lng)
        if distance > FAR_M:
            continue
        score = similarity(normalized, osm_name)
        exact = bool(normalized) and normalized == osm_name
        if not (exact or score >= MATCH_LADDER[0][1]):
            continue
        match = (osm_id, osm_name, distance, score, exact, family, raw)
        scored.append(match)
        if accepts(distance, score, exact) and not toponym_only(normalized, osm_name, locality):
            near.append(match)
    if not scored:
        return 'insufficient_evidence', '', '', 'no OSM retail feature within 400 m shares this name', []
    if not near:
        best = sorted(scored, key=lambda m: (m[2], -m[3]))[:5]
        return ('insufficient_evidence', '', '',
                f'OSM name agreement {best[0][3]:.2f} too weak for {best[0][2]:.0f} m', best)

    near.sort(key=lambda m: (not m[4], m[2], -m[3]))
    resolved, excluding, unmapped = set(), False, []
    for match in near:
        tags = json.loads(match[6])
        poi_type, store_kind, excludes = mapped_type(tags)
        excluding = excluding or excludes
        if poi_type:
            resolved.add((poi_type, store_kind))
        elif not excludes:
            unmapped.append(match[5])
    if len(resolved) == 1:
        poi_type, store_kind = next(iter(resolved))
        return 'verified_subtype', poi_type, store_kind or '', 'OSM name and location matched', near[:5]
    if len(resolved) > 1:
        joined = ', '.join(sorted(f'{t}/{k}' if k else t for t, k in resolved))
        return 'insufficient_evidence', '', '', f'matched OSM features disagree: {joined}', near[:5]
    if excluding:
        return 'excluded', '', '', 'matched OSM feature is an office or practice, not a store', near[:5]
    detail = f"OSM tag {'/'.join(sorted(set(unmapped))[:3])} maps to no type" if unmapped \
        else 'matched OSM feature carries no usable retail tag'
    return 'insufficient_evidence', '', '', detail, near[:5]


def run(decisions_path, osm_path, out_path):
    with open(decisions_path, newline='') as handle:
        rows = list(csv.DictReader(handle, delimiter='\t'))
    grid, indexed = load_osm(osm_path)
    print(f'{indexed:,} OSM retail features indexed', file=sys.stderr)

    counts, changed = Counter(), 0
    fields = list(rows[0].keys()) + ['osm_id', 'osm_distance_m', 'osm_family', 'store_kind', 'source']
    with open(out_path, 'w', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, delimiter='\t')
        writer.writeheader()
        for row in rows:
            row.setdefault('store_kind', '')
            row.update({'osm_id': '', 'osm_distance_m': '', 'osm_family': '',
                        'source': 'foursquare' if row['decision'] != 'insufficient_evidence' else ''})
            # The Foursquare pass resolves to a store *kind*; this pass resolves
            # to a poi_type that may or may not be `store`. Both end up in one
            # manifest, so the earlier rows are widened to the same shape here
            # rather than leaving `hardware` sitting where a poi_type belongs.
            if row['source'] == 'foursquare' and row['decision'] == 'verified_subtype' and row['subtype']:
                row['store_kind'] = row['subtype']
                row['subtype'] = 'store'
            if row['decision'] == 'insufficient_evidence' and row['lat']:
                decision, poi_type, store_kind, reason, matches = decide(
                    row['name'], float(row['lat']), float(row['lng']), grid,
                    row.get('locality', ''))
                if decision != 'insufficient_evidence':
                    changed += 1
                    best = matches[0]
                    row.update({
                        'decision': decision, 'subtype': poi_type, 'store_kind': store_kind,
                        'reason': reason, 'osm_id': best[0],
                        'osm_distance_m': f'{best[2]:.0f}', 'osm_family': best[5], 'source': 'osm',
                    })
                else:
                    row['reason'] = f"{row['reason']}; {reason}"
                    if matches:
                        row.update({'osm_id': matches[0][0], 'osm_distance_m': f'{matches[0][2]:.0f}',
                                    'osm_family': matches[0][5]})
            counts[row['decision']] += 1
            writer.writerow(row)
    print(f'{changed:,} rows resolved by OSM that Foursquare could not', file=sys.stderr)
    for decision, count in counts.most_common():
        print(f'  {decision:24s} {count:,}', file=sys.stderr)
    print(f'-> {out_path}', file=sys.stderr)
    return counts


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--decisions', required=True)
    parser.add_argument('--osm', required=True)
    parser.add_argument('--out', required=True)
    args = parser.parse_args(argv)
    run(args.decisions, args.osm, args.out)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
