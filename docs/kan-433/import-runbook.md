# KAN-433 — Foursquare tourism import: runbook

`cloudflare/extraction/import_foursquare_tourism.py` recovers the Tier 1
tourism leaves of the Foursquare OS Places archive as `curated_poi` rows.
Dry run by default; `--emit` writes. Nothing is ever updated or deleted.

Owner decisions it implements: the leaf → type table and the dedupe
contract in Jira KAN-433 (comments of 2026-09-18), as data in
`docs/kan-433/leaf-type-map.json`. Edit the JSON, not the script.

## What a row becomes

One `curated_poi` row, shaped like a moderator-approved place (the Worker's
own insert in `src/index.ts`) plus the KAN-452 provenance columns:

| column | value |
|---|---|
| `poi_id` | `fsq:<fsq_place_id>` |
| `source` | `community` |
| `name`, `dedupe_name` | the archive name, `normalize_text` of it (a `poi_source_correction` `name_override` wins) |
| `lat`, `lng`, `geohash` | archive coordinates, `encode_geohash(lat, lng, 7)` |
| `primary_poi_type` | the first type of the first matching rule in the map |
| `address` | `address, locality` from the archive, or NULL |
| `status` | `active` |
| `created_at`/`updated_at`, `created_by`/`updated_by` | `imported_at`, `kan-433` |
| `origin_source`, `origin_id`, `origin_licence` | `foursquare_os_places`, the fsq id, `Apache-2.0` |
| `imported_at`, `import_run_id` | the run's timestamp and `--run-id` |

A row with a second type (Monastery, Shrine, Temple, or a row carrying two
mapped leaves) gets one `curated_poi_attribute` row, `dimension = poi_type`,
`value = <second type>`.

**Why an attribute:** `curated_poi` has one `primary_poi_type` and there is
no `curated_poi_type` table (Overture has `overture_poi_type`; curated never
needed one). The Worker on this branch serves the second type: the curated
branch of `queryNearbyPoiDb` (`src/index.ts`) matches a requested type
against `primary_poi_type` **or** a `poi_type` attribute, the way
`overture_poi_type` gives an Overture row several types. A Monastery is
returned for a `church` request and for a `historical_landmark` request,
once each, with `primary_poi_type` unchanged on the wire and the `poi_type`
attribute kept out of `attributes` (`src/__tests__/curatedSecondType.test.ts`).
**Second types are served once this Worker change is deployed** — so deploy
before `--emit`, or accept that the 244 two-type rows answer only their
primary type until the deploy.

## Dedupe, exactly

Against everything served — Overture promoted rows (decided with the
committed overrides, as the preflight does), active `curated_poi` rows, and
MULTIBANCO — type-blind:

1. **Matched** = KAN-388 `names_match` within 75 m. Skipped.
2. **Suspect** = same or near-same name 75–400 m away (`name_similarity ≥
   0.9`: equal, containment, or the same identity terms reordered).
   Skipped as a likely stale coordinate. The matcher's fuzzy
   `SequenceMatcher ≥ 0.72` rung is *not* used at this distance: at 300 m
   it calls "Castelo de Guimarães" and "Liceu de Guimarães" one place. Rows
   that only that rung would have flagged are imported and listed in the
   report under "Fuzzy far names" as a look-list.
3. **Matched (translated)** = landmark rows only (`TRANSLATED_TYPES`),
   against a served landmark (never a business) within **25 m**: each
   token of both normalised names is mapped through the country's table in
   `docs/kan-433/landmark-terms.json` (canonical English, accent-
   insensitive; `mosteiro → monastery`, `castelo → castle`, …), function
   words (`de/da/do/dos/das/of/the/…`) are dropped, tokens sorted, and the
   matcher's strong rungs decide (`name_similarity ≥ 0.9`: equal,
   containment, same identity terms). Its fuzzy rung is deliberately not
   used here — on translated names it paired a church with a beach. So
   "Mosteiro dos Jerónimos" is "Jerónimos Monastery" at 12 m, and is not at
   80 m: translation never widens the 75 m rule. **The term file is the
   thing to extend per country** — add an `es`/`fr` object and a
   `countries` entry; a country without a table gets no translation step.
