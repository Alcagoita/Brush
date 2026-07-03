/**
 * useProximityEngine — KAN-59 / KAN-214
 *
 * Owns every location-driven engine on the Today screen: location permission,
 * battery-aware refresh on foreground, outdoor proximity search (KAN-24/53),
 * indoor detection + Store fine tuning (KAN-73/74/75), and the resulting
 * "nearby" state (poiType/place/places) that either engine may produce.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { setStoreTuningPref } from '../../services/firestore';
import { requestLocationPermission } from '../../services/geolocation';
import type { LocationContext } from '../../services/geolocation';
import {
  runProximitySearch,
  getLastSearchCoords,
  setLocationTap,
} from '../../services/proximity';
import type { PlacesMap } from '../../services/proximity';
import { getDistanceMeters } from '../../services/maps';
import type { NearbyPlace } from '../../services/maps';
import {
  startIndoorProximityMonitoring,
  stopIndoorProximityMonitoring,
  updateIndoorTasks,
} from '../../services/indoorProximity';
import { startIndoorDetection, feedLocation } from '../../services/indoorDetection';
import {
  startStoreTuning,
  onLocationContextChange,
  activateStoreTuning,
  dismissStoreTuning,
} from '../../services/storeTuning';
import { getBatteryLevel, useBatteryLevel } from '../../services/battery';
import type { StoreTuningState, Task } from '../../types';
import { DEBUG_DISABLE_BACKGROUND } from './debugFlags';

export interface ProximityEngine {
  permissionGranted:  boolean;
  nearbyPoiType:      string | null;
  /** Mirror of nearbyPoiType for stable callbacks (e.g. useTaskCompletion). */
  nearbyPoiTypeRef:   React.RefObject<string | null>;
  nearbyPlace:        NearbyPlace | null;
  /** Mirror of nearbyPlace for stable callbacks (e.g. useTaskCompletion, KAN-226). */
  nearbyPlaceRef:     React.RefObject<NearbyPlace | null>;
  poiPlaces:          PlacesMap;
  locationUnavailable: boolean;
  storeTuningActive:      boolean;
  showStoreTuningPrompt:  boolean;
  onStoreTuningTurnOn:    () => void;
  onStoreTuningNotNow:    () => void;
  refreshProximity:   () => Promise<boolean>;
}

