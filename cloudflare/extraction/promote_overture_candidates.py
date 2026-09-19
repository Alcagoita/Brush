"""
KAN-431 phase 3. Promotes `overture_candidate` rows into `overture_poi`.

TWO WAYS IN, IN THIS ORDER

  1. The category, through src/overtureCategories.json.
  2. The NAME, through classify_and_load's types_from_name — the KAN-391
     machinery. A "Talho Halal Barakah" filed under `halal_restaurant` and a
     "Papelaria Açores" filed under `arts_and_crafts` both state what they
     are in their own name, and the category is simply wrong.

The name may only ADD a type the category could not supply. It never
overrides a category that mapped, because the category is the source's
considered answer and the name is an inference from a string.

WHAT IS DELIBERATELY NOT DONE

No suffix rule on the category. `*_restaurant -> restaurant` looks free and
gains 4 points on Odivelas, but the same rule sends `auto_body_shop` and
`auto_parts_and_supply_store` to `store` — reintroducing exactly what
KAN-412 excluded — and `driving_school`/`dance_school` to `school`, which is
not the errand that word means in this app. A rule that is right about the
tail and wrong about the exclusions is not worth 4 points.

Everything unmatched stays `pending`. It is countable there, which is the
point of staging: the next mapping decision comes from what actually
arrived, not from reading a taxonomy.

Usage:
  python3 promote_overture_candidates.py --sql-out <dir> [--batch 10000] [--dry-run]
"""
import argparse
import json
import os
import sys
from collections import Counter
from datetime import date, datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analyse_poi_candidates import paged, query, reachable_types
from classify_and_load import (
    MAX_STATEMENT_BYTES, brand_form_matches, build_alias_index, byte_len, encode_geohash, find_brand,
    financial_service_classification, load_brand_dictionary,
    load_financial_service_name_rules, load_keyword_dictionary,
    match_keyword_subtypes, normalize_text, replaces_generic_store, sql_escape,
    types_from_name,
)
from opening_hours import hours_for_poi_type

CLOUDFLARE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAX_VALUES_TERMS = 500

POI_INSERT_PREFIX = (
    'INSERT OR IGNORE INTO overture_poi '
    '(overture_id, name, dedupe_name, lat, lng, geohash, primary_poi_type, brand, '
    'address, category, confidence, source_datasets, open_min, close_min, '
    'imported_at, updated_at) VALUES '
)
TYPE_INSERT_PREFIX = (
    'INSERT OR IGNORE INTO overture_poi_type (overture_id, poi_type, rank) VALUES '
)
ATTRIBUTE_INSERT_PREFIX = (
    'INSERT OR IGNORE INTO overture_poi_attribute (overture_id, dimension, value) VALUES '
)


# KAN-431. Overture's hair-and-beauty categories are a shrug, and measuring
# Odivelas says so: of 401 rows filed `spas`, 86 are named "Cabeleireiro" and
# 4 are barbearias; of 382 filed `beauty_salon`, 89 are hairdressers and 3 are
# barbers; and 5 of the 97 filed `barber` are actually cabeleireiros.
#
# These are four distinct errands — KAN-401 established that for Foursquare
# and OSM — and the category cannot tell them apart. Where a name says which
# one it is, the name wins outright rather than joining as a second type,
# because ranking a barbearia's `salon` first would show the wrong thing and
# was the whole point of KAN-401's split.
#
# Deliberately narrow. Everywhere else the category is the source's considered
# answer and the name may only add to it.
NAME_OUTRANKS_CATEGORY = frozenset({
    'spas', 'beauty_salon', 'hair_salon', 'barber',
    'personal_or_beauty_service', 'personal_care_services',
})


# KAN-431. Decided, not undecided. `pending` means "nobody has ruled on this
# yet" and is a backlog to work through; these have been ruled on, and
# leaving them pending would keep re-presenting settled questions as open.
#
# Lodging and vehicles are not errands Brush models at all. The medical set
# is KAN-412's — searched for by name at an address, never stumbled upon.
# The professional services are places you have an appointment with, not
# places you pass. A dance or driving school is a course you enrol in, which
# is not what `school` means here — and all 120 dance_school rows were
# checked for gyms first, because a dance studio that is also a ginásio
# would be a real errand. None was.
REJECTED_CATEGORIES = frozenset({
    'hotel', 'holiday_rental_home',
    'dentist', 'hospital', 'diagnostic_services',
    'automotive_repair',
    # Every leaf under Overture's vehicle_dealer, the class car_dealer names.
    'car_dealer', 'used_car_dealer', 'motorcycle_dealer', 'truck_dealer',
    'boat_dealer', 'automobile_leasing', 'motorsport_vehicle_dealer',
    'car_broker', 'commercial_vehicle_dealer', 'scooter_dealers',
    'lawyer', 'insurance_agency', 'psychologist',
    'community_services_non_profits',
    'dance_school', 'driving_school',
    # Suppliers to restaurants, not places where a user can eat. They are
    # deliberately settled now rather than being re-presented as restaurant
    # candidates in a later food phase.
    'restaurant_equipment_and_supply', 'restaurant_wholesale',
})

# A housing development is a place NAME, not a place. Overture files these
# under landmark_and_historical_building, where they become fake landmarks —
# `Urbanização da Quinta Nova` is an estate, not a monument. Matched at the
# start of the name only, so "Café da Urbanização X" is untouched: there the
# word locates a real venue rather than naming the estate itself.
REJECTED_NAME_PREFIXES = ('urbanizacao', 'urbanizacoes')

# KAN-436. The official Multibanco feed is the authoritative source for
# Portugal's Multibanco machines. Overture's generic `atms` category cannot
# distinguish those machines from a bank branch or a non-Multibanco operator,
# so it must not create a second copy. Keep only an explicit, named operator
# that the official feed does not cover.
NON_MULTIBANCO_ATM_OPERATORS = frozenset({'euronet'})


