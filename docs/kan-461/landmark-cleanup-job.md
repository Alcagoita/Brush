# KAN-461 — Landmark cleanup as a container job (design, for approval)

One served row per real landmark, computed and applied in Cloudflare, not on a
laptop. The data is in D1; the extraction Container already reads and writes
D1 and R2 through the Worker (`run_job.py`, `d1_client`, `r2_client`). This
mirrors the MULTIBANCO job (KAN-440) — the smallest proven shape: scopes in a
D1 table, small batches, a lease, cron starts the next batch.

## What it does

The rule is `landmark_identity` as of commit ab1a1d6 (33 tests, including the
12 wrong rows of the Lisbon dry run and the 2 import-sample misses).

Per area (the same 320 areas as the import: municipality / city / town /
county boxes from `place`, then "rest of Portugal"):

1. read the area's served landmark rows from D1 — `overture_poi` (visible,
   not retired) + active `curated_poi`, landmark types only;
2. not a place → to remove; groups of certain duplicates → one kept (never a
   part: playground, social centre, shop), the rest to remove. A red flag is
   never acted on;
3. gate: an area that would remove more than 30% of its landmark rows is
   HELD, not written.

**Country context, computed once per run.** The rule needs two country-wide
inputs: the place names (every Overture locality) and the words common within
a kind. The first batch computes them from D1 and stores them in R2
(`reviews/kan-461/landmark-cleanup/<run>/context.json`); every later batch
reads that file, so all areas judge with the same context.

## Two passes, owner in between

| pass | D1 writes | output |
|---|---|---|
| **dry-run** (default) | only the job's own progress table | per-area report + one summary in R2, `reviews/kan-461/landmark-cleanup/<run>/` |
| **emit** (separate start, owner's go) | per area: rejection marker first (`poi_source_correction`, `visible = 0`, reason), then delete — the 0093 pattern | the same reports, marked written |

Emit replays the dry run's decisions from R2, it does not recompute — what the
owner approved is exactly what is deleted. A row already gone is a no-op.

## Pieces

- **Migration** `0094_landmark_cleanup_job.sql`: `landmark_cleanup_run`
  (status, mode dry_run|emit, lease, last_error) and
  `landmark_cleanup_scope` (area, box, status, lease, attempts, rows, to_remove,
  held_reason). Same columns as `multibanco_import` / `_scope`.
- **Worker** `src/landmarkCleanup.ts` + routes, copied from
  `multibancoImport.ts`: `/internal/landmark-cleanup/start` (dry-run or emit a
  given dry-run), `/claim`, `/scope-result`, `/batch-release`, `/status`,
  `/cancel`; cron picks up a run with claimable scopes. Internal auth
  (`X-Build-Secret`), as every `/internal/*` route.
- **Container** `MODE=landmark-cleanup` in `run_job.py` →
  `landmark_cleanup_job.py`: claim ≤ 20 areas, run each, upload its report,
  checkpoint, release. A dead instance loses one batch at most.
- **Image**: the Dockerfile also copies `docs/kan-461` and `docs/kan-433`
  (the kind words, place names and translations the rule reads).
- **Tests**: Python — scope run against a fake D1 (decisions, gate, emit
  writes markers before deletes, replay-not-recompute); Worker — claim/lease/
  release like `multibancoImport.test.ts`.

## Bounds (CLAUDE.md, D1 from scripts)

IN lists ≤ 150 ids; reads paginated; 7403/7500 retried 3 times, 429 is stop;
statements ≤ MAX_STATEMENT_BYTES.

## What runs on the laptop

`wrangler deploy` once (builds the image), `d1 execute --file` for 0094, and
the `curl` that starts each pass. Nothing is computed locally.

## Not in this job

The final OSM import of the remaining types — a second mode on the same
skeleton, designed after this one works.
