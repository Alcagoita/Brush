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

**97 units nobody can place is the headline.** Neither Overture nor OSM has
a coordinate for them, so they cannot be added: the ticket's own rule is that
a list adds only what a source can place, and inventing a point for a shop we
cannot locate would put a pin on the map for a guess. They are listed in the
comparison output for the record.

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

## Decisions needed

### 1. The two Microsoft duplicates (still open from before the list arrived)

| row | id | source | twin |
|---|---|---|---|
| `Bershka` | `08706da4` | Microsoft, mall door | Foursquare, 160 m, real unit |
| `Oysho` | `2d35b428` | Microsoft, mall door | Foursquare, `Loja 1.103-1.105` |

Both tenants appear once on the operator list, so the list confirms one unit
each. Proposal unchanged: tombstone the Microsoft copy through
`poi_source_correction` with `visible = 0` (KAN-452), which stops serving and
keeps the row for audit. **Not the coordinate rule** — see the finding below.

### 2. Three units the operator marks *Encerrada temporariamente*

`Flying Tiger Copenhagen`, `Levi's`, `Valores`. decisions.md rules on
`Encerrado` (opening hours, means nothing) and `ABRE BREVEMENTE` (not open
yet, do not add) but not on this. A temporarily closed unit exists and will
reopen, so they are kept in the list with clean names — but it wants a ruling,
and it is the first time the case has come up.

We already hold `Flying Tiger Copenhagen`; `Levi's` is in OSM at level 1;
`Valores` is only on the list, and the matcher paired held `VitaFlores`
against it at 0.82, which is almost certainly false.

### 3. `Snipes` is listed twice

Twice in the supplied list, with different categories (`Desporto, Sapataria`
and `Desporto, Moda Feminina, Moda Infantil, Sapataria`). Written **once**.
If Ubbo really has two Snipes units, it is the `BOTA MINUTO` case from
decisions.md and the second entry should come back — but adding two rows with
one name on a guess is the duplicate the ticket exists to prevent.

### 4. `Merrell | CAT` carries a literal pipe

The pipe is the list format's separator, so it is written `Merrell CAT`.
decisions.md already rules `MERREL CATERPILLER` = `Merrell` at Colombo.

### 5. Rulings that exist but are scoped to another mall

decisions.md entries are per-mall, so these re-escalated here:

* `H3` (listed) vs held `H3 Hambúrguer Gourmet` — ruled the same shop at
  Strada; appears in UBBO's REMOVE list.
* `Mango` / `Mango Teen`, `Intimissimi` / `IUMAN Intimissimi Uomo` — ruled
  "one shop, two doors, both rows valid" at other malls.

Worth deciding whether a confirmed pair should be mall-scoped at all, or
whether brand-family rulings are global.

### 6. Escalations that are plainly false, for the record

`The Body Shop` vs `Oysho` · `AMADORA SC UBBO` vs `Pandora` · `Welder` vs
`Celeiro` · `PeSSoaS` vs `Nespresso` · `Euromúsica` vs `Euro Sofás` ·
`Western Union` vs `Mister Minit` (already ruled not-a-match in
decisions.md) · `Tejo Fan Park` vs `Pet's Park` · `Claire's` vs
`Carpet Store`.

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
