import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// ─── Utility ──────────────────────────────────────────────────────────────────

/** Branded type — prevents accidental use of arbitrary strings as dates. */
export type DateString = string & { readonly __brand: 'DateString' };

export function toDateString(value: string): DateString {
  return value as DateString;
}

// ─── User ─────────────────────────────────────────────────────────────────────

/** /users/{uid} */
export interface User {
  uid: string;
  email: string;
  displayName: string;
  darkMode: boolean;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  /**
   * User-controlled feature preferences stored on the root user document.
   * Using a nested object keeps the root document flat for other flags.
   */
  poiPreferences?: {
    /**
     * When true, geofence monitoring is paused whenever battery drops below
     * LOW_BATTERY_THRESHOLD (20%). Default: false (opt-in). KAN-52.
     */
    lowBatteryPause?: boolean;
  };
}

// ─── POI ──────────────────────────────────────────────────────────────────────

export type PoiType = 'atm' | 'cafe' | 'supermarket' | 'pharmacy';

/** /users/{uid}/pois/{poiType} */
export interface PoiPreference {
  /**
   * Google Places primary type string. Built-in categories use one of the four
   * PoiType values; custom categories may use any Places type (e.g. "gym").
   */
  type: string;
  /** Geofence radius in metres. Defaults: ATM/pharmacy = 50 m, café/supermarket = 75 m. */
  radiusMeters: number;
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export type CategoryKey = 'work' | 'health' | 'errands' | 'personal';

/** /users/{uid}/tasks/{taskId} */
export interface Task {
  id: string;
  title: string;
  /** Built-in CategoryKey or a Firestore custom category ID (KAN-61). */
  category: string;
  done: boolean;
  /** Free-text description — optional, added in KAN-12. */
  description?: string;
  /** Scheduled time in "HH:MM" format — optional. */
  time?: string;
  /**
   * The external source this task was imported from (KAN-84 / KAN-85).
   * Undefined for tasks created natively inside the app.
   */
  source?: 'google_tasks' | 'google_calendar' | 'eventkit_reminders' | 'eventkit_calendar';
  /**
   * Google Places primary type string this task is associated with — optional.
   * For built-in categories this is one of the four PoiType values; for custom
   * categories it may be any Google Places type (e.g. "gym", "restaurant").
   */
  poi?: string;
  /** Google Places ID if the user pinned a specific place — optional. */
  poiPlaceId?: string;
  /**
   * The date (YYYY-MM-DD) on which a geofence-entry notification was last
   * fired for this task. Suppresses repeat alerts on the same day (KAN-24).
   */
  poiAlertSeenDate?: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  completedAt?: FirebaseFirestoreTypes.Timestamp;
  /** Calendar date this task belongs to, formatted as "YYYY-MM-DD". */
  date: string;
}

// ─── Category ─────────────────────────────────────────────────────────────────

/**
 * A task category — either one of the 4 built-in design-system categories
 * or a user-created custom category stored in Firestore.
 *
 * /users/{uid}/categories/{id}  (custom categories only — built-ins are derived
 * from design tokens and never written to Firestore)
 */
export interface Category {
  /** 'work' | 'health' | 'errands' | 'personal' for built-ins; Firestore ID for custom. */
  id: string;
  name: string;
  /** Hex colour string (e.g. "#5b7fd4"). */
  color: string;
  /**
   * Google Places primary type string (e.g. "gym", "restaurant", "atm").
   * Built-in categories use one of the four PoiType values; custom categories
   * may store any Google Places type discovered via the search feature.
   * Null means no location association.
   */
  poi: string | null;
  /** Built-in categories cannot be renamed, recoloured, or deleted. */
  isBuiltIn: boolean;
}

// ─── POI / category mapping constants ─────────────────────────────────────────

/** Which POI types can appear on tasks of each category. */
export const CATEGORY_POI_MAP: Record<CategoryKey, PoiType[]> = {
  errands:  ['supermarket', 'atm', 'pharmacy'],
  health:   ['pharmacy'],
  personal: ['cafe'],
  work:     [],
};

/** Maps our PoiType to the corresponding Google Places type string. */
export const POI_GOOGLE_TYPES: Record<PoiType, string> = {
  supermarket: 'supermarket',
  atm:         'atm',
  pharmacy:    'pharmacy',
  cafe:        'cafe',
};

/** Default geofence radius in metres per POI type. */
export const POI_GEOFENCE_RADIUS: Record<PoiType, number> = {
  atm:         50,
  pharmacy:    50,
  cafe:        75,
  supermarket: 75,
};

// ─── Points & Achievements ────────────────────────────────────────────────────

/**
 * All valid reasons a point can be awarded (KAN-63).
 * Add new literals here; create a dedicated awardPoint* function in
 * firestore.ts for each — do NOT repurpose existing function signatures.
 */
export type PointsReason =
  | 'task_completed'       // 1 point per completed task (KAN-31)
  | 'achievement_bonus'    // bonus when an achievement is unlocked
  | 'daily_complete_bonus' // bonus for completing the full daily list
  | 'streak_bonus';        // extra point for consecutive days

/**
 * All achievement types the app can award.
 *
 * Naming convention:
 *   - Global (awarded once ever):  '<name>'             e.g. 'first_task'
 *   - Date-scoped (once per day):  '<name>'  — the doc ID carries the date
 *                                              e.g. 'daily_complete_2026-05-29'
 */
export type AchievementType =
  | 'first_task'      // very first task ever completed
  | 'daily_complete'; // every task for a calendar day completed (KAN-32)

/**
 * /users/{uid}/pointsHistory/{id}
 *
 * One document per point awarded. Used for the points history screen (KAN-33)
 * and as the source of truth if `totalPoints` ever needs to be recomputed.
 */
export interface PointsHistoryEntry {
  /** Firestore document ID (auto-generated). */
  id: string;
  /** The task that earned the point. */
  taskId: string;
  /** Snapshot of the task title at completion time. */
  taskTitle: string;
  awardedAt: FirebaseFirestoreTypes.Timestamp;
  /** Points awarded — always 1 in v1; kept for future multi-point awards. */
  points: number;
  /**
   * Why the point was awarded — discriminated union for future extensibility.
   * New types added in KAN-63:
   *   'achievement_bonus'     — bonus when an achievement is unlocked
   *   'daily_complete_bonus'  — bonus for completing the full daily list
   *   'streak_bonus'          — extra point for consecutive days
   */
  reason: PointsReason;
}

/**
 * /users/{uid}/achievements/{achievementId}
 *
 * Document ID rules:
 *   - Global achievements  →  achievementId = type  (e.g. 'first_task')
 *   - Date-scoped ones     →  achievementId = `${type}_${YYYY-MM-DD}`
 *                              (e.g. 'daily_complete_2026-05-29')
 *
 * Using the ID as the natural key makes writes idempotent — awarding the same
 * achievement twice simply overwrites with identical data.
 */
export interface Achievement {
  /**
   * Firestore document ID.
   * Equals `type` for global achievements; `${type}_${date}` for date-scoped.
   */
  id: string;
  type: AchievementType;
  earnedAt: FirebaseFirestoreTypes.Timestamp;
  /** Optional contextual data — e.g. `{ date: '2026-05-29' }` for daily_complete. */
  metadata?: Record<string, unknown>;
}

// ─── Task import (KAN-83 / KAN-84 / KAN-85) ──────────────────────────────────

/**
 * Result returned by every import connector.
 * Connectors live in src/services/import.ts; the UI (ImportTasksSection) only
 * depends on this shape.
 */
export interface ImportResult {
  /** Number of tasks written to Firestore. */
  imported: number;
  /** Tasks skipped because an identical title already existed (case-insensitive). */
  skipped: number;
  /** Tasks that failed to write. */
  failed: number;
}

// ─── Screen UiState types (KAN-57) ───────────────────────────────────────────
//
// Discriminated unions that replace separate loading-flag + data-array state.
// Each union covers all three cases: loading, success, and error.
//
// Pattern (NowInAndroid / TypeScript):
//   | { status: 'loading' }                    — data in flight
//   | { status: 'success'; <payload> }         — data available
//   | { status: 'error';   message: string }   — retrieval failed, show feedback
//
// Kept in types/index.ts so KAN-59's custom hooks can import them without
// a dependency cycle.

/** UiState for a list of today's tasks (TodayScreen). */
export type TasksUiState =
  | { status: 'loading' }
  | { status: 'success'; tasks: Task[] }
  | { status: 'error';   message: string };

/** UiState for the custom categories list (CategoriesScreen). */
export type CategoriesUiState =
  | { status: 'loading' }
  | { status: 'success'; categories: Category[] }
  | { status: 'error';   message: string };

/** UiState for a month's tasks (CalendarScreen). */
export type MonthTasksUiState =
  | { status: 'loading' }
  | { status: 'success'; tasks: Task[] }
  | { status: 'error';   message: string };

// ─── Legacy calendar types (kept for backward compatibility) ──────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: DateString;
  startTime: string;
  endTime: string;
  color: string;
}

/** @deprecated Use CalendarEvent. */
export type Event = CalendarEvent;

export type MarkedDates = Record<DateString, { marked: boolean; dotColor: string }>;
