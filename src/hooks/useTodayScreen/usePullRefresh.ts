/**
 * usePullRefresh — KAN-288.
 *
 * Today's only refresh control used to be the arrow inside NearbyCard, which
 * exists only when a Nearby section is rendered. With no nearby places there
 * was no way to refresh the screen at all. This backs a pull-to-refresh
 * gesture on the whole screen instead, re-running the same work the Splash
 * sequence does on boot.
 *
 * Deliberately does NOT touch NearbyCard's arrow or its spin animation
 * (out of scope per the ticket) — this is an additional, always-available
 * entry point, not a replacement.
 *
 * Throttled to one real refresh per REFRESH_THROTTLE_MS. A pull inside that
 * window still shows the spinner briefly and settles, rather than snapping
 * back instantly: a control that visibly does nothing reads as broken, which
 * is exactly the complaint that opened this ticket.
 */

import { useCallback, useRef, useState } from 'react';

/** Minimum gap between real refreshes. */
export const REFRESH_THROTTLE_MS = 30_000;

/**
 * How long the spinner is held when a pull is throttled. Long enough to read
 * as "acknowledged", short enough not to imply work is happening.
 */
export const THROTTLED_SPINNER_MS = 400;

export interface PullRefreshState {
  /**
   * Drives the pull spinner. True for EVERY accepted gesture, throttled or
   * not — the user performed the action, so the action has to look like it
   * happened. A throttled pull just settles much sooner, because there is
   * nothing to wait for.
   */
  isPullRefreshing: boolean;
  /**
   * True only while real work is in flight. This is what gates the blocking
   * overlay: input is worth blocking when a tap would act on data about to
   * be replaced, and not otherwise. A throttled pull blocks nothing — we
   * throttle the service calls, never the user.
   */
  isRefreshingForReal: boolean;
  onPullRefresh: () => Promise<void>;
}

/**
 * `tasks` is the refresh of Today's own Firestore data (the same call the
 * focus effect uses); `proximity` re-runs the location search; `extras` are
 * any further refreshes to fan out alongside them. All are run together and
 * settled independently — one failing source must not abort the others or
 * leave the spinner stuck.
 */
export function usePullRefresh(
  refreshTasks: () => void | Promise<unknown>,
  refreshProximity: () => Promise<unknown>,
  extras: Array<() => void | Promise<unknown>> = [],
): PullRefreshState {
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [isRefreshingForReal, setIsRefreshingForReal] = useState(false);

  // A ref, not state: the timestamp must never trigger a re-render of this
  // animation-heavy screen, and the throttle has to read the CURRENT value
  // rather than one captured when the callback was built.
  const lastRefreshAtRef = useRef(0);

  // Guards against a second gesture landing while the first is still in
  // flight — RefreshControl can fire again before the promise settles.
  const inFlightRef = useRef(false);

  const onPullRefresh = useCallback(async () => {
    if (inFlightRef.current) { return; }

    const now = Date.now();
    if (now - lastRefreshAtRef.current < REFRESH_THROTTLE_MS) {
      inFlightRef.current = true;
      setIsPullRefreshing(true);
      await new Promise<void>(resolve => setTimeout(resolve, THROTTLED_SPINNER_MS));
      setIsPullRefreshing(false);
      inFlightRef.current = false;
      return;
    }

    lastRefreshAtRef.current = now;
    inFlightRef.current = true;
    setIsPullRefreshing(true);
    setIsRefreshingForReal(true);
    try {
      await Promise.allSettled([
        Promise.resolve(refreshTasks()),
        refreshProximity(),
        ...extras.map(fn => Promise.resolve(fn())),
      ]);
    } finally {
      setIsPullRefreshing(false);
      setIsRefreshingForReal(false);
      inFlightRef.current = false;
    }
  // `extras` is rebuilt by the caller each render; depending on it would
  // rebuild this callback every render for no behavioural gain. The throttle
  // and in-flight state live in refs precisely so that's safe.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTasks, refreshProximity]);

  return { isPullRefreshing, isRefreshingForReal, onPullRefresh };
}
