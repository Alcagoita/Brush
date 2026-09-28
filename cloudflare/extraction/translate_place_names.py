"""
KAN-471 stage 2b. The Portuguese name for a place Overture named in English,
where the English name is a DESCRIPTOR plus a proper noun.

WHAT THIS DOES AND DOES NOT CLAIM

`Porto Santo Beach` is `Praia do Porto Santo`. `Chapel Nossa Senhora da
Rocha` is `Capela Nossa Senhora da Rocha`. Nothing needs looking up: the
proper noun is already Portuguese or stays as it is, and only the descriptor
and the connecting preposition change. That is this module's whole scope.

It does NOT claim to produce a name where the real one differs from the
literal rendering. `Maritime museum` is `Museu de Marinha`, not `Museu
Marítimo`; `Jerónimos Monastery` is `Mosteiro dos Jerónimos`, not `Mosteiro
Jerónimos`. Those are facts about the world, and `wikidata_native_names.py`
looks them up. THIS MODULE RUNS SECOND, on what Wikidata did not answer, and
everything it produces is a proposal a human confirms.

WHERE IT REFUSES

The preposition is the hard part, because Portuguese contracts it with the
article the toponym takes: `Praia do Porto Santo` but `Praia de Machico`,
`Castelo dos Mouros` but `Castelo de Marvão`. There is no rule — the article
belongs to the place name. `ARTICLES` records the ones we have seen;
anything else gets a bare `de` and is flagged `needs_review`, because a
wrong preposition is a wrong name and the point is not to invent one.

    python3 translate_place_names.py --review docs/kan-471/…json --out …json
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata

EXTRACTION_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, EXTRACTION_DIR)

# English descriptor -> (Portuguese, gender). The gender is needed because an
# adjective agrees with it: `Ponte Romana` but `Parque Urbano`.
DESCRIPTORS_GENDERED = {
    'cathedral': ('Sé', 'f'), 'church': ('Igreja', 'f'), 'chapel': ('Capela', 'f'),
    'monastery': ('Mosteiro', 'm'), 'convent': ('Convento', 'm'), 'hermitage': ('Ermida', 'f'),
    'sanctuary': ('Santuário', 'm'), 'basilica': ('Basílica', 'f'), 'mosque': ('Mesquita', 'f'),
    'synagogue': ('Sinagoga', 'f'), 'castle': ('Castelo', 'm'), 'fortress': ('Fortaleza', 'f'),
    'fort': ('Forte', 'm'), 'tower': ('Torre', 'f'), 'palace': ('Palácio', 'm'),
    'beach': ('Praia', 'f'), 'park': ('Parque', 'm'), 'garden': ('Jardim', 'm'),
    'lighthouse': ('Farol', 'm'), 'bridge': ('Ponte', 'f'), 'aqueduct': ('Aqueduto', 'm'),
    'museum': ('Museu', 'm'), 'monument': ('Monumento', 'm'), 'fountain': ('Fonte', 'f'),
    'mill': ('Moinho', 'm'), 'waterfall': ('Cascata', 'f'), 'cave': ('Gruta', 'f'),
    'island': ('Ilha', 'f'), 'viewpoint': ('Miradouro', 'm'), 'square': ('Praça', 'f'),
    'cemetery': ('Cemitério', 'm'), 'ruins': ('Ruínas', 'f'), 'lake': ('Lago', 'm'),
    'cape': ('Cabo', 'm'), 'quay': ('Cais', 'm'), 'keep': ('Torre de Menagem', 'f'),
}
DESCRIPTORS = {english: pair[0] for english, pair in DESCRIPTORS_GENDERED.items()}
GENDER = {english: pair[1] for english, pair in DESCRIPTORS_GENDERED.items()}

# Two English words, neither of them the name: both get translated.
# `Park and Palace of Monserrate` is `Parque e Palácio de Monserrate`;
# `Waterfall Lake` is `Cascata do Lago`; `The Roman Bridge` is `Ponte Romana`.
# Owner's rule, 2026-09-28.
MULTIWORD = {
    'national park': ('Parque Nacional', 'm'),
    'national palace': ('Palácio Nacional', 'm'),
    'urban garden': ('Jardim Urbano', 'm'),
    'urban park': ('Parque Urbano', 'm'),
    'botanical garden': ('Jardim Botânico', 'm'),
    'natural park': ('Parque Natural', 'm'),
    'municipal park': ('Parque Municipal', 'm'),
    'forest park': ('Parque Florestal', 'm'),
    'water park': ('Parque Aquático', 'm'),
    'roman bridge': ('Ponte Romana', 'f'),
    'roman ruins': ('Ruínas Romanas', 'f'),
    'castle keep': ('Torre de Menagem', 'f'),
    'tower of the keep': ('Torre de Menagem', 'f'),
}

# An adjective agrees with the descriptor it qualifies: (masculine, feminine).
ADJECTIVES = {
    'roman': ('Romano', 'Romana'), 'national': ('Nacional', 'Nacional'),
    'urban': ('Urbano', 'Urbana'), 'municipal': ('Municipal', 'Municipal'),
    'natural': ('Natural', 'Natural'), 'botanical': ('Botânico', 'Botânica'),
    'old': ('Velho', 'Velha'), 'new': ('Novo', 'Nova'),
    'forest': ('Florestal', 'Florestal'), 'maritime': ('Marítimo', 'Marítima'),
    'main': ('Principal', 'Principal'), 'small': ('Pequeno', 'Pequena'),
    'great': ('Grande', 'Grande'), 'high': ('Alto', 'Alta'), 'low': ('Baixo', 'Baixa'),
}

# Names the owner has confirmed ARE the place's name, whatever they look
# like. Nothing about these is translated (owner's list, 2026-09-28). Folded
# at import, below `fold`.
KEEP_AS_IS = (
    'Yuppi kids park', 'UnderGround Park', 'Under The Bridge',
    'Tempo de Adorar - Cosmopolitan Church', 'Sirius Park',
    'Silver Coast Non Denominational English Church',
    'Quinta do Mouricão Mobile Home Park', 'Pink Palace',
)

# Set phrases that are names in their own right, not descriptor + noun.
PHRASES = {
    'our lady of': 'Nossa Senhora',
    'our lady': 'Nossa Senhora',
    'holy trinity': 'Santíssima Trindade',
    'holy spirit': 'Espírito Santo',
    'holy cross': 'Santa Cruz',
    'mother church': 'Igreja Matriz',
    'main church': 'Igreja Matriz',
    'parish church': 'Igreja Paroquial',
    'old church': 'Igreja Velha',
    'town hall': 'Câmara Municipal',
    'city hall': 'Câmara Municipal',
}

# `Saint John` is `São João`; `Saint Ann` is `Santa Ana`; `Saint Anthony` is
# `Santo António`. The form depends on the saint, not on a rule.
SAINTS = {
    'john': ('São', 'João'), 'peter': ('São', 'Pedro'), 'paul': ('São', 'Paulo'),
    'james': ('São', 'Tiago'), 'michael': ('São', 'Miguel'), 'george': ('São', 'Jorge'),
    'martin': ('São', 'Martinho'), 'vincent': ('São', 'Vicente'), 'sebastian': ('São', 'Sebastião'),
    'francis': ('São', 'Francisco'), 'dominic': ('São', 'Domingos'), 'lawrence': ('São', 'Lourenço'),
    'nicholas': ('São', 'Nicolau'), 'matthew': ('São', 'Mateus'), 'mark': ('São', 'Marcos'),
    'luke': ('São', 'Lucas'), 'benedict': ('São', 'Bento'), 'bartholomew': ('São', 'Bartolomeu'),
    'christopher': ('São', 'Cristóvão'), 'roch': ('São', 'Roque'), 'joseph': ('São', 'José'),
    'anthony': ('Santo', 'António'), 'andrew': ('Santo', 'André'), 'stephen': ('Santo', 'Estêvão'),
    'ildefonso': ('Santo', 'Ildefonso'), 'amaro': ('Santo', 'Amaro'),
    'mary': ('Santa', 'Maria'), 'ann': ('Santa', 'Ana'), 'anne': ('Santa', 'Ana'),
    'catherine': ('Santa', 'Catarina'), 'lucy': ('Santa', 'Luzia'), 'barbara': ('Santa', 'Bárbara'),
    'clare': ('Santa', 'Clara'), 'elizabeth': ('Santa', 'Isabel'), 'martha': ('Santa', 'Marta'),
    'rita': ('Santa', 'Rita'), 'teresa': ('Santa', 'Teresa'), 'cecilia': ('Santa', 'Cecília'),
    'margaret': ('Santa', 'Margarida'), 'helen': ('Santa', 'Helena'),
}

# Learned from the archive rather than guessed: 350,415 Portuguese names
# already say `Praia do Porto Santo`, `Castelo dos Mouros` and `Praia da
# Calheta`, which is 6,399 worked examples over 4,566 toponyms. A toponym
# the archive disagrees about, or has never seen, is flagged rather than
# guessed — a wrong preposition is a wrong name.
LEARN_DESCRIPTORS = (
    'Praia|Parque|Igreja|Capela|Castelo|Farol|Ponte|Miradouro|Cascata|Jardim|'
    'Mosteiro|Convento|Forte|Fortaleza|Torre|Pal[\u00e1a]cio|Ermida|Santu[\u00e1a]rio|S[\u00e9e]|'
    'Museu|Monumento|Fonte|Gruta|Ilha|Cabo|Pra[\u00e7c]a|Cemit[\u00e9e]rio|Aqueduto|Moinho|Ru[\u00edi]nas'
)


def learn_vocabulary(archive_path, minimum=3):
    """The words Portuguese place names in this country actually use.

    Enumerating English words by hand does not scale — `Avenue`, `Palms`,
    `Gardens`, `Son` all slipped past a list. The archive knows better: a
    word that appears in Portuguese names over and over (`Machico`,
    `Falésia`, `Ribeira`) is a word we can carry into a Portuguese name, and
    one that never appears there is a word we should not."""
    import collections
    import csv as _csv
    english = set(DESCRIPTORS) | set(ENGLISH_WORDS)
    counts = collections.Counter()
    with open(archive_path, newline='') as handle:
        for row in _csv.DictReader(handle):
            folded = fold(row.get('name') or '')
            words = folded.split()
            if not words or english.intersection(words):
                continue  # not evidence of Portuguese usage
            # Require a Portuguese connector. Without this the vocabulary
            # fills with the English business names the archive also holds
            # (`Atlantic Gardens`, `Pestana Palms`), and then it vouches for
            # exactly the words it exists to catch.
            if not {'de', 'do', 'da', 'dos', 'das'}.intersection(words):
                continue
            counts.update(words)
    return {word for word, count in counts.items() if count >= minimum}


def learn_articles(archive_path):
    """{folded toponym: preposition} from the archive's own Portuguese names.

    A clear majority wins. A tie means the archive genuinely disagrees —
    `Machico` appears once as `de` and once as `do` — and returns None, so
    the caller flags it instead of picking a side."""
    import collections
    import csv as _csv
    pattern = re.compile(rf'^(?:{LEARN_DESCRIPTORS})\s+(de|do|da|dos|das)\s+(.+)$', re.IGNORECASE)
    votes = collections.defaultdict(collections.Counter)
    with open(archive_path, newline='') as handle:
        for row in _csv.DictReader(handle):
            match = pattern.match((row.get('name') or '').strip())
            if match:
                votes[fold(match.group(2))][match.group(1).lower()] += 1
    learned = {}
    for toponym, counts in votes.items():
        ranked = counts.most_common(2)
        if len(ranked) == 1 or ranked[0][1] > ranked[1][1]:
            learned[toponym] = ranked[0][0]
    return learned


# The hand-written fallback, for a toponym the archive never shows.
# `de` + `o` is `do`, `de` + `a` is `da`, and a plural gives `dos`/`das`.
# This is a record of what we have seen, never a rule: the article belongs
# to the name. An unknown toponym gets a bare `de` and is flagged.
ARTICLES = {
    'o': ('porto', 'porto santo', 'funchal', 'monte', 'faial', 'pico', 'topo',
          'estoril', 'algarve', 'cabo', 'seixal', 'barreiro', 'montijo', 'fundão',
          'crato', 'sabugal', 'redondo', 'cartaxo', 'entroncamento', 'sardoal',
          'bombarral', 'cadaval', 'rosário', 'salvador', 'carmo', 'douro', 'tejo'),
    'a': ('madeira', 'calheta', 'lagoa', 'ponta', 'rocha', 'serra', 'ilha',
          'falésia', 'falesia', 'luz', 'nazaré', 'nazare', 'guarda', 'covilhã',
          'covilha', 'amadora', 'moita', 'batalha', 'golegã', 'golega', 'lousã',
          'lousa', 'marinha', 'trofa', 'maia', 'foz', 'graça', 'graca', 'sé', 'se'),
    'os': ('mouros', 'jerónimos', 'jeronimos', 'olivais', 'anjos', 'arcos'),
    'as': ('caldas', 'antas', 'taipas', 'furnas', 'velas'),
}
CONTRACTIONS = {'o': 'do', 'a': 'da', 'os': 'dos', 'as': 'das', None: 'de'}

# A remainder that begins with a Portuguese common noun takes that noun's
# article, not the toponym's: `Lighthouse of Praia da Barra` is
# `Farol DA Praia da Barra`.
COMMON_NOUN_ARTICLES = {
    'praia': 'a', 'ponta': 'a', 'ribeira': 'a', 'serra': 'a', 'ilha': 'a',
    'igreja': 'a', 'capela': 'a', 'fonte': 'a', 'ponte': 'a', 'torre': 'a',
    'jardim': 'o', 'parque': 'o', 'monte': 'o', 'castelo': 'o', 'forte': 'o',
    'cabo': 'o', 'porto': 'o', 'mosteiro': 'o', 'convento': 'o', 'moinho': 'o',
    'moinhos': 'os', 'lagoas': 'as', 'lago': 'o', 'lagoa': 'a', 'cais': 'o',
    'gruta': 'a', 'ermida': 'a', 'praca': 'a', 'praça': 'a', 'ilheu': 'o',
    'ria': 'a', 'mata': 'a', 'quinta': 'a', 'vila': 'a', 'largo': 'o',
}

# A person's title takes no preposition: `Parque Urbano Dr. Mário Fonseca`,
# not `Parque Urbano DE Dr. Mário Fonseca`.
TITLES = ('dr', 'dra', 'eng', 'prof', 'padre', 'frei', 'dom', 'rei', 'rainha',
          'comendador', 'general', 'almirante', 'presidente', 'professor')


# A word from this list surviving into the remainder means the name is not
# just a descriptor plus a Portuguese proper noun — `All Saints Anglican
# Church` and `Castle of the Moors` both need a human, not a preposition.
ENGLISH_WORDS = (
    'of', 'the', 'and', 'new', 'old', 'great', 'little', 'royal', 'forest',
    'saints', 'saint', 'anglican', 'evangelical', 'baptist', 'methodist',
    'holy', 'christian', 'community', 'international', 'first', 'second',
    'moors', 'sea', 'river', 'upper', 'lower', 'north', 'south', 'east',
    'west', 'golden', 'blue', 'green', 'red', 'white', 'black', 'city',
    'town', 'village', 'national', 'central', 'grand', 'speaking', 'prayer',
)


def fold(value):
    text = unicodedata.normalize('NFKD', value or '').encode('ascii', 'ignore').decode()
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', text.lower())).strip()


DO_NOT_TRANSLATE = frozenset(fold(name) for name in KEEP_AS_IS)


def article_of(toponym):
    """The article the toponym takes, or None when we have never seen it."""
    folded = fold(toponym)
    for article, names in ARTICLES.items():
        if folded in names or folded.split(' ')[0] in names:
            return article
    return None


def preposition(toponym, learned=None):
    """The contracted preposition: what the archive says, else the hand list,
    else a bare `de` — which is what most Portuguese toponyms take."""
    folded = fold(toponym)
    head = folded.split(' ')[0]
    if head in COMMON_NOUN_ARTICLES:
        return CONTRACTIONS[COMMON_NOUN_ARTICLES[head]]
    if learned:
        found = learned.get(folded) or learned.get(head)
        if found:
            return found
    return CONTRACTIONS[article_of(toponym)]


def translate_saints(text):
    """`Saint John` -> `São João`, in place, leaving the rest alone."""
    def replace(match):
        saint = SAINTS.get(match.group(2).lower())
        return f'{saint[0]} {saint[1]}' if saint else match.group(0)
    return re.sub(r'\b(Saints?|St\.?)\s+(\w+)', replace, text, flags=re.IGNORECASE)


def is_portuguese_already(text):
    """A remainder that is already Portuguese joins the descriptor directly:
    `Chapel Nossa Senhora da Rocha` is `Capela Nossa Senhora da Rocha`, with
    no preposition inserted."""
    # A connector anywhere, or a saint/marian form at the START. `Porto
    # Santo` carries `santo` as its second word and is a toponym, not a
    # Portuguese phrase: it takes `Praia DO Porto Santo`.
    if re.search(r'\b(de|do|da|dos|das)\b', text, flags=re.IGNORECASE):
        return True
    return bool(re.match(r'^(nossa\s+senhora|s[ãa]o|santa|santo)\b', text.strip(), flags=re.IGNORECASE))


def strip_leading_article(name):
    """`The Roman Bridge` is `Ponte Romana`: the English article is not part
    of the Portuguese name."""
    return re.sub(r'^the\s+', '', name.strip(), flags=re.IGNORECASE)


def multiword_at(name):
    """(portuguese, gender, remainder, had_of) for a two-word descriptor the
    owner has confirmed — `National Park` is `Parque Nacional`, never
    `Parque de National`. Longest phrase wins."""
    folded = fold(name)
    for phrase in sorted(MULTIWORD, key=len, reverse=True):
        portuguese, gender = MULTIWORD[phrase]
        size = len(phrase.split())
        words, folded_words = name.split(), folded.split()
        if folded_words[:size] == phrase.split():
            rest = words[size:]
            had_of = bool(rest) and fold(rest[0]) in ('of', 'de')
            if had_of:
                rest = rest[1:]
                if rest and fold(rest[0]) == 'the':
                    rest = rest[1:]
            return portuguese, gender, ' '.join(rest).strip(' ,-'), had_of
        if folded_words[-size:] == phrase.split():
            return portuguese, gender, ' '.join(words[:-size]).strip(' ,-'), False
    return None


def adjective_and_descriptor(name):
    """`The Roman Bridge` -> `Ponte Romana`. An adjective qualifying a
    descriptor is translated too and agrees with its gender; neither word is
    the place's name."""
    words = fold(strip_leading_article(name)).split()
    if len(words) != 2:
        return None
    first, second = words
    if first in ADJECTIVES and second in DESCRIPTORS_GENDERED:
        portuguese, gender = DESCRIPTORS_GENDERED[second]
        masculine, feminine = ADJECTIVES[first]
        return f'{portuguese} {feminine if gender == "f" else masculine}'
    return None


