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
 *
 * Trip areas (KAN-234): a manually-downloaded travel area writes rows via
 * upsertTripPlace instead of upsertPlace, tagging them with a cache_area_id
 * (joins to the Trip Firestore doc) and an expires_at (date-tied to the
 * trip, instead of the opportunistic pool's osm_fetched_at/staleness
 * regime). Trip rows are exempt from enforceSizeBudget's LRU eviction —
 * only deleteExpiredTripPlaces or an explicit deleteTripAreaPlaces (trip
 * deletion) removes them — so an unrelated burst of opportunistic caching
 * elsewhere can never silently evict an unexpired trip's coverage.
 * queryHabitatCache is untouched: it already answers by lat/lng + poiType
 * regardless of cache_area_id, so a downloaded trip area transparently
 * serves offline queries once the user is physically there.
 */

import * as SQLite from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';
import { normalize } from './poiInference';
import { searchOsmPlaces } from './osmPlaces';
import type { NearbyPlace } from './maps';
import { getDistanceMeters } from './maps';
import { POI_OSM_TAGS } from '../types';

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
    // Only commit to the module-level `db` cache once every migration step
    // below has succeeded — assigning it upfront would mean a mid-migration
    // failure (e.g. the ALTER TABLE throwing on a real error) permanently
    // wedges the cache: `if (!db)` would be false forever after, so a later
    // call would never retry and would just hand back a half-migrated
    // handle for the rest of the process's lifetime.
    const database = SQLite.openDatabaseSync(DB_NAME);
    database.execSync(`
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
    // KAN-234 migration — habitat_places predates the cache_area_id/expires_at
    // columns (trip-area tagging + date-tied expiry), and CREATE TABLE IF NOT
    // EXISTS won't retrofit columns onto an already-existing on-device DB.
    // Check the actual schema instead of blindly ALTER-then-catch, so a real
    // failure (disk full, corruption) surfaces instead of being masked by a
    // blanket catch.
    const existingColumns = new Set(
      database.getAllSync<{ name: string }>('PRAGMA table_info(habitat_places)').map(c => c.name),
    );
    if (!existingColumns.has('cache_area_id')) {
      database.execSync('ALTER TABLE habitat_places ADD COLUMN cache_area_id TEXT');
    }
    if (!existingColumns.has('expires_at')) {
      database.execSync('ALTER TABLE habitat_places ADD COLUMN expires_at INTEGER');
    }
    database.execSync('CREATE INDEX IF NOT EXISTS idx_habitat_cache_area ON habitat_places(cache_area_id);');
    db = database;
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
  /** Non-null when this row belongs to a KAN-234 trip download — joins to Trip.cacheAreaId. Null for ordinary opportunistic habitat rows. */
  cache_area_id: string | null;
  /** Epoch ms this row is valid until (trip rows only) — null for ordinary habitat rows, which are governed by osm_fetched_at/HABITAT_CACHE_STALE_MS instead. */
  expires_at: number | null;
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

/** Only set on a KAN-234 trip download's writes — plain upsertPlace calls never pass this. */
interface TripStamp { cacheAreaId: string; expiresAt: number; }

/**
 * Does the actual identity-merge/insert. Never catches — callers choose how
 * failures should behave: upsertPlaceInternal (below) swallows them for the
 * opportunistic never-throws contract; writeTripAreaPlaces lets them abort
 * (and roll back) a trip download's transaction instead.
 */
function upsertPlaceCore(candidate: PlaceCandidate, trip?: TripStamp): string {
  const database = getDb();
  const now = Date.now();
  const isOsmSourced = candidate.source.osm != null;

  const match = findMatchingRow(
    database, candidate.poiType, candidate.name, candidate.isGenericName,
    candidate.lat, candidate.lng,
  );

  if (match) {
    const osmFlag = isOsmSourced ? 1 : 0;
    const tripCacheAreaId = trip?.cacheAreaId ?? null;
    const tripExpiresAt = trip?.expiresAt ?? null;
    database.runSync(
      `UPDATE habitat_places
       SET google_place_id = COALESCE(google_place_id, ?),
           osm_id          = COALESCE(osm_id, ?),
           lat             = CASE WHEN ? = 1 THEN ? ELSE lat END,
           lng             = CASE WHEN ? = 1 THEN ? ELSE lng END,
           osm_fetched_at  = CASE WHEN ? = 1 THEN ? ELSE osm_fetched_at END,
           cache_area_id   = COALESCE(cache_area_id, ?),
           expires_at      = CASE
                                WHEN ? IS NULL THEN expires_at
                                WHEN expires_at IS NULL THEN ?
                                ELSE MAX(expires_at, ?)
                              END,
           last_matched_at = ?
       WHERE id = ?`,
      [
        candidate.source.google ?? null, candidate.source.osm ?? null,
        osmFlag, candidate.lat, osmFlag, candidate.lng, osmFlag, now,
        tripCacheAreaId,
        tripExpiresAt, tripExpiresAt, tripExpiresAt,
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
       (id, poi_type, name, is_generic_name, lat, lng, google_place_id, osm_id, osm_fetched_at, last_matched_at, cache_area_id, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, candidate.poiType, candidate.name, candidate.isGenericName === true ? 1 : 0, candidate.lat, candidate.lng,
      candidate.source.google ?? null, candidate.source.osm ?? null, now, now,
      trip?.cacheAreaId ?? null, trip?.expiresAt ?? null],
  );
  return id;
}

function upsertPlaceInternal(candidate: PlaceCandidate, trip?: TripStamp): string {
  try {
    return upsertPlaceCore(candidate, trip);
  } catch (err) {
    console.warn('[habitatCache] upsertPlace failed', err);
    return generateId();
  }
}

export function upsertPlace(candidate: PlaceCandidate): string {
  return upsertPlaceInternal(candidate);
}

export interface TripPlaceCandidate extends PlaceCandidate {
  /** Joins this row to Trip.cacheAreaId. */
  cacheAreaId: string;
  /** Epoch ms — merging into an already trip-tagged row extends this to the max of old/new rather than overwriting, so a place shared between two trips (or re-discovered by a refresh) keeps the longest-lived expiry. */
  expiresAt: number;
}

/**
 * Same identity-merge as upsertPlace, but stamps cache_area_id/expires_at
 * (KAN-234). Merging into an existing untagged row tags it with this trip's
 * cacheAreaId (the place is now known to be inside an active trip's
 * coverage); merging into an already trip-tagged row never overwrites its
 * cache_area_id (first trip wins) — only extends expires_at to the max of
 * old/new. A plain (non-trip) upsertPlace call never touches an existing
 * row's cache_area_id/expires_at at all.
 */
export function upsertTripPlace(candidate: TripPlaceCandidate): string {
  const { cacheAreaId, expiresAt, ...rest } = candidate;
  return upsertPlaceInternal(rest, { cacheAreaId, expiresAt });
}

/**
 * Replaces every row tagged with cacheAreaId with the given places, as a
 * single SQLite transaction (KAN-234 review fix). Trip downloads/refreshes
 * are user-initiated foreground actions where data integrity matters — unlike
 * the opportunistic upsertPlace/upsertTripPlace above, this does NOT swallow
 * DB errors: if any delete/insert fails, withTransactionSync rolls back the
 * whole batch and this throws, so a previously-good trip cache is never left
 * half-deleted by a failed refresh. Returns the number of places written on
 * success.
 */
export function writeTripAreaPlaces(
  cacheAreaId: string,
  expiresAt: number,
  places: PlaceCandidate[],
): number {
  const database = getDb();
  let written = 0;
  database.withTransactionSync(() => {
    database.runSync('DELETE FROM habitat_places WHERE cache_area_id = ?', [cacheAreaId]);
    for (const place of places) {
      upsertPlaceCore(place, { cacheAreaId, expiresAt });
      written += 1;
    }
  });
  return written;
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
 * A type with no OSM tag mapping (arbitrary custom-category Google Places
 * strings) can never produce an OSM-backed row, so it would never satisfy
 * the freshness check below and would stay "stale" — and get re-fetched —
 * forever. Filtering to mappable types up front is what makes staleTypes
 * capable of ever reaching empty for a custom-only request (KAN-238 review).
 */
function isOsmMappable(poiType: string): boolean {
  return poiType in POI_OSM_TAGS;
}

/** Refetch cooldown for a (poiType, area) pair that came back with zero OSM
 * results last time — a mapped type can legitimately have nothing nearby
 * (e.g. no bus stop in this suburb); without this, a sparse area would hit
 * Overpass again on every single proximity tick indefinitely. */
const EMPTY_RESULT_RETRY_COOLDOWN_MS = 60 * 60 * 1_000; // 1 hour

/** ~5.5 km per cell at the equator — coarser than IDENTITY_MATCH_RADIUS_M on
 * purpose; this only throttles re-fetch attempts, not identity matching. */
const EMPTY_RESULT_GRID_CELL_DEG = 0.05;

/**
 * In-memory only (not persisted — resets on app restart, which just means
 * one extra retry, not a correctness issue). Keyed by poiType + coarse grid
 * cell; unbounded growth isn't a concern since the key space is naturally
 * capped by (POI types) × (cells the user actually visits).
 */
const _emptyResultAttempts = new Map<string, number>();

function emptyResultAttemptKey(poiType: string, lat: number, lng: number): string {
  const cellLat = Math.round(lat / EMPTY_RESULT_GRID_CELL_DEG);
  const cellLng = Math.round(lng / EMPTY_RESULT_GRID_CELL_DEG);
  return `${poiType}@${cellLat},${cellLng}`;
}

/** Test-only: clears the empty-result retry throttle between test cases. */
export function __resetEmptyResultAttemptsForTests(): void {
  _emptyResultAttempts.clear();
}

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
  const mappableTypes = poiTypes.filter(isOsmMappable);
  if (mappableTypes.length === 0) { return; }

  try {
    let isConnected: boolean | null = null;
    try { isConnected = (await NetInfo.fetch()).isConnected; } catch { /* treat as unknown */ }
    if (isConnected === false) { return; }

    const database = getDb();
    const box = boundingBoxDeg(lat, lng, HABITAT_RADIUS_M);
    const placeholders = mappableTypes.map(() => '?').join(',');
    const staleCutoff = Date.now() - HABITAT_CACHE_STALE_MS;

    const freshRows = database.getAllSync<{ poi_type: string }>(
      `SELECT poi_type FROM habitat_places
       WHERE poi_type IN (${placeholders})
         AND lat BETWEEN ? AND ?
         AND lng BETWEEN ? AND ?
         AND osm_id IS NOT NULL
         AND osm_fetched_at >= ?`,
      [...mappableTypes, box.latMin, box.latMax, box.lngMin, box.lngMax, staleCutoff],
    );
    const freshTypes = new Set(freshRows.map(r => r.poi_type));
    const staleTypes = mappableTypes.filter(t => !freshTypes.has(t));
    if (staleTypes.length === 0) { return; }

    const now = Date.now();
    const typesToFetch = staleTypes.filter(t => {
      const lastAttempt = _emptyResultAttempts.get(emptyResultAttemptKey(t, lat, lng));
      return lastAttempt == null || now - lastAttempt >= EMPTY_RESULT_RETRY_COOLDOWN_MS;
    });
    if (typesToFetch.length === 0) { return; }

    const osmResults = await searchOsmPlaces(lat, lng, typesToFetch, HABITAT_RADIUS_M);
    let didUpsert = false;
    for (const poiType of typesToFetch) {
      const places = osmResults[poiType] ?? [];
      if (places.length === 0) {
        _emptyResultAttempts.set(emptyResultAttemptKey(poiType, lat, lng), now);
        continue;
      }
      for (const place of places) {
        upsertPlace({
          poiType,
          name:          place.name,
          isGenericName: place.isGenericName,
          lat:           place.lat,
          lng:           place.lng,
          source:        { osm: place.osmId },
        });
        didUpsert = true;
      }
    }

    // Skip the full-table COUNT(*) when nothing was actually written.
    if (didUpsert) { enforceSizeBudget(); }
  } catch (err) {
    console.warn('[habitatCache] refreshHabitatCacheIfStale failed', err);
  }
}

/**
 * True if the cache has any row at all, anywhere — a cheap, position-free
 * check used to tell "nothing cached yet" (fresh install/new phone) apart
 * from "nothing cached near here" (KAN-236's offline-messaging states).
 *
 * Never throws — a DB failure returns false (the more cautious of the two
 * states to assume).
 */
export function hasCachedPlaces(): boolean {
  try {
    const rows = getDb().getAllSync<{ one: number }>('SELECT 1 as one FROM habitat_places LIMIT 1');
    return rows.length > 0;
  } catch (err) {
    console.warn('[habitatCache] hasCachedPlaces failed', err);
    return false;
  }
}

// ─── Size budget ──────────────────────────────────────────────────────────────

/**
 * Deletes the oldest (by last_matched_at) rows beyond MAX_CACHED_PLACES —
 * scoped to `cache_area_id IS NULL` (the ordinary opportunistic habitat
 * pool) only. KAN-234 trip rows are deliberately exempt from LRU eviction:
 * they have their own explicit expiry contract (deleteExpiredTripPlaces),
 * so a burst of opportunistic caching elsewhere could otherwise silently
 * evict an unexpired trip's coverage mid-trip with no user-facing signal —
 * breaking the "I'll know it until <date>" promise.
 */
export function enforceSizeBudget(): void {
  try {
    const database = getDb();
    const [{ count } = { count: 0 }] = database.getAllSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM habitat_places WHERE cache_area_id IS NULL',
    );
    if (count <= MAX_CACHED_PLACES) { return; }

    database.runSync(
      `DELETE FROM habitat_places WHERE id IN (
         SELECT id FROM habitat_places WHERE cache_area_id IS NULL ORDER BY last_matched_at ASC LIMIT ?
       )`,
      [count - MAX_CACHED_PLACES],
    );
  } catch (err) {
    console.warn('[habitatCache] enforceSizeBudget failed', err);
  }
}

// ─── Trip areas (KAN-234) ─────────────────────────────────────────────────────

/** Rough per-row on-device storage cost (SQLite row + index overhead) — illustrative, not measured. Shared by estimateHabitatAreaSizeBytes below and tripDownload.ts's pre-download size estimate. */
export const HABITAT_BYTES_PER_ROW = 200;

/** Deletes every row tagged with cacheAreaId. Used when a trip is deleted. */
export function deleteTripAreaPlaces(cacheAreaId: string): void {
  try {
    getDb().runSync('DELETE FROM habitat_places WHERE cache_area_id = ?', [cacheAreaId]);
  } catch (err) {
    console.warn('[habitatCache] deleteTripAreaPlaces failed', err);
  }
}

/** Deletes any row (trip or not) whose expires_at has passed. Ordinary habitat rows have expires_at IS NULL and are never touched here — run once per boot alongside the trip pre-refresh check. */
export function deleteExpiredTripPlaces(): void {
  try {
    getDb().runSync(
      'DELETE FROM habitat_places WHERE expires_at IS NOT NULL AND expires_at < ?',
      [Date.now()],
    );
  } catch (err) {
    console.warn('[habitatCache] deleteExpiredTripPlaces failed', err);
  }
}

/** Rough size estimate for the always-on habitat area (cache_area_id IS NULL rows only) — shown in the "Places I Know" list. */
export function estimateHabitatAreaSizeBytes(): number {
  try {
    const [{ count } = { count: 0 }] = getDb().getAllSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM habitat_places WHERE cache_area_id IS NULL',
    );
    return count * HABITAT_BYTES_PER_ROW;
  } catch (err) {
    console.warn('[habitatCache] estimateHabitatAreaSizeBytes failed', err);
    return 0;
  }
}