# KAN-431. Overture's places theme has no viewpoint category — scenic
# features live in its `base` theme, which we do not import — so a miradouro
# arrives typed as whatever built thing is standing there: a landmark, a
# park, a plaza, a fountain.
#
# The name recovers it, but ONLY where the category already agrees the row
# is an outdoor place. `Miradouro` is also a common name for the cafe or bar
# AT the viewpoint, and typing "Quiosque do Miradouro" as a viewpoint would
# send someone looking for a view to a counter selling coffee.
VIEWPOINT_NAME = 'miradouro'
VIEWPOINT_HOSTS = frozenset({
    'historical_landmark', 'park', 'plaza', 'botanical_garden',
    'nature_preserve', 'hiking_area',
})


def store_kind_alias_index():
    """The app's own store-subtype keyword dictionary, indexed for matching.

    `any` is excluded for the reason build_alias_index gives: it is a
    catch-all, not a real subtype, and would win every match.
    """
    return build_alias_index(
        load_keyword_dictionary('storeSubtypeDictionary.json'),
        exclude_keys={'any'})


def food_cuisine_alias_index():
    return build_alias_index(load_keyword_dictionary('restaurantFoodDictionary.json'))


def store_brand_index():
    dictionary = load_keyword_dictionary('storeSubtypeDictionary.json')
    return [(kind, brand, normalize_text(brand)) for kind, entry in dictionary.items()
            if kind != 'any' for brand in entry.get('stores', [])]


# KAN-448. Brands that are also ordinary words. `Casa` heads 6,206 Portuguese
# rows — `Casa da Avó`, `Casa de Praia`, holiday rentals — and `Area` heads
# national parks. For these the whole name has to be the brand, or the brand
# plus one word (`Casa Colombo`), or it is the word and not the chain.
#
# KAN-455. `atlantico` joined: the bank's canonical name is the bare word,
# and `Atlântico` is also the ocean — `Atlântico pizzaria S. FÉLIX` leads
# with it and is a pizzeria. Its `Banco Atlântico …` aliases are not
# generic words and still match as a leading brand.
#
# `big` likewise: Banco BiG's `BiG`/`BIG` aliases are the English word, and
# `Big China`, `Big Foot` lead with it. `Banco BiG` still matches.
#
# `salsa` (the dance, the sauce, parsley): `Salsa e Canela` and `Salsa
# Bistro` lead with it and are places to eat. The chain's branches are
# `Salsa` (29 in Portugal) or `Salsa Jeans …`, which is its own entry.
# `humana` likewise: `Humana Mente`, `Humana - O seu espaço de saúde` are a
# clinic; the second-hand chain is `HUMANA` (21) or `HUMANA Vintage` (its
# own entry).
GENERIC_WORD_BRANDS = frozenset({'casa', 'area', 'nos', 'note', 'normal', 'viva', 'atlantico', 'big', 'salsa', 'humana'})

# KAN-448. Categories a chain brand may overrule. Explicit on purpose: an
# unmapped category is not a wrong one — hotel, dentist, lawyer, car dealer
# are all unmapped and all real. These are the buckets where Overture's
# source classifier produces `Decathlon Albufeira → school` at 0.97
# confidence, and generic shopping, where a chain row sits untyped.
BRAND_OVERRIDABLE_CATEGORIES = frozenset({
    '', 'shopping', 'shopping_center', 'school', 'beach', 'bus_station', 'train_station',
    'parking', 'community_services_non_profits',
})
# KAN-455. Words a place name uses to say what kind of place it is, from
# src/venueWords.json — one table. `poi_type`/`store_kind` feed the venue
# contradiction rule (venue_contradiction); `category` feeds
# name_agrees_with_category: when the name agrees with the category, the
# category is not wrong and the brand does not overrule it — `IKEA Parking`
# is the car park, `Escola Decathlon` would be a school. Words are matched
# whole, after normalisation.
def load_venue_words(path=None, reachable=None, store_kinds=None, categories=None):
    """src/venueWords.json, validated and ordered longest phrase first.

    Every `poi_type` must be a catalogue type, every `store_kind` a key of
    storeSubtypeDictionary.json, every `category` a key of
    overtureCategories.json — a typo here would refuse or accept chains
    silently, so an unknown value fails the load. Phrases are matched in
    order of token count so `snack bar` is found before `bar` and `parque
    infantil` before `parque`, whatever order the file lists them in.
    """
    path = path or os.path.join(CLOUDFLARE_DIR, 'src', 'venueWords.json')
    if reachable is None:
        reachable = reachable_types()
    if store_kinds is None:
        store_kinds = set(load_keyword_dictionary('storeSubtypeDictionary.json'))
    if categories is None:
        categories = set(category_map())
    with open(path) as handle:
        raw = json.load(handle)
    words = {}
    for word, entry in raw.items():
        if word.startswith('_'):
            continue
        if not isinstance(entry, dict) or not entry or not set(entry) <= {'poi_type', 'store_kind', 'category'}:
            raise ValueError(f'venueWords.json: {word!r} must carry poi_type, store_kind and/or category')
        if 'poi_type' in entry and entry['poi_type'] not in reachable:
            raise ValueError(f"venueWords.json: {word!r} names unknown poi_type {entry['poi_type']!r}")
        if 'store_kind' in entry and entry['store_kind'] not in store_kinds:
            raise ValueError(f"venueWords.json: {word!r} names unknown store_kind {entry['store_kind']!r}")
        if 'category' in entry and entry['category'] not in categories:
            raise ValueError(f"venueWords.json: {word!r} names unknown category {entry['category']!r}")
        normalized = normalize_text(word)
        if not normalized or normalized in words:
            raise ValueError(f'venueWords.json: {word!r} is empty or a duplicate after normalisation')
        words[normalized] = entry
    return dict(sorted(words.items(), key=lambda item: (-len(item[0].split()), item[0])))


def category_map():
    path = os.path.join(CLOUDFLARE_DIR, 'src', 'overtureCategories.json')
    with open(path) as handle:
        return {k: v for k, v in json.load(handle).items() if not k.startswith('_')}


VENUE_WORDS = load_venue_words()