def stacked_descriptors(name, learned=None):
    """Two descriptors and nothing else: `Waterfall Lake` is `Cascata do
    Lago`. Owner's rule — with more than one English word, neither is the
    name, so both are translated."""
    words = fold(strip_leading_article(name)).split()
    if len(words) == 3 and words[1] == 'and' and words[0] in DESCRIPTORS and words[2] in DESCRIPTORS:
        return f'{DESCRIPTORS[words[0]]} e {DESCRIPTORS[words[2]]}'
    if len(words) != 2:
        return None
    head, tail = words
    if head in DESCRIPTORS and tail in DESCRIPTORS:
        return f'{DESCRIPTORS[head]} {preposition(DESCRIPTORS[tail], learned)} {DESCRIPTORS[tail]}'
    return None


def joined_descriptors(name):
    """`Park and Palace of Monserrate` -> (`Parque e Palácio`, remainder).
    Both descriptors translate; the proper noun follows."""
    match = re.match(r'^(\w+)\s+and\s+(\w+)\s+(?:of|de)\s+(?:the\s+)?(.+)$',
                     strip_leading_article(name), flags=re.IGNORECASE)
    if not match:
        return None
    first, second, rest = fold(match.group(1)), fold(match.group(2)), match.group(3)
    if first in DESCRIPTORS and second in DESCRIPTORS:
        gender = GENDER[second]
        return f'{DESCRIPTORS[first]} e {DESCRIPTORS[second]}', gender, rest.strip(' ,-'), True
    return None


