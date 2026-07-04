/**
 * habitatCache.ts — offline "habitat" POI cache (KAN-228).
 *
 * A local SQLite cache of POIs sourced from OpenStreetMap (see osmPlaces.ts),
 * refreshed opportunistically whenever the live proximity search runs online
 * (wired in proximity.ts). No separate "frequently visited area" detection —
 * caching around wherever the live search already runs means places the user
 * actually visits stay fresh (re-refreshed each time), while rarely-visited
 * ones simply go stale and get evicted under the size budget. "Habitat"
 * emerges as a property of the cache's contents rather than a tracked signal.
 *
 * Cross-source place identity: the same physical place may be seen via
 * Google (live search, has a placeId) or OSM (cache refresh, has an osmId).
 * `upsertPlace` is the single entry point both paths go through — it matches
 * an incoming candidate against existing rows (same POI type, within
 * IDENTITY_MATCH_RADIUS_M, similar normalized name) and merges the source ref
 * in rather than creating a duplicate, so a place seen via one source today
 * and the other tomorrow resolves to the same internal id. Consumers must
 * always key off this internal id, never a raw source id (KAN-228 AC).
 *
 * Google coordinates are never persisted long-term (Places ToS forbids it —
 * place IDs only): a Google-sourced candidate can only *merge into* an
 * already OSM-anchored row (updating its identity ref), never create a new
 * row or overwrite a row's lat/lng. Only OSM-sourced candidates create rows
 * or move a row's coordinates. `osm_fetched_at` tracks OSM freshness
 * specifically (for the 14-day staleness check) — `last_matched_at` tracks
 * any sighting (Google or OSM) for LRU eviction.
 *
 * Note: does NOT read from the cache to answer live proximity queries — that
 * wiring is KAN-229 ("cache-backed offline proximity"). This file only
 * builds and maintains the cache; queryHabitatCache is exposed for KAN-229
 * to call.
 */

import * as SQLite from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';
import { normalize } from './poiInference';
import { searchOsmPlaces } from './osmPlaces';
import type { NearbyPlace } from './maps';
import { getDistanceMeters } from './maps';

// ─── Constants ────────────────────────────────────────────────────────────────

/** A cached place's OSM data is re-fetched once older than this. */
export const HABITAT_CACHE_STALE_MS = 14 * 24 * 60 * 60 * 1_000; // 14 days

/** Default query/refresh radius around a search origin. */
export const HABITAT_RADIUS_M = 5_000;

/** Hard cap on total cached rows — keeps the on-device footprint small. */
export const MAX_CACHED_PLACES = 2_000;

/** Two candidates within this distance (same POI type, similar name) are treated as the same place. */
const IDENTITY_MATCH_RADIUS_M = 150;

/** Caps each query type bucket, matching maps.ts's searchNearbyPlaces behavior. */
const MAX_RESULTS_PER_TYPE = 5;

const DB_NAME = 'habitat_cache.db';

const DEG_TO_RAD = Math.PI / 180;
const METRES_PER_DEGREE_LAT = 111_195;

/**
 * A bounding box (in degrees) around lat/lng covering radiusMeters in every
 * direction. Longitude degrees shrink toward the poles (they're only
 * equivalent to latitude degrees at the equator), so the longitude delta is
 * corrected by cos(latitude) — clamped away from 0 so it never blows up near
 * the poles.
 */
function boundingBoxDeg(lat: number, lng: number, radiusMeters: number) {
  const latDeg = radiusMeters / METRES_PER_DEGREE_LAT;
  const cosLat = Math.max(Math.cos(lat * DEG_TO_RAD), 0.01);
  const lngDeg = radiusMeters / (METRES_PER_DEGREE_LAT * cosLat);
  return {
    latMin: lat - latDeg, latMax: lat + latDeg,
    lngMin: lng - lngDeg, lngMax: lng + lngDeg,
  };
}

