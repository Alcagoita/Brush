import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

type AchievementType =
  | 'first_task'
  | 'first_brush'
  | 'right_place'
  | 'worth_wait'
  | 'custom_cat'
  | 'out_about'
  | 'early_bird'
  | 'day_complete'
  | 'on_a_roll'
  | 'explorer'
  | 'centurion'
  | 'challenge_winner';

interface AchievementEntry {
  earnedAt: admin.firestore.FieldValue | admin.firestore.Timestamp | null;
  earnCount: number;
  progress: number;
  target: number;
}

type AchievementsMap = Partial<Record<AchievementType, AchievementEntry>>;

interface UserDoc {
  totalPoints?: number;
  currentStreak?: number;
  brushedPoiTypes?: string[];
  achievements?: AchievementsMap;
}

interface TaskDoc {
  title: string;
  done: boolean;
  poi?: string;
  completedPlaceId?: string;
  completedPoiType?: string;
  createdAt?: admin.firestore.Timestamp;
  completedAt?: admin.firestore.Timestamp;
  date: string;
  kind?: 'birthday';
}

interface CategoryDoc {
  isBuiltIn?: boolean;
}

interface TaskCompletionRewardInput {
  taskId: string;
  completedHour: number;
}

interface AchievementNudgeCandidate {
  achievementId: AchievementType;
  remaining: number;
}

