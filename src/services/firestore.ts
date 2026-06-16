/**
 * firestore.ts — Firestore CRUD helpers for the Brush data model.
 *
 * All reads/writes are scoped to /users/{uid}/... — never touches another
 * user's data (enforced here and in Firestore security rules).
 *
 * Collections:
 *   /users/{uid}                — user profile + preferences
 *   /users/{uid}/tasks/{id}     — to-do tasks
 *   /users/{uid}/pois/{poiType} — per-POI geofence radius preferences
 */

import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  writeBatch,
  runTransaction,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  Timestamp,
} from '@react-native-firebase/firestore';
import { getCurrentWeekBoundaries, todayISO } from '../utils/date';
import {
  Task,
  User,
  Category,
  PoiPreference,
  PoiType,
  CategoryKey,
  POI_GEOFENCE_RADIUS,
  AchievementType,
  Achievement,
  AchievementsMap,
  PointsHistoryEntry,
  PointsReason,
  UserPreferences,
} from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tasksRef(uid: string) {
  return collection(getFirestore(), 'users', uid, 'tasks');
}

function taskRef(uid: string, taskId: string) {
  return doc(getFirestore(), 'users', uid, 'tasks', taskId);
}

function userRef(uid: string) {
  return doc(getFirestore(), 'users', uid);
}

/** users/{uid}/userPreferences/prefs — single preferences document. */
function userPrefsRef(uid: string) {
  return doc(getFirestore(), 'users', uid, 'userPreferences', 'prefs');
}

function poisRef(uid: string) {
  return collection(getFirestore(), 'users', uid, 'pois');
}

function poiRef(uid: string, poiType: string) {
  return doc(getFirestore(), 'users', uid, 'pois', poiType);
}

// ─── User ─────────────────────────────────────────────────────────────────────

/**
 * Create or update a user document on sign-up / profile change.
 * Uses merge so partial updates don't wipe existing fields.
 */
export async function upsertUser(
  uid: string,
  data: Partial<Omit<User, 'uid' | 'createdAt'>>,
): Promise<void> {
  await setDoc(
    userRef(uid),
    { uid, ...data },
    { merge: true },
  );
}

/**
 * Update the displayName field on the Firestore user document (KAN-18).
 * Callers should also call firebase.auth().currentUser.updateProfile() to
 * keep the Auth profile in sync — see ProfileScreen.
 */
export async function updateDisplayName(uid: string, displayName: string): Promise<void> {
  await updateDoc(userRef(uid), { displayName });
}

/** Fetch the user document once. Returns null if it doesn't exist yet. */
export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(userRef(uid));
  return snap.exists() ? (snap.data() as User) : null;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

/**
 * Add a new task for the given user.
 * Returns the auto-generated Firestore document ID.
 */
