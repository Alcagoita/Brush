/**
 * achievements.ts — Achievement-awarding logic and notifications.
 *
 * Keeps achievement business rules out of screen components.
 * Each exported function is idempotent — calling it multiple times on the
 * same day / for the same event is safe and produces at most one award.
 */

import { Platform } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { awardAchievement, hasAchievement } from './firestore';

// ─── Android notification channel ─────────────────────────────────────────────

const CHANNEL_ID = 'achievements';

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') { return; }
  await notifee.createChannel({
    id:         CHANNEL_ID,
    name:       'Achievements',
    importance: AndroidImportance.HIGH,
    sound:      'default',
  });
}

// ─── Daily complete achievement (KAN-32) ───────────────────────────────────────

/**
 * Award the "daily_complete" achievement and fire a celebration notification
 * when the user finishes every task for the given date.
 *
 * Idempotent — if the achievement has already been awarded today the function
 * returns early without firing another notification. Safe to call on every
 * task toggle.
 *
 * @param uid  - Authenticated user ID
 * @param date - Calendar date in "YYYY-MM-DD" format (use todayISO() at call site)
 */
export async function checkAndAwardDailyComplete(
  uid: string,
  date: string,
): Promise<void> {
  const achievementId = `daily_complete_${date}`;

  // Skip if already awarded today — no duplicate notification.
  const alreadyAwarded = await hasAchievement(uid, achievementId);
  if (alreadyAwarded) { return; }

  await awardAchievement(uid, achievementId, 'daily_complete', { date });

  await ensureChannel();
  await notifee.displayNotification({
    title: 'All done for today!',
    body:  "You've completed every task on your list. Great work!",
    data:  { screen: 'Today' },
    android: {
      channelId:   CHANNEL_ID,
      importance:  AndroidImportance.HIGH,
      pressAction: { id: 'default' },
    },
    ios: {
      sound: 'default',
    },
  });
}
