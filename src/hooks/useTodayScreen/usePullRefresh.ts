/**
 * usePullRefresh — KAN-288.
 *
 * Today's only refresh control used to be the arrow inside NearbyCard, which
 * exists only when a Nearby section is rendered. With no nearby places there
 * was no way to refresh the screen at all. This backs a pull gesture on the
 * task list instead — the zone below the ring, which already has its own
 * overscroll — re-running the same work the Splash sequence does on boot.
 *
 * Deliberately does NOT touch NearbyCard's arrow or its spin animation
 * (out of scope per the ticket), and deliberately does not turn the whole
 * screen into a pull surface: nobody pulls a calendar.
 *
 * Throttled to one real refresh per REFRESH_THROTTLE_MS. The throttle applies
 * to the SERVICE CALLS, never to the user: a pull inside the window is
 * accepted and simply has nothing to load, so it settles as fast as that
 * takes — which is instantly. The spinner is never held open artificially in
 * either case. It lasts exactly as long as the work does, so what the user
 * sees is always the truth about what is happening.
 */

import { useCallback, useRef, useState } from 'react';

/** Minimum gap between real refreshes. */
export const REFRESH_THROTTLE_MS = 30_000;

export interface PullRefreshState {
  /**
   * True only while real work is in flight — which is also exactly when the
   * spinner should show and when input is worth blocking. A throttled pull
   * never sets it, because there is nothing to wait for and nothing to
   * protect: a tap during it cannot land on data that is about to change.
   */
  isPullRefreshing: boolean;
  onPullRefresh: () => Promise<void>;
}

/**
 * `refreshTasks` is the refresh of Today's own Firestore data (the same call
 * the focus effect uses); `refreshProximity` re-runs the location search;
 * `extras` are any further refreshes to fan out alongside them. All are run
 * together and settled independently — one failing source must not abort the
 * others or leave the spinner stuck.
 */
export function usePullRefresh(
  refreshTasks: () => void | Promise<unknown>,
  refreshProximity: () => Promise<unknown>,
  extras: Array<() => void | Promise<unknown>> = [],
): PullRefreshState {
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

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
      // Nothing to load, so nothing to wait for. The gesture is still
      // accepted — the pull's own elastic animation played during the drag,
      // which is the feedback that the action registered — it just settles
      // immediately. Holding a spinner open here would claim work that is
      // not happening.
      return;
    }

    lastRefreshAtRef.current = now;
    inFlightRef.current = true;
    setIsPullRefreshing(true);
    try {
      await Promise.allSettled([
        Promise.resolve(refreshTasks()),
        refreshProximity(),
        ...extras.map(fn => Promise.resolve(fn())),
      ]);
    } finally {
      setIsPullRefreshing(false);
      inFlightRef.current = false;
    }
  // `extras` is rebuilt by the caller each render; depending on it would
  // rebuild this callback every render for no behavioural gain. The throttle
  // and in-flight state live in refs precisely so that's safe.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTasks, refreshProximity]);

  return { isPullRefreshing, onPullRefresh };
}
