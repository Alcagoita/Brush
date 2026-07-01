/**
 * useTaskCompletion — KAN-59 / KAN-214
 *
 * Owns the task-done toggle: optimistic local update, Firestore persistence
 * (revert on failure), and the post-completion achievements/challenges side
 * effects (KAN-31 / KAN-32), deferred until interactions settle (KAN-157).
 */

import { useCallback } from 'react';
import { Platform, Vibration, InteractionManager } from 'react-native';
import { setTaskDone, getTotalPoints } from '../../services/firestore';
import { evaluateAchievements, checkAndFireAchievementNudge } from '../../services/achievements';
import { getActiveChallengesForUser, incrementCompletedCount } from '../../services/challenges';
import type { Task } from '../../types';
import { DEBUG_DISABLE_BACKGROUND } from './debugFlags';

export function useTaskCompletion(
  uid: string | undefined,
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>,
  latestTasksRef: React.RefObject<Task[]>,
  nearbyPoiTypeRef: React.RefObject<string | null>,
  setTotalPoints: React.Dispatch<React.SetStateAction<number>>,
) {
  const handleToggle = useCallback(async (taskId: string, done: boolean) => {
    if (!uid) { return; }

    Vibration.vibrate(Platform.OS === 'android' ? 18 : 1);

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done, pendingSync: true } : t));

    try {
      await setTaskDone(uid, taskId, done);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, pendingSync: false } : t));

      if (done) {
        // Read the latest tasks from the ref — NOT a captured `tasks` dep.
        // Depending on `tasks` here would give handleToggle a new identity on
        // every task change, defeating React.memo on every TaskRow and causing
        // a full-list re-render storm on each proximity tick (KAN-157 follow-up).
        const current = latestTasksRef.current;
        const task = current.find(t => t.id === taskId);
        const allOthersDone =
          current.length > 0 &&
          current.filter(t => t.id !== taskId).every(t => t.done);
        const remainingTaskCount = current.filter(
          t => t.id !== taskId && !t.done,
        ).length;

        if (task && !DEBUG_DISABLE_BACKGROUND) {
          // Defer achievement + challenge work until after the completion
          // animation / in-flight interactions settle (KAN-157). Previously the
          // heavy Firestore achievements transaction ran concurrently with the
          // completion re-render, saturating the JS thread (10s+ freeze, and a
          // Fabric ShadowTree commit crash). The screen never needs the full
          // achievements here — once the work lands we refresh only the points
          // total for the header badge.
          InteractionManager.runAfterInteractions(() => {
            evaluateAchievements(uid, task, { allTasksDone: allOthersDone, remainingTaskCount, isNearby: !!task.poi && task.poi === nearbyPoiTypeRef.current })
              .then(({ nudgeCandidate }) => {
                if (nudgeCandidate) {
                  checkAndFireAchievementNudge(uid, nudgeCandidate).catch(() => {});
                }
                getTotalPoints(uid).then(setTotalPoints).catch(() => {});
              })
              .catch(() => {});

            getActiveChallengesForUser(uid).then(challenges => {
              challenges.forEach(c =>
                incrementCompletedCount(c.id, uid, c).catch(() => {}),
              );
            }).catch(() => {});
          });
        }
      }
    } catch (err) {
      // Only revert if the row still reflects this failed write (done + pendingSync).
      // If the user toggled again before this rejected, that newer optimistic
      // update already owns the row — don't stomp it.
      setTasks(prev => prev.map(t =>
        t.id === taskId && t.done === done && t.pendingSync
          ? { ...t, done: !done, pendingSync: false }
          : t,
      ));
      console.warn('[useTodayScreen] toggle failed — reverting', err);
    }
  }, [uid, setTasks, latestTasksRef, nearbyPoiTypeRef, setTotalPoints]);

  return { handleToggle };
}
