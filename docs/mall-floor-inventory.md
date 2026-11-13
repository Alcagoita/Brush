# Shopping centres without floor information

Inventory, 2026-11-13. Context: the new mall flow (KAN-512 design note,
KAN-503 → KAN-382 → KAN-513 → KAN-514) shows each shop's **floor** inside a
centre. A centre, or a unit inside one, that has no floor cannot use that
flow fully. This lists where floors are missing, so we can circle back.

Nothing here changes data or code. It's a list.

## How it was measured

- **Operator lists**: `cloudflare/extraction/mall_lists/*.txt`, a unit with
  an empty floor field (`Name|`), not counting units marked `opening`.
- **What the app actually gets**: live `POST /poi/nearby`, queried on a
  60 m grid across each centre's outline (the API caps each type at 50 per
  call, so one call at the centre would miss units), 32 POI types (the types
  mall units use), keeping only places inside the outline. "Curated" =
  `source` `community`/`manual` (the operator-list rows); "Other" = Overture
  rows inside the same building.
- **Every centre in Portugal**: OpenStreetMap `shop=mall`, one Overpass query
  (the same source as `footprints.json`). The registry serves no
  `shopping_mall` places itself (zero at Vasco da Gama), so it can't list
  centres.

Counts "inside the outline" are lower than list sizes: OSM outlines don't
always cover the whole centre, and types outside the 32 aren't queried. They
are a check on floors, not a recount of tenants.

## 1. Reconciled centres (15) — where floors are still missing

| Centre | Operator list: units without floor | Served inside outline: curated without floor | Other (Overture) rows without floor | Note |
|---|---|---|---|---|
| **UBBO** | **246 of 246** (operator publishes none) | **108 of 111** | 111 of 111 | Effectively no floors. README says floors come from OSM; served data shows they mostly didn't land |
| **Strada Outlet** | **113 of 113** (operator publishes none) | 0 of 48 | 61 | Curated rows have OSM-derived floors, unchecked against anything (README) |
| Centro Comercial Colombo | 8 of 300 (`100 MONTADITOS`, `HAPPY FOOD`, `AWA MASSAGE`, `COS`, `LEROY MERLIN`, `NATURAPURA`, `NOS Stand`, `WORTEN`) | 4 of 75 (`Baloes Samba`, `IMAX`, `Montanha Russa`, `NATURAPURA`) | 28 of 174 | |
| Amoreiras Shopping Center | 2 of 196 (`Simple & Fast – Oficina Auto`, `Simple Eco Wash`) | 2 of 93 | **87 of 87** | Before KAN-503, 91 of these rows stored `Piso N`; migration 0077 (applied 2026-11-13) rewrote them to bare integers |
| Vasco da Gama | 0 of 218 | 0 of 31 | 22 | |
| NorteShopping, Via Catarina, LeiriaShopping, Braga Parque, Nova Arcada, Forum Coimbra, Alma Shopping, Forum Algarve, MAR Shopping Algarve, AlgarveShopping | 0 | 0 | 0 | Complete |

Overture rows without floor inside a reconciled centre (Amoreiras 87,
UBBO 111, Colombo 28, Strada 61, Vasco da Gama 22) are rows the operator list
didn't claim. Under THE rule (`mall_lists/decisions.md`) a row inside a
centre that the operator doesn't list is wrong, and removal needs a person.
They'd show on the mall card with no floor until that review happens.

### Second OSM outlines of reconciled centres

These appear as separate `shop=mall` objects, so they're in the CSV below,
marked in its `note` column, but they belong to centres already reconciled.
Worth checking for KAN-513: detection uses one outline per centre.

- `Forum Algarve` — `way/92036327` (46,859 m²); `footprints.json` uses `way/182734578`
- `Nova Arcada` — `way/827832125` (22,998 m²; likely the retail park); `footprints.json` uses `way/55617020`

## 2. OSM mall objects with no operator list — no floor information at all

The CSV holds **595 OSM `shop=mall` objects**, every one in Portugal except
the 15 reconciled outlines above. Objects are not centres: one centre can be
mapped as several. Three are known second outlines, marked in the CSV's
`note` column:

