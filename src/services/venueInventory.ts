/**
 * venueInventory.ts — KAN-382. A shopping centre's full inventory, offline.
 *
 * Inside a centre the app shows floors, not distances (KAN-512), and the
 * signal under a mall roof is often gone. So each known centre near the user
 * is downloaded whole, ahead of time, from `GET /venues/:id/units`: every
 * valid place the registry serves inside the centre's outline, with its
 * floor, plus the outline itself.
 *
 * WHEN
 *
 * Opportunistically, from the proximity engine's live tick (the same moment
 * the habitat prefetch runs): online, and Wi-Fi if the user asked for that.
 * A centre whose centroid is within VENUE_PREFETCH_RADIUS_M is fetched if
 * we hold no complete copy, or re-checked once a day — a one-unit page tells
 * us the current `version`, and only a changed version downloads again.
 * Prefetching nearby centres, not only the one the user stands in, is what
 * covers a first visit with no signal inside.
 *
 * COMPLETE OR NOTHING
 *
 * Pages are collected in memory and written in ONE transaction, with the
 * `complete` flag. A failed or interrupted download leaves the previous
 * complete copy untouched. If the version changes between pages the centre
 * changed mid-download: start over once, then give up until next time,
 * rather than store a mix of two states.
 *
 * WHERE
 *
 * Its own SQLite file, not habitat_places: that table merges rows across
 * sources and areas by name and distance, which would fold two units of one
 * brand together and file a unit under another area's tag. A centre's
 * inventory is the operator's building, kept as served.
 *
 * Nothing here decides whether the user is inside a centre (KAN-513) or
 * shows anything (KAN-514). It stores and answers.
 */

import * as SQLite from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';
import { poiApiGet, PoiApiError } from './poiApi';
import { getDistanceMeters } from './geoDistance';
import { getWifiOnlyDownloads, HABITAT_RADIUS_M } from './habitatCache';

// ─── Wire shapes ──────────────────────────────────────────────────────────────

type Ring = [number, number][];

export interface Venue {
  id: string;
  name: string;
  osm: string;
  centroid: [number, number];
  rings: Ring[];
}

export interface VenueUnitWire {
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
  types: string[];
  brand: string | null;
  address: string | null;
  floor: string | null;
  open_min: number | null;
  close_min: number | null;
  attributes: Record<string, string[]>;
}

interface UnitsPage {
  venue: { id: string; name: string };
  version: string;
  total: number;
  units: VenueUnitWire[];
  nextCursor: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Centres whose centroid is this close are prefetched — the habitat's own learning radius. */
export const VENUE_PREFETCH_RADIUS_M = HABITAT_RADIUS_M;
/** A complete copy is re-checked against the server at most this often. */
export const VENUE_RECHECK_MS = 24 * 60 * 60 * 1_000;
/** The venue list itself is static per deploy; refetched at most this often. */
export const VENUE_LIST_TTL_MS = 24 * 60 * 60 * 1_000;
export const VENUE_PAGE_SIZE = 200;
/** A centre never has this many pages; the cap only stops a server bug looping. */
const MAX_PAGES = 50;
const DB_NAME = 'venue_inventory.db';

// ─── Storage ──────────────────────────────────────────────────────────────────

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    const database = SQLite.openDatabaseSync(DB_NAME);
    database.execSync(`
      CREATE TABLE IF NOT EXISTS venue (
        venue_id      TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        centroid_lat  REAL NOT NULL,
        centroid_lng  REAL NOT NULL,
        rings_json    TEXT NOT NULL,
        version       TEXT NOT NULL,
        unit_count    INTEGER NOT NULL,
        complete      INTEGER NOT NULL DEFAULT 0,
        downloaded_at INTEGER NOT NULL,
        checked_at    INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS venue_unit (
        venue_id          TEXT NOT NULL,
        unit_key          TEXT NOT NULL,
        poi_type          TEXT NOT NULL,
        primary_poi_type  TEXT NOT NULL,
        source            TEXT NOT NULL,
        poi_id            TEXT NOT NULL,
        name              TEXT NOT NULL,
        name_local        TEXT,
        name_local_lang   TEXT,
        names_json        TEXT,
        country_code      TEXT,
        lat               REAL NOT NULL,
        lng               REAL NOT NULL,
        floor             TEXT,
        brand             TEXT,
        attributes_json   TEXT NOT NULL,
        PRIMARY KEY (venue_id, unit_key, poi_type)
      );
      CREATE INDEX IF NOT EXISTS idx_venue_unit_type ON venue_unit(venue_id, poi_type);
    `);
    db = database;
  }
  return db;
}

