/**
 * __tests__/services/indoorDetection.test.ts — KAN-73
 *
 * Unit tests for the indoor environment detection state machine.
 *
 * Clock is controlled via the optional `nowMs` parameter on feedLocation(),
 * so no Date.now() mocking is required.
 *
 * Mall lookup is injected via __setMallLookup() — never hits the network.
 *
 * ── Timing notes ─────────────────────────────────────────────────────────────
 * The rolling window is 30 s. When switching signals in tests, phases must be
 * spaced at least WINDOW_MS apart so stale readings from a previous phase do
 * not contaminate the classification. Constants below encode these safe gaps.
 */

import {
  startIndoorDetection,
  stopIndoorDetection,
  feedLocation,
  __setMallLookup,
  __getCurrentContext,
  WINDOW_MS,
  DEBOUNCE_MS,
  ACCURACY_THRESHOLD_M,
} from '../../src/services/indoorDetection';

// ─── Mock maps service (never hits network) ───────────────────────────────────

jest.mock('../../src/services/maps', () => ({
  searchNearbyPlaces: jest.fn(),
}));

// ─── Constants ────────────────────────────────────────────────────────────────

const LAT = 37.7749;
const LNG = -122.4194;

/** Arbitrary epoch start. */
const T0 = 1_000_000;

/** Safe gap between test phases so stale readings exit the rolling window. */
const PHASE_GAP = WINDOW_MS + 20_000; // 50 s

/** Accuracy values clearly on each side of the threshold. */
const DEGRADED_ACCURACY = ACCURACY_THRESHOLD_M + 1; // 51 m  → counts as degraded
const GOOD_ACCURACY     = ACCURACY_THRESHOLD_M - 1; // 49 m  → counts as recovered

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Feed N readings of the given accuracy, one per second starting from startMs.
 * Returns the timestamp of the LAST reading fed.
 */
function feedN(
  n: number,
  accuracy: number,
  startMs: number,
): number {
  let last = startMs;
  for (let i = 0; i < n; i++) {
    last = startMs + i * 1_000;
    feedLocation(LAT, LNG, accuracy, last);
  }
  return last;
}

/**
 * Feed degraded readings to satisfy the 30 s window and elapse the 15 s debounce,
 * committing an outdoor → indoor_unmapped transition.
 *
 * Timeline:
 *   startMs+0      1st degraded reading
 *   startMs+2000   3rd reading — MIN_READINGS met; debounce timer starts
 *   startMs+17001  debounce elapsed → transition commits
 *
 * Returns the timestamp at which the transition committed.
 */
function driveToIndoorUnmapped(startMs: number = T0): number {
  feedN(20, DEGRADED_ACCURACY, startMs);         // T0 … T0+19 000
  const debounceStart = startMs + 2_000;         // 3rd reading
  const commitTs      = debounceStart + DEBOUNCE_MS + 1;
  feedLocation(LAT, LNG, DEGRADED_ACCURACY, commitTs);
  return commitTs;
}

/**
 * Starting from `startMs` (which must be at least WINDOW_MS after the last
 * degraded reading so the window is clean), feed good readings and elapse the
 * recovery debounce, committing an indoor → outdoor transition.
 *
 * Returns the timestamp at which the transition committed.
 */
