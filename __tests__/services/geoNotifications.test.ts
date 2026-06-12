/**
 * KAN-27 / KAN-142 — Geo-triggered local notification tests.
 *
 * Architecture after KAN-142:
 *   - checkProximity() is display-only (updates NearbyCard / ring sublabel).
 *   - All notification delivery happens via handleGeofenceEntry() — called by
 *     the native OS geofence boundary crossing event.
 *
 * Test strategy:
 *   1. Start monitoring.
 *   2. Fire a location tick (populates the place cache via checkProximity).
 *   3. Emit a native geofence entry event via the mock emitter to trigger
 *      handleGeofenceEntry() and assert notification behaviour.
 *
 * Covers:
 *   - Notification fires on geofence entry
 *   - Notification does NOT fire for done tasks / seen-today tasks
 *   - markAllPoiAlertsSeen called for ALL eligible tasks of the POI type
 *   - Android channel created before displayNotification
 *   - NEARBY_RADIUS = 400 m (display threshold exported constant)
 *   - checkProximity does NOT fire notifications (display-only)
 *   - notif_nearby_enabled = false → no notification
 *   - Quiet hours (10pm–8am) → no notification
 *   - Multiple tasks same POI → one notification, all marked seen
 *   - Singular/plural "thing(s)" in body copy
 *   - a/an article in title ("an ATM" not "a ATM")
 */

// ─── Emitter mock (lets tests trigger native geofence entry events) ─────────

import { EventEmitter } from 'events';
const mockGeofenceEmitter = new EventEmitter();

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

