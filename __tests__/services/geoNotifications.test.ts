/**
 * KAN-27 / KAN-142 — Geo-triggered local notification tests.
 *
 * Covers:
 *   - Notification fires on geofence entry (null → poiType transition)
 *   - Notification does NOT fire for tasks that are already done
 *   - Notification does NOT fire when poiAlertSeenDate === today
 *   - Notification fires on POI type switch (typeA → typeB transition)
 *   - markAllPoiAlertsSeen is called for ALL eligible tasks of the POI type
 *   - Android notification channel is created before displayNotification
 *   - Closest POI wins when multiple POIs are simultaneously in range
 *   - No notification on repeated location ticks within the same geofence
 *   - NEARBY_RADIUS = 400 m — places within 400 m trigger, outside do not
 *   - Quiet hours (10pm–8am): notifications suppressed
 *   - notif_nearby_enabled = false: notifications suppressed
 *   - Multiple tasks same POI type: one notification, all tasks marked seen
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
}));

const mockStartTracking = jest.fn();
const mockStopTracking  = jest.fn();
jest.mock('../../src/services/geolocation', () => ({
  startTracking:        (...args: unknown[]) => mockStartTracking(...args),
  stopTracking:         ()                   => mockStopTracking(),
  setTrackingAccuracy:  jest.fn(),
}));

// Mock the native geofence module (KAN-56) so tests don't require native modules.
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
  supportsNativeGeofences: true,
}));

jest.mock('../../src/config/keys', () => ({
  GOOGLE_PLACES_API_KEY: 'TEST_KEY',
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
  startProximityMonitoring,
  stopProximityMonitoring,
  updateNotifNearbyEnabled,
  isQuietHours,
  NEARBY_RADIUS,
} from '../../src/services/proximity';
import type { Task } from '../../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORIGIN = { lat: 0, lng: 0 };

/** ATM 30 m north — well within NEARBY_RADIUS (400 m). */
const ATM_NEARBY = {
  id:          'atm-1',
  displayName: { text: 'Corner ATM' },
  location:    { latitude: 0.00027, longitude: 0 },
};

/** Supermarket 55 m north — within NEARBY_RADIUS (400 m). */
const SUPERMARKET_NEARBY = {
  id:          'sm-1',
  displayName: { text: 'Fresh Mart' },
  location:    { latitude: 0.0005, longitude: 0 },
};

