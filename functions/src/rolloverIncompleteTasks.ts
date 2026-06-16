/**
 * rolloverIncompleteTasks — KAN-146
 *
 * Daily scheduled Cloud Function. Tasks in Brush persist until the user
 * brushes them away — there is no end-of-day deletion or archival. Instead,
 * any task still undone when the day rolls over is moved forward to the new
 * day: its `date` and `createdAt` are bumped to "now", so it is treated as a
 * brand-new task for that day (it scores against the new day's ring and
 * appears in the new day's Today list, exactly like one created fresh).
 *
 * This is a best-effort UTC-anchored pass — it cannot know each user's local
 * midnight. `rolloverIncompleteTasks` (client, src/services/firestore.ts) is
 * the per-user-timezone-correct fallback that runs during SplashScreen boot;
 * either one running first makes the other a no-op for that task.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

// ─── Pure helpers (exported for unit tests) ───────────────────────────────────

/** Returns today's date as a YYYY-MM-DD string in UTC. */
export function todayISOUTC(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

// ─── Batch rollover (exported for unit tests) ─────────────────────────────────

/**
 * Finds every undone task across all users still dated before `today` and
 * bumps `date` + `createdAt` to now. Writes in batches of 500 (Firestore's
 * per-batch limit). Returns the number of tasks rolled over.
 */
export async function rolloverAllUsers(
  db:    admin.firestore.Firestore,
  today: string,
): Promise<number> {
  const snap = await db.collectionGroup('tasks')
    .where('done', '==', false)
    .where('date', '<', today)
    .get();

  if (snap.empty) { return 0; }

  const BATCH_LIMIT = 500;
  const docs = snap.docs;

  for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    docs.slice(i, i + BATCH_LIMIT).forEach(d => {
      batch.update(d.ref, {
        date:      today,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
  }

  return docs.length;
}

// ─── Scheduled function ───────────────────────────────────────────────────────

// Anchored to 00:05 UTC — shortly after the UTC day boundary. Imprecise for
// any user not in/near UTC, which is exactly why the client-side fallback
// exists; this job mainly keeps data fresh for users who don't open the app
// the next day.
export const rolloverIncompleteTasks = onSchedule('5 0 * * *', async () => {
  const db    = admin.firestore();
  const today = todayISOUTC();

  const count = await rolloverAllUsers(db, today);
  console.log(`[rolloverIncompleteTasks] rolled over ${count} task(s) to ${today}`);
});
