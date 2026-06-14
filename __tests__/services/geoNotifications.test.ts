/**
 * KAN-27 / KAN-142 / KAN-153 — Geo-triggered local notification tests.
 *
 * Architecture after KAN-153:
 *   - Notifications fire inside runProximitySearch when a new POI type enters
 *     the hero zone (< HERO_RADIUS_M = 100 m) for the first time this session.
 *   - No geofence entry events are needed — the one-shot search handles both
 *     display (onUpdate) and notification delivery.
 *
 * Covers:
 *   - Notification fires when runProximitySearch finds a hero-zone place
 *   - Notification does NOT fire for done tasks / seen-today tasks
 *   - markAllPoiAlertsSeen called for ALL eligible tasks of the POI type
 *   - Android channel created before displayNotification
 *   - NEARBY_RADIUS = 400 m (display threshold, exported constant)
 *   - notif_nearby_enabled = false → no notification
 *   - Quiet hours (10pm–8am) → no notification
 *   - Multiple tasks same POI → one notification, all marked seen
 *   - Singular/plural "thing(s)" in body copy
 *   - a/an article in title ("an ATM" not "a ATM")
 */

// ─── Notifee mock ─────────────────────────────────────────────────────────────

const mockCreateChannel       = jest.fn().mockResolvedValue(undefined);
const mockDisplayNotification = jest.fn().mockResolvedValue(undefined);

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel:       (...args: unknown[]) => mockCreateChannel(...args),
    displayNotification: (...args: unknown[]) => mockDisplayNotification(...args),
  },
  AndroidImportance: { HIGH: 4 },
  AndroidStyle:      { BIGTEXT: 'BIGTEXT' },
}));

jest.mock('react-native', () => ({
  Platform:      { OS: 'android' },
  NativeModules: { WearNotificationModule: { sendProximityAlert: jest.fn() } },
}));

// ─── Firebase / service mocks ─────────────────────────────────────────────────

const mockMarkAllPoiAlertsSeen = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/firestore', () => ({
  markAllPoiAlertsSeen: (...args: unknown[]) => mockMarkAllPoiAlertsSeen(...args),
  markPoiAlertSeen:     jest.fn().mockResolvedValue(undefined),
  markExitPromptSeen:   jest.fn().mockResolvedValue(undefined),
}));

const mockGetPosition = jest.fn();
jest.mock('../../src/services/geolocation', () => ({
  getPositionLowAccuracy: (...args: unknown[]) => mockGetPosition(...args),
  requestLocationPermission: jest.fn().mockResolvedValue('granted'),
}));

jest.mock('../../src/services/nativeGeofence', () => ({
  NativeGeofence: {
    registerGeofence:   jest.fn().mockResolvedValue(undefined),
    removeGeofence:     jest.fn().mockResolvedValue(undefined),
    removeAllGeofences: jest.fn().mockResolvedValue(undefined),
  },
  geofenceEmitter:         null,
  buildGeofenceId:         (poiType: string, placeId: string) => `brush_geo_${poiType}_${placeId}`,
  parseGeofenceId:         jest.fn().mockReturnValue(null),
  GEOFENCE_ENTRY_EVENT:    'onGeofenceEntry',
  GEOFENCE_EXIT_EVENT:     'onGeofenceExit',
  supportsNativeGeofences: true,
}));

jest.mock('../../src/config/keys', () => ({
  GOOGLE_PLACES_API_KEY: 'TEST_KEY',
}));

jest.mock('../../src/services/notifications', () => ({
  fireExitPrompt: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/native/WearNotificationModule', () => ({
  sendProximityAlert: jest.fn(),
}));

// ─── fetch mock ───────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function mockPlacesResponse(places: Array<{
  id: string;
  displayName: { text: string };
  location: { latitude: number; longitude: number };
}>) {
  mockFetch.mockResolvedValueOnce({
    ok:   true,
    json: async () => ({ places }),
  });
}

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {
  runProximitySearch,
  resetProximityState,
  updateNotifNearbyEnabled,
  isQuietHours,
  NEARBY_RADIUS,
} from '../../src/services/proximity';
import type { Task } from '../../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORIGIN = { lat: 0, lng: 0, accuracy: 10 };

