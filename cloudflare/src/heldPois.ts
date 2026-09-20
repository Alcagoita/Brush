/**
 * KAN-452 — the one lookup over every place the registry serves.
 *
 * Moderation used to ask three tables (`poi`, `osm_poi`, `curated_poi`) and
 * never `overture_poi`, so a moderator could approve a shop Overture already
 * held and a contributor could not report a wrong Overture row at all. Both
 * endpoints now read here, and the KAN-433 importer is meant to call this
 * rather than grow a second matcher.
 *
 * What "held" means, per source:
 *
 * - `overture`   an `overture_poi` row whose `poi_source_correction` (if
 *                any) has not hidden it. A row with `visible = 0` is gone
 *                from nearby, so it must be gone from here too — otherwise a
 *                removed place would still block a correction that re-adds
 *                it, and would be offered for removal a second time.
 * - `community`  an active `curated_poi` row, minus the legacy `multibanco:`
 *                mirror that nearby also excludes (migration 0031).
 * - `multibanco` a `multibanco_poi` row. Duplicates only: that data is final
 *                and there is no correction path, so the removal search
 *                leaves it out (see `sources`).
 *
 * `poi` and `osm_poi` are not read. They have been empty since 0032 and the
 * tables are left exactly as they are.
 *
 * Matching is by `dedupe_name` (exact or prefix) and then by distance in the
 * Worker. An Overture row matches on its stored name or on the name a
 * reviewer gave it (`dedupe_name_override`), and the corrected display name
 * is what comes back.
 */
import { haversineMeters } from './geohash';

export type HeldPoiSource = 'overture' | 'community' | 'multibanco';

export interface HeldPoi {
  source: HeldPoiSource;
  id: string;
  name: string;
  lat: number;
  lng: number;
  poiType: string;
  address: string | null;
  distanceMeters: number;
}

export interface HeldPoiLookup {
  /** Normalised with `normalizePoiName`. Exact match unless `prefix` is set. */
  dedupeName: string;
  prefix?: boolean;
  lat: number;
  lng: number;
  radiusMeters: number;
  /** Rows fetched per source before the distance filter. */
  perSourceLimit: number;
  /** Defaults to every source. */
  sources?: readonly HeldPoiSource[];
}

interface HeldPoiRow {
  poi_id: string;
  name: string;
  lat: number;
  lng: number;
  primary_poi_type: string;
  address: string | null;
}

const ALL_SOURCES: readonly HeldPoiSource[] = ['overture', 'community', 'multibanco'];

/**
 * A latitude/longitude box that contains the radius, so the per-source LIMIT
 * applies to rows that are already near the centre. Without it a common
 * name ("padaria") matches nationwide, the LIMIT truncates that set in index
 * order, and the distance filter can then discard every survivor.
 *
 * A box, not the geohash helpers: those serve the nearby hot path and cap at
 * MAX_RADIUS_METERS, and SQLite uses one index per table anyway — which must
 * stay the `dedupe_name` one.
 */
function boundingBox(lat: number, lng: number, radiusMeters: number): [number, number, number, number] {
  const latDelta = radiusMeters / 111_195;
  // Meridians converge toward the poles; clamped because cos() approaches
  // zero there.
  const lngDelta = latDelta / Math.max(Math.cos(lat * Math.PI / 180), 0.01);
  return [lat - latDelta, lat + latDelta, lng - lngDelta, lng + lngDelta];
}

