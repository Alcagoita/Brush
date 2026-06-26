/**
 * KAN-198 — getPositionLowAccuracy GPS fallback test.
 *
 * When network-based (Balanced) positioning fails (e.g. device is offline),
 * getPositionLowAccuracy must retry with High accuracy (GPS) so proximity
 * checks continue working with no internet connection.
 */

const mockGetCurrentPositionAsync = jest.fn();

jest.mock('expo-location', () => ({
  Accuracy: {
    High:     4,
    Balanced: 3,
    Low:      2,
  },
  requestForegroundPermissionsAsync:  jest.fn(),
  requestBackgroundPermissionsAsync:  jest.fn(),
  watchPositionAsync:                 jest.fn(),
  getCurrentPositionAsync:            (...args: unknown[]) => mockGetCurrentPositionAsync(...args),
}));

jest.mock('react-native', () => ({
  Alert:   { alert: jest.fn() },
  Linking: { openSettings: jest.fn() },
  Platform: { OS: 'android' },
}));

import { Accuracy } from 'expo-location';
import { getPositionLowAccuracy } from '../../src/services/geolocation';

const makePosition = (lat: number, lng: number) => ({
  coords: { latitude: lat, longitude: lng, accuracy: 20 },
  timestamp: 1_700_000_000,
});

describe('getPositionLowAccuracy — GPS fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns Balanced result when network positioning succeeds', async () => {
    mockGetCurrentPositionAsync.mockResolvedValueOnce(makePosition(38.7, -9.1));

    const coords = await getPositionLowAccuracy();

    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(1);
    expect(mockGetCurrentPositionAsync).toHaveBeenCalledWith(
      expect.objectContaining({ accuracy: Accuracy.Balanced }),
    );
    expect(coords.lat).toBe(38.7);
    expect(coords.lng).toBe(-9.1);
  });

  it('falls back to GPS (High) when Balanced call fails', async () => {
    mockGetCurrentPositionAsync
      .mockRejectedValueOnce(new Error('Network location unavailable'))
      .mockResolvedValueOnce(makePosition(38.71, -9.12));

    const coords = await getPositionLowAccuracy();

    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(2);
    expect(mockGetCurrentPositionAsync).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ accuracy: Accuracy.High }),
    );
    expect(coords.lat).toBe(38.71);
    expect(coords.lng).toBe(-9.12);
  });

  it('throws when both Balanced and GPS fail', async () => {
    mockGetCurrentPositionAsync
      .mockRejectedValueOnce(new Error('No network'))
      .mockRejectedValueOnce(new Error('GPS timeout'));

    await expect(getPositionLowAccuracy()).rejects.toThrow('GPS timeout');
    expect(mockGetCurrentPositionAsync).toHaveBeenCalledTimes(2);
  });
});
