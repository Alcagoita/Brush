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

# English descriptor -> Portuguese. Order matters only for the longest match.
DESCRIPTORS = {
    'cathedral': 'Sé', 'church': 'Igreja', 'chapel': 'Capela',
    'monastery': 'Mosteiro', 'convent': 'Convento', 'hermitage': 'Ermida',
    'sanctuary': 'Santuário', 'basilica': 'Basílica', 'mosque': 'Mesquita',
    'synagogue': 'Sinagoga', 'castle': 'Castelo', 'fortress': 'Fortaleza',
    'fort': 'Forte', 'tower': 'Torre', 'palace': 'Palácio',
    'beach': 'Praia', 'park': 'Parque', 'garden': 'Jardim',
    'botanical garden': 'Jardim Botânico', 'lighthouse': 'Farol',
    'bridge': 'Ponte', 'aqueduct': 'Aqueduto', 'museum': 'Museu',
    'monument': 'Monumento', 'fountain': 'Fonte', 'mill': 'Moinho',
    'waterfall': 'Cascata', 'cave': 'Gruta', 'island': 'Ilha',
    'viewpoint': 'Miradouro', 'square': 'Praça', 'cemetery': 'Cemitério',
    'ruins': 'Ruínas', 'lake': 'Lago', 'cape': 'Cabo', 'quay': 'Cais',
}

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
    'moinhos': 'os', 'lagoas': 'as',
}


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
    for english, portuguese in PHRASES.items():
        if fold(name) == english:
            return {'name_local': portuguese, 'confidence': 'high', 'rule': 'set phrase'}

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
    # An English word left in the remainder is a proper noun we must not
    # touch (`Igreja Anglicana All Saints`) or a word we have no mapping
    # for — either way a human decides.
    leftover_english = bool(re.search(
        r'\b(' + '|'.join(ENGLISH_WORDS) + r'|' + '|'.join(DESCRIPTORS) + r')\b', fold(remainder)))

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
        joiner = preposition(remainder, learned)
        local = f'{portuguese} {joiner} {remainder}'
        rule = f'{english} -> {portuguese} {joiner}'

    # A bare `de` is what most Portuguese toponyms take; the ones that carry
    # an article are the exception and are listed. So an unlisted toponym is
    # not a doubt, it is the common case. Only a surviving English word is.
    confidence, why = 'high', None
    if leftover_english:
        confidence, why = 'needs_review', 'an English word survives in the name'
    elif re.search(r"['\u00b4\u2019]s\b", name):
        confidence, why = 'needs_review', 'the name carries an English possessive'
    elif re.search(r'\b(saints?|st\.?)\s+\w+', fold(remainder)):
        confidence, why = 'needs_review', 'a saint this module has no Portuguese form for'
    elif ',' in name:
        # `Church of the Son, Ponta do Sol, Madeira` is a name plus a
        # description; splitting it correctly is a judgement, not a rule.
        confidence, why = 'needs_review', 'the name carries a comma: it is a name plus a description'
    elif vocabulary is not None:
        unknown = [word for word in fold(remainder).split()
                   if word not in vocabulary and not word.isdigit() and len(word) > 2]
        if unknown:
            confidence = 'needs_review'
            why = f'not words Portuguese names here use: {unknown}'
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
