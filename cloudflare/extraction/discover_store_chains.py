"""KAN-448. Proposes store chains, and their kinds, from a country's own data.

    python3 discover_store_chains.py --overture <archive.csv> --out outputs/chains-PT.tsv

A store name that repeats is a chain. Three conditions, each measured on
Portugal before it was written down:

  * the first two words of the name repeat at least MIN_ROWS times over
    store-typed and generic-`shopping` rows;
  * the head is not a generic shop word — `Loja da …` repeats 134 times
    because Portuguese repeats, and its categories scatter;
  * the leading kind holds at least MIN_CONCENTRATION of the typed rows — a
    chain's categories cluster (Calzedonia: clothing 60, childrens 33), a
    generic prefix's do not. The majority kind is the chain's kind.

KAN-457. Concentration is measured on the mapped kind — the `(poi_type,
store_kind)` the category map gives the row — not on the raw category. Meta
files one chain's branches under sibling categories that all mean the same
thing to us (seven categories map to `home`, six to `hardware`), and a chain
measured on the raw category looked scattered when its kind was not. Two
refinements come with it:

  * A row filed at an umbrella category — an Overture parent bucket such as
    `flowers_and_gifts_shop`, which sits over `gift_shop` and `florist` —
    does not disagree with a leaf under it. It is counted with the leading
    leaf kind when that leaf descends from it, and as its own bucket
    otherwise. The tree is read from the archive's own `category_path`;
    nothing is configured. `Ale-Hop` has ten branches at that umbrella and
    seven at `gift_shop`: 39% on the raw category, 77% on the kind.
  * The raw breakdown stays in the TSV, so a reviewer sees what was folded.

On the raw category the Portugal archive gave 637 chains over 5,918 rows (the
committed `docs/kan-448/chains-PT.tsv`); before KAN-448's additions 555 of
them had no kind entry, and the top of that list — Minipreço, MultiOpticas,
Benetton, Lanidor, Lidl, Audika, Tiffosi, Claire's, Levi's, Sunglass Hut,
Chicco — was taking its kind from whatever Meta gave each branch. On the
mapped kind it gives 659 over 6,306 rows (`chains-PT-mapped-kind.tsv`).

This proposes. It writes nothing to the dictionary: a person reads the TSV,
and the reviewed entries go into storeSubtypeDictionary.json, which is the
source of truth from then on. Coffee and restaurants are out of scope; the
rule runs only over store-typed rows, `shopping`, and umbrellas over stores.
"""
import argparse
import csv
import os
import sys
from collections import Counter, defaultdict

EXTRACTION_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, EXTRACTION_DIR)
from classify_and_load import normalize_text
from promote_overture_candidates import category_map, store_brand_index

MIN_ROWS = 3
MIN_CONCENTRATION = 0.6
MIN_TYPED_ROWS = 2

# Words a Portuguese shop name starts with when it is a description, not a
# brand. Articles and prepositions are here because `A Loja`, `O Cantinho`
# are descriptions with an article in front.
GENERIC_HEAD_WORDS = frozenset({
    'loja', 'lojinha', 'lojas', 'cantinho', 'centro', 'atelier', 'feira', 'fabrica',
    'boutique', 'mercado', 'minimercado', 'casa', 'espaco', 'armazem', 'armazens',
    'oficina', 'pronto', 'mini', 'super', 'o', 'a', 'os', 'as', 'de', 'da', 'do', 'das', 'dos', 'e',
})

UNTYPED = 'shopping'


def head_of(name):
    words = normalize_text(name).split()
    if not words:
        return ''
    return ' '.join(words[:2]) if len(words) >= 2 else words[0]


def kind_of(category, mapping):
    """The mapped `(poi_type, store_kind)` of a category; `('', '')` when unmapped."""
    entry = mapping.get(category) or {}
    return (entry.get('poi_type') or '', entry.get('store_kind') or '')


def is_store_category(category, mapping):
    return kind_of(category, mapping)[0] == 'store'


class Taxonomy:
    """Overture's category tree, as the archive's `category_path` reports it.

    The path names a category by its `_store` spelling where the category
    column says `_shop` (`flowers_and_gifts_store` over a row whose category
    is `flowers_and_gifts_shop`); both spellings are kept for every node so a
    lookup in either direction lands.
    """

    def __init__(self):
        self.parent = {}

    @staticmethod
    def spellings(category):
        yield category
        if category.endswith('_store'):
            yield category[:-len('_store')] + '_shop'
        elif category.endswith('_shop'):
            yield category[:-len('_shop')] + '_store'

    def learn(self, category_path):
        nodes = [node for node in (category_path or '').split('|') if node]
        for child, parent in zip(nodes[1:], nodes):
            for spelling in self.spellings(child):
                self.parent.setdefault(spelling, parent)

    def ancestors(self, category):
        seen, node = set(), category
        while node in self.parent and node not in seen:
            seen.add(node)
            node = self.parent[node]
            yield from self.spellings(node)

    def is_ancestor(self, category, descendant):
        return category != descendant and category in set(self.ancestors(descendant))