CATEGORY_NAME_WORDS = {}
for _word, _entry in VENUE_WORDS.items():
    if _entry.get('category'):
        CATEGORY_NAME_WORDS.setdefault(_entry['category'], []).append(_word)
# Meta files the umbrella under two spellings.
CATEGORY_NAME_WORDS['flowers_and_gifts_store'] = CATEGORY_NAME_WORDS.get('flowers_and_gifts_shop', [])

# Not overridable, and deliberately: parks, venues and landmarks get named
# after sponsors — `MEO Suil Park`, `NOS Alive` — and the only brand-headed
# rows found under government or retirement categories were `Casa …` and
# `C.A. …` false forms.

# KAN-457. Umbrella categories: an Overture parent bucket that our map
# narrows to one of its children. `flowers_and_gifts_shop` sits over
# `florist` and `gift_shop` in Meta's tree and 2,328 Portuguese rows are
# filed there; most are florists, so the map says `florist`. A chain whose
# kind is another child of the same bucket is not overruling a commercial
# category — Meta said "flowers or gifts" and the chain says which. Ten of
# Ale-Hop's 24 branches are here, Faro among them. Explicit, like
# BRAND_OVERRIDABLE_CATEGORIES: the tree is not in the map, and a bucket
# earns its place by being read.
UMBRELLA_CATEGORY_KINDS = {
    'flowers_and_gifts_shop': frozenset({'gift'}),
    'flowers_and_gifts_store': frozenset({'gift'}),
}


GENERIC_CATEGORIES = frozenset({'', 'shopping'})

# Non-store chains a brand may settle a generic row to. Order is preference
# when a name carries more than one; it will not.
BRAND_TYPES_FOR_OVERRIDE = ('supermarket', 'bank', 'pharmacy', 'gas_station', 'convenience_store', 'post_office')


def name_agrees_with_category(normalized_name, category):
    padded = f' {normalized_name} '
    return any(f' {word} ' in padded for word in CATEGORY_NAME_WORDS.get(category, ()))


def venue_contradiction(normalized_name, normalized_brand, poi_type, kinds=()):
    """The word of the name that says this is not the chain's kind of place.

    KAN-455 (rule 3 of KAN-448, rewritten). A chain matches anywhere in the
    name — `Loja MEO Braga`, `Ópticas MultiOpticas Faro`, `The Phone House`
    are all real branches — unless another word of the name names a
    different kind of place: `Tasquinha O Salsa` is a tasca, `Cafetaria
    LIDL Sesimbra` a café, `Papelaria Intermarché` a papelaria, `Óptica
    Vodafone` an optician. The words are src/venueWords.json; a word not in
    it is neutral, never a refusal. Returns the offending word, or None.
    """
    rest = f' {normalized_name} '.replace(f' {normalized_brand} ', ' ', 1)
    # Longest phrase first (load order): `snack bar` is read as one word,
    # and once read it is taken out so `bar` does not see it again.
    for word, entry in VENUE_WORDS.items():
        if f' {word} ' not in rest:
            continue
        rest = rest.replace(f' {word} ', ' ')
        if entry.get('poi_type') and entry['poi_type'] != poi_type:
            return word
        if entry.get('store_kind') and (poi_type != 'store' or entry['store_kind'] not in kinds):
            return word
    return None


def brand_heads_name(normalized_brand, normalized_name):
    """Does the brand lead the name — `minipreco carvoeiro`, not `washy continente`?"""
    return normalized_name == normalized_brand or normalized_name.startswith(normalized_brand + ' ')


def fallback_brand(name, poi_type, brand_dictionary):
    """The `poi_type` chain this name belongs to — a supermarket, bank,
    pharmacy chain sitting in a generic category — if the brand LEADS the
    name (KAN-455, #427). Not the venue rule: a supermarket or bank name is
    borrowed by everything around it — `Washy Continente` is a car wash,
    `Centro Comercial Continente` the mall, `Loja CTT` the post office,
    `Clube Millenniumbcp Canoagem` a club — and none of those carries a
    venue word. `Minipreço Carvoeiro`, not `Cafetaria Minipreço`. A
    generic-word brand is the whole name or nothing, as in
    store_kinds_from_brand.
    """
    normalized = normalize_text(name or '')
    if not normalized:
        return None
    for brand in brand_dictionary.get(poi_type, []):
        canonical = brand['name']
        for candidate in (canonical, *brand.get('aliases', [])):
            normalized_brand = normalize_text(candidate)
            if not normalized_brand:
                continue
            if normalized_brand in GENERIC_WORD_BRANDS:
                if normalized == normalized_brand:
                    return canonical
                continue
            if (brand_form_matches(normalized_brand, normalized, name, canonical)
                    and brand_heads_name(normalized_brand, normalized)):
                return canonical
    return None


def store_kinds_from_brand(name, index):
    """Every kind the dictionary lists for the chain this name belongs to.

    A chain listed under two kinds is both — Decathlon is `sports` and
    `bicycle` on every branch — and never `None`: an ambiguous brand that
    resolved to nothing is how a chain came to take its kind from whatever
    category Meta happened to give each branch (KAN-448).

    The brand may sit anywhere in the name, on top of every form check
    brand_form_matches makes (the ampersand rule keeps `C.A. Residência
    Sénior` from being C&A), unless a venue word contradicts the chain's
    kinds — venue_contradiction, checked against the chain's whole kind set.

    A generic-word brand matches only when it is the whole name. `Casa` is
    a homeware chain and also the first word of 586 Portuguese shops that
    are not — `Casa do Rum`, `Casa dos Óculos`, `Casa das Fardas` — and a
    padded match would make every one of them a home store.
    """
    normalized = normalize_text(name or '')
    by_brand = {}
    for kind, brand, normalized_brand in index:
        by_brand.setdefault((brand, normalized_brand), set()).add(kind)
    kinds = set()
    for (brand, normalized_brand), brand_kinds in by_brand.items():
        if normalized_brand in GENERIC_WORD_BRANDS:
            if normalized == normalized_brand:
                kinds.update(brand_kinds)
            continue
        if not brand_form_matches(normalized_brand, normalized, name, brand):
            continue
        if venue_contradiction(normalized, normalized_brand, 'store', brand_kinds):
            continue
        kinds.update(brand_kinds)
    return tuple(sorted(kinds))


