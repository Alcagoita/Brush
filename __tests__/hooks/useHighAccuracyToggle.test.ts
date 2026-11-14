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
