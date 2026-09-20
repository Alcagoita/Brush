# Evidence join — one command per country

The generic-shopping tail Overture leaves in every country is resolved by one
local command, reviewed in a PR, and only then applied by promotion. Nothing
the command does reaches production before merge.

```
deterministic evidence generation locally → reviewed PR → deploy → promotion
```

Why it is shaped this way, and why 90%+ of a tail staying unresolved is the
honest outcome, is in `kan-444-residual-evidence-audit.md` and
`KAN-445-overture-alternates.md`. This page is only how to run it.

## Run it

Dry-run first. It resolves inputs, joins, prints counts, writes nothing.

```bash
export BRUSH_WORKER_URL=https://poi-api.brushaway.app
export BUILD_TRIGGER_SECRET=…          # cloudflare/.dev.vars
python3 cloudflare/extraction/run_evidence_join.py --country ES
```

It prints the newest Overture and Foursquare keys it found. Copy them — an
emitted run must name its inputs explicitly; it never chooses one silently.

First run for a country — no OSM archive exists yet:

```bash
python3 cloudflare/extraction/run_evidence_join.py --country ES --emit \
    --overture-key overture-country-sources/ES/<run>.csv \
    --source-key   country-sources-unfiltered/ES/<uuid>.csv
```

Without `--osm-key` the command downloads the Geofabrik PBF, extracts the
retail contract (needs `pip install osmium`; ~20 min for a large country),
pins it by URL, `Last-Modified` and SHA-256, and archives the extracted TSV
to `archives/osm-retail/ES/<run_id>.tsv` **before** writing the run
directory. That upload is the one write it makes. The manifest records the
key.

Every later run passes it and skips the PBF entirely:

```bash
python3 cloudflare/extraction/run_evidence_join.py --country ES --emit \
    --overture-key overture-country-sources/ES/<run>.csv \
    --source-key   country-sources-unfiltered/ES/<uuid>.csv \
    --osm-key      archives/osm-retail/ES/<run_id>.tsv
```

A run id is never reused: the command refuses to write over an existing
`docs/evidence/ES/<run_id>/`.

## What comes out

`docs/evidence/ES/<run_id>/`:

| file | what |
| --- | --- |
| `manifest.json` | every input pinned — R2 keys, SHA-256s, Geofabrik URL + `Last-Modified`, repo commit, config hash — and the SHA-256 of the three files below |
| `suggestions.jsonl` | every residual row, every candidate considered, tier, distance, similarity, and the decision |
| `overrides-draft.json` | only the decided rows, in `overtureCandidateOverrides.json` shape, batches named `evidence_<run_id>_<type>` |
| `residual-report.json` | counts by terminal state and by source |

## Review

Copy the batches from `overrides-draft.json` into
`cloudflare/src/overtureCandidateOverrides.json` under the country's Overture
key. Append; never touch an existing batch. Open a PR with the run directory
and the overrides change.

CI runs `validate_evidence_run.py` and refuses the PR if:

* any output file does not hash to what the manifest says
* any override id is missing from `suggestions.jsonl`, was
  `insufficient_evidence` there, or has no candidate evidence
* any id appears in two batches
* any override fails the real `promote_overture_candidates.decide()` —
  unreachable type, wrong store/kind shape
* the `evidence_<run_id>_*` batches in the overrides are not exactly the
  draft — an edited entry, an extra id, a batch that was never drafted
* any batch that existed on the base branch changed, except by a logged
  reversal

Read `suggestions.jsonl` for the rows you are approving. The reason column
says which source matched, at what distance, on what name agreement. A row
that only got there on the ladder's lowest rung (0.55 similarity inside 25 m)
is worth a second look; that rung is deliberately loose.

## After merge

Post the residual metric once the reviewed run is deployed. This is done by
CI or a deploy step, never by the local command, so the metric only ever
reflects a run a reviewer read:

```
POST /internal/overture-country/evidence-run
X-Build-Secret: …
{ countryCode, runId, manifestSha256, configSha256, toolCommit,
  residualRows, verifiedRows, excludedRows, insufficientRows, foursquareRows, osmRows }
```

Append-only, keyed on country + run id + manifest hash. A repost is a 409; a
different manifest is a new row. Counts and provenance only — the endpoint
refuses any other field.

## Withdrawing a decision

A reviewed decision can turn out wrong. Reproducing Portugal under this tool
found 33 of KAN-444's: a kiosk promoted as a pharmacy, `Ritual do Porto`
typed as an optician from a neighbour that shared only the town's name.

Withdrawing one is a change to a reviewed batch, which the validator
otherwise forbids, so it has to be said out loud. Remove the id from its
batch and add a line to `docs/evidence/reversals.jsonl`:

```json
{"source_key": "…", "batch": "kan444_store_gift", "overture_id": "…", "name": "…",
 "was": {"poi_type": "store", "store_kind": "gift"}, "reason": "…", "withdrawn_by": "KAN-446 …"}
```

The validator allows an id to leave a batch only with a matching line. It
never allows an id to be edited in place, or an old batch to gain ids: a
changed decision is a withdrawal plus a new batch, so both are visible.

