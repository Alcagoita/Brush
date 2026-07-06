/**
 * useTodayScreenData — KAN-59 / KAN-214
 *
 * Owns the one-shot Firestore fetch (or SplashScreen boot-data fast path),
 * loading/error state, and the derived data (tasks, categories, points,
 * inbox/social counts) consumed by the rest of the Today screen.
 *
 * Data strategy: one-shot fetch on mount (no real-time subscriptions).
 * Pull-to-refresh or onTaskAdded re-runs the full fetch. Writes update local
 * state immediately and persist to Firestore in the background; on failure,
 * local state reverts (see useTaskCompletion).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getCategories,
  getTasksForDate,
  getUserPreferences,
  getPoiPreferencesMap,
  getUser,
  getTotalPoints,
  getInboxUnreadCount,
} from '../../services/firestore';
import { getIncomingSharedTasksCount } from '../../services/sharing';
import { updateNotifNearbyEnabled, updateProximityPoiPreferences } from '../../services/proximity';
import { updateExitPromptPref } from '../../services/proximity';
import { updateIndoorExitPromptPref } from '../../services/indoorProximity';
import { syncTasksToWatch } from '../../services/wearSync';
import type { Category, MallSnapshot, Task, Trip } from '../../types';
import { todayISO } from '../../utils/date';
import { useAppStore } from '../../store/appStore';
import { DEBUG_DISABLE_BACKGROUND } from './debugFlags';

const DATA_FETCH_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Data fetch timed out')), ms),
    ),
  ]);
}

export interface TodayScreenData {
  tasks:             Task[];
  setTasks:          React.Dispatch<React.SetStateAction<Task[]>>;
  isLoading:         boolean;
  isRefreshing:      boolean;
  error:             string | null;
  refresh:           () => void;
  customCategories:  Category[];
  totalPoints:       number;
  setTotalPoints:    React.Dispatch<React.SetStateAction<number>>;
  inboxCount:        number;
  socialUnreadCount: number;
  lowBatteryPausePref: boolean;
  storeTuningEnabled:  boolean | undefined;
  /** Active trip areas + current mall snapshot (KAN-237) — fed into the
   *  proximity engine's cache-first check. Boot-data fast path only, same as
   *  the rest of this hook's Firestore reads (see loadData below). */
  trips:               Trip[];
  mallSnapshot:        MallSnapshot | null;
  /** Always-current tasks array, readable from stable callbacks without
   *  needing `tasks` in their dependency array (avoids identity churn). */
  latestTasksRef:    React.RefObject<Task[]>;
}

export function useTodayScreenData(uid: string | undefined): TodayScreenData {
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
  const [socialUnreadCount, setSocialUnreadCount] = useState(0);
  const [lowBatteryPausePref, setLowBatteryPausePref] = useState(false);
  const [storeTuningEnabled, setStoreTuningEnabled]  = useState<boolean | undefined>(undefined);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [mallSnapshot, setMallSnapshot] = useState<MallSnapshot | null>(null);

  const latestTasksRef = useRef<Task[]>([]);
  useEffect(() => { latestTasksRef.current = tasks; }, [tasks]);

  // ── One-shot data fetch ────────────────────────────────────────────────────
  //
  // No background watchers. Called once on mount and again on pull-to-refresh,
  // error retry, or when onTaskAdded fires after a new task is created.
  //
  // requestIdRef guards against overlapping calls (e.g. a fast refocus refresh
  // firing while the initial fetch is still in flight) — only the most recent
  // call is allowed to commit state.

  const requestIdRef = useRef(0);

  const loadData = useCallback(async (isRefresh: boolean = false) => {
    const myRequestId = ++requestIdRef.current;
    const isStale = () => requestIdRef.current !== myRequestId;

    if (!uid) {
      setTasks([]);
      setCustomCategories([]);
      setTotalPoints(0);
      setInboxCount(0);
      setSocialUnreadCount(0);
      setLowBatteryPausePref(false);
      setStoreTuningEnabled(undefined);
      setTrips([]);
      setMallSnapshot(null);
      setIsLoading(false);
      return;
    }

    // Fast path — use data pre-loaded by SplashScreen (initial mount only).
    if (!isRefresh) {
      const { bootData, clearBootData } = useAppStore.getState();
      if (bootData && bootData.ownerUid !== uid) {
        clearBootData();
      } else if (bootData) {
        if (!isStale()) {
          setTasks(bootData.tasks);
          setCustomCategories(bootData.customCategories.filter(c => !c.isBuiltIn));
          setTotalPoints(bootData.totalPoints);
          setInboxCount(bootData.inboxCount);
          setSocialUnreadCount(bootData.socialUnreadCount ?? 0);
          if (bootData.userData) {
            setLowBatteryPausePref(bootData.userData.poiPreferences?.lowBatteryPause ?? false);
            setStoreTuningEnabled(bootData.userData.poiPreferences?.storeTuningEnabled);
          }
          setTrips(bootData.trips);
          setMallSnapshot(bootData.mallSnapshot);
          updateNotifNearbyEnabled(bootData.userPrefs.notif_nearby_enabled ?? true);
          updateExitPromptPref(bootData.userPrefs.exitPrompt ?? true);
          updateIndoorExitPromptPref(bootData.userPrefs.exitPrompt ?? true);
          updateProximityPoiPreferences(bootData.poiPrefsMap);
          setIsLoading(false);
        }
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
        socialUnread,
      ] = await withTimeout(
        Promise.all([
          getTasksForDate(uid, todayISO()),
          getUser(uid),
          getUserPreferences(uid),
          getPoiPreferencesMap(uid),
          getCategories(uid),
          getTotalPoints(uid),
          getIncomingSharedTasksCount(uid),
          getInboxUnreadCount(uid),
        ]),
        DATA_FETCH_TIMEOUT_MS,
      );

      if (isStale()) { return; }

      setTasks(fetchedTasks);
      setCustomCategories(categories.filter(c => !c.isBuiltIn));
      setTotalPoints(points);
      setInboxCount(inbox);
      setSocialUnreadCount(socialUnread);

      if (userData) {
        setLowBatteryPausePref(userData.poiPreferences?.lowBatteryPause ?? false);
        setStoreTuningEnabled(userData.poiPreferences?.storeTuningEnabled);
      }

      updateNotifNearbyEnabled(userPrefs.notif_nearby_enabled ?? true);
      updateExitPromptPref(userPrefs.exitPrompt ?? true);
      updateIndoorExitPromptPref(userPrefs.exitPrompt ?? true);
      updateProximityPoiPreferences(poiPrefsMap);

    } catch (err) {
      if (!isStale()) { setError('Could not load tasks. Check your connection.'); }
    } finally {
      if (!isStale()) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(() => { loadData(true); }, [loadData]);

  // ── Wear OS sync (KAN-35) ──────────────────────────────────────────────────

  useEffect(() => {
    if (DEBUG_DISABLE_BACKGROUND) { return; }
    syncTasksToWatch(tasks);
  }, [tasks]);

  return {
    tasks,
    setTasks,
    isLoading,
    isRefreshing,
    error,
    refresh,
    customCategories,
    totalPoints,
    setTotalPoints,
    inboxCount,
    socialUnreadCount,
    lowBatteryPausePref,
    storeTuningEnabled,
    trips,
    mallSnapshot,
    latestTasksRef,
  };
}