/** Test-only: drop the cached DB handle and in-memory state. */
export function __resetVenueInventoryForTests(): void {
  db = null;
  venueList = null;
  inFlight = null;
}

export interface VenueInventoryMeta {
  venueId: string;
  name: string;
  centroid: [number, number];
  rings: Ring[];
  version: string;
  unitCount: number;
  complete: boolean;
  downloadedAt: number;
  checkedAt: number;
}

/** The stored copy of one centre, or null if we hold none. Never throws. */
export function getVenueInventory(venueId: string): VenueInventoryMeta | null {
  try {
    const row = getDb().getFirstSync<{
      venue_id: string; name: string; centroid_lat: number; centroid_lng: number; rings_json: string;
      version: string; unit_count: number; complete: number; downloaded_at: number; checked_at: number;
    }>('SELECT * FROM venue WHERE venue_id = ?', [venueId]);
    if (!row) { return null; }
    return {
      venueId: row.venue_id, name: row.name, centroid: [row.centroid_lat, row.centroid_lng],
      rings: JSON.parse(row.rings_json) as Ring[], version: row.version, unitCount: row.unit_count,
      complete: row.complete === 1, downloadedAt: row.downloaded_at, checkedAt: row.checked_at,
    };
  } catch (err) {
    console.warn('[venueInventory] getVenueInventory failed', err);
    return null;
  }
}

// ─── Change notifications ─────────────────────────────────────────────────────

const listeners = new Set<() => void>();

/**
 * Called after a centre's stored copy (units and outline) is written. Lets
 * centre detection re-check a position it already has when an outline
 * arrives later (KAN-513). Returns the unsubscribe function.
 */
