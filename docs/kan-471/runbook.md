# KAN-471 — review log

## Second owner review, 2026-10-03

### Withdrawn (migration 0052, applied and verified)

| id | name | why |
|---|---|---|
| `37fe6a62` | Rua Azores Park | not a place we serve (Ponta Delgada, confidence 0.52) |
| `0dbe7be0` | Badoca Park | duplicate of the park, 3.9 km away |
| `13db4597` | Badoka Safari Park | duplicate, 21.2 km, Grândola |
| `ce3d793b` | Badoca Safari Park | duplicate, 83.4 km, filed in Lisboa |
| `1bd142b2` | Badoca Safari Park | duplicate, 86.1 km, filed in Lisboa |

`Badoca Safari Park` arrived **five** times, not four. The one kept is
`0e2b3245`, filed as `zoo`, confidence 1.00, at 38.04158,-8.74450 in Vila Nova
de Santo André — the actual park. Verified through `POST /poi/nearby`: none of
the four copies is served at its own coordinates, and the real park still is.

**Two more share the name and were NOT withdrawn**, because they are a
different claim and want their own decision:

* `54eeb83d` `Badoca Safari Park`, category `amusement_park`, 5.1 km away,
  confidence 0.99 — never reached the naming review.
* `d064f951` `Badoka Park`, category `petting_zoo`, **100.9 km** away in Lagos,
  confidence 0.72.

### Held out pending a type decision

A row filed as the wrong kind of place must not be given a name for that kind —
calling a restaurant `Praia de …` would dress it up as a beach. These three are
excluded from the naming review (`detect_english_names.WRONG_TYPE`) and need a
retype decision, which is not this ticket's scope:

| id | name | served as | where | confidence |
|---|---|---|---|---|
| `3cd36123` | Sabor Pesca Beach | `beach` | 41.17766,-7.11198 — Torre de Moncorvo, on the river Sabor | 0.74 |
| `0498f5da` | Beach Side | `beach` | 37.11892,-8.54120 — Portimão, by Praia da Rocha | 0.73 |
| `b17d0862` | Boom Lake | `lake` | 39.96981,-7.18500 — Idanha-a-Nova | 0.81 |

`Boom Lake` is almost certainly the reservoir at the Boom Festival site: the
festival is held at Idanha-a-Nova on the Marechal Carmona reservoir, and these
coordinates sit on it. The recorded Portuguese name is the reservoir's
(`Albufeira de Idanha-a-Nova` / `Albufeira Marechal Carmona`), not "Boom Lake",
which looks like a festival-era label. Owner's call.

### Rules added

* `Church of …` translates the COMPLETE name, not only the descriptor:
  `Church of Our Lady of the Glory` is `Igreja de Nossa Senhora da Glória`,
  `Church of the Sacred Heart` is `Igreja do Sagrado Coração`.
* Twelve names confirmed by hand in `src/nativeNameOverrides.json`, which
  outranks every rule — `Castle of the Knights Templar, Tomar, Portugal` is
  `Castelo de Tomar`, which nothing derives.
* Eight more names confirmed as the place's own and left alone.
* A name carrying a parenthetical is flagged: `OH (Open Heart church)` had come
  out as `Igreja de OH (Open Coração`, the lexicon having translated inside the
  bracket.

## Third owner review, 2026-10-03

### Withdrawn (migration 0053, applied and verified)

| id | name | why |
|---|---|---|
| `b904499f` | Ondix Beach | not a place we serve — Almada, confidence **0.38**, the lowest of any row in this review |

`ONDIX` itself is a dance club 8 km away (`4c12ab69`), left alone: a club is a
real place, just not a beach. Verified through `POST /poi/nearby` — the beach
is gone from those coordinates and `Praia da Adiça` is still served there.

### Confirmed as the place's own name

`Tejo Fan Park`, `Tag Park`, `Portoland Park`, `Pestana Palms Beach`,
`New life church`.

`Tejo Fan Park` had been given earlier in this same review as a translation
example (`Parque Urbano do Tejo`) and was then reversed. The later instruction
stands; a test asserts it is in the leave-alone list and in no override, so the
two cannot drift back into conflict.

## The names are written, 2026-10-03

Migration `0054` added the provenance columns; `write_native_names.py` wrote
the reviewed names. **289 rows** gained a `name_local`:

| source | rows | what it means |
|---|---|---|
| `wikidata` | 49 | a label someone recorded, CC0, with its QID and matched distance |
| `owner` | 12 | confirmed by hand in `src/nativeNameOverrides.json` |
| `translated` | 228 | derived from a descriptor by rule, with the rule recorded |

**Not one of the 289 equals its own `name`** — every row gained a genuinely
different second name rather than a copy of the first.

### What was written, and what was not

Only `name_local`, `name_local_lang` and the three 0054 provenance columns.
`name` is untouched, as are coordinates, category, types, attributes,
decisions and `name_en`. Every statement is guarded on `name_local IS NULL`,
so a row that already has a native name keeps it.

Flagged proposals (120) were NOT written: those are a question for a human.
Withdrawn rows and the three held over their type are skipped even where a
proposal exists.

### This is a visible change

With `country_code` set by KAN-472 and no stored preference, `selectPoiName`
defaults to `'native'` and returns `nonBlank(name_local) || name`. So these
289 places now display in Portuguese. `Jerónimos Monastery` reads
`Mosteiro dos Jerónimos`. That is the ticket's point, and it is the first
change in it a user can see.

### Verification, through `POST /poi/nearby`

* Belém, 200 m: the only row whose `name_local` differs from its `name` is
  `ee495395` — `Jerónimos Monastery` → `Mosteiro dos Jerónimos`, `pt`,
  `country_code: "PT"`.
* `verify_prod_decisions.py`: **7 of 7** KAN-455 checks pass; Odivelas Parque
  200 m / 125 types still **111 rows**, 12 store brands, no inconsistent kinds.
  Report in `verification-2026-10-03.json`.
* Idempotent against production: a second `--apply` matched no rows
  (`changes=1`, D1's per-statement artifact), the count stayed 289 and the
  write date stayed single-valued.

### Rollback

`written-2026-10-03.json` lists every id written with its prior value, which
was NULL in all 289 cases because the write is guarded on it. Reversing is an
`UPDATE … SET name_local = NULL` over those ids.

## Closing the two gaps, 2026-10-03

### Trailing localities (gap 2)

A region tacked onto the end is where the place is, not part of its name, and
with it there the descriptor sits neither first nor last so nothing matched at
all. `strip_locality_tail` drops a comma tail whatever it says (the part before
the first comma is the name) and a bare trailing region only from
`LOCALITY_TAILS`:

```
Porches Beach, Algarve              -> Praia de Porches
Amoreira Beach, Aljezur, Algarve    -> Praia da Amoreira
São João De Caparica Beach Portugal -> Praia de São João De Caparica
Guincho Beach, Cascais              -> Praia do Guincho
Sines beach Portugal                -> Praia de Sines
```

A Portuguese connector in front of the region keeps it: `Praia da Madeira` and
`Ilha da Madeira` are untouched. The dropped part is recorded in the rule so a
reviewer can see something was removed. `Carcavelos Beach Stunning Views` stays
flagged — a trailing phrase is not a locality.

**28 more names written**, taking the total from 289 to **317** (12 owner, 256
translated, 49 Wikidata). Untouched fell from 188 to 141.

### Curated rows could never show a native name (gap 3)

0049 gave `curated_poi` its three name columns but no country, and
`selectPoiName` resolves the per-country choice from the row's own
`country_code`. Without one every curated row took the no-country branch, so a
native name written there would never have been displayed — all 9,978 active
rows.

* Migration `0055` adds the column and sets `'PT'`, guarded on NULL. Every
  curated row is Portuguese today (PT-only registry, PT Foursquare archive, PT
  venues), and the value is set explicitly so the first non-PT curated row has
  to say what it is rather than inherit a wrong default. 9,978 rows.
* `queryNearbyPoiDb` now selects and returns it. Deployed — version
  `017f5769-58f1-4f62-aac7-66771ee836b4`.

Verified on the wire at Belém: all 19 rows carry `country_code: "PT"`, 10
Overture and **9 curated** — `Igreja dos Jerónimos`, `Claustro do Mosteiro dos
Jerónimos`, `Túmulo de Camões` among them. No curated row has a `name_local`
yet; the point of this change is that one would now be shown.

`verify_prod_decisions.py` after the deploy: 7 of 7 checks pass, Odivelas Parque
still 111 rows, 12 store brands, no inconsistent kinds.
