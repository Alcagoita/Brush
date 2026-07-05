/**
 * usePlacesIKnow — KAN-234
 *
 * "Places I know" list: the always-on habitat area + every downloaded
 * trip, each refreshable/deletable. No JSX — independently testable.
 */

import { useCallback, useEffect, useState } from 'react';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import '@react-native-firebase/auth';
import { getTrips, deleteTrip as deleteTripDoc, getCategories } from '../services/firestore';
import { estimateHabitatAreaSizeBytes, deleteTripAreaPlaces } from '../services/habitatCache';
import { refreshTripArea } from '../services/tripDownload';
import type { Trip } from '../types';

export interface PlacesIKnowState {
  loading: boolean;
  habitatSizeBytes: number;
  trips: Trip[];
  refresh: () => Promise<void>;
  refreshingTripId: string | null;
  refreshTrip: (trip: Trip) => Promise<void>;
  deleteTrip: (trip: Trip) => Promise<void>;
}

export function usePlacesIKnow(): PlacesIKnowState {
  const uid = getAuth().currentUser?.uid ?? '';

  const [loading, setLoading] = useState(true);
  const [habitatSizeBytes, setHabitatSizeBytes] = useState(0);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [refreshingTripId, setRefreshingTripId] = useState<string | null>(null);
  const [customCategoryPoiTypes, setCustomCategoryPoiTypes] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    try {
      const [fetchedTrips, categories] = await Promise.all([getTrips(uid), getCategories(uid)]);
      setTrips(fetchedTrips);
      setCustomCategoryPoiTypes(categories.map(c => c.poi).filter((p): p is string => !!p));
      setHabitatSizeBytes(estimateHabitatAreaSizeBytes());
    } catch (err) {
      console.warn('[usePlacesIKnow] refresh failed', err);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { void refresh(); }, [refresh]);

  const refreshTrip = useCallback(async (trip: Trip) => {
    setRefreshingTripId(trip.id);
    try {
      await refreshTripArea(uid, trip, customCategoryPoiTypes);
      await refresh();
    } catch (err) {
      console.warn('[usePlacesIKnow] refreshTrip failed', err);
    } finally {
      setRefreshingTripId(null);
    }
  }, [uid, customCategoryPoiTypes, refresh]);

  const deleteTrip = useCallback(async (trip: Trip) => {
    try {
      await deleteTripDoc(uid, trip.id);
      deleteTripAreaPlaces(trip.cacheAreaId);
      setTrips(prev => prev.filter(t => t.id !== trip.id));
    } catch (err) {
      console.warn('[usePlacesIKnow] deleteTrip failed', err);
    }
  }, [uid]);

  return { loading, habitatSizeBytes, trips, refresh, refreshingTripId, refreshTrip, deleteTrip };
}