/** ATM ~30 m north — inside HERO_RADIUS_M (100 m). */
const ATM_NEARBY = {
  id:          'atm-1',
  displayName: { text: 'Corner ATM' },
  location:    { latitude: 0.00027, longitude: 0 },
  types:       ['atm'],
};

/** Supermarket ~55 m north — inside HERO_RADIUS_M (100 m). */
const SUPERMARKET_NEARBY = {
  id:          'sm-1',
  displayName: { text: 'Fresh Mart' },
  location:    { latitude: 0.0005, longitude: 0 },
  types:       ['supermarket'],
};

/** ATM ~556 m north — outside NEARBY_RADIUS (400 m). */
const ATM_FAR = {
  id:          'atm-far',
  displayName: { text: 'Faraway ATM' },
  location:    { latitude: 0.005, longitude: 0 },
  types:       ['atm'],
};

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id:        'task-1',
    title:     'Get cash',
    category:  'errands',
    done:      false,
    poi:       'atm',
    date:      '2026-05-28',
    createdAt: { toDate: () => new Date() } as any,
    ...overrides,
  };
}

/**
 * Flush fire-and-forget notification Promises queued during runProximitySearch.
 * setImmediate runs after all pending microtasks, so all mocked async chains
 * (createChannel → displayNotification → markAllPoiAlertsSeen) are settled.
 */
