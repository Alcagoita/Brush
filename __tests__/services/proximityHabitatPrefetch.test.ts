/**
 * KAN-238 — habitat cache prefetch: all POI types, not just open-task types.
 *
 * Covers:
 *   - refreshHabitatCacheIfStale is fed ALL_POI_TYPES (all 16 built-ins),
 *     not just this tick's uniquePoiTypes derived from open tasks — so a
 *     task created later for a never-before-seen type still finds cached
 *     candidates offline
 *   - the user's custom category place types (setCustomCategoryPoiTypes)
 *     are folded into the same prefetch list, deduped against the built-ins
 *   - the live Places search and queryHabitatCache (the read/query side)
 *     stay filtered to this tick's actual open-task types, unchanged
 *   - setCustomCategoryPoiTypes(null) / resetProximityState() clear the
 *     custom types back to just the 16 built-ins
 */

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock'),
);

const mockRecordLiveResult           = jest.fn();
const mockRefreshHabitatCacheIfStale = jest.fn().mockResolvedValue(undefined);
const mockQueryHabitatCache          = jest.fn().mockReturnValue({});
const mockFindExistingPlaceId        = jest.fn().mockReturnValue(null);
const mockHasCachedPlaces            = jest.fn().mockReturnValue(false);

jest.mock('../../src/services/habitatCache', () => ({
  recordLiveResult:           (...args: unknown[]) => mockRecordLiveResult(...args),
  refreshHabitatCacheIfStale: (...args: unknown[]) => mockRefreshHabitatCacheIfStale(...args),
  queryHabitatCache:          (...args: unknown[]) => mockQueryHabitatCache(...args),
  findExistingPlaceId:        (...args: unknown[]) => mockFindExistingPlaceId(...args),
  hasCachedPlaces:            (...args: unknown[]) => mockHasCachedPlaces(...args),
}));

jest.mock('../../src/services/proximitySnapshot');

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

const mockGetPosition = jest.fn();
jest.mock('../../src/services/geolocation', () => ({
  getPositionLowAccuracy:    (...args: unknown[]) => mockGetPosition(...args),
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

jest.mock('../../src/constants/copy', () => ({
  COPY: {
    notification: {
      proximityTitle: (label: string) => `You're near ${label}`,
      proximityBody:  (count: number) => `${count} task(s) nearby`,
    },
    offline: { genericBanner: '', noCacheYetBanner: '', uncoveredAreaToast: '' },
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {
  runProximitySearch,
  resetProximityState,
  setCustomCategoryPoiTypes,
} from '../../src/services/proximity';
import { ALL_POI_TYPES } from '../../src/types';
import type { Task } from '../../src/types';
import NetInfo from '@react-native-community/netinfo';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORIGIN = { lat: 0, lng: 0, accuracy: 10 };

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id:        'task-1',
    title:     'Get cash',
    category:  'errands',
    done:      false,
    poi:       'atm',
    date:      '2026-07-05',
    createdAt: { toDate: () => new Date() } as unknown as Task['createdAt'],
    ...overrides,
  };
}

function mockAtmSearchResponse() {
  mockFetch.mockResolvedValueOnce({
    ok:   true,
    json: async () => ({
      places: [{ id: 'atm-1', displayName: { text: 'Corner ATM' }, location: { latitude: 0.0002, longitude: 0 }, types: ['atm'] }],
    }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  mockGetPosition.mockResolvedValue(ORIGIN);
  jest.spyOn(Date.prototype, 'getHours').mockReturnValue(10);
  resetProximityState();
});

describe('habitat cache prefetch covers all POI types', () => {
  it('feeds refreshHabitatCacheIfStale ALL_POI_TYPES, not just the open task\'s single type', async () => {
    mockAtmSearchResponse();

    await runProximitySearch('uid-1', [makeTask({ poi: 'atm' })], jest.fn());

    expect(mockRefreshHabitatCacheIfStale).toHaveBeenCalledTimes(1);
    const [, , prefetchedTypes] = mockRefreshHabitatCacheIfStale.mock.calls[0];
    expect(new Set(prefetchedTypes)).toEqual(new Set(ALL_POI_TYPES));
    expect(ALL_POI_TYPES).toHaveLength(16);
    // Explicitly proves the fix: pharmacy has no open task this tick, yet
    // it's still prefetched — this is exactly the "buy aspirin later" gap.
    expect(prefetchedTypes).toContain('pharmacy');
  });

  it('folds in custom category place types, deduped against the built-ins', async () => {
    setCustomCategoryPoiTypes(['gym', 'my_custom_type']);
    mockAtmSearchResponse();

    await runProximitySearch('uid-1', [makeTask({ poi: 'atm' })], jest.fn());

    const [, , prefetchedTypes] = mockRefreshHabitatCacheIfStale.mock.calls[0];
    expect(prefetchedTypes).toContain('my_custom_type');
    // 'gym' is already a built-in — must not be duplicated.
    expect(prefetchedTypes.filter((t: string) => t === 'gym')).toHaveLength(1);
    expect(new Set(prefetchedTypes).size).toBe(prefetchedTypes.length);
  });

  it('leaves the live Places search filtered to the tick\'s actual open-task types', async () => {
    mockAtmSearchResponse();

    await runProximitySearch('uid-1', [makeTask({ poi: 'atm' })], jest.fn());

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.includedTypes).toEqual(['atm']);
  });

  it('leaves queryHabitatCache (the offline read path) filtered to the tick\'s open-task types', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({ isConnected: false });
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    mockQueryHabitatCache.mockReturnValue({ atm: [] });

    await runProximitySearch('uid-1', [makeTask({ poi: 'atm' })], jest.fn());

    expect(mockQueryHabitatCache).toHaveBeenCalledWith(0, 0, ['atm'], 400);
  });

  it('setCustomCategoryPoiTypes(null) clears back to just the built-ins', async () => {
    setCustomCategoryPoiTypes(['my_custom_type']);
    setCustomCategoryPoiTypes(null);
    mockAtmSearchResponse();

    await runProximitySearch('uid-1', [makeTask({ poi: 'atm' })], jest.fn());

    const [, , prefetchedTypes] = mockRefreshHabitatCacheIfStale.mock.calls[0];
    expect(prefetchedTypes).not.toContain('my_custom_type');
  });

  it('resetProximityState() clears custom category types', async () => {
    setCustomCategoryPoiTypes(['my_custom_type']);
    resetProximityState();
    mockAtmSearchResponse();

    await runProximitySearch('uid-1', [makeTask({ poi: 'atm' })], jest.fn());

    const [, , prefetchedTypes] = mockRefreshHabitatCacheIfStale.mock.calls[0];
    expect(prefetchedTypes).not.toContain('my_custom_type');
  });
});