def umbrella_categories(categories, mapping, taxonomy):
    """Categories that carry rows, are not stores themselves, and sit over a
    store leaf in the tree. `flowers_and_gifts_shop` is one; `shopping` is
    the root and is handled as the untyped bucket instead."""
    store_leaves = [c for c in categories if is_store_category(c, mapping)]
    umbrellas = set()
    for category in categories:
        if category == UNTYPED or is_store_category(category, mapping):
            continue
        if any(taxonomy.is_ancestor(category, leaf) for leaf in store_leaves):
            umbrellas.add(category)
    return umbrellas


def concentrate(categories, mapping, taxonomy, umbrellas):
    """(majority kind, its rows, typed rows, its raw categories) for one head.

    `categories` counts raw categories. Rows are bucketed by mapped kind; a
    row at an umbrella joins the leading store bucket when a category of that
    bucket descends from the umbrella, and is its own bucket otherwise.
    """
    buckets, by_bucket = Counter(), defaultdict(Counter)
    for category, n in categories.items():
        if not category or category == UNTYPED or category in umbrellas:
            continue
        kind = kind_of(category, mapping)
        buckets[kind] += n
        by_bucket[kind][category] += n
    leading_store = max((k for k in buckets if k[0] == 'store'), key=lambda k: buckets[k], default=None)
    for category in umbrellas:
        n = categories.get(category, 0)
        if not n:
            continue
        if leading_store and any(taxonomy.is_ancestor(category, leaf) for leaf in by_bucket[leading_store]):
            buckets[leading_store] += n
            by_bucket[leading_store][category] += n
        else:
            kind = kind_of(category, mapping)
            buckets[kind] += n
            by_bucket[kind][category] += n
    typed_rows = sum(buckets.values())
    if not typed_rows:
        return None, 0, 0, Counter()
    majority = max(buckets, key=lambda k: buckets[k])
    return majority, buckets[majority], typed_rows, by_bucket[majority]


def breakdown(categories):
    return '|'.join(f'{category or "(none)"}:{n}' for category, n in categories.most_common())


def discover(overture_csv):
    mapping = category_map()
    known = {normalized for _, _, normalized in store_brand_index()}
    taxonomy = Taxonomy()
    categories, spellings, seen_categories = defaultdict(Counter), defaultdict(Counter), set()
    with open(overture_csv, newline='') as handle:
        for row in csv.DictReader(handle):
            taxonomy.learn(row.get('category_path'))
            category = row.get('category') or ''
            seen_categories.add(category)
            head = head_of(row['name'])
            if not head or len(head) < 4 or head.split()[0] in GENERIC_HEAD_WORDS:
                continue
            categories[head][category] += 1
            # The most common original spelling becomes the display name.
            spellings[head][' '.join(row['name'].split()[:len(head.split())])] += 1

    umbrellas = umbrella_categories(seen_categories, mapping, taxonomy)
    proposals = []
    for head, counted in categories.items():
        # The chain rule runs over store rows, generic shopping and umbrellas
        # over stores; a head's cafés and restaurants are not its shops.
        in_scope = Counter({c: n for c, n in counted.items()
                            if c == UNTYPED or c in umbrellas or is_store_category(c, mapping)})
        count = sum(in_scope.values())
        if count < MIN_ROWS:
            continue
        majority, majority_rows, typed_rows, majority_categories = concentrate(in_scope, mapping, taxonomy, umbrellas)
        if typed_rows < MIN_TYPED_ROWS:
            continue
        concentration = majority_rows / typed_rows
        # A head whose branches are mostly at an umbrella and not under a
        # store leaf — `Florista Jardim` — is a chain of florists, and out of
        # scope here exactly as a chain of cafés is.
        if concentration < MIN_CONCENTRATION or majority[0] != 'store':
            continue
        leaf = [c for c, _ in majority_categories.most_common() if c not in umbrellas]
        proposals.append({
            'head': head,
            'display_name': spellings[head].most_common(1)[0][0],
            'rows': count,
            'in_shopping': in_scope.get(UNTYPED, 0),
            'poi_type': majority[0],
            'store_kind': majority[1],
            'concentration': round(concentration, 3),
            'majority_category': leaf[0] if leaf else majority_categories.most_common(1)[0][0],
            'categories': breakdown(in_scope),
            # A two-word head is in the dictionary if it is a brand, or the start
            # of a longer one: `united colors` is `united colors of benetton`.
            'already_in_dictionary': any(head == k or head.startswith(k + ' ') or k.startswith(head + ' ') for k in known),
        })
    proposals.sort(key=lambda item: -item['rows'])
    return proposals


FIELDS = ('head', 'display_name', 'rows', 'in_shopping', 'poi_type', 'store_kind', 'concentration',
          'majority_category', 'categories', 'already_in_dictionary')


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--overture', required=True)
    parser.add_argument('--out', required=True)
    args = parser.parse_args(argv)
    proposals = discover(args.overture)
    if os.path.dirname(args.out):
        os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, 'w', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, delimiter='\t')
        writer.writeheader()
        writer.writerows(proposals)
    new = [p for p in proposals if not p['already_in_dictionary']]
    print(f'{len(proposals):,} chains proposed ({sum(p["rows"] for p in proposals):,} rows); '
          f'{len(new):,} not yet in the dictionary -> {args.out}', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
