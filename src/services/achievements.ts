/**
 * achievements.ts — Achievement definitions and evaluation logic.
 *
 * KAN-129: Points are achievement-derived only.
 * Points come exclusively from achievements. Each achievement has a defined
 * point value. When an achievement is unlocked, its points are added to
 * user.totalPoints.
 *
 * The single entry point for evaluating achievements after a task completion
 * is `evaluateAchievements()`. It runs as a Firestore transaction and is
 * idempotent — calling it multiple times for the same task is safe.
 *
 * `awardChallengeWinnerAchievement` is kept for the social challenge flow
 * (KAN-104) and still uses the subcollection model until that flow is
 * migrated separately.
 */

import { Platform } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import {
  getFirestore,
  runTransaction,
  serverTimestamp,
  increment,
} from '@react-native-firebase/firestore';
import { awardAchievement, hasAchievement, awardPointsAchievementBonus, getUserPreferences, updateUserPreferences } from './firestore';
import type { Task, AchievementType, AchievementEntry, AchievementsMap, User } from '../types';
import { DEFAULT_USER_PREFERENCES } from '../types';
import { COPY } from '../constants/copy';
import { fireAchievementNudge } from './notifications';

// ─── Tier ladder (KAN-129) ────────────────────────────────────────────────────

export const TIER_LADDER = [
  { name: 'Bronze',   at: 50  },
  { name: 'Silver',   at: 150 },
  { name: 'Gold',     at: 350 },
] as const;

/** Returns the next tier the user hasn't reached yet. */
export function getNextTier(points: number): { name: string; at: number } {
  return (
    TIER_LADDER.find(t => points < t.at) ??
    TIER_LADDER[TIER_LADDER.length - 1]
  );
}

// ─── V1 achievement definitions ───────────────────────────────────────────────

export interface AchievementDef {
  id:          AchievementType;
  label:       string;
  desc:        string;
  /** Icon key — maps to an AppIcon component in the UI layer. */
  icon:        'check' | 'sun' | 'flame' | 'pin' | 'star';
  /** Points awarded when this achievement is unlocked (or re-earned). */
  points:      number;
  /** Condition threshold — progress must reach this value to unlock. */
  target:      number;
  /**
   * Whether this achievement can be earned more than once.
   * Repeatable achievements re-award `points` each time they are earned.
   */
  repeatable:  boolean;
}

export const ACHIEVEMENT_DEFS: Record<string, AchievementDef> = {
  first_brush:  { id: 'first_brush',  label: 'First brush',  desc: 'Brush away your first task',               icon: 'check', points: 5,  target: 1,   repeatable: false },
  early_bird:   { id: 'early_bird',   label: 'Early bird',   desc: 'Brush a task away before 9 AM',            icon: 'sun',   points: 10, target: 1,   repeatable: true  },
  day_complete: { id: 'day_complete', label: 'Day complete', desc: 'Brush away every task in a single day',    icon: 'check', points: 15, target: 1,   repeatable: true  },
  on_a_roll:    { id: 'on_a_roll',    label: 'On a roll',    desc: '3-day brushing streak',                    icon: 'flame', points: 20, target: 3,   repeatable: true  },
  explorer:     { id: 'explorer',     label: 'Explorer',     desc: 'Brush away 10 location-based tasks',       icon: 'pin',   points: 25, target: 10,  repeatable: false },
  centurion:    { id: 'centurion',    label: 'Centurion',    desc: 'Reach 100 achievement points',             icon: 'star',  points: 30, target: 100, repeatable: false },
} as const;

// ─── evaluateAchievements ─────────────────────────────────────────────────────

/**
 * Called after every task completion. Evaluates all v1 achievement conditions
 * and atomically updates progress, awards achievements, and increments
 * totalPoints — all in a single Firestore transaction.
 *
 * @param uid          Firebase user ID
 * @param task         The task that was just completed
 * @param ctx.allTasksDone  True if every task for today is now done
 */