export async function addTask(
  uid: string,
  data: Omit<Task, 'id' | 'createdAt' | 'completedAt'>,
): Promise<string> {
  const ref = await addDoc(tasksRef(uid), {
    ...data,
    done: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Fetch all tasks for a specific date (YYYY-MM-DD), ordered by creation time. */
export async function getTasksForDate(uid: string, date: string): Promise<Task[]> {
  const q = query(
    tasksRef(uid),
    where('date', '==', date),
    orderBy('createdAt', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
}

/**
 * Roll forward any undone task still dated before `today` so it becomes
 * today's task (KAN-146 — tasks persist until brushed away; an unfinished
 * task is never cleared, it simply becomes "new" the next day).
 *
 * Bumps both `date` and `createdAt` to now — the task is treated as freshly
 * created today, matching how it will appear and score on the Today screen.
 *
 * This is the client-side correctness fallback: the per-user `today` here is
 * computed in the device's local timezone, unlike the best-effort UTC-anchored
 * server-side `rolloverIncompleteTasks` Cloud Function. Calling this is safe
 * even if the server-side job already ran — there's nothing left to roll over.
 *
 * Idempotent and cheap when there's nothing to roll over (single query, no
 * writes). Intended to run once during SplashScreen boot, before the task
 * list is fetched for the day.
 */
export async function rolloverIncompleteTasks(uid: string, today: string = todayISO()): Promise<void> {
  const q = query(
    tasksRef(uid),
    where('done', '==', false),
    where('date', '<', today),
  );
  const snap = await getDocs(q);
  if (snap.empty) { return; }

  // Firestore caps a single batch at 500 writes — chunk to stay under it
  // (matches the server-side rolloverIncompleteTasks Cloud Function).
  const BATCH_LIMIT = 500;
  const db = getFirestore();
  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + BATCH_LIMIT).forEach(d => {
      batch.update(d.ref, { date: today, createdAt: serverTimestamp() });
    });
    await batch.commit();
  }
}

/**
 * Subscribe to live updates for a user's tasks on a given date.
 * Returns an unsubscribe function — call it on component unmount.
 */
export function subscribeToTasksForDate(
  uid: string,
  date: string,
  onUpdate: (tasks: Task[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const q = query(
    tasksRef(uid),
    where('date', '==', date),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(
    q,
    snap => { if (!snap) { onUpdate([]); return; } onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task))); },
    onError,
  );
}

/**
 * Subscribe to all tasks for the given calendar month.
 *
 * @param uid        - User ID
 * @param yearMonth  - 'YYYY-MM' (e.g. '2026-05')
 * @param onUpdate   - Receives the full task list for that month on every change
 * @param onError    - Optional error handler
 * @returns Unsubscribe function — call on component unmount
 */
export function subscribeToTasksForMonth(
  uid: string,
  yearMonth: string,
  onUpdate: (tasks: Task[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const [year, month] = yearMonth.split('-').map(Number);
  const start = `${yearMonth}-01`;
  // First day of next month as exclusive upper bound (ISO string comparison works)
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  const q = query(
    tasksRef(uid),
    where('date', '>=', start),
    where('date', '<',  nextMonth),
  );
  return onSnapshot(
    q,
    snap => { if (!snap) { onUpdate([]); return; } onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task))); },
    onError,
  );
}

/**
 * Subscribe to all undone tasks that have a POI (needed for geofence matching).
 * Returns an unsubscribe function.
 */
export function subscribeToPoiTasks(
  uid: string,
  onUpdate: (tasks: Task[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const q = query(
    tasksRef(uid),
    where('done', '==', false),
    where('poi', '!=', null),
  );
  return onSnapshot(
    q,
    snap => { if (!snap) { onUpdate([]); return; } onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task))); },
    onError,
  );
}

/**
 * Mark a task as done or undone.
 * Sets completedAt to now when marking done; clears it when marking undone.
 */
export async function setTaskDone(
  uid: string,
  taskId: string,
  done: boolean,
): Promise<void> {
  await updateDoc(taskRef(uid, taskId), {
    done,
    completedAt: done ? serverTimestamp() : null,
  });
}

/** Update any mutable fields on a task (title, category, time, poi, date…). */
export async function updateTask(
  uid: string,
  taskId: string,
  data: Partial<Omit<Task, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(taskRef(uid, taskId), data);
}

/** Permanently delete a task. */
export async function deleteTask(uid: string, taskId: string): Promise<void> {
  await deleteDoc(taskRef(uid, taskId));
}

/**
 * Mark that a POI proximity alert was shown for this task today (KAN-24).
 * Subsequent calls on the same date are no-ops in the proximity service.
 * Pass `date` as a YYYY-MM-DD string (use todayISO() from the caller).
 */
export async function markPoiAlertSeen(
  uid: string,
  taskId: string,
  date: string,
): Promise<void> {
  await updateDoc(taskRef(uid, taskId), { poiAlertSeenDate: date });
}

/**
 * Mark ALL undone tasks of a given POI type as having seen a proximity alert
 * today (KAN-142). Ensures at most one notification fires per POI type per day,
 * even when multiple tasks share the same type.
 */
export async function markAllPoiAlertsSeen(
  uid: string,
  taskIds: string[],
  date: string,
): Promise<void> {
  if (taskIds.length === 0) { return; }
  const db    = getFirestore();
  const batch = writeBatch(db);
  for (const id of taskIds) {
    batch.update(taskRef(uid, id), { poiAlertSeenDate: date });
  }
  await batch.commit();
}

/**
 * Record that a geofence-exit prompt was shown for `taskId` on `date`.
 * Updates `exitPromptSeenDate` to suppress repeat exit prompts on the same
 * day (KAN-119).
 */
export async function markExitPromptSeen(
  uid: string,
  taskId: string,
  date: string,
): Promise<void> {
  await updateDoc(taskRef(uid, taskId), { exitPromptSeenDate: date });
}

/**
 * Record that an indoor proximity alert has been shown for `taskId` on `date`.
 * Updates `store.alertSeenDate` to suppress repeat alerts on the same day (KAN-75).
 */
export async function markStoreAlertSeen(
  uid: string,
  taskId: string,
  date: string,
): Promise<void> {
  await updateDoc(taskRef(uid, taskId), { 'store.alertSeenDate': date });
}

// ─── POI preferences ──────────────────────────────────────────────────────────

/**
 * Subscribe to live updates for all of the user's POI geofence radius
 * preferences. Fires immediately with the current stored values, then again
 * whenever any preference is created, updated, or deleted.
 *
 * `onUpdate` receives a plain `Record<string, number>` map of
 * `poiType → radiusMeters` containing ONLY the types that the user has
 * explicitly saved. Callers should fall back to `POI_GEOFENCE_RADIUS` (and
 * then to `DEFAULT_GEOFENCE_RADIUS`) for any type not present in the map.
 *
 * Returns an unsubscribe function — call it on component unmount.
 */
export function subscribeToPoiPreferences(
  uid: string,
  onUpdate: (prefs: Record<string, number>) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    poisRef(uid),
    snap => {
      if (!snap) return;
      const prefs: Record<string, number> = {};
      for (const d of snap.docs) {
        const pref = d.data() as PoiPreference;
        prefs[pref.type] = pref.radiusMeters;
      }
      onUpdate(prefs);
    },
    onError,
  );
}

