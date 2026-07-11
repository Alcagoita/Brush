/**
 * KAN-245 — isLocationKnown: "does the app already know this area?"
 * True inside a bounded trip/mall download OR anywhere the ambient habitat
 * pool has cached places nearby. Backs the far-pin trip-suggestion signal.
 */

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock'),
);

const mockQueryHabitatCache = jest.fn().mockReturnValue({});

jest.mock('../../src/services/habitatCache', () => ({
  recordLiveResult:           jest.fn(),
  refreshHabitatCacheIfStale: jest.fn().mockResolvedValue(undefined),
  queryHabitatCache:          (...args: unknown[]) => mockQueryHabitatCache(...args),
  findExistingPlaceId:        jest.fn().mockReturnValue(null),
  hasCachedPlaces:            jest.fn().mockReturnValue(false),
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel:       jest.fn().mockResolvedValue(undefined),
    displayNotification: jest.fn().mockResolvedValue(undefined),
  },
  AndroidImportance: { HIGH: 4 },
  AndroidStyle:      { BIGTEXT: 'BIGTEXT' },
}));

jest.mock('react-native', () => ({
  Platform:            { OS: 'android' },
  NativeModules:       { WearNotificationModule: { sendProximityAlert: jest.fn() } },
  InteractionManager:  { runAfterInteractions: (cb: () => void) => cb() },
}));

jest.mock('../../src/services/firestore', () => ({
  markAllPoiAlertsSeen: jest.fn().mockResolvedValue(undefined),
  markPoiAlertSeen:     jest.fn().mockResolvedValue(undefined),
  markExitPromptSeen:   jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/geolocation', () => ({
  getPositionLowAccuracy:    jest.fn(),
  requestLocationPermission: jest.fn().mockResolvedValue('granted'),
}));

jest.mock('../../src/services/notifications', () => ({
  fireExitPrompt: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/config/keys', () => ({
  GOOGLE_PLACES_API_KEY: 'TEST_KEY',
}));

jest.mock('../../src/native/WearNotificationModule', () => ({
  sendProximityAlert: jest.fn(),
}));

import { isLocationKnown, setActiveTrips, setMallSnapshot, resetProximityState, getActiveOffGridWindow } from '../../src/services/proximity';
import type { Trip, MallSnapshot } from '../../src/types';

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1', destination: 'Faro', placeRef: 'place-abc',
    centerLat: 37.0, centerLng: -7.9, areaRadius: 5_000,
    cacheAreaId: 'ta_1', expiresAt: Date.now() + 1_000_000,
    createdAt: {} as unknown as Trip['createdAt'],
    ...overrides,
  };
}

function makeMallSnapshot(overrides: Partial<MallSnapshot> = {}): MallSnapshot {
  return {
    placeId: 'mall-1', name: 'Test Mall', centerLat: 10, centerLng: 10, radius: 300,
    cacheAreaId: 'mall_snapshot', expiresAt: Date.now() + 1_000_000,
    createdAt: {} as unknown as MallSnapshot['createdAt'],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockQueryHabitatCache.mockReturnValue({});
  resetProximityState();
  setActiveTrips(null);
  setMallSnapshot(null);
});

describe('isLocationKnown', () => {
  it('is false when there is no trip/mall coverage and the habitat cache is empty here', () => {
    expect(isLocationKnown(0, 0)).toBe(false);
  });

  it('is true inside an active trip area', () => {
    setActiveTrips([makeTrip()]);
    expect(isLocationKnown(37.0, -7.9)).toBe(true);
  });

  it('is false outside every active trip area', () => {
    setActiveTrips([makeTrip()]);
    expect(isLocationKnown(0, 0)).toBe(false);
  });

  it('is true inside the active mall snapshot', () => {
    setMallSnapshot(makeMallSnapshot());
    expect(isLocationKnown(10, 10)).toBe(true);
  });

  it('is false once the trip has expired', () => {
    setActiveTrips([makeTrip({ expiresAt: Date.now() - 1_000 })]);
    expect(isLocationKnown(37.0, -7.9)).toBe(false);
  });

  it('is true when the ambient habitat cache has any place near this point', () => {
    mockQueryHabitatCache.mockReturnValue({ atm: [{ placeId: 'p1', name: 'ATM', lat: 0, lng: 0, distanceMeters: 10 }] });
    expect(isLocationKnown(0, 0)).toBe(true);
  });

  it('is false when the habitat cache returns only empty arrays', () => {
    mockQueryHabitatCache.mockReturnValue({ atm: [], cafe: [] });
    expect(isLocationKnown(0, 0)).toBe(false);
  });
});

describe('getActiveOffGridWindow (KAN-246)', () => {
  it('is null when there is no active off-grid trip', () => {
    expect(getActiveOffGridWindow()).toBeNull();
  });

  it('is null when a regular (non-offgrid) trip is active', () => {
    setActiveTrips([makeTrip()]);
    expect(getActiveOffGridWindow()).toBeNull();
  });

  it('returns the destination + expiresAt of an active off-grid trip', () => {
    setActiveTrips([makeTrip({ kind: 'offgrid', destination: 'this area', expiresAt: Date.now() + 500_000 })]);
    const window = getActiveOffGridWindow();
    expect(window?.destination).toBe('this area');
    expect(window?.expiresAt).toBeGreaterThan(Date.now());
  });

  it('is null once the off-grid trip has expired', () => {
    setActiveTrips([makeTrip({ kind: 'offgrid', expiresAt: Date.now() - 1_000 })]);
    expect(getActiveOffGridWindow()).toBeNull();
  });

  it('does not depend on position — active regardless of where the caller is', () => {
    setActiveTrips([makeTrip({ kind: 'offgrid', centerLat: 80, centerLng: 80, areaRadius: 100, expiresAt: Date.now() + 500_000 })]);
    // The caller is nowhere near (80, 80), but the window is still "active".
    expect(getActiveOffGridWindow()).not.toBeNull();
  });
});
