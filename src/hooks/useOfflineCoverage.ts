/**
 * useOfflineCoverage — shared offline/habitat-coverage detection (KAN-241).
 *
 * Lifted out of NetworkBanner's original logic so it and ContextChip can't
 * disagree on what "offline" and "has coverage" mean — both need to reach
 * the same conclusion for the banner-vs-chip decision to be consistent.
 *
 * hasCachedPlaces() opens/queries SQLite, so it must never run during
 * render (the first call can synchronously create the DB + schema) — it's
 * deferred to a post-commit effect, one tick behind `offline` itself.
 *
 * `hasCache` is tri-state (`null` = not yet known) rather than defaulting to
 * false: on the render where `offline` first flips true, the real cache
 * state hasn't been read yet. Defaulting to false would make NetworkBanner
 * (which now shows only for offline+no-cache) flash its "broken" banner for
 * a tick even when the cache is actually seeded. Callers must treat `null`
 * as "don't render either the banner or the chip yet."
 */
import { useEffect, useState } from 'react';
import { useNetInfo } from '@react-native-community/netinfo';
import { hasCachedPlaces } from '../services/habitatCache';

export interface OfflineCoverage {
  /** True only when we're confident the device is offline — `null`/unknown connectivity stays false. */
  offline: boolean;
  /** Whether the habitat cache has ever been seeded anywhere (not specific to the current location). `null` = not checked yet this offline period. */
  hasCache: boolean | null;
}

export function useOfflineCoverage(): OfflineCoverage {
  const { isConnected, isInternetReachable } = useNetInfo();
  const offline = isConnected === false || isInternetReachable === false;

  const [hasCache, setHasCache] = useState<boolean | null>(null);

  useEffect(() => {
    if (!offline) {
      setHasCache(null);
      return;
    }
    setHasCache(hasCachedPlaces());
  }, [offline]);

  return { offline, hasCache };
}
