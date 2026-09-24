/**
 * KAN-343 — imports a covered destination's authenticated Cloudflare SQLite
 * export into the existing trip habitat cache. The downloaded database exists
 * only in memory; `writeTripAreaPlaces` is the durable, queryable cache.
 *
 * KAN-451 — the export is Overture-shaped (docs/kan-450-overture-place-build.md):
 * `poi` keyed by `overture_id`, with `_export_meta.source` naming the source.
 * An export built before KAN-450 is the older Foursquare shape (`fsq_place_id`,
 * no `source` column); it is still readable, tagged as what it is, so a Place
 * whose export has not been rebuilt yet degrades to stale data rather than
 * to a download error.
 */
import * as SQLite from 'expo-sqlite';
import { getDistanceMeters } from './geoDistance';
import { cloudflareExportProxy } from './cloudflarePoiFunctions';
import { writeTripAreaPlaces } from './habitatCache';
import type { PlaceCandidate } from './habitatCache';
import type { PlaceSourceRef } from './placeIdentity';

type ExportRow = {
  source_id: string;
  name: string;
  name_local: string | null;
  name_en: string | null;
  name_local_lang: string | null;
  lat: number;
  lng: number;
  poi_type: string;
  brand: string | null;
};

/** How one export names its rows: the id column, and the identity namespace it belongs to. */
export interface ExportShape {
  idColumn: 'overture_id' | 'fsq_place_id';
  ref: (id: string) => PlaceSourceRef;
}

const OVERTURE_SHAPE: ExportShape = { idColumn: 'overture_id', ref: id => ({ overture: id }) };
const FOURSQUARE_SHAPE: ExportShape = { idColumn: 'fsq_place_id', ref: id => ({ fsq: id }) };

/**
 * Reads `_export_meta` to decide the shape. `source` exists only on
 * Overture exports; its absence is the Foursquare shape. Any other value is
 * refused — a new source needs a decision here, not a silent guess.
 */
export async function detectExportShape(database: SQLite.SQLiteDatabase): Promise<ExportShape> {
  const columns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(_export_meta)');
  if (!columns.some(column => column.name === 'source')) return FOURSQUARE_SHAPE;
  const meta = await database.getFirstAsync<{ source: string }>('SELECT source FROM _export_meta LIMIT 1');
  if (meta?.source === 'overture_places') return OVERTURE_SHAPE;
  throw new Error(`Cloudflare export names an unknown source: ${meta?.source ?? 'none'}`);
}

function bounds(center: { lat: number; lng: number }, radiusMeters: number) {
  const latDelta = radiusMeters / 111_320;
  const lngDelta = radiusMeters / (111_320 * Math.max(Math.cos(center.lat * Math.PI / 180), 0.01));
  return { minLat: center.lat - latDelta, maxLat: center.lat + latDelta, minLng: center.lng - lngDelta, maxLng: center.lng + lngDelta };
}

/** Downloads then fully validates the export before replacing a trip area. */
export async function importCloudflareTripExport(
  placeId: string,
  center: { lat: number; lng: number },
  radiusMeters: number,
  cacheAreaId: string,
  expiresAt: number,
  poiTypes: string[],
): Promise<number> {
  const data = await cloudflareExportProxy(placeId);
  const database = await SQLite.deserializeDatabaseAsync(data);
  try {
    const shape = await detectExportShape(database);
    const poiColumns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(poi)');
    const nameColumn = (column: string) => poiColumns.some(item => item.name === column)
      ? `p.${column}` : `NULL AS ${column}`;
    const box = bounds(center, radiusMeters);
    const placeholders = poiTypes.map(() => '?').join(',');
    const rows = await database.getAllAsync<ExportRow>(
      `SELECT p.${shape.idColumn} AS source_id, p.name,
              ${nameColumn('name_local')}, ${nameColumn('name_en')}, ${nameColumn('name_local_lang')},
              p.lat, p.lng, p.brand, pt.poi_type
       FROM poi p JOIN poi_type pt ON pt.${shape.idColumn} = p.${shape.idColumn}
       WHERE p.lat BETWEEN ? AND ? AND p.lng BETWEEN ? AND ?
         AND pt.poi_type IN (${placeholders})`,
      [box.minLat, box.maxLat, box.minLng, box.maxLng, ...poiTypes],
    );
    const places: PlaceCandidate[] = rows
      .filter(row => getDistanceMeters(center.lat, center.lng, row.lat, row.lng) <= radiusMeters)
      .map(row => ({
        poiType: row.poi_type,
        name: row.name,
        nameLocal: row.name_local,
        nameEn: row.name_en,
        nameLocalLang: row.name_local_lang,
        lat: row.lat,
        lng: row.lng,
        brand: row.brand,
        source: shape.ref(row.source_id),
      }));
    if (places.length === 0) throw new Error('Cloudflare export returned no places for this trip area');
    return writeTripAreaPlaces(cacheAreaId, expiresAt, places);
  } finally {
    await database.closeAsync();
  }
}