/**
 * Fetch a user's geofence radius preference for a POI type.
 * Accepts any Google Places primary type string (built-in or custom).
 * Falls back to the spec default for built-in types; custom types that have
 * no saved preference return a 75 m default.
 */
export async function getPoiPreference(
  uid: string,
  poiType: string,
): Promise<PoiPreference> {
  const snap = await getDoc(poiRef(uid, poiType));
  if (snap.exists()) {
    return snap.data() as PoiPreference;
  }
  const defaultRadius = (POI_GEOFENCE_RADIUS as Record<string, number>)[poiType] ?? 75;
  return { type: poiType, radiusMeters: defaultRadius };
}

/**
 * Persist a user's geofence radius preference for a POI type.
 * Accepts any Google Places primary type string (built-in or custom).
 */
export async function setPoiPreference(
  uid: string,
  poiType: string,
  radiusMeters: number,
): Promise<void> {
  await setDoc(poiRef(uid, poiType), { type: poiType, radiusMeters });
}

/**
 * Fetch all saved POI preferences for a user as a flat map.
 * Returns a `Record<string, number>` (type → radiusMeters) containing ONLY
 * the preferences that have been explicitly stored — callers must apply their
 * own fallback for missing types.
 */
export async function getPoiPreferencesMap(
  uid: string,
): Promise<Record<string, number>> {
  const snap = await getDocs(poisRef(uid));
  const map: Record<string, number> = {};
  for (const d of snap.docs) {
    const pref = d.data() as PoiPreference;
    map[pref.type] = pref.radiusMeters;
  }
  return map;
}


// ─── Custom categories ────────────────────────────────────────────────────────

function categoriesRef(uid: string) {
  return collection(getFirestore(), 'users', uid, 'categories');
}

function categoryRef(uid: string, categoryId: string) {
  return doc(getFirestore(), 'users', uid, 'categories', categoryId);
}

/**
 * Subscribe to the user's custom categories (built-ins are not stored here).
 * Returns an unsubscribe function — call on component unmount.
 */
export function subscribeToCategories(
  uid: string,
  onUpdate: (categories: Category[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    query(categoriesRef(uid), orderBy('name', 'asc')),
    snap => {
      if (!snap) return;
      onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data(), isBuiltIn: false } as Category)));
    },
    onError,
  );
}

/**
 * Create a new custom category.
 * Returns the auto-generated Firestore document ID.
 */
export async function addCategory(
  uid: string,
  data: Omit<Category, 'id' | 'isBuiltIn'>,
): Promise<string> {
  const ref = await addDoc(categoriesRef(uid), { ...data, isBuiltIn: false });
  return ref.id;
}

/**
 * Update a custom category's name, color, or poi.
 * Built-in categories should never be passed here.
 */
export async function updateCategory(
  uid: string,
  categoryId: string,
  data: Partial<Pick<Category, 'name' | 'color' | 'poi'>>,
): Promise<void> {
  await updateDoc(categoryRef(uid, categoryId), data);
}

/**
 * Permanently delete a custom category.
 * The caller is responsible for ensuring it is not a built-in category.
 */
export async function deleteCategory(uid: string, categoryId: string): Promise<void> {
  await deleteDoc(categoryRef(uid, categoryId));
}

// ─── Points & Achievements ────────────────────────────────────────────────────
//
// Collections:
//   /users/{uid}/pointsHistory/{id}      — one doc per point awarded
//   /users/{uid}/achievements/{id}       — one doc per earned achievement
//
// totalPoints is denormalised onto /users/{uid} for fast reads.

function pointsHistoryRef(uid: string) {
  return collection(getFirestore(), 'users', uid, 'pointsHistory');
}

function achievementsRef(uid: string) {
  return collection(getFirestore(), 'users', uid, 'achievements');
}

function achievementRef(uid: string, achievementId: string) {
  return doc(getFirestore(), 'users', uid, 'achievements', achievementId);
}


/**
 * Award 1 point for completing a task (KAN-31 / KAN-128).
 *
 * Idempotent: uses a deterministic document ID `{taskId}_{dateISO}` so that
 * calling this function more than once for the same task on the same day is a
 * no-op — no duplicate history entries and no double-increment of totalPoints.
 *
 * Uses a Firestore transaction so the existence check and both writes are
 * atomic: if the doc already exists the transaction returns early without
 * writing anything.
 */
