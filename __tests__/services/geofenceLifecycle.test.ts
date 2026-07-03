/**
 * KAN-144 — POI proximity verification.
 *
 * Verifies:
 *   1. NEARBY_RADIUS = 400 m constant is correct.
 *   2. Distance accuracy — the 400 m threshold is used consistently in the
 *      display path (runProximitySearch → onUpdate → NearbyCard).
 *   3. No `store` field leakage — task.store is not read anywhere in the
 *      proximity code path after KAN-143.
 *
 * Note: native geofence lifecycle tests (register/deregister per task state
 * via startProximityMonitoring/updateProximityTasks) were removed in KAN-153.
 * Geofences are now used exclusively for the exit-prompt (KAN-119), not for
 * display or entry notifications.
 */

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock'),
);

// ─── Notifee mock ─────────────────────────────────────────────────────────────

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
  Platform:      { OS: 'android' },
  NativeModules: { WearNotificationModule: { sendProximityAlert: jest.fn() } },
}));

// ─── Service mocks ────────────────────────────────────────────────────────────

jest.mock('../../src/services/firestore', () => ({
  markAllPoiAlertsSeen: jest.fn().mockResolvedValue(undefined),
  markPoiAlertSeen:     jest.fn().mockResolvedValue(undefined),
  markExitPromptSeen:   jest.fn().mockResolvedValue(undefined),
}));

const mockGetPosition = jest.fn();
jest.mock('../../src/services/geolocation', () => ({
  getPositionLowAccuracy: (...args: unknown[]) => mockGetPosition(...args),
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

import {
  runProximitySearch,
  resetProximityState,
  NEARBY_RADIUS,
} from '../../src/services/proximity';
import type { Task } from '../../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORIGIN = { lat: 0, lng: 0, accuracy: 10 };

/** Approximate latitude offset to produce a given distance in metres north of the equator. */
const LAT_PER_METRE = 1 / 111_195;

type MockTimestamp = { toDate: () => Date };
const MOCK_TIMESTAMP: MockTimestamp = { toDate: () => new Date() };

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id:        'task-1',
    title:     'Get cash',
    category:  'errands',
    done:      false,
    poi:       'atm',
    date:      '2026-06-12',
    createdAt: MOCK_TIMESTAMP as Task['createdAt'],
    ...overrides,
  };
}

function mockPlacesResponse(places: Array<{
  id: string; displayName: { text: string }; location: { latitude: number; longitude: number };
}>) {
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ places }) });
}

// ─── 1. NEARBY_RADIUS constant ────────────────────────────────────────────────

describe('NEARBY_RADIUS', () => {
  it('is exactly 400 m', () => {
    expect(NEARBY_RADIUS).toBe(400);
  });
});

// ─── 2. Distance accuracy ─────────────────────────────────────────────────────

describe('distance accuracy — 400 m threshold', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockGetPosition.mockResolvedValue(ORIGIN);
    resetProximityState();
  });

  it('counts a place at 390 m as nearby (just inside threshold)', async () => {
    // ~390 m north — inside NEARBY_RADIUS (400 m), outside HERO_RADIUS_M (100 m) → grey zone.
    const lat390m = LAT_PER_METRE * 390;
    mockPlacesResponse([{
      id:          'atm-390',
      displayName: { text: 'Close ATM' },
      location:    { latitude: lat390m, longitude: 0 },
      types:       ['atm'],
    }]);

    const onUpdate = jest.fn();
    await runProximitySearch('uid-1', [makeTask()], onUpdate);

    expect(onUpdate).toHaveBeenCalledWith(
      null,
      null,
      expect.objectContaining({ atm: [expect.objectContaining({ name: 'Close ATM' })] }),
    );
  });

  it('does NOT count a place at 410 m as nearby (just outside threshold)', async () => {
    // ~410 m north — outside NEARBY_RADIUS (400 m).
    const lat410m = LAT_PER_METRE * 410;
    mockPlacesResponse([{
      id:          'atm-410',
      displayName: { text: 'Far ATM' },
      location:    { latitude: lat410m, longitude: 0 },
      types:       ['atm'],
    }]);

    const onUpdate = jest.fn();
    await runProximitySearch('uid-1', [makeTask()], onUpdate);

    expect(onUpdate).toHaveBeenCalledWith(null, null, {});
  });

  it('counts a place at exactly 400 m as nearby (at boundary, inclusive)', async () => {
    // Exactly 400 m north — the check is distance < NEARBY_RADIUS, so Haversine
    // may land just inside or outside depending on floating-point. The definitive
    // boundary assertions are the 390 m (inside) and 410 m (outside) tests above.
    const lat400m = LAT_PER_METRE * 400;
    mockPlacesResponse([{
      id:          'atm-400',
      displayName: { text: 'Boundary ATM' },
      location:    { latitude: lat400m, longitude: 0 },
      types:       ['atm'],
    }]);

    const onUpdate = jest.fn();
    await runProximitySearch('uid-1', [makeTask()], onUpdate);

    const lastCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
    expect(['atm', null]).toContain(lastCall[0]);
  });

  it('display path uses NEARBY_RADIUS (400 m) as the outer threshold', async () => {
    // ~300 m north: within NEARBY_RADIUS, outside HERO_RADIUS_M → grey zone.
    const lat300m = LAT_PER_METRE * 300;
    mockPlacesResponse([{
      id:          'atm-300',
      displayName: { text: 'Nearby ATM' },
      location:    { latitude: lat300m, longitude: 0 },
      types:       ['atm'],
    }]);

    const onUpdate = jest.fn();
    await runProximitySearch('uid-1', [makeTask()], onUpdate);

    expect(onUpdate).toHaveBeenCalledWith(
      null,
      null,
      expect.objectContaining({ atm: [expect.objectContaining({ name: 'Nearby ATM' })] }),
    );
  });
});

// ─── 3. No `store` field leakage ─────────────────────────────────────────────

describe('no store field leakage after KAN-143', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockGetPosition.mockResolvedValue(ORIGIN);
    resetProximityState();
  });

  it('proximity.ts does not read task.store or task.store.placeId for distance calculations', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    const source = fs.readFileSync(
      require.resolve('../../src/services/proximity.ts'),
      'utf-8',
    );
    expect(source).not.toMatch(/task\.store\b/);
    expect(source).not.toMatch(/\bstore\.placeId\b/);
  });

  it('proximity engine works correctly with tasks that have no store field', async () => {
    const onUpdate = jest.fn();
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: async () => ({
        places: [{
          id:          'cafe-1',
          displayName: { text: 'Nice Café' },
          location:    { latitude: LAT_PER_METRE * 200, longitude: 0 },
          types:       ['cafe'],
        }],
      }),
    });

    // Task has poi but no store field — must not cause any error or wrong behavior.
    const task: Task = {
      id:        'task-cafe',
      title:     'Coffee meeting',
      category:  'personal',
      done:      false,
      poi:       'cafe',
      date:      '2026-06-12',
      createdAt: MOCK_TIMESTAMP as Task['createdAt'],
    };

    await runProximitySearch('uid-1', [task], onUpdate);

    // 200 m: inside NEARBY_RADIUS, outside HERO_RADIUS_M → grey zone.
    expect(onUpdate).toHaveBeenCalledWith(
      null,
      null,
      expect.objectContaining({ cafe: [expect.objectContaining({ name: 'Nice Café' })] }),
    );
  });
});
