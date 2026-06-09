/**
 * onUserInactive — KAN-124
 *
 * Daily scheduled Cloud Function that sends a re-engagement nudge via FCM/APNs
 * to users who have not opened the app in exactly 3 days.
 *
 * Query window: lastOpenedAt in (now−4d, now−3d] — the narrow window ensures
 * the nudge fires once per lapse episode (not daily). The 7-day follow-up is
 * tracked in KAN-127 (deferred to Sprint 9).
 *
 * Guards:
 *   - Skips execution during FCM quiet hours (10 PM – 8 AM UTC).
 *   - Skips users with reengagementReminders === false.
 *   - Skips users whose lastReengagementNudge was stamped within the last 24 h.
 *   - Skips users with no registered FCM tokens.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

// ─── Constants ────────────────────────────────────────────────────────────────

export const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
export const FOUR_DAYS_MS  = 4 * 24 * 60 * 60 * 1000;
export const ONE_DAY_MS    =     24 * 60 * 60 * 1000;

/** UTC hour at which quiet window begins (inclusive). */
export const QUIET_START = 22; // 10 PM UTC
/** UTC hour at which quiet window ends (exclusive). */
export const QUIET_END   = 8;  // 8 AM UTC

// ─── Pure helpers (exported for unit tests) ───────────────────────────────────

/**
 * Returns true when `now` falls in the FCM quiet window (10 PM – 8 AM UTC).
 * Best-effort per-user timezone is not available; UTC is used as a proxy.
 */
export function isQuietHour(now: Date = new Date()): boolean {
  const hour = now.getUTCHours();
  return hour >= QUIET_START || hour < QUIET_END;
}

/**
 * Returns true when a re-engagement nudge should be sent to this user.
 *
 * Checks:
 *   1. `reengagementReminders` pref is not explicitly false (default: true).
 *   2. `lastReengagementNudge` was not stamped within the last 24 h.
 */
export function shouldSendNudge(
  prefs: {
    reengagementReminders?: boolean;
    lastReengagementNudge?: { toMillis(): number } | null;
  },
  now: Date = new Date(),
): boolean {
  if (prefs.reengagementReminders === false) { return false; }
  const last = prefs.lastReengagementNudge;
  if (last && now.getTime() - last.toMillis() < ONE_DAY_MS) { return false; }
  return true;
}

// ─── Per-user nudge logic (exported for unit tests) ───────────────────────────

/**
 * Loads prefs and tokens for `uid`, sends the nudge to every registered device,
 * and stamps `lastReengagementNudge`.
 *
 * Returns `true` if the nudge was sent, `false` if skipped.
 * Token-level send failures are warned but do not abort the stamp.
 */
export async function processUser(
  uid:       string,
  db:        admin.firestore.Firestore,
  messaging: admin.messaging.Messaging,
  now:       Date = new Date(),
): Promise<boolean> {
  const prefsSnap = await db
    .collection('users').doc(uid)
    .collection('userPreferences').doc('prefs')
    .get();

  if (!shouldSendNudge(prefsSnap.data() ?? {}, now)) { return false; }

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
          body:  'Your list is waiting — brush something away.',
        },
        data:    { screen: 'Today' },
        apns:    { payload: { aps: { sound: 'default' } } },
        android: { priority: 'normal' },
      }).catch(err =>
        console.warn(
          `[onUserInactive] send failed uid=${uid} token=${token.slice(0, 10)}…`,
          (err as Error)?.message,
        ),
      ),
    ),
  );

  // Stamp after sending so a failed send can be retried on the next daily run
  // only if no nudge was stamped. Uses merge so other pref fields are untouched.
  await db
    .collection('users').doc(uid)
    .collection('userPreferences').doc('prefs')
    .set(
      { lastReengagementNudge: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true },
    );

  return true;
}

// ─── Scheduled function ───────────────────────────────────────────────────────

export const onUserInactive = onSchedule('every 24 hours', async () => {
  const now = new Date();

  if (isQuietHour(now)) {
    console.log('[onUserInactive] skipped — quiet hours (UTC hour:', now.getUTCHours(), ')');
    return;
  }

  const db        = admin.firestore();
  const messaging = admin.messaging();

  const threeAgo = admin.firestore.Timestamp.fromMillis(now.getTime() - THREE_DAYS_MS);
  const fourAgo  = admin.firestore.Timestamp.fromMillis(now.getTime() - FOUR_DAYS_MS);

  const snap = await db.collection('users')
    .where('lastOpenedAt', '<=', threeAgo)
    .where('lastOpenedAt', '>', fourAgo)
    .get();

  if (snap.empty) {
    console.log('[onUserInactive] no inactive users in window');
    return;
  }

  const results = await Promise.allSettled(
    snap.docs.map(userDoc => processUser(userDoc.id, db, messaging, now)),
  );

  const sent   = results.filter(r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<boolean>).value).length;
  const failed = results.filter(r => r.status === 'rejected').length;
  console.log(`[onUserInactive] processed=${results.length} sent=${sent} failed=${failed}`);
});