def store_kind_from_brand(name, index):
    """The single kind for a brand listed under exactly one. Kept for callers
    that want one answer; promotion itself uses store_kinds_from_brand."""
    kinds = store_kinds_from_brand(name, index)
    return kinds[0] if len(kinds) == 1 else None


def is_non_multibanco_atm(name):
    normalized = normalize_text(name or '')
    padded = f' {normalized} '
    return any(f' {operator} ' in padded for operator in NON_MULTIBANCO_ATM_OPERATORS)


def candidate_overrides(country_source_r2_key, batch=None):
    """The small, reviewed batches that cannot safely become broad rules.

    Generic ``shopping`` carries no usable subtype.  A reviewed ID can still
    be promoted, but keeping the decision source-scoped and explicit prevents
    a name fragment from silently classifying the national backlog.
    """
    path = os.path.join(CLOUDFLARE_DIR, 'src', 'overtureCandidateOverrides.json')
    with open(path) as handle:
        source_overrides = json.load(handle).get(country_source_r2_key, {})
    # KAN-432: each review batch is separately runnable.  The legacy flat
    # shape is still accepted so a checked-out older configuration remains
    # readable, but new country batches must name the reviewed group.
    if batch is None:
        return source_overrides if all('poi_type' in value for value in source_overrides.values()) else {}
    return source_overrides.get(batch, {})


