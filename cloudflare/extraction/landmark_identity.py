"""
KAN-461. When are two landmark rows the same place?

Distance alone never decides (registry rule): a monastery, the fountain in
front of it and the tower beside it are three places 20 m apart. The owner's
rule (2026-11-16): **the same kind of landmark twice, close together, is a
red flag** — two monasteries 40 m apart are almost certainly one monastery
under two names, often two languages.

Each row gets

  * a **kind**, read from its name in any language the term table knows
    (`docs/kan-433/landmark-terms.json`: mosteiro → monastery, túmulo → tomb,
    igreja → church …), else from its type;
  * its **distinctive words**: the name, translated, without kind words and
    filler ("Jerónimos Monastery" and "Mosteiro dos Jerónimos" → {jeronimos}).

A pair within the kind's radius is

  duplicate  same kind, sharing a distinctive word        → keep one
  validate   same kind, no shared word (the red flag), or
             two kinds of one religious complex sharing a word
             ("Igreja dos Jerónimos" by "Jerónimos Monastery") → a person decides
  separate   anything else                                → both stay

A square, park or street named after the monument it faces is not that
monument, so open-space kinds never pair with building kinds.
"""
from __future__ import annotations

import json
import math
import os
import re
import unicodedata
from collections import Counter
from itertools import combinations

TERMS_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                          'docs', 'kan-433', 'landmark-terms.json')

KINDS_PATH = os.path.join(os.path.dirname(TERMS_PATH), '..', 'kan-461', 'landmark-kinds.json')


def load_kind_words(path=KINDS_PATH):
    """{folded word: kind} over every language block."""
    data = json.load(open(path, encoding='utf-8'))
    return {''.join(fold(w)): kind for lang, table in data.items() if not lang.startswith('_') for w, kind in table.items()}

# A kind no word names comes from the row's type.
TYPE_KIND = {'church': 'church', 'museum': 'museum', 'historical_landmark': 'monument', 'park': 'park',
             'plaza': 'square', 'botanical_garden': 'garden', 'art_gallery': 'gallery', 'bridge': 'bridge',
             'lighthouse': 'lighthouse', 'theatre': 'theatre', 'mosque': 'mosque', 'synagogue': 'synagogue',
             'tourist_attraction': 'attraction', 'viewpoint': 'viewpoint', 'beach': 'beach', 'marina': 'marina',
             'nature_preserve': 'nature', 'hiking_area': 'trail', 'lake': 'lake', 'river': 'river', 'waterfall': 'waterfall',
             'aquarium': 'aquarium', 'zoo': 'zoo', 'amusement_park': 'amusement', 'hot_spring': 'spring', 'mountain': 'mountain'}
# The landmark family: rows of these types are compared; anything else (a café, a shop) never is.
LANDMARK_TYPES = frozenset(TYPE_KIND)
BUILDING = {'monastery', 'cloister', 'cathedral', 'church', 'chapel', 'tomb', 'museum', 'castle', 'fort', 'palace',
            'tower', 'gallery', 'theatre'}
OPEN_SPACE = {'garden', 'park', 'square'}
# A name led by one of these is that place, whatever else it names: "Praça do
# Museu de Marinha" is a square, "Praia do Castelo do Queijo" a beach,
# "Miradouro do Castelo" a viewpoint (2026-11-19).
NAMED_AFTER = OPEN_SPACE | {'beach', 'viewpoint', 'lake'}
# Different kinds sharing a name are a red flag only inside one religious
# complex (the church, cloister and tombs of a monastery). A tower, fountain,
# statue or castle beside a monastery shares the town's name, not its identity.
COMPLEX = {'monastery', 'cloister', 'cathedral', 'church', 'chapel', 'tomb'}
# metres within which two rows of a kind can be one place
RADIUS = {'monastery': 250, 'cathedral': 200, 'castle': 250, 'fort': 200, 'palace': 150, 'museum': 150,
          'church': 120, 'chapel': 60, 'cloister': 150, 'tomb': 120, 'fountain': 40, 'statue': 40, 'monument': 60,
          'tower': 60, 'bridge': 150, 'garden': 150, 'park': 200, 'square': 100, 'gallery': 80, 'theatre': 100, 'lake': 150,
          'beach': 300, 'viewpoint': 60}
