/**
 * useWhereWeveBeen — KAN-257
 *
 * "Where we've been" timeline: every past, non-off-grid trip, grouped by
 * year (most recent year first, trips within a year most-recent-first).
 * Only destination + dates are shown — no place data, no re-download
 * action, matching the ticket's privacy-positive framing (the detail is
 * genuinely gone; the memory remains). No JSX — independently testable.
 */

import { useCallback, useEffect, useState } from 'react';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import '@react-native-firebase/auth';
import { getTrips, deleteTrip as deleteTripDoc } from '../services/firestore';
import { deleteTripAreaPlaces } from '../services/habitatCache';
import { isTripPast } from '../utils/contextChip';
import { todayISO } from '../utils/date';
import type { Trip } from '../types';

export interface TripYearGroup {
  year: string;
  trips: Trip[];
}

export interface WhereWeveBeenState {
  loading: boolean;
  yearGroups: TripYearGroup[];
  forgetTrip: (trip: Trip) => Promise<void>;
}

/** Groups past trips by the year of their endDate, most recent year and most recent trip first. Trips without an endDate are dropped — nothing to group them by. */
export function groupTripsByYear(trips: Trip[]): TripYearGroup[] {
  const byYear = new Map<string, Trip[]>();
  for (const trip of trips) {
    if (!trip.endDate) { continue; }
    const year = trip.endDate.slice(0, 4);
    if (!byYear.has(year)) { byYear.set(year, []); }
    byYear.get(year)!.push(trip);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, yearTrips]) => ({
      year,
      trips: [...yearTrips].sort((a, b) => b.endDate!.localeCompare(a.endDate!)),
    }));
}

export function useWhereWeveBeen(): WhereWeveBeenState {
  const uid = getAuth().currentUser?.uid ?? '';

  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);

  const refresh = useCallback(async () => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    try {
      const today = todayISO();
      const fetched = await getTrips(uid);
      setTrips(fetched.filter(t => t.kind !== 'offgrid' && isTripPast(t, today)));
    } catch (err) {
      console.warn('[useWhereWeveBeen] refresh failed', err);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { void refresh(); }, [refresh]);

  const forgetTrip = useCallback(async (trip: Trip) => {
    if (!uid) { return; }
    try {
      await deleteTripDoc(uid, trip.id);
      deleteTripAreaPlaces(trip.cacheAreaId); // sync, never throws — see habitatCache.ts
      setTrips(prev => prev.filter(t => t.id !== trip.id));
    } catch (err) {
      console.warn('[useWhereWeveBeen] forgetTrip failed', err);
    }
  }, [uid]);

  return { loading, yearGroups: groupTripsByYear(trips), forgetTrip };
}