export async function awardPoint(
  uid: string,
  taskId: string,
  taskTitle: string,
): Promise<void> {
  const db      = getFirestore();
  const dateISO = todayISO();
  const histRef = doc(pointsHistoryRef(uid), `${taskId}_${dateISO}`);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(histRef);
    if (snap.exists()) { return; } // Already awarded today — skip

    tx.set(histRef, {
      taskId,
      taskTitle,
      awardedAt: serverTimestamp(),
      points:    1,
      reason:    'task_completed',
    });
    tx.update(userRef(uid), { totalPoints: increment(1) });
  });
}

/**
 * Reverse a task-completion point award (KAN-128).
 *
 * Called when the user un-completes a task. Deletes the history entry for
 * today (if it exists) and decrements totalPoints atomically.
 * If no entry exists for today (e.g. the task was completed on a prior day)
 * this is a no-op — historical points are never removed.
 */
export async function revokePoint(
  uid:    string,
  taskId: string,
): Promise<void> {
  const db      = getFirestore();
  const dateISO = todayISO();
  const histRef = doc(pointsHistoryRef(uid), `${taskId}_${dateISO}`);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(histRef);
    if (!snap.exists()) { return; } // Nothing to revoke

    tx.delete(histRef);
    tx.update(userRef(uid), { totalPoints: increment(-1) });
  });
}

/**
 * Award points for multiple tasks in a single atomic Firestore write batch.
 *
 * Increments `totalPoints` on the user document by the sum of all entry points,
 * and creates one PointsHistoryEntry per entry — all in one commit.
 *
 * ⚠️ Firestore batch limit: 500 operations per batch.
 * With `n` entries this function performs `1 update + n sets` = `n + 1` ops.
 * Safe limit is therefore **499 entries per call**. Callers with larger lists
 * must chunk themselves — chunking is out of scope for v1.
 *
 * @param uid     Firebase user ID.
 * @param entries Array of { taskId, taskTitle, points } to award. No-ops if empty.
 */
export async function awardPointsBatch(
  uid: string,
  entries: Array<{ taskId: string; taskTitle: string; points: number }>,
): Promise<void> {
  if (entries.length === 0) { return; }
  const db      = getFirestore();
  const batch   = writeBatch(db);
  const dateISO = todayISO();
  const total   = entries.reduce((sum, e) => sum + e.points, 0);

  batch.update(userRef(uid), { totalPoints: increment(total) });

  for (const entry of entries) {
    // Deterministic ID matches awardPoint — calling twice for the same task on
    // the same day overwrites with identical data rather than doubling the entry.
    const histRef = doc(pointsHistoryRef(uid), `${entry.taskId}_${dateISO}`);
    batch.set(histRef, {
      taskId:    entry.taskId,
      taskTitle: entry.taskTitle,
      awardedAt: serverTimestamp(),
      points:    entry.points,
      reason:    'task_completed',
    });
  }

  await batch.commit();
}

// ─── KAN-63: Additional point-award functions ─────────────────────────────────
//
// Rule: each PointsReason has its own dedicated function.
// Never repurpose awardPoint(uid, taskId, taskTitle) for non-task reasons.

/**
 * Award bonus points when an achievement is unlocked.
 *
 * @param uid             Firebase user ID.
 * @param achievementType The achievement type being unlocked (e.g. 'first_task').
 * @param points          Number of bonus points to award.
 */
export async function awardPointsAchievementBonus(
  uid: string,
  achievementType: string,
  points: number,
): Promise<void> {
  const db    = getFirestore();
  const batch = writeBatch(db);
  batch.update(userRef(uid), { totalPoints: increment(points) });
  batch.set(doc(pointsHistoryRef(uid)), {
    taskId:    '',
    taskTitle: `Achievement unlocked: ${achievementType}`,
    awardedAt: serverTimestamp(),
    points,
    reason:    'achievement_bonus',
  });
  await batch.commit();
}

/**
 * Award a bonus when the user completes their entire daily task list.
 *
 * @param uid    Firebase user ID.
 * @param date   The calendar date (YYYY-MM-DD) on which the daily list was completed.
 * @param points Number of bonus points to award.
 */
export async function awardPointsDailyCompleteBonus(
  uid: string,
  date: string,
  points: number,
): Promise<void> {
  const db    = getFirestore();
  const batch = writeBatch(db);
  batch.update(userRef(uid), { totalPoints: increment(points) });
  batch.set(doc(pointsHistoryRef(uid)), {
    taskId:    '',
    taskTitle: `Daily complete: ${date}`,
    awardedAt: serverTimestamp(),
    points,
    reason:    'daily_complete_bonus',
  });
  await batch.commit();
}

/**
 * Award a streak bonus point for completing tasks on consecutive days.
 *
 * @param uid         Firebase user ID.
 * @param streakDays  Current streak length in days (used in the history label).
 * @param points      Number of bonus points to award.
 */
