/**
 * contextChip.ts — KAN-242 priority resolver.
 *
 * Pure decision logic for the header ContextChip: given the current place
 * context (mall/trip/none, already mall-vs-trip prioritized by
 * proximity.ts's findActivePlaceContext) plus offline/cache state, decides
 * the single view to render. Kept independent of geolocation/Firestore so
 * the mall > trip > offline priority and the "never two chips" guarantee
 * are unit-testable without mocking either.
 */
import type { PlaceContext } from '../services/proximity';
import type { Trip } from '../types';

/** True when today falls within the trip's dates. A dateless trip (user skipped both) has no date constraint. */
export function isTodayWithinTripDates(trip: Trip, todayIso: string): boolean {
  if (!trip.startDate && !trip.endDate) { return true; }
  if (trip.startDate && todayIso < trip.startDate) { return false; }
  if (trip.endDate && todayIso > trip.endDate) { return false; }
  return true;
}

/**
 * KAN-257 — true when a trip is over: it has an endDate and that date is
 * before today. A dateless trip (endDate never set) is never "past" — there's
 * nothing to remember it by yet. Off-grid trips (kind:'offgrid') are a
 * separate concept entirely (KAN-246) and must be filtered by the caller —
 * this helper doesn't know about kind, deliberately, since past-ness is a
 * pure date question independent of what kind of trip it is.
 */
export function isTripPast(trip: Trip, todayIso: string): boolean {
  return !!trip.endDate && trip.endDate < todayIso;
}

/**
 * KAN-257 — a trip worth remembering on "Where we've been": past (per
 * isTripPast) AND not an off-grid window (KAN-246 — a Tuesday hike isn't a
 * trip memory). Both useWhereWeveBeen and CalendarScreen need exactly this
 * combined check; kept here rather than duplicated at each call site.
 */
export function isPastMemorableTrip(trip: Trip, todayIso: string): boolean {
  return trip.kind !== 'offgrid' && isTripPast(trip, todayIso);
}

export type ContextChipView =
  | { kind: 'mall'; name: string; offlineDot: boolean }
  | { kind: 'trip'; destination: string; startDate?: string; endDate?: string; offlineDot: boolean }
  | { kind: 'offgrid'; destination: string; expiresAt: number }
  | { kind: 'offline' }
  | { kind: 'none' };

export interface ResolveContextChipViewInput {
  placeContext: PlaceContext;
  todayIso: string;
  offline: boolean;
  /** Tri-state — null means "not yet checked this offline period" (see useOfflineCoverage). */
  hasCache: boolean | null;
  /**
   * KAN-246 — the active off-grid window, if any. Independent of
   * placeContext/position — shown whenever the window is active, since the
   * user set it up in advance and may not be exactly at its center. Optional
   * (defaults to null) so every existing caller/test is unaffected.
   */
  offGridWindow?: { destination: string; expiresAt: number } | null;
}

/** mall > trip > off-grid window > offline glyph > none. Exactly one kind is ever returned — never two indicators. Off-grid sits at "the offline glyph tier" per KAN-246 — below a real trip/mall context, but ahead of the plain offline glyph since it carries more specific information ("until 18:00"). */
export function resolveContextChipView({
  placeContext, todayIso, offline, hasCache, offGridWindow = null,
}: ResolveContextChipViewInput): ContextChipView {
  if (placeContext?.kind === 'mall') {
    return { kind: 'mall', name: placeContext.snapshot.name, offlineDot: offline };
  }

  if (placeContext?.kind === 'trip' && placeContext.trip.kind !== 'offgrid' && isTodayWithinTripDates(placeContext.trip, todayIso)) {
    return {
      kind: 'trip',
      destination: placeContext.trip.destination,
      startDate: placeContext.trip.startDate,
      endDate: placeContext.trip.endDate,
      offlineDot: offline,
    };
  }

  if (offGridWindow) {
    return { kind: 'offgrid', destination: offGridWindow.destination, expiresAt: offGridWindow.expiresAt };
  }

  if (offline && hasCache === true) {
    return { kind: 'offline' };
  }

  return { kind: 'none' };
}
