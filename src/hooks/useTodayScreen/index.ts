/**
 * useTodayScreen — KAN-59 / KAN-214
 *
 * ViewModel-layer hook for TodayScreen. Composes three focused sub-hooks:
 *   - useTodayScreenData    — Firestore fetch, loading/error, task/points state
 *   - useProximityEngine    — location permission, outdoor/indoor proximity,
 *                             Store fine tuning
 *   - useTaskCompletion     — task-done toggle + achievements/challenges
 *
 * No JSX — independently testable with renderHook.
 */

import type { NearbyPlace } from '../../services/maps';
import type { PlacesMap } from '../../services/proximity';
import type { Category, Task } from '../../types';
import { useTodayScreenData } from './useTodayScreenData';
import { useProximityEngine } from './useProximityEngine';
import { useTaskCompletion } from './useTaskCompletion';

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
  /** Count of unread social inbox entries (follow notifications) for the people icon badge. */
  socialUnreadCount: number;
  /** Task-done toggle — updates local state immediately, persists to Firestore. */
  handleToggle: (taskId: string, done: boolean) => Promise<void>;
  /** True when location permission has been granted. */
  permissionGranted: boolean;
  /** Re-runs the proximity search immediately — useful for a manual "refresh location" tap. */
  refreshProximity: () => Promise<boolean>;
  /** True when the last proximity search failed because the device GPS toggle is off. */
  locationUnavailable: boolean;
}

export function useTodayScreen(uid: string | undefined): TodayScreenState {
  const data = useTodayScreenData(uid);
  const proximity = useProximityEngine(
    uid,
    data.tasks,
    data.latestTasksRef,
    data.lowBatteryPausePref,
    data.storeTuningEnabled,
  );
  const { handleToggle } = useTaskCompletion(
    uid,
    data.setTasks,
    data.latestTasksRef,
    proximity.nearbyPoiTypeRef,
    data.setTotalPoints,
  );

  const totalTasks  = data.tasks.length;
  const doneTasks   = data.tasks.filter(t => t.done).length;
  const progress    = totalTasks > 0 ? doneTasks / totalTasks : 0;
  const nearbyCount = data.tasks.filter(t => t.poi).length;

  return {
    tasks: data.tasks,
    isLoading: data.isLoading,
    isRefreshing: data.isRefreshing,
    error: data.error,
    refresh: data.refresh,
    nearbyPoiType: proximity.nearbyPoiType,
    nearbyPlace: proximity.nearbyPlace,
    poiPlaces: proximity.poiPlaces,
    storeTuningActive:     proximity.storeTuningActive,
    showStoreTuningPrompt: proximity.showStoreTuningPrompt,
    onStoreTuningTurnOn: proximity.onStoreTuningTurnOn,
    onStoreTuningNotNow: proximity.onStoreTuningNotNow,
    customCategories: data.customCategories,
    totalTasks,
    doneTasks,
    progress,
    nearbyCount,
    totalPoints: data.totalPoints,
    inboxCount: data.inboxCount,
    socialUnreadCount: data.socialUnreadCount,
    handleToggle,
    permissionGranted: proximity.permissionGranted,
    refreshProximity: proximity.refreshProximity,
    locationUnavailable: proximity.locationUnavailable,
  };
}
