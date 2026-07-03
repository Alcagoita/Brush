/**
 * Points & Achievements.
 *
 * Collections:
 *   /users/{uid}/pointsHistory/{id}      — one doc per point awarded
 *   /users/{uid}/achievements/{id}       — one doc per earned achievement
 *
 * totalPoints is denormalised onto /users/{uid} for fast reads.
 */

import {
  getFirestore,
  getDoc,
  getDocs,
  setDoc,
  doc,
  writeBatch,
  runTransaction,
  query,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment,
} from '@react-native-firebase/firestore';
import type { QueryConstraint, QueryDocumentSnapshot } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { todayISO } from '../../utils/date';
import type {
  AchievementType,
  Achievement,
  AchievementsMap,
  PointsHistoryEntry,
  User,
} from '../../types';
import { logTap } from '../analytics';
import { userRef, pointsHistoryRef, achievementsRef, achievementRef } from './refs';
import { mapSnapshotDocs } from './snapshot';

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
 * Award points for multiple tasks atomically, idempotently skipping any entry
 * already awarded today (same deterministic-ID check as {@link awardPoint}).
 *
 * Increments `totalPoints` on the user document by the sum of only the *new*
 * entries' points — an entry whose history doc already exists is skipped
 * entirely, so calling this twice with overlapping entries never double-counts.
 *
 * ⚠️ Firestore transaction limit: 500 documents involved per transaction.
 * With `n` entries this function touches `n` history docs (read + maybe write)
 * plus 1 user doc — safe limit is therefore **~499 entries per call**. Callers
 * with larger lists must chunk themselves — chunking is out of scope for v1.
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
  const dateISO = todayISO();

  // Deterministic IDs match awardPoint — a task already awarded today is
  // skipped rather than overwritten/double-counted.
  const histRefs = entries.map(e => doc(pointsHistoryRef(uid), `${e.taskId}_${dateISO}`));

  await runTransaction(db, async (tx) => {
    const snaps = await Promise.all(histRefs.map(ref => tx.get(ref)));

    let total = 0;
    snaps.forEach((snap, i) => {
      if (snap.exists()) { return; } // Already awarded today — skip
      const entry = entries[i];
      total += entry.points;
      tx.set(histRefs[i], {
        taskId:    entry.taskId,
        taskTitle: entry.taskTitle,
        awardedAt: serverTimestamp(),
        points:    entry.points,
        reason:    'task_completed',
      });
    });

    if (total > 0) {
      tx.update(userRef(uid), { totalPoints: increment(total) });
    }
  });
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
  logTap('achievement_unlocked', { achievement_id: achievementId });
}

export async function getTotalPoints(uid: string): Promise<number> {
  const snap = await getDoc(userRef(uid));
  return (snap.data() as { totalPoints?: number } | undefined)?.totalPoints ?? 0;
}

/** Read the user's current streak once. Reads the `currentStreak` field on /users/{uid}. */
export async function getCurrentStreak(uid: string): Promise<number> {
  const snap = await getDoc(userRef(uid));
  return (snap.data() as { currentStreak?: number } | undefined)?.currentStreak ?? 0;
}

/**
 * Read the user's achievements map once (KAN-129).
 * Reads from the `achievements` field on the user document — not the old
 * subcollection.
 */
export async function getAchievements(uid: string): Promise<AchievementsMap> {
  const snap = await getDoc(userRef(uid));
  const data = snap.data() as User | undefined;
  return (data?.achievements ?? {}) as AchievementsMap;
}

/**
 * Read totalPoints, currentStreak, and achievements in a single getDoc
 * (KAN-223 — avoids ProfileScreen/AchievementsScreen tripling the read on
 * /users/{uid} by calling getTotalPoints/getCurrentStreak/getAchievements separately).
 */
export async function getUserPointsSummary(
  uid: string,
): Promise<{ totalPoints: number; currentStreak: number; achievements: AchievementsMap }> {
  const snap = await getDoc(userRef(uid));
  const data = snap.data() as User | undefined;
  return {
    totalPoints: data?.totalPoints ?? 0,
    currentStreak: data?.currentStreak ?? 0,
    achievements: (data?.achievements ?? {}) as AchievementsMap,
  };
}

/**
 * One-time fetch of any user's earned achievements, newest first.
 * Used to read a friend's achievements for the comparison view (KAN-105).
 * Firestore rules allow any authenticated user to read achievements.
 */
export async function getAchievementsForUser(uid: string): Promise<Achievement[]> {
  const snap = await getDocs(query(achievementsRef(uid), orderBy('earnedAt', 'desc')));
  return mapSnapshotDocs<Achievement>(snap);
}

/** Opaque cursor for {@link getPointsHistory} pagination — pass back the
 *  previous page's `nextCursor` to fetch the following page. */
export type PointsHistoryCursor = QueryDocumentSnapshot;

export interface PointsHistoryPage {
  entries: PointsHistoryEntry[];
  /** Pass to the next call's `cursor` param. `null` when there are no more pages. */
  nextCursor: PointsHistoryCursor | null;
}

/**
 * Fetch one page of the user's points history, newest first (KAN-222).
 *
 * Server-side cursor pagination: pass `cursor` (the previous page's
 * `nextCursor`) to fetch the page after it. `nextCursor` is `null` once the
 * last page has been reached.
 *
 * Deduplicates task_completed entries by taskId *within this page only* —
 * docs are ordered newest-first, so the first occurrence of a taskId on a
 * page is the most recent one seen so far. Non-task entries (achievement_bonus,
 * streak_bonus, etc.) all carry taskId:'' and are never deduplicated. Because a
 * duplicate can land on a later page than its most-recent counterpart, callers
 * that accumulate pages (e.g. PointsHistoryScreen) must track seen taskIds
 * across pages themselves to preserve the "one entry per task" behaviour.
 */
export async function getPointsHistory(
  uid: string,
  pageSize: number,
  cursor?: PointsHistoryCursor | null,
): Promise<PointsHistoryPage> {
  if (getAuth().currentUser?.uid !== uid) {
    throw new Error('getPointsHistory: uid must match the authenticated user');
  }

  // Over-fetch by one doc so a page that exactly fills pageSize can be told
  // apart from the true last page — otherwise snap.docs.length === pageSize
  // would falsely report a next page whenever the remaining docs are an exact
  // multiple of pageSize.
  const constraints: QueryConstraint[] = [orderBy('awardedAt', 'desc'), limit(pageSize + 1)];
  if (cursor) { constraints.push(startAfter(cursor)); }

  const snap = await getDocs(query(pointsHistoryRef(uid), ...constraints));

  const hasMorePages = snap.docs.length > pageSize;
  const pageDocs      = hasMorePages ? snap.docs.slice(0, pageSize) : snap.docs;

  const seen = new Set<string>();
  const entries: PointsHistoryEntry[] = [];
  for (const d of pageDocs) {
    const entry = { id: d.id, ...d.data() } as PointsHistoryEntry;
    if (entry.reason === 'task_completed' && entry.taskId) {
      if (!seen.has(entry.taskId)) {
        seen.add(entry.taskId);
        entries.push(entry);
      }
    } else {
      entries.push(entry);
    }
  }

  const lastDoc = pageDocs[pageDocs.length - 1];

  return { entries, nextCursor: hasMorePages && lastDoc ? lastDoc : null };
}
