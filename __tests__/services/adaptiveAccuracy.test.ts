/**
 * Unit tests for KAN-55 — Adaptive GPS accuracy.
 * Updated in KAN-162: geolocation.ts migrated from react-native-geolocation-service
 * to expo-location.
 *
 * Covers:
 *   setTrackingAccuracy():
 *     - No-op when called with the current mode (watcher not restarted)
 *     - Restarts watcher when mode changes and tracking is active
 *     - No restart when tracking is not active
 *     - Correct accuracy options passed in each mode
 */

// ─── expo-location mock ───────────────────────────────────────────────────────
// Provides watchPositionAsync with a controllable subscription.

const mockSubscriptionRemove = jest.fn();
const mockWatchPositionAsync  = jest.fn();

jest.mock('expo-location', () => ({
  watchPositionAsync: (...args: unknown[]) => mockWatchPositionAsync(...args),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 0, longitude: 0, accuracy: 10 },
    timestamp: Date.now(),
  }),
  requestForegroundPermissionsAsync:  jest.fn().mockResolvedValue({ status: 'granted' }),
  requestBackgroundPermissionsAsync:  jest.fn().mockResolvedValue({ status: 'granted' }),
  Accuracy: {
    Lowest:             1,
    Low:                2,
    Balanced:           3,
    High:               4,
    Highest:            5,
    BestForNavigation:  6,
  },
}));

jest.mock('react-native-permissions', () => ({
  PERMISSIONS: { IOS: {}, ANDROID: {} },
  RESULTS:     { GRANTED: 'granted' },
  check:       jest.fn().mockResolvedValue('granted'),
  request:     jest.fn().mockResolvedValue('granted'),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {
  startTracking,
  stopTracking,
  setTrackingAccuracy,
} from '../../src/services/geolocation';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const noop = () => {};

beforeEach(() => {
  jest.clearAllMocks();
  mockWatchPositionAsync.mockResolvedValue({ remove: mockSubscriptionRemove });
  stopTracking();
  // Reset to coarse (the bootstrap default).
  setTrackingAccuracy('fine');
  setTrackingAccuracy('coarse');
  stopTracking();
  jest.clearAllMocks();
  mockWatchPositionAsync.mockResolvedValue({ remove: mockSubscriptionRemove });
});

// ─── setTrackingAccuracy — no-op guard ───────────────────────────────────────

describe('setTrackingAccuracy — no-op when mode unchanged', () => {
  it('does NOT restart the watcher when already in coarse mode', async () => {
    startTracking(noop);
    await Promise.resolve(); // let watchPositionAsync promise settle
    const callsBefore = mockWatchPositionAsync.mock.calls.length;

    setTrackingAccuracy('coarse'); // same mode → no-op
    await Promise.resolve();

    expect(mockWatchPositionAsync.mock.calls.length).toBe(callsBefore);
    expect(mockSubscriptionRemove).not.toHaveBeenCalled();
  });

  it('does NOT restart the watcher when already in fine mode', async () => {
    setTrackingAccuracy('fine');
    startTracking(noop);
    await Promise.resolve();
    jest.clearAllMocks();
    mockWatchPositionAsync.mockResolvedValue({ remove: mockSubscriptionRemove });

    setTrackingAccuracy('fine'); // same mode → no-op
    await Promise.resolve();

    expect(mockWatchPositionAsync).not.toHaveBeenCalled();
    expect(mockSubscriptionRemove).not.toHaveBeenCalled();
  });
});

// ─── setTrackingAccuracy — restarts watcher on mode change ───────────────────

describe('setTrackingAccuracy — restarts watcher when mode changes', () => {
  it('restarts watcher when switching from coarse → fine while tracking', async () => {
    startTracking(noop);
    await Promise.resolve();
    jest.clearAllMocks();
    mockWatchPositionAsync.mockResolvedValue({ remove: mockSubscriptionRemove });

    setTrackingAccuracy('fine'); // mode change → should restart
    await Promise.resolve();

    expect(mockSubscriptionRemove).toHaveBeenCalledTimes(1);  // old subscription removed
    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(1);  // new watcher started
  });

  it('restarts watcher when switching from fine → coarse while tracking', async () => {
    setTrackingAccuracy('fine');
    startTracking(noop);
    await Promise.resolve();
    jest.clearAllMocks();
    mockWatchPositionAsync.mockResolvedValue({ remove: mockSubscriptionRemove });

    setTrackingAccuracy('coarse'); // mode change → should restart
    await Promise.resolve();

    expect(mockSubscriptionRemove).toHaveBeenCalledTimes(1);
    expect(mockWatchPositionAsync).toHaveBeenCalledTimes(1);
  });

  it('does NOT restart watcher when tracking is not active', async () => {
    // No startTracking call — watcher is not running.
    setTrackingAccuracy('fine');
    await Promise.resolve();

    expect(mockWatchPositionAsync).not.toHaveBeenCalled();
    expect(mockSubscriptionRemove).not.toHaveBeenCalled();
  });
});

// ─── setTrackingAccuracy — correct options passed ─────────────────────────────

describe('setTrackingAccuracy — passes correct options to watchPositionAsync', () => {
  it('uses low-accuracy options in coarse mode', async () => {
    startTracking(noop); // coarse (default)
    await Promise.resolve();
    const [opts] = mockWatchPositionAsync.mock.calls[0];

    expect(opts.accuracy).toBe(3);   // Location.Accuracy.Balanced
    expect(opts.distanceInterval).toBe(100);
    expect(opts.timeInterval).toBe(30_000);
  });

  it('uses high-accuracy options in fine mode', async () => {
    setTrackingAccuracy('fine');
    startTracking(noop);
    await Promise.resolve();
    const [opts] = mockWatchPositionAsync.mock.calls[0];

    expect(opts.accuracy).toBe(4);   // Location.Accuracy.High
    expect(opts.distanceInterval).toBe(25);
    expect(opts.timeInterval).toBe(8_000);
  });
});
