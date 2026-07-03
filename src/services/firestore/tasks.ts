import {
  getFirestore,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  Timestamp,
} from '@react-native-firebase/firestore';
import { getCurrentWeekBoundaries, todayISO } from '../../utils/date';
import type { Task } from '../../types';
import { tasksRef, taskRef } from './refs';
import { mapSnapshotDocs } from './snapshot';

/**
 * Add a new task for the given user.
 * Returns the auto-generated Firestore document ID.
 */
export async function addTask(
  uid: string,
  data: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'pendingSync'>,
): Promise<string> {
  const ref = await addDoc(tasksRef(uid), {
    ...data,
    done: false,
    createdAt: Timestamp.now(),
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
  return mapSnapshotDocs<Task>(snap);
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
      batch.update(d.ref, { date: today, createdAt: Timestamp.now() });
    });
    await batch.commit();
  }
}

/**
 * Fetch all tasks for the given calendar month once.
 *
 * @param uid        - User ID
 * @param yearMonth  - 'YYYY-MM' (e.g. '2026-05')
 */
export async function getTasksForMonth(uid: string, yearMonth: string): Promise<Task[]> {
  const [year, month] = yearMonth.split('-').map(Number);
  const start = `${yearMonth}-01`;
  // First day of next month as exclusive upper bound (ISO string comparison works)
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  const q = query(
    tasksRef(uid),
    where('date', '>=', start),
    where('date', '<',  nextMonth),
  );
  const snap = await getDocs(q);
  return mapSnapshotDocs<Task>(snap);
}

/**
 * Mark a task as done or undone.
 * Sets completedAt to now when marking done; clears it when marking undone.
 *
 * When `completedPlace` is passed on a `done: true` call, persists it as
 * `completedPlaceId` / `completedPlaceName` / `completedPoiType` — the place
 * the user was next to at brush time (KAN-226). Omitted (or `done: false`)
 * writes touch no completedPlace* fields.
 */
export async function setTaskDone(
  uid: string,
  taskId: string,
  done: boolean,
  completedPlace?: { placeId: string; name: string; poiType: string },
): Promise<void> {
  await updateDoc(taskRef(uid, taskId), {
    done,
    completedAt: done ? Timestamp.now() : null,
    ...(done && completedPlace ? {
      completedPlaceId:   completedPlace.placeId,
      completedPlaceName: completedPlace.name,
      completedPoiType:   completedPlace.poiType,
    } : {}),
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

  // Firestore caps a single batch at 500 writes — chunk to stay under it
  // (matches the chunking in rolloverIncompleteTasks above).
  const BATCH_LIMIT = 500;
  const db = getFirestore();
  for (let i = 0; i < taskIds.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    taskIds.slice(i, i + BATCH_LIMIT).forEach(id => {
      batch.update(taskRef(uid, id), { poiAlertSeenDate: date });
    });
    await batch.commit();
  }
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
