/**
 * useTripPlanner — KAN-234
 *
 * State/logic for the Trip Planner flow: destination search → optional
 * dates → radius + size estimate → download. No JSX — independently
 * testable, matching the rest of this codebase's screen/hook split.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import '@react-native-firebase/auth';
import {
  searchPlacesAutocomplete,
  getPlaceDetails,
  buildStaticMapPreviewUrl,
} from '../services/maps';
import type { PlaceAutocompleteSuggestion } from '../services/maps';
import { addTrip, getCategories } from '../services/firestore';
import {
  downloadTripArea,
  computeTripExpiresAt,
  estimateTripDownloadBytes,
  TRIP_RADIUS_PRESETS,
} from '../services/tripDownload';
import type { TripRadiusPreset } from '../types';
import { useToastStore } from '../store/toastStore';
import { COPY } from '../constants/copy';

export type TripPlannerStep = 'destination' | 'dates' | 'radius' | 'downloading';

const AUTOCOMPLETE_DEBOUNCE_MS = 300;

/** Static map preview frame size — exported so the screen's circle overlay can size itself to match (see maps.ts's buildStaticMapPreviewUrl, which zooms the map to keep the circle at a fixed fraction of this frame regardless of which radius preset is selected). */
export const TRIP_PREVIEW_WIDTH = 320;
export const TRIP_PREVIEW_HEIGHT = 200;
const PREVIEW_WIDTH = TRIP_PREVIEW_WIDTH;
const PREVIEW_HEIGHT = TRIP_PREVIEW_HEIGHT;

export interface ResolvedDestination {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
}

export interface TripPlannerState {
  step: TripPlannerStep;

  query: string;
  setQuery: (q: string) => void;
  suggestions: PlaceAutocompleteSuggestion[];
  selectDestination: (s: PlaceAutocompleteSuggestion) => Promise<void>;
  destination: ResolvedDestination | null;

  startDate: string | undefined;
  endDate: string | undefined;
  setStartDate: (d: string | undefined) => void;
  setEndDate: (d: string | undefined) => void;
  goToRadius: () => void;
  skipDates: () => void;

  radiusKey: TripRadiusPreset;
  setRadiusKey: (k: TripRadiusPreset) => void;
  estimatedBytes: number;
  previewUrl: string;

  confirmDownload: () => Promise<void>;
  error: string | null;
  goBack: () => void;
}

export function useTripPlanner(onDone: () => void): TripPlannerState {
  const uid = getAuth().currentUser?.uid ?? '';

  const [step, setStep] = useState<TripPlannerStep>('destination');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceAutocompleteSuggestion[]>([]);
  const [destination, setDestination] = useState<ResolvedDestination | null>(null);
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [radiusKey, setRadiusKey] = useState<TripRadiusPreset>('town_and_around');
  const [error, setError] = useState<string | null>(null);
  const [customCategoryPoiTypes, setCustomCategoryPoiTypes] = useState<string[]>([]);

  useEffect(() => {
    if (!uid) { return; }
    getCategories(uid)
      .then(categories => setCustomCategoryPoiTypes(categories.map(c => c.poi).filter((p): p is string => !!p)))
      .catch(err => console.warn('[useTripPlanner] getCategories failed', err));
  }, [uid]);

  // Debounced destination autocomplete.
  useEffect(() => {
    if (destination && query === destination.name) { return; } // just selected — don't immediately re-search
    if (!query.trim()) { setSuggestions([]); return; }

    const timer = setTimeout(() => {
      searchPlacesAutocomplete(query)
        .then(setSuggestions)
        .catch(err => console.warn('[useTripPlanner] searchPlacesAutocomplete failed', err));
    }, AUTOCOMPLETE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const selectDestination = useCallback(async (suggestion: PlaceAutocompleteSuggestion) => {
    setQuery(suggestion.name);
    setSuggestions([]);
    try {
      const details = await getPlaceDetails(suggestion.placeId);
      if (!details) {
        setError(COPY.tripPlanner.downloadErrorToast);
        return;
      }
      setDestination({ placeId: suggestion.placeId, name: details.name, lat: details.lat, lng: details.lng });
      setError(null);
      setStep('dates');
    } catch (err) {
      console.warn('[useTripPlanner] getPlaceDetails failed', err);
      setError(COPY.tripPlanner.downloadErrorToast);
    }
  }, []);

  const goToRadius = useCallback(() => setStep('radius'), []);
  const skipDates = useCallback(() => {
    setStartDate(undefined);
    setEndDate(undefined);
    setStep('radius');
  }, []);

  const preset = TRIP_RADIUS_PRESETS.find(p => p.key === radiusKey) ?? TRIP_RADIUS_PRESETS[1];
  const estimatedBytes = estimateTripDownloadBytes(preset.radiusMeters, customCategoryPoiTypes.length + 16);
  const previewUrl = destination
    ? buildStaticMapPreviewUrl(destination.lat, destination.lng, preset.radiusMeters, PREVIEW_WIDTH, PREVIEW_HEIGHT)
    : '';

  const confirmDownload = useCallback(async () => {
    if (!destination || !uid) { return; }
    setStep('downloading');
    setError(null);

    const cacheAreaId = `ta_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    const expiresAt = computeTripExpiresAt(endDate);

    try {
      await downloadTripArea(
        { lat: destination.lat, lng: destination.lng },
        preset.radiusMeters,
        cacheAreaId,
        expiresAt,
        customCategoryPoiTypes,
      );
      await addTrip(uid, {
        destination: destination.name,
        placeRef: destination.placeId,
        centerLat: destination.lat,
        centerLng: destination.lng,
        startDate,
        endDate,
        areaRadius: preset.radiusMeters,
        cacheAreaId,
        expiresAt,
      });
      useToastStore.getState().showToast(COPY.tripPlanner.downloadSuccessToast(destination.name));
      onDone();
    } catch (err) {
      console.warn('[useTripPlanner] download failed', err);
      setError(COPY.tripPlanner.downloadErrorToast);
      setStep('radius');
    }
  }, [destination, uid, endDate, startDate, preset.radiusMeters, customCategoryPoiTypes, onDone]);

  const goBack = useCallback(() => {
    setError(null);
    setStep(prev => {
      if (prev === 'radius') { return 'dates'; }
      if (prev === 'dates') { return 'destination'; }
      return prev;
    });
  }, []);

  return {
    step,
    query, setQuery, suggestions, selectDestination, destination,
    startDate, endDate, setStartDate, setEndDate, goToRadius, skipDates,
    radiusKey, setRadiusKey, estimatedBytes, previewUrl,
    confirmDownload, error, goBack,
  };
}
