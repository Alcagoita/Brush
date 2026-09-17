# KAN-450 — On-demand Places build from Overture

## What was wrong

`POST /coverage/request` promoted a Place to `mapping` and started the
extraction Container in `MODE=place`, which ran the Foursquare loader:
Nominatim bbox → Foursquare Iceberg pull on a hand-renewed JWT →
`classify_and_load` → `INSERT INTO poi` → OSM supplement → a
Foursquare-shaped SQLite export → `build_complete`.

Since KAN-438 `/poi/nearby` reads `overture_poi`, `legacy_poi`, community
and Multibanco. It does not read `poi` — nor `osm_poi`, which KAN-438
retired from serving (the per-Place OSM supplement still writes there; see
the KAN-451 audit note). An on-demand Place
therefore spent a Foursquare pull on rows nobody served, reported `mapped`
with an extent that blocked re-mapping, and gave the user the OSM supplement
only. The Trip Planner's download (`/export/<placeId>`) was the old
Foursquare snapshot, or a 404 for a Place that only existed through Overture.

## The Place build now

`cloudflare/extraction/overture_place.py`, wired as `run_job.run_place`:

1. one Nominatim `/lookup` for the bbox **and** the country
   (`nominatim_client.lookup_place`);
2. `extract_overture.extract_bbox(..., country=…)` — the bbox pull filtered
   on `addresses[].country`, so Elvas does not import Badajoz; unfiltered,
   with a log line, when Nominatim gives no country;
3. raw CSV archived to R2 as `overture-place-sources/<place_id>/<build_id>.csv`
   — this key is the row's `country_source_r2_key`, and the key
   `overtureCandidateOverrides.json` is indexed by, so reviewed overrides
   apply to a Place build exactly as to a country build;
4. `build_log` row opened with `source = 'overture_places'`;
5. `load_overture_candidates.load` + `promote_overture_candidates.run_country`
   scoped to that key — the same decision code, chain rules and evidence
   batches as the country run;
6. the per-Place OSM supplement, unchanged (KAN-394; never fails the Place);
7. the **Overture export** (below) uploaded to
   `exports/<place_id>/<build_id>.sqlite`, where `/export/` already looks;
8. `build_complete` with the extent of the rows actually served.

Failure contract unchanged: `place-failed` before the build_log row exists,
`build_complete{status:'failed'}` after (`worker_client.build_failed`); the
Worker resets a never-mapped Place to `none`.

The Worker's `triggerBuild('place')` passes `D1_INTERNAL=1` and no
`FOURSQUARE_JWT`. The legacy country modes keep the JWT; `map_place` (the
Foursquare loader) stays in `run_job.py` for them and for nothing else.

## The export contract (what KAN-451 reads)

One SQLite file per Place and build:

| table | columns |
|---|---|
| `poi` | `overture_id` PK, `name`, `lat`, `lng`, `primary_poi_type`, `brand`, `address`, `open_min`, `close_min` |
| `poi_type` | `overture_id`, `poi_type`, `rank` — PK (`overture_id`, `poi_type`); index on `poi_type` |
| `poi_attribute` | `overture_id`, `dimension`, `value` — dimensions `store_kind`, `food_cuisine`, `financial_service_kind` |
| `_export_meta` | `place_id`, `build_id`, `generated_at`, `pipeline_version` (`overture-export-v1`), `source` (`overture_places`), `row_count` |

Rows are what `/poi` serves inside the Place's bbox at build time, read from
`overture_poi` and its type/attribute tables in ≤150-id chunks. The id
column is `overture_id`, not `fsq_place_id`: the app records provenance per
source, and an Overture id in a column named for Foursquare is how that gets
lost.

After a country run, `export_country_places` writes the same export for
every mapped settlement of the country, keyed `<run_id>-<place_id>`, so PT
towns stop serving the Foursquare snapshot. A settlement whose export fails
is logged and stays on its previous build; the rows are already served.

## Not in this ticket

The app side — reading this shape, storing `overture_id` in the habitat
cache, dropping `fsq_place_id` from the API type, attribution — is KAN-451.
Generalising the Overture *country* import beyond the hard-coded `PT` is
its own ticket.
