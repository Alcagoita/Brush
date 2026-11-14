/**
 * KAN-382. A shopping centre's full inventory: every valid place the
 * registry serves inside the centre's outline, with its floor.
 *
 * WHY NOT /poi/nearby
 *
 * Nearby is a radius around the user, capped at 50 per type. A centre is a
 * building with hundreds of units (NorteShopping 279), and inside it the app
 * shows floors, not distances (KAN-512). So the app downloads the centre as
 * a whole, in pages, once, and searches it offline.
 *
 * MEMBERSHIP IS THE OUTLINE
 *
 * A unit belongs to a centre when its coordinate is inside the centre's
 * strict outline (`extraction/mall_lists/footprints.json`, OSM `shop=mall`).
 * Not a radius: a radius swallows the street outside and clips the far end
 * of an irregular building. The outline is the same one the extraction
 * pipeline's manual-only rule uses, so "inside a centre" means one thing.
 *
 * The answer is every valid place there, from every source the registry
 * serves (Overture, curated, MULTIBANCO), with the same filters and the same
 * twin rule as /poi/nearby — retired and hidden Overture rows out, removed
 * curated rows out, one shop held twice shown once. The app makes no
 * distinction by source; this is the same contract.
 *
 * STABLE PAGES
 *
 * Units are ordered by `key` (`source:poi_id`), and the cursor is the last
 * key of the page. `version` is a hash of the whole inventory: if it changes
 * between pages, the centre changed mid-download and the client starts over
 * rather than mixing two states.
 */
import footprints from '../extraction/mall_lists/footprints.json';
import { haversineMeters, neighborPrefixes, precisionForRadius } from './geohash';
import { suppressDuplicates } from './duplicateSuppression';
import { parseSourceNames } from './sourceNames';

type Ring = [number, number][];

export interface Venue {
  id: string;
  name: string;
  osm: string;
  centroid: [number, number];
  rings: Ring[];
}

export interface VenueUnit {
  /** `source:poi_id`, unique across sources; the paging key. */
  key: string;
  poi_id: string;
  source: 'overture' | 'community' | 'multibanco';
  name: string;
  name_local: string;
  name_local_lang: string | null;
  names: Record<string, string>;
  country_code: string | null;
  lat: number;
  lng: number;
  primary_poi_type: string;
  /** Every type the unit answers (primary first, then the rest sorted). */
  types: string[];
  brand: string | null;
  address: string | null;
  /** Bare integer string ("-1", "0", "2") or null — KAN-503. */
  floor: string | null;
  open_min: number | null;
  close_min: number | null;
  attributes: Record<string, string[]>;
}

const CURATED_EXTRA_TYPE_DIMENSION = 'poi_type';
/** Membership is the strict outline; this only widens the D1 read so no vertex is clipped. */
const READ_MARGIN_M = 10;
export const DEFAULT_PAGE_SIZE = 100;
export const MAX_PAGE_SIZE = 200;

const VENUES: Venue[] = Object.entries(footprints as Record<string, {
  id: string; osm: string; centroid: number[]; rings: number[][][];
}>)
  .map(([name, footprint]) => ({
    id: footprint.id,
    name,
    osm: footprint.osm,
    centroid: [footprint.centroid[0], footprint.centroid[1]] as [number, number],
    rings: footprint.rings.map(ring => ring.map(point => [point[0], point[1]] as [number, number])),
  }))
  .sort((a, b) => a.id.localeCompare(b.id));

export function listVenues(): Venue[] {
  return VENUES;
}

export function findVenue(id: string): Venue | null {
  return VENUES.find(venue => venue.id === id) ?? null;
}

/** Ray casting, even-odd across rings: a hole (inner ring) is outside. */
export function insideRings(lat: number, lng: number, rings: Ring[]): boolean {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [latI, lngI] = ring[i];
      const [latJ, lngJ] = ring[j];
      if ((lngI > lng) !== (lngJ > lng)
        && lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI) {
        inside = !inside;
      }
    }
  }
  return inside;
}

function boundingBox(venue: Venue) {
  const points = venue.rings.flat();
  return {
    minLat: Math.min(...points.map(p => p[0])), maxLat: Math.max(...points.map(p => p[0])),
    minLng: Math.min(...points.map(p => p[1])), maxLng: Math.max(...points.map(p => p[1])),
  };
}

/** FNV-1a, 32-bit, as hex. A change detector, not a security property. */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

type Candidate = VenueUnit & {
  dedupeName: string; typeSet: Set<string>; demoZone: boolean;
};

function addAttribute(target: Record<string, string[]>, dimension: string | null, value: string | null) {
  if (!dimension || !value) return;
  const values = target[dimension] ??= [];
  if (!values.includes(value)) values.push(value);
}

