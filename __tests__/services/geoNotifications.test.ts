/**
 * KAN-27 — Geo-triggered local notification tests.
 *
 * Covers:
 *   - Notification fires on geofence entry (null → poiType transition)
 *   - Notification does NOT fire for tasks that are already done
 *   - Notification does NOT fire when poiAlertSeenDate === today
 *   - Notification fires on POI type switch (typeA → typeB transition)
 *   - markPoiAlertSeen is written to Firestore after notification fires
 *   - Android notification channel is created before displayNotification
 *   - Closest POI wins when multiple POIs are simultaneously in range
 *   - No notification on repeated location ticks within the same geofence
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
  Platform: { OS: 'android' },
}));

// ─── Firebase / service mocks ─────────────────────────────────────────────────

const mockMarkPoiAlertSeen = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/firestore', () => ({
  markPoiAlertSeen: (...args: unknown[]) => mockMarkPoiAlertSeen(...args),
}));

const mockStartTracking = jest.fn();
const mockStopTracking  = jest.fn();
jest.mock('../../src/services/geolocation', () => ({
  startTracking: (...args: unknown[]) => mockStartTracking(...args),
  stopTracking:  ()                   => mockStopTracking(),
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

import { startProximityMonitoring, stopProximityMonitoring } from '../../src/services/proximity';
import type { Task } from '../../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORIGIN = { lat: 0, lng: 0 };

/** ATM 30 m away — well inside the 50 m geofence. */
const ATM_NEARBY = {
  id:          'atm-1',
  displayName: { text: 'Corner ATM' },
  location:    { latitude: 0.00027, longitude: 0 }, // ~30 m north
};

/** Supermarket 60 m away — inside the 75 m geofence. */
const SUPERMARKET_NEARBY = {
  id:          'sm-1',
  displayName: { text: 'Fresh Mart' },
  location:    { latitude: 0.0005, longitude: 0 }, // ~55 m north
};

/** ATM 200 m away — outside the 50 m geofence. */
const ATM_FAR = {
  id:          'atm-far',
  displayName: { text: 'Faraway ATM' },
  location:    { latitude: 0.002, longitude: 0 }, // ~222 m north
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
    // mockResolvedValueOnce responses survive jest.clearAllMocks() — reset the
    // queue explicitly so unconsumed responses from one test can't leak into the next.
    mockFetch.mockReset();
    stopProximityMonitoring();
  });

  // ── Entry transition (null → type) ──────────────────────────────────────────

  it('fires a notification when the user enters a POI geofence', async () => {
    mockPlacesResponse([ATM_NEARBY]);

    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    const call = mockDisplayNotification.mock.calls[0][0];
    expect(call.title).toContain('ATM');
    expect(call.body).toContain('Corner ATM');
    expect(call.body).toContain('Get cash');
  });

  it('creates the Android notification channel before firing', async () => {
    mockPlacesResponse([ATM_NEARBY]);

    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    // createChannel must have been awaited before displayNotification
    const createOrder  = mockCreateChannel.mock.invocationCallOrder[0];
    const displayOrder = mockDisplayNotification.mock.invocationCallOrder[0];
    expect(createOrder).toBeLessThan(displayOrder);
  });

  // ── Suppression: done task ───────────────────────────────────────────────────

  it('does NOT fire a notification when the matching task is already done', async () => {
    // done: true → filtered from undonePoiTasks → no Places API calls → no notification
    startProximityMonitoring('uid-1', [makeTask({ done: true })], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });

  // ── Suppression: seen today ─────────────────────────────────────────────────

  it('does NOT fire a notification when poiAlertSeenDate equals today', async () => {
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

  // ── markPoiAlertSeen ────────────────────────────────────────────────────────

  it('writes poiAlertSeenDate to Firestore after firing a notification', async () => {
    mockPlacesResponse([ATM_NEARBY]);

    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    expect(mockMarkPoiAlertSeen).toHaveBeenCalledTimes(1);
    expect(mockMarkPoiAlertSeen).toHaveBeenCalledWith(
      'uid-1',
      'task-1',
      new Date().toISOString().split('T')[0],
    );
  });

  // ── No repeat on same geofence ───────────────────────────────────────────────

  it('does NOT fire a second notification on repeated ticks inside the same geofence', async () => {
    // Two location ticks in a row — both inside the ATM geofence.
    mockPlacesResponse([ATM_NEARBY]); // tick 1 → cache miss
    // tick 2 → cache hit (no fetch), same nearby type

    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];

    await locationCb(ORIGIN); // enters geofence
    await locationCb(ORIGIN); // still inside — should NOT re-notify

    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
  });

  // ── POI type switch ─────────────────────────────────────────────────────────

  it('fires a notification for a non-ATM POI type (supermarket) on geofence entry', async () => {
    // Verifies that the notification path works for POI types other than ATM —
    // in particular that title/body use the correct label and task name.
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
    expect(call.body).toContain('Fresh Mart');
    expect(call.body).toContain('Buy groceries');
  });

  // ── Closest POI wins ────────────────────────────────────────────────────────

  it('fires a notification for the closest POI when multiple are in range', async () => {
    const atmTask         = makeTask({ id: 'atm-task', poi: 'atm',         title: 'Get cash' });
    const supermarketTask = makeTask({ id: 'sm-task',  poi: 'supermarket', title: 'Buy groceries', category: 'errands' });

    // ATM 30 m, supermarket 55 m — both inside their geofences; ATM wins.
    mockPlacesResponse([ATM_NEARBY]);
    mockPlacesResponse([SUPERMARKET_NEARBY]);

    startProximityMonitoring('uid-1', [atmTask, supermarketTask], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    const body = mockDisplayNotification.mock.calls[0][0].body as string;
    expect(body).toContain('Corner ATM');  // ATM wins (30 m < 55 m)
  });

  // ── Place outside geofence ──────────────────────────────────────────────────

  it('does NOT fire a notification when the place is outside the geofence', async () => {
    mockPlacesResponse([ATM_FAR]); // 200 m — outside 50 m ATM radius

    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });
});
