/**
 * KAN-28 — Notification deep-link data payload tests.
 *
 * Covers:
 *   - proximity.ts fireNotification includes screen, taskId, date in data payload
 *   - data.screen is always 'Today' (proximity notifications target the Today screen)
 *   - data.taskId matches the task's id
 *   - data.date matches the task's date
 */

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
  markPoiAlertSeen: jest.fn().mockResolvedValue(undefined),
}));

const mockStartTracking = jest.fn();
const mockStopTracking  = jest.fn();
jest.mock('../../src/services/geolocation', () => ({
  startTracking:        (...args: unknown[]) => mockStartTracking(...args),
  stopTracking:         ()                   => mockStopTracking(),
  setTrackingAccuracy:  jest.fn(),
}));

jest.mock('../../src/services/nativeGeofence', () => ({
  NativeGeofence: {
    registerGeofence:   jest.fn().mockResolvedValue(undefined),
    removeGeofence:     jest.fn().mockResolvedValue(undefined),
    removeAllGeofences: jest.fn().mockResolvedValue(undefined),
  },
  geofenceEmitter:        null,
  buildGeofenceId:        (poiType: string, placeId: string) => `brush_geo_${poiType}_${placeId}`,
  parseGeofenceId:        jest.fn().mockReturnValue(null),
  GEOFENCE_ENTRY_EVENT:   'onGeofenceEntry',
  supportsNativeGeofences: true,
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
      places: [{ id: 'p1', displayName: { text: 'Corner ATM' }, location: { latitude: lat, longitude: lng } }],
    }),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('notification deep-link data payload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    stopProximityMonitoring();
  });

  it('includes screen, taskId and date in the notification data payload', async () => {
    const task = makeTask({ id: 'task-abc', date: '2026-05-29' });
    mockNearbyPlace(); // ATM ~30 m away — inside 50 m geofence

    startProximityMonitoring('uid-1', [task], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    const payload = mockDisplayNotification.mock.calls[0][0];

    expect(payload.data).toEqual({
      screen: 'Today',
      taskId: 'task-abc',
      date:   '2026-05-29',
    });
  });

  it('always sets data.screen to "Today"', async () => {
    mockNearbyPlace();

    startProximityMonitoring('uid-1', [makeTask()], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    const payload = mockDisplayNotification.mock.calls[0][0];
    expect(payload.data.screen).toBe('Today');
  });

  it('sets data.taskId to the task id that triggered the notification', async () => {
    const task = makeTask({ id: 'unique-task-id-999' });
    mockNearbyPlace();

    startProximityMonitoring('uid-1', [task], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    const payload = mockDisplayNotification.mock.calls[0][0];
    expect(payload.data.taskId).toBe('unique-task-id-999');
  });

  it('sets data.date to the task date', async () => {
    const task = makeTask({ date: '2026-06-15' });
    mockNearbyPlace();

    startProximityMonitoring('uid-1', [task], jest.fn());
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    const payload = mockDisplayNotification.mock.calls[0][0];
    expect(payload.data.date).toBe('2026-06-15');
  });
});