4. Different names at the same point: all imported. Distance alone never
   skips.
5. Inside the batch: two archive rows whose names match within 75 m are
   one place; the lower fsq id is kept and the other's types are folded
   into it.
6. Also skipped, reported separately: no coordinates; empty name; a
   `poi_source_correction` with `visible = 0` on the fsq id; "weak names"
   (only type words — "Castelo" — or only the town), which the contract did
   not mention and the owner can flip.

## Prerequisites for `--emit`

1. **Migration 0042 applied to production.** The migration tracker is not
   in use, so check by querying:

   ```
   cd cloudflare
   npx wrangler d1 execute brush-poi-registry --remote --json \
     --command "PRAGMA table_info(curated_poi)" | grep -c origin_
   ```

   Expect `3` (`origin_source`, `origin_id`, `origin_licence`; plus
   `imported_at`, `import_run_id` in the full list). Then the index, which a
   `--file` run that stopped halfway can have left out:

   ```
   npx wrangler d1 execute brush-poi-registry --remote --json \
     --command "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_curated_poi_origin'"
   ```

   Expect one row. Either missing means apply it (the file is guarded, so
   re-running it is safe):

   ```
   npx wrangler d1 execute brush-poi-registry --remote --file migrations/0042_curated_poi_provenance.sql
   ```

   The importer refuses `--emit` on its own if any column or the index is
   missing, before any write, naming what is absent.
2. **Deploy the Worker from this branch** (`cd cloudflare && npx wrangler
   deploy`) so the second type is served. Rows are served by their primary
   type by the existing Worker regardless.
3. The dry-run report for the run has been read and the owner said go.

## The commands

Dry run (what the committed report was made with; `--imported-at` pins the
timestamp so two runs diff clean):

```
cd cloudflare/extraction
BRUSH_TYPE_RELATION=sql python3 import_foursquare_tourism.py \
  --archive-key country-sources-unfiltered/PT/4ac4b7ca-6e8d-4e49-92b1-28f3a15e10ca.csv \
  --overture-key overture-country-sources/PT/1ea48e22-9b0d-47a2-beb7-29f5203bc204.csv \
  --tier 1 --run-id kan433-pt-tier1-<YYYYMMDD> \
  --report-out ../../docs/kan-433/import-PT-kan433-pt-tier1-<YYYYMMDD>-dry-run.md \
  --sql-out ../../outputs/kan-433/import-PT-tier1.sql
```

Without `--archive-csv` / `--overture-csv` the two R2 objects are fetched
once into `outputs/kan-433/` (gitignored) under key-bound names. Local
copies can be passed instead. D1 reads during a dry run: active curated
rows (one read), Foursquare-keyed corrections (one read), MULTIBANCO
distinct names (one read) and, only if a candidate name could match one,
those rows in ≤150-name lists.

Emit — same arguments plus the two assertions:

```
BRUSH_TYPE_RELATION=sql python3 import_foursquare_tourism.py \
  --archive-key country-sources-unfiltered/PT/4ac4b7ca-6e8d-4e49-92b1-28f3a15e10ca.csv \
  --overture-key overture-country-sources/PT/1ea48e22-9b0d-47a2-beb7-29f5203bc204.csv \
  --tier 1 --run-id kan433-pt-tier1-<YYYYMMDD> \
  --report-out ../../docs/kan-433/import-PT-kan433-pt-tier1-<YYYYMMDD>.md \
  --emit --i-have-applied-0042
```

It re-plans against the live base, then sends one bounded statement per
D1 request (`MAX_STATEMENT_BYTES` = 80,000, ≤ 500 values each; 48
statements for the PT dry run), never a batch. Transient failures are
retried three times — safe, every statement is idempotent — and a 429
stops the run. The report it writes says `EMITTED` and the D1 change count.
Inside the extraction container (`D1_INTERNAL=1`) the same statements go
through `d1_client.execute`.

