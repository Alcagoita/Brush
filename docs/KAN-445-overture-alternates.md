# KAN-445 — Can Overture's alternate categories type the generic-shopping residual?

**No, not on their own.** They are populated — 63% of the residual carries at
least one — but the most common value is a Meta taxonomy artifact with ~14%
precision, and the believable values sit around 50%. That is corroboration
strength, not evidence strength. KAN-446 should be the evidence join, with
alternates as an optional tie-breaker at the ladder's low rungs, not a new
extraction path.

## What was measured

Overture release `2026-08-19.0` — the one `extract_overture.py` pins — queried
by DuckDB directly from the public parquet for the 5,234 ids in
`docs/kan-444/decision-manifest.tsv`. All 5,234 found. Query in
`cloudflare/extraction/measure_overture_alternates.py`.

Columns read that the extractor drops: `categories.alternate`,
`brand.names.primary`, `websites`, `socials`.

| | unresolved (4,681) | resolved (553) |
| --- | ---: | ---: |
| any alternate category | 2,944 (62.9%) | 358 (64.7%) |
| alternate maps to a reachable type | 2,428 (51.9%) | 321 (58.0%) |
| `brand` present | 93 (2.0%) | 20 (3.6%) |
| `brand` in our dictionary | 0 | 0 |
| website or social present | 100% | 100% |

The second row is the headline that does not survive inspection.

## Why 51.9% is not real

The 553 rows Foursquare and OSM resolved are a control: where an alternate
exists on one of those rows, we know what the place actually is. Measured at
store-kind level:

| alternate | n | precision |
| --- | ---: | ---: |
| `furniture_store` | 128 | **14%** |
| `clothing_store` | 38 | 50% |
| `flowers_and_gifts_shop` | 13 | 0% |
| `arts_and_crafts` | 12 | 50% |
| `fashion_accessories_store` | 11 | 0% |
| `grocery_store` | 9 | 56% |
| `fashion` | 9 | 0% |
| `womens_clothing_store` | 9 | 0% |
| `bar` | 8 | 0% |
| `hardware_store` | 7 | 57% |
| `electronics` | 7 | 100% |
| `department_store` | 6 | 0% |
| `sporting_goods` | 6 | 33% |
| `childrens_clothing_store` | 6 | 33% |
| `eyewear_and_optician` | 5 | 100% |
| `bicycle_shop` | 5 | 100% |
| `shoe_store` | 5 | 100% |
| `home_improvement_store` | 5 | 20% |

Precision is "the app's own mapping for this alternate names the same
`poi_type` and `store_kind` the evidence did", with `home` and `furniture`
treated as one department. That is the strict test, because it is the mapping
that would actually be applied. `womens_clothing_store` scores 0% not because
those shops are not clothing shops but because the mapping resolves it to
`womens_clothing` while the evidence said `clothing` — which is itself a reason
not to trust an alternate to pick the finer kind.

`furniture_store` is 1,066 of the 4,681 unresolved rows — 23% of the tail —
and every one of the 524 rows where it is the *only* alternate is
Meta-sourced. Its control rows resolved to clothing, discount, gift, hardware
and electronics far more often than to home. The names say the same:
`Oviqueijo`, `Mini Mercado Egas Moniz`, `Açorjardim`, `Romaclassic Músic` are
all tagged `furniture_store`. It is what a Facebook Page category like "Home
& Garden" or a generic retail bucket becomes in Overture's taxonomy, and it
must never be read as evidence.

`bar` and `fashion_accessories_store` are noise on the same test.

A first control at `poi_type` level reported 253 agree / 33 disagree. That was
the wrong granularity: nearly every retail alternate maps to `poi_type =
store`, so it agreed with itself. The kind-level table above is the control
that means something.

## What is usable

Taking only alternates with n ≥ 5 and precision ≥ 50% in the control —
`clothing_store`, `arts_and_crafts`, `grocery_store`, `hardware_store`,
`electronics`, `eyewear_and_optician`, `bicycle_shop`, `shoe_store` — and
refusing any row that also carries `furniture_store`: on the order of **400
of 4,681 unresolved rows**. Auto-assigning them would be wrong about half the time,
which is far below the bar KAN-444's ladder holds (95%+ on spot checks) and
below what `verified_subtype` is allowed to mean.

Where they *are* worth something is as corroboration. The ladder's lowest rung
accepts a 0.55 name score inside 25 m; an alternate that agrees with such a
match is a second, independent signal and could justify accepting a rung the
name alone would not. That is a KAN-446 design input worth tens of rows, not a
change to what we extract.

## Brand, websites, socials

`brand` is present on 2% and none are in our dictionary — no help.

Every Meta-sourced row carries a website or social, which is to say every one
has a Facebook Page. That is a real potential source and it is explicitly not
this ticket: fetching it is a licensing and rate question, and one that would
need its own decision before anyone writes a line of it.

## Recommendation for KAN-446

Build the evidence join as the import stage, unchanged from KAN-444. Do not
change `extract_overture.py` to pull alternates as a typing source. Optionally
carry `categories.alternate` through as a corroboration column the ladder can
consult at its low rungs, with `furniture_store`, `bar`, `home_and_garden` and
`fashion_accessories_store` on a deny list from the start. Expected effect:
modest, positive, and measurable against the same control.
