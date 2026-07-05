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
 * Pure and synchronous — visit counts are tallied incrementally in Firestore
 * by setTaskDone's transaction (KAN-240, see getLearnedPlaceCounts in
 * services/firestore/tasks.ts), so this module only filters and ranks the
 * already-aggregated counts. Stays testable against fixtures without any
 * real accumulated usage data.
 */

/** Visits to the same internal place id before it's promoted to "learned". Tunable. */
export const LEARNED_PLACE_THRESHOLD = 3;

export interface LearnedPlace {
  placeId: string;
  name: string;
  poiType: string;
  visitCount: number;
}

/**
 * Filters the given per-place visit counts down to venues that have reached
 * LEARNED_PLACE_THRESHOLD visits, ranked by visit count descending
 * (most-visited first).
 */
export function computeLearnedPlaces(counts: LearnedPlace[]): LearnedPlace[] {
  return counts
    .filter(c => c.visitCount >= LEARNED_PLACE_THRESHOLD)
    .sort((a, b) => b.visitCount - a.visitCount);
}

/** The best-ranked learned place for a given POI type, or null if none qualifies yet. */
export function getLearnedPlaceForPoiType(learnedPlaces: LearnedPlace[], poiType: string): LearnedPlace | null {
  return learnedPlaces.find(p => p.poiType === poiType) ?? null;
}
