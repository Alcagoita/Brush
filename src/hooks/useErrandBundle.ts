/**
 * useErrandBundle — KAN-235.
 *
 * Recomputes on the existing proximity tick only (tasks/poiPlaces already
 * come from useProximityEngine's own state) — no new timer, no new location
 * subscription. Surfaces the single top-ranked bundle not yet dismissed
 * today; dismissing hides it immediately (local state) and persists the
 * hide via errandBundles.ts's SQLite table so it survives a re-render/
 * app restart within the same calendar day.
 *
 * Dismissed keys are loaded once per calendar day (on mount, and again only
 * if `todayISO()` has actually changed since) rather than doing a sync
 * SQLite read per candidate bundle on every proximity tick — keeps the
 * per-tick bundle-selection memo pure in-memory work, and keeps the
 * in-memory dismissal state itself day-scoped (review fix: it previously
 * never reloaded, so a dismissal from before midnight could stay applied
 * after the day rolled over).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  computeErrandBundles,
  dismissBundleForToday,
  errandBundleKey,
  getDismissedBundleKeysToday,
} from '../services/errandBundles';
import type { ErrandBundle } from '../services/errandBundles';
import type { PlacesMap } from '../services/proximity';
import type { Task } from '../types';
import { todayISO } from '../utils/date';

export interface ErrandBundleState {
  bundle: ErrandBundle | null;
  dismiss: () => void;
}

export function useErrandBundle(tasks: Task[], poiPlaces: PlacesMap): ErrandBundleState {
  const [dismissedKeys, setDismissedKeys] = useState<ReadonlySet<string>>(() => new Set());
  const loadedDayRef = useRef<string | null>(null);

  const bundles = useMemo(() => computeErrandBundles(tasks, poiPlaces), [tasks, poiPlaces]);

  useEffect(() => {
    const today = todayISO();
    if (loadedDayRef.current !== today) {
      loadedDayRef.current = today;
      setDismissedKeys(getDismissedBundleKeysToday());
    }
  }, [bundles]);

  const bundle = useMemo(() => {
    for (const candidate of bundles) {
      if (!dismissedKeys.has(errandBundleKey(candidate))) { return candidate; }
    }
    return null;
  }, [bundles, dismissedKeys]);

  const dismiss = useCallback(() => {
    if (!bundle) { return; }
    const key = errandBundleKey(bundle);
    dismissBundleForToday(key);
    setDismissedKeys(prev => new Set(prev).add(key));
  }, [bundle]);

  return { bundle, dismiss };
}