export async function awardPointsStreakBonus(
  uid: string,
  streakDays: number,
  points: number,
): Promise<void> {
  const db    = getFirestore();
  const batch = writeBatch(db);
  batch.update(userRef(uid), { totalPoints: increment(points) });
  batch.set(doc(pointsHistoryRef(uid)), {
    taskId:    '',
    taskTitle: `${streakDays}-day streak`,
    awardedAt: serverTimestamp(),
    points,
    reason:    'streak_bonus',
  });
  await batch.commit();
}

/**
 * Award the Day-1 first-brush onboarding bonus (KAN-140).
 *
 * Distinct from `awardPoint` (1-pt task completion) — this awards the full
 * onboarding bonus amount atomically and records it with reason 'onboarding_bonus'.
 * Idempotent: the history doc key is `onboarding_<uid>` so a second call is a no-op.
 *
 * @param uid       Firebase user ID.
 * @param taskId    The first task the user created during onboarding.
 * @param taskTitle Title of that task (for the history label).
 * @param points    Bonus amount (default: ONBOARDING_BONUS_POINTS = 10).
 */
export const ONBOARDING_BONUS_POINTS = 10;

export async function awardPointsOnboardingBonus(
  uid: string,
  taskId: string,
  taskTitle: string,
  points: number = ONBOARDING_BONUS_POINTS,
): Promise<void> {
  const db     = getFirestore();
  const histRef = doc(pointsHistoryRef(uid), `onboarding_${uid}`);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(histRef);
    if (snap.exists()) { return; } // Already awarded — idempotent

    tx.set(histRef, {
      taskId,
      taskTitle,
      awardedAt: serverTimestamp(),
      points,
      reason: 'onboarding_bonus',
    });
    tx.update(userRef(uid), { totalPoints: increment(points) });
  });
}

/**
 * Check whether an achievement has already been awarded.
 * Useful for guarding idempotency-sensitive callers before calling awardAchievement.
 */
export async function hasAchievement(
  uid: string,
  achievementId: string,
): Promise<boolean> {
  const snap = await getDoc(achievementRef(uid, achievementId));
  return snap.exists();
}

/**
 * Idempotently award an achievement (KAN-32).
 *
 * Document ID rules (caller's responsibility):
 *   - Global achievements  →  achievementId = type  (e.g. 'first_task')
 *   - Date-scoped ones     →  achievementId = `${type}_${YYYY-MM-DD}`
 *                              (e.g. 'daily_complete_2026-05-29')
 *
 * Using the natural key as the doc ID means awarding the same achievement twice
 * is a safe no-op (overwrites with identical data).
 */
export async function awardAchievement(
  uid: string,
  achievementId: string,
  type: AchievementType,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await setDoc(
    achievementRef(uid, achievementId),
    {
      type,
      earnedAt: serverTimestamp(),
      ...(metadata !== undefined ? { metadata } : {}),
    },
    { merge: false },
  );
}

/**
 * Subscribe to the user's total points count.
 * Reads the `totalPoints` field on /users/{uid}.
 * Fires immediately, then on every change. Returns an unsubscribe function.
 */
export function subscribeToTotalPoints(
  uid: string,
  onUpdate: (totalPoints: number) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    userRef(uid),
    snap => {
      if (!snap) return;
      const data = snap.data() as { totalPoints?: number } | undefined;
      onUpdate(data?.totalPoints ?? 0);
    },
    onError,
  );
}

export function subscribeToCurrentStreak(
  uid: string,
  onUpdate: (streak: number) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    userRef(uid),
    snap => {
      if (!snap) return;
      const data = snap.data() as { currentStreak?: number } | undefined;
      onUpdate(data?.currentStreak ?? 0);
    },
    onError,
  );
}

/**
 * Subscribe to the user's achievements map (KAN-129).
 * Reads from the `achievements` field on the user document — not the old
 * subcollection. Returns an unsubscribe function.
 */
export function subscribeToAchievements(
  uid: string,
  onUpdate: (map: AchievementsMap) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    userRef(uid),
    snap => {
      const data = snap?.data() as User | undefined;
      onUpdate((data?.achievements ?? {}) as AchievementsMap);
    },
    onError,
  );
}

/**
 * One-time fetch of any user's earned achievements, newest first.
 * Used to read a friend's achievements for the comparison view (KAN-105).
 * Firestore rules allow any authenticated user to read achievements.
 */
