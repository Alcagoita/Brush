# KAN-439 — UBBO's 36 escalations, triaged

The matcher escalates anything short of a confident match, in either
direction. Of the 36 it raised, **six need the owner** and the rest are
settled on evidence below.

An escalation is never acted on silently: this document is the act of
settling one, and the comparison output
(`ubbo-comparison-2026-10-05.txt`) is what it was settled against.

## Settled by the owner, 2026-10-05 — the operator decides what is a unit

> "if the Source of true have the stores separated, we should have them. Even
> if it's inside the main store (like Auchan) the user needs to know that
> inside Auchan, we have a Auchan Ótica."

Five of the six open questions were one shape — the operator lists two or
more units and we hold a single row — and this answers all five. A concession
is a place a user walks into and solves a task at; someone who needs an
optician is not helped by being told there is a supermarket there.

| operator lists | we hold | outcome |
|---|---|---|
| `Auchan`, `Auchan Ótica`, `Auchan Saúde e Bem Estar`, `Auchan Tecnologia` | `Auchan [supermarket]` | keep the hypermarket, **add three** — an optician, a health and wellbeing counter, an electronics counter |
| `Olá`, `O meu Olá` | `Olá [ice_cream]` | keep, **add one** |
| `Tramas Home`, `Tramas+` | `Tramas [store]` | **add one** — which of the two the held row is still needs reading against the unit |
| `Carrossel`, `Carrossel Experience` | `Carrossel [hairdresser]` | keep, **add one** |
| `Holmes Place`, `Holmes Place SPA` | `Holmes Place Tejo - Amadora [gym]` | keep, **add one** |

Seven new rows, none placeable by any source, so all seven go at the centre's
coordinate under the owner's earlier ruling. Each needs a real type and a
specific `store_kind` — `Auchan Ótica` is an optician, not a supermarket, and
typing it as its host would waste the whole point of holding it.

### Still open — the one this does not answer

| operator lists | we hold | question |
|---|---|---|
| `Farmácia Reis Barata` | `Farmácia Dolce Vita [pharmacy]` | the same pharmacy renamed when the centre went Dolce Vita → UBBO, or two different pharmacies? |

The rule above does not reach it: the operator lists **one** pharmacy, not
two. If it is a rename, adding `Farmácia Reis Barata` creates a duplicate; if
it is not, the held row stays anyway, because a tenant list adds and never
retires. Same shape as Jumbo/Auchan — a rename leaves two names sharing
nothing, so no matcher can settle it.

## Settled — the tenant IS the row we hold

| tenant | held row | why |
|---|---|---|
| `Cacifos CTT Locky` | `Cacifo Locky` | the CTT parcel locker, same unit |
| `Sould Park Jump` | `Sould Park TRAMPOLIN JUMP Lisboa` | one trampoline park |
| `Mr. Blue` | `Loja Mr. Blue` | `Loja` is the shop word, not part of the name |
| `100 Montaditos` | `100 Montaditos` | exact, escalated only because `A-100` also scored |
| `Açaí Natura` | `Açaí Natura` | exact, escalated only because `Natura` also scored |
| `Lugar da Jóia` | `Lugar da Jóia` | exact, escalated only because `Galeria da Jóia` also scored |

## Settled — the tenant is real but nothing can place it

`A-100` · `Natura` · `Galeria da Jóia` · `Under Blue`

Each scored against a row that belongs to a *different* tenant above. They
join the 97 that no source can place, and go in at the centre's coordinate
under the owner's ruling.

## Settled — not a match, in either direction

The matcher pairs on shared letters; none of these is the same business.

`The Body Shop` ≠ `Oysho` · `AMADORA SC UBBO` ≠ `Pandora` ·
`Welder` ≠ `Celeiro` · `PeSSoaS` ≠ `Nespresso` ·
`Euromúsica` ≠ `Euro Sofás` · `Claire's` ≠ `Carpet Store` ·
`MISAKO` ≠ `MICO` · `Pizzaria Luzzo` ≠ `Pizza Hut` ·
`Fornada de Pão` ≠ `Fireaway Pizza` · `Tejo Fan Park` ≠ `Pet's Park` ·
`Urban Trend` ≠ `Mango Teen` · `Mayoral` ≠ `MyForce` ·
`MO` ≠ `Loja MEO` (a clothing brand against a telecom) ·
`Neffos Ubbo` ≠ `NOS` (a phone brand against a telecom) ·
`Morangos Please` ≠ `Amor aos Pedaços` ·
`Raia Beauty Spot` ≠ `Grace and Beauty` ·
`Ribs & Company Ubbo` ≠ `Pans & Company`

`Ribs & Company Ubbo` and `Neffos Ubbo` are held and unlisted, so they join
the look-list — **a tenant list adds, it never retires.**

## Settled — already ruled, re-raised because a ruling is scoped

* **The three Mangos** — `Mango`, `Mango Man`, `Mango Teen` are all valid at
  UBBO (owner, 2026-10-04), and that establishes no rule elsewhere.
* **`Intimissimi` / `IUMAN Intimissimi Uomo`** — `decisions.md` already has
  `INTIMISSIMI` / `Intimissimi Uomo` as one shop with two doors, both rows
  valid.
* **`Western Union` ≠ `Mister Minit`** — already a confirmed non-match.
* **`VitaFlores` ≠ `Valores`** — recorded when `Valores` was ruled a valid
  but temporarily closed unit.

These keep coming back because a confirmed pair in `decisions.md` is scoped
to the mall it was ruled for. Whether brand-family rulings should be global
is itself an open question, noted in the UBBO review.
