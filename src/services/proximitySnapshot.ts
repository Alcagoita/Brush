/**
 * proximitySnapshot.ts — persisted last-known Nearby result (KAN-285).
 *
 * The outdoor proximity search (proximity.ts's runProximitySearch) hits the
 * Places API every time it's asked to run — correct when something actually
 * changed, wasteful when it doesn't: proximity.ts's own in-memory state
 * (`_lastSearchCoords`, `_lastAllPlaces`, ...) resets on every cold start,
 * and useProximityEngine's mount effect had no memory of a *previous*
 * session's result at all, so returning to the Today screen — or just
 * reopening the app — re-ran the search unconditionally.
 *
 * This module is the fix's persistence layer: one row per uid holding the
 * last search's origin, the exact set of POI types it covered, and its
 * result (hero type/place + the full nearby-places map). proximity.ts's
 * runProximitySearchOrReuseSnapshot reads it before deciding whether a
 * fresh Places API call is actually warranted — see that function's doc for
 * the two conditions (moved >500m, POI type set changed) that force one.
 *
 * SQLite (not AsyncStorage/MMKV, neither of which this project depends on)
 * — same choice as habitatCache.ts, and for the same reason: it already
 * works fully offline and survives app restarts with no new native
 * dependency to install.
 */

import * as SQLite from 'expo-sqlite';
import type { NearbyPlace } from './maps';
import type { PlacesMap } from './proximity';

const DB_NAME = 'proximity_snapshot.db';

export interface ProximitySnapshot {
  lat: number;
  lng: number;
  /** Sorted, comma-joined unique POI types the search covered — the exact
   *  value compared against the current task list's own key. */
  poiTypesKey: string;
  nearbyPoiType: string | null;
  nearbyPlace: NearbyPlace | null;
  poiPlaces: PlacesMap;
}

interface SnapshotRow {
  lat: number;
  lng: number;
  poi_types_key: string;
  nearby_poi_type: string | null;
  nearby_place_json: string | null;
  poi_places_json: string;
}

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    const database = SQLite.openDatabaseSync(DB_NAME);
    database.execSync(`
      CREATE TABLE IF NOT EXISTS proximity_snapshot (
        uid                TEXT PRIMARY KEY,
        lat                REAL NOT NULL,
        lng                REAL NOT NULL,
        poi_types_key      TEXT NOT NULL,
        nearby_poi_type    TEXT,
        nearby_place_json  TEXT,
        poi_places_json    TEXT NOT NULL,
        updated_at         INTEGER NOT NULL
      );
    `);
    db = database;
  }
  return db;
}

/** Upserts the given uid's snapshot. Fire-and-forget — never throws. */
export function saveProximitySnapshot(uid: string, snapshot: ProximitySnapshot): void {
  try {
    getDb().runSync(
      `INSERT INTO proximity_snapshot
         (uid, lat, lng, poi_types_key, nearby_poi_type, nearby_place_json, poi_places_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(uid) DO UPDATE SET
         lat = excluded.lat, lng = excluded.lng, poi_types_key = excluded.poi_types_key,
         nearby_poi_type = excluded.nearby_poi_type, nearby_place_json = excluded.nearby_place_json,
         poi_places_json = excluded.poi_places_json, updated_at = excluded.updated_at`,
      [
        uid, snapshot.lat, snapshot.lng, snapshot.poiTypesKey, snapshot.nearbyPoiType,
        snapshot.nearbyPlace ? JSON.stringify(snapshot.nearbyPlace) : null,
        JSON.stringify(snapshot.poiPlaces),
        Date.now(),
      ],
    );
  } catch (err) {
    console.warn('[proximitySnapshot] save failed', err);
  }
}

/** Returns the given uid's last persisted snapshot, or null if none exists / on error. */
export function loadProximitySnapshot(uid: string): ProximitySnapshot | null {
  try {
    const row = getDb().getFirstSync<SnapshotRow>(
      'SELECT lat, lng, poi_types_key, nearby_poi_type, nearby_place_json, poi_places_json FROM proximity_snapshot WHERE uid = ?',
      [uid],
    );
    if (!row) { return null; }
    return {
      lat:           row.lat,
      lng:           row.lng,
      poiTypesKey:   row.poi_types_key,
      nearbyPoiType: row.nearby_poi_type,
      nearbyPlace:   row.nearby_place_json ? JSON.parse(row.nearby_place_json) : null,
      poiPlaces:     JSON.parse(row.poi_places_json),
    };
  } catch (err) {
    console.warn('[proximitySnapshot] load failed', err);
    return null;
  }
}

/** Test-only: drops the cached db handle so the next getDb() call re-opens fresh. */
export function __resetProximitySnapshotDbForTests(): void {
  db = null;
}
