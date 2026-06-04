/**
 * src/services/wearSync.ts — KAN-35
 *
 * Syncs the current task list to the Wear OS companion app via the
 * WearSyncModule DataClient wrapper. Called from useTodayScreen whenever
 * the task subscription emits a new list.
 *
 * Only transmits incomplete tasks — the watch shows undone items only.
 * Payload is kept minimal (id, title, category, done) to stay within the
 * Wearable DataClient 100KB per-item limit.
 *
 * No-ops on iOS or when the native module is unavailable (e.g. running in
 * the simulator without Wear OS).
 */

import { Platform } from 'react-native';
import WearSyncModule from '../native/WearSyncModule';
import { Task } from '../types';

export interface WatchTask {
  id:       string;
  title:    string;
  category: string;
  done:     boolean;
}

export function syncTasksToWatch(tasks: Task[]): void {
  if (Platform.OS !== 'android' || !WearSyncModule) { return; }

  const payload: WatchTask[] = tasks
    .filter(t => !t.done)
    .map(t => ({ id: t.id, title: t.title, category: t.category, done: t.done }));

  WearSyncModule.syncTasks(JSON.stringify(payload));
}
