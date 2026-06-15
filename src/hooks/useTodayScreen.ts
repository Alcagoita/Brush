/**
 * useTodayScreen — KAN-59
 *
 * ViewModel-layer hook for TodayScreen. Owns all data state, one-shot
 * Firestore fetches, proximity engine wiring, battery monitoring, and the
 * task-toggle callback. No JSX — independently testable with renderHook.
 *
 * Data strategy: one-shot fetch on mount (no real-time subscriptions).
 * Pull-to-refresh re-runs the fetch. Writes update local state immediately
 * and persist to Firestore in the background; on failure, local state reverts.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, Vibration } from 'react-native';
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
  /** Call to re-run the full data fetch (pull-to-refresh or error retry). */
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
  const [isLoading,       setIsLoading]       = useState(true);
  const [isRefreshing,    setIsRefreshing]    = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [totalPoints,     setTotalPoints]     = useState(0);
  const [inboxCount,      setInboxCount]      = useState(0);
  const [sheetVisible,    setSheetVisible]    = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // ── Proximity refs — all mutable values as refs so effects never go stale ───

  /** True while a proximity search Promise is in-flight. */
  const isSearchingRef    = useRef(false);
  /** Count of undone POI tasks from the last effect run — detects new tasks. */
  const prevPoiCountRef   = useRef(0);
  /** Keeps the latest tasks available to the interval callback without adding
   *  tasks to the interval effect's dependency array (avoids restart on toggle). */
  const latestTasksRef    = useRef<Task[]>([]);

  // ── Nearby state ───────────────────────────────────────────────────────────

  const [nearbyPoiType, setNearbyPoiType] = useState<string | null>(null);
  const [nearbyPlace,   setNearbyPlace]   = useState<NearbyPlace | null>(null);
  const [poiPlaces,     setPoiPlaces]     = useState<PlacesMap>({});

  // ── Battery level (KAN-52) — read on foreground only; not used for pausing ──

  const hookBatteryLevel = useBatteryLevel();
  const [batteryLevel, setBatteryLevel] = useState(hookBatteryLevel);
  useEffect(() => { setBatteryLevel(hookBatteryLevel); }, [hookBatteryLevel]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') { setBatteryLevel(await getBatteryLevel()); }
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
  // Replaces all onSnapshot subscriptions. Called once on mount and again
  // on pull-to-refresh or error retry. No background watchers.

  const loadData = useCallback(async (isRefresh: boolean = false) => {
    if (!uid) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    // Fast path — use data pre-loaded by SplashScreen (initial mount only).
    if (!isRefresh) {
      const { bootData, clearBootData } = useAppStore.getState();
      if (bootData) {
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
  // Stable boolean dep — proximity effect only restarts when this crosses the
  // 0 boundary, not on every task toggle or completion.

  const hasPOITasks = useMemo(
    () => tasks.some(t => !t.done && t.poi),
    [tasks],
  );

  const isStoreTuningActive = storeTuningState === 'active';

  // ── Keep latestTasksRef in sync so the interval always uses fresh tasks ────

  useEffect(() => { latestTasksRef.current = tasks; }, [tasks]);

  // ── Stable onUpdate callback — state setters never change, no deps needed ──

  const onNearbyUpdate = useCallback(
    (poiType: string | null, place: import('../services/maps').NearbyPlace | null, allPlaces: PlacesMap) => {
      setNearbyPoiType(poiType);
      setNearbyPlace(place);
      setPoiPlaces(allPlaces);
    },
    [],
  );

  // ── Outdoor proximity lifecycle (KAN-24 / KAN-53) ─────────────────────────
  //
  // No global service state. All timing (initial search, 3-min poll) is owned
  // here via plain setInterval/clearInterval so cleanup is always exact.
  //
  // Deps: uid + permissionGranted + hasPOITasks + isStoreTuningActive
  // A task toggle that doesn't cross the 0-boundary never restarts this effect.

  useEffect(() => {
    if (!uid || !permissionGranted || !hasPOITasks || isStoreTuningActive) {
      if (!hasPOITasks || isStoreTuningActive) {
        setNearbyPoiType(null);
        setNearbyPlace(null);
        setPoiPlaces({});
      }
      return;
    }

    // Fire the first search immediately (non-blocking — guarded by isSearchingRef).
    runProximitySearch(uid, latestTasksRef.current, onNearbyUpdate).catch(() => {});
    prevPoiCountRef.current = latestTasksRef.current.filter(t => !t.done && t.poi).length;

    // Movement-gated 3-minute position check.
    positionTimerRef.current = setInterval(async () => {
      try {
        const coords = await (await import('../services/geolocation')).getPositionLowAccuracy();
        const last = getLastSearchCoords();
        if (!last) {
          runProximitySearch(uid, latestTasksRef.current, onNearbyUpdate).catch(() => {});
          return;
        }
        const moved = getDistanceMeters(coords.lat, coords.lng, last.lat, last.lng);
        if (moved >= 200) {
          runProximitySearch(uid, latestTasksRef.current, onNearbyUpdate).catch(() => {});
        }
      } catch { /* location unavailable — skip tick */ }
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
  // Separate from the lifecycle effect so that adding a task (which changes
  // tasks but NOT hasPOITasks-boolean if it was already true) still triggers
  // an immediate search.

  useEffect(() => {
    if (!uid || !permissionGranted || !hasPOITasks || isStoreTuningActive) { return; }
    const count = tasks.filter(t => !t.done && t.poi).length;
    if (count > prevPoiCountRef.current) {
      runProximitySearch(uid, tasks, onNearbyUpdate).catch(() => {});
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

  // Sync task list to running indoor engine.
  useEffect(() => {
    if (!isIndoorMonitoringRef.current) { return; }
    updateIndoorTasks(tasks);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  // ── Task toggle (KAN-14 / KAN-31 / KAN-32) ─────────────────────────────────
  //
  // Updates local task state immediately (instant UI feedback), then persists
  // to Firestore. On failure, reverts the local change.

  const handleToggle = useCallback(async (taskId: string, done: boolean) => {
    if (!uid) { return; }

    Vibration.vibrate(Platform.OS === 'android' ? 18 : 1);

    // Instant local update.
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
          evaluateAchievements(uid, task, { allTasksDone: allOthersDone, remainingTaskCount })
            .then(({ nudgeCandidate }) => {
              if (nudgeCandidate) {
                checkAndFireAchievementNudge(uid, nudgeCandidate).catch(() => {});
              }
            })
            .catch(() => {});

          getActiveChallengesForUser(uid).then(challenges => {
            challenges.forEach(c =>
              incrementCompletedCount(c.id, uid, c).catch(() => {}),
            );
          }).catch(() => {});
        }
      }
    } catch (err) {
      // Revert on failure.
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
  };
}
