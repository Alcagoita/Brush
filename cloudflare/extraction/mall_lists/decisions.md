# Mall tenant decisions

Rulings already given. **Read this before proposing anything** — every line
here is a question that has been answered, and asking it again wastes the
reviewer's time. `mall_tenants.py` has no memory; this file is it.

## THE rule for every shopping centre (owner, 2026-10-05)

There is **one** rule, and it governs everything else in this file:

> * If the store is in the list of stores from the Mall, we need to have it there.
> * Never create stores that aren't there.
>
> Overture + OSM aren't the source, only the helper.

Read it as three statements, because each changes what the pipeline does:

1. **The operator's list is the complete tenant set.** Every listed unit gets
   a row — not only the ones a source can place. A tenant nothing can place
   still gets a row, at the centre's own coordinate.
2. **Nothing is ever invented.** A row is created only for a unit on the list.
   An OSM shop inside the footprint that the operator does not list is not a
   tenant and is never added.
3. **Overture and OSM are helpers, not sources.** Inside a shopping centre
   they answer "where is this listed tenant, and on which floor" — never
   "which tenants exist". That question has exactly one answer, the operator.

This inverts the direction the audit used to run. The comparison no longer
asks "which of our rows survive the list"; it asks "which listed units do we
already have, and what is each one's position". The list is the target state.

It also explains the manual-only rule: an automated source cannot write into
a building whose contents are defined by someone else's document.

**What it does NOT say** is that the list retires anything. A row we hold
inside a centre that the operator does not list is not deleted by this rule —
removal still needs a person, ruling on it individually.

## A row inside a centre that the operator does not list is wrong

Owner, 2026-10-05, on the two statements of THE rule above:

> "If we have 24 stores at Ubbo that aren't on the source of true, that's
> wrong. Same for Amoreiras."

So the list is authoritative **in both directions**, and the older "a tenant
list adds; it does not retire" no longer holds inside a shopping centre. It
was written when Overture was treated as a co-source for mall interiors;
Overture is not a source there at all.

### Removal uses the STRICT outline, never the buffer

This is the part that will destroy real places if it is got wrong, and it
nearly did. The buffer exists so a listed tenant with an imprecise coordinate
still matches. Using that same buffered set to **remove** sweeps in the
neighbours:

| row | nearest centre | Amoreiras Shopping Center |
|---|---|---|
| `Worten` | **Amoreiras Plaza, 19 m** | 106 m |
| `Massimo Dutti` | **Amoreiras Plaza, 30 m** | 95 m |

Both are tenants of a *different* shopping centre — `Amoreiras Plaza` and
`Amoreiras Square` are separate `shop=mall` buildings in the same block. The
buffer ring also holds ordinary street businesses (`ABANCA`, `Caixa Geral de
Depósitos`, a `Powerdot` charger 203 m out).

**So: match on the buffered footprint, remove only from the strict outline.**
At UBBO that is 18 rows of the 24, at Amoreiras 17 of the 28.

### And the match must be checked by hand first

The matcher misses listed tenants, so a REMOVE list is a draft, never an
instruction. Two of the 35 were listed all along:

* `H3 Hambúrguer Gourmet` is the listed `H3` — already a confirmed pair, and
  this file already says `H3` is too short for the containment rule;
* `UCI Dolce Vita Tejo` is the listed `UCI Luxe`, under the centre's old name.

UBBO also holds the cinema twice, as `UCI Dolce Vita Tejo` and `UCI CINEMAS` —
a duplicate to settle, not two removals.

## Types our own data disagreed about, ruled 2026-10-08

Eight names behind the unplaceable units were held under more than one type in
production, so our own rows could not settle them. All eight are now ruled:

| unit | type | why |
|---|---|---|
| `Nespresso` | `store` + `store_kind=coffee_supplies` | **sells capsules and machines, not coffee to drink** — it is not a café |
| `Santini` | `ice_cream` | the single `butcher` row is wrong |
| `Wiñk` | `nail_salon` | a nail salon, not a general beauty salon |
| `Pluricosmética` | `store` + `store_kind=beauty` | a cosmetics store |
| `Casa da Sorte` | `lottery` | |
| `Laranjinha` | `store` + `store_kind=childrens_clothing` | Amoreiras |
| `Maria Croissant` | **both** `bakery` and `cafe` | both valid, in every occurrence |
| `Padaria do Bairro` | **both** `bakery` and `cafe` | both valid, in every occurrence |