def decide(row, mapping, reachable, brand_dictionary, store_kind_aliases=None,
           food_cuisine_aliases=None, financial_service_rules=None, store_brands=None,
           overrides=None):
    """(status, types, attributes, reason) for one candidate.

    `types` is ranked: the category's answer first, then anything the name
    adds. Rank 0 becomes primary_poi_type, which is what the app shows.
    """
    if store_kind_aliases is None:
        store_kind_aliases = store_kind_alias_index()
    if food_cuisine_aliases is None:
        food_cuisine_aliases = food_cuisine_alias_index()
    if financial_service_rules is None:
        financial_service_rules = load_financial_service_name_rules()
    if store_brands is None:
        store_brands = store_brand_index()
    normalized = normalize_text(row['name'] or '')
    if not normalized:
        return 'rejected', (), (), 'unnamed'

    # Rejections come first, and the category outranks the name here. A
    # dentist named "Clínica Farmácia Silva" is still a dentist; letting a
    # name keyword rescue a category we have ruled out would reopen the
    # decision one row at a time.
    if row['category'] in REJECTED_CATEGORIES:
        return 'rejected', (), (), f"rejected category: {row['category']}"
    if normalized.startswith(REJECTED_NAME_PREFIXES):
        return 'rejected', (), (), 'housing development, not a place'

    override = (overrides or {}).get(row.get('overture_id'))
    if override:
        # KAN-455: a reviewed decision applies to either generic category —
        # `shopping` or the empty one — never to a row Meta typed.
        generic_row = (row['category'] or '') in GENERIC_CATEGORIES
        if override.get('decision') == 'rejected':
            # Reviewed exclusions use the same source-scoped, explicit-ID
            # path as promotions.  A generic-shopping candidate that is
            # plainly trade-only or appointment-only should leave the
            # backlog, not be forced into an unusable store subtype.
            if not generic_row or not override.get('reason'):
                raise ValueError(f"invalid reviewed exclusion for {row['overture_id']}")
            return 'rejected', (), (), override['reason']
        # KAN-455: `poi_type` is one type or a ranked list of them — a place
        # that is both a pharmacy and an optician carries both; rank 0 is
        # what the app shows.
        poi_types = override['poi_type'] if isinstance(override['poi_type'], list) else [override['poi_type']]
        store_kind = override.get('store_kind')
        # A reviewed generic-shopping row can either be a typed store, which
        # necessarily needs a subtype, or a real non-store errand such as
        # luggage storage.  The latter must not be forced through the store
        # schema just because Overture filed it under generic shopping.
        if (not generic_row or not poi_types or any(t not in reachable for t in poi_types)
                or len(set(poi_types)) != len(poi_types)
                or ('store' in poi_types and not store_kind)
                or ('store' not in poi_types and store_kind)):
            raise ValueError(f"invalid reviewed override for {row['overture_id']}")
        attributes = (('store_kind', store_kind),) if store_kind else ()
        return 'promoted', tuple(reachable[t] for t in poi_types), attributes, override['reason']

    types, attributes, reason = [], [], None
    entry = mapping.get(row['category'])
    if entry and entry['poi_type'] in reachable:
        types.append(reachable[entry['poi_type']])
        reason = f"category: {row['category']}"
        if entry.get('store_kind'):
            attributes.append(('store_kind', entry['store_kind']))
        if entry.get('food_cuisine'):
            attributes.append(('food_cuisine', entry['food_cuisine']))
        # KAN-431. One category, two errands. A tabacaria IS a tobacco shop
        # and it is also where you buy a lottery ticket; a phone shop sells
        # phones and repairs them. The extra type ranks after the category's
        # own answer, so the primary type — what the app shows — never moves.
        for extra in entry.get('also_types', ()):
            if extra in reachable and reachable[extra] not in types:
                types.append(reachable[extra])

    # The official Multibanco import owns Portugal's Multibanco ATM coverage.
    # A generic Overture ATM is therefore either a duplicate or too ambiguous
    # to publish. An explicitly named independent operator remains useful.
    if 'atm' in types and not is_non_multibanco_atm(row['name']):
        return 'rejected', (), (), 'ATM reserved for official Multibanco source'

    service_type, financial_service_kind = financial_service_classification(
        row['name'], (), financial_service_rules)
    if service_type:
        if 'bank' in types:
            types.remove('bank')
        if service_type in reachable and reachable[service_type] not in types:
            types.append(reachable[service_type])
            reason = f'financial service: {service_type}'
        if financial_service_kind:
            attributes.append(('financial_service_kind', financial_service_kind))

    # KAN-448. A chain's kinds are the chain's, on every branch. The brand
    # may overrule a generic or non-commercial category — `shopping`, or
    # `school` on a Decathlon — but never a commercial one: a `Nespresso`
    # boutique is a café, `C&A Guest House` is a hostel.
    category = row['category'] or ''
    generic = category in GENERIC_CATEGORIES
    # KAN-455. The brand may sit anywhere in the name — `Loja MEO Braga` —
    # unless a venue word says the place is something else: `Tasquinha O
    # Salsa`, `Wok to Walk IKEA Matosinhos`, `Parque Infantil Decathlon`
    # (venue_contradiction, src/venueWords.json).
    chain = store_kinds_from_brand(row['name'], store_brands)
    if chain and not generic and name_agrees_with_category(normalized, category):
        chain = ()
    # KAN-457. A chain refines an umbrella bucket when its kind is one of the
    # bucket's children: `Ale-Hop Faro` under `flowers_and_gifts_shop` is
    # the gift shop, not the florist the map defaults the bucket to.
    refines_umbrella = bool(set(chain) & UMBRELLA_CATEGORY_KINDS.get(category, frozenset()))
    if chain and 'store' in reachable and (generic or category in BRAND_OVERRIDABLE_CATEGORIES or refines_umbrella):
        types = [reachable['store']]
        attributes = [(d, v) for d, v in attributes if d != 'store_kind']
        attributes.extend(('store_kind', kind) for kind in chain)
        reason = f"brand: store/{'+'.join(chain)}"
    elif 'store' in types:
        chain = store_kinds_from_brand(row['name'], store_brands)
        if chain:
            attributes = [(d, v) for d, v in attributes if d != 'store_kind']
            attributes.extend(('store_kind', kind) for kind in chain)
            reason = f"brand: store/{'+'.join(chain)}"
    elif not types and (generic or category in BRAND_OVERRIDABLE_CATEGORIES):
        # Not a store chain — a supermarket, bank or pharmacy chain sitting
        # in generic shopping. Minipreço is a supermarket wherever it is.
        # KAN-455: here the brand must LEAD the name (fallback_brand), not
        # the venue rule the store paths use: a supermarket's or bank's name
        # is borrowed by the car wash, the mall and the post office next to
        # it — `Washy Continente`, `Centro Comercial Continente`, `Loja CTT`
        # — and none of those carries a venue word to refuse on.
        for poi_type in BRAND_TYPES_FOR_OVERRIDE:
            if poi_type in reachable and fallback_brand(row['name'], poi_type, brand_dictionary):
                types = [reachable[poi_type]]
                reason = f'brand: {poi_type}'
                break

    # The name may add, never replace. A category that mapped is the source's
    # considered answer; the name is an inference from a string.
    #
    # It IS allowed to be the sole basis here, which departs from
    # types_from_name's own rule ("never the sole basis for a POI"). That
    # rule exists for OSM, where the alternative is admitting an element
    # nothing identified as a place at all. An Overture candidate is already
    # a known place with a name and a category — the only open question is
    # which type it is — so the name choosing that type invents nothing.
    # "Talho Halal Barakah" filed under `halal_restaurant` is a butcher, and
    # the category is simply wrong.
    named = [reachable[t] for t in types_from_name(normalized, tuple(types))
             if t in reachable]
    if replaces_generic_store(types, named,
                              any(dimension == 'store_kind' for dimension, _ in attributes)):
        types = named
        reason = f'name replaces generic store: {types[0]}'
    if named and row['category'] in NAME_OUTRANKS_CATEGORY:
        # The coarse hair/beauty bucket: the name decides, and goes first.
        types = named + [t for t in types if t not in named]
        reason = f"name over category {row['category']}: {types[0]}"
    else:
        for inferred in named:
            if inferred not in types:
                types.append(inferred)
                reason = reason or f'name: {inferred}'

    # A miradouro, but only when the category already says outdoor place.
    if (VIEWPOINT_NAME in normalized and 'viewpoint' in reachable
            and types and types[0] in VIEWPOINT_HOSTS
            and reachable['viewpoint'] not in types):
        types.append(reachable['viewpoint'])
        reason = reason or 'name: viewpoint'

    if not types:
        return 'pending', (), (), None

    # KAN-431. A bare `store` is promoted and then invisible: the Worker
    # resolves a subtype filter against the row's attributes and a store
    # task cannot exist without a subtype, so a row typed only `store` with
    # no store_kind answers no search that will ever be made for it.
    #
    # Before giving up on one, ask the name — KAN-340's fallback, the same
    # one classify_and_load runs for Foursquare rows tagged `store` with no
    # category-derived kind. The dictionary already knows these words:
    # `papelaria` is an alias of `books`, which is why 75 of them did not
    # need a subtype invented, only looked up.
    if 'store' in types and not any(d == 'store_kind' for d, _ in attributes):
        for kind in match_keyword_subtypes(row['name'], store_kind_aliases):
            attributes.append(('store_kind', kind))
            reason = reason or f'name: store/{kind}'

    if 'restaurant' in types and not any(d == 'food_cuisine' for d, _ in attributes):
        for cuisine in match_keyword_subtypes(row['name'], food_cuisine_aliases):
            attributes.append(('food_cuisine', cuisine))
            reason = reason or f'name: restaurant/{cuisine}'

    # Still nothing, and `store` is all we have: it cannot be reached, so
    # pending is the honest place for it — countable, and visible to
    # whoever adds the missing subtype.
    if list(types) == ['store'] and not any(d == 'store_kind' for d, _ in attributes):
        return 'pending', (), (), None

    return 'promoted', tuple(types), tuple(attributes), reason