FILLER = {'of', 'the', 'and', 'de', 'do', 'da', 'dos', 'das', 'e', 'a', 'o', 'os', 'as', 'ao', 'aos', 'del', 'la',
          'le', 'les', 'el', 'los', 'di', 'du', 'des', 'em', 'no', 'na', 'old', 'antigo', 'antiga', 'santa', 'santo',
          'saint', 'sao', 'st', 'nossa', 'senhora', 'our', 'lady', 'i', 'ii', 'iii',
          # KAN-461, 2026-11-18: words every gallery or room shares ("Galeria de Arte de São Bento"
          # is not "Galeria Acervo"; "Salle du Chapitre" is not "Salle de D. Manuel").
          'art', 'arte', 'arts', 'artes', 'contemporary', 'contemporanea', 'contemporaneo',
          'sala', 'salle', 'room', 'hall',
          # 2026-11-19: "Centro Social …" of the parish is not "Centro Social …" of the town hall
          'centro', 'center', 'centre', 'social', 'municipal', 'urbano', 'urban',
          # "Igreja Paroquial da Ajuda" is "Igreja de Nossa Senhora da Ajuda": the parish is not a name
          'paroquial', 'paroquia', 'parish', 'matriz', 'mother'}


def fold(value):
    value = ''.join(c for c in unicodedata.normalize('NFKD', (value or '').lower()) if not unicodedata.combining(c))
    return re.findall(r'[a-z0-9]+', value)


def load_terms(path=TERMS_PATH):
    """{word: canonical English word} over every language in the table."""
    data = json.load(open(path, encoding='utf-8'))
    out = {}
    for lang, table in data.items():
        if lang.startswith('_') or lang == 'countries' or not isinstance(table, dict):
            continue
        for word, canonical in table.items():
            for w in fold(word):
                out.setdefault(w, ' '.join(fold(canonical)))
    return out


KIND_WORDS = load_kind_words()
# A kind word that is also a common place-reference: "Sé" names the cathedral
# only as the first word ("Sé de Lisboa"); "Elevador da Sé" is a lift.
LEADING_ONLY = {'se'}
PLACES_PATH = os.path.join(os.path.dirname(TERMS_PATH), '..', 'kan-461', 'place-names-PT.txt')
# Two rows of one kind with different names are a red flag only this close.
RED_FLAG_METRES = 40
# KAN-461 sample, 2026-11-18. The same full name this close is one place,
# whatever each source called its type: "Reserva Florestal de Recreio da Boca
# da Baleia" came in as an OSM hiking area 91 m from the Foursquare park.
SAME_NAME_METRES = 150
SAME_KIND = {'statue': 'monument'}
# Kinds a town has one of, so two rows named only after the town are one place.
ONE_PER_PLACE = {'cathedral'}
SIMILAR = 0.82
# Not a place to visit, whatever the type says.
NOT_A_PLACE_WORDS = {'apartment', 'apartments', 'apartamento', 'apartamentos', 'home', 'homes', 'suite', 'suites',
                     'hostel', 'flat', 'flats', 'rooms', 'deluxe', 'airbnb', 'guesthouse', 'alojamento', 'fest',
                     'festival', 'tours', 'best',
                     # a scout group or a catechism class meets at the church; it is not the church
                     'catequese', 'catechism', 'agrupamento', 'escuteiros', 'escutismo', 'cne'}
STREET_WORDS = {'rua', 'avenida', 'av', 'travessa', 'beco', 'calcada', 'escadinhas', 'estrada', 'street', 'road',
                'avenue', 'calle', 'rue', 'via'}


def load_place_names(path=PLACES_PATH):
    """Place names as folded word tuples, longest first."""
    names = set()
    for line in open(path, encoding='utf-8'):
        if line.strip() and not line.startswith('#'):
            toks = tuple(t for t in fold(line) if t not in FILLER)
            if toks:
                names.add(toks)
    return sorted(names, key=len, reverse=True)


PLACE_NAMES = load_place_names()


