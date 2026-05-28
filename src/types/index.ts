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
  category: CategoryKey;
  done: boolean;
  /** Scheduled time in "HH:MM" format — optional. */
  time?: string;
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
