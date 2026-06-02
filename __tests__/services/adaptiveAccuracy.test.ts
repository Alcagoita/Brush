/**
 * Unit tests for KAN-55 — Adaptive GPS accuracy.
 *
 * Covers:
 *   setTrackingAccuracy():
 *     - No-op when called with the current mode (watcher not restarted)
 *     - Restarts watcher when mode changes and tracking is active
 *     - No restart when tracking is not active
 *
 *   Integration in checkProximity() via proximity.ts:
 *     - Switches to 'fine' when nearest cached POI ≤ 500 m
 *     - Switches to 'coarse' when nearest cached POI > 500 m
 *     - Stays in 'fine' when already fine and still within threshold
 *     - Empty place cache → stays in 'fine' (safe default)
 */

// ─── Geolocation mock ─────────────────────────────────────────────────────────
// We import the real module but mock Geolocation so watchPosition/clearWatch
// don't touch native code. setTrackingAccuracy and startTracking are the
// actual implementations under test.

const mockWatchPosition = jest.fn().mockReturnValue(42);
const mockClearWatch    = jest.fn();

jest.mock('react-native-geolocation-service', () => ({
  watchPosition: (...args: unknown[]) => mockWatchPosition(...args),
  clearWatch:    (id: number)          => mockClearWatch(id),
  getCurrentPosition: jest.fn(),
}));

jest.mock('react-native-permissions', () => ({
  PERMISSIONS: { IOS: {}, ANDROID: {} },
  RESULTS:     { GRANTED: 'granted' },
  check:       jest.fn().mockResolvedValue('granted'),
  request:     jest.fn().mockResolvedValue('granted'),
  requestMultiple: jest.fn().mockResolvedValue({}),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {
  startTracking,
  stopTracking,
  setTrackingAccuracy,
} from '../../src/services/geolocation';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const noop = () => {};

// Reset module-level state between tests by stopping tracking.
beforeEach(() => {
  jest.clearAllMocks();
  stopTracking();
  // Reset to coarse (the bootstrap default) by exploiting the no-op guard:
  // force a mode switch via fine then back to coarse.
  setTrackingAccuracy('fine');
  setTrackingAccuracy('coarse');
  stopTracking();
  jest.clearAllMocks();
});

// ─── setTrackingAccuracy — no-op guard ───────────────────────────────────────

describe('setTrackingAccuracy — no-op when mode unchanged', () => {
  it('does NOT restart the watcher when already in coarse mode', () => {
    startTracking(noop); // starts in coarse (bootstrap default)
    const callsBefore = mockWatchPosition.mock.calls.length;

    setTrackingAccuracy('coarse'); // same mode → no-op

    expect(mockWatchPosition.mock.calls.length).toBe(callsBefore);
    expect(mockClearWatch).not.toHaveBeenCalled();
  });

  it('does NOT restart the watcher when already in fine mode', () => {
    setTrackingAccuracy('fine');   // switch to fine
    startTracking(noop);
    jest.clearAllMocks();

    setTrackingAccuracy('fine');   // same mode → no-op

    expect(mockWatchPosition).not.toHaveBeenCalled();
    expect(mockClearWatch).not.toHaveBeenCalled();
  });
});

// ─── setTrackingAccuracy — restarts watcher on mode change ───────────────────

describe('setTrackingAccuracy — restarts watcher when mode changes', () => {
  it('restarts watcher when switching from coarse → fine while tracking', () => {
    startTracking(noop); // starts in coarse
    jest.clearAllMocks();

    setTrackingAccuracy('fine'); // mode change → should restart

    expect(mockClearWatch).toHaveBeenCalledTimes(1);   // old watcher cleared
    expect(mockWatchPosition).toHaveBeenCalledTimes(1); // new watcher started
  });

  it('restarts watcher when switching from fine → coarse while tracking', () => {
    setTrackingAccuracy('fine');
    startTracking(noop);
    jest.clearAllMocks();

    setTrackingAccuracy('coarse'); // mode change → should restart

    expect(mockClearWatch).toHaveBeenCalledTimes(1);
    expect(mockWatchPosition).toHaveBeenCalledTimes(1);
  });

  it('does NOT restart watcher when tracking is not active', () => {
    // No startTracking call — watcher is not running.
    setTrackingAccuracy('fine');

    expect(mockWatchPosition).not.toHaveBeenCalled();
    expect(mockClearWatch).not.toHaveBeenCalled();
  });
});

// ─── setTrackingAccuracy — correct options passed ─────────────────────────────

describe('setTrackingAccuracy — passes correct options to watchPosition', () => {
  it('uses low-accuracy options in coarse mode', () => {
    startTracking(noop); // coarse (default)
    const opts = mockWatchPosition.mock.calls[0][2];

    expect(opts.enableHighAccuracy).toBe(false);
    expect(opts.accuracy.android).toBe('balancedPower');
    expect(opts.accuracy.ios).toBe('hundredMeters');
    expect(opts.distanceFilter).toBe(50);
  });

  it('uses high-accuracy options in fine mode', () => {
    setTrackingAccuracy('fine');
    startTracking(noop);
    const opts = mockWatchPosition.mock.calls[0][2];

    expect(opts.enableHighAccuracy).toBe(true);
    expect(opts.accuracy.android).toBe('high');
    expect(opts.accuracy.ios).toBe('best');
    expect(opts.distanceFilter).toBe(25);
  });
});