## A brand carries the same type SET in every branch

> "We can have multiple types for a brand, we just need for them to be same in
> every occurrence." — owner, 2026-10-08

The rule is **consistency, not singularity**. `Maria Croissant` and
`Padaria do Bairro` are a bakery *and* a café, and both types belong on every
branch. What is wrong is one branch carrying `bakery` while another carries
`cafe`, because then a user tagging "buy bread" reaches some of them and not
others.

Nespresso is the case that showed it: `cafe` ×13, `store` + `coffee_supplies`
×5, `restaurant` ×1, `supermarket` ×1. It sells capsules and machines, so the
correct answer is the one **5 rows** hold, not the one 13 do — **a majority
vote would have picked the wrong type.**

Measured 2026-10-08, comparing each row's full set of types rather than its
primary: of 36 names already known to carry more than one type, **all 36 hold
different type sets across their rows** — `ponto ctt` has 18 distinct sets
across 1,222 rows, `loja ctt` 9 across 508, `minipreco` 7 across 567. That
sample was pre-selected, so it says nothing about the overall rate; what it
does say is that none of those 36 turned out to be a legitimate multi-format
brand. See KAN-480.

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
| `BERTRAND LIVREIROS` | `Livraria Bertrand` | Vasco da Gama, Via Catarina |
| `PANS & COMPANY` | `Pans and Company` | both |
| `XIAOMI STORE PORTUGAL` | `Mi Store Portugal` | Colombo — renamed |
| `LEROY MERLIN` | `AKI` | Colombo — rebrand, renamed |

Two Portuguese rebrands, confirmed by the owner 2026-10-05. **The retired name
is the one that goes**, and the direction matters:

* **`Jumbo` is `Auchan`** — Jumbo was the hypermarket's name before the rebrand.
* **`AKI` is now `Leroy Merlin`** — note the direction. The row above reads the
  other way round because Colombo's operator listed `LEROY MERLIN` against a
  row we held as `AKI`; the surviving brand is Leroy Merlin either way.

Neither is a rule a matcher can apply on its own, because the names share
nothing — a rebrand is a fact about the world, not a string similarity. Both
are national: 36 rows carry `Jumbo` and 44 carry `AKI`, measured 2026-10-05.
See KAN-479.

**`Jumbo` in a name is not always the hypermarket.** Five rows reference it
without being one — `Jumbo Cascais` is a bar, `Restaurante Chinês Jumbo` a
restaurant, `Box Jumbo` and `Quiq+, Jumbo Aveiro` are shops named after the
store they sit beside. None may be touched by a brand sweep.
| `H3` | `H3 Hambúrguer Gourmet` | Strada — too short for the containment rule |
| `H3 – NEW HAMBURGOLOGY` | `H3 Hambúrguer Gourmet` | NorteShopping, Via Catarina — the chain's new name (owner, 2026-11-11) |
| `5 À SEC` | `5àsec` | NorteShopping |
| `KIKO MAKE UP MILANO` | `Kiko Milano` | NorteShopping |
| `WELL’S ÓPTICA` | `WELLS ÓTICA MATOSINHOS NORTESHOPPING` | NorteShopping |
| `Arcádia – Galleria` | `Arcadia Casa do Chocolate` | NorteShopping (owner, 2026-11-11) |
| `CONTINENTE BOM DIA` | `Continente Bom Dia NorteShopping` | NorteShopping |
| `CONTINENTE BOM DIA` | `SAT MATOSINHOS CONTINENTE BOM DIA NORTESHOPPING` | NorteShopping — a second row for the Bom Dia, NOT the hypermarket |
| `FNAC` | `Fnac` | NorteShopping — held twice; Clínica Fnac is its own unit |
| `FNAC` | `FNAC Norte Shopping` | NorteShopping |
| `JOSE LUIS JOYERÍAS` | `Jose Luis Jewelry` | NorteShopping — held twice |
| `JOSE LUIS JOYERÍAS` | `José Luís Jóias` | NorteShopping |
| `Farmácia Ferreira da Silva` | `Farmácia do NorteShopping Porto` | NorteShopping — the same Loja 140, held twice |
| `Farmácia Ferreira da Silva` | `Farmácia Ferreira da Silva` | NorteShopping |

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

## The operator decides what is a separate unit