export async function queryVenueUnits(db: D1Database, venue: Venue): Promise<{ units: VenueUnit[]; version: string }> {
  const [centroidLat, centroidLng] = venue.centroid;
  const radius = Math.max(...venue.rings.flat()
    .map(([lat, lng]) => haversineMeters(centroidLat, centroidLng, lat, lng))) + READ_MARGIN_M;
  const prefixes = neighborPrefixes(centroidLat, centroidLng, precisionForRadius(radius), radius);
  const ranges = prefixes.flatMap(prefix => [prefix, `${prefix}~`]);
  const box = boundingBox(venue);
  const pad = READ_MARGIN_M / 111320;
  const boxBinds = [box.minLat - pad, box.maxLat + pad, box.minLng - pad * 1.3, box.maxLng + pad * 1.3];
  const geohashClause = (table: string) => prefixes
    .map(() => `(${table}.geohash >= ? AND ${table}.geohash < ?)`).join(' OR ');
  const boxClause = (table: string) => `${table}.lat BETWEEN ? AND ? AND ${table}.lng BETWEEN ? AND ?`;

  const [{ results: overtureRows }, { results: curatedRows }, { results: multibancoRows }] = await Promise.all([
    db.prepare(
      `SELECT overture_poi.overture_id, overture_poi.dedupe_name, overture_poi.name,
              overture_poi.name_local, overture_poi.name_local_lang,
              overture_poi.names_json, overture_poi.country_code,
              overture_poi.lat, overture_poi.lng, overture_poi.primary_poi_type,
              overture_poi.brand, overture_poi.address, overture_poi.floor,
              overture_poi.open_min, overture_poi.close_min,
              overture_poi_type.poi_type AS matched_type,
              overture_poi_attribute.dimension AS attribute_dimension,
              overture_poi_attribute.value AS attribute_value,
              overture_correction.visible AS correction_visible,
              overture_correction.name_override AS correction_name_override,
              overture_correction.dedupe_name_override AS correction_dedupe_name_override
         FROM overture_poi
         LEFT JOIN overture_poi_type ON overture_poi_type.overture_id = overture_poi.overture_id
         LEFT JOIN overture_poi_attribute ON overture_poi_attribute.overture_id = overture_poi.overture_id
           AND overture_poi_attribute.dimension IN ('food_cuisine', 'store_kind', 'financial_service_kind')
         LEFT JOIN poi_source_correction AS overture_correction
           ON overture_correction.source = 'overture' AND overture_correction.source_id = overture_poi.overture_id
        WHERE overture_poi.retired_in_release IS NULL
          AND (${geohashClause('overture_poi')}) AND ${boxClause('overture_poi')}`,
    ).bind(...ranges, ...boxBinds).all<{
      overture_id: string; dedupe_name: string; name: string; name_local: string | null;
      name_local_lang: string | null; names_json: string | null; country_code: string | null;
      lat: number; lng: number; primary_poi_type: string; brand: string | null;
      address: string | null; floor: string | null; open_min: number | null; close_min: number | null;
      matched_type: string | null; attribute_dimension: string | null; attribute_value: string | null;
      correction_visible: number | null; correction_name_override: string | null;
      correction_dedupe_name_override: string | null;
    }>(),
    db.prepare(
      `SELECT curated_poi.poi_id, curated_poi.dedupe_name, curated_poi.name,
              curated_poi.name_local, curated_poi.name_local_lang,
              curated_poi.names_json, curated_poi.country_code,
              curated_poi.lat, curated_poi.lng, curated_poi.primary_poi_type,
              curated_poi.brand, curated_poi.address, curated_poi.floor,
              curated_poi_attribute.dimension AS attribute_dimension,
              curated_poi_attribute.value AS attribute_value
         FROM curated_poi
         LEFT JOIN curated_poi_attribute ON curated_poi_attribute.poi_id = curated_poi.poi_id
        WHERE curated_poi.status = 'active'
          AND curated_poi.poi_id NOT LIKE 'multibanco:%'
          AND (${geohashClause('curated_poi')}) AND ${boxClause('curated_poi')}`,
    ).bind(...ranges, ...boxBinds).all<{
      poi_id: string; dedupe_name: string; name: string; name_local: string | null;
      name_local_lang: string | null; names_json: string | null; country_code: string | null;
      lat: number; lng: number; primary_poi_type: string; brand: string | null;
      address: string | null; floor: string | null;
      attribute_dimension: string | null; attribute_value: string | null;
    }>(),
    db.prepare(
      `SELECT source_id, dedupe_name, name, lat, lng, primary_poi_type, address, is_demo_zone
         FROM multibanco_poi
        WHERE (${geohashClause('multibanco_poi')}) AND ${boxClause('multibanco_poi')}`,
    ).bind(...ranges, ...boxBinds).all<{
      source_id: string; dedupe_name: string; name: string; lat: number; lng: number;
      primary_poi_type: string; address: string | null; is_demo_zone: number;
    }>(),
  ]);

  const candidates = new Map<string, Candidate>();
  const inside = (lat: number, lng: number) => insideRings(lat, lng, venue.rings);

  for (const row of overtureRows) {
    if (row.correction_visible === 0 || !inside(row.lat, row.lng)) continue;
    const key = `overture:${row.overture_id}`;
    let candidate = candidates.get(key);
    if (!candidate) {
      const overridden = row.correction_name_override != null;
      candidate = {
        key, poi_id: row.overture_id, source: 'overture',
        name: row.correction_name_override ?? row.name,
        name_local: overridden ? '' : row.name_local ?? '',
        name_local_lang: overridden ? null : row.name_local_lang,
        names: overridden ? {} : parseSourceNames(row.names_json),
        country_code: row.country_code, lat: row.lat, lng: row.lng,
        primary_poi_type: row.primary_poi_type, types: [], brand: row.brand,
        address: row.address, floor: row.floor, open_min: row.open_min, close_min: row.close_min,
        attributes: {}, dedupeName: row.correction_dedupe_name_override ?? row.dedupe_name,
        typeSet: new Set([row.primary_poi_type]), demoZone: false,
      };
      candidates.set(key, candidate);
    }
    if (row.matched_type) candidate.typeSet.add(row.matched_type);
    addAttribute(candidate.attributes, row.attribute_dimension, row.attribute_value);
  }

  for (const row of curatedRows) {
    if (!inside(row.lat, row.lng)) continue;
    const key = `community:${row.poi_id}`;
    let candidate = candidates.get(key);
    if (!candidate) {
      candidate = {
        key, poi_id: row.poi_id, source: 'community',
        name: row.name, name_local: row.name_local ?? '', name_local_lang: row.name_local_lang,
        names: parseSourceNames(row.names_json), country_code: row.country_code,
        lat: row.lat, lng: row.lng, primary_poi_type: row.primary_poi_type, types: [],
        brand: row.brand, address: row.address, floor: row.floor,
        // Community rows carry no curated hours yet: NULL is KAN-318's
        // always-open default, as on /poi/nearby.
        open_min: null, close_min: null, attributes: {}, dedupeName: row.dedupe_name,
        typeSet: new Set([row.primary_poi_type]), demoZone: false,
      };
      candidates.set(key, candidate);
    }
    // A `poi_type` attribute is the row's second type (KAN-433), not a subtype.
    if (row.attribute_dimension === CURATED_EXTRA_TYPE_DIMENSION) {
      if (row.attribute_value) candidate.typeSet.add(row.attribute_value);
    } else {
      addAttribute(candidate.attributes, row.attribute_dimension, row.attribute_value);
    }
  }

  for (const row of multibancoRows) {
    if (!inside(row.lat, row.lng)) continue;
    const key = `multibanco:${row.source_id}`;
    candidates.set(key, {
      key, poi_id: row.source_id, source: 'multibanco',
      name: row.name, name_local: '', name_local_lang: null, names: {}, country_code: null,
      lat: row.lat, lng: row.lng, primary_poi_type: row.primary_poi_type, types: [],
      brand: null, address: row.address, floor: null, open_min: null, close_min: null,
      attributes: {}, dedupeName: row.dedupe_name,
      typeSet: new Set([row.primary_poi_type]), demoZone: row.is_demo_zone === 1,
    });
  }

  suppressDuplicates(candidates);

  const units: VenueUnit[] = [...candidates.values()]
    .map(({ dedupeName: _d, typeSet, demoZone: _z, ...unit }) => ({
      ...unit,
      // As on /poi/nearby: a missing local name falls back to the source name.
      name_local: unit.name_local.trim() || unit.name,
      types: [unit.primary_poi_type, ...[...typeSet].filter(t => t !== unit.primary_poi_type).sort()],
      attributes: Object.fromEntries(Object.entries(unit.attributes)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dimension, values]) => [dimension, [...values].sort()])),
    }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  const version = fnv1a(JSON.stringify({ outline: venue.rings, units }));
  return { units, version };
}

export function pageVenueUnits(units: VenueUnit[], cursor: string | null, limit: number) {
  const start = cursor == null ? 0 : units.findIndex(unit => unit.key > cursor);
  const from = start < 0 ? units.length : start;
  const page = units.slice(from, from + limit);
  const more = from + page.length < units.length;
  return { page, nextCursor: more && page.length > 0 ? page[page.length - 1].key : null };
}
