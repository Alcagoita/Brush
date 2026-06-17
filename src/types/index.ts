import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// ─── Utility ──────────────────────────────────────────────────────────────────

/** Branded type — prevents accidental use of arbitrary strings as dates. */
export type DateString = string & { readonly __brand: 'DateString' };

export function toDateString(value: string): DateString {
  return value as DateString;
}

// ─── Store fine tuning (KAN-74) ──────────────────────────────────────────────

/**
 * Session-level state for the Store fine tuning feature.
 *
 *   off           — not active; prompt has not been shown (or was shown and dismissed)
 *   prompt_shown  — the bottom-sheet prompt is visible / pending user response
 *   active        — user tapped "Turn on"; indoor proximity radius = 10 m
 */
export type StoreTuningState = 'off' | 'prompt_shown' | 'active';

// ─── User ─────────────────────────────────────────────────────────────────────

/** /users/{uid} */
export interface User {
  uid: string;
  email: string;
  displayName: string;
  darkMode: boolean;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  /**
   * Unique handle chosen at sign-up (KAN-97).
   * Stored lowercase without the `@` prefix (e.g. `alice`).
   * Display as `@${username}` in the UI.
   * Case-insensitive — `alice` and `Alice` map to the same document.
   */
  username?: string;
  /** When the username was last set — enforces the 30-day change cooldown (KAN-97). */
  usernameUpdatedAt?: FirebaseFirestoreTypes.Timestamp;
  /** Denormalized count of users this user follows (KAN-98). */
  followingCount?: number;
  /** Denormalized count of users following this user (KAN-98). */
  followersCount?: number;
  /** Sum of points from all earned achievements (KAN-129). */
  totalPoints?: number;
  /** Current consecutive-day task streak. Updated by streak logic. */
  currentStreak?: number;
  /** Distinct POI types at which the user has brushed at least one task (KAN-150). */
  brushedPoiTypes?: string[];
  /**
   * Achievement progress and earn state, keyed by AchievementType (KAN-129).
   * Embedded on the user doc — replaces the old achievements subcollection.
   */
  achievements?: AchievementsMap;
  /**
   * User-controlled feature preferences stored on the root user document.
   * Using a nested object keeps the root document flat for other flags.
   */
  /** Set to true once the user completes the guided first-run onboarding (KAN-140). */
  onboardingDone?: boolean;
  poiPreferences?: {
    /**
     * When true, geofence monitoring is paused whenever battery drops below
     * LOW_BATTERY_THRESHOLD (20%). Default: false (opt-in). KAN-52.
     */
    lowBatteryPause?: boolean;
    /**
     * Store fine tuning preference (KAN-74).
     *
     *   absent / undefined — user has never interacted; prompt is shown on first
     *                        indoor_mapped detection each session.
     *   true               — user has activated via prompt or settings toggle;
     *                        mode auto-activates silently on indoor_mapped.
     *   false              — user has explicitly disabled via settings toggle;
     *                        prompt is suppressed permanently.
     */
    storeTuningEnabled?: boolean;
  };
}

// ─── POI ──────────────────────────────────────────────────────────────────────

export type PoiType =
  | 'atm' | 'cafe' | 'supermarket' | 'pharmacy'
  | 'gas' | 'gym' | 'bank' | 'restaurant' | 'park'
  | 'library' | 'post' | 'store' | 'clinic' | 'salon'
  | 'bus' | 'school';

/** Display label for each POI type. */
export const POI_CATALOG: { type: PoiType; label: string }[] = [
  { type: 'atm',         label: 'ATM'        },
  { type: 'cafe',        label: 'Café'       },
  { type: 'supermarket', label: 'Market'     },
  { type: 'pharmacy',    label: 'Pharmacy'   },
  { type: 'gas',         label: 'Gas'        },
  { type: 'gym',         label: 'Gym'        },
  { type: 'bank',        label: 'Bank'       },
  { type: 'restaurant',  label: 'Restaurant' },
  { type: 'park',        label: 'Park'       },
  { type: 'library',     label: 'Library'    },
  { type: 'post',        label: 'Post'       },
  { type: 'store',       label: 'Store'      },
  { type: 'clinic',      label: 'Clinic'     },
  { type: 'salon',       label: 'Salon'      },
  { type: 'bus',         label: 'Bus'        },
  { type: 'school',      label: 'School'     },
];