export async function findHeldPois(db: D1Database, lookup: HeldPoiLookup): Promise<HeldPoi[]> {
  const sources = lookup.sources ?? ALL_SOURCES;
  // `dedupeName` has been through normalizePoiName, which strips everything
  // outside [a-z0-9 ] — so it cannot carry a LIKE wildcard.
  const nameOperator = lookup.prefix ? 'LIKE' : '=';
  const nameBind = lookup.prefix ? `${lookup.dedupeName}%` : lookup.dedupeName;
  const box = boundingBox(lookup.lat, lookup.lng, lookup.radiusMeters);
  // The per-source LIMIT must take the rows nearest the centre, not whatever
  // the name index yields first: a common name inside a wide box can exceed
  // the limit, and the exact distance filter below would then discard every
  // survivor while a nearer match was never fetched. Squared degrees with
  // longitude scaled by cos(lat) is a faithful enough proxy for ordering;
  // the exact haversine is still what decides membership.
  const lngScale = Math.max(Math.cos(lookup.lat * Math.PI / 180), 0.01);
  const proximity = (table: string) =>
    `((${table}.lat - ?) * (${table}.lat - ?) + ((${table}.lng - ?) * ?) * ((${table}.lng - ?) * ?))`;
  const proximityBinds = [lookup.lat, lookup.lat, lookup.lng, lngScale, lookup.lng, lngScale];
  const nameAndBox = [nameBind, ...box];

  const queries: Array<{ source: HeldPoiSource; sql: string; binds: unknown[] }> = [];
  if (sources.includes('overture')) {
    // Two index-backed branches rather than one OR: the second matches the
    // name a reviewer gave the row (`dedupe_name_override`), which is the
    // name the user sees and therefore the one a duplicate check must find.
    // poi_source_correction is a few hundred rows, so scanning it is cheap;
    // an OR across the join would have cost the overture_poi name index.
    const columns = `overture_poi.overture_id AS poi_id,
                   COALESCE(correction.name_override, overture_poi.name) AS name,
                   overture_poi.lat, overture_poi.lng, overture_poi.primary_poi_type, overture_poi.address`;
    queries.push({
      source: 'overture',
      sql: `SELECT * FROM (
              SELECT ${columns}
                FROM overture_poi
                LEFT JOIN poi_source_correction AS correction
                  ON correction.source = 'overture' AND correction.source_id = overture_poi.overture_id
               WHERE overture_poi.dedupe_name ${nameOperator} ?
                 AND overture_poi.lat BETWEEN ? AND ? AND overture_poi.lng BETWEEN ? AND ?
                 AND (correction.visible IS NULL OR correction.visible = 1)
                 AND overture_poi.retired_in_release IS NULL
              UNION
              SELECT ${columns}
                FROM poi_source_correction AS correction
                INNER JOIN overture_poi ON overture_poi.overture_id = correction.source_id
               WHERE correction.source = 'overture' AND correction.visible = 1
                 AND correction.dedupe_name_override ${nameOperator} ?
                 AND overture_poi.lat BETWEEN ? AND ? AND overture_poi.lng BETWEEN ? AND ?
                 AND overture_poi.retired_in_release IS NULL
            ) AS overture_poi
            ORDER BY ${proximity('overture_poi')}
            LIMIT ?`,
      binds: [...nameAndBox, ...nameAndBox, ...proximityBinds, lookup.perSourceLimit],
    });
  }
  if (sources.includes('community')) {
    queries.push({
      source: 'community',
      sql: `SELECT poi_id, name, lat, lng, primary_poi_type, address
              FROM curated_poi
             WHERE dedupe_name ${nameOperator} ?
               AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
               AND status = 'active'
               AND poi_id NOT LIKE 'multibanco:%'
             ORDER BY ${proximity('curated_poi')}
             LIMIT ?`,
      binds: [...nameAndBox, ...proximityBinds, lookup.perSourceLimit],
    });
  }
  if (sources.includes('multibanco')) {
    queries.push({
      source: 'multibanco',
      sql: `SELECT source_id AS poi_id, name, lat, lng, primary_poi_type, address
              FROM multibanco_poi
             WHERE dedupe_name ${nameOperator} ?
               AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
             ORDER BY ${proximity('multibanco_poi')}
             LIMIT ?`,
      binds: [...nameAndBox, ...proximityBinds, lookup.perSourceLimit],
    });
  }

  const results = await Promise.all(queries.map(query => db.prepare(query.sql).bind(...query.binds).all<HeldPoiRow>()));

  return queries
    .flatMap((query, index) => results[index].results.map(row => ({
      source: query.source,
      id: row.poi_id,
      name: row.name,
      lat: row.lat,
      lng: row.lng,
      poiType: row.primary_poi_type,
      address: row.address,
      distanceMeters: haversineMeters(lookup.lat, lookup.lng, row.lat, row.lng),
    })))
    .filter(candidate => candidate.distanceMeters <= lookup.radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .map(candidate => ({ ...candidate, distanceMeters: Math.round(candidate.distanceMeters) }));
}