export function subscribeVenueInventory(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function notifyChanged(): void {
  for (const listener of [...listeners]) {
    try { listener(); } catch (err) { console.warn('[venueInventory] listener failed', err); }
  }
}

/**
 * Every centre we hold an outline for (any stored copy), as a `Venue`. The
 * offline source of outlines for centre detection (KAN-513). Never throws.
 */
export function listStoredVenues(): Venue[] {
  try {
    return getDb().getAllSync<{
      venue_id: string; name: string; centroid_lat: number; centroid_lng: number; rings_json: string;
    }>('SELECT venue_id, name, centroid_lat, centroid_lng, rings_json FROM venue ORDER BY venue_id').map(row => ({
      id: row.venue_id, name: row.name, osm: '', centroid: [row.centroid_lat, row.centroid_lng] as [number, number],
      rings: JSON.parse(row.rings_json) as Ring[],
    }));
  } catch (err) {
    console.warn('[venueInventory] listStoredVenues failed', err);
    return [];
  }
}

/**
 * Replace one centre's stored inventory with `units`, as one transaction,
 * and mark it complete. Throws on failure — the transaction rolls back and
 * the previous copy (if any) stays exactly as it was.
 */
export function writeVenueInventory(venue: Venue, version: string, units: VenueUnitWire[], now = Date.now()): void {
  const database = getDb();
  database.withTransactionSync(() => {
    database.runSync('DELETE FROM venue_unit WHERE venue_id = ?', [venue.id]);
    for (const unit of units) {
      const types = unit.types.length > 0 ? unit.types : [unit.primary_poi_type];
      for (const poiType of new Set(types)) {
        database.runSync(
          `INSERT INTO venue_unit (venue_id, unit_key, poi_type, primary_poi_type, source, poi_id, name, name_local,
                                   name_local_lang, names_json, country_code, lat, lng, floor, brand, attributes_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [venue.id, unit.key, poiType, unit.primary_poi_type, unit.source, unit.poi_id, unit.name,
            unit.name_local ?? null, unit.name_local_lang ?? null,
            unit.names && Object.keys(unit.names).length > 0 ? JSON.stringify(unit.names) : null,
            unit.country_code ?? null, unit.lat, unit.lng, unit.floor ?? null, unit.brand ?? null,
            JSON.stringify(unit.attributes ?? {})],
        );
      }
    }
    database.runSync(
      `INSERT OR REPLACE INTO venue (venue_id, name, centroid_lat, centroid_lng, rings_json, version, unit_count,
                                     complete, downloaded_at, checked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [venue.id, venue.name, venue.centroid[0], venue.centroid[1], JSON.stringify(venue.rings),
        version, units.length, now, now],
    );
  });
  notifyChanged();
}

/**
 * The units are unchanged (same version): keep them, but take the centre's
 * current name, centroid and outline from the venue list, which can change
 * on a deploy without changing the units.
 */
function touchChecked(venue: Venue, now: number): void {
  getDb().runSync(
    'UPDATE venue SET name = ?, centroid_lat = ?, centroid_lng = ?, rings_json = ?, checked_at = ? WHERE venue_id = ?',
    [venue.name, venue.centroid[0], venue.centroid[1], JSON.stringify(venue.rings), now, venue.id],
  );
  notifyChanged();
}

// ─── Offline lookup ───────────────────────────────────────────────────────────

export interface VenueUnit {
  key: string;
  poiId: string;
  source: VenueUnitWire['source'];
  poiType: string;
  primaryPoiType: string;
  name: string;
  nameLocal: string | null;
  nameLocalLang: string | null;
  names: Record<string, string>;
  countryCode: string | null;
  lat: number;
  lng: number;
  floor: string | null;
  brand: string | null;
  attributes: Record<string, string[]>;
}

export interface VenueUnitQuery {
  poiType: string;
  /** Restaurant cuisine (`food_cuisine`), store kind (`store_kind`) or financial kind. */
  attribute?: { dimension: 'food_cuisine' | 'store_kind' | 'financial_service_kind'; value: string };
  brand?: string | null;
}

/**
 * Every unit of a COMPLETE stored centre that answers `query`: its type, and
 * its subtype or brand when asked. An incomplete or missing copy answers
 * nothing — a partial list would claim shops aren't there when they are.
 * Ordered by floor (lowest first, no floor last), then name. Never throws.
 */
export function searchVenueUnits(venueId: string, query: VenueUnitQuery): VenueUnit[] {
  try {
    const meta = getVenueInventory(venueId);
    if (!meta?.complete) { return []; }
    const rows = getDb().getAllSync<{
      unit_key: string; poi_type: string; primary_poi_type: string; source: VenueUnitWire['source'];
      poi_id: string; name: string; name_local: string | null; name_local_lang: string | null;
      names_json: string | null; country_code: string | null; lat: number; lng: number;
      floor: string | null; brand: string | null; attributes_json: string;
    }>(
      `SELECT * FROM venue_unit WHERE venue_id = ? AND poi_type = ?${query.brand ? ' AND brand = ?' : ''}`,
      query.brand ? [venueId, query.poiType, query.brand] : [venueId, query.poiType],
    );
    const units = rows.map(row => ({
      key: row.unit_key, poiId: row.poi_id, source: row.source, poiType: row.poi_type,
      primaryPoiType: row.primary_poi_type, name: row.name, nameLocal: row.name_local,
      nameLocalLang: row.name_local_lang,
      names: row.names_json ? JSON.parse(row.names_json) as Record<string, string> : {},
      countryCode: row.country_code, lat: row.lat, lng: row.lng, floor: row.floor, brand: row.brand,
      attributes: JSON.parse(row.attributes_json) as Record<string, string[]>,
    })).filter(unit => !query.attribute
      || (unit.attributes[query.attribute.dimension] ?? []).includes(query.attribute.value));
    const floorRank = (floor: string | null) => (floor == null || floor === '' ? Infinity : Number(floor));
    return units.sort((a, b) => floorRank(a.floor) - floorRank(b.floor) || a.name.localeCompare(b.name));
  } catch (err) {
    console.warn('[venueInventory] searchVenueUnits failed', err);
    return [];
  }
}

// ─── Download ─────────────────────────────────────────────────────────────────

let venueList: { venues: Venue[]; fetchedAt: number } | null = null;
let inFlight: Promise<void> | null = null;

async function listVenues(now: number): Promise<Venue[]> {
  if (venueList && now - venueList.fetchedAt < VENUE_LIST_TTL_MS) { return venueList.venues; }
  const { venues } = await poiApiGet<{ venues: Venue[] }>('/venues');
  venueList = { venues, fetchedAt: now };
  return venues;
}

function unitsPath(venueId: string, limit: number, cursor: string | null): string {
  const base = `/venues/${encodeURIComponent(venueId)}/units?limit=${limit}`;
  return cursor ? `${base}&cursor=${encodeURIComponent(cursor)}` : base;
}

/** Every page of one centre under a single version, or throws. */
export async function fetchVenueUnits(venueId: string): Promise<{ version: string; units: VenueUnitWire[] }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const units: VenueUnitWire[] = [];
    let version: string | null = null;
    let cursor: string | null = null;
    let restarted = false;
    for (let pages = 0; pages < MAX_PAGES; pages++) {
      const page: UnitsPage = await poiApiGet<UnitsPage>(unitsPath(venueId, VENUE_PAGE_SIZE, cursor));
      if (version != null && page.version !== version) { restarted = true; break; }
      version = page.version;
      units.push(...page.units);
      cursor = page.nextCursor;
      if (!cursor) {
        if (units.length !== page.total) { throw new Error(`venue ${venueId}: got ${units.length} of ${page.total} units`); }
        return { version, units };
      }
    }
    if (!restarted) { throw new Error(`venue ${venueId}: more than ${MAX_PAGES} pages`); }
  }
  throw new Error(`venue ${venueId}: changed during download twice`);
}

async function downloadAllowed(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    if (state.isConnected === false) { return false; }
    // Same rule as the habitat prefetch (KAN-366): an unknown type is not cellular.
    if (getWifiOnlyDownloads() && state.type != null && state.type !== 'wifi') { return false; }
    return true;
  } catch {
    return true;
  }
}

async function refreshOne(venue: Venue, now: number): Promise<void> {
  const stored = getVenueInventory(venue.id);
  if (stored?.complete && now - stored.checkedAt < VENUE_RECHECK_MS) { return; }
  if (stored?.complete) {
    const probe = await poiApiGet<UnitsPage>(unitsPath(venue.id, 1, null));
    if (probe.version === stored.version) { touchChecked(venue, now); return; }
  }
  const { version, units } = await fetchVenueUnits(venue.id);
  writeVenueInventory(venue, version, units, now);
}

/**
 * Download or re-check every known centre near `lat`/`lng`. Fire-and-forget
 * from the proximity tick: never throws, and a second call while one is
 * running joins it instead of downloading twice.
 */
export function refreshVenueInventoriesIfDue(lat: number, lng: number, now = Date.now()): Promise<void> {
  if (inFlight) { return inFlight; }
  inFlight = (async () => {
    try {
      if (!(await downloadAllowed())) { return; }
      const venues = await listVenues(now);
      const near = venues
        .map(venue => ({ venue, distance: getDistanceMeters(lat, lng, venue.centroid[0], venue.centroid[1]) }))
        .filter(({ distance }) => distance <= VENUE_PREFETCH_RADIUS_M)
        .sort((a, b) => a.distance - b.distance);
      for (const { venue } of near) {
        try {
          await refreshOne(venue, now);
        } catch (err) {
          // A failed centre keeps its last complete copy. HTTP 429 is stop,
          // never retry-harder (CLAUDE.md): the rest wait for the next tick.
          // Anything else (a dropped connection) doesn't stop the others.
          console.warn(`[venueInventory] ${venue.id} refresh failed`, err);
          if (err instanceof PoiApiError && err.status === 429) { return; }
        }
      }
    } catch (err) {
      console.warn('[venueInventory] refresh failed', err);
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}