export async function getAchievementsForUser(uid: string): Promise<Achievement[]> {
  const snap = await getDocs(query(achievementsRef(uid), orderBy('earnedAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Achievement));
}

/**
 * Subscribe to the user's points history, newest first.
 * Returns an unsubscribe function — call on component unmount.
 */
export function subscribeToPointsHistory(
  uid: string,
  onUpdate: (history: PointsHistoryEntry[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    query(pointsHistoryRef(uid), orderBy('awardedAt', 'desc')),
    snap => {
      if (!snap) { return; }

      // Deduplicate task_completed entries by taskId — keeps the most-recent
      // entry per task (docs are ordered newest-first). Non-task entries
      // (achievement_bonus, streak_bonus, etc.) all carry taskId:'' so they
      // must NOT be deduplicated; they pass through as-is.
      const seen = new Set<string>();
      const unique: PointsHistoryEntry[] = [];
      for (const d of snap.docs) {
        const entry = { id: d.id, ...d.data() } as PointsHistoryEntry;
        if (entry.reason === 'task_completed' && entry.taskId) {
          if (!seen.has(entry.taskId)) {
            seen.add(entry.taskId);
            unique.push(entry);
          }
        } else {
          unique.push(entry);
        }
      }
      onUpdate(unique);
    },
    onError,
  );
}

// ─── Low-battery pause preference (KAN-52) ───────────────────────────────────
//
// Stored on the root user document as `poiPreferences.lowBatteryPause: boolean`.
// This keeps all user-controlled feature flags in one document instead of adding
// a new subcollection, and avoids a snapshot for a simple boolean toggle.

/**
 * Persist the user's "Pause nearby alerts on low battery" preference.
 * Pass `true` to enable, `false` to disable. Default server value is absent
 * (treated as false by subscribers and the proximity engine).
 */
export async function setLowBatteryPausePref(
  uid: string,
  enabled: boolean,
): Promise<void> {
  await updateDoc(userRef(uid), { 'poiPreferences.lowBatteryPause': enabled });
}

/**
 * Subscribe to live updates for the user's low-battery pause preference.
 *
 * Fires immediately with the stored value (or `false` if not yet set), then
 * again whenever the preference changes. Returns an unsubscribe function.
 */
export function subscribeLowBatteryPausePref(
  uid: string,
  onUpdate: (enabled: boolean) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    userRef(uid),
    snap => {
      const data = snap?.data() as User | undefined;
      onUpdate(data?.poiPreferences?.lowBatteryPause ?? false);
    },
    onError,
  );
}

// ─── Usernames (KAN-97) ───────────────────────────────────────────────────────
//
// Schema:
//   usernames/{username}  →  { uid: string }          — uniqueness index
//   users/{uid}           →  { ..., username, usernameUpdatedAt }

/**
 * Usernames are stored and compared in lowercase only — `alice` and `Alice`
 * are treated as the same handle. The stored value never contains the `@`
 * prefix; display code is responsible for prepending it (e.g. `@${username}`).
 */
export const USERNAME_REGEX = /^[a-z0-9_]+$/;
export const USERNAME_MIN   = 3;
export const USERNAME_MAX   = 20;
export const USERNAME_COOLDOWN_DAYS  = 30;
/** New accounts may change their username freely within this window. */
export const USERNAME_GRACE_HOURS   = 24;

/**
 * Returns a validation error string, or null if the value is valid.
 * Expects the value already lowercased — callers should normalise before
 * passing (e.g. `raw.toLowerCase()`).
 */
export function validateUsername(v: string): string | null {
  if (v.length < USERNAME_MIN) { return `At least ${USERNAME_MIN} characters required.`; }
  if (v.length > USERNAME_MAX) { return `Maximum ${USERNAME_MAX} characters.`; }
  if (!USERNAME_REGEX.test(v)) { return 'Only lowercase letters, numbers, and underscores.'; }
  return null;
}

function usernameIndexRef(username: string) {
  return doc(getFirestore(), 'usernames', username);
}

/** Returns true if the username is not yet claimed. */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const snap = await getDoc(usernameIndexRef(username));
  return !snap.exists();
}

/**
 * Atomically claim a username for a user.
 * Writes to both `usernames/{username}` (index) and `users/{uid}` (profile).
 * Uses set-with-merge so the user doc is created if it does not exist yet
 * (new sign-ups have no Firestore document before their first username claim).
 *
 * Throws if the write fails (e.g. Firestore security rule blocks duplicate claim).
 */
export async function claimUsername(uid: string, username: string): Promise<void> {
  const db = getFirestore();
  const batch = writeBatch(db);
  batch.set(usernameIndexRef(username), { uid });
  batch.set(
    userRef(uid),
    { username, usernameUpdatedAt: serverTimestamp() },
    { merge: true },
  );
  await batch.commit();
}

/**
 * Change an existing username, enforcing the 30-day cooldown.
 *
 * Throws an error whose message starts with `username_cooldown:` and contains
 * the number of days remaining, so callers can show a specific message.
 */
export async function updateUsername(uid: string, newUsername: string): Promise<void> {
  const userData = await getUser(uid);
  if (userData?.usernameUpdatedAt) {
    const updatedAt  = (userData.usernameUpdatedAt as Timestamp).toDate();
    const daysSince  = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

    // New accounts get a 24-hour grace window to fix first-time typos.
    const accountAgeMs  = userData.createdAt
      ? Date.now() - (userData.createdAt as Timestamp).toDate().getTime()
      : Infinity;
    const inGracePeriod = accountAgeMs < USERNAME_GRACE_HOURS * 60 * 60 * 1000;

    if (daysSince < USERNAME_COOLDOWN_DAYS && !inGracePeriod) {
      const daysLeft = Math.ceil(USERNAME_COOLDOWN_DAYS - daysSince);
      throw new Error(`username_cooldown:${daysLeft}`);
    }
  }

  const db = getFirestore();
  const batch = writeBatch(db);

  // Remove old username index entry if one exists.
  if (userData?.username) {
    batch.delete(usernameIndexRef(userData.username));
  }

  batch.set(usernameIndexRef(newUsername), { uid });
  batch.set(
    userRef(uid),
    { username: newUsername, usernameUpdatedAt: serverTimestamp() },
    { merge: true },
  );

  await batch.commit();
}

/**
 * Look up a public user by their @username.
 * Returns null if the username is not claimed.
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  const indexSnap = await getDoc(usernameIndexRef(username));
  if (!indexSnap.exists()) { return null; }
  const { uid } = indexSnap.data() as { uid: string };
  return getUser(uid);
}

// ─── Follow system (KAN-98) ───────────────────────────────────────────────────
//
// Schema:
//   users/{uid}/following/{followedUid} → FollowEntry (without uid field)
//   users/{uid}/followers/{followerUid} → FollowEntry (without uid field)
//   users/{uid} → { ..., followingCount, followersCount }

import type { FollowEntry } from '../types';

function followingRef(uid: string) {
  return collection(getFirestore(), 'users', uid, 'following');
}

function followingEntryRef(uid: string, followedUid: string) {
  return doc(getFirestore(), 'users', uid, 'following', followedUid);
}

function followersEntryRef(uid: string, followerUid: string) {
  return doc(getFirestore(), 'users', uid, 'followers', followerUid);
}

/**
 * Follow another user. Atomically:
 *  - writes to follower's /following/{followedUid}
 *  - writes to followed's /followers/{followerUid}
 *  - increments followingCount on follower's doc
 *  - increments followersCount on followed's doc
 *
 * No-op guard: callers should check isFollowing() first to avoid duplicates.
 * Throws if followerUid === followedUid (cannot follow yourself).
 */
export async function followUser(
  followerUid: string,
  followerUsername: string,
  followerDisplayName: string,
  followedUid: string,
  followedUsername: string,
  followedDisplayName: string,
): Promise<void> {
  if (followerUid === followedUid) {
    throw new Error('cannot_follow_self');
  }
  const db    = getFirestore();
  const batch = writeBatch(db);

  batch.set(followingEntryRef(followerUid, followedUid), {
    username:    followedUsername,
    displayName: followedDisplayName,
    followedAt:  serverTimestamp(),
  });
  batch.set(followersEntryRef(followedUid, followerUid), {
    username:    followerUsername,
    displayName: followerDisplayName,
    followedAt:  serverTimestamp(),
  });
  batch.set(userRef(followerUid), { followingCount: increment(1) }, { merge: true });
  batch.set(userRef(followedUid), { followersCount: increment(1) }, { merge: true });

  await batch.commit();
}

/**
 * Unfollow a user. Atomically removes both subcollection entries and
 * decrements the denormalized counts.
 */
export async function unfollowUser(
  followerUid: string,
  followedUid: string,
): Promise<void> {
  const db    = getFirestore();
  const batch = writeBatch(db);

  batch.delete(followingEntryRef(followerUid, followedUid));
  batch.delete(followersEntryRef(followedUid, followerUid));
  batch.set(userRef(followerUid), { followingCount: increment(-1) }, { merge: true });
  batch.set(userRef(followedUid), { followersCount: increment(-1) }, { merge: true });

  await batch.commit();
}

/** Returns true if followerUid currently follows followedUid. */
export async function isFollowing(
  followerUid: string,
  followedUid: string,
): Promise<boolean> {
  const snap = await getDoc(followingEntryRef(followerUid, followedUid));
  return snap.exists();
}

/**
 * Subscribe to the list of users that uid follows, newest first.
 * Returns an unsubscribe function.
 */
export function subscribeToFollowing(
  uid: string,
  onUpdate: (entries: FollowEntry[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    query(followingRef(uid), orderBy('followedAt', 'desc')),
    snap => {
      if (!snap) { return; }
      onUpdate(snap.docs.map(d => ({ uid: d.id, ...d.data() } as FollowEntry)));
    },
    onError,
  );
}

/** One-shot fetch of the users that uid is following, newest first. */
export async function getFollowing(uid: string): Promise<FollowEntry[]> {
  const snap = await getDocs(query(followingRef(uid), orderBy('followedAt', 'desc')));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as FollowEntry));
}

/**
 * Subscribe to the list of users that follow uid, newest first.
 * Returns an unsubscribe function.
 */
export function subscribeToFollowers(
  uid: string,
  onUpdate: (entries: FollowEntry[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    query(
      collection(getFirestore(), 'users', uid, 'followers'),
      orderBy('followedAt', 'desc'),
    ),
    snap => {
      if (!snap) { return; }
      onUpdate(snap.docs.map(d => ({ uid: d.id, ...d.data() } as FollowEntry)));
    },
    onError,
  );
}

/** One-shot fetch of the users that follow uid, newest first. */
export async function getFollowers(uid: string): Promise<FollowEntry[]> {
  const snap = await getDocs(
    query(
      collection(getFirestore(), 'users', uid, 'followers'),
      orderBy('followedAt', 'desc'),
    ),
  );
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as FollowEntry));
}