/**
 * Describes a "1 away" achievement that may trigger a nudge notification.
 * Returned by `evaluateAchievements` so the caller can decide whether to fire.
 */
export interface AchievementNudgeCandidate {
  achievementId: AchievementType;
  /** Completions / points still needed to unlock. */
  remaining: number;
}

export async function evaluateAchievements(
  uid:  string,
  task: Task,
  ctx:  { allTasksDone: boolean; remainingTaskCount?: number },
): Promise<{ nudgeCandidate: AchievementNudgeCandidate | null }> {
  const db = getFirestore();
  const userDocRef = db.collection('users').doc(uid);
  const completedHour = new Date().getHours();

  const nudgeCandidate = await runTransaction(db, async tx => {
    const snap = await tx.get(userDocRef);
    const data = snap.data() as (User & { achievements?: AchievementsMap }) | undefined;

    const map: AchievementsMap   = (data?.achievements ?? {}) as AchievementsMap;
    const currentPoints: number  = data?.totalPoints ?? 0;
    const currentStreak: number  = data?.currentStreak ?? 0;

    const updates: Record<string, unknown> = {};
    let pointsGained = 0;

    // Helper: write an achievement award or a progress-only update
    const tryAward = (id: AchievementType, newProgress: number) => {
      const def     = ACHIEVEMENT_DEFS[id];
      if (!def) { return; }
      const entry    = map[id];
      const earnCount = entry?.earnCount ?? 0;
      const alreadyEarned = earnCount > 0;
      const meetsTarget   = newProgress >= def.target;
      const shouldAward   = meetsTarget && (!alreadyEarned || def.repeatable);

      if (shouldAward) {
        pointsGained += def.points;
        updates[`achievements.${id}`] = {
          earnedAt:  serverTimestamp(),
          earnCount: earnCount + 1,
          progress:  newProgress,
          target:    def.target,
        };
      } else if (alreadyEarned) {
        // Keep earnedAt intact; only update progress
        updates[`achievements.${id}.progress`] = newProgress;
      } else {
        // Not yet earned — write progress & target for display
        updates[`achievements.${id}.progress`] = newProgress;
        updates[`achievements.${id}.target`]   = def.target;
        updates[`achievements.${id}.earnCount`] = 0;
        updates[`achievements.${id}.earnedAt`]  = null;
      }
    };

    // ── first_brush — any task completion, target 1, non-repeatable ──────────
    if (!(map['first_brush']?.earnCount ?? 0)) {
      tryAward('first_brush', 1);
    }

    // ── early_bird — before 9 AM, repeatable ─────────────────────────────────
    if (completedHour < 9) {
      const prev = map['early_bird']?.progress ?? 0;
      tryAward('early_bird', prev + 1);
    }

    // ── day_complete — all tasks done today, repeatable ──────────────────────
    if (ctx.allTasksDone) {
      const prev = map['day_complete']?.progress ?? 0;
      tryAward('day_complete', prev + 1);
    }

    // ── on_a_roll — streak ≥ 3; re-awards when streak resets and rebuilds ────
    {
      const prevProgress = map['on_a_roll']?.progress ?? 0;
      if (currentStreak >= ACHIEVEMENT_DEFS['on_a_roll'].target) {
        // Award when crossing the threshold (covers initial earn and re-earn)
        if (prevProgress < ACHIEVEMENT_DEFS['on_a_roll'].target) {
          tryAward('on_a_roll', currentStreak);
        } else {
          updates['achievements.on_a_roll.progress'] = currentStreak;
        }
      } else {
        // Streak below target — just record progress for the bar
        updates['achievements.on_a_roll.progress'] = currentStreak;
        if (!map['on_a_roll']) {
          updates['achievements.on_a_roll.target']    = ACHIEVEMENT_DEFS['on_a_roll'].target;
          updates['achievements.on_a_roll.earnCount'] = 0;
          updates['achievements.on_a_roll.earnedAt']  = null;
        }
      }
    }

    // ── explorer — location task, target 10, non-repeatable ──────────────────
    if (task.poi) {
      const prev = map['explorer']?.progress ?? 0;
      tryAward('explorer', prev + 1);
    }

    // ── centurion — meta: totalPoints ≥ 100. Checked after other points. ─────
    {
      const projectedPoints = currentPoints + pointsGained;
      const centurionEntry  = map['centurion'];
      const alreadyEarned   = (centurionEntry?.earnCount ?? 0) > 0;
      if (projectedPoints >= ACHIEVEMENT_DEFS['centurion'].target && !alreadyEarned) {
        pointsGained += ACHIEVEMENT_DEFS['centurion'].points;
        updates[`achievements.centurion`] = {
          earnedAt:  serverTimestamp(),
          earnCount: 1,
          progress:  projectedPoints,
          target:    ACHIEVEMENT_DEFS['centurion'].target,
        };
      } else {
        updates['achievements.centurion.progress'] = projectedPoints;
        if (!centurionEntry) {
          updates['achievements.centurion.target']    = ACHIEVEMENT_DEFS['centurion'].target;
          updates['achievements.centurion.earnCount'] = 0;
          updates['achievements.centurion.earnedAt']  = null;
        }
      }
    }

    // ── Commit ────────────────────────────────────────────────────────────────
    if (pointsGained > 0) {
      updates['totalPoints'] = increment(pointsGained);
    }

    if (Object.keys(updates).length > 0) {
      tx.update(userDocRef, updates);
    }

    // ── "1 away" nudge detection (KAN-122) ────────────────────────────────────
    // Compute candidate AFTER all awards so projectedPoints is final.
    // Only considers achievements not awarded in this transaction.
    const candidates: AchievementNudgeCandidate[] = [];

    // day_complete: 1 task left today (context-based, target=1 repeatable)
    if (!ctx.allTasksDone && (ctx.remainingTaskCount ?? 0) === 1) {
      candidates.push({ achievementId: 'day_complete', remaining: 1 });
    }

    // early_bird: still before 9 AM (time-gated)
    if (completedHour < 9) {
      candidates.push({ achievementId: 'early_bird', remaining: 1 });
    }

    // on_a_roll: streak is 1 away from target (3-day), not yet earned
    {
      const onARollEarned = (map['on_a_roll']?.earnCount ?? 0) > 0;
      const awardedNow    = !!(updates['achievements.on_a_roll'] as any)?.earnCount;
      const remaining     = ACHIEVEMENT_DEFS['on_a_roll'].target - currentStreak;
      if (!onARollEarned && !awardedNow && remaining === 1) {
        candidates.push({ achievementId: 'on_a_roll', remaining: 1 });
      }
    }

    // explorer: after this task, progress is 1 away from target (10)
    if (task.poi) {
      const newProgress   = (map['explorer']?.progress ?? 0) + 1;
      const explorerEarned  = (map['explorer']?.earnCount ?? 0) > 0;
      const awardedNow    = !!(updates['achievements.explorer'] as any)?.earnCount;
      const remaining     = ACHIEVEMENT_DEFS['explorer'].target - newProgress;
      if (!explorerEarned && !awardedNow && remaining === 1) {
        candidates.push({ achievementId: 'explorer', remaining: 1 });
      }
    }

    // centurion: final projected points are 1 away from target (100)
    {
      const projectedFinal  = currentPoints + pointsGained;
      const centurionEarned = (map['centurion']?.earnCount ?? 0) > 0;
      const awardedNow      = !!(updates['achievements.centurion'] as any)?.earnCount;
      const remaining       = ACHIEVEMENT_DEFS['centurion'].target - projectedFinal;
      if (!centurionEarned && !awardedNow && remaining === 1) {
        candidates.push({ achievementId: 'centurion', remaining: 1 });
      }
    }

    // Return the candidate with the smallest remaining gap (most attainable first)
    candidates.sort((a, b) => a.remaining - b.remaining);
    return candidates[0] ?? null;
  });

  return { nudgeCandidate: nudgeCandidate ?? null };
}

