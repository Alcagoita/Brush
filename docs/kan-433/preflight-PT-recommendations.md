## Reading the numbers

Three things the counts above do not say on their own.

**"Matched" undercounts duplicates for outdoor features.** The KAN-388 matcher
was measured on shops, at 75 m. Viewpoints, trails and harbours are geocoded
loosely by both sources — a "Miradouro do Castelo" 180 m from Overture's
"Miradouro do Castelo" is the same lookout — so the *same name beyond the
matcher radius* suspects (viewpoint 130, plaza 109, marina 51, surf_spot 50,
hiking_area 49, bridge 39) are mostly duplicates the matcher's radius is too
tight to see. KAN-433 should treat that bucket as *skip*, not as *import*,
and not loosen the matcher to reach it: the KAN-444 ladder already showed that
a wider radius needs a shared distinctive word, and this preflight applies
that guard to the far bucket already.

**The landmark family is wide on purpose, and it has a known false positive.**
A viewpoint matched to an Overture `church` (25), an island to `Igreja Matriz
do Corvo`, a surf spot to a `beach` (47): the first two are a chapel or church
*named after* the place, which the app would show once either way; the last
is a real question — Overture serves the beach, not a surf spot, and a
"go surfing" task tagged `surf_spot` will not find a `beach` row. Those 47 are
listed under `surf_spot` and need a decision, not an import rule.

**"Unique" is not "real".** The 30-row samples are the point of this report:
each type's unique bucket carries a visible share of things that are not
places of that type (a cave under `viewpoint`, kids' play centres under
`tourist_attraction`, streets and villages under `plaza`, surf schools and
`Zarautz` — in Spain — under `surf_spot`, `Fars Iran` and `Relax` under
`island`). The suspect rules catch the mechanical cases (no name signal,
toponym, shared coordinates); they cannot catch a wrong-but-plausible name.
Import of any type below means import of its unique bucket *with* the
hand-check the sample shows is needed.

## Findings the ticket did not anticipate

1. **`category_ids.py` extracts on `also` ids that `classify_and_load.py`
   never classifies.** `build_reverse_map` reads only the primary
   `category_id`. For this list it matters twice: `botanical_garden` has 34
   archive rows by its own leaf and **1,102 more** carrying only `Garden` /
   `Sculpture Garden` (the "776 botanical gardens" of the provisional gap
   list was this), and `plaza` has 117 `Pedestrian Plaza`-only rows. Those
   1,219 rows were extracted, then skipped as untyped. Whether `Garden`
   should be `botanical_garden`, `park`, or nothing is a mapping decision
   that precedes any import.
2. **Foursquare's `Attraction` is not a tourist attraction.** Its full path is
   `Arts and Entertainment > Amusement Park > Attraction`: the 97 rows are
   bumper cars, indoor play centres, Gymboree, a ferris wheel. Ten of them
   match Overture `amusement_park`/`park`/`zoo` rows. The `tourist_attraction`
   "hard gap" (0 in Overture) is a mapping error on our side, not a gap.
3. **The "377 mosques" did not come from this archive.** The archive holds
   17 rows under `Mosque`; the classifier produces 17 mosques from it. The
   number must have come from another source or an earlier name rule; there
   is nothing to recover and nothing to let go here.
4. **443 of the archive's bank rows carry a brand that stopped trading
   between 2011 and 2018** (Banif, BES, BPN, Finibanco, Barclays, Banco
   Popular, Deutsche Bank retail). `brandDictionary.json` folds each into its
   successor, so an importer would silently create a "Santander" from a
   2014 BANIF check-in. That is the clearest sign that the archive's bank
   layer is a decade old: Portuguese banks closed roughly four in ten
   branches over the same period, and a row with no served counterpart is
   as likely to be a closed branch as a missing one.
5. **`poi_source_correction` has five Foursquare-keyed rows, none in a
   candidate type.** All are `visible = 0` from the KAN-386 OSM replacement
   work. KAN-433 has nothing to re-point; they stay as the record of a past
   decision. Any importer should still honour them as a skip-list.
6. **Curated rows of the candidate types: 3.** The curated layer is not a
   factor for these types today.

## Recommendation per type

