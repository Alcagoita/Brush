/**
 * KAN-288 — usePullRefresh: the screen-wide refresh behind Today's
 * pull gesture, and its 30-second throttle.
 *
 * The throttle is the whole point of these tests: a user can pull
 * repeatedly, and only the first pull in each window may do real work.
 * Equally important is that a throttled pull still resolves and still
 * clears the spinner — the bug that opened this ticket was a control that
 * appeared to do nothing.
 */

import { act, renderHook } from '@testing-library/react-native';
import {
  usePullRefresh,
  REFRESH_THROTTLE_MS,
  THROTTLED_SPINNER_MS,
} from '../../src/hooks/useTodayScreen/usePullRefresh';

let nowMs = 1_000_000;

beforeEach(() => {
  jest.useFakeTimers();
  nowMs = 1_000_000;
  jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/** Advances the mocked clock without advancing pending timers. */
function advanceClock(ms: number) {
  nowMs += ms;
}

function setup() {
  const refreshTasks     = jest.fn();
  const refreshProximity = jest.fn().mockResolvedValue(true);
  const extra            = jest.fn();

  const { result } = renderHook(() =>
    usePullRefresh(refreshTasks, refreshProximity, [extra]),
  );

  return { result, refreshTasks, refreshProximity, extra };
}

/** Runs a pull and lets the throttled-spinner timer settle. */
async function pull(result: { current: { onPullRefresh: () => Promise<void> } }) {
  await act(async () => {
    const p = result.current.onPullRefresh();
    jest.advanceTimersByTime(THROTTLED_SPINNER_MS);
    await p;
  });
}

describe('usePullRefresh — doing the work', () => {
  it('refreshes every source on the first pull', async () => {
    const { result, refreshTasks, refreshProximity, extra } = setup();

    await pull(result);

    expect(refreshTasks).toHaveBeenCalledTimes(1);
    expect(refreshProximity).toHaveBeenCalledTimes(1);
    expect(extra).toHaveBeenCalledTimes(1);
  });

  it('clears the spinner once the work settles', async () => {
    const { result } = setup();

    await pull(result);

    expect(result.current.isPullRefreshing).toBe(false);
  });

  it('still settles when a source rejects — one bad fetch cannot strand the spinner', async () => {
    const refreshTasks     = jest.fn();
    const refreshProximity = jest.fn().mockRejectedValue(new Error('no location'));
    const { result } = renderHook(() => usePullRefresh(refreshTasks, refreshProximity));

    await pull(result);

    expect(result.current.isPullRefreshing).toBe(false);
    expect(refreshTasks).toHaveBeenCalledTimes(1);
  });
});

describe('usePullRefresh — the 30s throttle', () => {
  it('does no work on a second pull inside the window', async () => {
    const { result, refreshTasks, refreshProximity, extra } = setup();

    await pull(result);
    advanceClock(REFRESH_THROTTLE_MS - 1);
    await pull(result);

    expect(refreshTasks).toHaveBeenCalledTimes(1);
    expect(refreshProximity).toHaveBeenCalledTimes(1);
    expect(extra).toHaveBeenCalledTimes(1);
  });

  it('works again once the window has passed', async () => {
    const { result, refreshTasks, refreshProximity } = setup();

    await pull(result);
    advanceClock(REFRESH_THROTTLE_MS);
    await pull(result);

    expect(refreshTasks).toHaveBeenCalledTimes(2);
    expect(refreshProximity).toHaveBeenCalledTimes(2);
  });

  it('a throttled pull still resolves and still clears the spinner', async () => {
    const { result } = setup();

    await pull(result);
    advanceClock(1_000);
    await pull(result);

    // The gesture was acknowledged and settled, not silently swallowed.
    expect(result.current.isPullRefreshing).toBe(false);
  });

  it('throttles from the last real refresh, not from the last attempt', async () => {
    const { result, refreshTasks } = setup();

    await pull(result);                       // real, at t=0
    advanceClock(20_000);
    await pull(result);                       // throttled, must NOT reset the clock
    advanceClock(REFRESH_THROTTLE_MS - 20_000);
    await pull(result);                       // 30s since the real one → real

    expect(refreshTasks).toHaveBeenCalledTimes(2);
  });
});

describe('usePullRefresh — overlapping gestures', () => {
  it('ignores a second pull while the first is still in flight', async () => {
    const refreshTasks = jest.fn();
    let release!: () => void;
    const refreshProximity = jest.fn(
      () => new Promise<void>(resolve => { release = resolve; }),
    );

    const { result } = renderHook(() => usePullRefresh(refreshTasks, refreshProximity));

    let first!: Promise<void>;
    await act(async () => { first = result.current.onPullRefresh(); });

    // Second gesture arrives before the first settles.
    await act(async () => { await result.current.onPullRefresh(); });

    expect(refreshTasks).toHaveBeenCalledTimes(1);

    await act(async () => { release(); await first; });

    expect(result.current.isPullRefreshing).toBe(false);
  });
});