export function useProximityEngine(
  uid: string | undefined,
  tasks: Task[],
  latestTasksRef: React.RefObject<Task[]>,
  lowBatteryPausePref: boolean,
  storeTuningEnabled: boolean | undefined,
): ProximityEngine {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const permissionGrantedRef = useRef(false);
  const refreshProximityRef  = useRef<() => void>(() => {});
  useEffect(() => { permissionGrantedRef.current = permissionGranted; }, [permissionGranted]);

  /** True while a proximity search Promise is in-flight. */
  const isSearchingRef    = useRef(false);
  /** Count of undone POI tasks from the last effect run — detects new tasks. */
  const prevPoiCountRef   = useRef(0);

  const [nearbyPoiType,       setNearbyPoiType]       = useState<string | null>(null);
  const nearbyPoiTypeRef = useRef<string | null>(null);
  const [nearbyPlace,         setNearbyPlace]         = useState<NearbyPlace | null>(null);
  const nearbyPlaceRef = useRef<NearbyPlace | null>(null);
  const [poiPlaces,           setPoiPlaces]           = useState<PlacesMap>({});
  const [locationUnavailable, setLocationUnavailable] = useState(false);

  // ── Battery level (KAN-52) — read on foreground only; not used for pausing ──

  const hookBatteryLevel = useBatteryLevel();
  const [batteryLevel, setBatteryLevel] = useState(hookBatteryLevel);
  useEffect(() => { setBatteryLevel(hookBatteryLevel); }, [hookBatteryLevel]);
  useEffect(() => {
    if (DEBUG_DISABLE_BACKGROUND) { return; }
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') {
        setBatteryLevel(await getBatteryLevel());
        if (permissionGrantedRef.current) {
          // User may have toggled GPS back on — re-run immediately rather than
          // waiting for the next 3-minute interval tick.
          refreshProximityRef.current();
        } else {
          // Re-check in case the user granted permission in Settings while away.
          requestLocationPermission()
            .then(status => { if (status === 'granted') { setPermissionGranted(true); } })
            .catch(() => {});
        }
      }
    });
    return () => sub.remove();
  }, []);

  // ── Store fine tuning (KAN-74 / KAN-75) ────────────────────────────────────

  const [storeTuningState,   setStoreTuningState]    = useState<StoreTuningState>('off');
  const [locationContext,    setLocationContext]      = useState<LocationContext>('outdoor');

  const isIndoorMonitoringRef   = useRef(false);
  const stopIndoorMonitoringRef = useRef<(() => void) | null>(null);
  const positionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Location permission (KAN-53) ──────────────────────────────────────────

  useEffect(() => {
    if (DEBUG_DISABLE_BACKGROUND) { return; }
    if (!uid) { return; }
    requestLocationPermission().then(status => {
      if (status === 'granted') { setPermissionGranted(true); }
    }).catch(err => {
      console.warn('[useTodayScreen] location permission error', err);
    });
  }, [uid]);

  // ── Indoor detection + store tuning (KAN-73 / KAN-74) ─────────────────────

  useEffect(() => {
    if (!uid || !permissionGranted) { return; }

    const stopDetection = startIndoorDetection((ctx) => {
      setLocationContext(ctx);
    });

    const stopTuning = startStoreTuning({
      onStateChange: setStoreTuningState,
      onLowBatterySuppress: () => {},
    });

    setLocationTap((lat, lng, accuracy) => { feedLocation(lat, lng, accuracy); });

    return () => {
      setLocationTap(null);
      stopTuning();
      stopDetection();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, permissionGranted]);

  useEffect(() => {
    if (!uid || !permissionGranted) { return; }
    onLocationContextChange(
      locationContext,
      storeTuningEnabled,
      lowBatteryPausePref,
      batteryLevel,
    );
  }, [uid, permissionGranted, locationContext, storeTuningEnabled, lowBatteryPausePref, batteryLevel]);

  // ── Derived: are there any undone POI tasks? ───────────────────────────────

  const hasPOITasks = useMemo(
    () => tasks.some(t => !t.done && t.poi),
    [tasks],
  );

  const isStoreTuningActive = storeTuningState === 'active';

  // ── Stable onUpdate callback ───────────────────────────────────────────────

  const onNearbyUpdate = useCallback(
    (poiType: string | null, place: NearbyPlace | null, allPlaces: PlacesMap) => {
      nearbyPoiTypeRef.current = poiType;
      setNearbyPoiType(poiType);
      nearbyPlaceRef.current = place;
      setNearbyPlace(place);
      setPoiPlaces(allPlaces);
      setLocationUnavailable(false);
    },
    [],
  );

  // ── Outdoor proximity lifecycle (KAN-24 / KAN-53) ─────────────────────────

  useEffect(() => {
    if (!uid || !permissionGranted || !hasPOITasks || isStoreTuningActive) {
      if (!hasPOITasks || isStoreTuningActive) {
        nearbyPoiTypeRef.current = null;
        setNearbyPoiType(null);
        nearbyPlaceRef.current = null;
        setNearbyPlace(null);
        setPoiPlaces({});
      }
      return;
    }

    const onSearchError = () => setLocationUnavailable(true);

    runProximitySearch(uid, latestTasksRef.current, onNearbyUpdate).catch(onSearchError);
    prevPoiCountRef.current = latestTasksRef.current.filter(t => !t.done && t.poi).length;

    positionTimerRef.current = setInterval(async () => {
      try {
        const coords = await (await import('../../services/geolocation')).getPositionLowAccuracy();
        const last = getLastSearchCoords();
        if (!last) {
          runProximitySearch(uid, latestTasksRef.current, onNearbyUpdate).catch(onSearchError);
          return;
        }
        const moved = getDistanceMeters(coords.lat, coords.lng, last.lat, last.lng);
        if (moved >= 200) {
          runProximitySearch(uid, latestTasksRef.current, onNearbyUpdate).catch(onSearchError);
        }
      } catch { setLocationUnavailable(true); }
    }, 3 * 60 * 1_000);

    return () => {
      if (positionTimerRef.current) {
        clearInterval(positionTimerRef.current);
        positionTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, permissionGranted, hasPOITasks, isStoreTuningActive, onNearbyUpdate]);

  // ── Re-search when a new POI task is added ─────────────────────────────────
  //
  // tasks changes when refresh() re-fetches after onTaskAdded. This effect
  // fires an immediate proximity search when the undone POI count increases.

  useEffect(() => {
    if (!uid || !permissionGranted || !hasPOITasks || isStoreTuningActive) { return; }
    const count = tasks.filter(t => !t.done && t.poi).length;
    if (count > prevPoiCountRef.current) {
      runProximitySearch(uid, tasks, onNearbyUpdate).catch(() => setLocationUnavailable(true));
    }
    prevPoiCountRef.current = count;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  // ── Indoor proximity engine lifecycle (KAN-75) ─────────────────────────────

  useEffect(() => {
    if (!uid || !permissionGranted) { return; }

    if (!isStoreTuningActive) {
      if (isIndoorMonitoringRef.current) {
        stopIndoorMonitoringRef.current?.();
        stopIndoorMonitoringRef.current = null;
        stopIndoorProximityMonitoring();
        isIndoorMonitoringRef.current = false;
      }
      return;
    }

    if (!isIndoorMonitoringRef.current) {
      const stop = startIndoorProximityMonitoring(
        uid,
        tasks,
        (task, place) => {
          nearbyPoiTypeRef.current = task?.poi ?? null;
          setNearbyPoiType(task?.poi ?? null);
          nearbyPlaceRef.current = place;
          setNearbyPlace(place);
          // Populate poiPlaces so NearbyCard heroEntries computation can find
          // the indoor match (it derives hero cards from poiPlaces, not nearbyPlace).
          setPoiPlaces(task?.poi && place ? { [task.poi]: [place] } : {});
        },
      );
      isIndoorMonitoringRef.current   = true;
      stopIndoorMonitoringRef.current = stop;
    }

    return () => {
      stopIndoorMonitoringRef.current?.();
      stopIndoorMonitoringRef.current = null;
      isIndoorMonitoringRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, permissionGranted, isStoreTuningActive]);

  useEffect(() => {
    if (!isIndoorMonitoringRef.current) { return; }
    updateIndoorTasks(tasks);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  // ── Store tuning handlers ───────────────────────────────────────────────────

  const onStoreTuningTurnOn = useCallback(() => {
    activateStoreTuning();
    if (uid) {
      setStoreTuningPref(uid, true).catch(() => {});
    }
  }, [uid]);

  const onStoreTuningNotNow = useCallback(() => { dismissStoreTuning(); }, []);

  // ── Manual proximity refresh ────────────────────────────────────────────────

  const refreshProximity = useCallback(async (): Promise<boolean> => {
    if (!uid || !permissionGranted || !hasPOITasks || isStoreTuningActive) { return false; }
    try {
      await runProximitySearch(uid, latestTasksRef.current, onNearbyUpdate);
      return true;
    } catch {
      setLocationUnavailable(true);
      return false;
    }
  }, [uid, permissionGranted, hasPOITasks, isStoreTuningActive, onNearbyUpdate]);

  useEffect(() => { refreshProximityRef.current = refreshProximity; }, [refreshProximity]);

  return {
    permissionGranted,
    nearbyPoiType,
    nearbyPoiTypeRef,
    nearbyPlace,
    nearbyPlaceRef,
    poiPlaces,
    locationUnavailable,
    storeTuningActive: isStoreTuningActive,
    showStoreTuningPrompt: storeTuningState === 'prompt_shown',
    onStoreTuningTurnOn,
    onStoreTuningNotNow,
    refreshProximity,
  };
}