| type | archive | unique | recommendation |
|---|---:|---:|---|
| `viewpoint` | 1,585 | 989 | **Import**, after skipping the 130 far same-name rows and the 44 no-signal rows. This is the one genuine hard gap: Overture has no viewpoint category and files the ones it has as `historical_landmark`/`mountain`. The unique sample is overwhelmingly real "Miradouro de …" names with a small tail of noise (a cave, a geodetic marker, a private "spot"). Expect to hand-drop roughly one in ten. |
| `tourist_attraction` | 97 | 76 | **Do not import.** Wrong leaf — see finding 2. If the app wants an "attraction" type, it needs a different source and a different definition. |
| `hiking_area` | 583 | 415 | **Import**, with the far bucket skipped. Overture already serves 198 trails and matched 75 of ours; the unique rows are PR-coded trails, levadas and passadiços that Overture lacks. Noise is campsites, cycle paths and one Dutch sentence — visible in the sample, hand-droppable. |
| `plaza` | 1,132 | 555 | **Needs a closer look.** The rows are mostly real squares (Largo/Praça/Terreiro), so the "1,000 plazas" are not a classifier artefact — Foursquare users check in at squares. The question is whether a plaza is an errand place at all: Overture serves 491 already, matched 286 of ours, and the unique sample is one-third streets, roundabouts, car parks and villages. If plazas stay a taggable type, import only names beginning with a square word (praça, largo, terreiro, rossio, campo) and skip the rest. |
| `botanical_garden` | 34 | 16 | **Import the 16**, and decide the `Garden` mapping first (finding 1). 1,102 gardens sit untyped in the archive; most are municipal gardens Overture serves as `park`. |
| `bridge` | 355 | 203 | **Import**, far bucket skipped. Real bridges, thirteen "Ponte Romana" among them — those are distinct places and the distance keeps them apart. |
| `marina` | 336 | 223 | **Import with care.** Foursquare's leaf is "Harbor or Marina": fishing ports, docks and quays alongside marinas. The unique rows are real waterfront places; whether a fishing port answers a `marina` task is the app's call. The 18 "same name as a served place of another kind" rows are restaurants and clubs named after the harbour — skip. |
| `surf_spot` | 343 | 161 | **Needs a closer look.** Two things are tangled: 47 surf spots Overture serves as `beach` (decision: is a served beach enough?), and a unique bucket that is half surf *schools* and camps (businesses, some with no fixed spot) plus `Atlantic Ocean` ×3 and `Zarautz` ×2. If imported, restrict to names that are beaches or breaks, not schools. |
| `lighthouse` | 138 | 67 | **Import.** Overture has 35 of ours; the unique rows are "Farol de …" names. Small, clean. |
| `waterfall` | 102 | 72 | **Import.** Clean names (cascata, poço), Overture thin. |
| `hot_spring` | 90 | 68 | **Needs a closer look.** The leaf is used for mineral-water springs (`Fonte …`) and for the spa companies that run them (`Sociedade das Termas de Monchique II`, `Empresa das Águas …`). Perhaps twenty are hot springs a person can visit. Hand-pick rather than import. |
| `island` | 67 | 49 | **Do not import as-is.** Half the unique bucket is not an island (`Fars Iran`, `Relax`, `Urbanização Campos Verdes`, `Ilha De Cash`); the real ones (Berlenga, Armona, São Miguel, Deserta) are a dozen and can be hand-entered as curated rows if the type is wanted. |
| `bank` | 3,771 | 1,876 | **Do not import blind.** The gap is real — rural branches of Montepio, CGD, BCP, BPI and Crédito Agrícola with no served counterpart — but the layer is stale (finding 4) and there is no way, from the archive alone, to tell a missing branch from a closed one. If KAN-433 imports banks, it should be brand-dictionary rows only, never a defunct name, and with an explicit "unverified since 2020" mark that KAN-458's OSM-fallback measurement or a branch-locator check can later clear. `atm` stays excluded; the 41 bank rows the classifier itself retypes to `atm` go with it. |

## What KAN-433 should carry from here

* Skip-list, in order: `poi_source_correction` Foursquare ids (5); every
  archive row in a *matched* bucket; every *same name beyond the matcher
  radius* row; every *defunct brand* row.
* Provenance on each curated row: `origin_source = foursquare_os_places`,
  `origin_id = fsq_place_id`, `origin_licence = Apache-2.0`, `import_run_id`
  = this report's run. The unique index from KAN-452 makes a re-run a no-op.
* Re-run this preflight after the import: every imported row must then land
  in *matched*, and the unique count for each imported type must drop to the
  hand-dropped noise and nothing else. That is the duplicate-rate check
  KAN-433's acceptance asks for, measured rather than assumed.
