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
             'lighthouse': 'lighthouse', 'theatre': 'theatre', 'mosque': 'church', 'synagogue': 'church'}
BUILDING = {'monastery', 'cloister', 'cathedral', 'church', 'chapel', 'tomb', 'museum', 'castle', 'fort', 'palace',
            'tower', 'gallery', 'theatre'}
OPEN_SPACE = {'garden', 'park', 'square'}
# Different kinds sharing a name are a red flag only inside one religious
# complex (the church, cloister and tombs of a monastery). A tower, fountain,
# statue or castle beside a monastery shares the town's name, not its identity.
COMPLEX = {'monastery', 'cloister', 'cathedral', 'church', 'chapel', 'tomb'}
# metres within which two rows of a kind can be one place
RADIUS = {'monastery': 250, 'cathedral': 200, 'castle': 250, 'fort': 200, 'palace': 150, 'museum': 150,
          'church': 120, 'chapel': 60, 'cloister': 150, 'tomb': 120, 'fountain': 40, 'statue': 40, 'monument': 60,
          'tower': 60, 'bridge': 150, 'garden': 150, 'park': 200, 'square': 100, 'gallery': 80, 'theatre': 100}
FILLER = {'of', 'the', 'and', 'de', 'do', 'da', 'dos', 'das', 'e', 'a', 'o', 'os', 'as', 'ao', 'aos', 'del', 'la',
          'le', 'les', 'el', 'los', 'di', 'du', 'des', 'em', 'no', 'na', 'old', 'antigo', 'antiga', 'santa', 'santo',
          'saint', 'sao', 'st', 'nossa', 'senhora', 'our', 'lady', 'i', 'ii', 'iii'}


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


def describe(row, terms):
    """(kind, distinctive words) for one row."""
    raw = fold(row['name'])
    kind = next((KIND_WORDS[w] for w in raw if w in KIND_WORDS), None) or TYPE_KIND.get(row.get('type'), 'other')
    # Distinctive words, translated so "Jardim Botânico" and "Botanical Garden" share them.
    words = [x for w in raw if w not in KIND_WORDS for x in terms.get(w, w).split()]
    distinctive = {w for w in words if w not in KIND_WORDS and w not in FILLER and len(w) > 1}
    return kind, distinctive


def metres(a, b):
    return math.hypot((a['lat'] - b['lat']) * 111320, (a['lng'] - b['lng']) * 111320 * math.cos(math.radians(a['lat'])))


def verdict(a, b, terms):
    """'duplicate' | 'validate' | 'separate' for two rows."""
    (ka, wa), (kb, wb) = describe(a, terms), describe(b, terms)
    if metres(a, b) > max(RADIUS.get(ka, 60), RADIUS.get(kb, 60)):
        return 'separate'
    shared = wa & wb
    if ka == kb:
        return 'duplicate' if shared else 'validate'
    if (ka in OPEN_SPACE) != (kb in OPEN_SPACE):
        return 'separate'
    if ka in COMPLEX and kb in COMPLEX and shared:
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