**If the operator lists them separately, we hold them separately — including
a shop inside another shop** (owner, 2026-10-05):

> "if the Source of true have the stores separated, we should have them. Even
> if it's inside the main store (like Auchan) the user needs to know that
> inside Auchan, we have a Auchan Ótica."

A concession is a place a user can walk into and solve a task at. Someone who
needs an optician is not helped by being told there is a supermarket there.

This is the default, and it answers the whole "two tenants, one held row"
family without asking again. At UBBO it means separate rows for
`Auchan Ótica`, `Auchan Saúde e Bem Estar` and `Auchan Tecnologia` beside the
`Auchan` hypermarket, for `O meu Olá` beside `Olá`, for `Tramas Home` and
`Tramas+`, for `Carrossel Experience` beside `Carrossel`, and for
`Holmes Place SPA` beside the gym.

It also supersedes the older reading of the `Well's`-inside-Continente note
below: a concession not in the directory was *kept*, and a concession that IS
in the directory is now certainly kept.

### The exception: the same business listed twice

One unit, two listings, keep ONE. These were ruled before the rule above and
still hold, because none of them is a second business:

`TOP ATLÂNTICO` / `TOP ATLÂNTICO – VIAGENS E TURISMO` (Colombo, Piso 0 — the
second is the fuller name of the same travel agency) ·
`VODAFONE` / `Vodafone Empresas` (Colombo, Piso 0) ·
`BERSHKA` / `BERSKA` (Vasco da Gama, a typo on the operator's page)

**The test that separates the two cases is whether the second listing is a
different kind of business.** `Auchan Ótica` is an optician inside a
supermarket — different type, different task, its own row. `TOP ATLÂNTICO –
VIAGENS E TURISMO` is the same travel agency written out in full — same type,
one row. Where our own types differ, it is a separate unit; where they are
identical and the names are variants of each other, look before adding.

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

The coordinate is the mall's **polygon centroid**, not a street door — the
average of the outline's own points, which is what `footprints.json` holds and
what every row was written at. It is ~35 m from the `center` OSM reports for
the same relation, and the two should not be confused:

| centre | OSM | centroid |
|---|---|---|
| UBBO | `relation/14978983` `shop=mall`, `building=retail` | 38.7769534, −9.2204064 |

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

**Built and wired, 2026-10-23.** `mall_footprints.mall_at()` answers "which
centre is this point inside", and two callers consult it:

* `promote_overture_candidates.decide()` rejects any candidate inside a
  centre, with `inside <centre>; shopping centres are manual only` on the row.
  Nothing is deleted — the candidate keeps its reason in
  `overture_candidate`.
* `refresh_overture_country.apply()` holds such rows back in **both**
  directions: a changed row inside a centre is not refreshed, and a row that
  vanished from the release is not retired, because the operator's list
  decides that and not a data drop. The run reports
  `mall_rows_held_by_hand`.

The guard is cheap enough to ask of every candidate in a country import — a
bounding box per centre answers the common case in under a microsecond, so
200,000 far-away candidates cost 0.14 s.

Eight tests cover it (`tests/test_mall_manual_only.py`), including that a row
with no coordinates does not crash it and that the reason names the centre.

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

### The footprint needs a buffer, and it is per centre

Strict point-in-polygon drops real tenants. Source coordinates are coarse and
often pinned to a street door, so a shop's own point routinely falls outside
its own building. Measured at UBBO 2026-10-05, the 41 rows outside the outline
separate cleanly by distance:

| distance outside | what is there |
|---|---|
| ≤ 102 m | every real tenant — Auchan hypermarket 39 m, UCI Cinemas 35 m, a door-pin cluster 65 m |
| ≥ 177 m | nothing that is a tenant — a primary school 177 m, the standalone Leroy Merlin 197 m, two Auchan fuel stations 284 m and 288 m |

**The buffer is per centre, not one constant.** It was first written as one,
on the theory that it only compensates for coordinate quality. Measuring both
centres disproved that — it also depends on how isolated the building is:

| buffer | Amoreiras matched / REMOVE | UBBO matched / REMOVE |
|---|---|---|
| 0 m | 76 / 18 | 97 / 18 |
| 50 m | **87** / 28 | 114 / 23 |
| 75 m | 87 / 35 | **117** / 24 |
| 150 m | 88 / 55 | 117 / 26 |

Amoreiras stops gaining matches at 50 m and then only accumulates neighbours —
it has three other shopping centres within 500 m (`Amoreiras Plaza`,
`Amoreiras Square`) and a street of shops. UBBO is an isolated retail complex
and keeps gaining to 75 m at almost no cost. So each centre carries its own
buffer and the measurement that justifies it, in `footprints.json`.

### Auchan is why a name test cannot replace geometry

UBBO holds an `Auchan` hypermarket **inside** the centre and two fuel stations
also called `Auchan` 284 m and 288 m away. Matching tenants by brand name
would pull the fuel stations in; the buffer separates them on geometry alone.
Covered by a test.

Still open: `Jumbo na Amadora` sits 39 m outside, is typed `supermarket`, and
Jumbo is what Auchan was called in Portugal before the rebrand. It is very
likely the same hypermarket held twice under both names — the
`LEROY MERLIN` → `AKI` and `XIAOMI STORE` → `Mi Store` case. The door rule
cannot catch it, because the names differ. Owner ruling needed.

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
* **`ENCERRADA TEMPORARIAMENTE`** (NorteShopping) is the same thing — opening
  hours, not a closure. All three units it appears against are kept (owner,
  2026-11-11).

## NorteShopping, ruled 2026-11-11

The operator lists **279** units (owner: one entry on the page was a
duplicate, probably a shop with two doors). Footprint `relation/16708133`,
buffer 50 m — matches climb to 50 m and are flat to 100 m.

**Only the listed places may exist in the centre.** Every row inside that the
operator does not list is withdrawn, curated rows included — `Silo – Espaço
Cultural`, `Praça do Vapor`, the gallery and the two cinema screens went with
the shops. This is the UBBO/Amoreiras rule applied without exceptions.

**Two held rows for one listed store are the same store.** Keep one, give it
the list's type and floor, withdraw the other. The double confirmation for
door duplicates (same name AND a door pin) is not required here: the owner
ruled these pairs directly — Fnac, José Luís, Pull&Bear, the pharmacy at Loja
140, and the second Continente Bom Dia row.

**A unit with no published floor is Piso 0.** Floors are stored as the digit
(`0`, `-4`), the shape `overture_poi.floor` holds. KAN-439 wrote `Piso N` into
135 curated rows; that is a format to normalise, not a second convention.

**The ring is read by address, and so is the far side.** Removal stays on the
strict outline unless the address says the row is the centre's:

* in the 50 m ring, `Norteshopping` / `Rua Sara Afonso` in the address makes
  it a unit pinned a few metres off (Benetton, Lanidor, Clarks …); another
  street makes it a neighbour, kept — Galp, Clinicanimal, Bossê Tattoo,
  Nortejóias on Rua Monte da Luz, Ponto CTT;
* beyond the buffer, the centre's own address on a row 77 m to 2 km away is
  the same shop with a bad coordinate. FNAC, Sephora, Tezenis, BOSS and
  others were each served a second time 1–2 km off. Withdrawn; a matching
  unit is answered by the row inside. `Staples` — *junto ao Norte Shopping*,
  next to it — is a neighbour.

**Types ruled:**

| unit | type |
|---|---|
| chocolate shops — `Lindt`, `LÄDERACH`, `Arcádia – Galleria` | `bakery`, as every Lindt we hold |
| keys and locks — `Chaviarte`, `CHAVIARTE PREMIUM`, `Point Fort Fichet` | `shoe_repair`, as Mister Minit |
| `IUMAN` — men's underwear | `store` + `mens_clothing` |
| `Mimo.Cool` — children's clothing and shoes | `store` + `childrens_clothing` |
| `QUAD` — sports clothing and equipment | `store` + `sports` |
| `Fabric Store` — home decor and textiles | `store` + `home` |
| `NOTE!` — stationery and books | `store` + `books` |

Six typings our own rows carried were plainly wrong and are corrected for the
mall units: `FLYING TIGER` (was `florist`) → `store` + `gift`; `MAC` (was
`historical_landmark`) → `store` + `beauty`; `ZARA HOME` → `store` + `home`;
`OTRO Perfume Concept` (was `spa`) → `store` + `beauty`; `TWINSET` →
`womens_clothing`; `TERESINHA CARTEIRAS` → `handbag`. The same wrong sets sit
on those brands' other branches; fixing them nationally is a follow-up
(owner, 2026-11-11), because a brand carries one type set everywhere.

**ACP** keeps its current brand set here; KAN-500 retypes every branch.

## Via Catarina, ruled 2026-11-12

The operator lists **76** units. Footprint `way/365658312`, buffer **30 m**:
Rua de Santa Catarina is lined with shops, matches stop climbing at 30 m, and
beyond it every extra 10 m roughly doubles what a buffer removal would sweep
in. The NorteShopping rules apply unchanged.

**Address evidence on a shopping street.** The street's name is not evidence
here — half the street's own shops give it. A ring row is the centre's only
when the address says `Via Catarina` or the centre's number, `Santa Catarina
312` (the centre is 312–350). A row the matcher scores higher but that sits on
the street — `Kiko Milano` at no. 412, `MISAKO` at no. 397 — is a neighbour:
a row certainly inside answers the unit first, and a street twin is kept.

`Cristina Soares` publishes two shops in one address field, Via Catarina loja
3.08 and Rua do Almada 233. The row 146 m out is the Via Catarina unit pinned
badly and is withdrawn; the row 522 m out, by Rua do Almada, is the other shop
and is kept.

**Types ruled:**

| unit | type |
|---|---|
| `CBWEED` — CBD beauty products | `store` + `beauty` |
| `COORDENADA PERFEITA` — printing, photos | `store` + `copy_shop` |
| `SECRET PACK` — mystery boxes | `store` + `gift` |
| `NACO` — beauty salon, nails | `beauty_salon` + `nail_salon` (our rows elsewhere said `spa`) |
| `ORIENTAL` — Asian restaurant, sushi | `restaurant` (our rows elsewhere said `cafe`) |
| `CHOCOLATE ROSA` | `bakery` (our rows elsewhere said `tea`) |
| `NORSEC/TOP COSTURA` | `clothing_repair` + `laundry` |

Brands already typed at NorteShopping keep that set here: `FLYING TIGER
COPENHAGEN` `store` + `gift`, `PACOMARTINEZ` `handbag`, `IUMAN INTIMISSIMI
UOMO` `mens_clothing`, `JOCORUM TABACARIAS` `tobacco`, `WELLS` `drugstore`.
`BRIGHTMOBILES` is `store` + `phone`: an override cannot carry a store kind
beside a non-store primary, so `phone_repair` + `phone` (Fashion Phone's set)
is not expressible as a ruling.

## Brand type sets applied nationally, 2026-11-12

The mall rulings above corrected nine brands at NorteShopping and Via
Catarina; the owner asked for every other branch to be fixed in the same
ticket (migration 0067, overrides batch `kan462_brand_type_sets`). Flying
Tiger follows the owner's `gift` ruling — which Vasco da Gama's curated row
already carried — over the `discount_store` its 70 Overture rows held.
`MAC` in Almada (a historical landmark) and the businesses that merely share
a word with a brand (`Twin Set Spa`, `Teresinha Cabeleireiros`, the `Naco`
restaurants) were left alone.

## ACP is a financial service, ruled 2026-11-12 (KAN-500)

ACP answers three errands — licence renewal, travel documents and car
insurance — and a user typing any of them should be offered it (owner). Of
the types a task can reach today only insurance has a home, so every ACP
branch carries `financial_service` + `financial_service_kind = insurance`.
Licence renewal and travel documents wait for a motoring-services type (its
own ticket), which will be added to every branch when it exists. The old
`store` + `auto_parts_and_supply` was wrong everywhere: ACP sells no parts.

Branches: Leiria (Overture), Amoreiras, NorteShopping, and Colombo — listed
since KAN-435 and never added, now written at OSM's own unit
(`way/1466236772`, level 0). Colombo's footprint is `way/42645796`, buffer
75 m. `Acp Barbearia` in Gaia is a barber and is not ACP.

`travel_agency` is in our data (Agência Abreu, Top Atlântico) but is not a
type any task can reach — not in the app's types, nor in `type_relation`.
Typing a row `travel_agency` alone makes it served and unfindable.

### Overrides apply only to generic-category rows

KAN-462's `kan462_brand_type_sets` batch put 86 retyped Overture rows in the
reviewed overrides. 85 have a real Overture category (`gift_shop`, `spas`,
`furniture_store` …), and the promoter refuses an override on such a row —
it raises `invalid reviewed override` the day a refresh re-decides one. They
are withdrawn through the reversal log; the retype itself stays on the rows,
since a refresh keeps types and only a category change re-decides.
