/**
 * useLearnedPlaces — KAN-230
 *
 * Fetches the user's full brush-at-a-known-place history once per uid and
 * computes the on-device learned-place ranking (learnedPlaces.ts). One-shot
 * fetch, not a listener (repo rule: no persistent onSnapshot for this kind
 * of derived, infrequently-changing state) — call `refresh()` after a task
 * completes with a known place so the ranking picks up the new brush.
 */

import { useCallback, useEffect, useState } from 'react';
import { getCompletedTasksWithPlace } from '../../services/firestore';
import { computeLearnedPlaces, LearnedPlace } from '../../services/learnedPlaces';

export interface LearnedPlacesState {
  learnedPlaces: LearnedPlace[];
  /** Re-fetches history and recomputes the ranking — call after a brush at a known place. */
  refresh: () => Promise<void>;
}

export function useLearnedPlaces(uid: string | undefined): LearnedPlacesState {
  const [learnedPlaces, setLearnedPlaces] = useState<LearnedPlace[]>([]);

  const refresh = useCallback(async () => {
    if (!uid) {
      setLearnedPlaces([]);
      return;
    }
    try {
      const tasks = await getCompletedTasksWithPlace(uid);
      setLearnedPlaces(computeLearnedPlaces(tasks));
    } catch (err) {
      console.warn('[useLearnedPlaces] refresh failed', err);
    }
  }, [uid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { learnedPlaces, refresh };
}
