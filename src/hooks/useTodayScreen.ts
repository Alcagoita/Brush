/**
 * useTodayScreen — KAN-59
 *
 * ViewModel-layer hook for TodayScreen. Owns all data state, Firestore
 * subscriptions, proximity engine wiring, battery monitoring, and the
 * optimistic task-toggle callback. No JSX — independently testable with
 * renderHook.
 *
 * TodayScreen becomes a pure rendering component: it calls this hook,
 * then renders JSX based on the returned state and callbacks.
 */

import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Vibration } from 'react-native';
import {
  setTaskDone,
  subscribeToCategories,
  subscribeLowBatteryPausePref,
  subscribeToPoiPreferences,
  subscribeToTasksForDate,
} from '../services/firestore';
import { evaluateAchievements } from '../services/achievements';
import { getActiveChallengesForUser, incrementCompletedCount } from '../services/challenges';
import { requestLocationPermission } from '../services/geolocation';
import {
  pauseGeofenceMonitoring,
  PlacesMap,
  resumeGeofenceMonitoring,
  startProximityMonitoring,
  stopProximityMonitoring,
  updateProximityPoiPreferences,
  updateProximityTasks,
} from '../services/proximity';
import { getBatteryLevel, shouldPauseForBattery, useBatteryLevel } from '../services/battery';
import { NearbyPlace } from '../services/maps';
import { syncTasksToWatch } from '../services/wearSync';
import { Category, Task, TasksUiState } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Return type ──────────────────────────────────────────────────────────────