## When the name already says what it is

The join is for places whose names say nothing. A chain — `Optivisão`,
`Opticalia` — is typed by the brand dictionary at promotion time, for every
branch in the country, and should never need an override. If a reviewed row
turns out to be a chain, the fix is a line in
`src/constants/storeSubtypeDictionary.json`, not an override entry; the
dictionary is in the config hash, so the next run records it.

## Reproducing a run

`--reaudit-prefix evidence_<run_id>_` puts a previous run's rows back into
the residual so the join can be re-run against them. Dry-run only; it cannot
be emitted. This is how Portugal was checked against KAN-444's decisions.

## What stays unresolved

Most of it. In Portugal, 91% — the places are in neither Foursquare nor OSM,
and their names carry no signal. Those rows stay `pending` in
`overture_candidate`: never served, never promoted, visible to whoever adds a
source later. What to do with them is a policy decision, made against the
residual metric, and is not this command's business.

## Refreshing a country on a new Overture release (KAN-456)

Overture publishes monthly; the base is pinned per run, not per deploy.
A refresh is **manual, on demand** (owner, 2026-09-20): no cron, no
automatic cadence until there is a reason for one. It is the same
`overture-country` run, re-queued for a `mapped` country, and it is an
upsert on the GERS id — never a second copy, never a delete.

### What a refresh does

| set | how it is found | what happens in production |
| --- | --- | --- |
| new | in the new archive, not the previous | staged `pending`, decided by the rules **and the reviewed overrides of every earlier archive of the country** |
| changed | in both, and name / coordinates / address / category differ | `overture_candidate` and the served `overture_poi` row take the new values; a **category** change puts the row back to `pending` (re-decided); a name/coordinate change alone keeps the decision |
| retired | in the previous archive, not the new | `overture_poi.retired_in_release = <release>`; nearby, the export and the moderation lookups skip it; types, attributes, overrides and the candidate row stay |
| re-listed | retired earlier, back in this release | the mark is cleared; served again with its reviewed decision |

The diff is computed locally from the two archived CSVs
(`refresh_overture_country.py`), the way the KAN-455 repromote dry run is;
production is touched only by bounded statements (≤ 150 ids per `IN`,
≤ 80 KB per `VALUES`, one request each, idempotent). Reviewed overrides
need no edit: `promote_overture_candidates.source_lineage` applies every
key under `overture-country-sources/<CC>/` in the overrides file to the
country's current source, later keys winning for the same id.

### Steps

1. **Migration 0048** must be applied once (`ALTER TABLE … ADD COLUMN`,
   not idempotent): check `PRAGMA table_info(overture_poi)` has
   `retired_in_release` first. Deploy the Worker and container from the
   branch that carries it.
2. **Dry run the diff locally**, nothing written:
   ```
   cd cloudflare/extraction
   python3 extract_overture.py --country PT --release <release> --out /tmp/PT-new.csv   # or the container's own extract
   npx wrangler r2 object get brush-poi-exports/<mapped raw_extract_r2_key> --file /tmp/PT-old.csv --remote
   python3 refresh_overture_country.py /tmp/PT-old.csv /tmp/PT-new.csv
   ```
   Read the four counts. A retired count in the thousands, or a changed
   count near the whole country, is a release to look at before queuing.
3. **Queue the refresh** (the Worker records the mapped archive as
   `previous_source_r2_key` and hands both it and the release to the
   container):
   ```
   curl -s -X POST https://poi-api.brushaway.app/internal/overture-country/queue \
     -H "X-Build-Secret: $SECRET" -H 'User-Agent: curl/8.0' -H 'Content-Type: application/json' \
     -d '{"countryCode": "PT", "release": "<release>"}'
   ```
   `countryCode` must be in `SUPPORTED_OVERTURE_COUNTRIES` (`src/index.ts`);
   adding a country is that list plus its overrides. Status:
   `GET /internal/overture-country/status?countryCode=PT` → `release`,
   `new_rows`, `changed_rows`, `retired_rows` once `mapped`. A failed run
   is re-queued the same way; it reuses the new archive and keeps the
   previous key.
4. **Verify — zero lost overrides**, read-only, bounded:
   ```
   python3 verify_refresh_overrides.py --country PT
   ```
   Exit 0 = every reviewed decision is `kept` (or `retired` with the
   release, or `absent` from every archive). Any `lost:` line is the stop.
5. **Endpoint check** (`POST /poi/nearby`): a row the release retired no
   longer appears; a row with a reviewed override keeps its type/kind
   (`verify_prod_decisions.py --before docs/kan-455/verification-after-2026-09-20.json`
   is the table to diff against). The per-settlement exports are rewritten
   by the run, so the trip download follows the release.

### What it does not do

- It never deletes: a retired row keeps everything and un-retires itself
  when a release lists the id again.
- It does not re-decide unchanged rows. Rule and dictionary changes reach
  the country's still-pending rows through `overture-repromote` (KAN-455),
  as before.
- It does not read `names.common`; bilingual names are KAN-460.
