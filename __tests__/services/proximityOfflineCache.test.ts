/**
 * KAN-229 — Cache-backed offline proximity.
 * KAN-236 — Offline expectations messaging (the "moved beyond coverage" toast).
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
 *   - a cache miss fires a one-time, once-per-session toast when the cache
 *     has data *somewhere* (the user has walked beyond its coverage) but
 *     stays silent when the cache is empty everywhere (that's NetworkBanner's
 *     job, not a toast) or when the cache actually answered (not a miss)
 */

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock'),
);

const mockRecordLiveResult            = jest.fn();
const mockRefreshHabitatCacheIfStale  = jest.fn().mockResolvedValue(undefined);
const mockQueryHabitatCache           = jest.fn().mockReturnValue({});
const mockFindExistingPlaceId         = jest.fn().mockReturnValue(null);
const mockHasCachedPlaces             = jest.fn().mockReturnValue(false);

jest.mock('../../src/services/habitatCache', () => ({
  recordLiveResult:           (...args: unknown[]) => mockRecordLiveResult(...args),
  refreshHabitatCacheIfStale: (...args: unknown[]) => mockRefreshHabitatCacheIfStale(...args),
  queryHabitatCache:          (...args: unknown[]) => mockQueryHabitatCache(...args),
  findExistingPlaceId:        (...args: unknown[]) => mockFindExistingPlaceId(...args),
  hasCachedPlaces:            (...args: unknown[]) => mockHasCachedPlaces(...args),
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
    offline: {
      genericBanner:       'Offline — changes may not sync',
      noCacheYetBanner:    "No connection — I can't look around for places yet. I'll start learning your area once you're online.",
      uncoveredAreaToast:  "You're outside the area I know by heart — I'll need a connection to spot places here.",
    },
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { runProximitySearch, resetProximityState, __getPendingQueue, setActiveTrips, setMallSnapshot, setPlaceContextTap } from '../../src/services/proximity';
import type { Task, Trip, MallSnapshot } from '../../src/types';
import type { NearbyPlace } from '../../src/services/maps';
import NetInfo from '@react-native-community/netinfo';
import { useToastStore } from '../../src/store/toastStore';
import { COPY } from '../../src/constants/copy';

function goOffline(): void {
  (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({ isConnected: false });
}

/** Connected but no real internet (captive portal) — same "offline" predicate as NetworkBanner. */
function goCaptivePortal(): void {
  (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({ isConnected: true, isInternetReachable: false });
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

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1', destination: 'Faro', placeRef: 'place-abc',
    centerLat: 0, centerLng: 0, areaRadius: 5_000,
    cacheAreaId: 'ta_1', expiresAt: Date.now() + 1_000_000,
    createdAt: {} as unknown as Trip['createdAt'],
    ...overrides,
  };
}

function makeMallSnapshot(overrides: Partial<MallSnapshot> = {}): MallSnapshot {
  return {
    placeId: 'mall-1', name: 'Test Mall', centerLat: 0, centerLng: 0, radius: 300,
    cacheAreaId: 'mall_snapshot', expiresAt: Date.now() + 1_000_000,
    createdAt: {} as unknown as MallSnapshot['createdAt'],
    ...overrides,
  };
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
  mockHasCachedPlaces.mockReturnValue(false);
  useToastStore.setState({ message: null });
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

  it('also answers from the cache when connected but unreachable (captive portal) — same predicate as NetworkBanner', async () => {
    goCaptivePortal();
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    mockQueryHabitatCache.mockReturnValue({ atm: [cachedPlace()] });

    const onUpdate = jest.fn();
    await runProximitySearch('uid-1', [makeTask()], onUpdate);

    expect(onUpdate).toHaveBeenCalledWith(
      'atm',
      expect.objectContaining({ placeId: 'hp_cached_1' }),
      expect.anything(),
    );
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

describe('offline expectations messaging — "moved beyond coverage" toast (KAN-236)', () => {
  it('fires the toast on a cache miss when the cache has data elsewhere', async () => {
    goOffline();
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    mockQueryHabitatCache.mockReturnValue({ atm: [] });
    mockHasCachedPlaces.mockReturnValue(true);

    await runProximitySearch('uid-1', [makeTask()], jest.fn());

    expect(useToastStore.getState().message).toBe(COPY.offline.uncoveredAreaToast);
  });

  it('does not fire the toast on a cache miss when the cache is empty everywhere (state 1, NetworkBanner\'s job)', async () => {
    goOffline();
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    mockQueryHabitatCache.mockReturnValue({ atm: [] });
    mockHasCachedPlaces.mockReturnValue(false);

    await runProximitySearch('uid-1', [makeTask()], jest.fn());

    expect(useToastStore.getState().message).toBeNull();
  });

  it('does not fire the toast when the cache actually answers (not a miss)', async () => {
    goOffline();
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    mockQueryHabitatCache.mockReturnValue({ atm: [cachedPlace()] });
    mockHasCachedPlaces.mockReturnValue(true);

    await runProximitySearch('uid-1', [makeTask()], jest.fn());

    expect(useToastStore.getState().message).toBeNull();
  });

  it('fires at most once per session across repeated cache misses', async () => {
    mockHasCachedPlaces.mockReturnValue(true);

    goOffline();
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    mockQueryHabitatCache.mockReturnValue({ atm: [] });
    await runProximitySearch('uid-1', [makeTask()], jest.fn());
    expect(useToastStore.getState().message).toBe(COPY.offline.uncoveredAreaToast);

    // Dismiss it, then hit another cache miss in the same session.
    useToastStore.getState().hideToast();
    goOffline();
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    mockQueryHabitatCache.mockReturnValue({ atm: [] });
    await runProximitySearch('uid-1', [makeTask()], jest.fn());

    expect(useToastStore.getState().message).toBeNull();
  });

  it('does not re-check the cache once the notice has already fired this session', async () => {
    mockHasCachedPlaces.mockReturnValue(true);

    goOffline();
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    mockQueryHabitatCache.mockReturnValue({ atm: [] });
    await runProximitySearch('uid-1', [makeTask()], jest.fn());
    expect(mockHasCachedPlaces).toHaveBeenCalledTimes(1);

    goOffline();
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    mockQueryHabitatCache.mockReturnValue({ atm: [] });
    await runProximitySearch('uid-1', [makeTask()], jest.fn());

    // The already-shown flag short-circuits before the DB read.
    expect(mockHasCachedPlaces).toHaveBeenCalledTimes(1);
  });

  it('can fire again after resetProximityState (new session)', async () => {
    mockHasCachedPlaces.mockReturnValue(true);

    goOffline();
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    mockQueryHabitatCache.mockReturnValue({ atm: [] });
    await runProximitySearch('uid-1', [makeTask()], jest.fn());
    expect(useToastStore.getState().message).toBe(COPY.offline.uncoveredAreaToast);

    useToastStore.getState().hideToast();
    resetProximityState();

    goOffline();
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    mockQueryHabitatCache.mockReturnValue({ atm: [] });
    await runProximitySearch('uid-1', [makeTask()], jest.fn());

    expect(useToastStore.getState().message).toBe(COPY.offline.uncoveredAreaToast);
  });
});

describe('cache-first coverage (KAN-237) — trip areas and the mall snapshot skip the live API entirely', () => {
  afterEach(() => {
    setActiveTrips(null);
    setMallSnapshot(null);
  });

  it('answers from the cache with zero live API calls while inside an active trip area, even online', async () => {
    setActiveTrips([makeTrip({ centerLat: 0, centerLng: 0, areaRadius: 5_000 })]);
    mockQueryHabitatCache.mockReturnValue({ atm: [cachedPlace()] });

    const onUpdate = jest.fn();
    await runProximitySearch('uid-1', [makeTask()], onUpdate);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockQueryHabitatCache).toHaveBeenCalledWith(0, 0, ['atm'], expect.any(Number));
    expect(onUpdate).toHaveBeenCalledWith('atm', expect.objectContaining({ placeId: 'hp_cached_1' }), expect.anything());
  });

  it('answers from the cache with zero live API calls while inside the mall snapshot, even online', async () => {
    setMallSnapshot(makeMallSnapshot({ centerLat: 0, centerLng: 0, radius: 300 }));
    mockQueryHabitatCache.mockReturnValue({ atm: [cachedPlace()] });

    const onUpdate = jest.fn();
    await runProximitySearch('uid-1', [makeTask()], onUpdate);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(onUpdate).toHaveBeenCalledWith('atm', expect.objectContaining({ placeId: 'hp_cached_1' }), expect.anything());
  });

  it('falls through to the live API when outside any trip/mall area', async () => {
    setActiveTrips([makeTrip({ centerLat: 10, centerLng: 10, areaRadius: 5_000 })]); // far away
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ places: [] }),
    });

    await runProximitySearch('uid-1', [makeTask()], jest.fn());

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockQueryHabitatCache).not.toHaveBeenCalled();
  });

  it('falls through to the live API when the trip has already expired', async () => {
    setActiveTrips([makeTrip({ centerLat: 0, centerLng: 0, areaRadius: 5_000, expiresAt: Date.now() - 1_000 })]);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ places: [] }),
    });

    await runProximitySearch('uid-1', [makeTask()], jest.fn());

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('a cache-first empty result proceeds through to onUpdate (confident "nothing here"), unlike the ambiguous offline-cache-miss path', async () => {
    setActiveTrips([makeTrip({ centerLat: 0, centerLng: 0, areaRadius: 5_000 })]);
    mockQueryHabitatCache.mockReturnValue({ atm: [] });
    mockHasCachedPlaces.mockReturnValue(true); // would otherwise be eligible for the "beyond coverage" toast

    const onUpdate = jest.fn();
    await runProximitySearch('uid-1', [makeTask()], onUpdate);

    // Must clear the hero via onUpdate, not bail out silently, and must not
    // fire the offline "moved beyond coverage" toast — this isn't offline.
    expect(onUpdate).toHaveBeenCalledWith(null, null, {});
    expect(useToastStore.getState().message).toBeNull();
  });
});