def add_place_names(names):
    """More place names, e.g. every `locality` in the country's Overture file —
    so "Sacavém" is a town, not a church's name, in any country."""
    global PLACE_NAMES
    extra = {tuple(t for t in fold(n) if t not in FILLER) for n in names if n}
    PLACE_NAMES = sorted(set(PLACE_NAMES) | {e for e in extra if e}, key=len, reverse=True)
    _DESCRIBED.clear()


def _strip_places(words):
    """Words that belong to a place name (Lisboa, Aguiar da Beira, Lisbon) come off.
    Exact only: Camões is not the hamlet Camboes."""
    out = list(words)
    for name in PLACE_NAMES:
        n = len(name)
        i = 0
        while i + n <= len(out):
            if tuple(out[i:i + n]) == name:
                del out[i:i + n]
            else:
                i += 1
    return out


_DESCRIBED = {}


def describe(row, terms):
    """(kinds, distinctive words) for one row, cached by (name, type)."""
    key = (row['name'], row.get('type'))
    if key not in _DESCRIBED:
        _DESCRIBED[key] = _describe(row, terms)
    return _DESCRIBED[key]


def _kind_positions(raw):
    """Positions of kind words that are not part of a town's name: "Castelo
    Branco" and "Ponte de Lima" are towns, not a castle and a bridge
    (2026-11-19, the Sé of Castelo Branco). Only multi-word town names with a
    kind word in them; "Castelo de Castelo de Vide" keeps its castle."""
    content = [(i, w) for i, w in enumerate(raw) if w not in FILLER]
    words = [w for _, w in content]
    town = set()
    for name in PLACE_NAMES:
        if len(name) < 2 or not any(w in KIND_WORDS for w in name):
            continue
        n = len(name)
        for j in range(len(words) - n + 1):
            if tuple(words[j:j + n]) == name and not town & {content[k][0] for k in range(j, j + n)}:
                town |= {content[k][0] for k in range(j, j + n)}
    return [i for i, w in enumerate(raw) if w in KIND_WORDS and i not in town and (w not in LEADING_ONLY or i == 0)]


def _describe(row, terms):
    raw = fold(row['name'])
    positions = _kind_positions(raw)
    kinds = {KIND_WORDS[raw[i]] for i in positions}
    if not kinds:
        kinds = {TYPE_KIND.get(row.get('type'), 'other')}
    else:
        first = KIND_WORDS[raw[positions[0]]]
        if first in NAMED_AFTER:
            # "Praça do Museu de Marinha", "Praia do Castelo do Queijo": the place named after the building
            kinds = {first}
    # A bust or statue is a monument: OSM's "Augusto Rosa" (historic=memorial)
    # is Foursquare's "Busto de Augusto Rosa".
    kinds = {SAME_KIND.get(k, k) for k in kinds}
    # Distinctive words, translated so "Jardim Botânico" and "Botanical Garden" share them,
    # without place names, so "de Lisboa" makes no two churches alike.
    words = [x for w in raw if w not in KIND_WORDS for x in terms.get(w, w).split()]
    words = [w for w in words if w not in KIND_WORDS and w not in FILLER and len(w) > 1]
    distinctive = {w for w in _strip_places(words) if not w.isdigit()}
    return kinds, distinctive


def _all_words(row, terms):
    """Distinctive words with place names kept: a church named after its
    parish ("Igreja de Madalena") has nothing else to go on."""
    raw = fold(row['name'])
    words = [x for w in raw if w not in KIND_WORDS for x in terms.get(w, w).split()]
    return {w for w in words if w not in KIND_WORDS and w not in FILLER and len(w) > 1 and not w.isdigit()}


def _similar(x, y):
    # Near-matches only between longer words: Magdalene ≈ Madalena, but Paulo is not Paulino.
    from difflib import SequenceMatcher
    return x == y or (min(len(x), len(y)) >= 6 and SequenceMatcher(None, x, y).ratio() >= SIMILAR)


def shares(wa, wb):
    """Some distinctive word of one is (nearly) a word of the other: Magdalene ≈ Madalena."""
    return any(_similar(x, y) for x in wa for y in wb)


