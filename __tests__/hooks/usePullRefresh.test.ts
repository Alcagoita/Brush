/**
 * KAN-288 — usePullRefresh: the screen-wide refresh behind Today's
 * pull gesture, and its 30-second throttle.
 *
 * The throttle is the whole point of these tests: a user can pull
 * repeatedly, and only the first pull in each window may reach the services.
 *
 * The spinner is never held open artificially. It lasts exactly as long as
 * the work does — so a throttled pull, having nothing to load, settles
 * instantly and never claims to be loading.
 */

import { act, renderHook } from '@testing-library/react-native';
import {
  usePullRefresh,
  REFRESH_THROTTLE_MS,
  THROTTLE_NOTICE_MS,
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

/** Runs a pull to completion. */
async function pull(result: { current: { onPullRefresh: () => Promise<void> } }) {
  await act(async () => { await result.current.onPullRefresh(); });
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

describe('usePullRefresh — the spinner tells the truth', () => {
  // The spinner is the loading signal AND the input-blocking signal, so it
  // must never outlast or undershoot the actual work.
  it('never claims to be loading on a throttled pull', async () => {
    const { result, refreshTasks } = setup();

    await pull(result);                    // real
    advanceClock(1_000);

    let sawSpinner = false;
    await act(async () => {
      const p = result.current.onPullRefresh();
      sawSpinner = sawSpinner || result.current.isPullRefreshing;
      await p;
    });

    expect(sawSpinner).toBe(false);
    expect(result.current.isPullRefreshing).toBe(false);
    expect(refreshTasks).toHaveBeenCalledTimes(1);
  });

  it('stays up for exactly as long as the services take, no minimum', async () => {
    const refreshTasks = jest.fn();
    let release!: () => void;
    const refreshProximity = jest.fn(() => new Promise<void>(r => { release = r; }));
    const { result } = renderHook(() => usePullRefresh(refreshTasks, refreshProximity));

    let first!: Promise<void>;
    await act(async () => { first = result.current.onPullRefresh(); });

    // Still working — the spinner is up because the services have not answered.
    expect(result.current.isPullRefreshing).toBe(true);

    // The moment they answer it comes down; nothing pads it out.
    await act(async () => { release(); await first; });
    expect(result.current.isPullRefreshing).toBe(false);
  });
});

describe('usePullRefresh — the throttle notice', () => {
  // Without a notice, a throttled pull and a fast real one look identical
  // (both snap straight back), so the user cannot tell which happened.
  it('does not appear after a real refresh — nothing to explain', async () => {
    const { result } = setup();

    await pull(result);

    expect(result.current.showThrottleNotice).toBe(false);
  });

  it('appears after a throttled pull, without ever showing the spinner', async () => {
    const { result } = setup();

    await pull(result);
    advanceClock(1_000);
    await pull(result);

    expect(result.current.showThrottleNotice).toBe(true);
    expect(result.current.isPullRefreshing).toBe(false);
  });

  it('clears itself after the reading window', async () => {
    const { result } = setup();

    await pull(result);
    advanceClock(1_000);
    await pull(result);
    expect(result.current.showThrottleNotice).toBe(true);

    await act(async () => { jest.advanceTimersByTime(THROTTLE_NOTICE_MS); });

    expect(result.current.showThrottleNotice).toBe(false);
  });

  it('a real refresh supersedes a notice still on screen', async () => {
    const { result } = setup();

    await pull(result);
    advanceClock(1_000);
    await pull(result);                       // throttled -> notice up
    expect(result.current.showThrottleNotice).toBe(true);

    advanceClock(REFRESH_THROTTLE_MS);        // window reopens
    await pull(result);                       // real refresh

    expect(result.current.showThrottleNotice).toBe(false);
  });

  it('a repeated throttled pull restarts the window rather than stacking timers', async () => {
    const { result } = setup();

    await pull(result);
    advanceClock(1_000);
    await pull(result);                       // notice up

    // Second throttled pull most of a window later; the notice must survive
    // a further full window from THIS pull, not expire on the first timer.
    await act(async () => { jest.advanceTimersByTime(THROTTLE_NOTICE_MS - 100); });
    await pull(result);
    await act(async () => { jest.advanceTimersByTime(THROTTLE_NOTICE_MS - 100); });

    expect(result.current.showThrottleNotice).toBe(true);

    await act(async () => { jest.advanceTimersByTime(200); });
    expect(result.current.showThrottleNotice).toBe(false);
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
