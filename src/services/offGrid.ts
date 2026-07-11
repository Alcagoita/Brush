/**
 * offGrid.ts — Off-grid window business logic (KAN-246).
 *
 * Sister feature to Trip Planner (tripDownload.ts): same downloadTripArea
 * machinery, different intent — a trip is future + destination (day-level
 * dates, computeTripExpiresAt's 5-day grace margin); an off-grid window is
 * now + duration (hour-level precision, no grace margin — a "few hours"
 * window that lingered 5 extra days would defeat the whole point). Kept in
 * its own module rather than folded into tripDownload.ts so the two expiry
 * models never get conflated.
 */

import { TRIP_RADIUS_PRESETS } from './tripDownload';
import { toDateSafe } from '../utils/date';
import type { Task } from '../types';

/** Off-grid usually means moving, so the default area is generous — larger than HABITAT_RADIUS_M (5km). Reuses Trip Planner's "town_and_around" preset rather than inventing a fourth radius. */
export const OFFGRID_AREA_RADIUS_M = TRIP_RADIUS_PRESETS.find(p => p.key === 'town_and_around')!.radiusMeters;

export type OffGridDurationKey = 'few_hours' | 'until_tonight' | 'pick_time';

const FEW_HOURS_MS = 5 * 60 * 60 * 1_000;
/** Local "tonight" cutoff used by the 'until_tonight' chip. */
const TONIGHT_HOUR = 22;
/** Fallback window length if 'until_tonight' is chosen after the cutoff has already passed today. */
const LATE_NIGHT_FALLBACK_MS = 3 * 60 * 60 * 1_000;

/**
 * Resolves a duration choice to an absolute expiry timestamp.
 * - 'few_hours' → now + 5h.
 * - 'until_tonight' → today at 22:00 local; if that's already past, now + 3h
 *   instead of silently producing a window that "expires" in the past.
 * - 'pick_time' → the caller-supplied absolute time, used as-is (still
 *   clamped to be at least a minute past `now` so a picked time in the past
 *   can't produce an already-expired window).
 */
export function computeOffGridExpiresAt(
  duration: OffGridDurationKey,
  pickedTimeMs: number | undefined,
  now: number = Date.now(),
): number {
  if (duration === 'few_hours') { return now + FEW_HOURS_MS; }

  if (duration === 'until_tonight') {
    const tonight = new Date(now);
    tonight.setHours(TONIGHT_HOUR, 0, 0, 0);
    return tonight.getTime() > now ? tonight.getTime() : now + LATE_NIGHT_FALLBACK_MS;
  }

  // 'pick_time'
  if (pickedTimeMs !== undefined && pickedTimeMs > now) { return pickedTimeMs; }
  return now + FEW_HOURS_MS;
}

/**
 * "Welcome back — N things brushed away while you were off-grid" (KAN-246).
 * Counts client-side over the tasks already loaded on Today rather than a
 * new time-windowed Firestore query — Task.completedAt already carries
 * everything needed, and this only ever runs against one screen's worth of
 * tasks, not a historical scan.
 */
export function countBrushedDuringWindow(tasks: Task[], windowStartMs: number, windowEndMs: number): number {
  return tasks.filter(t => {
    const completedMs = toDateSafe(t.completedAt)?.getTime();
    return completedMs != null && completedMs >= windowStartMs && completedMs <= windowEndMs;
  }).length;
}
