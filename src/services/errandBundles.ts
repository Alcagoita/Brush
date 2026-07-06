/**
 * errandBundles.ts — KAN-235 ("Heading out?" errand bundling).
 *
 * Hard constraint (KAN-231): no leave-home detection, no background
 * triggers, no new location machinery. computeErrandBundles is a pure
 * function over data the foreground proximity engine already holds in
 * memory each tick (open POI tasks + poiPlaces from the existing
 * runProximitySearch cycle) — it introduces no new sensing or timers.
 *
 * An anchor is any candidate place from any open task; a bundle forms when
 * ≥MIN_BUNDLE_TASKS distinct tasks each have a candidate place within
 * ERRAND_BUNDLE_RADIUS_M of that anchor (each task contributes its own
 * nearest such candidate). Bundles are ranked by task count (desc), then
 * total walk distance to the anchor (asc) — never reordered into an
 * itinerary; the card only ever reveals the single top-ranked bundle.
 *
 * Dismissal is a tiny local SQLite table (own db, same expo-sqlite
 * dependency habitatCache.ts already uses) keyed by day + anchor place id,
 * so "hide this bundle for today" survives an app restart within the same
 * calendar day without needing a new persistence dependency.
 */

import * as SQLite from 'expo-sqlite';
import { getDistanceMeters } from './maps';
import type { NearbyPlace } from './maps';
import type { PlacesMap } from './proximity';
import type { Task } from '../types';
import { todayISO } from '../utils/date';

/** ~600–800 m per the ticket's "ten-minute walk" framing — a single constant, not a range, so ranking/testing stays deterministic. */
export const ERRAND_BUNDLE_RADIUS_M = 700;

/** A bundle needs at least this many distinct tasks with a candidate near the anchor. */
export const MIN_BUNDLE_TASKS = 2;

export interface ErrandBundleEntry {
  task: Task;
  place: NearbyPlace;
  /** Distance from this entry's place to the bundle's anchor (not to the user). */
  distanceToAnchorMeters: number;
}

export interface ErrandBundle {
  anchor: NearbyPlace;
  entries: ErrandBundleEntry[];
  /** Sum of every entry's distanceToAnchorMeters — the ranking tiebreaker. */
  totalWalkDistanceMeters: number;
}

/**
 * Given the open POI tasks and the proximity engine's current poiPlaces,
 * returns every valid bundle, ranked by task count desc then total walk
 * distance asc. Empty tasks/poiPlaces (or no cluster meeting the ≥2
 * threshold) returns an empty array — absence is the default, same as
 * ContextChip.
 */
export function computeErrandBundles(tasks: Task[], poiPlaces: PlacesMap): ErrandBundle[] {
  const openPoiTasks = tasks.filter((t): t is Task & { poi: string } => !t.done && !!t.poi);
  if (openPoiTasks.length < MIN_BUNDLE_TASKS) { return []; }

  const allCandidates: NearbyPlace[] = [];
  for (const task of openPoiTasks) {
    for (const place of poiPlaces[task.poi] ?? []) { allCandidates.push(place); }
  }

  const bundlesByTaskSet = new Map<string, ErrandBundle>();

  for (const anchor of allCandidates) {
    const entries: ErrandBundleEntry[] = [];

    for (const task of openPoiTasks) {
      let nearest: NearbyPlace | null = null;
      let nearestDist = Infinity;
      for (const place of poiPlaces[task.poi] ?? []) {
        const dist = getDistanceMeters(anchor.lat, anchor.lng, place.lat, place.lng);
        if (dist <= ERRAND_BUNDLE_RADIUS_M && dist < nearestDist) {
          nearest = place;
          nearestDist = dist;
        }
      }
      if (nearest) { entries.push({ task, place: nearest, distanceToAnchorMeters: nearestDist }); }
    }

    if (entries.length < MIN_BUNDLE_TASKS) { continue; }

    // Same participating task set can surface from multiple candidate anchors
    // (e.g. two nearby places both within radius of the same tasks) — keep
    // only the first one found for that exact set; ranking below picks the
    // best set, not the best anchor within an already-covered set.
    const taskSetKey = entries.map(e => e.task.id).sort().join(',');
    if (bundlesByTaskSet.has(taskSetKey)) { continue; }

    const totalWalkDistanceMeters = entries.reduce((sum, e) => sum + e.distanceToAnchorMeters, 0);
    bundlesByTaskSet.set(taskSetKey, { anchor, entries, totalWalkDistanceMeters });
  }

  return [...bundlesByTaskSet.values()].sort((a, b) =>
    b.entries.length - a.entries.length || a.totalWalkDistanceMeters - b.totalWalkDistanceMeters,
  );
}

/** Stable identity for a bundle's dismissal — the anchor place is the cluster's identity. */
export function errandBundleKey(bundle: ErrandBundle): string {
  return bundle.anchor.placeId;
}

// ─── Dismissal (own tiny SQLite table — no new dependency) ────────────────────

const DB_NAME = 'errand_bundles.db';
let db: SQLite.SQLiteDatabase | null = null;

function getDismissalDb(): SQLite.SQLiteDatabase {
  if (!db) {
    const database = SQLite.openDatabaseSync(DB_NAME);
    database.execSync(`
      CREATE TABLE IF NOT EXISTS dismissed_bundles (
        day TEXT NOT NULL,
        bundle_key TEXT NOT NULL,
        PRIMARY KEY (day, bundle_key)
      );
    `);
    db = database;
  }
  return db;
}

/** True if this exact bundle was dismissed earlier today. Never throws — a DB failure means "not dismissed" (the more visible, less surprising default). */
export function isBundleDismissedToday(bundleKey: string): boolean {
  try {
    const rows = getDismissalDb().getAllSync<{ one: number }>(
      'SELECT 1 as one FROM dismissed_bundles WHERE day = ? AND bundle_key = ?',
      [todayISO(), bundleKey],
    );
    return rows.length > 0;
  } catch (err) {
    console.warn('[errandBundles] isBundleDismissedToday failed', err);
    return false;
  }
}

/** Hides this exact bundle for the rest of today (survives app restart; a new day clears it implicitly since the key includes today's date). */
export function dismissBundleForToday(bundleKey: string): void {
  try {
    getDismissalDb().runSync(
      'INSERT OR REPLACE INTO dismissed_bundles (day, bundle_key) VALUES (?, ?)',
      [todayISO(), bundleKey],
    );
  } catch (err) {
    console.warn('[errandBundles] dismissBundleForToday failed', err);
  }
}

/** Test helper — clears the cached db handle so a fresh in-memory db is opened next call. */
export function __resetErrandBundleDb(): void {
  db = null;
}
