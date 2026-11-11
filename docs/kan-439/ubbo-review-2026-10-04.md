# KAN-439 — UBBO, what the comparison found

Operator list supplied by the owner 2026-10-04: **245 units**, name plus the
operator's own category. The categories are kept in
`mall_lists/ubbo_operator_categories.tsv` as a **helper for a person reading
the escalations below** — our `poi_type` and `store_kind` are never derived
from them (owner, 2026-10-04).

**This document proposes. Nothing has been written.**

## The footprint

No `shopping_mall` row exists anywhere in the served registry — 0 rows, and 0
in `overture_poi_type` — so there is no mall record to scope against. The
held set is a coordinate box around the tenant cluster:

```
lat 38.7745 … 38.7810    lng -9.2240 … -9.2160    ->  176 rows held
```

Worth confirming: a wider box would pull in more of the retail park, a
tighter one would cut the Auchan end.

## Counts

| | |
|---|---|
| on the operator list | 245 |
| held and confidently matched | 117 |
| ESCALATE — a person decides | 37 |
| ADD — listed, OSM can place it, we lack it | 6 |
| listed, **no source can place it** | 97 |
| REMOVE — held, not listed (look-list only) | 28 |

**97 units nobody can place is the headline** — and the owner has ruled on
them (2026-10-04): **we cannot exclude a store we know is there.** The
operator's list is authority that the unit exists, so these are added at the
shopping centre's own coordinate rather than dropped. Only the position is
missing, and "in that building" is an honest answer; it claims nothing about
which unit.

UBBO's coordinate is its OSM mall polygon centroid, `relation/14978983`
(`shop=mall`, `building=retail`): **38.7769342, −9.2200815**. A centroid, not
a street door.

These become `curated_poi` rows with provenance, like every served place that
is not Overture. Each needs a real `poi_type` and a specific `store_kind` —
no bare `store` — and the operator category is a hint, never the answer. The
categories of the 97 map mostly cleanly, with one exception: **14 are only
`Serviços`**, which types nothing by itself (a barber, a car wash, a currency
exchange and a key cutter all carry it), so those want the name read one by
one.

Two consequences worth deciding before the rows exist:

1. **A later Overture release can produce a visible duplicate.** Nearby
   suppresses across sources only within 20 m, and a centroid row sits
   100–200 m from the unit Overture would carry. Both would ship and the user
   sees the shop twice — so these rows owe a suppression rule scoped to the
   mall footprint and matched on name, not on 20 m.
2. **All 97 share one point**, so a user passing within `NEARBY_RADIUS`
   (400 m) could get the whole centre in "also close". Inside the mall that
   is exactly right; outside it is 97 rows from one building.

## Floors

The operator publishes **no floor for any unit** on this list, so every floor
field in `mall_lists/ubbo_stores.txt` is empty (`Name|`) and every floor must
come from OSM's `level`. OSM carries one for **12** rows in the footprint:

| level | rows |
|---|---|
| 1 | McDonald's, Grace and Beauty, Snipes, New Yorker, H&M, Levi's, Starbucks |
| 0 | iStore, Wells, Normal |
| −1 / −2 | charging stations only |

Per the README, OSM `level` is internally consistent inside one building but
not comparable across buildings, and here there is no published Piso to check
it against — the same position Strada was in.

## The 6 ADD candidates

| tenant | OSM | level | coordinates |
|---|---|---|---|
| Burger King | `node/11480596277` fast_food | — | 38.777261, −9.221485 |
| Grace and Beauty | `node/12150199202` beauty | **1** | 38.776527, −9.218846 |
| Kiwoko | `node/11766400572` pet | — | 38.777498, −9.221417 |
| Wells | `way/1253115089` chemist | **0** | 38.776179, −9.219964 |
| Worten | `node/12669099325` electronics | — | 38.776277, −9.221499 |
| Worten Mobile | `node/12669099324` mobile_phone | — | 38.777603, −9.219611 |

Two carry a floor; four would be added without one.

Note `Wells` — decisions.md already rules that at Strada `Wells` and
`Wells Ótica` are **two** businesses sharing a unit, and that a `Well's`
inside a Continente is a concession, not a unit. Here OSM has one `chemist`,
and the operator lists `Wells` once under *Perfumaria e Cosmética, Saúde e
Bem-Estar*. Reads as one unit, but it is the owner's call.