// ─── DB handle (lazy, cached) ─────────────────────────────────────────────────

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync(DB_NAME);
    db.execSync(`
      CREATE TABLE IF NOT EXISTS habitat_places (
        id TEXT PRIMARY KEY,
        poi_type TEXT NOT NULL,
        name TEXT NOT NULL,
        is_generic_name INTEGER NOT NULL DEFAULT 0,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        google_place_id TEXT,
        osm_id TEXT,
        osm_fetched_at INTEGER NOT NULL,
        last_matched_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_habitat_poi_type ON habitat_places(poi_type);
    `);
  }
  return db;
}

/** Test-only: drop the cached DB handle so the next call re-opens/re-migrates. */
export function __resetHabitatDbForTests(): void {
  db = null;
}

// ─── Row shape ────────────────────────────────────────────────────────────────

export interface HabitatRow {
  id: string;
  poi_type: string;
  name: string;
  is_generic_name: number;
  lat: number;
  lng: number;
  google_place_id: string | null;
  osm_id: string | null;
  osm_fetched_at: number;
  last_matched_at: number;
}

function generateId(): string {
  return `hp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Identity resolution ──────────────────────────────────────────────────────

export interface PlaceCandidate {
  poiType: string;
  name: string;
  /** True when `name` is a generic tag-value fallback, not a real identifying name (see osmPlaces.ts). */
  isGenericName?: boolean;
  lat: number;
  lng: number;
  source: { google?: string; osm?: string };
}

/**
 * Resolve `candidate` to a stable internal place id: if an existing row of
 * the same POI type within IDENTITY_MATCH_RADIUS_M has a matching name,
 * merges the candidate's source ref into that row and returns its id.
 * Otherwise inserts a new row (OSM-sourced candidates only — see module
 * docs on why Google coordinates never create/move a row) and returns the
 * new id, or a transient (unpersisted) id for a Google-only candidate with
 * no existing match.
 *
 * Name matching: when either the candidate or the matched row has a generic
 * fallback name, only an exact normalized match counts — substring/contains
 * matching is reserved for real names, since a generic name like "pharmacy"
 * is a substring of nearly every real pharmacy's name and would otherwise
 * wrongly merge unrelated places.
 *
 * Never throws — a DB failure logs and returns a fresh (unpersisted) id
 * rather than blocking the caller (same "never blocks the app" contract as
 * the rest of the proximity stack).
 */
function findMatchingRow(
  database: SQLite.SQLiteDatabase,
  poiType: string,
  name: string,
  isGenericName: boolean | undefined,
  lat: number,
  lng: number,
): HabitatRow | null {
  const box = boundingBoxDeg(lat, lng, IDENTITY_MATCH_RADIUS_M);
  const rows = database.getAllSync<HabitatRow>(
    `SELECT * FROM habitat_places
     WHERE poi_type = ?
       AND lat BETWEEN ? AND ?
       AND lng BETWEEN ? AND ?`,
    [poiType, box.latMin, box.latMax, box.lngMin, box.lngMax],
  );

  const candidateName = normalize(name);
  const candidateIsGeneric = isGenericName === true;
  return rows.find(row => {
    const dist = getDistanceMeters(lat, lng, row.lat, row.lng);
    if (dist > IDENTITY_MATCH_RADIUS_M) { return false; }
    const rowName = normalize(row.name);
    if (candidateIsGeneric || row.is_generic_name === 1) {
      return rowName === candidateName;
    }
    return rowName === candidateName || rowName.includes(candidateName) || candidateName.includes(rowName);
  }) ?? null;
}

/**
 * Read-only lookup: returns the internal id of an already-established
 * cross-source identity match, or null if this place has no counterpart in
 * the cache yet. Unlike `upsertPlace`, never inserts/updates a row — used by
 * KAN-229 to reconcile a live Google result with its cache identity (when
 * one already exists) without minting a throwaway id for places that have no
 * match yet, which would defeat the whole point (a fresh random id on every
 * search instead of the place's own stable Google placeId).
 *
 * Never throws — a DB failure returns null (caller falls back to the
 * place's own source id, same as if no match existed).
 */
export function findExistingPlaceId(
  poiType: string,
  name: string,
  lat: number,
  lng: number,
  isGenericName?: boolean,
): string | null {
  try {
    const match = findMatchingRow(getDb(), poiType, name, isGenericName, lat, lng);
    return match?.id ?? null;
  } catch (err) {
    console.warn('[habitatCache] findExistingPlaceId failed', err);
    return null;
  }
}

export function upsertPlace(candidate: PlaceCandidate): string {
  try {
    const database = getDb();
    const now = Date.now();
    const isOsmSourced = candidate.source.osm != null;

    const match = findMatchingRow(
      database, candidate.poiType, candidate.name, candidate.isGenericName,
      candidate.lat, candidate.lng,
    );

    if (match) {
      const osmFlag = isOsmSourced ? 1 : 0;
      database.runSync(
        `UPDATE habitat_places
         SET google_place_id = COALESCE(google_place_id, ?),
             osm_id          = COALESCE(osm_id, ?),
             lat             = CASE WHEN ? = 1 THEN ? ELSE lat END,
             lng             = CASE WHEN ? = 1 THEN ? ELSE lng END,
             osm_fetched_at  = CASE WHEN ? = 1 THEN ? ELSE osm_fetched_at END,
             last_matched_at = ?
         WHERE id = ?`,
        [
          candidate.source.google ?? null, candidate.source.osm ?? null,
          osmFlag, candidate.lat, osmFlag, candidate.lng, osmFlag, now,
          now, match.id,
        ],
      );
      return match.id;
    }

    // No existing row. Google coordinates are never persisted long-term
    // (Places ToS) — only an OSM-anchored candidate may create a new row.
    if (!isOsmSourced) { return generateId(); }

    const id = generateId();
    database.runSync(
      `INSERT INTO habitat_places
         (id, poi_type, name, is_generic_name, lat, lng, google_place_id, osm_id, osm_fetched_at, last_matched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, candidate.poiType, candidate.name, candidate.isGenericName === true ? 1 : 0, candidate.lat, candidate.lng,
        candidate.source.google ?? null, candidate.source.osm ?? null, now, now],
    );
    return id;
  } catch (err) {
    console.warn('[habitatCache] upsertPlace failed', err);
    return generateId();
  }
}

