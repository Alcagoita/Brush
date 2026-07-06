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

export type ContextChipView =
  | { kind: 'mall'; name: string; offlineDot: boolean }
  | { kind: 'trip'; destination: string; startDate?: string; endDate?: string; offlineDot: boolean }
  | { kind: 'offline' }
  | { kind: 'none' };

export interface ResolveContextChipViewInput {
  placeContext: PlaceContext;
  todayIso: string;
  offline: boolean;
  /** Tri-state — null means "not yet checked this offline period" (see useOfflineCoverage). */
  hasCache: boolean | null;
}

/** mall > trip > offline glyph > none. Exactly one kind is ever returned — never two indicators. */
export function resolveContextChipView({
  placeContext, todayIso, offline, hasCache,
}: ResolveContextChipViewInput): ContextChipView {
  if (placeContext?.kind === 'mall') {
    return { kind: 'mall', name: placeContext.snapshot.name, offlineDot: offline };
  }

  if (placeContext?.kind === 'trip' && isTodayWithinTripDates(placeContext.trip, todayIso)) {
    return {
      kind: 'trip',
      destination: placeContext.trip.destination,
      startDate: placeContext.trip.startDate,
      endDate: placeContext.trip.endDate,
      offlineDot: offline,
    };
  }

  if (offline && hasCache === true) {
    return { kind: 'offline' };
  }

  return { kind: 'none' };
}