## Verifying afterwards

Through the endpoint, never by SQL counts. `API_KEY` is in
`cloudflare/.dev.vars`.

```
for point in "38.6979 -9.2067 historical_landmark" "41.4478 -8.2905 historical_landmark" "39.6594 -8.8256 historical_landmark"; do
  set -- $point
  curl -s -X POST https://poi-api.brushaway.app/poi/nearby \
    -H "X-Api-Key: $API_KEY" -H 'User-Agent: curl/8.0' -H 'Content-Type: application/json' \
    -d "{\"lat\": $1, \"lng\": $2, \"radiusMeters\": 400, \"types\": [\"$3\"]}" \
    | python3 -c 'import json,sys; [print(p["source"], p["poi_id"], p["name"], p["primary_poi_type"], p.get("distanceMeters")) for p in json.load(sys.stdin)["pois"]]'
  echo
done
```

Expected, from the dry run:

- **Mosteiro dos Jerónimos 38.6979, -9.2067** — no `fsq:` "Mosteiro dos
  Jerónimos": `fsq:4b7a8c17f964a520a5302fe3` is skipped as *matched
  (translated)* to Overture's "Jerónimos Monastery" (`ee495395-…`, 12 m),
  which is what appears. `fsq:5e14cb44a5504400086f956f` "Mosteiro De Santa
  Maria De Belém" — the same monastery under its formal name, ~100 m away —
  does import: beyond 25 m and not a translation of the name. It is on the
  curation look-list.
- **Castelo de Guimarães 41.4478, -8.2905** — `fsq:4ccda20c511b236a1480f8c9`
  "Castelo de Guimarães" appears alongside Overture's "Guimarães Castle":
  the two pins are more than 25 m apart, so the translation step does not
  pair them (it never widens the distance). Look-list.
- **Mosteiro da Batalha 39.6594, -8.8256** — the monastery itself is
  Overture's (`a972be13-…`), so no `fsq:` row of that name appears; the
  Foursquare-only `fsq:51f40813498e7ae2d9576515` "Capelas Imperfeitas do
  Mosteiro da Batalha" does.

A two-type check (after the Worker deploy): pick any imported Monastery
from the report's sample — e.g. `fsq:4dfdd7efc65b31579b33110a` "Mosteiro de
Rendufe" 41.63583, -8.40548 — a `church` request and a
`historical_landmark` request there must each return it once, with
`primary_poi_type = historical_landmark`.

## Emitted (2026-09-20, PT Tier 1)

Run `kan433-pt-tier1-20260920`: **9,498 curated rows** (9,790 D1 changes
with the second-type attributes), 48 statements over two attempts — the
first died at 1/48 on wrangler's progress preamble in `--json` output
(`wrangler_json()` now strips it); the statement had applied, and the
second attempt re-planned it as matched. Re-run `…-rerun`: 0 would insert,
0 changes. Endpoint: Jerónimos, Guimarães and Batalha as predicted below
(Batalha's "Capelas Imperfeitas do Mosteiro da Batalha" is matched to
Overture's "Capelas Imperfeitas" by containment, so it does not appear);
Mosteiro de Rendufe answers both `church` and `historical_landmark` once
each with `primary_poi_type = historical_landmark`. Report:
`import-PT-kan433-pt-tier1-20260920.md` (+ 500-row `.sample.jsonl`).

## Idempotency proof

Run the emit command a second time with a new `--run-id`. The report says
`Emitted: 0 D1 change(s)` and the log prints `0 change(s)` for every
statement: the `ON CONFLICT (origin_source, origin_id) … DO NOTHING` target
is migration 0042's partial unique index. The committed unit test
(`SqlShapeTest.test_statements_are_idempotent_against_the_0042_index`)
proves the same against the committed `schema.sql` in sqlite.

## After the import

Re-run the KAN-453 preflight (`--by-leaf`): every imported row must now
land in *matched*, and each Tier 1 leaf's *unique* count must drop to the
skips this run reported. That is the measured duplicate-rate check the
ticket's acceptance asks for.
