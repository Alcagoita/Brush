/**
 * useOffGridWelcomeBack — KAN-246
 *
 * "The payoff moment": once an off-grid window's expiresAt has passed, this
 * detects it on the next Today mount/refresh, counts how many tasks were
 * brushed away during the window (client-side over tasks already loaded —
 * see offGrid.ts's countBrushedDuringWindow), shows the welcome-back toast
 * only when N ≥ 1 (never a guilt version for N = 0), and then always
 * deletes the trip doc + its cache area rows — "entity auto-expires"
 * applies regardless of whether a toast fired.
 */

import { useEffect, useRef } from 'react';
import { deleteTrip } from '../services/firestore';
import { deleteTripAreaPlaces } from '../services/habitatCache';
import { countBrushedDuringWindow } from '../services/offGrid';
import { useToastStore } from '../store/toastStore';
import { toDateSafe } from '../utils/date';
import { COPY } from '../constants/copy';
import type { Task, Trip } from '../types';

export function useOffGridWelcomeBack(uid: string | undefined, tasks: Task[], trips: Trip[]): void {
  // Separate concerns: the toast must fire at most once per trip, while
  // deletion must be retried on the next discovery if it failed (e.g.
  // offline) — conflating them into one ref meant a failed deleteTrip
  // silently orphaned the trip doc forever.
  const toastShownIdsRef   = useRef<Set<string>>(new Set());
  const deletionDoneIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!uid) { return; }
    const now = Date.now();

    const expired = trips.find(t =>
      t.kind === 'offgrid' && t.expiresAt < now && !deletionDoneIdsRef.current.has(t.id),
    );
    if (!expired) { return; }

    if (!toastShownIdsRef.current.has(expired.id)) {
      toastShownIdsRef.current.add(expired.id);
      const windowStart = toDateSafe(expired.createdAt)?.getTime() ?? expired.expiresAt;
      const n = countBrushedDuringWindow(tasks, windowStart, expired.expiresAt);
      if (n >= 1) {
        useToastStore.getState().showToast(COPY.offGrid.welcomeBackToast(n));
      }
    }

    deleteTrip(uid, expired.id)
      .then(() => { deletionDoneIdsRef.current.add(expired.id); })
      .catch(err => console.warn('[useOffGridWelcomeBack] deleteTrip failed', err));
    deleteTripAreaPlaces(expired.cacheAreaId); // sync, never throws — see habitatCache.ts
  }, [uid, tasks, trips]);
}
