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
 */
import { useEffect, useState } from 'react';
import { useNetInfo } from '@react-native-community/netinfo';
import { hasCachedPlaces } from '../services/habitatCache';

export interface OfflineCoverage {
  /** True only when we're confident the device is offline — `null`/unknown connectivity stays false. */
  offline: boolean;
  /** Whether the habitat cache has ever been seeded anywhere (not specific to the current location). */
  hasCache: boolean;
}

export function useOfflineCoverage(): OfflineCoverage {
  const { isConnected, isInternetReachable } = useNetInfo();
  const offline = isConnected === false || isInternetReachable === false;

  const [hasCache, setHasCache] = useState(false);

  useEffect(() => {
    if (!offline) {
      setHasCache(false);
      return;
    }
    setHasCache(hasCachedPlaces());
  }, [offline]);

  return { offline, hasCache };
}