## Owner rulings, 2026-10-04 — applied

All recorded in `mall_lists/decisions.md`, scoped to UBBO.

* **`Encerrada temporariamente` units are valid stores, temporarily closed.**
  `Flying Tiger Copenhagen`, `Levi's` and `Valores` stay and are matched like
  any other unit. Unlike `ABRE BREVEMENTE`: a shop not yet open does not
  exist, a shop shut for now does.
* **`Snipes` twice is two real units** — same floor, different coordinates.
  The list now carries two entries (246 tenants).
* **Three Mango units — `Mango`, `Mango Man`, `Mango Teen` — all valid.**
  Explicitly scoped to UBBO: this is not the brand-family entry from another
  mall being reused, and it establishes no rule elsewhere.
* **`Merrell | CAT`** — either spelling accepted; kept as `Merrell CAT`
  because the pipe is the format's separator.

## The duplicate rule, both halves

The rule was mine to get wrong, not the owner's: **same store name, at the
entrance-door coordinate** — both halves, always, because losing a store
cannot be undone. Implemented in `mall_door_duplicates.py`, which requires:

1. a name twin in the same footprint from a **different** upstream dataset, and
2. a **door coordinate** — shared with another row — with the street address
   rather than a unit.

Run on UBBO: **2 removable, 11 matched one half and were left alone**, and the
report names all 11 so what was spared is visible rather than assumed. Both
Foursquare twins appear in that list, correctly — they carry the unit.

| removable | id | at | twin |
|---|---|---|---|
| `Bershka` [Microsoft] | `08706da4` | door 38.775290, −9.220240 | Foursquare 38.776258, −9.218830 |
| `Oysho` [Microsoft] | `2d35b428` | same door | Foursquare, `Loja 1.103-1.105` |

The operator's list carries one Bershka and one Oysho, which is the third
independent agreement. Migration `0058` tombstones both through
`poi_source_correction` (`visible = 0`), so nothing is deleted and the
removal is reversible. **Not yet applied to production.**

Still needing an individual ruling: **`Leroy Merlin`** / **`Amadora - Leroy
Merlin`** — a real pair, neither at a door, so which is right cannot be
decided mechanically.

## Escalations that are plainly false, for the record

`The Body Shop` vs `Oysho` · `AMADORA SC UBBO` vs `Pandora` · `Welder` vs
`Celeiro` · `PeSSoaS` vs `Nespresso` · `Euromúsica` vs `Euro Sofás` ·
`Western Union` vs `Mister Minit` (already ruled not-a-match) · `Tejo Fan
Park` vs `Pet's Park` · `Claire's` vs `Carpet Store` · `VitaFlores` vs
`Valores`.

The full 37 are in `ubbo-comparison-2026-10-04.txt`.

## A finding that changes the duplicate rule

The owner's first instinct was to drop the Microsoft row wherever several
rows share one exact coordinate. Measured across both footprints, **that
rule would delete real shops**, because the shared coordinate is the mall's
door and every provider uses it:

| cluster | rows | sources |
|---|---|---|
| Amoreiras 38.723600, −9.163390 | Oysho, Bershka, **Zara** | Microsoft ×2, AllThePlaces |
| Ubbo 38.779233, −9.219706 | Cacifo Locky, Flying Tiger, New Yorker, Mayoral | Microsoft ×4 |
| Amoreiras 38.725420, −9.163010 | three hairdressers | meta ×3 |
| Amoreiras 38.723053, −9.162166 | Aldo, Intimissimi | Foursquare ×2 |

Every row in those clusters is the **only** record we hold of that shop.
Door-pinning is how all four upstream datasets behave in a mall, so a
coordinate cluster carries no information about duplication.

The safe trigger is **the twin**: remove a row only where another dataset
holds the same shop in the same mall. Across both centres that is 2 rows.

## Amoreiras

Still waiting on its list. Footprint already read: 308 rows held, 1
same-name group (`Powerdot` ×4 — different charging stations 100–500 m
apart, reading as *not* duplicates), 0 rows missing a `store_kind`.
