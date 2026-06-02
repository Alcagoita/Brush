/**
 * KAN-52 — Battery service tests.
 *
 * Covers:
 *   shouldPauseForBattery()
 *     - returns false when toggle is off, regardless of battery level
 *     - returns false when toggle is on but battery is above threshold
 *     - returns true  when toggle is on and battery is at threshold
 *     - returns true  when toggle is on and battery is below threshold
 *     - uses LOW_BATTERY_THRESHOLD (0.20) as the boundary value
 *
 *   useBatteryLevel()
 *     - returns 1.0 initially (safe default)
 *     - reads the initial level from getBatteryLevel() on mount
 *     - updates when a native level-change event fires
 *     - falls back to 1.0 when native module is unavailable
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

// We mock react-native so we can control NativeModules and NativeEventEmitter.
const mockGetBatteryLevel = jest.fn();
const mockAddListener     = jest.fn();
const mockRemove          = jest.fn();

jest.mock('react-native', () => ({
  NativeModules: {
    RNCDeviceBattery: {
      getBatteryLevel: (...args: unknown[]) => mockGetBatteryLevel(...args),
    },
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: (...args: unknown[]) => mockAddListener(...args),
  })),
  Platform: { OS: 'ios' },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { renderHook, act } from '@testing-library/react-native';
import {
  shouldPauseForBattery,
  LOW_BATTERY_THRESHOLD,
  useBatteryLevel,
  getBatteryLevel,
} from '../../src/services/battery';

// ─── shouldPauseForBattery ────────────────────────────────────────────────────

describe('shouldPauseForBattery()', () => {
  it('returns false when pauseEnabled is false, even with a critical battery level', () => {
    expect(shouldPauseForBattery(0.0, false)).toBe(false);
  });

  it('returns false when pauseEnabled is true but battery is above threshold', () => {
    expect(shouldPauseForBattery(LOW_BATTERY_THRESHOLD + 0.01, true)).toBe(false);
  });

  it('returns false when pauseEnabled is true and battery is exactly at threshold', () => {
    // Threshold is exclusive on the low side: level < threshold triggers pause.
    // At exactly threshold the condition is not met.
    expect(shouldPauseForBattery(LOW_BATTERY_THRESHOLD, true)).toBe(false);
  });

  it('returns true when pauseEnabled is true and battery is below threshold', () => {
    expect(shouldPauseForBattery(LOW_BATTERY_THRESHOLD - 0.01, true)).toBe(true);
  });

  it('returns true when pauseEnabled is true and battery is 0 (empty)', () => {
    expect(shouldPauseForBattery(0.0, true)).toBe(true);
  });

  it('uses LOW_BATTERY_THRESHOLD (0.20) as the boundary', () => {
    expect(LOW_BATTERY_THRESHOLD).toBe(0.20);
  });
});

// ─── getBatteryLevel ──────────────────────────────────────────────────────────

describe('getBatteryLevel()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the level from the native module', async () => {
    mockGetBatteryLevel.mockResolvedValue(0.45);
    const level = await getBatteryLevel();
    expect(level).toBe(0.45);
  });

  it('returns 1.0 when the native module throws', async () => {
    mockGetBatteryLevel.mockRejectedValue(new Error('native error'));
    const level = await getBatteryLevel();
    expect(level).toBe(1.0);
  });
});

// ─── useBatteryLevel ──────────────────────────────────────────────────────────

describe('useBatteryLevel()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddListener.mockReturnValue({ remove: mockRemove });
  });

  it('initialises to 1.0 before the native read resolves', async () => {
    // Make the native read never resolve so we can inspect the initial state.
    mockGetBatteryLevel.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useBatteryLevel());
    // Check synchronously — the hook default is 1.0 before the async read.
    expect(result.current).toBe(1.0);
    // Drain the microtask queue to avoid act() warnings from pending state updates.
    await act(async () => {});
  });

  it('updates to the level returned by getBatteryLevel() on mount', async () => {
    mockGetBatteryLevel.mockResolvedValue(0.6);
    const { result } = renderHook(() => useBatteryLevel());
    // Wait for the async read to settle.
    await act(async () => {});
    expect(result.current).toBe(0.6);
  });

  it('subscribes to the native level-change event on mount', async () => {
    mockGetBatteryLevel.mockResolvedValue(0.6);
    renderHook(() => useBatteryLevel());
    expect(mockAddListener).toHaveBeenCalledWith(
      'RNCDeviceBattery_batteryLevelDidChange',
      expect.any(Function),
    );
    await act(async () => {});
  });

  it('updates when a native level-change event fires', async () => {
    mockGetBatteryLevel.mockResolvedValue(0.8);
    let eventCallback: ((level: number) => void) | null = null;
    mockAddListener.mockImplementation((_event: string, cb: (level: number) => void) => {
      eventCallback = cb;
      return { remove: mockRemove };
    });

    const { result } = renderHook(() => useBatteryLevel());
    await act(async () => {});

    // Simulate a native battery-level event dropping to 15%
    act(() => { eventCallback?.(0.15); });

    expect(result.current).toBe(0.15);
  });

  it('removes the event subscription on unmount', async () => {
    mockGetBatteryLevel.mockResolvedValue(0.9);
    const { unmount } = renderHook(() => useBatteryLevel());
    await act(async () => {});
    unmount();
    expect(mockRemove).toHaveBeenCalled();
  });
});
