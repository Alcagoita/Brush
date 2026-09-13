"""KAN-445. Does Overture already know what the generic-shopping residual is?

extract_overture.py selects `categories.primary` and drops `categories.alternate`,
`brand`, `websites` and `socials`. The residual KAN-444 could not resolve is 87%
Meta-sourced, and a Facebook Page usually carries several categories — so the
finer one may be sitting in the alternates we never read.

A measurement, not a change. Reads Overture's own published parquet for the
release we serve, for the exact ids in the committed decision manifest, and
reports what those columns hold. Nothing here promotes, and the extractor is
not touched: whether it should be is what the numbers decide.

Usage:
  python3 measure_overture_alternates.py --manifest docs/kan-444/decision-manifest.tsv \
      --out outputs/kan-445-overture-columns.tsv
"""
import argparse
import csv
import json
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_overture import OVERTURE_PLACES, OVERTURE_RELEASE
from promote_overture_candidates import category_map, load_brand_dictionary, normalize_text
from analyse_poi_candidates import reachable_types

# Mainland plus Azores and Madeira. A bbox predicate is what lets DuckDB skip
# every parquet row group that is not Portugal, which is nearly all of them.
PT_BBOX = (-31.5, 29.5, -6.0, 42.5)  # xmin, ymin, xmax, ymax


def overture_rows(ids, release):
    import duckdb

    con = duckdb.connect()
    con.execute('INSTALL httpfs; LOAD httpfs;')
    con.execute("SET s3_region='us-west-2';")
    con.execute('CREATE TABLE wanted (id VARCHAR);')
    con.executemany('INSERT INTO wanted VALUES (?)', [(i,) for i in ids])
    xmin, ymin, xmax, ymax = PT_BBOX
    query = f"""
        SELECT p.id,
               p.categories.primary AS category,
               p.categories.alternate AS alternates,
               p.brand.names.primary AS brand,
               len(coalesce(p.websites, [])) AS websites,
               len(coalesce(p.socials, [])) AS socials,
               p.confidence,
               array_to_string(list_distinct(list_transform(p.sources, s -> s.dataset)), '|') AS source_datasets
        FROM read_parquet('{OVERTURE_PLACES % release}') AS p
        JOIN wanted USING (id)
        WHERE p.bbox.xmin BETWEEN {xmin} AND {xmax}
          AND p.bbox.ymin BETWEEN {ymin} AND {ymax}
    """
    for row in con.execute(query).fetchall():
        yield {
            'overture_id': row[0], 'category': row[1], 'alternates': list(row[2] or []),
            'brand': row[3], 'websites': row[4], 'socials': row[5],
            'confidence': row[6], 'source_datasets': row[7],
        }


def summarise(label, rows, mapping, reachable, brands):
    """Counts for one decision group. Written plainly so the doc can quote them."""
    n = len(rows)
    with_alt = [r for r in rows if r['alternates']]
    alt_values = Counter(a for r in with_alt for a in r['alternates'])
    # An alternate is useful only if it maps to a type the app can surface,
    # and is not itself the generic bucket we are trying to escape.
    def usable(alternate):
        entry = mapping.get(alternate)
        return bool(entry) and entry.get('poi_type') in reachable and alternate != 'shopping'
    mappable = [r for r in with_alt if any(usable(a) for a in r['alternates'])]
    with_brand = [r for r in rows if r['brand']]
    known_brand = [r for r in with_brand if normalize_text(r['brand']) in brands]
    with_web = sum(1 for r in rows if r['websites'] or r['socials'])
    print(f'\n{label}: {n:,} rows found in Overture {OVERTURE_RELEASE}')
    if not n:
        return
    print(f'  with any alternate category   {len(with_alt):>6,}  ({len(with_alt) / n:.1%})')
    print(f'  alternate maps to a usable type {len(mappable):>5,}  ({len(mappable) / n:.1%})')
    print(f'  with brand                    {len(with_brand):>6,}  ({len(with_brand) / n:.1%}), '
          f'{len(known_brand):,} in the brand dictionary')
    print(f'  with website or social        {with_web:>6,}  ({with_web / n:.1%})')
    print('  top alternates:')
    for value, count in alt_values.most_common(15):
        flag = 'usable' if usable(value) else '-'
        print(f'    {count:>5,}  {value:<40} {flag}')
    return {
        'rows': n, 'with_alternate': len(with_alt), 'alternate_usable': len(mappable),
        'with_brand': len(with_brand), 'brand_known': len(known_brand), 'with_web_or_social': with_web,
        'top_alternates': alt_values.most_common(30),
    }


def run(manifest_path, out_path, release):
    with open(manifest_path, newline='') as handle:
        manifest = {r['overture_id']: r for r in csv.DictReader(handle, delimiter='\t')}
    print(f'{len(manifest):,} manifest ids; querying Overture {release}', file=sys.stderr)
    rows = list(overture_rows(list(manifest), release))
    print(f'{len(rows):,} found', file=sys.stderr)

    mapping = category_map()
    reachable = set(reachable_types())
    brands = {normalize_text(b) for b in load_brand_dictionary()}
    groups = {'unresolved': [], 'resolved': []}
    for row in rows:
        decision = manifest[row['overture_id']]['decision']
        groups['unresolved' if decision == 'insufficient_evidence' else 'resolved'].append(row)

    report = {'release': release}
    for label in ('unresolved', 'resolved'):
        report[label] = summarise(label, groups[label], mapping, reachable, brands)

    # Control: where Foursquare/OSM established a type, does the alternate agree?
    agree = disagree = 0
    for row in groups['resolved']:
        decided = manifest[row['overture_id']]
        if decided['decision'] != 'verified_subtype' or not row['alternates']:
            continue
        mapped = {mapping[a]['poi_type'] for a in row['alternates'] if a in mapping and 'poi_type' in mapping[a]}
        if not mapped:
            continue
        if decided['subtype'] in mapped:
            agree += 1
        else:
            disagree += 1
    print(f'\ncontrol: of resolved rows whose alternates map to a type, '
          f'{agree:,} agree with Foursquare/OSM and {disagree:,} disagree')
    report['control'] = {'agree': agree, 'disagree': disagree}

    if os.path.dirname(out_path):
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', newline='') as handle:
        writer = csv.writer(handle, delimiter='\t')
        writer.writerow(('overture_id', 'decision', 'category', 'alternates', 'brand',
                         'websites', 'socials', 'confidence', 'source_datasets'))
        for row in rows:
            writer.writerow((row['overture_id'], manifest[row['overture_id']]['decision'], row['category'],
                             '|'.join(row['alternates']), row['brand'] or '', row['websites'],
                             row['socials'], row['confidence'], row['source_datasets']))
    with open(os.path.splitext(out_path)[0] + '-report.json', 'w') as handle:
        json.dump(report, handle, indent=2)
    print(f'-> {out_path}', file=sys.stderr)
    return 0


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--release', default=OVERTURE_RELEASE)
    args = parser.parse_args(argv)
    return run(args.manifest, args.out, args.release)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