def poi_values(row, poi_type, brand_dictionary, refreshed):
    name = row['name']
    open_min, close_min = hours_for_poi_type(poi_type)
    confidence = row.get('confidence')
    return (
        f"({sql_escape(row['overture_id'])},{sql_escape(name)},"
        f"{sql_escape(normalize_text(name) or name.strip().lower())},"
        f"{row['lat']},{row['lng']},"
        f"{sql_escape(encode_geohash(row['lat'], row['lng']))},"
        f"{sql_escape(poi_type)},"
        f"{sql_escape(find_brand(name, [poi_type], brand_dictionary))},"
        f"{sql_escape(row.get('address'))},{sql_escape(row.get('category'))},"
        f"{'NULL' if confidence is None else confidence},"
        f"{sql_escape(row.get('source_datasets'))},"
        f"{'NULL' if open_min is None else open_min},"
        f"{'NULL' if close_min is None else close_min},"
        f"{sql_escape(refreshed)},{sql_escape(refreshed)})"
    )


def batched(prefix, pieces):
    values, size = [], byte_len(prefix) + 2
    for piece in pieces:
        # +2, not +1: join writes ',\n' between values. Same undercount as
        # the loader had.
        piece_size = byte_len(piece) + 2
        if values and (size + piece_size > MAX_STATEMENT_BYTES
                       or len(values) >= MAX_VALUES_TERMS):
            yield prefix + ',\n'.join(values) + ';\n'
            values, size = [], byte_len(prefix) + 2
        values.append(piece)
        size += piece_size
    if values:
        yield prefix + ',\n'.join(values) + ';\n'


def status_updates(decided, status, only_pending=True):
    """What was decided AND why. A status without its reason cannot be
    reviewed by anyone who was not in the room.

    Never overwrites a decision already made: a rerun must not turn a
    promotion into something else because the mapping changed underneath it.
    """
    # One UPDATE per candidate made the pilot convenient but a national run
    # would turn 440k decisions into 440k D1 requests.  Keep each decision's
    # reason using CASE, while applying a bounded batch at a time.
    batch = []
    size = 200
    for overture_id, reason in decided:
        piece = f' WHEN {sql_escape(overture_id)} THEN {sql_escape(reason)}'
        # The id is present both in CASE and IN. Account for both so no
        # generated statement crosses D1's SQL-size limit.
        piece_size = byte_len(piece) + 2 * byte_len(sql_escape(overture_id)) + 4
        if batch and (size + piece_size > MAX_STATEMENT_BYTES or len(batch) >= MAX_VALUES_TERMS):
            yield _status_update_statement(batch, status, only_pending)
            batch, size = [], 200
        batch.append((overture_id, reason))
        size += piece_size
    if batch:
        yield _status_update_statement(batch, status, only_pending)


def _status_update_statement(batch, status, only_pending):
    cases = ''.join(f' WHEN {sql_escape(overture_id)} THEN {sql_escape(reason)}'
                    for overture_id, reason in batch)
    ids = ','.join(sql_escape(overture_id) for overture_id, _ in batch)
    pending_guard = "promotion_status = 'pending' AND " if only_pending else ''
    return (
        'UPDATE overture_candidate SET '
        f'promotion_status = {sql_escape(status)}, '
        f'promotion_note = CASE overture_id{cases} ELSE promotion_note END '
        f"WHERE {pending_guard}overture_id IN ({ids});\n"
    )


def _country_page(rows, mapping, reachable, brand_dictionary, store_kind_aliases,
                  food_cuisine_aliases, financial_service_rules, store_brands,
                  refreshed, overrides=None):
    """Decide one bounded page without retaining the national result set."""
    stats = Counter()
    poi_pieces, type_pieces, attribute_pieces = [], [], []
    promoted, rejected = [], []
    for row in rows:
        status, types, attributes, reason = decide(
            row, mapping, reachable, brand_dictionary, store_kind_aliases,
            food_cuisine_aliases, financial_service_rules, store_brands, overrides)
        stats[status] += 1
        if status == 'promoted':
            promoted.append((row['overture_id'], reason))
            poi_pieces.append(poi_values(row, types[0], brand_dictionary, refreshed))
            for rank, poi_type in enumerate(types):
                type_pieces.append(
                    f"({sql_escape(row['overture_id'])},{sql_escape(poi_type)},{rank})")
            for dimension, value in attributes:
                attribute_pieces.append(
                    f"({sql_escape(row['overture_id'])},{sql_escape(dimension)},"
                    f"{sql_escape(value)})")
        elif status == 'rejected':
            rejected.append((row['overture_id'], reason))
    return stats, poi_pieces, type_pieces, attribute_pieces, promoted, rejected


def run_country(batch, country_source_r2_key):
    """Promote one source in restartable pages through individual D1 writes.

    The serving rows are inserted before the candidate status changes.  A
    stopped page is therefore harmless: its INSERT OR IGNORE writes replay,
    then its still-pending candidates are marked on the next run.
    """
    import d1_client

    mapping = category_map()
    reachable = reachable_types()
    brand_dictionary = load_brand_dictionary()
    store_kind_aliases = store_kind_alias_index()
    food_cuisine_aliases = food_cuisine_alias_index()
    financial_service_rules = load_financial_service_name_rules()
    store_brands = store_brand_index()
    refreshed = date.today().isoformat()
    stats = Counter()
    where = (
        "promotion_status = 'pending' AND country_source_r2_key = "
        f"{sql_escape(country_source_r2_key)}")
    rows = paged(
        'overture_candidate',
        ('overture_id', 'name', 'lat', 'lng', 'address', 'category',
         'category_path', 'confidence', 'source_datasets'),
        'overture_id', batch, where=where)

    page = []
    for row in rows:
        page.append(row)
        if len(page) == batch:
            _promote_country_page(
                page, mapping, reachable, brand_dictionary, store_kind_aliases,
                food_cuisine_aliases, financial_service_rules, store_brands,
                refreshed, stats, d1_client)
            page = []
    if page:
        _promote_country_page(
            page, mapping, reachable, brand_dictionary, store_kind_aliases,
            food_cuisine_aliases, financial_service_rules, store_brands,
            refreshed, stats, d1_client)
    return dict(stats)