interface TaskCompletionRewardResult {
  totalPoints: number;
  nudgeCandidate: AchievementNudgeCandidate | null;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const ONBOARDING_BONUS_POINTS = 10;
const CHALLENGE_WINNER_BONUS = 5;
const CHALLENGE_WINNER_ID = 'challenge_winner';

const ACHIEVEMENT_DEFS: Record<AchievementType, { points: number; target: number; repeatable: boolean }> = {
  first_task:       { points: 5,  target: 1,   repeatable: false },
  first_brush:      { points: 10, target: 1,   repeatable: false },
  right_place:      { points: 10, target: 1,   repeatable: false },
  worth_wait:       { points: 10, target: 1,   repeatable: false },
  custom_cat:       { points: 5,  target: 1,   repeatable: false },
  out_about:        { points: 10, target: 3,   repeatable: false },
  early_bird:       { points: 10, target: 1,   repeatable: true  },
  day_complete:     { points: 15, target: 1,   repeatable: true  },
  on_a_roll:        { points: 20, target: 3,   repeatable: true  },
  explorer:         { points: 25, target: 10,  repeatable: false },
  centurion:        { points: 30, target: 100, repeatable: false },
  challenge_winner: { points: 5,  target: 1,   repeatable: false },
};

function userRef(db: admin.firestore.Firestore, uid: string) {
  return db.collection('users').doc(uid);
}

function taskRef(db: admin.firestore.Firestore, uid: string, taskId: string) {
  return userRef(db, uid).collection('tasks').doc(taskId);
}

function rewardClaimRef(db: admin.firestore.Firestore, uid: string, claimId: string) {
  return userRef(db, uid).collection('rewardClaims').doc(claimId);
}

function achievementRef(db: admin.firestore.Firestore, uid: string, achievementId: string) {
  return userRef(db, uid).collection('achievements').doc(achievementId);
}

function pointsHistoryRef(db: admin.firestore.Firestore, uid: string, entryId: string) {
  return userRef(db, uid).collection('pointsHistory').doc(entryId);
}

function getEarnCount(map: AchievementsMap, id: AchievementType): number {
  return map[id]?.earnCount ?? 0;
}

function getProgress(map: AchievementsMap, id: AchievementType): number {
  return map[id]?.progress ?? 0;
}

async function runTaskCompletionRewards(
  uid: string,
  input: TaskCompletionRewardInput,
  db: admin.firestore.Firestore = admin.firestore(),
): Promise<TaskCompletionRewardResult> {
  return db.runTransaction(async tx => {
    const userDocRef = userRef(db, uid);
    const completedTaskRef = taskRef(db, uid, input.taskId);
    const claimDocRef = rewardClaimRef(db, uid, `task_completion_${input.taskId}`);

    const [userSnap, taskSnap, claimSnap] = await Promise.all([
      tx.get(userDocRef),
      tx.get(completedTaskRef),
      tx.get(claimDocRef),
    ]);

    if (!taskSnap.exists) {
      throw new HttpsError('not-found', 'Task not found.');
    }

    const task = taskSnap.data() as TaskDoc;
    const user = (userSnap.data() as UserDoc | undefined) ?? {};

    if (task.kind === 'birthday') {
      return { totalPoints: user.totalPoints ?? 0, nudgeCandidate: null };
    }

    if (!task.done || !task.completedAt) {
      throw new HttpsError('failed-precondition', 'Task must be completed before rewards are processed.');
    }

    if (claimSnap.exists) {
      return { totalPoints: user.totalPoints ?? 0, nudgeCandidate: null };
    }

    const dayTasksSnap = await tx.get(
      userDocRef.collection('tasks').where('date', '==', task.date),
    );
    const tasksForDay = dayTasksSnap.docs.map(doc => doc.data() as TaskDoc);
    const scorableTasks = tasksForDay.filter(item => item.kind !== 'birthday');
    const allTasksDone = scorableTasks.length > 0 && scorableTasks.every(item => item.done);
    const remainingTaskCount = scorableTasks.filter(item => !item.done).length;
    const isNearby = !!task.poi && !!task.completedPlaceId && task.completedPoiType === task.poi;

    const map: AchievementsMap = (user.achievements ?? {}) as AchievementsMap;
    const currentPoints = user.totalPoints ?? 0;
    const currentStreak = user.currentStreak ?? 0;
    const updates: Record<string, unknown> = {};
    let pointsGained = 0;

    const tryAward = (id: AchievementType, newProgress: number) => {
      const def = ACHIEVEMENT_DEFS[id];
      const earnCount = getEarnCount(map, id);
      const alreadyEarned = earnCount > 0;
      const meetsTarget = newProgress >= def.target;
      const shouldAward = meetsTarget && (!alreadyEarned || def.repeatable);

      if (shouldAward) {
        pointsGained += def.points;
        updates[`achievements.${id}`] = {
          earnedAt: admin.firestore.FieldValue.serverTimestamp(),
          earnCount: earnCount + 1,
          progress: newProgress,
          target: def.target,
        };
      } else if (alreadyEarned) {
        updates[`achievements.${id}.progress`] = newProgress;
      } else {
        updates[`achievements.${id}.progress`] = newProgress;
        updates[`achievements.${id}.target`] = def.target;
        updates[`achievements.${id}.earnCount`] = 0;
        updates[`achievements.${id}.earnedAt`] = null;
      }
    };

    if (getEarnCount(map, 'first_brush') === 0) {
      tryAward('first_brush', 1);
    }

    if (task.poi && isNearby && getEarnCount(map, 'right_place') === 0) {
      tryAward('right_place', 1);
    }

    if (task.createdAt && getEarnCount(map, 'worth_wait') === 0) {
      const ageMs = task.completedAt.toMillis() - task.createdAt.toMillis();
      if (ageMs >= THREE_DAYS_MS) {
        tryAward('worth_wait', 1);
      }
    }

    if (task.poi && getEarnCount(map, 'out_about') === 0) {
      const existing = user.brushedPoiTypes ?? [];
      const updated = existing.includes(task.poi) ? existing : [...existing, task.poi];
      if (updated.length !== existing.length) {
        updates.brushedPoiTypes = updated;
      }
      tryAward('out_about', updated.length);
    }

    if (input.completedHour < 9) {
      tryAward('early_bird', getProgress(map, 'early_bird') + 1);
    }

    if (allTasksDone) {
      tryAward('day_complete', getProgress(map, 'day_complete') + 1);
    }

    if (currentStreak >= ACHIEVEMENT_DEFS.on_a_roll.target) {
      if (getProgress(map, 'on_a_roll') < ACHIEVEMENT_DEFS.on_a_roll.target) {
        tryAward('on_a_roll', currentStreak);
      } else {
        updates['achievements.on_a_roll.progress'] = currentStreak;
      }
    } else {
      updates['achievements.on_a_roll.progress'] = currentStreak;
      if (!map.on_a_roll) {
        updates['achievements.on_a_roll.target'] = ACHIEVEMENT_DEFS.on_a_roll.target;
        updates['achievements.on_a_roll.earnCount'] = 0;
        updates['achievements.on_a_roll.earnedAt'] = null;
      }
    }

    if (task.poi) {
      tryAward('explorer', getProgress(map, 'explorer') + 1);
    }

    const centurionEarned = getEarnCount(map, 'centurion') > 0;
    const projectedPoints = currentPoints + pointsGained;
    if (projectedPoints >= ACHIEVEMENT_DEFS.centurion.target && !centurionEarned) {
      pointsGained += ACHIEVEMENT_DEFS.centurion.points;
      updates['achievements.centurion'] = {
        earnedAt: admin.firestore.FieldValue.serverTimestamp(),
        earnCount: 1,
        progress: projectedPoints,
        target: ACHIEVEMENT_DEFS.centurion.target,
      };
    } else {
      updates['achievements.centurion.progress'] = projectedPoints;
      if (!map.centurion) {
        updates['achievements.centurion.target'] = ACHIEVEMENT_DEFS.centurion.target;
        updates['achievements.centurion.earnCount'] = 0;
        updates['achievements.centurion.earnedAt'] = null;
      }
    }

    if (pointsGained > 0) {
      updates.totalPoints = admin.firestore.FieldValue.increment(pointsGained);
    }

    if (Object.keys(updates).length > 0) {
      tx.update(userDocRef, updates);
    }

    tx.set(claimDocRef, {
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      type: 'task_completion',
      taskId: input.taskId,
    });

    const wasAwardedInTx = (key: AchievementType): boolean => {
      const value = updates[`achievements.${key}`];
      return (
        typeof value === 'object' &&
        value !== null &&
        'earnCount' in value &&
        typeof (value as { earnCount: unknown }).earnCount === 'number' &&
        (value as { earnCount: number }).earnCount > 0
      );
    };

    const candidates: AchievementNudgeCandidate[] = [];

    if (!allTasksDone && remainingTaskCount === 1) {
      candidates.push({ achievementId: 'day_complete', remaining: 1 });
    }

    if (input.completedHour < 9) {
      candidates.push({ achievementId: 'early_bird', remaining: 1 });
    }

    {
      const remaining = ACHIEVEMENT_DEFS.on_a_roll.target - currentStreak;
      if (getEarnCount(map, 'on_a_roll') === 0 && !wasAwardedInTx('on_a_roll') && remaining === 1) {
        candidates.push({ achievementId: 'on_a_roll', remaining: 1 });
      }
    }

    if (task.poi) {
      const newProgress = getProgress(map, 'explorer') + 1;
      const remaining = ACHIEVEMENT_DEFS.explorer.target - newProgress;
      if (getEarnCount(map, 'explorer') === 0 && !wasAwardedInTx('explorer') && remaining === 1) {
        candidates.push({ achievementId: 'explorer', remaining: 1 });
      }
    }

    {
      const projectedFinal = currentPoints + pointsGained;
      const remaining = ACHIEVEMENT_DEFS.centurion.target - projectedFinal;
      if (getEarnCount(map, 'centurion') === 0 && !wasAwardedInTx('centurion') && remaining === 1) {
        candidates.push({ achievementId: 'centurion', remaining: 1 });
      }
    }

    candidates.sort((a, b) => a.remaining - b.remaining);

    return {
      totalPoints: currentPoints + pointsGained,
      nudgeCandidate: candidates[0] ?? null,
    };
  });
}

async function awardOnboardingBonusInternal(
  uid: string,
  taskId: string,
  db: admin.firestore.Firestore = admin.firestore(),
): Promise<void> {
  await db.runTransaction(async tx => {
    const histRef = pointsHistoryRef(db, uid, `onboarding_${uid}`);
    const taskDocRef = taskRef(db, uid, taskId);
    const [histSnap, taskSnap] = await Promise.all([tx.get(histRef), tx.get(taskDocRef)]);
    if (histSnap.exists) { return; }
    if (!taskSnap.exists) {
      throw new HttpsError('not-found', 'Task not found.');
    }
    const task = taskSnap.data() as TaskDoc;

    tx.set(histRef, {
      taskId,
      taskTitle: task.title,
      awardedAt: admin.firestore.FieldValue.serverTimestamp(),
      points: ONBOARDING_BONUS_POINTS,
      reason: 'onboarding_bonus',
    });
    tx.update(userRef(db, uid), {
      totalPoints: admin.firestore.FieldValue.increment(ONBOARDING_BONUS_POINTS),
    });
  });
}

async function awardSingleAchievementInternal(
  uid: string,
  achievementId: AchievementType,
  db: admin.firestore.Firestore = admin.firestore(),
): Promise<void> {
  await db.runTransaction(async tx => {
    const userDocRef = userRef(db, uid);
    const userSnap = await tx.get(userDocRef);
    const user = (userSnap.data() as UserDoc | undefined) ?? {};
    const map: AchievementsMap = (user.achievements ?? {}) as AchievementsMap;
    if (getEarnCount(map, achievementId) > 0) { return; }
    const def = ACHIEVEMENT_DEFS[achievementId];
    tx.update(userDocRef, {
      [`achievements.${achievementId}`]: {
        earnedAt: admin.firestore.FieldValue.serverTimestamp(),
        earnCount: 1,
        progress: 1,
        target: def.target,
      },
      totalPoints: admin.firestore.FieldValue.increment(def.points),
    });
  });
}

export async function awardChallengeWinnerReward(
  uid: string,
  challengeId: string,
  db: admin.firestore.Firestore = admin.firestore(),
): Promise<void> {
  await db.runTransaction(async tx => {
    const achievementDocRef = achievementRef(db, uid, `${CHALLENGE_WINNER_ID}_${challengeId}`);
    const histRef = pointsHistoryRef(db, uid, `challenge_winner_${challengeId}`);
    const [achievementSnap, histSnap] = await Promise.all([
      tx.get(achievementDocRef),
      tx.get(histRef),
    ]);

    if (achievementSnap.exists && histSnap.exists) { return; }

    if (!achievementSnap.exists) {
      tx.set(achievementDocRef, {
        type: CHALLENGE_WINNER_ID,
        earnedAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: { challengeId },
      });
    }

    if (!histSnap.exists) {
      tx.set(histRef, {
        taskId: '',
        taskTitle: `Achievement unlocked: ${CHALLENGE_WINNER_ID}`,
        awardedAt: admin.firestore.FieldValue.serverTimestamp(),
        points: CHALLENGE_WINNER_BONUS,
        reason: 'achievement_bonus',
      });
      tx.update(userRef(db, uid), {
        totalPoints: admin.firestore.FieldValue.increment(CHALLENGE_WINNER_BONUS),
      });
    }
  });
}

export const processTaskCompletionRewards = onCall(
  {
    enforceAppCheck: true,
    maxInstances: 10,
  },
  async (request): Promise<TaskCompletionRewardResult> => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const data = request.data as Partial<TaskCompletionRewardInput> | undefined;
    const taskId = typeof data?.taskId === 'string' ? data.taskId.trim() : '';
    const completedHour = typeof data?.completedHour === 'number' ? data.completedHour : NaN;

    if (!taskId) {
      throw new HttpsError('invalid-argument', 'taskId is required.');
    }
    if (!Number.isInteger(completedHour) || completedHour < 0 || completedHour > 23) {
      throw new HttpsError('invalid-argument', 'completedHour must be an integer from 0 to 23.');
    }

    return runTaskCompletionRewards(request.auth.uid, { taskId, completedHour });
  },
);

export const awardOnboardingBonus = onCall(
  {
    enforceAppCheck: true,
    maxInstances: 10,
  },
  async (request): Promise<{ ok: true }> => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const data = request.data as { taskId?: unknown } | undefined;
    const taskId = typeof data?.taskId === 'string' ? data.taskId.trim() : '';
    if (!taskId) {
      throw new HttpsError('invalid-argument', 'taskId is required.');
    }

    await awardOnboardingBonusInternal(request.auth.uid, taskId);
    return { ok: true };
  },
);

export const onTaskCreatedRewards = onDocumentCreated(
  'users/{uid}/tasks/{taskId}',
  async (event) => {
    const uid = event.params.uid;
    await awardSingleAchievementInternal(uid, 'first_task');
  },
);

export const onCategoryCreatedRewards = onDocumentCreated(
  'users/{uid}/categories/{categoryId}',
  async (event) => {
    const uid = event.params.uid;
    const category = event.data?.data() as CategoryDoc | undefined;
    if (!category || category.isBuiltIn) { return; }
    await awardSingleAchievementInternal(uid, 'custom_cat');
  },
);