describe('place context tap (KAN-242) — feeds the header ContextChip, mall-first on overlap', () => {
  afterEach(() => {
    setActiveTrips(null);
    setMallSnapshot(null);
    setPlaceContextTap(null);
  });

  it('reports the mall when both an active trip and the mall snapshot cover the same position', () => {
    const trip = makeTrip({ centerLat: 0, centerLng: 0, areaRadius: 5_000 });
    const mall = makeMallSnapshot({ centerLat: 0, centerLng: 0, radius: 300 });
    setActiveTrips([trip]);
    setMallSnapshot(mall);

    const tap = jest.fn();
    setPlaceContextTap(tap);

    return runProximitySearch('uid-1', [makeTask()], jest.fn()).then(() => {
      expect(tap).toHaveBeenCalledWith({ kind: 'mall', snapshot: mall });
    });
  });

  it('reports the trip when only a trip area covers the position', () => {
    const trip = makeTrip({ centerLat: 0, centerLng: 0, areaRadius: 5_000 });
    setActiveTrips([trip]);

    const tap = jest.fn();
    setPlaceContextTap(tap);

    return runProximitySearch('uid-1', [makeTask()], jest.fn()).then(() => {
      expect(tap).toHaveBeenCalledWith({ kind: 'trip', trip });
    });
  });

  it('reports null when neither a trip nor the mall snapshot covers the position', () => {
    setActiveTrips([makeTrip({ centerLat: 10, centerLng: 10, areaRadius: 5_000 })]); // far away
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ places: [] }) });

    const tap = jest.fn();
    setPlaceContextTap(tap);

    return runProximitySearch('uid-1', [makeTask()], jest.fn()).then(() => {
      expect(tap).toHaveBeenCalledWith(null);
    });
  });
});
