import {
  getFirestore,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  deleteField,
  writeBatch,
  runTransaction,
  query,
  where,
  orderBy,
  Timestamp,
} from '@react-native-firebase/firestore';
import { getCurrentWeekBoundaries, todayISO } from '../../utils/date';
import type { Task, User } from '../../types';
import { tasksRef, taskRef, userRef, learnedPlaceCountsRef, learnedPlaceCountRef } from './refs';
import { mapSnapshotDocs } from './snapshot';
import type { LearnedPlace } from '../learnedPlaces';

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
 * `completedPlace` is the hero/nearby place snapshotted at brush time
 * (KAN-226). It's a snapshot of the current completion, not sticky history —
 * `completedPlaceId` / `completedPlaceName` / `completedPoiType` are written
 * when passed on a `done: true` call, and deleted from the doc in every
 * other case (`done: false`, or `done: true` with no matching place), so a
 * later re-completion without a place can never resurrect stale metadata.
 *
 * Transactional (KAN-240): alongside the task doc, keeps the per-place visit
 * counter at `/users/{uid}/learnedPlaceCounts/{placeId}` in lockstep —
 * decrementing the venue this task previously counted toward (if any) and
 * incrementing the one it counts toward now. This is what lets
 * learnedPlaces.ts rank venues by reading a handful of counter docs instead
 * of re-scanning the user's entire completed-task history on every toggle.
 * A same-place re-brush without an intervening undo nets to zero and is
 * skipped. All `tx.get` calls happen before any writes — required by
 * Firestore transaction semantics.
 */
export async function setTaskDone(
  uid: string,
  taskId: string,
  done: boolean,
  completedPlace?: { placeId: string; name: string; poiType: string },
): Promise<void> {
  const hasPlace    = done && !!completedPlace;
  const nextPlaceId = hasPlace ? completedPlace!.placeId : undefined;
  const db   = getFirestore();
  const tRef = taskRef(uid, taskId);

  await runTransaction(db, async (tx) => {
    const taskSnap    = await tx.get(tRef);
    const prevPlaceId = (taskSnap.data() as Task | undefined)?.completedPlaceId;

    const decrementPrev = !!prevPlaceId && prevPlaceId !== nextPlaceId;
    const incrementNext = hasPlace && completedPlace!.placeId !== prevPlaceId;

    const prevRef  = decrementPrev ? learnedPlaceCountRef(uid, prevPlaceId!) : null;
    const prevSnap = prevRef ? await tx.get(prevRef) : null;
    const nextRef  = incrementNext ? learnedPlaceCountRef(uid, completedPlace!.placeId) : null;
    const nextSnap = nextRef ? await tx.get(nextRef) : null;

    tx.update(tRef, {
      done,
      completedAt: done ? Timestamp.now() : null,
      completedPlaceId:   hasPlace ? completedPlace!.placeId : deleteField(),
      completedPlaceName: hasPlace ? completedPlace!.name   : deleteField(),
      completedPoiType:   hasPlace ? completedPlace!.poiType : deleteField(),
    });

    if (prevRef && prevSnap?.exists()) {
      const visitCount = ((prevSnap.data() as LearnedPlace).visitCount ?? 1) - 1;
      if (visitCount <= 0) {
        tx.delete(prevRef);
      } else {
        tx.update(prevRef, { visitCount });
      }
    }

    if (nextRef) {
      const visitCount = (nextSnap?.exists() ? (nextSnap.data() as LearnedPlace).visitCount : 0) + 1;
      tx.set(nextRef, {
        placeId:    completedPlace!.placeId,
        name:       completedPlace!.name,
        poiType:    completedPlace!.poiType,
        visitCount,
      });
    }
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

/**
 * Fetch the per-place visit-count ranking source for learnedPlaces.ts
 * (KAN-240). Reads `/users/{uid}/learnedPlaceCounts/{placeId}` — one small
 * doc per distinct venue the user has ever brushed a task at, kept current by
 * setTaskDone's transaction — instead of re-scanning the user's entire
 * completed-task history on every call (the previous getCompletedTasksWithPlace
 * behaviour, unbounded and called on every task toggle).
 */
export async function getLearnedPlaceCounts(uid: string): Promise<LearnedPlace[]> {
  const snap = await getDocs(learnedPlaceCountsRef(uid));
  return mapSnapshotDocs<LearnedPlace>(snap, 'placeId');
}

/**
 * One-time migration (KAN-240): tallies every historical `completedPlaceId`
 * brush (the same unbounded scan getCompletedTasksWithPlace used to run on
 * every toggle) into `/users/{uid}/learnedPlaceCounts/{placeId}`, for users
 * who brushed tasks before the incremental counter existed.
 *
 * Gated by `learnedPlaceCountsBackfilled` on the user doc, so this full scan
 * runs at most once per user — safe to call unconditionally on every boot.
 *
 * Race note: a setTaskDone() increment landing on the same placeId while this
 * is still tallying could be overwritten by the blind `batch.set` below.
 * Acceptable for a one-time migration window; unreachable once the flag is set.
 */
export async function backfillLearnedPlaceCounts(uid: string): Promise<void> {
  const userSnap = await getDoc(userRef(uid));
  if ((userSnap.data() as User | undefined)?.learnedPlaceCountsBackfilled) { return; }

  const q = query(tasksRef(uid), where('completedPlaceId', '!=', null));
  const snap = await getDocs(q);
  const tasks = mapSnapshotDocs<Task>(snap);

  const counts = new Map<string, { name: string; poiType: string; visitCount: number }>();
  for (const task of tasks) {
    if (!task.completedPlaceId) { continue; }
    const existing = counts.get(task.completedPlaceId);
    if (existing) {
      existing.visitCount += 1;
    } else {
      counts.set(task.completedPlaceId, {
        name:       task.completedPlaceName ?? '',
        poiType:    task.completedPoiType ?? '',
        visitCount: 1,
      });
    }
  }

  const db = getFirestore();
  const entries = [...counts.entries()];

  // Firestore caps a single batch at 500 writes — chunk to stay under it
  // (matches the chunking in rolloverIncompleteTasks above).
  const BATCH_LIMIT = 500;
  for (let i = 0; i < entries.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    entries.slice(i, i + BATCH_LIMIT).forEach(([placeId, info]) => {
      batch.set(learnedPlaceCountRef(uid, placeId), { placeId, ...info });
    });
    await batch.commit();
  }

  await updateDoc(userRef(uid), { learnedPlaceCountsBackfilled: true });
}