def doubts(name, remainder, vocabulary=None):
    """(confidence, why) — the checks every path has to pass, not only the
    single-descriptor one. `Funchal´s Botanical Garden` matched a set phrase
    and skipped them."""
    if re.search(r'\b(' + '|'.join(ENGLISH_WORDS) + r'|' + '|'.join(DESCRIPTORS) + r')\b', fold(remainder)):
        return 'needs_review', 'an English word survives in the name'
    if re.search(r"['\u00b4\u2019]s\b", name):
        return 'needs_review', 'the name carries an English possessive'
    if re.search(r'\b(saints?|st\.?)\s+\w+', fold(remainder)):
        return 'needs_review', 'a saint this module has no Portuguese form for'
    if ',' in name:
        return 'needs_review', 'the name carries a comma: it is a name plus a description'
    if vocabulary is not None:
        unknown = [word for word in fold(remainder).split()
                   if word not in vocabulary and not word.isdigit() and len(word) > 2
                   and word not in TITLES]
        if unknown:
            return 'needs_review', f'not words Portuguese names here use: {unknown}'
    return 'high', None


def join(portuguese, remainder, learned=None):
    """`Parque Urbano Dr. Mário Fonseca` — a title joins directly; a toponym
    takes the preposition its article decides."""
    head = fold(remainder).split(' ')[0] if remainder else ''
    if head in TITLES:
        return f'{portuguese} {remainder}'
    return f'{portuguese} {preposition(remainder, learned)} {remainder}'


