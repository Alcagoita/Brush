/**
 * useErrandBundle — KAN-235.
 *
 * Recomputes on the existing proximity tick only (tasks/poiPlaces already
 * come from useProximityEngine's own state) — no new timer, no new location
 * subscription. Surfaces the single top-ranked bundle not yet dismissed
 * today; dismissing hides it immediately (local state) and persists the
 * hide via errandBundles.ts's SQLite table so it survives a re-render/
 * app restart within the same calendar day.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  computeErrandBundles,
  dismissBundleForToday,
  errandBundleKey,
  isBundleDismissedToday,
} from '../services/errandBundles';
import type { ErrandBundle } from '../services/errandBundles';
import type { PlacesMap } from '../services/proximity';
import type { Task } from '../types';

export interface ErrandBundleState {
  bundle: ErrandBundle | null;
  dismiss: () => void;
}

export function useErrandBundle(tasks: Task[], poiPlaces: PlacesMap): ErrandBundleState {
  const [dismissedKeys, setDismissedKeys] = useState<ReadonlySet<string>>(() => new Set());

  const bundles = useMemo(() => computeErrandBundles(tasks, poiPlaces), [tasks, poiPlaces]);

  const bundle = useMemo(() => {
    for (const candidate of bundles) {
      const key = errandBundleKey(candidate);
      if (dismissedKeys.has(key)) { continue; }
      if (isBundleDismissedToday(key)) { continue; }
      return candidate;
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
