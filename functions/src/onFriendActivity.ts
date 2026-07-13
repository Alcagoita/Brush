/**
 * onFriendActivity — KAN-125
 *
 * Firestore trigger that fires whenever a task document is written under
 * users/{uid}/tasks/{taskId}. On a task-completion event (completedAt null→set)
 * it checks whether the actor has reached a notification threshold for their
 * followers and, if so, sends an FCM nudge to every eligible follower.
 *
 * Thresholds (either is sufficient):
 *   A) All of today's tasks are done  → "full list" copy.
 *   B) 3+ tasks completed within the last SESSION_WINDOW_MS  → "on a run" copy.
 *
 * Guards per follower:
 *   - `friendActivity` pref is not explicitly false (default: true).
 *   - `lastFriendNudgeFrom[actorUid]` not stamped within the last 24 h.
 *   - Follower has at least one registered FCM token.
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

// ─── Constants ────────────────────────────────────────────────────────────────

export const ONE_DAY_MS        = 24 * 60 * 60 * 1000;
export const SESSION_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
export const SESSION_THRESHOLD = 3;              // completions in window to trigger

// ─── Pure helpers (exported for unit tests) ───────────────────────────────────

/**
 * Returns true when the write represents a task-completion event:
 * completedAt was absent before and is now set.
 */
export function isCompletionEvent(
  before: Record<string, unknown> | undefined,
  after:  Record<string, unknown> | undefined,
): boolean {
  if (!after) { return false; }
  const hadCompletedAt = Boolean(before?.completedAt);
  const hasCompletedAt = Boolean(after.completedAt);
  return !hadCompletedAt && hasCompletedAt;
}

/**
 * Returns the FCM notification body for the friend activity nudge.
 *
 *   Full list:  "@username just brushed their whole list. Your turn."
 *   Session run: "@username is on a brushing run. Keep up."
 */
export function buildFriendNudgeBody(username: string, isFullList: boolean): string {
  if (isFullList) {
    return `@${username} just brushed their whole list. Your turn.`;
  }
  return `@${username} is on a brushing run. Keep up.`;
}

/**
 * Evaluates whether a notification threshold was crossed.
 *
 * `tasksForToday` is the full set of tasks whose `date` matches today —
 * it should already include the task that just completed.
 */
export function evaluateTrigger(
  tasksForToday: { done: boolean; completedAt?: { toMillis(): number } | null }[],
  now: Date,
  sessionWindowMs: number = SESSION_WINDOW_MS,
): { shouldFire: boolean; isFullList: boolean } {
  if (tasksForToday.length === 0) { return { shouldFire: false, isFullList: false }; }

  const isFullList = tasksForToday.every(t => t.done);
  if (isFullList) { return { shouldFire: true, isFullList: true }; }

  const cutoff       = now.getTime() - sessionWindowMs;
  const sessionCount = tasksForToday.filter(
    t => t.done && t.completedAt != null && t.completedAt.toMillis() >= cutoff,
  ).length;

  return {
    shouldFire: sessionCount >= SESSION_THRESHOLD,
    isFullList: false,
  };
}

/**
 * Returns true when a follower should receive a friend-activity nudge
 * from `actorUid` right now.
 *
 * Checks:
 *   1. `friendActivity` pref is not explicitly false.
 *   2. `lastFriendNudgeFrom[actorUid]` was not stamped in the last 24 h.
 */
export function shouldNotifyFollower(
  prefs: {
    friendActivity?: boolean;
    lastFriendNudgeFrom?: Record<string, { toMillis(): number }> | null;
  },
  actorUid: string,
  now: Date,
): boolean {
  if (prefs.friendActivity === false) { return false; }
  const last = prefs.lastFriendNudgeFrom?.[actorUid];
  if (last && now.getTime() - last.toMillis() < ONE_DAY_MS) { return false; }
  return true;
}

// ─── Per-follower notification logic (exported for unit tests) ────────────────

/**
 * Checks the follower's prefs, sends the nudge to all their tokens, and
 * stamps `lastFriendNudgeFrom[actorUid]` to prevent duplicate sends.
 *
 * Returns `true` if the nudge was sent, `false` if skipped.
 */