def descriptor_at(name):
    """(english, portuguese, remainder, had_of) for the longest descriptor in
    the name, or None. Handles both `Beach of X` and `X Beach`.

    The remainder is sliced off the ORIGINAL name, keeping its accents and
    case — and from the correct end. Taking the last N words for both shapes
    turned `Machico Beach` into `Praia de Beach`."""
    words = name.split()
    folded_words = fold(name).split()
    for english in sorted(DESCRIPTORS, key=len, reverse=True):
        portuguese = DESCRIPTORS[english]
        size = len(english.split())
        if folded_words[:size] == english.split():
            rest = words[size:]
            had_of = bool(rest) and fold(rest[0]) in ('of', 'de')
            if had_of:
                rest = rest[1:]
                if rest and fold(rest[0]) == 'the':
                    rest = rest[1:]
            return english, portuguese, ' '.join(rest).strip(' ,-'), had_of
        if folded_words[-size:] == english.split():
            return english, portuguese, ' '.join(words[:-size]).strip(' ,-'), False
    return None


def contract_inner_of(text, learned=None):
    """`Nossa Senhora of Monte` -> `Nossa Senhora do Monte`. The preposition
    inside a name contracts with the toponym's article exactly as the outer
    one does."""
    def replace(match):
        tail = match.group(1)
        return f' {preposition(tail, learned)} {tail}'
    return re.sub(r'\s+of\s+(?:the\s+)?(\S+(?:\s+\S+)?)$', lambda m: replace(m), text, flags=re.IGNORECASE)


