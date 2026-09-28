"""
KAN-472. Two repairs to production, in order, both idempotent and both
read-only until `--apply`.

WHY THIS EXISTS

The 2026-09-25 PT refresh (run `7ac6dab3-…`) died mid-load on
`ConnectionError: … Read timed out` from `d1.internal`. It left:

  * `overture_candidate` half-moved — 206,802 rows on the new archive key
    with `country_code` written by the upsert, 143,613 still on the old key
    with `country_code` NULL. Decisions were never touched (`_with_refresh`
    does not SET `promotion_status`), and the promoted count still equals
    `overture_poi` exactly, so nothing was lost;
  * `overture_country_import` on `status = 'failed'`, its counters zeroed by
    the queue step and never refilled;
  * `overture_poi` untouched — the served refresh, the retire pass and the
    un-retire pass never ran.

Both archives are the SAME Overture release (`2026-08-19.0`) and the same
row set; the new CSV differs only by carrying KAN-460's five name columns.
The refresh diff is therefore empty — 0 new, 0 changed, 0 retired — which is
why this finishes the run by hand instead of re-running it, and why the
retire pass is deliberately not invoked. Retiring here would mark rows the
release still carries.

WHAT IT WRITES

Stage 1, the key move: the remaining candidates move to the run's archive
key and take the import's country code. Nothing else about the row changes.

Stage 2, `overture_poi.country_code`: taken from the candidate row by
`overture_id`, never a literal, because the registry is PT-only today and
that will stop being true. Only `country_code` is written; `name`,
`name_local`, `name_en`, `names_json`, coordinates, category, types,
attributes and decisions are all untouched, and the NULL name columns stay
NULL (KAN-471's destination, and a NULL language list is what keeps the
Settings picker disabled until then).

Stage 3, the import row, LAST: `status = 'mapped'`, `previous_source_r2_key`
NULL, counters set to the measured truth rather than left at zero. The
archive key is KEPT — KAN-471 reads that archive. It goes last because it is
the record that the run finished: if an earlier statement fails, the row
stays `failed` and a re-run resumes. A row already `mapped` is skipped, so a
repeated `--apply` leaves the completed record alone.

BOUNDING

One statement per request, each restricted to one leading-character bucket
of `overture_id` so no single statement attempts 216k row-writes. The
buckets cover every possible first character, hex or not, so a run cannot
silently skip rows. Transient failures retry three times, HTTP 429 stops —
CLAUDE.md's D1 rule.

    python3 repair_pt_refresh.py --country PT            # dry run, no writes
    python3 repair_pt_refresh.py --country PT --apply
"""
from __future__ import annotations

import argparse
import os
import sys

EXTRACTION_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, EXTRACTION_DIR)

from classify_and_load import sql_escape  # noqa: E402

HEX = '0123456789abcdef'


def bucket_predicates(column='overture_id'):
    """One predicate per leading-character bucket, together covering every
    row. The last bucket is everything outside hex, so an id shaped
    differently from a GERS UUID is still moved rather than skipped."""
    for char in HEX:
        yield f"substr({column}, 1, 1) = {sql_escape(char)}"
    listed = ','.join(sql_escape(c) for c in HEX)
    yield f"substr({column}, 1, 1) NOT IN ({listed})"


def key_move_statements(previous_key, target_key, country_code):
    """Finish the archive move the failed load started. Guarded on the old
    key, so a re-run after a partial apply changes nothing further."""
    for predicate in bucket_predicates():
        yield (
            'UPDATE overture_candidate SET '
            f'country_source_r2_key = {sql_escape(target_key)}, '
            f'last_seen_source_key = {sql_escape(target_key)}, '
            f'country_code = {sql_escape(country_code)} '
            f'WHERE country_source_r2_key = {sql_escape(previous_key)} '
            f'AND {predicate};\n')