/**
 * Read the user's notification preferences and, if the daily limit hasn't been
 * hit and the `achievementNudges` toggle is on, fire the nudge notification
 * and stamp `lastAchievementNudgeDate` to prevent a second nudge today.
 *
 * Call this fire-and-forget after `evaluateAchievements` returns a candidate.
 */
export async function checkAndFireAchievementNudge(
  uid:       string,
  candidate: AchievementNudgeCandidate,
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const prefs = await getUserPreferences(uid);

  // Respect the "achievementNudges" toggle (default true).
  if (!(prefs.achievementNudges ?? DEFAULT_USER_PREFERENCES.achievementNudges)) { return; }

  // Max 1 nudge per day.
  if (prefs.lastAchievementNudgeDate === today) { return; }

  await fireAchievementNudge({
    achievementId: candidate.achievementId,
    remaining:     candidate.remaining,
  });
  await updateUserPreferences(uid, { lastAchievementNudgeDate: today });
}

// ─── One-time migration (KAN-129) ────────────────────────────────────────────

/**
 * Recomputes `user.totalPoints` from the `achievements` map and writes it
 * back to Firestore if it differs from the stored value.
 *
 * Must be called once on app startup after the user is authenticated.
 * Fixes accounts that accumulated per-task points under the old model before
 * KAN-129 switched to achievement-derived points only.
 *
 * The function is idempotent — calling it multiple times is safe.
 */