/** /users/{uid}/pois/{poiType} */
export interface PoiPreference {
  /**
   * Google Places primary type string. Built-in categories use one of the
   * PoiType values; custom categories may use any Places type (e.g. "gym").
   */
  type: string;
  /** Geofence radius in metres. */
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
  /**
   * The date (YYYY-MM-DD) on which a geofence-exit prompt was last fired for
   * this task. Suppresses repeat exit prompts on the same day (KAN-119).
   */
  exitPromptSeenDate?: string;
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
  errands:  ['supermarket', 'atm', 'pharmacy', 'bank', 'post', 'store'],
  health:   ['pharmacy', 'clinic', 'gym'],
  personal: ['cafe', 'restaurant', 'park', 'salon'],
  work:     ['library', 'school'],
};

/** Maps our PoiType to the corresponding Google Places type string. */
export const POI_GOOGLE_TYPES: Record<PoiType, string> = {
  atm:         'atm',
  cafe:         'cafe',
  supermarket:  'supermarket',
  pharmacy:     'pharmacy',
  gas:          'gas_station',
  gym:          'gym',
  bank:         'bank',
  restaurant:   'restaurant',
  park:         'park',
  library:      'library',
  post:         'post_office',
  store:        'store',
  clinic:       'doctor',
  salon:        'hair_care',
  bus:          'bus_station',
  school:       'school',
};

