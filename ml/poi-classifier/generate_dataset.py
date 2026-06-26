#!/usr/bin/env python3
"""
KAN-196 — synthesize a labeled `title -> POI` dataset for the on-device POI
text classifier.

Reads poi_keywords.json (the seed keywords, mirrored from
src/services/poiInference.ts) and expands each keyword through natural task
templates in English and Portuguese, adds light typo augmentation, balances the
classes, shuffles, and writes train.csv / validation.csv with columns
`text,label`.

The `none` label covers tasks with no place to visit — the classifier MUST be
able to say "none" so the import flow leaves task.poi unset.

Usage:
    python3 generate_dataset.py            # writes train.csv + validation.csv here
    python3 generate_dataset.py --per-class 1200 --val-split 0.15

No third-party deps — standard library only. Deterministic (fixed seed).
"""

import argparse
import csv
import json
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))

# Task templates. "{kw}" is replaced by a keyword. Mix of imperative, noun-only,
# and "errand" phrasings so the model generalizes beyond exact keywords.
TEMPLATES_EN = [
    "{kw}", "buy {kw}", "buy some {kw}", "get {kw}", "get some {kw}",
    "need {kw}", "need some {kw}", "need a {kw}", "pick up {kw}",
    "pick up some {kw}", "go to the {kw}", "go get {kw}", "grab {kw}",
    "grab some {kw}", "remember to buy {kw}", "stop for {kw}", "{kw} run",
]
TEMPLATES_PT = [
    "{kw}", "comprar {kw}", "comprar uns {kw}", "preciso de {kw}",
    "preciso de uns {kw}", "ir buscar {kw}", "ir ao {kw}", "ir a {kw}",
    "apanhar {kw}", "trazer {kw}", "lembrar de comprar {kw}", "passar por {kw}",
]

# Keyboard-ish adjacency for plausible typos.
_ADJ = {
    "a": "sq", "b": "vn", "c": "xv", "d": "sf", "e": "wr", "f": "dg",
    "g": "fh", "h": "gj", "i": "uo", "j": "hk", "k": "jl", "l": "k",
    "m": "n", "n": "bm", "o": "ip", "p": "o", "q": "wa", "r": "et",
    "s": "ad", "t": "ry", "u": "yi", "v": "cb", "w": "qe", "x": "zc",
    "y": "tu", "z": "x",
}


def typo(word: str, rng: random.Random) -> str:
    """Apply one random plausible edit (swap / adjacent-sub / drop / double)."""
    if len(word) < 4:
        return word
    i = rng.randrange(len(word))
    op = rng.choice(["swap", "sub", "drop", "double"])
    chars = list(word)
    if op == "swap" and i < len(word) - 1:
        chars[i], chars[i + 1] = chars[i + 1], chars[i]
    elif op == "sub" and chars[i] in _ADJ:
        chars[i] = rng.choice(_ADJ[chars[i]])
    elif op == "drop":
        del chars[i]
    elif op == "double":
        chars.insert(i, chars[i])
    return "".join(chars)


def expand(keywords, templates, rng):
    """All (template x keyword) sentences for one language."""
    out = set()
    for kw in keywords:
        for t in templates:
            out.add(t.format(kw=kw).strip())
    return out


def build(per_class: int, val_split: float, typo_rate: float, seed: int):
    rng = random.Random(seed)
    with open(os.path.join(HERE, "poi_keywords.json"), encoding="utf-8") as f:
        data = json.load(f)

    examples = {}  # label -> list[str]

    for label, langs in data["labels"].items():
        base = list(expand(langs.get("en", []), TEMPLATES_EN, rng))
        base += list(expand(langs.get("pt", []), TEMPLATES_PT, rng))
        examples[label] = base

    # 'none' phrases are already full task sentences (both languages).
    none_phrases = data["none"].get("en", []) + data["none"].get("pt", [])
    examples["none"] = list(none_phrases)

    rows = []  # (text, label)
    for label, base in examples.items():
        if not base:
            continue
        pool = list(base)
        # Up/down-sample to per_class with typo augmentation.
        target = per_class
        picked = []
        while len(picked) < target:
            s = rng.choice(pool)
            if rng.random() < typo_rate:
                words = s.split()
                j = rng.randrange(len(words))
                words[j] = typo(words[j], rng)
                s = " ".join(words)
            picked.append(s.lower())
        for s in picked:
            rows.append((s, label))

    rng.shuffle(rows)
    n_val = int(len(rows) * val_split)
    val, train = rows[:n_val], rows[n_val:]
    return train, val


def write_csv(path, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["text", "label"])
        w.writerows(rows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-class", type=int, default=1000)
    ap.add_argument("--val-split", type=float, default=0.15)
    ap.add_argument("--typo-rate", type=float, default=0.15)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    train, val = build(args.per_class, args.val_split, args.typo_rate, args.seed)
    write_csv(os.path.join(HERE, "train.csv"), train)
    write_csv(os.path.join(HERE, "validation.csv"), val)

    labels = sorted({r[1] for r in train})
    print(f"train={len(train)} validation={len(val)} classes={len(labels)}")
    print("labels:", ", ".join(labels))


if __name__ == "__main__":
    main()
