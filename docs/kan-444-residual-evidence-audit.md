# KAN-444 — Portugal generic-shopping residual evidence audit

Every remaining Portugal Overture `shopping` row now carries a terminal audit
decision. This records what settled them, what did not, and why the outcome is
what it is rather than what the ticket originally assumed.

## Result

Against the 4,511 residual rows KAN-432 had not already reviewed:

| Decision | Rows | Share |
| --- | ---: | ---: |
| `verified_subtype` | 355 | 7.9% |
| `excluded` | 50 | 1.1% |
| `insufficient_evidence` | 4,106 | 91.0% |

Resolved by source: OSM 218, Foursquare 187. The 405 resolved rows became 52
exact-ID batches in `overtureCandidateOverrides.json`, all 405 verified as
acceptable by `promote_overture_candidates.decide()` before commit.

## The match rule, and why it is not a flat threshold

A single similarity threshold at a single radius wastes both signals, because
distance and name agreement trade off against each other. `Artipel cork` and
`artipel` twelve metres apart are the same shop at a score that would be
meaningless a street away; `A. Ribeiro Andrade` and `ar andrade` at five metres
likewise. A flat 0.85 threshold discarded both.

The ladder accepts a match at 0.55 within 25 m, 0.70 within 75 m, and 0.85
within 150 m. Beyond 150 m nothing is auto-assigned however well the names
agree, and an exact name still has to be inside 150 m. This recovered 96 rows
the flat rule threw away — a 31% improvement on identical source data.

Its one failure mode is names that share only a toponym, which the looser rungs
would otherwise take: `Capri Lovers Bombarral` against `optica bombarral`, or
`Opticalia Santo Tirso` against `multiopticas santo tirso` — two different
chains agreeing at 0.80 on the town alone. Every row carries its locality, so a
match whose shared words are all inside the locality name is refused.

## Sources

**Foursquare** — `country-sources-unfiltered/PT/4ac4b7ca-6e8d-4e49-92b1-28f3a15e10ca.csv`,
396,749 rows, sha256 `82b04934657742e497ba7832a8fab81aa09fb4703958b63cd3e92fa25ab33b98`,
dated 2026-08-20. Verified as the full national snapshot, not the `legacy_poi`
fallback: 99.9% carry coordinates and 93.0% carry categories. The filtered
`country-sources/` namespace is empty, so no biased alternative was available
to pick by mistake.

**OSM** — Geofabrik `portugal-latest.osm.pbf`, 422 MB, dated 2026-09-10.
79,240 named, located features inside the retail contract; 10,940 in-contract
features were skipped as unnamed, which is recorded rather than hidden because
name is the only thing the join matches on.

Tag contract `kan-444-retail-v1`, in `fetch_osm_retail_tiles.py` and reused by
the PBF extractor so one definition governs both. `shop=*` alone is not "all
stores" and is not claimed to be: the contract also takes `craft=*`,
`healthcare=*`, seven retail `amenity` values, and — as exclusion evidence —
`office=*` and five practice/education `amenity` values. Per-family counts are
in `kan-444/osm-coverage-report.json`.

## Why Overpass was abandoned

The first design fetched only the ~935 map tiles containing an unresolved row,
which is targeted rather than a country sweep. Public Overpass returned HTTP 429
after two tiles. CLAUDE.md treats a 429 as stop, so the run halted itself.

A Geofabrik country extract is the same ODbL data, one download instead of ~900
requests against a volunteer-run server, and was fresher than the Foursquare
snapshot. `fetch_osm_retail_tiles.py` is kept for the targeted case — a handful
of rows, where a country download would be absurd — and still checkpoints per
tile so an interrupted run resumes.

## Why 91% is the honest answer

The residual is not unresolved for want of effort on the join. It is unresolved
because the places are not in either source, and because their names carry no
recoverable signal:

* Most remaining rows have no OSM retail feature within 400 m sharing their
  name, having already had no Foursquare match on the same test. Spot checks
  confirm absence: the nearest features at 4–90 m are unrelated businesses.
* 4,299 distinct names across the tail. Only 42 names repeat at all, so brand
  clustering — the technique that drained KAN-432 — has nothing left to grip.
* 24.2% are single opaque tokens (`abgt`, `4umans`, `7rabbits`).
* `loja/casa/comércio de X` head-noun extraction covers 4.5% of rows, and the
  heads are mostly personal names (`da Ana`, `do Zé`), not products.

`insufficient_evidence` is a terminal state, not a backlog. Each such row keeps
its exact ID, the sources searched, the radius, and the nearest rejected
candidate, so a future source can be tested against it without redoing this.

## What a provider category is not allowed to settle

A category is never a match prerequisite and never a rejection criterion — it is
missing on 7% of Foursquare rows and inconsistent on more. It is read only after
a match on name and location.

A provider's own generic bucket resolves nothing, because it is exactly as
generic as the `shopping` category being resolved: Foursquare `Retail`,
`Miscellaneous Store`, `Shopping Mall`, `Department Store`, and OSM `shop=yes`,
`shop=general`, `shop=department_store`. An early pass counted 250 `Retail`
matches as wins; they were not, and the rule that excludes them is now a test.

A mapping is also refused when its `poi_type` is not *reachable*. `convenience`,
`car`, `car_repair`, `mall` and `alcohol` all exist in `poiTypeCategories.json`
but the app cannot surface them, so an override naming one would be a batch that
can never be applied. Those rows stay unresolved instead.

## Files

* `cloudflare/extraction/match_residual_foursquare.py` — first pass
* `cloudflare/extraction/extract_osm_retail_pbf.py` — OSM contract extraction
* `cloudflare/extraction/fetch_osm_retail_tiles.py` — targeted Overpass path and the contract
* `cloudflare/extraction/match_residual_osm.py` — second pass and manifest merge
* `cloudflare/extraction/apply_kan444_decisions.py` — manifest to exact-ID batches
* `docs/kan-444/decision-manifest.tsv` — every row, decision, and evidence
* `docs/kan-444/osm-coverage-report.json` — tag-family coverage

The Worker gained `GET /internal/r2/list` — internally authenticated, paginated,
metadata-only, prefix-allowlisted — because `wrangler r2 object` cannot
enumerate keys and the Foursquare backup's key was recorded nowhere.
