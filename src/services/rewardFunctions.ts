import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import type { AchievementNudgeCandidate } from './achievements';

interface TaskCompletionRewardResponse {
  totalPoints: number;
  nudgeCandidate: AchievementNudgeCandidate | null;
}

export async function processTaskCompletionRewards(taskId: string, completedHour: number): Promise<TaskCompletionRewardResponse> {
  const callable = httpsCallable<{ taskId: string; completedHour: number }, TaskCompletionRewardResponse>(
    getFunctions(),
    'processTaskCompletionRewards',
  );
  const result = await callable({ taskId, completedHour });
  return result.data;
}

export async function awardOnboardingBonus(taskId: string): Promise<void> {
  const callable = httpsCallable<{ taskId: string }, { ok: true }>(
    getFunctions(),
    'awardOnboardingBonus',
  );
  await callable({ taskId });
}