def _promote_country_page(page, mapping, reachable, brand_dictionary,
                           store_kind_aliases, food_cuisine_aliases,
                           financial_service_rules, store_brands, refreshed,
                           stats, d1_client, overrides=None, only_pending=True):
    decided = _country_page(
        page, mapping, reachable, brand_dictionary, store_kind_aliases,
        food_cuisine_aliases, financial_service_rules, store_brands, refreshed, overrides)
    page_stats, poi_pieces, type_pieces, attribute_pieces, promoted, rejected = decided
    for prefix, pieces in (
        (POI_INSERT_PREFIX, poi_pieces),
        (TYPE_INSERT_PREFIX, type_pieces),
        (ATTRIBUTE_INSERT_PREFIX, attribute_pieces),
    ):
        for statement in batched(prefix, pieces):
            d1_client.execute(statement)
    # Status is the checkpoint and must be last.  Never put this in a D1
    # batch with the writes above: a national-sized atomic transaction is
    # precisely what exhausted D1 memory.
    for status, decisions in (('promoted', promoted), ('rejected', rejected)):
        for statement in status_updates(decisions, status, only_pending):
            d1_client.execute(statement)
    stats.update(page_stats)


def source_overrides_flat(country_source_r2_key):
    """Every committed reviewed decision for this source, whatever its batch."""
    path = os.path.join(CLOUDFLARE_DIR, 'src', 'overtureCandidateOverrides.json')
    with open(path) as handle:
        source = json.load(handle).get(country_source_r2_key, {})
    if all('poi_type' in value for value in source.values()):
        return dict(source)  # the legacy flat shape
    return {poi_id: entry for batch in source.values() for poi_id, entry in batch.items()}


def run_country_repromote(batch, country_source_r2_key):
    """KAN-455. Decide the rows still `pending` for one source again, under
    the rules and reviewed overrides committed now.

    A row left pending is never looked at again until a full country
    re-import, so a rule or dictionary change (KAN-448's chains, KAN-457's)
    reaches new imports and not the country already served. This is the
    same page loop as run_country over the same `WHERE promotion_status =
    'pending' AND country_source_r2_key = ?`, with the committed overrides
    joined the way an override batch joins them.

    Idempotent by construction: serving rows are `INSERT OR IGNORE`, the
    status update is guarded on `promotion_status = 'pending'`, so a row
    already promoted is untouched and a row the rules still cannot type
    stays pending — and a second run over the same source decides nothing.

    Returns this run's own counts: rows promoted, rejected, and left pending.
    """
    import d1_client

    mapping = category_map()
    reachable = reachable_types()
    brand_dictionary = load_brand_dictionary()
    store_kind_aliases = store_kind_alias_index()
    food_cuisine_aliases = food_cuisine_alias_index()
    financial_service_rules = load_financial_service_name_rules()
    store_brands = store_brand_index()
    overrides = source_overrides_flat(country_source_r2_key)
    refreshed = date.today().isoformat()
    stats = Counter()
    where = (
        "promotion_status = 'pending' AND country_source_r2_key = "
        f"{sql_escape(country_source_r2_key)}")
    rows = paged(
        'overture_candidate',
        ('overture_id', 'name', 'lat', 'lng', 'address', 'category',
         'category_path', 'confidence', 'source_datasets'),
        'overture_id', batch, where=where)

    page = []
    for row in rows:
        page.append(row)
        if len(page) == batch:
            _promote_country_page(
                page, mapping, reachable, brand_dictionary, store_kind_aliases,
                food_cuisine_aliases, financial_service_rules, store_brands,
                refreshed, stats, d1_client, overrides)
            page = []
    if page:
        _promote_country_page(
            page, mapping, reachable, brand_dictionary, store_kind_aliases,
            food_cuisine_aliases, financial_service_rules, store_brands,
            refreshed, stats, d1_client, overrides)
    return {status: stats.get(status, 0) for status in ('promoted', 'rejected', 'pending')}


def repromote_dry_run(archive_csv, backlog_tsv, country_source_r2_key):
    """What run_country_repromote would decide, from the archive alone.

    The candidate rows are the archived source; the pending set is the
    country run's own backlog report (`overture-country-reports/…`), which
    lists every row it left pending. Neither is read from D1 and nothing is
    written. Rows a reviewed batch has promoted since the report are still
    counted here, under `override`, so the override figure is an upper
    bound; the `rule` figures are what the rules alone would newly decide.
    """
    import csv

    pending = set()
    with open(backlog_tsv, newline='') as handle:
        for row in csv.DictReader(handle, delimiter='\t'):
            if row['status'] == 'pending':
                pending.add(row['overture_id'])
    mapping = category_map()
    reachable = reachable_types()
    brand_dictionary = load_brand_dictionary()
    store_kind_aliases = store_kind_alias_index()
    food_cuisine_aliases = food_cuisine_alias_index()
    financial_service_rules = load_financial_service_name_rules()
    store_brands = store_brand_index()
    overrides = source_overrides_flat(country_source_r2_key)
    counts = Counter()
    decided = {'rule': {'promoted': [], 'rejected': []}, 'override': {'promoted': [], 'rejected': []}}
    by_type = Counter()
    with open(archive_csv, newline='') as handle:
        for row in csv.DictReader(handle):
            overture_id = row['overture_id']
            if overture_id not in pending:
                continue
            status, types, _attributes, reason = decide(
                row, mapping, reachable, brand_dictionary, store_kind_aliases,
                food_cuisine_aliases, financial_service_rules, store_brands, overrides)
            basis = 'override' if overture_id in overrides else 'rule'
            counts[(basis, status)] += 1
            if status != 'pending':
                decided[basis][status].append((overture_id, row['name'], row['category'] or '', reason))
            if status == 'promoted' and basis == 'rule':
                by_type[types[0]] += 1
    return {
        'pending_in_report': len(pending),
        'rule': {status: len(decided['rule'][status]) for status in ('promoted', 'rejected')},
        'override': {status: len(decided['override'][status]) for status in ('promoted', 'rejected')},
        'still_pending': counts[('rule', 'pending')] + counts[('override', 'pending')],
        'rule_promoted_by_type': dict(by_type.most_common()),
        'decided': decided,
    }