// ─── Store fine tuning preference (KAN-74) ───────────────────────────────────
//
// Stored on the root user document as `poiPreferences.storeTuningEnabled`.
// Three-state semantics:
//   absent / undefined → show prompt on first indoor_mapped detection
//   true               → auto-activate; user has confirmed the feature
//   false              → user opted out; suppress prompt permanently
//
// Use the same `poiPreferences` map as lowBatteryPause to keep all
// user-controlled feature flags together on the root document.

/**
 * Persist the user's Store fine tuning preference.
 *
 * `true`  — user enabled via prompt or settings toggle
 * `false` — user explicitly disabled via settings toggle (suppresses prompt)
 */
export async function setStoreTuningPref(
  uid: string,
  enabled: boolean,
): Promise<void> {
  await updateDoc(userRef(uid), { 'poiPreferences.storeTuningEnabled': enabled });
}

/**
 * Subscribe to live updates for the user's Store fine tuning preference.
 *
 * `onUpdate` receives `true | false | undefined`:
 *   undefined — field not yet set (first-time user; show prompt on indoor_mapped)
 *   true      — user has enabled the feature
 *   false     — user explicitly disabled (suppress prompt)
 *
 * Returns an unsubscribe function.
 */
export function subscribeStoreTuningPref(
  uid: string,
  onUpdate: (enabled: boolean | undefined) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    userRef(uid),
    snap => {
      const data = snap?.data() as User | undefined;
      onUpdate(data?.poiPreferences?.storeTuningEnabled);
    },
    onError,
  );
}

