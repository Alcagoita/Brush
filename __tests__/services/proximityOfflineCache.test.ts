/**
 * KAN-229 — Cache-backed offline proximity.
 *
 * Covers:
 *   - a live searchNearbyPlaces failure while offline answers from the
 *     habitat cache instead of just queuing — hero split, notification and
 *     exit-prompt all run off the cache's Record<string, NearbyPlace[]>,
 *     exactly as they would off a live result (the AC's "impersonates the
 *     Places response")
 *   - the offline tick still enqueues the search so a live refresh replaces
 *     it on reconnect (KAN-205 queue untouched)
 *   - the offline tick does NOT feed the habitat cache's live-seed/refresh
 *     path — there's no live data to seed back into it
 *   - a live result already known to the cache (findExistingPlaceId returns
 *     a match) gets remapped to that stable internal id, so a place doesn't
 *     look "different" to the exit-prompt dwell tracker or the Nearby
 *     card's carousel after a source flip
 *   - a live result with NO cache match keeps its own Google placeId
 *     unchanged (regression guard: must never substitute a fresh throwaway
 *     id, which would defeat identity continuity for every not-yet-cached
 *     place)
 *   - alert dedup survives a source switch: a notification fired from a
 *     cache-answered tick suppresses the same notification from a
 *     live-answered tick for the same place/type later that day
 *   - a cache miss (offline, nothing cached for this area) does not call
 *     onUpdate at all — a transient "no answer" tick must not clear
 *     whatever hero/grey state was already on screen
 *   - identity reconciliation only reads the cache once per type (the
 *     nearest place), plus once more per extra place but ONLY for the
 *     type that actually won the hero slot — never for every place of
 *     every type (avoids an N+1 synchronous SQLite read per search)
 */

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock'),
);

const mockRecordLiveResult            = jest.fn();
const mockRefreshHabitatCacheIfStale  = jest.fn().mockResolvedValue(undefined);
const mockQueryHabitatCache           = jest.fn().mockReturnValue({});
const mockFindExistingPlaceId         = jest.fn().mockReturnValue(null);

jest.mock('../../src/services/habitatCache', () => ({
  recordLiveResult:           (...args: unknown[]) => mockRecordLiveResult(...args),
  refreshHabitatCacheIfStale: (...args: unknown[]) => mockRefreshHabitatCacheIfStale(...args),
  queryHabitatCache:          (...args: unknown[]) => mockQueryHabitatCache(...args),
  findExistingPlaceId:        (...args: unknown[]) => mockFindExistingPlaceId(...args),
}));

const mockDisplayNotification = jest.fn().mockResolvedValue(undefined);
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel:       jest.fn().mockResolvedValue(undefined),
    displayNotification: (...args: unknown[]) => mockDisplayNotification(...args),
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
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { runProximitySearch, resetProximityState, __getPendingQueue } from '../../src/services/proximity';
import type { Task } from '../../src/types';
import type { NearbyPlace } from '../../src/services/maps';
import NetInfo from '@react-native-community/netinfo';

function goOffline(): void {
  (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({ isConnected: false });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORIGIN = { lat: 0, lng: 0, accuracy: 10 };

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id:        'task-1',
    title:     'Get cash',
    category:  'errands',
    done:      false,
    poi:       'atm',
    date:      '2026-07-04',
    createdAt: { toDate: () => new Date() } as unknown as Task['createdAt'],
    ...overrides,
  };
}

function cachedPlace(overrides: Partial<NearbyPlace> = {}): NearbyPlace {
  return { placeId: 'hp_cached_1', name: 'Cached ATM', lat: 0.0002, lng: 0, distanceMeters: 22, ...overrides };
}

/** Flushes the fire-and-forget notification promise chain (createChannel → displayNotification). */
async function flushAsync(): Promise<void> {
  await new Promise<void>(resolve => setImmediate(resolve));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  mockGetPosition.mockResolvedValue(ORIGIN);
  mockQueryHabitatCache.mockReturnValue({});
  mockFindExistingPlaceId.mockReturnValue(null);
  // Pin the clock to business hours so isQuietHours() never suppresses
  // the notification assertions below.
  jest.spyOn(Date.prototype, 'getHours').mockReturnValue(10);
  resetProximityState();
});

