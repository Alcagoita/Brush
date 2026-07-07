/**
 * poiTypeCache.ts — KAN-253
 *
 * Local, on-device (expo-sqlite) cache in front of maps.ts's searchPlaceTypes
 * (Google Places Text Search — a metered/billed live API call). Two flows hit
 * that search live on every keystroke with zero caching today:
 *   - CategoriesScreen's custom-category POI-type picker
 *   - functions.ts's parseMessageToTask (ShareReceiveScreen import path),
 *     as its pass-2 fallback after the local rule dictionary misses
 *
 * NewTaskSheet's quick-add (KAN-232) and the Google Tasks/Calendar/Reminders
 * import connectors (services/import.ts) are NOT touched — they already run
 * entirely offline (16-item catalog + on-device rule dictionary + on-device
 * TFLite classifier), no live API call to cache in front of.
 *
 * Seeding: there is no Google API endpoint that returns "all place types" —
 * it's a fixed, published taxonomy (see constants/googlePlaceTypes.ts). On
 * first launch (empty table) the cache is seeded from that bundled list, one
 * row per type keyed by its own normalized label — a zero-network way to
 * answer any direct-name search ("gym", "sushi restaurant", ...) locally.
 * Anything that isn't a seed hit still falls through to the live API exactly
 * once per distinct query, and gets persisted so it's never re-fetched.
 */

import * as SQLite from 'expo-sqlite';
import { normalize } from './poiInference';
import { searchPlaceTypes, placeTypeLabel, isGenericPlaceType, type PlaceTypeSuggestion } from './maps';
import { GOOGLE_PLACE_TYPES_TABLE_A } from '../constants/googlePlaceTypes';

const DB_NAME = 'poi_type_cache.db';

/** Skip persisting an API-resolved query this short — early keystrokes in a
 *  debounced search churn the table with near-meaningless partial queries
 *  that are unlikely to ever repeat verbatim. Seed rows (real, complete type
 *  labels) are never this short, so this never affects seed lookups. */
const MIN_CACHEABLE_QUERY_LENGTH = 3;

/** Hard cap on API-resolved (non-seed) rows — keeps the on-device footprint
 *  bounded under per-keystroke searching. Seed rows are exempt: they're a
 *  fixed-size bundled taxonomy, not user-driven growth, so they never count
 *  against or get evicted by this budget. */
export const MAX_CACHED_API_QUERIES = 500;

// ─── DB handle (lazy, cached) ─────────────────────────────────────────────────

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    const database = SQLite.openDatabaseSync(DB_NAME);
    database.execSync(`
      CREATE TABLE IF NOT EXISTS poi_type_search (
        query_key   TEXT PRIMARY KEY,
        results_json TEXT NOT NULL,
        source      TEXT NOT NULL,
        created_at  INTEGER NOT NULL
      );
    `);
    db = database;
  }
  return db;
}

/** Test-only: drop the cached DB handle so the next call re-opens/re-migrates. */
export function __resetPoiTypeCacheDbForTests(): void {
  db = null;
}

// ─── Lookup / record ──────────────────────────────────────────────────────────

interface CacheRow {
  results_json: string;
}

/**
 * Read-only local lookup. Returns the cached suggestion list for `query`
 * (seeded or previously API-resolved), or null on a genuine cache miss.
 * Never throws — a DB failure is treated as a miss (falls through to the live
 * API exactly like an empty cache would).
 */
export function lookupPoiTypeCache(query: string): PlaceTypeSuggestion[] | null {
  const key = normalize(query);
  if (!key) { return null; }
  try {
    const rows = getDb().getAllSync<CacheRow>(
      'SELECT results_json FROM poi_type_search WHERE query_key = ?',
      [key],
    );
    if (rows.length === 0) { return null; }
    return JSON.parse(rows[0].results_json) as PlaceTypeSuggestion[];
  } catch (err) {
    console.warn('[poiTypeCache] lookupPoiTypeCache failed', err);
    return null;
  }
}

/**
 * Persists a resolved query → suggestion list (including an empty list — a
 * confirmed "no match" is still worth remembering so an unresolvable phrase
 * doesn't keep round-tripping to Google). Best-effort: a write failure is
 * swallowed since the caller already has its (uncached) result in hand.
 *
 * Skips anything shorter than MIN_CACHEABLE_QUERY_LENGTH (early keystrokes in
 * a debounced search) and enforces MAX_CACHED_API_QUERIES afterwards — see
 * both constants above.
 */