// ─── User Preferences (KAN-120) ───────────────────────────────────────────────

/**
 * Read preferences once. Returns a partial object — missing fields mean the
 * user has never saved that preference; callers should fall back to
 * DEFAULT_USER_PREFERENCES for any missing key.
 */
export async function getUserPreferences(
  uid: string,
): Promise<Partial<UserPreferences>> {
  const snap = await getDoc(userPrefsRef(uid));
  return (snap.data() as Partial<UserPreferences>) ?? {};
}

/**
 * Merge-write any subset of preferences. Safe to call with partial objects;
 * keys not present in `prefs` are left untouched.
 */
export async function updateUserPreferences(
  uid: string,
  prefs: Partial<UserPreferences>,
): Promise<void> {
  await setDoc(userPrefsRef(uid), prefs, { merge: true });
}

/**
 * Live subscription to the user's preferences document.
 * Returns an unsubscribe function.
 */
export function subscribeToUserPreferences(
  uid: string,
  onUpdate: (prefs: Partial<UserPreferences>) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    userPrefsRef(uid),
    snap => onUpdate((snap?.data() as Partial<UserPreferences>) ?? {}),
    onError,
  );
}

/**
 * Stamp lastOpenedAt on every foreground event.
 * Called from App.tsx AppState listener (KAN-124 dependency).
 */
export async function markLastOpenedAt(uid: string): Promise<void> {
  await setDoc(
    userPrefsRef(uid),
    { lastOpenedAt: serverTimestamp() },
    { merge: true },
  );
}

/**
 * Returns the number of tasks completed during the current calendar week
 * (Monday 00:00 – Sunday 23:59:59 local time).
 *
 * Used by KAN-123 to build the weekly-recap notification copy.
 */
export async function getWeeklyCompletedCount(uid: string): Promise<number> {
  const { monday, sunday } = getCurrentWeekBoundaries();

  const q = query(
    tasksRef(uid),
    where('completedAt', '>=', Timestamp.fromDate(monday)),
    where('completedAt', '<=', Timestamp.fromDate(sunday)),
  );

  const snap = await getDocs(q);
  return snap.docs.length;
}

// ─── One-shot getters (non-subscribing) ──────────────────────────────────────

export async function getCategories(uid: string): Promise<Category[]> {
  const snap = await getDocs(query(categoriesRef(uid), orderBy('name', 'asc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data(), isBuiltIn: false } as Category));
}

export async function getTotalPoints(uid: string): Promise<number> {
  const snap = await getDoc(userRef(uid));
  return (snap.data() as { totalPoints?: number } | undefined)?.totalPoints ?? 0;
}

// ─── Re-exports for convenience ───────────────────────────────────────────────

export { Timestamp, serverTimestamp };
export type { CategoryKey, PoiType };