describe('offline branch answers from the habitat cache', () => {
  it('fires the hero card and notification off a cached hit when the live search fails offline', async () => {
    goOffline();
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    mockQueryHabitatCache.mockReturnValue({ atm: [cachedPlace()] });

    const onUpdate = jest.fn();
    await runProximitySearch('uid-1', [makeTask()], onUpdate);
    await flushAsync();

    expect(mockQueryHabitatCache).toHaveBeenCalledWith(0, 0, ['atm'], 400);
    expect(onUpdate).toHaveBeenCalledWith(
      'atm',
      expect.objectContaining({ placeId: 'hp_cached_1', name: 'Cached ATM' }),
      expect.objectContaining({ atm: [expect.objectContaining({ placeId: 'hp_cached_1' })] }),
    );
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
  });

  it('still enqueues the search for a live refresh on reconnect', async () => {
    goOffline();
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    mockQueryHabitatCache.mockReturnValue({ atm: [cachedPlace()] });

    await runProximitySearch('uid-1', [makeTask()], jest.fn());

    expect(__getPendingQueue()).toHaveLength(1);
  });

  it('does not seed the live-result cache or trigger a refresh from a cache-answered tick', async () => {
    goOffline();
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    mockQueryHabitatCache.mockReturnValue({ atm: [cachedPlace()] });

    await runProximitySearch('uid-1', [makeTask()], jest.fn());

    expect(mockRecordLiveResult).not.toHaveBeenCalled();
    expect(mockRefreshHabitatCacheIfStale).not.toHaveBeenCalled();
  });

  it('does not remap cache-sourced placeIds through findExistingPlaceId (already internal ids)', async () => {
    goOffline();
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    mockQueryHabitatCache.mockReturnValue({ atm: [cachedPlace()] });

    await runProximitySearch('uid-1', [makeTask()], jest.fn());

    expect(mockFindExistingPlaceId).not.toHaveBeenCalled();
  });

  it('does not call onUpdate on a cache miss — preserves whatever was already on screen', async () => {
    goOffline();
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    mockQueryHabitatCache.mockReturnValue({ atm: [] }); // nothing cached for this area yet

    const onUpdate = jest.fn();
    await runProximitySearch('uid-1', [makeTask()], onUpdate);

    expect(onUpdate).not.toHaveBeenCalled();
    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  it('still enqueues for a live retry on a cache miss', async () => {
    goOffline();
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    mockQueryHabitatCache.mockReturnValue({ atm: [] });

    await runProximitySearch('uid-1', [makeTask()], jest.fn());

    expect(__getPendingQueue()).toHaveLength(1);
  });
});

describe('live results reconcile against the cache identity table', () => {
  it('remaps a live place to its existing internal id when the cache already knows it', async () => {
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: async () => ({
        places: [{ id: 'ChIJlive1', displayName: { text: 'Live ATM' }, location: { latitude: 0.0002, longitude: 0 }, types: ['atm'] }],
      }),
    });
    mockFindExistingPlaceId.mockReturnValue('hp_shared_1');

    const onUpdate = jest.fn();
    await runProximitySearch('uid-1', [makeTask()], onUpdate);

    expect(onUpdate).toHaveBeenCalledWith(
      'atm',
      expect.objectContaining({ placeId: 'hp_shared_1' }),
      expect.anything(),
    );
  });

  it('keeps a live place on its own Google placeId when the cache has no match yet', async () => {
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: async () => ({
        places: [{ id: 'ChIJlive1', displayName: { text: 'Live ATM' }, location: { latitude: 0.0002, longitude: 0 }, types: ['atm'] }],
      }),
    });
    mockFindExistingPlaceId.mockReturnValue(null);

    const onUpdate = jest.fn();
    await runProximitySearch('uid-1', [makeTask()], onUpdate);

    expect(onUpdate).toHaveBeenCalledWith(
      'atm',
      expect.objectContaining({ placeId: 'ChIJlive1' }),
      expect.anything(),
    );
  });

  it('reconciles only the nearest place per type, plus the hero type\'s remaining places — never every place of every type', async () => {
    const LAT_PER_METRE = 1 / 111_195;
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: async () => ({
        places: [
          { id: 'atm-near', displayName: { text: 'Near ATM' }, location: { latitude: LAT_PER_METRE * 30, longitude: 0 }, types: ['atm'] },
          { id: 'atm-far',  displayName: { text: 'Far ATM' },  location: { latitude: LAT_PER_METRE * 80, longitude: 0 }, types: ['atm'] },
          { id: 'cafe-near', displayName: { text: 'Near Cafe' }, location: { latitude: LAT_PER_METRE * 150, longitude: 0 }, types: ['cafe'] },
          { id: 'cafe-far',  displayName: { text: 'Far Cafe' },  location: { latitude: LAT_PER_METRE * 200, longitude: 0 }, types: ['cafe'] },
        ],
      }),
    });
    mockFindExistingPlaceId.mockReturnValue(null);

    const tasks = [makeTask({ id: 't1', poi: 'atm' }), makeTask({ id: 't2', poi: 'cafe' })];
    await runProximitySearch('uid-1', tasks, jest.fn());

    // atm is the hero type (nearest < HERO_RADIUS_M) — both its places get
    // reconciled (nearest in pass 1, "Far ATM" in the hero-only pass 2).
    // cafe is only a grey/"approaching" type — just its nearest place is
    // ever looked up; "Far Cafe" is never queried.
    expect(mockFindExistingPlaceId).toHaveBeenCalledTimes(3);
    expect(mockFindExistingPlaceId).toHaveBeenCalledWith('atm', 'Near ATM', expect.any(Number), expect.any(Number));
    expect(mockFindExistingPlaceId).toHaveBeenCalledWith('atm', 'Far ATM', expect.any(Number), expect.any(Number));
    expect(mockFindExistingPlaceId).toHaveBeenCalledWith('cafe', 'Near Cafe', expect.any(Number), expect.any(Number));
    expect(mockFindExistingPlaceId).not.toHaveBeenCalledWith('cafe', 'Far Cafe', expect.any(Number), expect.any(Number));
  });
});

describe('alert dedup survives a source switch', () => {
  it('does not re-fire a notification from a live hit for a type already alerted from a cache hit', async () => {
    // Tick 1 — offline, cache answers, fires the notification.
    goOffline();
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    mockQueryHabitatCache.mockReturnValue({ atm: [cachedPlace()] });
    await runProximitySearch('uid-1', [makeTask()], jest.fn());
    await flushAsync();
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);

    // Tick 2 — back online, live search finds the same place (remapped to
    // the same internal id via findExistingPlaceId) — must not re-fire.
    mockDisplayNotification.mockClear();
    mockFindExistingPlaceId.mockReturnValue('hp_cached_1');
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: async () => ({
        places: [{ id: 'ChIJlive1', displayName: { text: 'Live ATM' }, location: { latitude: 0.0002, longitude: 0 }, types: ['atm'] }],
      }),
    });

    await runProximitySearch('uid-1', [makeTask()], jest.fn());

    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });
});
