/**
 * firestore.ts — Firestore CRUD helpers for the Vibe Agenda data model.
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
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from '@react-native-firebase/firestore';
import {
  Task,
  User,
  PoiPreference,
  PoiType,
  CategoryKey,
  POI_GEOFENCE_RADIUS,
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

function poiRef(uid: string, poiType: PoiType) {
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
    snap => onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task))),
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
    snap => onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task))),
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
 * Fetch a user's geofence radius preference for a POI type.
 * Falls back to the spec default if no preference is saved.
 */
export async function getPoiPreference(
  uid: string,
  poiType: PoiType,
): Promise<PoiPreference> {
  const snap = await getDoc(poiRef(uid, poiType));
  if (snap.exists()) {
    return snap.data() as PoiPreference;
  }
  return { type: poiType, radiusMeters: POI_GEOFENCE_RADIUS[poiType] };
}

/**
 * Persist a user's geofence radius preference for a POI type.
 */
export async function setPoiPreference(
  uid: string,
  poiType: PoiType,
  radiusMeters: number,
): Promise<void> {
  await setDoc(poiRef(uid, poiType), { type: poiType, radiusMeters });
}

/**
 * Fetch all saved POI preferences for a user.
 * Returns defaults for any types not yet customised.
 */
export async function getAllPoiPreferences(uid: string): Promise<PoiPreference[]> {
  const allTypes: PoiType[] = ['atm', 'cafe', 'supermarket', 'pharmacy'];
  return Promise.all(allTypes.map(t => getPoiPreference(uid, t)));
}

// ─── Re-exports for convenience ───────────────────────────────────────────────

export { Timestamp, serverTimestamp };
export type { CategoryKey, PoiType };