def run_country_overrides(country_source_r2_key, batch=None):
    """Promote one reviewed batch without scanning the country backlog."""
    import d1_client

    overrides = candidate_overrides(country_source_r2_key, batch)
    if not overrides:
        return {}
    mapping = category_map()
    reachable = reachable_types()
    brand_dictionary = load_brand_dictionary()
    store_kind_aliases = store_kind_alias_index()
    food_cuisine_aliases = food_cuisine_alias_index()
    financial_service_rules = load_financial_service_name_rules()
    store_brands = store_brand_index()
    refreshed = date.today().isoformat()
    stats = Counter()
    ids = sorted(overrides)
    for start in range(0, len(ids), MAX_VALUES_TERMS):
        requested = ids[start:start + MAX_VALUES_TERMS]
        values = ','.join(sql_escape(overture_id) for overture_id in requested)
        rows = d1_client.select(
            'SELECT overture_id, name, lat, lng, address, category, category_path, '
            'confidence, source_datasets FROM overture_candidate '
            "WHERE country_source_r2_key = "
            f"{sql_escape(country_source_r2_key)} AND overture_id IN ({values}) "
            'ORDER BY overture_id')
        _promote_country_page(
            rows, mapping, reachable, brand_dictionary, store_kind_aliases,
            food_cuisine_aliases, financial_service_rules, store_brands,
            refreshed, stats, d1_client, overrides, only_pending=False)
    return dict(stats)


def run(batch, out_dir, dry_run, country_source_r2_key=None):
    mapping = category_map()
    reachable = reachable_types()
    brand_dictionary = load_brand_dictionary()
    store_kind_aliases = store_kind_alias_index()
    food_cuisine_aliases = food_cuisine_alias_index()
    financial_service_rules = load_financial_service_name_rules()
    store_brands = store_brand_index()
    refreshed = date.today().isoformat()

    stats = Counter()
    by_type = Counter()
    unmapped = Counter()
    unmapped_paths = {}
    poi_pieces, type_pieces, attribute_pieces = [], [], []
    promoted, rejected = [], []

    # `overture_id` is the primary key, so it is unique per returned row —
    # the condition paged() requires for its keyset cursor to be safe.
    where = "promotion_status = 'pending'"
    if country_source_r2_key:
        where += f' AND country_source_r2_key = {sql_escape(country_source_r2_key)}'
    for row in paged(
        'overture_candidate',
        ('overture_id', 'name', 'lat', 'lng', 'address', 'category',
         'category_path', 'confidence', 'source_datasets'),
        'overture_id', batch,
        where=where,
    ):
        status, types, attributes, reason = decide(
            row, mapping, reachable, brand_dictionary, store_kind_aliases,
            food_cuisine_aliases, financial_service_rules, store_brands)
        stats[status] += 1
        if status == 'promoted':
            by_type[types[0]] += 1
            promoted.append((row['overture_id'], reason))
            poi_pieces.append(poi_values(row, types[0], brand_dictionary, refreshed))
            for rank, poi_type in enumerate(types):
                type_pieces.append(
                    f"({sql_escape(row['overture_id'])},{sql_escape(poi_type)},{rank})")
            for dimension, value in attributes:
                attribute_pieces.append(
                    f"({sql_escape(row['overture_id'])},{sql_escape(dimension)},"
                    f"{sql_escape(value)})")
        elif status == 'rejected':
            rejected.append((row['overture_id'], reason))
        else:
            key = row['category'] or '(none)'
            unmapped[key] += 1
            unmapped_paths.setdefault(key, row.get('category_path') or '')

    print(f"\nscanned   {sum(stats.values()):,}")
    print(f"promoted  {stats['promoted']:,}")
    print(f"pending   {stats['pending']:,}")
    print(f"rejected  {stats['rejected']:,}")
    print('\npromoted by type:')
    for poi_type, count in by_type.most_common(20):
        print(f'  {count:7,}  {poi_type}')
    print(f'\nunmapped categories ({len(unmapped)}), top 20 — the mapping backlog:')
    for category, count in unmapped.most_common(20):
        print(f'  {count:7,}  {category}')

    # The whole backlog, not the top of it. Printing 20 of 445 is how a
    # category with real places in it stays invisible: nobody scrolls past
    # the summary, and the only way anyone found the last few was guessing
    # what to search for. The file is the country run's review list.
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
        backlog_path = os.path.join(out_dir, 'unmapped_categories.tsv')
        with open(backlog_path, 'w') as handle:
            handle.write('rows\tcategory\tcategory_path\n')
            for category, count in unmapped.most_common():
                handle.write(f'{count}\t{category}\t{unmapped_paths.get(category, "")}\n')
        print(f'\nfull backlog ({len(unmapped)} categories) -> {backlog_path}')

    if dry_run:
        print('\n--dry-run: no SQL written')
        return dict(stats)

    os.makedirs(out_dir, exist_ok=True)
    for name, statements in (
        ('00_overture_poi', batched(POI_INSERT_PREFIX, poi_pieces)),
        ('01_overture_poi_type', batched(TYPE_INSERT_PREFIX, type_pieces)),
        ('02_overture_poi_attribute', batched(ATTRIBUTE_INSERT_PREFIX, attribute_pieces)),
        ('03_status_promoted', status_updates(promoted, 'promoted')),
        ('04_status_rejected', status_updates(rejected, 'rejected')),
    ):
        path = os.path.join(out_dir, f'{name}.sql')
        with open(path, 'w') as handle:
            handle.writelines(statements)
        print(f'wrote {path}')
    return dict(stats)


def main(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument('--sql-out', required=True)
    parser.add_argument('--batch', type=int, default=10000)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args(argv)
    # paged() uses this as its LIMIT. Zero returns no rows and the keyset
    # cursor never advances, so the scan spins forever reporting nothing.
    if args.batch < 1:
        parser.error('--batch must be at least 1')
    run(args.batch, args.sql_out, args.dry_run)
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