export async function processFollower(
  followerUid:   string,
  actorUid:      string,
  actorUsername: string,
  isFullList:    boolean,
  db:            admin.firestore.Firestore,
  messaging:     admin.messaging.Messaging,
  now:           Date = new Date(),
): Promise<boolean> {
  const prefsRef = db
    .collection('users').doc(followerUid)
    .collection('userPreferences').doc('prefs');

  const prefsSnap = await prefsRef.get();
  if (!shouldNotifyFollower(prefsSnap.data() ?? {}, actorUid, now)) { return false; }

  const tokensSnap = await db
    .collection('users').doc(followerUid)
    .collection('tokens')
    .get();

  if (tokensSnap.empty) { return false; }

  const body   = buildFriendNudgeBody(actorUsername, isFullList);
  const tokens = tokensSnap.docs.map(d => d.id);

  // Stamp before firing — a duplicate send is less bad than a missed stamp.
  // Dot-notation key updates only this actor's entry; other actors' entries
  // in the map are untouched. Any active user has a prefs doc (written on
  // every foreground), so update() is safe here.
  await prefsRef.update({
    [`lastFriendNudgeFrom.${actorUid}`]: admin.firestore.FieldValue.serverTimestamp(),
  });

  await Promise.allSettled(
    tokens.map(token =>
      messaging.send({
        token,
        notification: {
          title: 'Brush',
          body,
        },
        data:    { screen: 'Today' },
        apns:    { payload: { aps: { sound: 'default' } } },
        android: { priority: 'normal' },
      }).catch(err =>
        console.warn(
          '[onFriendActivity] send failed',
          (err as Error)?.message,
        ),
      ),
    ),
  );

  return true;
}

// ─── Firestore trigger ────────────────────────────────────────────────────────

export const onFriendActivity = onDocumentWritten(
  'users/{uid}/tasks/{taskId}',
  async (event) => {
    const actorUid = event.params.uid;
    const before   = event.data?.before.data() as Record<string, unknown> | undefined;
    const after    = event.data?.after.data()  as Record<string, unknown> | undefined;

    if (!isCompletionEvent(before, after)) { return; }

    // `date` is the "YYYY-MM-DD" string stored on the task — use it to scope
    // the today-tasks query instead of deriving it from server time (avoids
    // midnight edge cases where server time and task date differ).
    const taskDate = after?.date as string | undefined;
    if (!taskDate) {
      console.warn('[onFriendActivity] completion event missing date field');
      return;
    }

    const now = new Date();
    const db  = admin.firestore();

    // ── 1. Fetch today's tasks for the actor ──────────────────────────────────
    const todayTasksSnap = await db
      .collection('users').doc(actorUid)
      .collection('tasks')
      .where('date', '==', taskDate)
      .get();

    const todayTasks = todayTasksSnap.docs.map(d => d.data() as {
      done:         boolean;
      completedAt?: { toMillis(): number } | null;
    });

    const { shouldFire, isFullList } = evaluateTrigger(todayTasks, now);
    if (!shouldFire) { return; }

    // ── 2. Get actor's username ───────────────────────────────────────────────
    const actorSnap = await db.collection('users').doc(actorUid).get();
    const actorUsername = (actorSnap.data()?.username as string | undefined) ?? 'Someone';

    // ── 3. Get actor's followers ──────────────────────────────────────────────
    const followersSnap = await db
      .collection('users').doc(actorUid)
      .collection('followers')
      .get();

    if (followersSnap.empty) { return; }

    const messaging     = admin.messaging();
    const followerUids  = followersSnap.docs.map(d => d.id);

    const results = await Promise.allSettled(
      followerUids.map(fUid =>
        processFollower(fUid, actorUid, actorUsername, isFullList, db, messaging, now),
      ),
    );

    const sent    = results.filter(r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<boolean>).value).length;
    const skipped = results.filter(r => r.status === 'fulfilled' && !(r as PromiseFulfilledResult<boolean>).value).length;
    const failed  = results.filter(r => r.status === 'rejected').length;
    console.log(
      `[onFriendActivity] actor=${actorUid} isFullList=${isFullList}` +
      ` followers=${followerUids.length} sent=${sent} skipped=${skipped} failed=${failed}`,
    );
  },
);