def import_row_statement(country_code, run_id, target_key, counts, completed_at):
    """The run is complete as of this repair: mapped, no previous key, and
    counters that match what is actually in D1. `raw_extract_r2_key` is left
    alone — KAN-471 reads that archive."""
    return (
        'UPDATE overture_country_import SET '
        "status = 'mapped', previous_source_r2_key = NULL, last_error = NULL, "
        f'completed_at = {sql_escape(completed_at)}, '
        f"source_rows = {counts['source_rows']}, staged_rows = {counts['staged_rows']}, "
        f"dropped_rows = {counts['source_rows'] - counts['staged_rows']}, "
        f"promoted_rows = {counts['promoted']}, rejected_rows = {counts['rejected']}, "
        f"pending_rows = {counts['pending']}, "
        'new_rows = 0, changed_rows = 0, retired_rows = 0 '
        f'WHERE country_code = {sql_escape(country_code)} '
        f'AND active_run_id = {sql_escape(run_id)} '
        f'AND raw_extract_r2_key = {sql_escape(target_key)};\n')


def country_code_statements():
    """Fill the served rows from their candidate. The value comes from the
    candidate row, not a literal. Guarded on NULL so a re-run is a no-op and
    a partial run resumes; `EXISTS` keeps a served row whose candidate has no
    country from being set to NULL-over-NULL."""
    for predicate in bucket_predicates():
        yield (
            'UPDATE overture_poi SET country_code = ('
            'SELECT candidate.country_code FROM overture_candidate AS candidate '
            'WHERE candidate.overture_id = overture_poi.overture_id) '
            f'WHERE overture_poi.country_code IS NULL AND {predicate} '
            'AND EXISTS (SELECT 1 FROM overture_candidate AS candidate '
            'WHERE candidate.overture_id = overture_poi.overture_id '
            'AND candidate.country_code IS NOT NULL);\n')


def import_row(country_code, d1_read):
    rows = d1_read(
        'SELECT country_code, status, active_run_id, raw_extract_r2_key, previous_source_r2_key, '
        'release, source_rows FROM overture_country_import '
        f'WHERE country_code = {sql_escape(country_code)}')
    if not rows:
        raise SystemExit(f'no overture_country_import row for {country_code}')
    return rows[0]


def state(country_code, d1_read, original_previous_key=None):
    """Everything the repair decides from, in three bounded reads.

    `original_previous_key` is required for the read AFTER a repair: the
    import update clears `previous_source_r2_key`, so re-reading the row
    would compare the candidates against NULL and report "0 left on the
    previous key" no matter what is actually there."""
    row = import_row(country_code, d1_read)
    previous_key = original_previous_key if original_previous_key is not None else row['previous_source_r2_key']
    counts = d1_read(
        "SELECT SUM(CASE WHEN promotion_status = 'promoted' THEN 1 ELSE 0 END) AS promoted, "
        "SUM(CASE WHEN promotion_status = 'rejected' THEN 1 ELSE 0 END) AS rejected, "
        "SUM(CASE WHEN promotion_status = 'pending' THEN 1 ELSE 0 END) AS pending, "
        'COUNT(*) AS staged_rows, '
        'SUM(CASE WHEN country_code IS NULL THEN 1 ELSE 0 END) AS candidates_without_country, '
        f'SUM(CASE WHEN country_source_r2_key = {sql_escape(previous_key or "")} THEN 1 ELSE 0 END) AS on_previous_key '
        'FROM overture_candidate')[0]
    served = d1_read(
        'SELECT COUNT(*) AS served, SUM(CASE WHEN country_code IS NULL THEN 1 ELSE 0 END) AS without_country, '
        'SUM(CASE WHEN name_local IS NOT NULL OR name_en IS NOT NULL OR names_json IS NOT NULL THEN 1 ELSE 0 END) AS with_names '
        'FROM overture_poi')[0]
    counts['source_rows'] = row['source_rows'] or counts['staged_rows']
    return row, counts, served