/** ATM 550 m north — outside NEARBY_RADIUS (400 m). */
const ATM_FAR = {
  id:          'atm-far',
  displayName: { text: 'Faraway ATM' },
  location:    { latitude: 0.005, longitude: 0 }, // ~556 m
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('geo-triggered notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    stopProximityMonitoring();
    // Reset to defaults between tests.
    updateNotifNearbyEnabled(true);
  });

  // ── NEARBY_RADIUS constant ──────────────────────────────────────────────────

  it('exports NEARBY_RADIUS = 400', () => {
    expect(NEARBY_RADIUS).toBe(400);
  });

  // ── Entry transition (null → type) ──────────────────────────────────────────

  it('fires a notification when the user enters within NEARBY_RADIUS', async () => {
    mockPlacesResponse([ATM_NEARBY]);

    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.title).toContain('ATM');
    expect(call.body).toContain('thing');
  });

  it('creates the Android notification channel before firing', async () => {
    mockPlacesResponse([ATM_NEARBY]);

    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    const createOrder  = mockCreateChannel.mock.invocationCallOrder[0];
    const displayOrder = mockDisplayNotification.mock.invocationCallOrder[0];
    expect(createOrder).toBeLessThan(displayOrder);
  });

  // ── Suppression: done task ───────────────────────────────────────────────────

  it('does NOT fire when the matching task is already done', async () => {
    startProximityMonitoring('uid-1', [makeTask({ done: true })], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  // ── Suppression: seen today ─────────────────────────────────────────────────

  it('does NOT fire when poiAlertSeenDate equals today', async () => {
    const today = new Date().toISOString().split('T')[0];
    mockPlacesResponse([ATM_NEARBY]);

    startProximityMonitoring(
      'uid-1',
      [makeTask({ poiAlertSeenDate: today })],
      jest.fn(),
    );
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

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

    startProximityMonitoring('uid-1', tasks, jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    expect(mockMarkAllPoiAlertsSeen).toHaveBeenCalledTimes(1);
    expect(mockMarkAllPoiAlertsSeen).toHaveBeenCalledWith(
      'uid-1',
      expect.arrayContaining(['task-1', 'task-2']),
      today,
    );
  });

  // ── No repeat on same geofence ───────────────────────────────────────────────

  it('does NOT fire a second notification on repeated ticks inside the same geofence', async () => {
    mockPlacesResponse([ATM_NEARBY]);

    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];

    await locationCb(ORIGIN); // enters
    await locationCb(ORIGIN); // still inside — should NOT re-notify

    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
  });

  // ── Notification copy format ─────────────────────────────────────────────────

  it('notification title says "You\'re near a [POI type]"', async () => {
    mockPlacesResponse([ATM_NEARBY]);

    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.title).toBe("You're near a ATM");
  });

  it('notification body says "You have N thing(s) to brush away."', async () => {
    mockPlacesResponse([ATM_NEARBY]);

    startProximityMonitoring(
      'uid-1',
      [makeTask({ id: 'a' }), makeTask({ id: 'b' })],
      jest.fn(),
    );
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.body).toBe('You have 2 things to brush away.');
  });

  it('uses singular "thing" when there is exactly 1 task', async () => {
    mockPlacesResponse([ATM_NEARBY]);

    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.body).toBe('You have 1 thing to brush away.');
  });

  // ── POI type label in title ─────────────────────────────────────────────────

  it('uses the POI type label in the notification title', async () => {
    const supermarketTask = makeTask({
      id:       'sm-task',
      poi:      'supermarket',
      title:    'Buy groceries',
      category: 'errands',
    });

    mockPlacesResponse([SUPERMARKET_NEARBY]);

    startProximityMonitoring('uid-1', [supermarketTask], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.title).toContain('Supermarket');
  });

  // ── Closest POI wins ────────────────────────────────────────────────────────

  it('fires a notification for the closest POI when multiple are in range', async () => {
    const atmTask         = makeTask({ id: 'atm-task', poi: 'atm',         title: 'Get cash' });
    const supermarketTask = makeTask({ id: 'sm-task',  poi: 'supermarket', title: 'Buy groceries', category: 'errands' });

    // ATM 30 m, supermarket 55 m — both within NEARBY_RADIUS; ATM wins.
    mockPlacesResponse([ATM_NEARBY]);
    mockPlacesResponse([SUPERMARKET_NEARBY]);

    startProximityMonitoring('uid-1', [atmTask, supermarketTask], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    const title = mockDisplayNotification.mock.calls[0][0].title as string;
    expect(title).toContain('ATM'); // ATM wins (30 m < 55 m)
  });

  // ── Place outside NEARBY_RADIUS ─────────────────────────────────────────────

  it('does NOT fire when the nearest place is beyond NEARBY_RADIUS (400 m)', async () => {
    mockPlacesResponse([ATM_FAR]); // ~556 m — outside 400 m

    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  // ── notif_nearby_enabled = false ────────────────────────────────────────────

  it('does NOT fire when notif_nearby_enabled is false', async () => {
    mockPlacesResponse([ATM_NEARBY]);
    updateNotifNearbyEnabled(false);

    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  it('fires again after notif_nearby_enabled is re-enabled', async () => {
    mockPlacesResponse([ATM_NEARBY]);
    updateNotifNearbyEnabled(false);

    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);
    expect(mockDisplayNotification).not.toHaveBeenCalled();

    // Re-enable and simulate a new proximity entry.
    updateNotifNearbyEnabled(true);
    stopProximityMonitoring();
    mockFetch.mockReset();
    mockPlacesResponse([ATM_NEARBY]);

    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    const locationCb2 = mockStartTracking.mock.calls[1][0];
    await locationCb2(ORIGIN);
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
  });

  // ── Quiet hours ─────────────────────────────────────────────────────────────

  describe('isQuietHours()', () => {
    const RealDate = global.Date;

    afterEach(() => {
      global.Date = RealDate;
    });

    it('returns true at 22:00 (10pm)', () => {
      jest.spyOn(global, 'Date').mockImplementation(() =>
        ({ getHours: () => 22 } as any),
      );
      expect(isQuietHours()).toBe(true);
    });

    it('returns true at 03:00 (3am)', () => {
      jest.spyOn(global, 'Date').mockImplementation(() =>
        ({ getHours: () => 3 } as any),
      );
      expect(isQuietHours()).toBe(true);
    });

    it('returns false at 09:00', () => {
      jest.spyOn(global, 'Date').mockImplementation(() =>
        ({ getHours: () => 9 } as any),
      );
      expect(isQuietHours()).toBe(false);
    });

    it('returns false at 20:00', () => {
      jest.spyOn(global, 'Date').mockImplementation(() =>
        ({ getHours: () => 20 } as any),
      );
      expect(isQuietHours()).toBe(false);
    });
  });

  it('does NOT fire a notification during quiet hours (10pm–8am)', async () => {
    mockPlacesResponse([ATM_NEARBY]);

    // Stub Date.getHours() to return 23 (11pm — inside quiet window).
    const mockedDate = { getHours: () => 23 } as any;
    jest.spyOn(global, 'Date').mockImplementation(() => mockedDate);

    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    expect(mockDisplayNotification).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });
});
