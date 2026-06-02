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
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  Timestamp,
} from '@react-native-firebase/firestore';
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
  PointsHistoryEntry,
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

/**
 * Fetch all saved POI preferences for a user.
 * Returns defaults for any types not yet customised.
 * @deprecated Use getPoiPreferencesMap for a flat map or subscribeToPoiPreferences
 *             for real-time updates.
 */
export async function getAllPoiPreferences(uid: string): Promise<PoiPreference[]> {
  const allTypes: PoiType[] = ['atm', 'cafe', 'supermarket', 'pharmacy'];
  return Promise.all(allTypes.map(t => getPoiPreference(uid, t)));
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
 * Award 1 point for completing a task (KAN-31).
 *
 * Uses a write batch so both operations are atomic — if either write fails,
 * neither is committed. This prevents totalPoints from incrementing without
 * a corresponding history entry (or vice-versa).
 *
 *   1. Increments `totalPoints` on /users/{uid} (server-side, no read needed).
 *   2. Adds a PointsHistoryEntry to /users/{uid}/pointsHistory.
 */
export async function awardPoint(
  uid: string,
  taskId: string,
  taskTitle: string,
): Promise<void> {
  const db = getFirestore();
  const batch = writeBatch(db);

  // Pre-generate an auto-ID ref so we can use batch.set instead of addDoc.
  const histRef = doc(pointsHistoryRef(uid));

  batch.update(userRef(uid), { totalPoints: increment(1) });
  batch.set(histRef, {
    taskId,
    taskTitle,
    awardedAt: serverTimestamp(),
    points: 1,
    reason: 'task_completed',
  } satisfies Omit<PointsHistoryEntry, 'id'>);

  await batch.commit();
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

/**
 * Subscribe to the user's earned achievements, newest first.
 * Returns an unsubscribe function — call on component unmount.
 */
export function subscribeToAchievements(
  uid: string,
  onUpdate: (achievements: Achievement[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    query(achievementsRef(uid), orderBy('earnedAt', 'desc')),
    snap => { if (!snap) return; onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as Achievement))); },
    onError,
  );
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
    snap => { if (!snap) return; onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as PointsHistoryEntry))); },
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

// ─── Re-exports for convenience ───────────────────────────────────────────────

export { Timestamp, serverTimestamp };
export type { CategoryKey, PoiType };