def ensure_repairable(row, counts, served, expect_run=None, expect_release=None):
    """Refuse anything but the run this script is for. A `mapping` row means a
    country run may be in flight, and marking it mapped from here would
    declare someone else's half-finished import complete. `--expect-run` and
    `--expect-release` pin it further; the run id is never inferred from
    whatever happens to be active."""
    if row['status'] not in ('failed', 'mapped'):
        raise SystemExit(
            f'import row is {row["status"]!r}, not failed or mapped; a run may be in flight. Stopping.')
    if expect_run and row['active_run_id'] != expect_run:
        raise SystemExit(f'import row carries run {row["active_run_id"]!r}, not {expect_run!r}. Stopping.')
    if expect_release and row['release'] != expect_release:
        raise SystemExit(f'import row carries release {row["release"]!r}, not {expect_release!r}. Stopping.')
    if counts['promoted'] != served['served']:
        raise SystemExit(
            f'promoted candidates ({counts["promoted"]}) != served rows ({served["served"]}); '
            'the refresh lost or gained a decision. Stopping: investigate before repairing.')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
    parser.add_argument('--country', default='PT')
    parser.add_argument('--apply', action='store_true', help='write; omitted, nothing is written')
    parser.add_argument('--expect-run', help='refuse unless the import row carries this active_run_id')
    parser.add_argument('--expect-release', help='refuse unless the import row carries this release')
    # The work dir holds one transient statement file per request. It goes to
    # a temp dir by default so a run leaves nothing in the repo.
    parser.add_argument('--work-dir', default=None)
    args = parser.parse_args(argv)

    import preflight_foursquare_archive as preflight
    from import_foursquare_tourism import d1_write
    from datetime import datetime, timezone
    import tempfile

    work_dir = args.work_dir or tempfile.mkdtemp(prefix='kan472-repair-')

    row, counts, served = state(args.country, preflight.d1_read)
    print(f'import row: status={row["status"]} run={row["active_run_id"]} release={row["release"]}', file=sys.stderr)
    print(f'  archive={row["raw_extract_r2_key"]}', file=sys.stderr)
    print(f'  previous={row["previous_source_r2_key"]}', file=sys.stderr)
    print(f'candidates: {counts["staged_rows"]:,} staged | {counts["on_previous_key"]:,} still on the previous key '
          f'| {counts["candidates_without_country"]:,} without a country', file=sys.stderr)
    print(f'  promoted {counts["promoted"]:,} | rejected {counts["rejected"]:,} | pending {counts["pending"]:,}', file=sys.stderr)
    print(f'served: {served["served"]:,} rows | {served["without_country"]:,} without a country '
          f'| {served["with_names"]:,} carrying any name variant', file=sys.stderr)

    ensure_repairable(row, counts, served, args.expect_run, args.expect_release)

    target_key = row['raw_extract_r2_key']
    previous_key = row['previous_source_r2_key']
    if not target_key:
        raise SystemExit('the import row has no raw_extract_r2_key; nothing to move rows to')

    # The import row goes LAST: it is the record that the run finished, so it
    # must not be written until the candidates and the served rows are. If a
    # statement fails midway the row stays `failed` and a re-run resumes.
    # A row already `mapped` is left alone entirely, so repeated `--apply`
    # runs do not churn its `completed_at`.
    statements = []
    if previous_key:
        statements += list(key_move_statements(previous_key, target_key, args.country))
    statements += list(country_code_statements())
    if row['status'] != 'mapped':
        statements.append(import_row_statement(
            args.country, row['active_run_id'], target_key, counts,
            datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')))

    print(f'\n{len(statements)} statements planned', file=sys.stderr)
    if not args.apply:
        for statement in statements:
            print(statement, end='')
        print('\ndry run: nothing written. Re-run with --apply.', file=sys.stderr)
        return 0

    # D1 reports `changes = 1` for a statement that matched nothing (measured
    # 2026-09-28 with `WHERE 1 = 0`), so this total runs one ahead per
    # statement. The counts that matter are the before/after reads below.
    reported = 0
    for index, statement in enumerate(statements, 1):
        rows = d1_write(statement, work_dir)
        reported += rows or 0
        print(f'[{index}/{len(statements)}] changes={rows or 0}', file=sys.stderr)
    print(f'{reported:,} changes reported over {len(statements)} statements '
          f'(D1 counts 1 per statement even when nothing matched)', file=sys.stderr)

    _, after_counts, after_served = state(args.country, preflight.d1_read, original_previous_key=previous_key)
    print(f'after: {after_counts["on_previous_key"]:,} candidates on the original key, '
          f'{after_counts["candidates_without_country"]:,} without a country; '
          f'{after_served["without_country"]:,} served rows without a country, '
          f'{after_served["with_names"]:,} carrying a name variant', file=sys.stderr)
    left = {
        'candidates on the original key': after_counts['on_previous_key'],
        'candidates without a country': after_counts['candidates_without_country'],
        'served rows without a country': after_served['without_country'],
    }
    unfinished = {name: value for name, value in left.items() if value}
    if unfinished:
        print(f'INCOMPLETE: {unfinished}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