/**
 * Feeds a live (Google-sourced) search hit into the cache's identity table.
 * Never creates a new row or persists Google coordinates — see upsertPlace.
 */
export function recordLiveResult(candidate: {
  poiType: string;
  name: string;
  lat: number;
  lng: number;
  googlePlaceId: string;
}): void {
  upsertPlace({
    poiType: candidate.poiType,
    name:    candidate.name,
    lat:     candidate.lat,
    lng:     candidate.lng,
    source:  { google: candidate.googlePlaceId },
  });
}

// ─── Query ────────────────────────────────────────────────────────────────────

/**
 * Query the cache for places of the given POI types within `radiusMeters` of
 * `lat`/`lng`. Shaped identically to maps.ts's searchNearbyPlaces (internal
 * id in the `placeId` field, capped at 5 results per type) so consumers stay
 * source-agnostic and KAN-229 can swap this in without changing call sites.
 *
 * Never throws — a DB failure returns an empty result per type.
 */
export function queryHabitatCache(
  lat: number,
  lng: number,
  poiTypes: string[],
  radiusMeters: number = HABITAT_RADIUS_M,
): Record<string, NearbyPlace[]> {
  const result: Record<string, NearbyPlace[]> = {};
  for (const poiType of poiTypes) { result[poiType] = []; }
  if (poiTypes.length === 0) { return result; }

  try {
    const database = getDb();
    const box = boundingBoxDeg(lat, lng, radiusMeters);
    const placeholders = poiTypes.map(() => '?').join(',');
    const rows = database.getAllSync<HabitatRow>(
      `SELECT * FROM habitat_places
       WHERE poi_type IN (${placeholders})
         AND lat BETWEEN ? AND ?
         AND lng BETWEEN ? AND ?`,
      [...poiTypes, box.latMin, box.latMax, box.lngMin, box.lngMax],
    );

    for (const row of rows) {
      const distanceMeters = getDistanceMeters(lat, lng, row.lat, row.lng);
      if (distanceMeters > radiusMeters) { continue; }
      result[row.poi_type]?.push({
        placeId: row.id,
        name:    row.name,
        lat:     row.lat,
        lng:     row.lng,
        distanceMeters,
      });
    }

    for (const poiType of poiTypes) {
      result[poiType].sort((a, b) => a.distanceMeters - b.distanceMeters);
      if (result[poiType].length > MAX_RESULTS_PER_TYPE) {
        result[poiType] = result[poiType].slice(0, MAX_RESULTS_PER_TYPE);
      }
    }
  } catch (err) {
    console.warn('[habitatCache] queryHabitatCache failed', err);
  }

  return result;
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

/**
 * Opportunistically refreshes the cache around `lat`/`lng` for `poiTypes`:
 * if online and the area has no OSM-fetched rows or any are older than
 * HABITAT_CACHE_STALE_MS, fetches fresh data from OSM and upserts it, then
 * enforces the size budget.
 *
 * Freshness is judged by `osm_fetched_at` specifically, not by any live
 * Google sighting — otherwise seeding Google results (which also touch a
 * row's last_matched_at, but never osm_fetched_at) could never itself mask a
 * genuinely stale OSM refresh.
 *
 * Fire-and-forget from the caller's perspective — never throws.
 */
export async function refreshHabitatCacheIfStale(
  lat: number,
  lng: number,
  poiTypes: string[],
): Promise<void> {
  if (poiTypes.length === 0) { return; }

  try {
    let isConnected: boolean | null = null;
    try { isConnected = (await NetInfo.fetch()).isConnected; } catch { /* treat as unknown */ }
    if (isConnected === false) { return; }

    const database = getDb();
    const box = boundingBoxDeg(lat, lng, HABITAT_RADIUS_M);
    const placeholders = poiTypes.map(() => '?').join(',');
    const staleCutoff = Date.now() - HABITAT_CACHE_STALE_MS;

    const freshRows = database.getAllSync<{ poi_type: string }>(
      `SELECT poi_type FROM habitat_places
       WHERE poi_type IN (${placeholders})
         AND lat BETWEEN ? AND ?
         AND lng BETWEEN ? AND ?
         AND osm_id IS NOT NULL
         AND osm_fetched_at >= ?`,
      [...poiTypes, box.latMin, box.latMax, box.lngMin, box.lngMax, staleCutoff],
    );
    const freshTypes = new Set(freshRows.map(r => r.poi_type));
    const staleTypes = poiTypes.filter(t => !freshTypes.has(t));
    if (staleTypes.length === 0) { return; }

    const osmResults = await searchOsmPlaces(lat, lng, staleTypes, HABITAT_RADIUS_M);
    for (const poiType of staleTypes) {
      for (const place of osmResults[poiType] ?? []) {
        upsertPlace({
          poiType,
          name:          place.name,
          isGenericName: place.isGenericName,
          lat:           place.lat,
          lng:           place.lng,
          source:        { osm: place.osmId },
        });
      }
    }

    enforceSizeBudget();
  } catch (err) {
    console.warn('[habitatCache] refreshHabitatCacheIfStale failed', err);
  }
}

// ─── Size budget ──────────────────────────────────────────────────────────────

/** Deletes the oldest (by last_matched_at) rows beyond MAX_CACHED_PLACES. */
export function enforceSizeBudget(): void {
  try {
    const database = getDb();
    const [{ count } = { count: 0 }] = database.getAllSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM habitat_places',
    );
    if (count <= MAX_CACHED_PLACES) { return; }

    database.runSync(
      `DELETE FROM habitat_places WHERE id IN (
         SELECT id FROM habitat_places ORDER BY last_matched_at ASC LIMIT ?
       )`,
      [count - MAX_CACHED_PLACES],
    );
  } catch (err) {
    console.warn('[habitatCache] enforceSizeBudget failed', err);
  }
}
