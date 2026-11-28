# KAN-461 — Final OSM import as a container job (sketch, for approval)

The last part of the ticket: OSM places Overture lacks, for the app types not
already imported here, written area by area in Cloudflare — the same job
skeleton as the landmark cleanup (`landmark_cleanup_run` / `_scope`, batches of
10 areas, lease, cron, job version check, pilot of N areas, report per area in
R2).

## What we hold

`archives/openstreetmap/2026-09-03/osm-poi.sql` (R2, 38 MB) — the August 2026
OSM supplement (Overpass), 74,936 named places already typed to app types:

| already imported in KAN-461 | still to import | never |
|---|---|---|
| café 8,900 · bakery 1,423 · park 2,308 (+ landmarks from the Geofabrik extract) | store 27,064 · restaurant 10,099 · gas 3,211 · bar 2,671 · supermarket 2,379 · clinic 2,161 · bank 1,624 · pharmacy 1,311 · laundry 923 · butcher 919 · post 822 · hairdresser 707 · gym 579 · florist 389 · library 291 · barber 264 · fishmonger 197 · tattoo 80 · smaller ≈ 90 | school 6,188 (trust rules) · atm 340 (MULTIBANCO owns ATMs) |

About 56,000 candidates. Landmark and nature types are not in this archive
(they came from the Geofabrik extract and are done).

**What it lacks: freshness.** No edit date or `check_date` per element, so the
"too old to trust" rule — the reason Foursquare businesses were dropped —
cannot be applied from it. The Geofabrik extract has both (it was used for the
cafés), but our copy is gone; a new one would be downloaded by the container
straight into R2, never to a laptop — owner's call.

## The filter, per candidate, before anything is written

| verdict | meaning | action |
|---|---|---|
| **red** | the same place is already served (Overture, curated, MULTIBANCO): same name — brand-aware, the food core-name rule — close by | not written, nothing recorded |
| **yellow** | maybe served: a similar name nearby, or a same-type row too close to call | written to `osm_import_hold`, not served |
| **green** | nothing like it is served | written to `curated_poi` (origin `openstreetmap`, ODbL, run id per area) |

Also before the verdict: the rejection list (already in the SQL), places OSM
marks as closed, inside a reconciled mall (manual only), and — if the
Geofabrik source is used — elements not edited or checked since a cutoff.

## Order

1. Owner picks the source (archive as is, or a fresh Geofabrik extract into R2)
   and the types (all of the above, or institutions first: bank, post,
   pharmacy, gas, supermarket, clinic, library — Overture's weak spot outside
   cities, KAN-422).
2. Rules for the non-landmark families as tests (brand-aware for chains, the
   food core-name rule for restaurants/bars), on one area.
3. Dry run in Cloudflare → sample with the owner → emit, area by area.