async function flushAsync(): Promise<void> {
  await new Promise<void>(resolve => setImmediate(resolve));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('geo-triggered notifications', () => {
  beforeEach(() => {
    jest.restoreAllMocks(); // restore any spies from the previous test
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockGetPosition.mockResolvedValue(ORIGIN);
    resetProximityState();
    updateNotifNearbyEnabled(true);
    // Pin the clock to business hours so isQuietHours() never suppresses
    // notifications in tests that don't explicitly test quiet-hours logic.
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(10);
  });

  // ── NEARBY_RADIUS constant ──────────────────────────────────────────────────

  it('exports NEARBY_RADIUS = 400', () => {
    expect(NEARBY_RADIUS).toBe(400);
  });

  // ── Notification fires on hero entry ────────────────────────────────────────

  it('fires a notification when runProximitySearch finds a hero-zone place (<100 m)', async () => {
    mockPlacesResponse([ATM_NEARBY]);

    await runProximitySearch('uid-1', [makeTask()], jest.fn());
    await flushAsync();

    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.title).toContain('ATM');
    expect(call.body).toContain('thing');
  });

  it('creates the Android notification channel before firing', async () => {
    mockPlacesResponse([ATM_NEARBY]);

    await runProximitySearch('uid-1', [makeTask()], jest.fn());
    await flushAsync();

    const createOrder  = mockCreateChannel.mock.invocationCallOrder[0];
    const displayOrder = mockDisplayNotification.mock.invocationCallOrder[0];
    expect(createOrder).toBeLessThan(displayOrder);
  });

  // ── Suppression: done task ───────────────────────────────────────────────────

  it('does NOT fire when all tasks for the POI type are done', async () => {
    mockPlacesResponse([ATM_NEARBY]);

    await runProximitySearch('uid-1', [makeTask({ done: true })], jest.fn());
    await flushAsync();

    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  // ── Suppression: seen today ─────────────────────────────────────────────────

  it('does NOT fire when poiAlertSeenDate equals today', async () => {
    const today = new Date().toISOString().split('T')[0];
    mockPlacesResponse([ATM_NEARBY]);

    await runProximitySearch('uid-1', [makeTask({ poiAlertSeenDate: today })], jest.fn());
    await flushAsync();

    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  // ── markAllPoiAlertsSeen ────────────────────────────────────────────────────

  it('calls markAllPoiAlertsSeen with all eligible task IDs after firing', async () => {
    mockPlacesResponse([ATM_NEARBY]);
    const today = new Date().toISOString().split('T')[0];

    const tasks = [
      makeTask({ id: 'task-1' }),
      makeTask({ id: 'task-2' }),
    ];

    await runProximitySearch('uid-1', tasks, jest.fn());
    await flushAsync();

    expect(mockMarkAllPoiAlertsSeen).toHaveBeenCalledTimes(1);
    expect(mockMarkAllPoiAlertsSeen).toHaveBeenCalledWith(
      'uid-1',
      expect.arrayContaining(['task-1', 'task-2']),
      today,
    );
  });

  // ── Notification copy format ─────────────────────────────────────────────────

  it('uses "an" before vowel-starting POI labels (e.g. "an ATM")', async () => {
    mockPlacesResponse([ATM_NEARBY]);
    await runProximitySearch('uid-1', [makeTask()], jest.fn());
    await flushAsync();

    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.title).toBe("You're near an ATM");
  });

  it('uses "a" before consonant-starting POI labels (e.g. "a Supermarket")', async () => {
    const supermarketTask = makeTask({ id: 'sm', poi: 'supermarket', category: 'errands' });
    mockPlacesResponse([SUPERMARKET_NEARBY]);
    await runProximitySearch('uid-1', [supermarketTask], jest.fn());
    await flushAsync();

    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.title).toBe("You're near a Supermarket");
  });

  it('notification body says "You have N thing(s) to brush away."', async () => {
    mockPlacesResponse([ATM_NEARBY]);
    const tasks = [makeTask({ id: 'a' }), makeTask({ id: 'b' })];
    await runProximitySearch('uid-1', tasks, jest.fn());
    await flushAsync();

    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.body).toBe('You have 2 things to brush away.');
  });

  it('uses singular "thing" when there is exactly 1 task', async () => {
    mockPlacesResponse([ATM_NEARBY]);
    await runProximitySearch('uid-1', [makeTask()], jest.fn());
    await flushAsync();

    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.body).toBe('You have 1 thing to brush away.');
  });

  // ── Deep-link payload ────────────────────────────────────────────────────────

  it('data payload is exactly { screen: "Today" } — no taskId or date', async () => {
    mockPlacesResponse([ATM_NEARBY]);
    await runProximitySearch('uid-1', [makeTask({ id: 'task-abc', date: '2026-06-15' })], jest.fn());
    await flushAsync();

    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.data).toEqual({ screen: 'Today' });
  });

  // ── NEARBY_RADIUS = 400 m (display threshold) ────────────────────────────────

  it('marks a place as nearby when within 400 m and updates onUpdate', async () => {
    const onUpdate = jest.fn();
    mockPlacesResponse([ATM_NEARBY]); // ~30 m, inside hero zone

    await runProximitySearch('uid-1', [makeTask()], onUpdate);

    expect(onUpdate).toHaveBeenCalledWith(
      'atm',
      expect.objectContaining({ name: 'Corner ATM' }),
      expect.any(Object),
    );
  });

  it('does NOT mark a place as nearby when beyond 400 m', async () => {
    const onUpdate = jest.fn();
    mockPlacesResponse([ATM_FAR]); // ~556 m

    await runProximitySearch('uid-1', [makeTask()], onUpdate);

    expect(onUpdate).toHaveBeenCalledWith(null, null, {});
  });

  // ── notif_nearby_enabled = false ────────────────────────────────────────────

  it('does NOT fire when notif_nearby_enabled is false', async () => {
    mockPlacesResponse([ATM_NEARBY]);
    updateNotifNearbyEnabled(false);

    await runProximitySearch('uid-1', [makeTask()], jest.fn());
    await flushAsync();

    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  // ── Quiet hours ─────────────────────────────────────────────────────────────

  describe('isQuietHours()', () => {
    afterEach(() => { jest.restoreAllMocks(); });

    it('returns true at 22:00', () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(22);
      expect(isQuietHours()).toBe(true);
    });

    it('returns true at 03:00', () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(3);
      expect(isQuietHours()).toBe(true);
    });

    it('returns false at 09:00', () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
      expect(isQuietHours()).toBe(false);
    });

    it('returns false at 20:00', () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
      expect(isQuietHours()).toBe(false);
    });
  });

  it('does NOT fire during quiet hours (10pm–8am)', async () => {
    mockPlacesResponse([ATM_NEARBY]);
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23);

    await runProximitySearch('uid-1', [makeTask()], jest.fn());
    await flushAsync();

    expect(mockDisplayNotification).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});
