/**
 * KAN-515 — the Profile "High accuracy" switch: loads the saved choice,
 * switches the location watcher immediately, saves, and puts everything back
 * if the save fails.
 */
import { act, renderHook } from '@testing-library/react-native';

const mockSetTrackingAccuracy = jest.fn();
jest.mock('../../src/services/geolocation', () => ({
  setTrackingAccuracy: (...args: unknown[]) => mockSetTrackingAccuracy(...args),
}));
const mockGetHighAccuracyPref = jest.fn();
const mockSetHighAccuracyPref = jest.fn();
jest.mock('../../src/services/firestore', () => ({
  getHighAccuracyPref: (...args: unknown[]) => mockGetHighAccuracyPref(...args),
  setHighAccuracyPref: (...args: unknown[]) => mockSetHighAccuracyPref(...args),
}));
jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => ({ currentUser: { uid: 'uid-1' } }),
}));
jest.mock('@react-native-firebase/auth', () => ({}));

import { useHighAccuracyToggle } from '../../src/hooks/useHighAccuracyToggle';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetHighAccuracyPref.mockResolvedValue(false);
  mockSetHighAccuracyPref.mockResolvedValue(undefined);
});

it('shows the saved choice', async () => {
  mockGetHighAccuracyPref.mockResolvedValue(true);
  const { result } = renderHook(() => useHighAccuracyToggle());
  await act(async () => {});
  expect(result.current.enabled).toBe(true);
  expect(mockGetHighAccuracyPref).toHaveBeenCalledWith('uid-1');
});

it('switches the watcher to fine at once and saves the choice', async () => {
  const { result } = renderHook(() => useHighAccuracyToggle());
  await act(async () => {});

  await act(async () => { await result.current.toggle(true); });

  expect(mockSetTrackingAccuracy).toHaveBeenCalledWith('fine');
  expect(mockSetHighAccuracyPref).toHaveBeenCalledWith('uid-1', true);
  expect(result.current.enabled).toBe(true);
});

it('switches back to coarse when turned off', async () => {
  mockGetHighAccuracyPref.mockResolvedValue(true);
  const { result } = renderHook(() => useHighAccuracyToggle());
  await act(async () => {});

  await act(async () => { await result.current.toggle(false); });

  expect(mockSetTrackingAccuracy).toHaveBeenLastCalledWith('coarse');
  expect(mockSetHighAccuracyPref).toHaveBeenCalledWith('uid-1', false);
});

it('puts the switch and the watcher back when the save fails', async () => {
  mockSetHighAccuracyPref.mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useHighAccuracyToggle());
  await act(async () => {});

  await act(async () => { await result.current.toggle(true); });

  expect(mockSetTrackingAccuracy.mock.calls).toEqual([['fine'], ['coarse']]);
  expect(result.current.enabled).toBe(false);
});

it('keeps the user\'s flip when the first read lands after it', async () => {
  let resolveRead: (value: boolean) => void = () => {};
  mockGetHighAccuracyPref.mockReturnValue(new Promise<boolean>(resolve => { resolveRead = resolve; }));
  const { result } = renderHook(() => useHighAccuracyToggle());

  await act(async () => { await result.current.toggle(true); });
  await act(async () => { resolveRead(false); });

  expect(result.current.enabled).toBe(true);
  expect(mockSetTrackingAccuracy).toHaveBeenLastCalledWith('fine');
});

it('ends on the saved value when two overlapping saves both fail', async () => {
  const rejects: Array<(err: Error) => void> = [];
  mockSetHighAccuracyPref.mockImplementation(() => new Promise<void>((_, reject) => { rejects.push(reject); }));
  const { result } = renderHook(() => useHighAccuracyToggle());
  await act(async () => {}); // saved value: false

  let first: Promise<void> = Promise.resolve();
  let second: Promise<void> = Promise.resolve();
  act(() => { first = result.current.toggle(true); });
  act(() => { second = result.current.toggle(false); });

  // Saves run one at a time: fail the first, then the second once it starts.
  await act(async () => { await Promise.resolve(); });
  rejects[0](new Error('offline'));
  await act(async () => { await first; });
  expect(mockSetHighAccuracyPref).toHaveBeenCalledTimes(2);
  rejects[1](new Error('offline'));
  await act(async () => { await second; });

  expect(result.current.enabled).toBe(false);
  expect(mockSetTrackingAccuracy).toHaveBeenLastCalledWith('coarse');
});
