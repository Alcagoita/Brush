/**
 * achievements.ts — Achievement-awarding logic and notifications.
 *
 * Keeps achievement business rules out of screen components.
 * Each exported function is idempotent — calling it multiple times on the
 * same day / for the same event is safe and produces at most one award.
 */

import { Platform } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { awardAchievement, hasAchievement, awardPointsAchievementBonus } from './firestore';

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

// ─── Challenge winner achievement (KAN-104) ───────────────────────────────────

const CHALLENGE_WINNER_ID    = 'challenge_winner';
const CHALLENGE_WINNER_TITLE = 'First to do it';
const CHALLENGE_WINNER_BONUS = 5; // bonus points for winning a challenge

/**
 * Award the "challenge_winner" achievement to the winner of a challenge.
 *
 * Idempotent per challengeId — the document ID is `challenge_winner_{challengeId}`
 * so winning multiple challenges creates separate achievement records.
 *
 * Actions:
 *  1. Write achievement doc to users/{uid}/achievements/
 *  2. Award 5 bonus points via achievement_bonus reason
 *  3. Send a celebration notification to the winner
 *
 * @param uid         Firebase user ID of the winner
 * @param challengeId The challenge that was won
 */
export async function awardChallengeWinnerAchievement(
  uid:         string,
  challengeId: string,
): Promise<void> {
  const achievementId = `${CHALLENGE_WINNER_ID}_${challengeId}`;

  // Idempotency guard — don't double-award for the same challenge.
  const alreadyAwarded = await hasAchievement(uid, achievementId);
  if (alreadyAwarded) { return; }

  await awardAchievement(uid, achievementId, 'challenge_winner', { challengeId });
  await awardPointsAchievementBonus(uid, CHALLENGE_WINNER_ID, CHALLENGE_WINNER_BONUS);

  await ensureChannel();
  await notifee.displayNotification({
    title: `🏆 You won the challenge!`,
    body:  `Achievement unlocked: ${CHALLENGE_WINNER_TITLE}`,
    data:  { screen: 'ChallengeDetail', challengeId },
    android: {
      channelId:   CHANNEL_ID,
      importance:  AndroidImportance.HIGH,
      pressAction: { id: 'default' },
    },
    ios: { sound: 'default' },
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
 * @param uid         - Authenticated user ID
 * @param date        - Calendar date in "YYYY-MM-DD" format (use todayISO() at call site)
 * @param totalTasks  - Number of tasks completed today (stored as metadata)
 * @param totalPoints - Points earned today (stored as metadata; equals totalTasks since 1 pt/task)
 */
export async function checkAndAwardDailyComplete(
  uid: string,
  date: string,
  totalTasks?: number,
  totalPoints?: number,
): Promise<void> {
  const achievementId = `daily_complete_${date}`;

  // Skip if already awarded today — no duplicate notification.
  const alreadyAwarded = await hasAchievement(uid, achievementId);
  if (alreadyAwarded) { return; }

  const metadata: Record<string, unknown> = { date };
  if (totalTasks  !== undefined) { metadata.totalTasks  = totalTasks;  }
  if (totalPoints !== undefined) { metadata.totalPoints = totalPoints; }

  await awardAchievement(uid, achievementId, 'daily_complete', metadata);

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
