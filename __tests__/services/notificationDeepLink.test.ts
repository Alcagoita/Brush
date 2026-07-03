/**
 * KAN-28 / KAN-142 — Notification deep-link data payload tests.
 *
 * KAN-142 changed proximity notifications from per-task to per-POI-type.
 * The data payload now contains only `{ screen: 'Today' }` — there is no
 * single taskId or date because one notification covers all tasks of a type.
 *
 * Notifications fire exclusively from handleGeofenceEntry() (the native OS
 * boundary-crossing path). checkProximity() is display-only.
 *
 * Covers:
 *   - data.screen is always 'Today' (navigates to the Today screen)
 *   - No taskId or date in the payload (per-type notification, not per-task)
 */

// ─── Emitter mock ─────────────────────────────────────────────────────────────

import { EventEmitter } from 'events';
const mockGeofenceEmitter = new EventEmitter();

// ─── Mocks ────────────────────────────────────────────────────────────────────

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

jest.mock('../../src/services/firestore', () => ({
  markAllPoiAlertsSeen: jest.fn().mockResolvedValue(undefined),
  markPoiAlertSeen:     jest.fn().mockResolvedValue(undefined),
}));

const mockStartTracking = jest.fn();
const mockStopTracking  = jest.fn();
jest.mock('../../src/services/geolocation', () => ({
  startTracking:        (...args: unknown[]) => mockStartTracking(...args),
  stopTracking:         ()                   => mockStopTracking(),
  setTrackingAccuracy:  jest.fn(),
}));

jest.mock('../../src/config/keys', () => ({
  GOOGLE_PLACES_API_KEY: 'TEST_KEY',
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { startProximityMonitoring, stopProximityMonitoring } from '../../src/services/proximity';
import type { Task } from '../../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORIGIN = { lat: 0, lng: 0 };

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id:        'task-abc',
    title:     'Get cash',
    category:  'errands',
    done:      false,
    poi:       'atm',
    date:      '2026-05-29',
    createdAt: { toDate: () => new Date() } as any,
    ...overrides,
  };
}

function mockNearbyPlace(lat = 0.00027, lng = 0) {
  mockFetch.mockResolvedValueOnce({
    ok:   true,
    json: async () => ({
      places: [{ id: 'atm-1', displayName: { text: 'Corner ATM' }, location: { latitude: lat, longitude: lng } }],
    }),
  });
}

async function fireGeofenceEntry(geofenceId: string): Promise<void> {
  mockGeofenceEmitter.emit('onGeofenceEntry', { geofenceId });
  await new Promise<void>(resolve => setImmediate(resolve));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('notification deep-link data payload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockGeofenceEmitter.removeAllListeners();
    stopProximityMonitoring();
  });

  it('data payload is exactly { screen: "Today" } — no taskId or date', async () => {
    // KAN-142: one notification covers all tasks of the POI type; the
    // deep-link payload must be exactly { screen: 'Today' } so any drift
    // (new unexpected keys, missing keys) fails this test immediately.
    mockNearbyPlace();

    startProximityMonitoring('uid-1', [makeTask({ id: 'task-abc', date: '2026-06-15' })], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN); // populates place cache

    await fireGeofenceEntry('brush_geo_atm_atm-1');

    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    const payload = mockDisplayNotification.mock.calls[0][0];
    expect(payload.data).toEqual({ screen: 'Today' });
  });
});