- 2 belong to reconciled centres (Forum Algarve, Nova Arcada), so they are
  not unreconciled centres;
- 1 is a second outline of Centro Comercial Continente de Loures.

That leaves **593 objects for centres with no operator list**. The distinct
count of centres is lower still and not measured: repeated names (e.g.
`Centro Comercial Bela Vista` ×3) may be one centre or several in different
towns.

With no operator list there is no reliable floor for any unit (floors don't
come from OSM — README, "Floors do not come from OSM"). Full list with OSM
id, coordinates, outline area, website and note:
**`docs/mall-floor-inventory.csv`**, largest first.

Most are small. Of the 593, by outline area: 12 are ≥ 40,000 m², 68 are
10–40,000 m², 124 are 2–10,000 m², 185 are under 2,000 m² (galleries), and
204 have no area (OSM node or relation). 53 have no name. (Counting all 595
objects gives 13 and 69: the extra ≥ 40,000 m² object is Forum Algarve's
second outline, the extra 10–40,000 m² one is Nova Arcada's.)

### The largest 30, for a first pass

Second outlines of reconciled centres are left out; rows 1–12 are the 12
objects of 40,000 m² or more.

| # | Centre | Area m² | OSM |
|---|---|---|---|
| 1 | Freeport Lisboa Fashion Outlet | 117,374 | way/110230559 |
| 2 | Campera Outlet Shopping | 84,670 | way/139738027 |
| 3 | Centro Comercial Continente de Loures | 84,303 | way/140346036 |
| 4 | CascaiShopping | 65,486 | way/231390585 |
| 5 | Almada Forum | 50,342 | way/254561957 |
| 6 | GaiaShopping | 49,394 | way/487686305 |
| 7 | Coimbra Shopping | 47,294 | way/60786400 |
| 8 | Alegro Sintra | 47,233 | way/176065665 |
| 9 | Oeiras Parque | 45,713 | way/179876935 |
| 10 | MarShopping (Matosinhos) | 43,819 | way/191497844 |
| 11 | Forum Montijo | 43,543 | way/217975706 |
| 12 | Alegro Alfragide | 40,184 | way/190982611 |
| 13 | Centro Comercial 8ª Avenida | 39,663 | way/62202587 |
| 14 | Centro Comercial Continente de Loures (second outline) | 39,015 | way/271541563 |
| 15 | Vila do Conde Porto Fashion Outlet | 38,677 | way/135458146 |
| 16 | Parque Nascente | 37,337 | way/106466605 |
| 17 | Retail Park Mondego – Eiras | 32,396 | way/249658633 |
| 18 | Centro Comercial Glicínias Plaza | 31,973 | way/111761868 |
| 19 | Ferrara Plaza | 30,656 | way/135266250 |
| 20 | Centro Comercial Telheiras | 30,236 | way/155354343 |
| 21 | Minho Center | 29,813 | way/41680182 |
| 22 | ArrábidaShopping | 29,238 | way/263679031 |
| 23 | Centro Comercial Maia Jardim | 28,886 | way/151727431 |
| 24 | Espaço Guimarães | 27,582 | way/278962795 |
| 25 | Grocenter | 27,225 | way/384435544 |
| 26 | Parque Atlântico | 26,157 | way/125963677 |
| 27 | Centro Comercial Pingo Doce Bela Vista | 26,078 | way/99179010 |
| 28 | Aveiro Retail Park | 25,924 | way/144328139 |
| 29 | Alegro Castelo Branco | 24,529 | way/186473680 |
| 30 | Galeria Comercial Auchan Maia | 23,954 | way/160345577 |

Area is the OSM outline, which includes car parks for some (retail parks,
hypermarket galleries); it ranks size, it doesn't measure tenants.

## Not covered

- Centres OSM doesn't tag `shop=mall` are missing from section 2.
- Section 1 checks 32 POI types; a unit of another type without a floor
  wouldn't be counted.
- Nothing was decided about which centres to reconcile next.

Centre names, coordinates and outlines in section 2 and the CSV are from
© OpenStreetMap contributors (ODbL).