/** Default geofence radius in metres per POI type. */
export const POI_GEOFENCE_RADIUS: Record<PoiType, number> = {
  atm:         50,
  pharmacy:    50,
  cafe:        75,
  supermarket: 75,
  gas:         75,
  gym:         100,
  bank:        50,
  restaurant:  75,
  park:        150,
  library:     75,
  post:        50,
  store:       75,
  clinic:      75,
  salon:       50,
  bus:         100,
  school:      100,
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
  | 'streak_bonus'         // extra point for consecutive days
  | 'onboarding_bonus';    // Day-1 first-brush reward (KAN-140)

/**
 * All achievement types the app can award.
 *
 * Naming convention:
 *   - Global (awarded once ever):  '<name>'             e.g. 'first_task'
 *   - Date-scoped (once per day):  '<name>'  — the doc ID carries the date
 *                                              e.g. 'daily_complete_2026-05-29'
 */
/**
 * V1 achievement types — KAN-129.
 * `challenge_winner` is kept for the social challenge flow (KAN-104).
 */
export type AchievementType =
  // ── Tin tier — KAN-150 ────────────────────────────────────────────────────
  | 'first_task'       // Add your first task
  | 'first_brush'      // Brush away your first task
  | 'right_place'      // Brush a task while near its POI type
  | 'worth_wait'       // Brush a task that waited at least 3 days
  | 'custom_cat'       // Create a custom category
  | 'out_about'        // Brush tasks at 3 distinct POI types
  // ── Legacy V1 (kept for existing user data) ───────────────────────────────
  | 'early_bird'       // Brush a task away before 9 AM
  | 'day_complete'     // Brush away every task in a single day
  | 'on_a_roll'        // 3-day brushing streak
  | 'explorer'         // Brush away 10 location-based tasks
  | 'centurion'        // Reach 100 achievement points (meta-achievement)
  | 'challenge_winner'; // Won a challenge against friends (KAN-104)

/**
 * Entry inside the `users/{uid}.achievements` map (KAN-129).
 * The map key is the AchievementType string.
 */
export interface AchievementEntry {
  /** Timestamp of first earn. Null / absent = not yet earned. */
  earnedAt: FirebaseFirestoreTypes.Timestamp | null;
  /** How many times this achievement has been earned (0 = not earned). */
  earnCount: number;
  /** Current progress toward the unlock condition. */
  progress: number;
  /** Condition threshold (e.g. 10 for Explorer, 100 for Centurion). */
  target: number;
}

/** The full achievements map embedded on the user document. */
export type AchievementsMap = Partial<Record<AchievementType, AchievementEntry>>;

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
// ─── Notification / User Preferences (KAN-120 / Track B) ─────────────────────

/**
 * Firestore: users/{uid}/userPreferences/prefs
 *
 * Single document that stores all per-user notification toggles and related
 * metadata. Merged-write safe — use `setDoc(..., { merge: true })`.
 */
export interface UserPreferences {
  exitPrompt:               boolean;                             // KAN-119
  eodReminder:              { enabled: boolean; time: string };  // KAN-120 — "21:00"
  streakReminder:           boolean;                             // KAN-121
  achievementNudges:        boolean;                             // KAN-122
  weeklyRecap:              boolean;                             // KAN-123
  reengagementReminders:    boolean;                             // KAN-124
  friendActivity:           boolean;                             // KAN-125
  /** Whether to fire local proximity alerts when near a POI type with pending tasks. KAN-142. */
  notif_nearby_enabled:     boolean;
  /** Updated on every app foreground — used by re-engagement logic (KAN-124). */
  lastOpenedAt?:            FirebaseFirestoreTypes.Timestamp;
  /** Set after the 3-day re-engagement nudge fires (KAN-124) — prevents duplicate sends. */
  lastReengagementNudge?:   FirebaseFirestoreTypes.Timestamp;
  /**
   * Timestamp when the 7-day lapse nudge fired (KAN-127).
   * Prevents further re-engagement nudges for this lapse episode.
   */
  reengagementChurned?:     FirebaseFirestoreTypes.Timestamp;
  /** "YYYY-MM-DD" — prevents more than one achievement nudge per day (KAN-122). */
  lastAchievementNudgeDate?: string;
  /**
   * Per-actor last-nudge timestamps for friend activity (KAN-125).
   * Key = actor UID; value = last time a friend-activity nudge was sent from that actor.
   * Written by the onFriendActivity Cloud Function — not read by the RN app.
   */
  lastFriendNudgeFrom?: Record<string, FirebaseFirestoreTypes.Timestamp>;
}

/** Sensible defaults applied before a user has ever saved preferences. */
export const DEFAULT_USER_PREFERENCES: Omit<
  UserPreferences,
  | 'lastOpenedAt'
  | 'lastReengagementNudge'
  | 'lastAchievementNudgeDate'
  | 'lastFriendNudgeFrom'
  | 'reengagementChurned'
> = {
  exitPrompt:            true,
  eodReminder:           { enabled: true, time: '21:00' },
  streakReminder:        true,
  achievementNudges:     true,
  weeklyRecap:           true,
  reengagementReminders: true,
  friendActivity:        true,
  notif_nearby_enabled:  true,
};

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
  /** User actively declined the OAuth scope prompt — not an error, no retry needed. */
  cancelled: number;
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

// ─── Challenges (KAN-102) ────────────────────────────────────────────────────

export interface ChallengeParticipant {
  username:       string;
  displayName:    string;
  status:         'pending' | 'accepted' | 'declined';
  completedCount: number;
  won:            boolean;
}

/**
 * /challenges/{challengeId}
 *
 * participants is a map of uid → ChallengeParticipant so any party can be
 * looked up in O(1) without a subcollection query.
 */
export interface Challenge {
  id:           string;
  type:         'goal' | 'time';
  goalCount?:   number;
  deadline?:    FirebaseFirestoreTypes.Timestamp;
  createdBy:    string;           // uid of the challenger
  participants: Record<string, ChallengeParticipant>;
  status:       'pending' | 'active' | 'completed';
  createdAt:    FirebaseFirestoreTypes.Timestamp;
  message?:     string;
}

// ─── Follow system (KAN-98) ───────────────────────────────────────────────────

/**
 * One entry in users/{uid}/following/{followedUid}
 * or         users/{uid}/followers/{followerUid}.
 *
 * The `uid` field is the Firestore document ID (the other user's UID).
 */
export interface FollowEntry {
  uid:         string;
  username:    string;
  displayName: string;
  followedAt:  FirebaseFirestoreTypes.Timestamp;
}

// ─── Task sharing (KAN-86 / KAN-87) ──────────────────────────────────────────

/**
 * A shared task record written to sharedTasks/{recipientUid}/incoming/{id}
 * when a user sends a task to another Brush user.
 */
export interface SharedTask {
  id:              string;
  taskId:          string;
  title:           string;
  category:        string;
  poi?:            PoiType;
  sentBy:          string;       // sender uid
  sentByName:      string;       // sender display name
  sentByUsername?: string;       // sender @username (KAN-97)
  sentAt:          FirebaseFirestoreTypes.Timestamp;
  status:          'pending' | 'accepted' | 'declined';
}

/**
 * A pending-notification record written to
 * pendingNotifications/{recipientUid}/items/{id} at send time.
 *
 * The recipient device (KAN-87) subscribes to this collection and triggers
 * a local notifee notification when a new item arrives.
 *
 * NOTE: This is the client-side notification delivery mechanism.
 * A future Firebase Cloud Function can replace/supplement this with
 * true FCM push (for delivery when the app is backgrounded/killed).
 */
export interface PendingNotification {
  id:          string;
  type:        'shared_task';
  title:       string;       // notification title
  body:        string;       // notification body
  data?:       Record<string, string>;
  createdAt:   FirebaseFirestoreTypes.Timestamp;
}
