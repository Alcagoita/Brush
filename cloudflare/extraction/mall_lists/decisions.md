# Mall tenant decisions

Rulings already given. **Read this before proposing anything** — every line
here is a question that has been answered, and asking it again wastes the
reviewer's time. `mall_tenants.py` has no memory; this file is it.

## Confirmed matches — the tenant IS the row we hold

The matcher scored these below its confident bar. They are the same shop.

| operator directory | we hold | mall |
|---|---|---|
| `5 À SEC` | `5àSec` | Colombo, Vasco da Gama |
| `TIFFOSI` | `Tifossi` | Colombo |
| `MERREL CATERPILLER` | `Merrell` | Colombo |
| `SALSA JEANS` | `Salsa Denim Innovation` | Colombo |
| `T.Hair Barber's` | `T-Hair for Men` | Colombo |
| `ORIENTE-SE – TATTOOS & PIERCINGS` | `Oriente-Se Artigos Orientais` | Colombo |
| `BERTRAND LIVREIROS` | `Livraria Bertrand` | Vasco da Gama |
| `PANS & COMPANY` | `Pans and Company` | both |
| `XIAOMI STORE PORTUGAL` | `Mi Store Portugal` | Colombo — renamed |
| `LEROY MERLIN` | `AKI` | Colombo — rebrand, renamed |
| `H3` | `H3 Hambúrguer Gourmet` | Strada — too short for the containment rule |

## Confirmed NOT matches — different businesses

Similar names, different shops. The default answer to a partial name match
is no.

`KIK` / `KIWOKO` / `Kiko` are three chains · `PRIMOR` ≠ `Primark` ·
`PIMKIE` ≠ `PRIMARK` · `Clarks` ≠ `Claire's` · `Tous` ≠ `Toys R Us` ·
`Cinemas NOS` ≠ `Loja NOS` · `Lanidor` ≠ `PANDORA` · `Chicco` ≠ `ECCO` ·
`Asics` ≠ `iServices` · `Elena Mirò` ≠ `CELEIRO` · `Loja Huawei` ≠
`Hawkers` · `Inglot` ≠ `NOTE!` · `Macmoda` ≠ `MAC` · `Furla` ≠ `SFERA` ·
`Café do Ponto` ≠ `Ponto do Café` (Strada — two separate shops, however
much the names invite merging) · `Carpisa` ≠ `Parfois` ·
`Hubside.Store` ≠ `SEASIDE` · `Western Union` ≠
`MISTER MINIT` · `Cacifo Locky` ≠ `FOOT LOCKER` · `Timberland` ≠
`Silverland` · `Kiro` ≠ `Kiko` · `Mais Optica` ≠ `MultiOpticas`

## One shop, two doors — both rows are valid

`Springfield` / `Springfield Woman` · `ZARA` / `Zara Home` ·
`MANGO` / `MANGO TEEN` · `INTIMISSIMI` / `Intimissimi Uomo` ·
`BOTA MINUTO` at Vasco da Gama (Piso -1 and Piso -1 GARE) ·
`BigFoot` / `BigFoot Sport` at Strada — one shop with two doors, one row ·
`Wells` / `Wells Ótica` at Strada — two shops sharing one unit, so TWO rows:
the parapharmacy and the optician are different businesses at one address

## One unit listed under two names — keep ONE