export interface TodayScreenState {
  /** UiState for today's task list — loading / success / error (KAN-57). */
  tasksState:       TasksUiState;
  /**
   * Incremented by the "Try again" button to re-trigger the subscription
   * without unmounting the screen (KAN-58).
   */
  retryKey:         number;
  setRetryKey:      Dispatch<SetStateAction<number>>;
  /** Active nearby POI type from the proximity engine. Null when none nearby. */
  nearbyPoiType:    string | null;
  nearbyPlace:      NearbyPlace | null;
  /** All known nearest places per POI type — drives NearbyCard idle rows. */
  poiPlaces:        PlacesMap;
  /** True when low-battery mode is active and geofence monitoring is paused (KAN-52). */
  trackingPaused:   boolean;
  /** Controls the new-task bottom sheet. */
  sheetVisible:     boolean;
  setSheetVisible:  Dispatch<SetStateAction<boolean>>;
  /** Custom categories from Firestore — passed to NewTaskSheet. */
  customCategories: Category[];
  /**
   * Today's tasks as stored in Firestore.
   * Falls back to [] when tasksState is loading or error so downstream
   * logic never has to null-check.
   */
  tasks:            Task[];
  /**
   * Tasks with optimistic done-state applied. Used everywhere the screen
   * needs to reflect an in-flight toggle instantly.
   */
  effectiveTasks:   Task[];
  totalTasks:   number;
  doneTasks:    number;
  progress:     number;
  nearbyCount:  number;
  /** Optimistic task-done toggle with haptic feedback (KAN-14 / KAN-31 / KAN-32). */
  handleToggle: (taskId: string, done: boolean) => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param uid Firebase user ID. Pass `undefined` when the user is signed out —
 *            the hook will surface an empty success state immediately.
 */
export function useTodayScreen(uid: string | undefined): TodayScreenState {

  // ── Primary data state ─────────────────────────────────────────────────────

  const [tasksState,        setTasksState]        = useState<TasksUiState>({ status: 'loading' });
  const [retryKey,          setRetryKey]          = useState(0);
  const [nearbyPoiType,     setNearbyPoiType]     = useState<string | null>(null);
  const [nearbyPlace,       setNearbyPlace]       = useState<NearbyPlace | null>(null);
  const [poiPlaces,         setPoiPlaces]         = useState<PlacesMap>({});
  const [optimisticDone,    setOptimisticDone]    = useState<Record<string, boolean>>({});
  const [sheetVisible,      setSheetVisible]      = useState(false);
  const [customCategories,  setCustomCategories]  = useState<Category[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // ── Proximity engine refs (KAN-53) ──────────────────────────────────────────

  const isMonitoringRef   = useRef(false);
  const stopMonitoringRef = useRef<(() => void) | null>(null);

  // ── Battery / low-battery pause (KAN-52) ───────────────────────────────────

  const hookBatteryLevel = useBatteryLevel();
  const [batteryLevel, setBatteryLevel] = useState(hookBatteryLevel);

  // Sync hook (event-driven path) into local state.
  useEffect(() => { setBatteryLevel(hookBatteryLevel); }, [hookBatteryLevel]);

  // Re-read on app foreground — belt-and-suspenders per KAN-52 spec.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') { setBatteryLevel(await getBatteryLevel()); }
    });
    return () => sub.remove();
  }, []);

  const [lowBatteryPausePref, setLowBatteryPausePref] = useState(false);
  useEffect(() => {
    if (!uid) { return; }
    return subscribeLowBatteryPausePref(uid, setLowBatteryPausePref, (err) => {
      console.warn('[useTodayScreen] lowBatteryPausePref error', err);
    });
  }, [uid]);

  const trackingPaused = shouldPauseForBattery(batteryLevel, lowBatteryPausePref);
  useEffect(() => {
    if (trackingPaused) { pauseGeofenceMonitoring(); }
    else                { resumeGeofenceMonitoring(); }
  }, [trackingPaused]);

  // ── Task subscription (KAN-57 / KAN-58) ────────────────────────────────────

  useEffect(() => {
    if (!uid) {
      // Signed-out: surface empty success so the screen doesn't spin indefinitely.
      setTasksState({ status: 'success', tasks: [] });
      return;
    }
    setTasksState({ status: 'loading' });
    return subscribeToTasksForDate(uid, todayISO(), (newTasks) => {
      setTasksState({ status: 'success', tasks: newTasks });
    }, (err) => {
      console.warn('[useTodayScreen] tasks subscription error', err);
      setTasksState({ status: 'error', message: 'Could not load tasks. Check your connection.' });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, retryKey]);

  // ── Wear OS sync (KAN-35) ──────────────────────────────────────────────────
  // Push the task list to the watch each time it updates. No-ops on iOS or
  // when the native module is unavailable.

  useEffect(() => {
    syncTasksToWatch(tasks);
  }, [tasks]);

  // ── Custom categories subscription ─────────────────────────────────────────

  useEffect(() => {
    if (!uid) { return; }
    return subscribeToCategories(uid, cats => {
      setCustomCategories(cats.filter(c => !c.isBuiltIn));
    }, (err) => {
      console.warn('[useTodayScreen] categories subscription error', err);
    });
  }, [uid]);

  // ── Derived task arrays ─────────────────────────────────────────────────────

  const tasks = tasksState.status === 'success' ? tasksState.tasks : [];

  const effectiveTasks = tasks.map(t => ({
    ...t,
    done: optimisticDone[t.id] ?? t.done,
  }));

  // ── POI radius preferences (KAN-25) ────────────────────────────────────────

  useEffect(() => {
    if (!uid) { return; }
    return subscribeToPoiPreferences(uid, prefs => {
      updateProximityPoiPreferences(prefs);
    }, (err) => {
      console.warn('[useTodayScreen] poiPreferences subscription error', err);
    });
  }, [uid]);

  // ── Location permission (KAN-53) ─────────────────────────────────────────────

  useEffect(() => {
    if (!uid) { return; }
    requestLocationPermission().then(status => {
      if (status === 'granted') { setPermissionGranted(true); }
    }).catch(err => {
      console.warn('[useTodayScreen] location permission error', err);
    });
  }, [uid]);

  // ── Proximity engine management (KAN-24 / KAN-53) ──────────────────────────
  //
  //   Gate:  0 undone POI tasks && not monitoring → stay idle
  //   Start: >0 undone POI tasks && not monitoring → start engine
  //   Stop:  0 undone POI tasks  && monitoring     → stop engine
  //   Sync:  >0 undone POI tasks && monitoring     → push task list

  useEffect(() => {
    if (!uid || !permissionGranted) { return; }

    const activePoiCount = effectiveTasks.filter(t => !t.done && t.poi).length;

    if (activePoiCount > 0 && !isMonitoringRef.current) {
      const stop = startProximityMonitoring(
        uid,
        effectiveTasks,
        (poiType, place, allPlaces) => {
          setNearbyPoiType(poiType);
          setNearbyPlace(place);
          setPoiPlaces(allPlaces);
        },
      );
      isMonitoringRef.current   = true;
      stopMonitoringRef.current = stop;
    } else if (activePoiCount === 0 && isMonitoringRef.current) {
      stopMonitoringRef.current?.();
      stopMonitoringRef.current = null;
      stopProximityMonitoring();
      isMonitoringRef.current = false;
      setNearbyPoiType(null);
      setNearbyPlace(null);
    } else {
      updateProximityTasks(effectiveTasks);
    }

    return () => {
      stopMonitoringRef.current?.();
      stopMonitoringRef.current = null;
    };
  }, [effectiveTasks, uid, permissionGranted]);

  // ── Optimistic toggle (KAN-14 / KAN-31 / KAN-32) ───────────────────────────

  const handleToggle = useCallback(async (taskId: string, done: boolean) => {
    if (!uid) { return; }

    setOptimisticDone(prev => ({ ...prev, [taskId]: done }));
    Vibration.vibrate(Platform.OS === 'android' ? 18 : 1);

    try {
      await setTaskDone(uid, taskId, done);

      if (done) {
        const task = tasks.find(t => t.id === taskId);

        const allOthersDone =
          tasks.length > 0 &&
          tasks.filter(t => t.id !== taskId).every(t => optimisticDone[t.id] ?? t.done);

        if (task) {
          // KAN-129: evaluate achievements (replaces per-task awardPoint call).
          evaluateAchievements(uid, task, { allTasksDone: allOthersDone }).catch(err =>
            console.warn('[useTodayScreen] evaluateAchievements failed (non-critical)', err),
          );

          // KAN-103: increment progress on all active challenges (fire-and-forget).
          getActiveChallengesForUser(uid).then(challenges => {
            challenges.forEach(c =>
              incrementCompletedCount(c.id, uid, c).catch(err =>
                console.warn('[useTodayScreen] challenge increment failed', err),
              ),
            );
          }).catch(() => {});
        }
      }
      // KAN-129: un-completing a task no longer revokes points — points are
      // only awarded via achievement unlocks and are permanent once earned.
    } catch (err) {
      console.warn('[useTodayScreen] toggle failed — reverting', err);
    } finally {
      setOptimisticDone(prev => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    }
  }, [uid, tasks, optimisticDone]);

  // ── Progress derived values ─────────────────────────────────────────────────

  const totalTasks  = effectiveTasks.length;
  const doneTasks   = effectiveTasks.filter(t => t.done).length;
  const progress    = totalTasks > 0 ? doneTasks / totalTasks : 0;
  const nearbyCount = effectiveTasks.filter(t => t.poi).length;

  // ── Return ──────────────────────────────────────────────────────────────────

  return {
    tasksState,
    retryKey,
    setRetryKey,
    nearbyPoiType,
    nearbyPlace,
    poiPlaces,
    trackingPaused,
    sheetVisible,
    setSheetVisible,
    customCategories,
    tasks,
    effectiveTasks,
    totalTasks,
    doneTasks,
    progress,
    nearbyCount,
    handleToggle,
  };
}