def not_a_place(row, terms):
    """Why a row is not a place to visit, or None."""
    words = fold(row['name'])
    if not words:
        return 'no name'
    # "Museu do CNE" is a museum: a name led by a kind word is never ruled out by these words.
    if set(words) & NOT_A_PLACE_WORDS and words[0] not in KIND_WORDS:
        return 'a rental, event or advert, not a place'
    joined = ' '.join(words)
    if words[0] in STREET_WORDS and not any(x in joined for x in ('via sacra', 'street art', 'mural')):
        return 'a street address'
    kinds, distinctive = describe(row, terms)
    if not distinctive and not (set(words) & set(KIND_WORDS)):
        return 'only a place name'
    if not _all_words(row, terms) and len(words) == 1:
        return 'only a kind word, no name'
    return None


# Words too common within a kind to tell two places apart ("arte" among
# galleries, "deus" or "graca" among churches). Learned from the served rows
# with learn_common_words(); empty until then, so the rule works without it.
COMMON = {}


def learn_common_words(rows, terms, min_rows=5, share=0.01):
    """Per kind, the distinctive words that appear in at least `min_rows` rows
    and `share` of that kind's rows. Measured from our own data, so it holds
    in any language."""
    seen, total = {}, Counter()
    for r in rows:
        kinds, words = describe(r, terms)
        for k in kinds:
            total[k] += 1
            seen.setdefault(k, Counter()).update(words)
    COMMON.clear()
    for k, counts in seen.items():
        limit = max(min_rows, share * total[k])
        COMMON[k] = {w for w, n in counts.items() if n >= limit}
    return COMMON


def metres(a, b):
    return math.hypot((a['lat'] - b['lat']) * 111320, (a['lng'] - b['lng']) * 111320 * math.cos(math.radians(a['lat'])))


def verdict(a, b, terms):
    """'duplicate' | 'validate' | 'separate' for two rows."""
    (ka, wa), (kb, wb) = describe(a, terms), describe(b, terms)
    d = metres(a, b)
    if ka & kb and fold(a['name']) == fold(b['name']) and d <= max(RADIUS.get(k, 60) for k in ka & kb):
        return 'duplicate'   # "Chafariz da Fonte Santa" twice: nothing distinctive, same name
    if fold(a['name']) == fold(b['name']) and d <= SAME_NAME_METRES:
        return 'duplicate'   # same name, two sources' types for it
    common = ka & kb
    noise = set().union(*(COMMON.get(k, set()) for k in (common or ka | kb)))
    wa, wb = wa - noise, wb - noise
    if common:
        if d > max(RADIUS.get(k, 60) for k in common):
            return 'separate'
        if shares(wa, wb):
            return 'duplicate'
        if not wa or not wb:
            # Named only after the place. One cathedral per city: "Lisbon Cathedral"
            # is "Catedral Lisboa". Not so for squares or churches — "Largo da Sé" and
            # "Largo da Madalena" are two squares.
            if not wa and not wb and common & ONE_PER_PLACE:
                return 'duplicate'
            # Only the place name is left on one side: the same place only if the
            # other row's own word IS that place name, right beside it ("Igreja de
            # Madalena" = "Church of Saint Mary Magdalene", 13 m). "Igreja de Santo
            # António do Estoril" is not "Igreja dos Salesianos Estoril" (2026-11-19).
            if d <= RED_FLAG_METRES:
                named = wa or wb
                bare = b if wa else a
                if (shares(named, _all_words(bare, terms)) if named
                        else shares(_all_words(a, terms), _all_words(b, terms))):
                    return 'duplicate'
        return 'validate' if d <= RED_FLAG_METRES else 'separate'
    if bool(ka & OPEN_SPACE) != bool(kb & OPEN_SPACE):
        return 'separate'
    if ka & COMPLEX and kb & COMPLEX and shares(wa, wb) and d <= max(RADIUS.get(k, 60) for k in ka | kb):
        return 'validate'
    return 'separate'


def pairs(rows, terms):
    """[(a, b, verdict)] for every pair that is not 'separate'."""
    out = []
    for a, b in combinations(rows, 2):
        v = verdict(a, b, terms)
        if v != 'separate':
            out.append((a, b, v))
    return out