// Mock the native geofence module with a real emitter so tests can trigger
// boundary-crossing events via mockGeofenceEmitter.emit(GEOFENCE_ENTRY_EVENT).
jest.mock('../../src/services/nativeGeofence', () => ({
  NativeGeofence: {
    registerGeofence:   jest.fn().mockResolvedValue(undefined),
    removeGeofence:     jest.fn().mockResolvedValue(undefined),
    removeAllGeofences: jest.fn().mockResolvedValue(undefined),
  },
  geofenceEmitter: {
    addListener: (event: string, cb: (...args: unknown[]) => void) => {
      mockGeofenceEmitter.on(event, cb);
      return { remove: () => mockGeofenceEmitter.removeListener(event, cb) };
    },
  },
  buildGeofenceId:         (poiType: string, placeId: string) => `brush_geo_${poiType}_${placeId}`,
  parseGeofenceId:         jest.fn().mockImplementation((id: string) => {
    const m = id.match(/^brush_geo_([^_]+(?:_[^_]+)*)_(.+)$/);
    return m ? { poiType: m[1], placeId: m[2] } : null;
  }),
  GEOFENCE_ENTRY_EVENT:    'onGeofenceEntry',
  GEOFENCE_EXIT_EVENT:     'onGeofenceExit',
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

/**
 * Emit a native geofence entry event and let the async handler complete.
 * This calls handleGeofenceEntry() (the background notification path).
 */
async function fireGeofenceEntry(geofenceId: string): Promise<void> {
  mockGeofenceEmitter.emit('onGeofenceEntry', { geofenceId });
  // Allow the async handler to complete.
  await new Promise(resolve => setTimeout(resolve, 20));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('geo-triggered notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockGeofenceEmitter.removeAllListeners();
    stopProximityMonitoring();
    updateNotifNearbyEnabled(true);
  });

  // ── NEARBY_RADIUS constant ──────────────────────────────────────────────────

  it('exports NEARBY_RADIUS = 400', () => {
    expect(NEARBY_RADIUS).toBe(400);
  });

  // ── checkProximity is display-only ──────────────────────────────────────────

  it('checkProximity does NOT fire a notification — it is display-only (KAN-142)', async () => {
    mockPlacesResponse([ATM_NEARBY]);

    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN); // foreground tick — updates NearbyCard, NOT notifications

    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  // ── Geofence entry fires notification ────────────────────────────────────────

  it('fires a notification when the OS triggers a geofence entry event', async () => {
    // Step 1: location tick populates the place cache.
    mockPlacesResponse([ATM_NEARBY]);
    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    // Step 2: OS fires the geofence boundary-crossing event.
    await fireGeofenceEntry('brush_geo_atm_atm-1');

    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.title).toContain('ATM');
    expect(call.body).toContain('thing');
  });

  it('creates the Android notification channel before firing', async () => {
    mockPlacesResponse([ATM_NEARBY]);
    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    await fireGeofenceEntry('brush_geo_atm_atm-1');

    const createOrder  = mockCreateChannel.mock.invocationCallOrder[0];
    const displayOrder = mockDisplayNotification.mock.invocationCallOrder[0];
    expect(createOrder).toBeLessThan(displayOrder);
  });

  // ── Suppression: done task ───────────────────────────────────────────────────

  it('does NOT fire when all tasks for the POI type are done', async () => {
    mockPlacesResponse([ATM_NEARBY]);
    startProximityMonitoring('uid-1', [makeTask({ done: true })], jest.fn());
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    await fireGeofenceEntry('brush_geo_atm_atm-1');

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
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    await fireGeofenceEntry('brush_geo_atm_atm-1');

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
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    await fireGeofenceEntry('brush_geo_atm_atm-1');

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
    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    await fireGeofenceEntry('brush_geo_atm_atm-1');

    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.title).toBe("You're near an ATM");
  });

  it('uses "a" before consonant-starting POI labels (e.g. "a Supermarket")', async () => {
    const supermarketTask = makeTask({ id: 'sm', poi: 'supermarket', category: 'errands' });
    mockPlacesResponse([SUPERMARKET_NEARBY]);
    startProximityMonitoring('uid-1', [supermarketTask], jest.fn());
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    await fireGeofenceEntry('brush_geo_supermarket_sm-1');

    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.title).toBe("You're near a Supermarket");
  });

  it('notification body says "You have N thing(s) to brush away."', async () => {
    mockPlacesResponse([ATM_NEARBY]);
    const tasks = [makeTask({ id: 'a' }), makeTask({ id: 'b' })];
    startProximityMonitoring('uid-1', tasks, jest.fn());
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    await fireGeofenceEntry('brush_geo_atm_atm-1');

    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.body).toBe('You have 2 things to brush away.');
  });

  it('uses singular "thing" when there is exactly 1 task', async () => {
    mockPlacesResponse([ATM_NEARBY]);
    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    await fireGeofenceEntry('brush_geo_atm_atm-1');

    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.body).toBe('You have 1 thing to brush away.');
  });

  // ── Deep-link payload ────────────────────────────────────────────────────────

  it('data payload is exactly { screen: "Today" } — no taskId or date', async () => {
    mockPlacesResponse([ATM_NEARBY]);
    startProximityMonitoring('uid-1', [makeTask({ id: 'task-abc', date: '2026-06-15' })], jest.fn());
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    await fireGeofenceEntry('brush_geo_atm_atm-1');

    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.data).toEqual({ screen: 'Today' });
  });

  // ── NEARBY_RADIUS = 400 m (display threshold) ────────────────────────────────

  it('checkProximity marks a place as nearby when within 400 m and updates onUpdate', async () => {
    const onUpdate = jest.fn();
    mockPlacesResponse([ATM_NEARBY]); // ~30 m

    startProximityMonitoring('uid-1', [makeTask()], onUpdate);
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    expect(onUpdate).toHaveBeenCalledWith(
      'atm',
      expect.objectContaining({ name: 'Corner ATM' }),
      expect.any(Object),
    );
  });

  it('checkProximity does NOT mark a place as nearby when beyond 400 m', async () => {
    const onUpdate = jest.fn();
    mockPlacesResponse([ATM_FAR]); // ~556 m

    startProximityMonitoring('uid-1', [makeTask()], onUpdate);
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    expect(onUpdate).toHaveBeenCalledWith(null, null, expect.any(Object));
  });

  // ── notif_nearby_enabled = false ────────────────────────────────────────────

  it('does NOT fire when notif_nearby_enabled is false', async () => {
    mockPlacesResponse([ATM_NEARBY]);
    updateNotifNearbyEnabled(false);

    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    await fireGeofenceEntry('brush_geo_atm_atm-1');

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

    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    await fireGeofenceEntry('brush_geo_atm_atm-1');

    expect(mockDisplayNotification).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});
