/**
 * useTodayScreen — KAN-59
 *
 * ViewModel-layer hook for TodayScreen. Owns all data state, one-shot
 * Firestore fetches, proximity engine wiring, battery monitoring, and the
 * task-toggle callback. No JSX — independently testable with renderHook.
 *
 * Data strategy: one-shot fetch on mount (no real-time subscriptions).
 * Pull-to-refresh or onTaskAdded re-runs the full fetch. Writes update local
 * state immediately and persist to Firestore in the background; on failure,
 * local state reverts.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, InteractionManager, Platform, Vibration } from 'react-native';
import {
  setTaskDone,
  setStoreTuningPref,
  getCategories,
  getTasksForDate,
  getUserPreferences,
  getPoiPreferencesMap,
  getUser,
  getTotalPoints,
} from '../services/firestore';
import { getIncomingSharedTasksCount } from '../services/sharing';
import { evaluateAchievements, checkAndFireAchievementNudge } from '../services/achievements';
import { getActiveChallengesForUser, incrementCompletedCount } from '../services/challenges';
import {
  requestLocationPermission,
  LocationContext,
} from '../services/geolocation';
import {
  PlacesMap,
  runProximitySearch,
  getLastSearchCoords,
  setLocationTap,
  updateNotifNearbyEnabled,
  updateProximityPoiPreferences,
} from '../services/proximity';
import { getDistanceMeters } from '../services/maps';
import {
  startIndoorProximityMonitoring,
  stopIndoorProximityMonitoring,
  updateIndoorTasks,
} from '../services/indoorProximity';
import {
  startIndoorDetection,
  feedLocation,
  stopIndoorDetection,
} from '../services/indoorDetection';
import {
  startStoreTuning,
  onLocationContextChange,
  activateStoreTuning,
  dismissStoreTuning,
} from '../services/storeTuning';
import { updateExitPromptPref } from '../services/proximity';
import { updateIndoorExitPromptPref } from '../services/indoorProximity';
import { getBatteryLevel, useBatteryLevel } from '../services/battery';
import { NearbyPlace } from '../services/maps';
import { syncTasksToWatch } from '../services/wearSync';
import { Category, StoreTuningState, Task } from '../types';
import { todayISO } from '../utils/date';
import { useAppStore } from '../store/appStore';

// ─── Return type ──────────────────────────────────────────────────────────────

export interface TodayScreenState {
  /** Today's tasks. Empty while loading. */
  tasks:            Task[];
  /** True while the initial data fetch is in-flight. */
  isLoading:        boolean;
  /** True while a pull-to-refresh fetch is in-flight. */
  isRefreshing:     boolean;
  /** Non-null when the fetch failed. Cleared on next successful fetch. */
  error:            string | null;
  /** Call to re-run the full data fetch (pull-to-refresh, error retry, or after task creation). */
  refresh:          () => void;
  /** Active nearby POI type from the proximity engine. Null when none nearby. */
  nearbyPoiType:    string | null;
  nearbyPlace:      NearbyPlace | null;
  /** Nearest known place per POI type — drives NearbyCard "Also close" rows. */
  poiPlaces:        PlacesMap;
  storeTuningActive:        boolean;
  showStoreTuningPrompt:    boolean;
  onStoreTuningTurnOn:      () => void;
  onStoreTuningNotNow:      () => void;
  /** Controls the new-task bottom sheet. */
  sheetVisible:     boolean;
  setSheetVisible:  (v: boolean) => void;
  /** Custom categories from Firestore — passed to NewTaskSheet. */
  customCategories: Category[];
  totalTasks:   number;
  doneTasks:    number;
  progress:     number;
  nearbyCount:  number;
  /** Total gamification points for the header badge. */
  totalPoints:  number;
  /** Count of pending shared tasks for the inbox bell badge. */
  inboxCount:   number;
  /** Task-done toggle — updates local state immediately, persists to Firestore. */
  handleToggle: (taskId: string, done: boolean) => Promise<void>;
  /** True when location permission has been granted. */
  permissionGranted: boolean;
  /** Re-runs the proximity search immediately — useful for a manual "refresh location" tap. */
  refreshProximity: () => void;
  /** True when the last proximity search failed because the device GPS toggle is off. */
  locationUnavailable: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DATA_FETCH_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Data fetch timed out')), ms),
    ),
  ]);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTodayScreen(uid: string | undefined): TodayScreenState {

  // ── Task + screen data state ───────────────────────────────────────────────

  const [tasks,           setTasks]           = useState<Task[]>([]);
  const [isLoading,       setIsLoading]       = useState(() => {
    if (!uid) { return false; }
    const { bootData } = useAppStore.getState();
    return !(bootData !== null && bootData.ownerUid === uid);
  });
  const [isRefreshing,    setIsRefreshing]    = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [totalPoints,     setTotalPoints]     = useState(0);
  const [inboxCount,      setInboxCount]      = useState(0);
  const [sheetVisible,    setSheetVisible]    = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Refs so the AppState closure always reads the latest values without
  // needing them as dependencies (which would recreate the listener on every render).
  const permissionGrantedRef = useRef(false);
  const refreshProximityRef  = useRef<() => void>(() => {});
  useEffect(() => { permissionGrantedRef.current = permissionGranted; }, [permissionGranted]);

  // ── Proximity refs — all mutable values as refs so effects never go stale ───

  /** True while a proximity search Promise is in-flight. */
  const isSearchingRef    = useRef(false);
  /** Count of undone POI tasks from the last effect run — detects new tasks. */
  const prevPoiCountRef   = useRef(0);
  /** Keeps the latest tasks available to the interval callback without adding
   *  tasks to the interval effect's dependency array (avoids restart on toggle). */
  const latestTasksRef    = useRef<Task[]>([]);

  // ── Nearby state ───────────────────────────────────────────────────────────

  const [nearbyPoiType,       setNearbyPoiType]       = useState<string | null>(null);
  const [nearbyPlace,         setNearbyPlace]         = useState<NearbyPlace | null>(null);
  const [poiPlaces,           setPoiPlaces]           = useState<PlacesMap>({});
  const [locationUnavailable, setLocationUnavailable] = useState(false);

  // ── Battery level (KAN-52) — read on foreground only; not used for pausing ──

  const hookBatteryLevel = useBatteryLevel();
  const [batteryLevel, setBatteryLevel] = useState(hookBatteryLevel);
  useEffect(() => { setBatteryLevel(hookBatteryLevel); }, [hookBatteryLevel]);
  useEffect(() => {
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

  const [lowBatteryPausePref, setLowBatteryPausePref] = useState(false);

  // ── Store fine tuning (KAN-74 / KAN-75) ────────────────────────────────────

  const [storeTuningEnabled, setStoreTuningEnabled]  = useState<boolean | undefined>(undefined);
  const [storeTuningState,   setStoreTuningState]    = useState<StoreTuningState>('off');
  const [locationContext,    setLocationContext]      = useState<LocationContext>('outdoor');

  const isIndoorMonitoringRef   = useRef(false);
  const stopIndoorMonitoringRef = useRef<(() => void) | null>(null);
  const positionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── One-shot data fetch ────────────────────────────────────────────────────
  //
  // No background watchers. Called once on mount and again on pull-to-refresh,
  // error retry, or when onTaskAdded fires after a new task is created.

  const loadData = useCallback(async (isRefresh: boolean = false) => {
    if (!uid) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    // Fast path — use data pre-loaded by SplashScreen (initial mount only).
    if (!isRefresh) {
      const { bootData, clearBootData } = useAppStore.getState();
      if (bootData && bootData.ownerUid !== uid) {
        clearBootData();
      } else if (bootData) {
        setTasks(bootData.tasks);
        setCustomCategories(bootData.customCategories.filter(c => !c.isBuiltIn));
        setTotalPoints(bootData.totalPoints);
        setInboxCount(bootData.inboxCount);
        if (bootData.userData) {
          setLowBatteryPausePref(bootData.userData.poiPreferences?.lowBatteryPause ?? false);
          setStoreTuningEnabled(bootData.userData.poiPreferences?.storeTuningEnabled);
        }
        updateNotifNearbyEnabled(bootData.userPrefs.notif_nearby_enabled ?? true);
        updateExitPromptPref(bootData.userPrefs.exitPrompt ?? true);
        updateIndoorExitPromptPref(bootData.userPrefs.exitPrompt ?? true);
        updateProximityPoiPreferences(bootData.poiPrefsMap);
        setIsLoading(false);
        clearBootData();
        return;
      }
    }

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [
        fetchedTasks,
        userData,
        userPrefs,
        poiPrefsMap,
        categories,
        points,
        inbox,
      ] = await withTimeout(
        Promise.all([
          getTasksForDate(uid, todayISO()),
          getUser(uid),
          getUserPreferences(uid),
          getPoiPreferencesMap(uid),
          getCategories(uid),
          getTotalPoints(uid),
          getIncomingSharedTasksCount(uid),
        ]),
        DATA_FETCH_TIMEOUT_MS,
      );

      setTasks(fetchedTasks);
      setCustomCategories(categories.filter(c => !c.isBuiltIn));
      setTotalPoints(points);
      setInboxCount(inbox);

      if (userData) {
        setLowBatteryPausePref(userData.poiPreferences?.lowBatteryPause ?? false);
        setStoreTuningEnabled(userData.poiPreferences?.storeTuningEnabled);
      }

      updateNotifNearbyEnabled(userPrefs.notif_nearby_enabled ?? true);
      updateExitPromptPref(userPrefs.exitPrompt ?? true);
      updateIndoorExitPromptPref(userPrefs.exitPrompt ?? true);
      updateProximityPoiPreferences(poiPrefsMap);

    } catch (err) {
      setError('Could not load tasks. Check your connection.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(() => { loadData(true); }, [loadData]);

  // ── Wear OS sync (KAN-35) ──────────────────────────────────────────────────

  useEffect(() => {
    syncTasksToWatch(tasks);
  }, [tasks]);

  // ── Location permission (KAN-53) ──────────────────────────────────────────

  useEffect(() => {
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

  // ── Keep latestTasksRef in sync ────────────────────────────────────────────

  useEffect(() => { latestTasksRef.current = tasks; }, [tasks]);

  // ── Stable onUpdate callback ───────────────────────────────────────────────

  const onNearbyUpdate = useCallback(
    (poiType: string | null, place: import('../services/maps').NearbyPlace | null, allPlaces: PlacesMap) => {
      setNearbyPoiType(poiType);
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
        setNearbyPoiType(null);
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
        const coords = await (await import('../services/geolocation')).getPositionLowAccuracy();
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
          setNearbyPoiType(task?.poi ?? null);
          setNearbyPlace(place);
        },
      );
      isIndoorMonitoringRef.current   = true;
      stopIndoorMonitoringRef.current = stop;
    }

    return () => {
      stopIndoorMonitoringRef.current?.();
      stopIndoorMonitoringRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, permissionGranted, isStoreTuningActive]);

  useEffect(() => {
    if (!isIndoorMonitoringRef.current) { return; }
    updateIndoorTasks(tasks);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  // ── Task toggle (KAN-14 / KAN-31 / KAN-32) ─────────────────────────────────

  const handleToggle = useCallback(async (taskId: string, done: boolean) => {
    if (!uid) { return; }

    Vibration.vibrate(Platform.OS === 'android' ? 18 : 1);

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done } : t));

    try {
      await setTaskDone(uid, taskId, done);

      if (done) {
        const task = tasks.find(t => t.id === taskId);
        const allOthersDone =
          tasks.length > 0 &&
          tasks.filter(t => t.id !== taskId).every(t => t.done);
        const remainingTaskCount = tasks.filter(
          t => t.id !== taskId && !t.done,
        ).length;

        if (task) {
          // Defer achievement + challenge work until after the completion
          // animation / in-flight interactions settle (KAN-157). Previously the
          // heavy Firestore achievements transaction ran concurrently with the
          // completion re-render, saturating the JS thread (10s+ freeze, and a
          // Fabric ShadowTree commit crash). The screen never needs the full
          // achievements here — once the work lands we refresh only the points
          // total for the header badge.
          InteractionManager.runAfterInteractions(() => {
            evaluateAchievements(uid, task, { allTasksDone: allOthersDone, remainingTaskCount, isNearby: !!task.poi && task.poi === nearbyPoiType })
              .then(({ nudgeCandidate }) => {
                if (nudgeCandidate) {
                  checkAndFireAchievementNudge(uid, nudgeCandidate).catch(() => {});
                }
                getTotalPoints(uid).then(setTotalPoints).catch(() => {});
              })
              .catch(() => {});

            getActiveChallengesForUser(uid).then(challenges => {
              challenges.forEach(c =>
                incrementCompletedCount(c.id, uid, c).catch(() => {}),
              );
            }).catch(() => {});
          });
        }
      }
    } catch (err) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: !done } : t));
      console.warn('[useTodayScreen] toggle failed — reverting', err);
    }
  }, [uid, tasks]);

  // ── Store tuning handlers ───────────────────────────────────────────────────

  const onStoreTuningTurnOn = useCallback(() => {
    activateStoreTuning();
    if (uid) {
      setStoreTuningPref(uid, true).catch(() => {});
    }
  }, [uid]);

  const onStoreTuningNotNow = useCallback(() => { dismissStoreTuning(); }, []);

  // ── Manual proximity refresh ────────────────────────────────────────────────

  const refreshProximity = useCallback(() => {
    if (!uid || !permissionGranted || !hasPOITasks) { return; }
    runProximitySearch(uid, latestTasksRef.current, onNearbyUpdate)
      .catch(() => setLocationUnavailable(true));
  }, [uid, permissionGranted, hasPOITasks, onNearbyUpdate]);

  useEffect(() => { refreshProximityRef.current = refreshProximity; }, [refreshProximity]);

  // ── Progress derived values ─────────────────────────────────────────────────

  const totalTasks  = tasks.length;
  const doneTasks   = tasks.filter(t => t.done).length;
  const progress    = totalTasks > 0 ? doneTasks / totalTasks : 0;
  const nearbyCount = tasks.filter(t => t.poi).length;

  // ── Return ──────────────────────────────────────────────────────────────────

  return {
    tasks,
    isLoading,
    isRefreshing,
    error,
    refresh,
    nearbyPoiType,
    nearbyPlace,
    poiPlaces,
    storeTuningActive:     isStoreTuningActive,
    showStoreTuningPrompt: storeTuningState === 'prompt_shown',
    onStoreTuningTurnOn,
    onStoreTuningNotNow,
    sheetVisible,
    setSheetVisible,
    customCategories,
    totalTasks,
    doneTasks,
    progress,
    nearbyCount,
    totalPoints,
    inboxCount,
    handleToggle,
    permissionGranted,
    refreshProximity,
    locationUnavailable,
  };
}
