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

```bash
python3 cloudflare/extraction/run_evidence_join.py --country ES --emit \
    --overture-key overture-country-sources/ES/<run>.csv \
    --source-key   country-sources-unfiltered/ES/<uuid>.csv
```

Without `--osm-key` the command downloads the Geofabrik PBF, extracts the
retail contract (needs `pip install osmium`; ~20 min for a large country),
and archives the extracted TSV to `archives/osm-retail/ES/<run_id>.tsv`. That
upload is the one write it makes. Every later run passes `--osm-key` with
that key and skips the PBF entirely.

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
* any batch that existed on the base branch changed

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