export function recordPoiTypeSearch(
  query: string,
  results: PlaceTypeSuggestion[],
  source: 'api' | 'seed' = 'api',
): void {
  const key = normalize(query);
  if (!key || key.length < MIN_CACHEABLE_QUERY_LENGTH) { return; }
  try {
    getDb().runSync(
      'INSERT OR REPLACE INTO poi_type_search (query_key, results_json, source, created_at) VALUES (?, ?, ?, ?)',
      [key, JSON.stringify(results), source, Date.now()],
    );
    if (source === 'api') { enforceApiCacheBudget(); }
  } catch (err) {
    console.warn('[poiTypeCache] recordPoiTypeSearch failed', err);
  }
}

/**
 * Deletes the oldest (by created_at) 'api'-sourced rows beyond
 * MAX_CACHED_API_QUERIES. Scoped to source = 'api' only — the bundled seed
 * rows are a fixed, known size and are never evicted by this budget.
 */
function enforceApiCacheBudget(): void {
  try {
    const database = getDb();
    const [{ count } = { count: 0 }] = database.getAllSync<{ count: number }>(
      "SELECT COUNT(*) as count FROM poi_type_search WHERE source = 'api'",
    );
    if (count <= MAX_CACHED_API_QUERIES) { return; }

    database.runSync(
      `DELETE FROM poi_type_search WHERE query_key IN (
         SELECT query_key FROM poi_type_search WHERE source = 'api' ORDER BY created_at ASC LIMIT ?
       )`,
      [count - MAX_CACHED_API_QUERIES],
    );
  } catch (err) {
    console.warn('[poiTypeCache] enforceApiCacheBudget failed', err);
  }
}

// ─── Seed (KAN-253) ───────────────────────────────────────────────────────────

/**
 * True if the cache has any row at all — used to gate the one-time seed.
 * Never throws — a DB failure returns true (the safer assumption: skip a
 * redundant seed attempt rather than risk seeding on every failed boot).
 */
function hasAnyRows(): boolean {
  try {
    const rows = getDb().getAllSync<{ one: number }>('SELECT 1 as one FROM poi_type_search LIMIT 1');
    return rows.length > 0;
  } catch (err) {
    console.warn('[poiTypeCache] hasAnyRows failed', err);
    return true;
  }
}

/**
 * One-time, zero-network seed of the local cache from the bundled Google
 * place-type taxonomy (constants/googlePlaceTypes.ts) — call once per app
 * boot (see SplashScreen). No-ops if the table already has anything in it
 * (including a previous partial seed — CREATE TABLE IF NOT EXISTS plus this
 * check is the whole migration story here, there's nothing to migrate).
 *
 * Never throws — mirrors the rest of this module's "best effort, non-fatal"
 * contract; a failed seed just means the next search falls through to the
 * live API like it would today.
 */
export function seedPoiTypeCacheIfEmpty(): void {
  if (hasAnyRows()) { return; }
  try {
    const database = getDb();
    const now = Date.now();
    database.withTransactionSync(() => {
      for (const type of GOOGLE_PLACE_TYPES_TABLE_A) {
        // Same exclusion policy as the live searchPlaceTypes() results — a
        // seed/cache hit must never surface a type the live path would have
        // filtered out (e.g. 'store', 'locality', 'country').
        if (isGenericPlaceType(type)) { continue; }
        const label = placeTypeLabel(type);
        const key = normalize(label);
        if (!key) { continue; }
        const results: PlaceTypeSuggestion[] = [{ type, label }];
        database.runSync(
          'INSERT OR IGNORE INTO poi_type_search (query_key, results_json, source, created_at) VALUES (?, ?, ?, ?)',
          [key, JSON.stringify(results), 'seed', now],
        );
      }
    });
  } catch (err) {
    console.warn('[poiTypeCache] seedPoiTypeCacheIfEmpty failed', err);
  }
}

// ─── Read-through wrapper ─────────────────────────────────────────────────────

/**
 * Drop-in replacement for maps.ts's searchPlaceTypes: checks the local cache
 * first (seeded taxonomy or a previously-resolved query) and only calls the
 * live Google Places Text Search API on a genuine miss, persisting the result
 * afterwards so the same query never round-trips to Google again.
 */
export async function searchPlaceTypesCached(query: string): Promise<PlaceTypeSuggestion[]> {
  const cached = lookupPoiTypeCache(query);
  if (cached !== null) { return cached; }

  const results = await searchPlaceTypes(query);
  recordPoiTypeSearch(query, results, 'api');
  return results;
}