export async function migratePointsToAchievementDerived(uid: string): Promise<void> {
  const db = getFirestore();
  const userDocRef = db.collection('users').doc(uid);

  await runTransaction(db, async tx => {
    const snap = await tx.get(userDocRef);
    const data = snap.data() as (User & { achievements?: AchievementsMap }) | undefined;
    if (!data) { return; }

    const map: AchievementsMap = (data.achievements ?? {}) as AchievementsMap;

    let computedPoints = 0;
    for (const [type, entry] of Object.entries(map)) {
      if (!entry || entry.earnCount <= 0) { continue; }
      const def = ACHIEVEMENT_DEFS[type];
      if (def) { computedPoints += def.points * entry.earnCount; }
    }

    if ((data.totalPoints ?? 0) !== computedPoints) {
      tx.update(userDocRef, { totalPoints: computedPoints });
    }
  });
}

// ─── Challenge winner achievement (KAN-104) ───────────────────────────────────
// Uses the old subcollection model — migration is tracked separately.

const CHANNEL_ID             = 'achievements';
const CHALLENGE_WINNER_ID    = 'challenge_winner';
const CHALLENGE_WINNER_BONUS = 5;

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') { return; }
  await notifee.createChannel({
    id:         CHANNEL_ID,
    name:       'Achievements',
    importance: AndroidImportance.HIGH,
    sound:      'default',
  });
}

export async function awardChallengeWinnerAchievement(
  uid:         string,
  challengeId: string,
): Promise<void> {
  const achievementId = `${CHALLENGE_WINNER_ID}_${challengeId}`;
  const alreadyAwarded = await hasAchievement(uid, achievementId);
  if (alreadyAwarded) { return; }
  await awardAchievement(uid, achievementId, 'challenge_winner', { challengeId });
  await awardPointsAchievementBonus(uid, CHALLENGE_WINNER_ID, CHALLENGE_WINNER_BONUS);
  await ensureChannel();
  await notifee.displayNotification({
    title: COPY.achievement.challengeWonNotifTitle,
    body:  COPY.achievement.challengeWonBody,
    data:  { screen: 'ChallengeDetail', challengeId },
    android: { channelId: CHANNEL_ID, importance: AndroidImportance.HIGH, pressAction: { id: 'default' } },
    ios:     { sound: 'default' },
  });
}
