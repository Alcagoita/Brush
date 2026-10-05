# KAN-439 — UBBO's 36 escalations, triaged

The matcher escalates anything short of a confident match, in either
direction. Of the 36 it raised, **six need the owner** and the rest are
settled on evidence below.

An escalation is never acted on silently: this document is the act of
settling one, and the comparison output
(`ubbo-comparison-2026-10-05.txt`) is what it was settled against.

## Still open — the owner decides

All six are one shape: **the operator lists two or more units and we hold a
single row.** That is not automatically a duplicate — `Wells` / `Wells Ótica`
at Strada are two businesses sharing one unit and carry two rows, while
`TOP ATLÂNTICO` / `TOP ATLÂNTICO – VIAGENS E TURISMO` at Colombo are one unit
listed twice. Only a person knows which.

| operator lists | we hold | question |
|---|---|---|
| `Auchan`, `Auchan Ótica`, `Auchan Saúde e Bem Estar`, `Auchan Tecnologia` | one `Auchan [supermarket]` | three separate units, or departments inside the hypermarket? |
| `Olá`, `O meu Olá` | one `Olá [ice_cream]` | two kiosks or one? |
| `Tramas Home`, `Tramas+` | one `Tramas [store]` | which one do we hold — or both? |
| `Carrossel`, `Carrossel Experience` | `Carrossel [hairdresser]` | we hold it as a hairdresser; is `Carrossel Experience` a different business? |
| `Holmes Place`, `Holmes Place SPA` | `Holmes Place Tejo - Amadora [gym]` | a separate spa row, or one gym? |
| `Farmácia Reis Barata` | `Farmácia Dolce Vita [pharmacy]` | the same pharmacy renamed when the centre went Dolce Vita → UBBO? |

The last one is the Jumbo/Auchan shape again: a rename leaves two names
sharing nothing, so no matcher can settle it.

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