`TOP ATLÂNTICO` / `TOP ATLÂNTICO – VIAGENS E TURISMO` (Colombo, Piso 0) ·
`VODAFONE` / `Vodafone Empresas` (Colombo, Piso 0) ·
`BERSHKA` / `BERSKA` (Vasco da Gama, a typo on the operator's page)

## Kept despite being absent from the directory

* `Well's` — inside Continente at Vasco da Gama. A concession is not a unit.
* `Brown Bar Benefit` — the Benefit bar inside Sephora, Colombo.
* `Luggage Storage Lisbon` — real, in Gare do Oriente, not a mall unit.

## Types that exist because a tenant needed them

A shop whose type the app lacked used to be held back. It is not a reason to
drop a real place — the type gets added.

* `travel_agency` — AGÊNCIA ABREU and TOP ATLÂNTICO (both malls), Viagens El
  Corte Inglés (Strada). These carried `store_kind=any` while the kind did
  not exist; `any` is a generic store by another name, so it is not an
  answer.
* `copy_shop` — Centro de Cópias (Strada).

## UBBO, ruled 2026-10-04

Scoped to UBBO. The owner was explicit that these answer **this** centre and
establish no rule elsewhere.

* **Three Mango units — `Mango`, `Mango Man`, `Mango Teen` — are all valid
  and all three stay.** This is not the "one shop, two doors" entry above
  being reused: UBBO genuinely has three. Do not generalise it to another
  mall, and do not read the brand-family entries above as applying here.
* **`Snipes` twice, both real** — two units on the same floor at different
  coordinates, so the list carries two entries and both rows are valid.
* **`Merrell | CAT`** carries a literal pipe, which is the list format's
  separator. Written `Merrell CAT`; either spelling is acceptable (owner).
* **`Encerrada temporariamente`** — `Flying Tiger Copenhagen`, `Levi's` and
  `Valores` are **valid stores, temporarily closed**. They stay, and they are
  matched like any other unit. This is unlike `ABRE BREVEMENTE` below: a shop
  that has not opened does not exist yet, while a shop that is shut for now
  does.
* **`VitaFlores` is not `Valores`** — the matcher paired them at 0.82.

## A listed tenant nobody can place goes at the mall's own coordinate

Ruled by the owner 2026-10-04: **we cannot exclude a store we know is
there.** The operator's published list is authority that the unit exists, so
a tenant that neither Overture nor OSM can place is added at the **shopping
centre's generic coordinate** rather than dropped.

This reverses the older reading that a list adds only what a source can
place. The list itself is the source for existence; only the position is
missing, and the mall's own coordinate is an honest answer to "where" — the
shop is in that building. It is not a guess about which unit.

The coordinate is the mall's **polygon centroid**, not a street door:

| centre | OSM | centroid |
|---|---|---|
| UBBO | `relation/14978983` `shop=mall`, `building=retail` | 38.7769342, −9.2200815 |

These rows are ours, so they are `curated_poi` with provenance recorded, the
same as every served place that is not Overture. Each still needs a real
`poi_type` and a specific `store_kind` — **no bare `store`** — and the
operator's category is a hint toward that, never the answer.

At UBBO this is **97 units**. Their operator categories mostly map cleanly,
with one exception worth stating: **14 are only `Serviços`**, which types
nothing on its own (a barber, a car wash, a currency exchange and a key
cutter all carry it). Those need the name read individually.

### A shopping centre is never updated automatically

Ruled by the owner 2026-10-04, after the duplicate risk above was raised:
**a shopping centre's contents are manual-only.** No import, promotion or
refresh may add to, change or retire anything inside a mall footprint.

This is deliberately stronger than suppressing the duplicate at query time.
The duplicate was a symptom: an automated source writing into a building we
maintain by hand will always eventually disagree with the operator's own
list, and the operator is the authority. Removing the writer removes the
whole class of failure. "This will always fail" — owner.

What it requires, and what is not built yet:

* a registry of mall footprints, so "inside a mall" is a thing code can test;
* a guard in `promote_overture_candidates` and `refresh_overture_country`
  that skips any candidate falling inside one.

Until that guard exists, the next Overture refresh will walk into these
buildings. It is part of KAN-439.

### Many POIs at one point is the intended behaviour

Every unplaceable tenant sits on the centre's single coordinate, so a user
within `NEARBY_RADIUS` can see dozens of places from one building at once.

**That is wanted, not a bug** (owner, 2026-10-04): "if the user is near 50
POI, that's because he's close to the Shopping. That is precisely what we
want." A mall is handled differently from everywhere else. Do not add a cap,
a collapse-into-one-card, or a rule hiding tenants until the user is inside.

## A footprint is the building, not a box — and the two audits need two scopes

Found 2026-10-05, while scoping Amoreiras. A lat/lng box around a centre is
not the centre:

| centre | rows in the box | rows inside the building |
|---|---|---|
| Amoreiras Shopping Center | 308 | **109** |
| UBBO | 176 | **135** |

Amoreiras' box also contains three *different* shopping centres — `Amoreiras
Plaza`, `Amoreiras Square` and `Amoreiras Shopping Center` are all `shop=mall`
within 500 m — plus the surrounding Lisbon streets. Comparing that box against
the operator's list produced a REMOVE list of **139** shops that were never in
the centre. Scoped to the building it is **18**.

Footprints live in `mall_lists/footprints.json` as the OSM `shop=mall` outline
with the id it came from, and `mall_footprints.py` tests a point against it.
Not a radius: a centre is an irregular building, often with a car park and a
retail park beside it, and a radius either swallows the neighbours or clips
the far end.

**The two audits need different scopes, and this is not a detail:**

* the **tenant comparison** runs on the building outline — the operator lists
  what is inside;
* the **door-duplicate check** must run on the *box*, because a door-pinned
  row sits on the centre's street address, which is **outside** the outline.
  Measured: UBBO's duplicate `Bershka` and `Oysho` rows both fall outside the
  polygon while their real-unit twins fall inside. Running the duplicate check
  on the outline finds nothing and silently leaves the duplicates serving.

### A caveat that is not yet settled

Tightening UBBO from the box to the outline moved 20 rows out of "confidently
matched". Some are neighbours that never belonged; others may be real parts of
the centre in an annex the polygon excludes — a hypermarket wing or a retail
park unit. `mall_footprints` supports several rings per centre for exactly
this, and no one has yet checked which of the 20 are which.

## A van desk inside a store is not a place

Ruled 2026-10-04: the `car_rental` rows named after hardware stores are **the
van-hire desks those stores run so customers can get purchases home** — "we
don't need that in our app, that's not a valid action. We just need to have
the store, with the correct type" (owner).

So a `Leroy Merlin` / `AKI` / `IKEA` / `Bricot Depot` row typed `car_rental`
is never served as car rental. **But it is usually not a removal either:**
measured nationally, only 6 of the 42 have the host store held separately
nearby. The other **36 are the only row we hold for that store**, so they are
retyped, not withdrawn — and three of them have coordinates in the wrong town,
so each needs its position confirmed first.

That is KAN-478. Inside a mall, do not act on such a row here: UBBO's
`Amadora - Leroy Merlin` is one of the 36 and `Alfragide-Leroy Merlin` is one
of the mislocated ones.

## Door-pinned duplicates — the rule, and both halves of it

Overture is a conflation of meta, Microsoft, Foursquare and AllThePlaces, and
its matcher does not always merge them, so inside a mall we can hold one shop
twice: once at the centre's street door, once at the real unit.

**A row may be removed only on DOUBLE confirmation** (owner, 2026-10-04):

1. the **same shop name** is held in the same footprint by a **different**
   upstream dataset, and
2. the row sits on a **door coordinate** — shared with at least one other row
   — while carrying the street address rather than a unit.

**One half is never enough, because losing a real shop cannot be undone.**
The coordinate on its own is not the test: every provider pins tenants to the
door, so a shared coordinate usually holds *different* shops. Measured
2026-10-04 — Amoreiras 38.723600,-9.163390 holds `Oysho`, `Bershka` and
`Zara`; Ubbo 38.779233,-9.219706 holds `Cacifo Locky`, `Flying Tiger`,
`New Yorker` and `Mayoral`; Amoreiras 38.725420,-9.163010 holds three
hairdressers. Every one of those is the only record we hold of that shop.

`mall_door_duplicates.py` applies both halves and prints what matched only
one, so what was left alone is visible rather than assumed.

Applied at UBBO: `Bershka` `08706da4` and `Oysho` `2d35b428`, both the
Microsoft copy at the door, both with a Foursquare twin at the unit.

Still needing an individual ruling: **`Leroy Merlin`** / **`Amadora - Leroy
Merlin`** — a real pair, neither at a door, so which is right cannot be
decided mechanically. (`LEROY MERLIN` → `AKI` above is Colombo's rebrand and
does not answer this.)

## Reading the operator's pages

* **`Encerrado`** means closed RIGHT NOW — opening hours. It appears against
  every unit on Colombo's page. It says nothing about whether a shop exists,
  and reading it as "closed for good" retired ActivoBank and CTT, both real.
* **`ABRE BREVEMENTE`** means not open yet. Do not add: a shop that has not
  opened is a place that does not exist.
* **`Clínica`** in a Portuguese name is not a medical clinic. `Clínica do
  Pêlo` is a waxing salon.