def translate(name, learned=None, vocabulary=None):
    """{name_local, confidence, why} or None when nothing here applies."""
    if fold(name) in DO_NOT_TRANSLATE:
        return None  # the owner has confirmed this IS the place's name

    for english, portuguese in PHRASES.items():
        if fold(name) == english:
            return {'name_local': portuguese, 'confidence': 'high', 'rule': 'set phrase'}

    # Owner's rule: more than one English word and neither of them is the
    # name — `The Roman Bridge`, `Waterfall Lake`, `Park and Palace`.
    for rule_name, produced in (('adjective + descriptor', adjective_and_descriptor(name)),
                                ('two descriptors', stacked_descriptors(name, learned))):
        if produced:
            return {'name_local': produced, 'confidence': 'high', 'rule': rule_name}

    joined = joined_descriptors(name)
    if joined:
        portuguese, _gender, remainder, _had_of = joined
        remainder = contract_inner_of(translate_saints(remainder), learned)
        confidence, why = doubts(name, remainder, vocabulary)
        return {'name_local': join(portuguese, remainder, learned),
                'confidence': confidence, 'rule': 'two descriptors + proper noun', 'why': why}

    multi = multiword_at(name)
    if multi:
        portuguese, _gender, remainder, _had_of = multi
        if not remainder:
            return {'name_local': portuguese, 'confidence': 'high', 'rule': 'set descriptor'}
        remainder = contract_inner_of(translate_saints(remainder), learned)
        confidence, why = doubts(name, remainder, vocabulary)
        return {'name_local': join(portuguese, remainder, learned),
                'confidence': confidence, 'rule': 'set descriptor + proper noun', 'why': why}

    found = descriptor_at(name)
    if not found:
        return None
    english, portuguese, remainder, had_of = found
    folded_words = fold(name).split()
    if not remainder:
        return None

    remainder = translate_saints(remainder)
    for phrase, replacement in sorted(PHRASES.items(), key=lambda pair: -len(pair[0])):
        if phrase.endswith(' of'):
            continue  # handled by contract_inner_of, which keeps the preposition
        remainder = re.sub(rf'\b{re.escape(phrase)}\b', replacement, remainder, flags=re.IGNORECASE)
    remainder = contract_inner_of(remainder, learned)

    if re.search(r'[A-Za-z]', fold(remainder)) is None:
        return None
    # `Chapel Nossa Senhora da Rocha` is `Capela Nossa Senhora da Rocha` —
    # the descriptor came first and the rest is already a Portuguese phrase,
    # so nothing is inserted. `Santo André Beach` is different: the
    # descriptor came last and the rest is a toponym, which takes
    # `Praia DE Santo André`.
    leading_descriptor = folded_words[:len(english.split())] == english.split()
    if leading_descriptor and not had_of and is_portuguese_already(remainder):
        local = f'{portuguese} {remainder}'
        rule = f'{english} -> {portuguese}, joined directly'
    else:
        local = join(portuguese, remainder, learned)
        rule = f'{english} -> {portuguese}'

    # A bare `de` is what most Portuguese toponyms take; the ones that carry
    # an article are the exception and are listed. So an unlisted toponym is
    # not a doubt, it is the common case. Only a surviving English word is.
    confidence, why = doubts(name, remainder, vocabulary)
    return {'name_local': re.sub(r'\s+', ' ', local).strip(),
            'confidence': confidence, 'rule': rule, 'why': why}


