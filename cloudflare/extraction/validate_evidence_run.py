"""KAN-446. Proves an evidence run is coherent before it can be merged.

    python3 validate_evidence_run.py docs/evidence/ES/<run_id> [--base <git ref>]

Runs in CI on every PR that touches `docs/evidence/` or the overrides. Five
checks, each of which is a way a reviewed decision could quietly stop meaning
what the reviewer thought it meant:

  1. the three output files hash to what manifest.json says — they are one run
  2. every override id exists in suggestions.jsonl with a decision and evidence
  3. every id appears once across all batches, with one decision
  4. every override passes the real promotion decision: reachable type,
     store/kind shape — the same gate production applies
  5. the `evidence_<run_id>_*` batches in overtureCandidateOverrides.json are
     the draft, exactly — nothing hand-edited, nothing extra, nothing missing
  6. no pre-existing batch in overtureCandidateOverrides.json changed against
     the base ref — earlier reviewed decisions are untouched, except by a
     logged reversal

Exit 1 on the first failure, with the id or file that failed.
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys

# Reachability from the committed type relation, never from live D1: a PR is
# validated against what the repo declares, and CI has no Cloudflare token.
os.environ.setdefault('BRUSH_TYPE_RELATION', 'sql')

EXTRACTION_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, EXTRACTION_DIR)
CLOUDFLARE_DIR = os.path.dirname(EXTRACTION_DIR)
ROOT = os.path.dirname(CLOUDFLARE_DIR)
OVERRIDES_RELATIVE = 'cloudflare/src/overtureCandidateOverrides.json'


class Invalid(Exception):
    pass


def sha256_of(path):
    with open(path, 'rb') as handle:
        return hashlib.sha256(handle.read()).hexdigest()


OUTPUTS = ('suggestions.jsonl', 'overrides-draft.json', 'residual-report.json')


def check_hashes(run_dir, manifest):
    """The manifest must name exactly the three outputs, and each must match.

    A manifest that omits one leaves that file unprotected; a manifest that
    names an extra one is from a different tool.
    """
    listed = set(manifest.get('outputs', {}))
    if listed != set(OUTPUTS):
        raise Invalid(f'manifest must list exactly {sorted(OUTPUTS)}, lists {sorted(listed)}')
    for name in OUTPUTS:
        expected = manifest['outputs'][name]
        actual = sha256_of(os.path.join(run_dir, name))
        if actual != expected:
            raise Invalid(f'{name} hashes to {actual[:12]}, manifest says {expected[:12]}')


def check_ids(run_dir, draft):
    decided = {}
    with open(os.path.join(run_dir, 'suggestions.jsonl')) as handle:
        for line in handle:
            record = json.loads(line)
            decided[record['overture_id']] = record
    seen = {}
    for source_key, batches in draft.items():
        for batch, entries in batches.items():
            for poi_id, entry in entries.items():
                if poi_id in seen:
                    raise Invalid(f'{poi_id} appears in both {seen[poi_id]} and {batch}')
                seen[poi_id] = batch
                record = decided.get(poi_id)
                if not record:
                    raise Invalid(f'{poi_id} in {batch} is not in suggestions.jsonl')
                if record['decision'] == 'insufficient_evidence':
                    raise Invalid(f'{poi_id} in {batch} was insufficient_evidence in suggestions')
                if not record['candidates']:
                    raise Invalid(f'{poi_id} in {batch} has no candidate evidence')
                expected_rejected = record['decision'] == 'excluded'
                if expected_rejected != (entry.get('decision') == 'rejected'):
                    raise Invalid(f'{poi_id} decision in {batch} conflicts with suggestions')
    return seen


def check_promotable(draft):
    import promote_overture_candidates as promote
    from analyse_poi_candidates import reachable_types
    mapping, reachable, brands = promote.category_map(), reachable_types(), promote.load_brand_dictionary()
    kinds, cuisines = promote.store_kind_alias_index(), promote.food_cuisine_alias_index()
    financial, store_brands = promote.load_financial_service_name_rules(), promote.store_brand_index()
    for source_key, batches in draft.items():
        for batch, entries in batches.items():
            for poi_id, entry in entries.items():
                row = {'overture_id': poi_id, 'name': 'validation', 'lat': 0.0, 'lng': 0.0, 'address': None,
                       'category': 'shopping', 'category_path': None, 'confidence': 1.0, 'source_datasets': None}
                try:
                    status, _, _, _ = promote.decide(row, mapping, reachable, brands, kinds, cuisines,
                                                     financial, store_brands, {poi_id: entry})
                except ValueError as error:
                    raise Invalid(f'{poi_id} in {batch}: promotion refuses it — {error}') from None
                if status not in ('promoted', 'rejected'):
                    raise Invalid(f'{poi_id} in {batch}: promotion leaves it {status}')


REVERSALS_RELATIVE = 'docs/evidence/reversals.jsonl'


def reversals():
    """Ids deliberately withdrawn from a reviewed batch, each with a reason.

    A reviewed decision can turn out wrong — KAN-446's reproduction of
    Portugal found a kiosk promoted as a pharmacy. Withdrawing it is a change
    to a reviewed batch, which is otherwise forbidden, so it has to be said
    out loud: one line per id, the batch it leaves, why, and what withdrew it.
    """
    path = os.path.join(ROOT, REVERSALS_RELATIVE)
    if not os.path.exists(path):
        return {}
    listed = {}
    with open(path) as handle:
        for line in handle:
            if line.strip():
                entry = json.loads(line)
                listed[(entry['source_key'], entry['batch'], entry['overture_id'])] = entry
    return listed


def check_existing_batches_unchanged(base_ref):
    """Every batch that existed at the base ref is unchanged now, except for
    withdrawals that are listed in the reversal log.

    New batches may be added. An id may leave a reviewed batch only with a
    logged reason. Nothing else already reviewed may move: no edits, no
    additions to old batches, no silent removals. This is the guard that lets
    a reviewer read only the additions and the reversal log.
    """
    try:
        before = subprocess.run(['git', 'show', f'{base_ref}:{OVERRIDES_RELATIVE}'], cwd=ROOT,
                                check=True, capture_output=True, text=True).stdout
    except subprocess.CalledProcessError:
        raise Invalid(f'cannot read {OVERRIDES_RELATIVE} at {base_ref}') from None
    old = json.loads(before)
    with open(os.path.join(ROOT, OVERRIDES_RELATIVE)) as handle:
        new = json.load(handle)
    withdrawn = reversals()
    for source_key, batches in old.items():
        if source_key not in new:
            raise Invalid(f'source {source_key} was removed')
        for batch, entries in batches.items():
            current = new[source_key].get(batch)
            if current is None:
                # A batch every id of which was withdrawn may go with them.
                if all((source_key, batch, poi_id) in withdrawn for poi_id in entries):
                    continue
                raise Invalid(f'batch {batch} under {source_key} was removed')
            for poi_id, entry in entries.items():
                if poi_id not in current:
                    if (source_key, batch, poi_id) not in withdrawn:
                        raise Invalid(f'{poi_id} was removed from {batch} without a reversal entry')
                elif current[poi_id] != entry:
                    raise Invalid(f'{poi_id} in {batch} was modified; withdraw it and re-add it in a new batch')
            added = set(current) - set(entries)
            if added:
                raise Invalid(f'batch {batch} under {source_key} gained ids; new decisions go in a new batch')


def check_overrides_carry_the_draft(run_id, draft, base_ref):
    """What was added to the overrides file for this run is the draft, exactly.

    Validating the draft proves nothing about the file promotion reads unless
    the file's additions *are* the draft. Every `evidence_<run_id>_*` batch in
    the overrides must be present in the draft with identical entries, and
    every batch in the draft must be in the overrides. A hand-edited entry, an
    extra id, or a batch that was never drafted all fail here.
    """
    with open(os.path.join(ROOT, OVERRIDES_RELATIVE)) as handle:
        current = json.load(handle)
    prefix = f'evidence_{run_id}_'
    for source_key, batches in draft.items():
        present = {name: entries for name, entries in current.get(source_key, {}).items()
                   if name.startswith(prefix)}
        if present != batches:
            missing = set(batches) - set(present)
            extra = set(present) - set(batches)
            differing = {name for name in set(batches) & set(present) if batches[name] != present[name]}
            detail = '; '.join(filter(None, (
                f'not in overrides: {sorted(missing)}' if missing else '',
                f'not in draft: {sorted(extra)}' if extra else '',
                f'entries differ: {sorted(differing)}' if differing else '')))
            raise Invalid(f'overrides additions for run {run_id} are not the draft — {detail}')
    if base_ref:
        # And nothing else for this run appeared under any other source key.
        try:
            before = json.loads(subprocess.run(['git', 'show', f'{base_ref}:{OVERRIDES_RELATIVE}'], cwd=ROOT,
                                               check=True, capture_output=True, text=True).stdout)
        except subprocess.CalledProcessError:
            raise Invalid(f'cannot read {OVERRIDES_RELATIVE} at {base_ref}') from None
        for source_key, batches in current.items():
            for name in batches:
                if name.startswith(prefix) and source_key not in draft and name not in before.get(source_key, {}):
                    raise Invalid(f'{name} under {source_key} was added but is not in the draft')


def validate(run_dir, base_ref):
    with open(os.path.join(run_dir, 'manifest.json')) as handle:
        manifest = json.load(handle)
    with open(os.path.join(run_dir, 'overrides-draft.json')) as handle:
        draft = json.load(handle)
    check_hashes(run_dir, manifest)
    ids = check_ids(run_dir, draft)
    check_promotable(draft)
    check_overrides_carry_the_draft(manifest['run_id'], draft, base_ref)
    if base_ref:
        check_existing_batches_unchanged(base_ref)
    return len(ids)


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('run_dir', nargs='?')
    parser.add_argument('--base', help='git ref the overrides file is compared against (e.g. origin/develop)')
    parser.add_argument('--only-batches', action='store_true',
                        help='skip the run checks; only prove existing batches are unchanged against --base')
    args = parser.parse_args(argv)
    if args.only_batches:
        if not args.base:
            parser.error('--only-batches needs --base')
        try:
            check_existing_batches_unchanged(args.base)
        except Invalid as problem:
            print(f'INVALID: {problem}', file=sys.stderr)
            return 1
        print('valid: existing batches unchanged', file=sys.stderr)
        return 0
    if not args.run_dir:
        parser.error('run_dir is required unless --only-batches')
    try:
        count = validate(args.run_dir, args.base)
    except Invalid as problem:
        print(f'INVALID: {problem}', file=sys.stderr)
        return 1
    print(f'valid: {count:,} override ids, outputs match manifest'
          + (', existing batches unchanged' if args.base else ''), file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
