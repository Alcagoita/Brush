"""
KAN-471 stage 1. Which places does Overture name in English?

The goal is narrow: when the default name is English, the place must also
carry its name in Portuguese. `Jerónimos Monastery` needs `Mosteiro dos
Jerónimos`; `Café Central` needs nothing. This finds the first kind. It
writes nothing anywhere — the output is a list for review.

WHY THE CATEGORY LIST IS EXPLICIT

Matching category names by substring looked tempting and was wrong: `park`
also selects `parking`, `skate_park`, `rv_park` and `beer_garden`, and
`garden` selects `nursery_and_gardening` and `home_and_garden`. None of
those is a heritage place with a Portuguese name waiting to be recorded, and
every one of them would have gone to a human to reject by hand. The list
below names each category deliberately; extend it from data, not from a
prefix.

WHY A BUSINESS IN THIS LIST IS STILL NOT A CANDIDATE

Most English names in Portugal are correct: `The Beach House`,
`Pestana Porto Santo Beach Resort & Spa`, `Burgau Beach Bar`,
`Car Hire Madeira Airport | SIXT`. The business is *called* that, and a
Portuguese name for it does not exist to be found. The category filter
removes most of them; `BUSINESS_WORDS` removes the ones filed under a
heritage category anyway (a beach bar filed as `beach`). What survives is
still a proposal, never a write: a human decides each row in stage 3.

    python3 detect_english_names.py --archive <pt.csv> [--out <path.json>]
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import unicodedata

EXTRACTION_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, EXTRACTION_DIR)

# An English place-word and the Portuguese word the real name would use.
# The pair matters: a name carrying BOTH is already Portuguese enough to
# leave alone (`Museu Marítimo Museum`), and a name carrying neither is not
# evidence of anything.
PLACE_WORDS = {
    'monastery': 'mosteiro', 'museum': 'museu', 'church': 'igreja',
    'cathedral': 'catedral', 'castle': 'castelo', 'tower': 'torre',
    'beach': 'praia', 'garden': 'jardim', 'park': 'parque', 'bridge': 'ponte',
    'palace': 'palacio', 'square': 'praca', 'viewpoint': 'miradouro',
    'lighthouse': 'farol', 'aqueduct': 'aqueduto', 'convent': 'convento',
    'chapel': 'capela', 'fort': 'forte', 'fortress': 'fortaleza',
    'cape': 'cabo', 'island': 'ilha', 'cemetery': 'cemiterio',
    'waterfall': 'cascata', 'lake': 'lago', 'cave': 'gruta', 'mill': 'moinho',
    'fountain': 'fonte', 'monument': 'monumento', 'ruins': 'ruinas',
    'sanctuary': 'santuario', 'hermitage': 'ermida', 'basilica': 'basilica',
    'city hall': 'camara municipal', 'town hall': 'camara municipal',
}

# The POI types whose places carry a recorded name in the country's own
# language: heritage, worship and natural features. Businesses are absent on
# purpose, and so is `amusement_park` — `Mega Luna Park` is a funfair, not a
# place whose Portuguese name we failed to record.
HERITAGE_TYPES = frozenset({
    'historical_landmark', 'church', 'mosque', 'synagogue', 'museum',
    'art_gallery', 'cultural_center', 'cemetery', 'lighthouse', 'bridge',
    'waterfall', 'island', 'mountain', 'lake', 'river', 'hot_spring',
    'beach', 'park', 'botanical_garden', 'nature_preserve', 'plaza',
    'hiking_area', 'aquarium', 'zoo',
})

CATEGORY_MAP_PATH = os.path.join(
    os.path.dirname(EXTRACTION_DIR), 'src', 'overtureCategories.json')

# Categories the mapping promotes to a heritage type for SEARCH, which are
# nonetheless facilities rather than named places: to someone looking for a
# park, a skate park is a park, but `Skate Park de Matosinhos` has no
# Portuguese name waiting to be recorded. Named individually, with the
# reason, rather than pattern-matched away.
FACILITY_CATEGORIES = frozenset({'skate_park', 'dog_park'})


def heritage_categories(path=CATEGORY_MAP_PATH, types=HERITAGE_TYPES):
    """The Overture categories that our OWN committed mapping promotes to a
    heritage type.

    Deriving this beats writing it by hand, twice over. A hand-written list
    missed `religious_organization`, which is how Overture files
    `Jerónimos Monastery` — the case this ticket exists for. And matching
    category names by substring is worse still: `park` also selects
    `parking`, `skate_park` and `beer_garden`, `garden` selects
    `nursery_and_gardening`. The mapping already encodes which category is
    which kind of place; this reads it instead of guessing again."""
    with open(path) as handle:
        mapping = json.load(handle)
    return frozenset(
        category for category, entry in mapping.items()
        if isinstance(entry, dict) and entry.get('poi_type') in types
        and category not in FACILITY_CATEGORIES)

# A name carrying one of these is a business trading under an English name,
# whatever category it was filed under. `Beach House`, `Beach Bar`,
# `Holiday Apartments`, `Guest House`, `Car Hire` are not places with a
# Portuguese name we failed to record.
BUSINESS_WORDS = (
    # `house` is matched as a whole word, so `Lighthouse` is untouched while
    # `The Beach House` is set aside.
    'house', 'hotel', 'hostel', 'resort', 'spa', 'guest house', 'guesthouse',
    'apartments', 'apartment', 'holiday', 'rental', 'rentals', 'car hire',
    'bar', 'pub', 'restaurant', 'cafe', 'coffee', 'shop', 'store', 'club',
    'surf', 'lodge', 'villa', 'villas', 'camping', 'campsite', 'tours',
    'rent a car', 'bed and breakfast', 'b&b', 'suites', 'inn',
)


# Rows the owner withdrew (migration 0051, 2026-09-28): they are not places
# we serve, so they are not candidates for a name either.
WITHDRAWN = frozenset({
    '59277518-5c11-49aa-9a35-446170764ed9',  # Tickets office Jerónimos Monastery
    '9a39bbec-8dd1-49b9-bb9e-d444e5907e4c',  # Pinus Urban Garden
    'b941ff8a-5312-4179-961f-23fd035ce349',  # Tagus Park!
})


def fold(value):
    """Accent-free, punctuation-free lower case, for word matching."""
    text = unicodedata.normalize('NFKD', value or '').encode('ascii', 'ignore').decode()
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', text.lower())).strip()


def english_place_words(name):
    """The English place-words in a name whose Portuguese counterpart is
    absent. Empty when the name is already Portuguese, or carries both."""
    folded = fold(name)
    words = set(folded.split())
    hits = []
    for english, portuguese in PLACE_WORDS.items():
        present = english in folded.split() if ' ' not in english else english in folded
        if not present:
            continue
        counterpart = fold(portuguese)
        if counterpart in folded:
            continue  # `Igreja … Church` is already carrying its own name
        hits.append(english)
    return sorted(hits), words


def looks_like_a_business(name):
    folded = fold(name)
    return any(word in folded.split() if ' ' not in word else word in folded
               for word in BUSINESS_WORDS)


def candidates(archive_path, categories=None):
    """Rows whose default name is English, in a heritage category, that are
    not businesses trading under an English name."""
    categories = heritage_categories() if categories is None else categories
    out, skipped_business, scanned = [], [], 0
    with open(archive_path, newline='') as handle:
        for row in csv.DictReader(handle):
            scanned += 1
            if row['overture_id'] in WITHDRAWN:
                continue
            category = (row.get('category') or '').strip()
            if category not in categories:
                continue
            name = (row.get('name') or '').strip()
            hits, _ = english_place_words(name)
            if not hits:
                continue
            record = {
                'overture_id': row['overture_id'], 'name': name, 'category': category,
                'lat': float(row['lat']), 'lng': float(row['lng']),
                'english_words': hits,
            }
            (skipped_business if looks_like_a_business(name) else out).append(record)
    return {'scanned': scanned, 'candidates': out, 'businesses': skipped_business}


def main(argv=None):
    parser = argparse.ArgumentParser(description='KAN-471 stage 1: places Overture names in English')
    parser.add_argument('--archive', required=True, help='the country archive CSV')
    parser.add_argument('--out', help='write the candidate list (JSON) here')
    parser.add_argument('--show', type=int, default=25, help='how many to print')
    args = parser.parse_args(argv)

    report = candidates(args.archive)
    rows, businesses = report['candidates'], report['businesses']
    print(f"scanned {report['scanned']:,} archive rows", file=sys.stderr)
    print(f'{len(rows):,} candidates in a heritage category', file=sys.stderr)
    print(f'{len(businesses):,} set aside as businesses trading under an English name', file=sys.stderr)

    by_category = {}
    for row in rows:
        by_category[row['category']] = by_category.get(row['category'], 0) + 1
    for category, count in sorted(by_category.items(), key=lambda pair: -pair[1]):
        print(f'  {category:36}{count}', file=sys.stderr)

    for row in rows[:args.show]:
        print(f"{row['overture_id'][:8]}  {row['name'][:52]:52} {row['category']}")

    if args.out:
        os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
        with open(args.out, 'w') as handle:
            json.dump({'candidates': rows, 'businesses': businesses}, handle,
                      ensure_ascii=False, indent=1, sort_keys=True)
        print(f'\nwritten {args.out}', file=sys.stderr)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