def run(rows, learned=None, vocabulary=None):
    translated, untouched = [], []
    for row in rows:
        result = translate(row['name'], learned, vocabulary)
        if result is None:
            untouched.append({**row, 'why': 'no descriptor this module knows'})
            continue
        translated.append({
            'overture_id': row['overture_id'], 'name': row['name'],
            'name_local': result['name_local'], 'name_local_lang': 'pt',
            'category': row.get('category'), 'source': 'translated',
            'confidence': result['confidence'], 'rule': result['rule'],
            **({'why': result['why']} if result.get('why') else {}),
        })
    return {'translated': translated, 'untouched': untouched}


def main(argv=None):
    parser = argparse.ArgumentParser(description='KAN-471 stage 2b: translate descriptor names')
    parser.add_argument('--review', required=True, help='the stage 2 output (JSON) whose review list to translate')
    parser.add_argument('--archive', help='the country archive, to learn toponym articles from')
    parser.add_argument('--out')
    parser.add_argument('--show', type=int, default=30)
    args = parser.parse_args(argv)

    with open(args.review) as handle:
        rows = json.load(handle)['review']
    learned = learn_articles(args.archive) if args.archive else None
    vocabulary = learn_vocabulary(args.archive) if args.archive else None
    if learned:
        print(f'{len(learned):,} toponym articles and {len(vocabulary):,} Portuguese words '
              f'learned from the archive', file=sys.stderr)
    report = run(rows, learned, vocabulary)
    high = [r for r in report['translated'] if r['confidence'] == 'high']
    flagged = [r for r in report['translated'] if r['confidence'] != 'high']
    print(f"{len(rows):,} for review -> {len(high):,} translated, {len(flagged):,} flagged, "
          f"{len(report['untouched']):,} untouched", file=sys.stderr)
    for row in high[:args.show]:
        print(f"{row['name'][:44]:44} -> {row['name_local']}")
    if args.out:
        with open(args.out, 'w') as handle:
            json.dump(report, handle, ensure_ascii=False, indent=1, sort_keys=True)
        print(f'\nwritten {args.out}', file=sys.stderr)
    print('nothing written to D1: proposals for review', file=sys.stderr)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
