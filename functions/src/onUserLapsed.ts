/**
 * onUserLapsed — KAN-127
 *
 * Daily scheduled Cloud Function that sends a soft re-engagement nudge via
 * FCM/APNs to users who have been absent for exactly 7 days AND received the
 * 3-day nudge (KAN-124) without returning.
 *
 * Guards:
 *   - Skips execution during FCM quiet hours (10 PM – 8 AM UTC).
 *   - Skips users with no `lastReengagementNudge` — 3-day nudge was never sent;
 *     firing this without the prior nudge would skip the lower-pressure path.
 *   - Skips users already marked `reengagementChurned: true` — hard stop ensures
 *     a user who returns briefly and lapses again does not receive a second 7-day nudge.
 *   - Skips users with no registered FCM tokens.
 *
 * After sending, sets `reengagementChurned: true` on the user's prefs document.
 * No further automated re-engagement nudges fire after this point.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { isQuietHour } from './onUserInactive';

// ─── Constants ────────────────────────────────────────────────────────────────

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
export const EIGHT_DAYS_MS = 8 * 24 * 60 * 60 * 1000;

// ─── Pure helpers (exported for unit tests) ───────────────────────────────────

/**
 * Returns true when the 7-day lapse nudge should be sent to this user.
 *
 * Checks:
 *   1. `reengagementChurned` is not already true (hard stop).
 *   2. `lastReengagementNudge` is set — confirms the 3-day nudge (KAN-124)
 *      was sent; skipping users who never received it preserves the intended
 *      escalation path.
 */
export function shouldSendLapseNudge(prefs: {
  reengagementReminders?: boolean;
  reengagementChurned?: boolean;
  lastReengagementNudge?: { toMillis(): number } | null;
}): boolean {
  if (prefs.reengagementReminders === false) { return false; }
  if (prefs.reengagementChurned === true) { return false; }
  if (!prefs.lastReengagementNudge) { return false; }
  return true;
}

// ─── Per-user nudge logic (exported for unit tests) ───────────────────────────

/**
 * Loads prefs and tokens for `uid`, sends the 7-day lapse nudge to every
 * registered device, and marks `reengagementChurned: true`.
 *
 * Returns `true` if the nudge was sent, `false` if skipped.
 * Token-level send failures are warned but do not abort the churn stamp.
 */
export async function processLapsedUser(
  uid:       string,
  db:        admin.firestore.Firestore,
  messaging: admin.messaging.Messaging,
): Promise<boolean> {
  const prefsRef = db
    .collection('users').doc(uid)
    .collection('userPreferences').doc('prefs');

  const prefsSnap = await prefsRef.get();
  if (!shouldSendLapseNudge(prefsSnap.data() ?? {})) { return false; }

  const tokensSnap = await db
    .collection('users').doc(uid)
    .collection('tokens')
    .get();

  if (tokensSnap.empty) { return false; }

  const tokens = tokensSnap.docs.map(d => d.id);

  await Promise.allSettled(
    tokens.map(token =>
      messaging.send({
        token,
        notification: {
          title: 'Brush',
          body:  "It's been a week. Your tasks haven't gone anywhere — brush when you're ready.",
        },
        // filterToday instructs the app to land on Today showing only today's
        // tasks — a returning user shouldn't face an overdue backlog immediately.
        data:    { screen: 'Today', filterToday: 'true' },
        apns:    { payload: { aps: { sound: 'default' } } },
        android: { priority: 'normal' },
      }).catch(err =>
        console.warn(
          `[onUserLapsed] send failed uid=${uid} token=${token.slice(0, 10)}…`,
          (err as Error)?.message,
        ),
      ),
    ),
  );

  // Hard stop: mark churned so this nudge never fires again for this episode,
  // even if the user returns briefly and lapses again. Uses merge so other
  // pref fields are untouched.
  await prefsRef.set(
    { reengagementChurned: true },
    { merge: true },
  );

  return true;
}

// ─── Scheduled function ───────────────────────────────────────────────────────

// Anchored to 10 AM UTC — matches onUserInactive (KAN-124) so both functions
// run in the same daily active window. Fixed cron avoids the quiet-window
// drift that 'every 24 hours' can cause.
export const onUserLapsed = onSchedule('0 10 * * *', async () => {
  const now = new Date();

  if (isQuietHour(now)) {
    console.log('[onUserLapsed] skipped — quiet hours (UTC hour:', now.getUTCHours(), ')');
    return;
  }

  const db        = admin.firestore();
  const messaging = admin.messaging();

  const sevenAgo = admin.firestore.Timestamp.fromMillis(now.getTime() - SEVEN_DAYS_MS);
  const eightAgo = admin.firestore.Timestamp.fromMillis(now.getTime() - EIGHT_DAYS_MS);

  // Same collectionGroup pattern as onUserInactive — lastOpenedAt lives in
  // users/{uid}/userPreferences/prefs, not the root user document.
  const prefsSnap = await db.collectionGroup('userPreferences')
    .where('lastOpenedAt', '<=', sevenAgo)
    .where('lastOpenedAt', '>', eightAgo)
    .get();

  const uids = prefsSnap.docs
    .filter(d => d.id === 'prefs')
    .map(d => d.ref.parent.parent?.id)
    .filter((id): id is string => Boolean(id));

  if (uids.length === 0) {
    console.log('[onUserLapsed] no lapsed users in window');
    return;
  }

  const results = await Promise.allSettled(
    uids.map(uid => processLapsedUser(uid, db, messaging)),
  );

  const sent    = results.filter(r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<boolean>).value).length;
  const skipped = results.filter(r => r.status === 'fulfilled' && !(r as PromiseFulfilledResult<boolean>).value).length;
  const failed  = results.filter(r => r.status === 'rejected').length;
  console.log(`[onUserLapsed] processed=${results.length} sent=${sent} skipped=${skipped} failed=${failed}`);
});
