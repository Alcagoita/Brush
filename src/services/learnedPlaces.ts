/**
 * learnedPlaces.ts — on-device ranking of venues the user actually brushes
 * tasks at (KAN-230).
 *
 * Learning is continuous and per-user, not time-gated: every brush at a
 * known place (`completedPlaceId`, recorded at brush time — KAN-226) is one
 * data point. A venue is promoted to a learned place once the same user has
 * brushed tasks there LEARNED_PLACE_THRESHOLD times — a visit-count
 * threshold, not calendar time, so a user who hits it in a few days gets it
 * in a few days.
 *
 * Venues are keyed by the internal place identity (KAN-228's cross-source
 * id), not a raw Google/OSM id, so a brush recorded online (live Google
 * hero place) and one recorded offline (cache-sourced hero place) for the
 * same physical venue count toward the same learned place.
 *
 * Below the threshold, nothing changes — no degraded/partial state, no
 * empty state. Learned places only ever add precision on top of today's
 * behavior.
 *
 * Pure and synchronous — callers own fetching the task history (see
 * getCompletedTasksWithPlace in services/firestore/tasks.ts) so this stays
 * testable against fixtures without any real accumulated usage data.
 */

import type { Task } from '../types';

/** Visits to the same internal place id before it's promoted to "learned". Tunable. */
export const LEARNED_PLACE_THRESHOLD = 3;

export interface LearnedPlace {
  placeId: string;
  name: string;
  poiType: string;
  visitCount: number;
}

/**
 * Tallies `completedPlaceId` across the given tasks and returns every venue
 * that has reached LEARNED_PLACE_THRESHOLD visits, ranked by visit count
 * descending (most-visited first). Tasks with no completedPlaceId are
 * ignored (brushed with no known place, or done: false).
 */
export function computeLearnedPlaces(tasks: Task[]): LearnedPlace[] {
  const counts = new Map<string, { name: string; poiType: string; visitCount: number }>();

  for (const task of tasks) {
    if (!task.completedPlaceId) { continue; }
    const existing = counts.get(task.completedPlaceId);
    if (existing) {
      existing.visitCount += 1;
    } else {
      counts.set(task.completedPlaceId, {
        name:       task.completedPlaceName ?? '',
        poiType:    task.completedPoiType ?? '',
        visitCount: 1,
      });
    }
  }

  const learned: LearnedPlace[] = [];
  for (const [placeId, info] of counts) {
    if (info.visitCount >= LEARNED_PLACE_THRESHOLD) {
      learned.push({ placeId, ...info });
    }
  }

  return learned.sort((a, b) => b.visitCount - a.visitCount);
}

/** The best-ranked learned place for a given POI type, or null if none qualifies yet. */
export function getLearnedPlaceForPoiType(learnedPlaces: LearnedPlace[], poiType: string): LearnedPlace | null {
  return learnedPlaces.find(p => p.poiType === poiType) ?? null;
}
