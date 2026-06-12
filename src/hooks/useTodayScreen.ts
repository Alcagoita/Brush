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
  subscribeStoreTuningPref,
  setStoreTuningPref,
  subscribeToPoiPreferences,
  subscribeToTasksForDate,
} from '../services/firestore';
import { evaluateAchievements, checkAndFireAchievementNudge } from '../services/achievements';
import { getActiveChallengesForUser, incrementCompletedCount } from '../services/challenges';
import {
  requestLocationPermission,
  LocationContext,
} from '../services/geolocation';
import {
  pauseGeofenceMonitoring,
  PlacesMap,
  resumeGeofenceMonitoring,
  setLocationTap,
  startProximityMonitoring,
  stopProximityMonitoring,
  updateProximityPoiPreferences,
  updateProximityTasks,
} from '../services/proximity';
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
import { getBatteryLevel, shouldPauseForBattery, useBatteryLevel } from '../services/battery';
import { NearbyPlace } from '../services/maps';
import { syncTasksToWatch } from '../services/wearSync';
import { Category, StoreTuningState, Task, TasksUiState } from '../types';
import { todayISO } from '../utils/date';

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
  /**
   * True when Store fine tuning is active (KAN-74 / KAN-75).
   * Drives the "Store tuning on" badge in NearbyCard.
   */
  storeTuningActive:        boolean;
  /**
   * True when the Store fine tuning opt-in prompt should be visible (KAN-75).
   * The prompt fires once per session when indoor_mapped is detected.
   */
  showStoreTuningPrompt:    boolean;
  /** Call when the user taps "Turn on" in the StoreTuningPromptSheet. */
  onStoreTuningTurnOn:      () => void;
  /** Call when the user taps "Not now" in the StoreTuningPromptSheet. */
  onStoreTuningNotNow:      () => void;
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

  // ── Store fine tuning (KAN-74 / KAN-75) ────────────────────────────────────

  const [storeTuningEnabled,  setStoreTuningEnabled]  = useState<boolean | undefined>(undefined);
  const [storeTuningState,    setStoreTuningState]     = useState<StoreTuningState>('off');
  const [locationContext,     setLocationContext]       = useState<LocationContext>('outdoor');

  // Refs for indoor engine lifecycle
  const isIndoorMonitoringRef   = useRef(false);
  const stopIndoorMonitoringRef = useRef<(() => void) | null>(null);

  // Subscribe to the Firestore store tuning preference.
  useEffect(() => {
    if (!uid) { return; }
    return subscribeStoreTuningPref(uid, setStoreTuningEnabled, (err) => {
      console.warn('[useTodayScreen] storeTuningPref error', err);
    });
  }, [uid]);

  // Start the indoor detection service (KAN-73) and store tuning state machine
  // (KAN-74) when the user grants location permission.
  useEffect(() => {
    if (!uid || !permissionGranted) { return; }

    // Indoor detection: receives location feeds and fires onContextChange.
    const stopDetection = startIndoorDetection((ctx) => {
      setLocationContext(ctx);
    });

    // Store tuning state machine: listens to context changes.
    const stopTuning = startStoreTuning({
      onStateChange:       setStoreTuningState,
      onLowBatterySuppress: () => {
        // Low-battery suppression — toast not yet wired in v0.7; no-op here.
        console.log('[useTodayScreen] store tuning suppressed — low battery');
      },
    });

    // While the outdoor engine is running, tap its GPS stream and feed indoor
    // detection (KAN-75). The tap is cleared automatically when the outdoor
    // engine stops.
    setLocationTap((lat, lng, accuracy) => {
      feedLocation(lat, lng, accuracy);
    });

    return () => {
      setLocationTap(null);
      stopTuning();
      stopDetection();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, permissionGranted]);

  // Propagate context changes to the store tuning state machine.
  // All inputs are explicit so the machine stays in sync on every render.
  useEffect(() => {
    if (!uid || !permissionGranted) { return; }
    onLocationContextChange(
      locationContext,
      storeTuningEnabled,
      lowBatteryPausePref,
      batteryLevel,
    );
  }, [uid, permissionGranted, locationContext, storeTuningEnabled, lowBatteryPausePref, batteryLevel]);

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

  const effectiveTasks = tasks
    .map(t => ({ ...t, done: optimisticDone[t.id] ?? t.done }))
    .sort((a, b) => {
      // Done tasks sink to the bottom; within each group original order is preserved
      if (a.done === b.done) { return 0; }
      return a.done ? 1 : -1;
    });

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

  // ── Outdoor proximity engine management (KAN-24 / KAN-53) ────────────────
  //
  // The outdoor engine runs ONLY when Store fine tuning is NOT active.
  // When storeTuningState === 'active', the indoor engine takes over and the
  // outdoor engine must be fully stopped (mutual exclusion — KAN-75 spec).
  //
  //   Gate:  store tuning active → stop outdoor engine, stay stopped
  //   Gate:  0 undone POI tasks && not monitoring → stay idle
  //   Start: >0 undone POI tasks && not monitoring → start engine
  //   Stop:  0 undone POI tasks  && monitoring     → stop engine
  //   Sync:  >0 undone POI tasks && monitoring     → push task list

  const isStoreTuningActive = storeTuningState === 'active';

  useEffect(() => {
    if (!uid || !permissionGranted) { return; }

    // Outdoor engine must NOT run while indoor engine is active.
    if (isStoreTuningActive) {
      if (isMonitoringRef.current) {
        stopMonitoringRef.current?.();
        stopMonitoringRef.current = null;
        stopProximityMonitoring();
        isMonitoringRef.current = false;
        setNearbyPoiType(null);
        setNearbyPlace(null);
      }
      return;
    }

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
  }, [effectiveTasks, uid, permissionGranted, isStoreTuningActive]);

  // ── Indoor proximity engine management (KAN-75) ────────────────────────────
  //
  // Runs ONLY when storeTuningState === 'active'.
  // Started when store tuning activates; stopped when it deactivates.
  // Task list is kept in sync via updateIndoorTasks() while active.

  useEffect(() => {
    if (!uid || !permissionGranted) { return; }

    if (!isStoreTuningActive) {
      // Indoor engine should not be running — stop it if it somehow is.
      if (isIndoorMonitoringRef.current) {
        stopIndoorMonitoringRef.current?.();
        stopIndoorMonitoringRef.current = null;
        stopIndoorProximityMonitoring();
        isIndoorMonitoringRef.current = false;
      }
      return;
    }

    // Store tuning is active — start the indoor engine if not already running.
    if (!isIndoorMonitoringRef.current) {
      const stop = startIndoorProximityMonitoring(
        uid,
        effectiveTasks,
        (task, place) => {
          // Indoor engine reports the matched task / place pair.
          // Map to the same nearbyPoiType / nearbyPlace fields so NearbyCard
          // can render it without knowing which engine is active.
          setNearbyPoiType(task?.poi ?? null);
          setNearbyPlace(place);
        },
      );
      isIndoorMonitoringRef.current   = true;
      stopIndoorMonitoringRef.current = stop;
    } else {
      // Already running — push updated task list.
      updateIndoorTasks(effectiveTasks);
    }

    return () => {
      stopIndoorMonitoringRef.current?.();
      stopIndoorMonitoringRef.current = null;
    };
  }, [effectiveTasks, uid, permissionGranted, isStoreTuningActive]);

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
          // KAN-122: evaluateAchievements returns a nudge candidate when an
          // achievement is 1 away — fire the nudge notification if eligible.
          const remainingTaskCount = tasks.filter(
            t => t.id !== taskId && !(optimisticDone[t.id] ?? t.done),
          ).length;

          evaluateAchievements(uid, task, { allTasksDone: allOthersDone, remainingTaskCount })
            .then(({ nudgeCandidate }) => {
              if (nudgeCandidate) {
                checkAndFireAchievementNudge(uid, nudgeCandidate).catch(err =>
                  console.warn('[useTodayScreen] achievement nudge failed (non-critical)', err),
                );
              }
            })
            .catch(err =>
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

  // ── Store tuning handlers ───────────────────────────────────────────────────

  const onStoreTuningTurnOn = useCallback(() => {
    activateStoreTuning();
    // Persist the preference so the user doesn't see the prompt again.
    if (uid) {
      setStoreTuningPref(uid, true).catch(err =>
        console.warn('[useTodayScreen] setStoreTuningPref failed', err),
      );
    }
  }, [uid]);

  const onStoreTuningNotNow = useCallback(() => {
    dismissStoreTuning();
  }, []);

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
    storeTuningActive:     isStoreTuningActive,
    showStoreTuningPrompt: storeTuningState === 'prompt_shown',
    onStoreTuningTurnOn,
    onStoreTuningNotNow,
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