function driveToOutdoor(startMs: number): number {
  feedN(20, GOOD_ACCURACY, startMs);
  const debounceStart = startMs + 2_000;
  const commitTs      = debounceStart + DEBOUNCE_MS + 1;
  feedLocation(LAT, LNG, GOOD_ACCURACY, commitTs);
  return commitTs;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('indoorDetection', () => {
  let callback: jest.Mock;

  beforeEach(() => {
    callback = jest.fn();
    startIndoorDetection(callback);
    // Default: no mall found
    __setMallLookup(() => Promise.resolve([]));
  });

  afterEach(() => {
    stopIndoorDetection();
  });

  // ── 1. Initial state ────────────────────────────────────────────────────────

  it('starts in outdoor context', () => {
    expect(__getCurrentContext()).toBe('outdoor');
    expect(callback).not.toHaveBeenCalled();
  });

  // ── 2. No-op when detector is stopped ───────────────────────────────────────

  it('ignores feedLocation calls after stopIndoorDetection', () => {
    stopIndoorDetection();
    feedLocation(LAT, LNG, DEGRADED_ACCURACY, T0);
    feedLocation(LAT, LNG, DEGRADED_ACCURACY, T0 + 1_000);
    feedLocation(LAT, LNG, DEGRADED_ACCURACY, T0 + 2_000);
    expect(callback).not.toHaveBeenCalled();
    expect(__getCurrentContext()).toBe('outdoor'); // reset by stop
  });

  // ── 3. Minimum readings guard ───────────────────────────────────────────────

  it('does not attempt a transition with fewer than 3 readings', () => {
    feedLocation(LAT, LNG, DEGRADED_ACCURACY, T0);
    feedLocation(LAT, LNG, DEGRADED_ACCURACY, T0 + 1_000);
    expect(__getCurrentContext()).toBe('outdoor');
    expect(callback).not.toHaveBeenCalled();
  });

  // ── 4. Debounce guard ───────────────────────────────────────────────────────

  it('does not transition to indoor_unmapped before the 15 s debounce elapses', () => {
    // Feed only 14 readings (T0 … T0+13 000). Debounce starts at the 3rd reading
    // (T0+2 000). After feedN, elapsed = 11 000 ms — safely under the 15 s threshold.
    // feedN(20) would overshoot: at T0+17 000 elapsed = 15 000, which commits early.
    feedN(14, DEGRADED_ACCURACY, T0);
    // Exactly 1 ms before the debounce expires
    const debounceStart = T0 + 2_000;
    feedLocation(LAT, LNG, DEGRADED_ACCURACY, debounceStart + DEBOUNCE_MS - 1);
    expect(__getCurrentContext()).toBe('outdoor');
    expect(callback).not.toHaveBeenCalled();
  });

  // ── 5. Degraded → indoor_unmapped after debounce ────────────────────────────

  it('transitions outdoor → indoor_unmapped after sustained degraded signal', () => {
    driveToIndoorUnmapped(T0);
    expect(__getCurrentContext()).toBe('indoor_unmapped');
    expect(callback).toHaveBeenCalledWith('indoor_unmapped');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  // ── 6. Mall found → indoor_mapped ───────────────────────────────────────────

  it('upgrades to indoor_mapped when a nearby shopping mall is found', async () => {
    __setMallLookup(() => Promise.resolve([{ placeId: 'ChIJfake123', name: 'Test Mall', lat: LAT, lng: LNG, distanceMeters: 50 }]));

    driveToIndoorUnmapped(T0);
    expect(callback).toHaveBeenCalledWith('indoor_unmapped');

    // Flush the resolved promise chain
    await Promise.resolve();
    await Promise.resolve();

    expect(__getCurrentContext()).toBe('indoor_mapped');
    expect(callback).toHaveBeenCalledWith('indoor_mapped');
    expect(callback).toHaveBeenCalledTimes(2);
  });

  // ── 7. No mall → stays indoor_unmapped ──────────────────────────────────────

  it('stays in indoor_unmapped when no shopping mall is found', async () => {
    __setMallLookup(() => Promise.resolve([]));

    driveToIndoorUnmapped(T0);

    await Promise.resolve();
    await Promise.resolve();

    expect(__getCurrentContext()).toBe('indoor_unmapped');
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('indoor_unmapped');
  });

  // ── 8. Mall lookup error → stays indoor_unmapped ────────────────────────────

  it('stays in indoor_unmapped on mall lookup network error', async () => {
    __setMallLookup(() => Promise.reject(new Error('Network error')));

    driveToIndoorUnmapped(T0);

    await Promise.resolve();
    await Promise.resolve();

    expect(__getCurrentContext()).toBe('indoor_unmapped');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  // ── 9. indoor_unmapped → outdoor after recovery debounce ───────────────────

  it('transitions indoor_unmapped → outdoor after sustained good GPS signal', () => {
    const commitTs = driveToIndoorUnmapped(T0);
    expect(__getCurrentContext()).toBe('indoor_unmapped');

    // Start recovery well after the last degraded reading so the window is clean.
    // Last degraded reading was at T0+19 000 (from feedN(20, ...)).
    const recoverStart = T0 + PHASE_GAP; // T0 + 50 000 — safely past all old readings
    driveToOutdoor(recoverStart);

    expect(__getCurrentContext()).toBe('outdoor');
    expect(callback).toHaveBeenLastCalledWith('outdoor');
    void commitTs; // reference to satisfy unused-var lint without returning a value
  });

  // ── 10. indoor_mapped → outdoor after recovery debounce ────────────────────

  it('transitions indoor_mapped → outdoor after sustained good GPS signal', async () => {
    __setMallLookup(() => Promise.resolve([{ placeId: 'ChIJfake456', name: 'Test Mall 2', lat: LAT, lng: LNG, distanceMeters: 80 }]));

    driveToIndoorUnmapped(T0);
    await Promise.resolve();
    await Promise.resolve();
    expect(__getCurrentContext()).toBe('indoor_mapped');

    const recoverStart = T0 + PHASE_GAP;
    driveToOutdoor(recoverStart);

    expect(__getCurrentContext()).toBe('outdoor');
    expect(callback).toHaveBeenLastCalledWith('outdoor');
  });

  // ── 11. Neutral signal cancels pending transition ───────────────────────────

  it('cancels the pending transition when the signal goes neutral before debounce', () => {
    // 5 degraded readings — starts the debounce
    feedN(5, DEGRADED_ACCURACY, T0);

    // Jump to a clean window: feed enough good readings to make signal ≥70% recovered
    // (ratio = good / total must be ≥ 0.7 → 0% degraded → neutral / recovered)
    // Using a clean window ensures no old degraded contamination.
    const cleanStart = T0 + PHASE_GAP;
    feedN(20, GOOD_ACCURACY, cleanStart);
    // Signal is now recovered and context is outdoor → desiredTarget = null → pending cancelled

    // Advance well past the original debounce window
    feedLocation(LAT, LNG, GOOD_ACCURACY, cleanStart + DEBOUNCE_MS + 50_000);

    // Should still be outdoor — no transition fired
    expect(__getCurrentContext()).toBe('outdoor');
    expect(callback).not.toHaveBeenCalled();
  });

  // ── 12. Debounce resets when signal direction flips ─────────────────────────

  it('resets the debounce timer when the signal changes direction mid-debounce', () => {
    // Phase 1 (T0): 5 degraded readings — starts debounce at T0+2000 (3rd reading)
    // but does NOT expire it (elapsed = 2000 ms after feedN(5)).
    // Using feedN(20) here would commit mid-loop at T0+17000 (elapsed = 15000).
    feedN(5, DEGRADED_ACCURACY, T0);
    expect(__getCurrentContext()).toBe('outdoor'); // debounce pending but not committed

    // Phase 2 (T0 + PHASE_GAP): all old readings expired, feed good → cancels pending
    const phase2 = T0 + PHASE_GAP;
    feedN(20, GOOD_ACCURACY, phase2);
    expect(__getCurrentContext()).toBe('outdoor'); // still outdoor, pending cleared

    // Phase 3 (T0 + 2×PHASE_GAP): all old readings expired, fresh degraded signal.
    // Feed 14 readings so the window fills but debounce doesn't expire mid-feedN
    // (elapsed after feedN(14) = 11 000 ms < 15 000 ms).
    const phase3 = T0 + 2 * PHASE_GAP;
    feedN(14, DEGRADED_ACCURACY, phase3);
    const newDebounceStart = phase3 + 2_000; // 3rd reading of phase 3

    // One ms before debounce expires — no transition
    feedLocation(LAT, LNG, DEGRADED_ACCURACY, newDebounceStart + DEBOUNCE_MS - 1);
    expect(__getCurrentContext()).toBe('outdoor');

    // One ms past debounce — transition fires
    feedLocation(LAT, LNG, DEGRADED_ACCURACY, newDebounceStart + DEBOUNCE_MS + 1);
    expect(__getCurrentContext()).toBe('indoor_unmapped');
    expect(callback).toHaveBeenCalledWith('indoor_unmapped');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  // ── 13. Old readings pruned from window ────────────────────────────────────

  it('ignores readings older than WINDOW_MS when classifying the signal', () => {
    // Feed 10 old degraded readings
    feedN(10, DEGRADED_ACCURACY, T0); // T0 … T0+9 000

    // Jump well past WINDOW_MS so every old reading expires.
    // T0 + 50 000 means the oldest reading in the window must be > T0+20 000.
    // All old readings (up to T0+9 000) have expired.
    const freshStart = T0 + PHASE_GAP; // T0+50 000
    feedN(5, GOOD_ACCURACY, freshStart);

    // Drive past debounce — window only has good readings, signal is neutral/recovered
    feedLocation(LAT, LNG, GOOD_ACCURACY, freshStart + 2_000 + DEBOUNCE_MS + 1);

    // No transition should have fired
    expect(__getCurrentContext()).toBe('outdoor');
    expect(callback).not.toHaveBeenCalled();
  });

  // ── 14. Mall lookup in-flight guard ────────────────────────────────────────

  it('does not fire a second mall lookup if one is already in flight', () => {
    const mockLookup = jest.fn(() => new Promise<import('../../src/services/maps').NearbyPlace[]>(() => {})); // never resolves
    __setMallLookup(mockLookup);

    driveToIndoorUnmapped(T0);
    // Feed another degraded reading after the transition — should NOT spawn a 2nd lookup
    feedLocation(LAT, LNG, DEGRADED_ACCURACY, T0 + DEBOUNCE_MS + 50_000);

    expect(mockLookup).toHaveBeenCalledTimes(1);
  });

  // ── 15. Stale mall result discarded after recovery ──────────────────────────

  it('discards a mall lookup result that arrives after the context has recovered', async () => {
    let resolveLookup!: (val: import('../../src/services/maps').NearbyPlace[]) => void;
    __setMallLookup(() => new Promise(resolve => { resolveLookup = resolve; }));

    driveToIndoorUnmapped(T0);
    expect(__getCurrentContext()).toBe('indoor_unmapped');

    // Recover before the lookup resolves
    const recoverStart = T0 + PHASE_GAP;
    driveToOutdoor(recoverStart);
    expect(__getCurrentContext()).toBe('outdoor');

    // Now the mall lookup resolves — context must NOT switch back to indoor_mapped
    resolveLookup([{ placeId: 'ChIJlate789', name: 'Late Mall', lat: LAT, lng: LNG, distanceMeters: 200 }]);
    await Promise.resolve();
    await Promise.resolve();

    expect(__getCurrentContext()).toBe('outdoor');
  });
});
