"""KAN-448. Proposes store chains, and their kinds, from a country's own data.

    python3 discover_store_chains.py --overture <archive.csv> --out outputs/chains-PT.tsv

A store name that repeats is a chain. Three conditions, each measured on
Portugal before it was written down:

  * the first two words of the name repeat at least MIN_ROWS times over
    store-typed and generic-`shopping` rows;
  * the head is not a generic shop word — `Loja da …` repeats 134 times
    because Portuguese repeats, and its categories scatter;
  * the top typed category holds at least MIN_CONCENTRATION of the typed rows
    — a chain's categories cluster (Calzedonia: clothing 60, childrens 33),
    a generic prefix's do not. The majority category is the kind.

On Portugal that is 555 chains over 4,212 rows, and the top of the list is
Minipreço, MultiOpticas, Benetton, Lanidor, Lidl, Audika, Tiffosi, Claire's,
Levi's, Sunglass Hut, Chicco — none of which had a kind entry, all of which
were taking their kind from whatever Meta gave each branch.

This proposes. It writes nothing to the dictionary: a person reads the TSV,
and the reviewed entries go into storeSubtypeDictionary.json, which is the
source of truth from then on. Coffee and restaurants are out of scope; the
rule runs only over store-typed and `shopping` rows.
"""
import argparse
import csv
import json
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


def head_of(name):
    words = normalize_text(name).split()
    if not words:
        return ''
    return ' '.join(words[:2]) if len(words) >= 2 else words[0]


def is_store_row(row, mapping):
    entry = mapping.get(row.get('category')) or {}
    return entry.get('poi_type') == 'store' or row.get('category') == 'shopping'


def discover(overture_csv):
    mapping = category_map()
    known = {normalized for _, _, normalized in store_brand_index()}
    rows, categories, spellings = Counter(), defaultdict(Counter), defaultdict(Counter)
    with open(overture_csv, newline='') as handle:
        for row in csv.DictReader(handle):
            if not is_store_row(row, mapping):
                continue
            head = head_of(row['name'])
            if not head or len(head) < 4 or head.split()[0] in GENERIC_HEAD_WORDS:
                continue
            rows[head] += 1
            categories[head][row['category'] or ''] += 1
            # The most common original spelling becomes the display name.
            spellings[head][' '.join(row['name'].split()[:len(head.split())])] += 1

    proposals = []
    for head, count in rows.items():
        if count < MIN_ROWS:
            continue
        typed = [(category, n) for category, n in categories[head].items() if category and category != 'shopping']
        typed_rows = sum(n for _, n in typed)
        if typed_rows < MIN_TYPED_ROWS:
            continue
        majority, majority_rows = max(typed, key=lambda item: item[1])
        concentration = majority_rows / typed_rows
        if concentration < MIN_CONCENTRATION:
            continue
        entry = mapping.get(majority) or {}
        proposals.append({
            'head': head,
            'display_name': spellings[head].most_common(1)[0][0],
            'rows': count,
            'in_shopping': categories[head].get('shopping', 0),
            'majority_category': majority,
            'concentration': round(concentration, 3),
            'poi_type': entry.get('poi_type') or '',
            'store_kind': entry.get('store_kind') or '',
            'already_in_dictionary': any(head == k or head.startswith(k + ' ') for k in known),
        })
    proposals.sort(key=lambda item: -item['rows'])
    return proposals


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--overture', required=True)
    parser.add_argument('--out', required=True)
    args = parser.parse_args(argv)
    proposals = discover(args.overture)
    if os.path.dirname(args.out):
        os.makedirs(os.path.dirname(args.out), exist_ok=True)
    fields = ('head', 'display_name', 'rows', 'in_shopping', 'majority_category', 'concentration',
              'poi_type', 'store_kind', 'already_in_dictionary')
    with open(args.out, 'w', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, delimiter='\t')
        writer.writeheader()
        writer.writerows(proposals)
    new = [p for p in proposals if not p['already_in_dictionary']]
    print(f'{len(proposals):,} chains proposed ({sum(p["rows"] for p in proposals):,} rows); '
          f'{len(new):,} not yet in the dictionary -> {args.out}', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
