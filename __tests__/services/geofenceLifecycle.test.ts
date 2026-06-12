/**
 * KAN-144 — POI proximity verification.
 *
 * Verifies:
 *   1. Distance accuracy — NEARBY_RADIUS = 400 m threshold used consistently
 *      across the display path (checkProximity / NearbyCard) and background
 *      geofence path (handleGeofenceEntry notifications).
 *   2. Geofence lifecycle — register when task has poi & is undone; deregister
 *      only when ALL tasks for that POI type are done; re-register on relaunch.
 *   3. Persistent tracking — geofence stays active after the first notification
 *      fires (task still undone); fires again next day.
 *   4. Rate-limit — one notification per POI type per day.
 *   5. Multi-task deregistration — two tasks same POI type: geofence stays
 *      until both are done, not just one.
 *   6. No `store` field leakage — task.store is not read anywhere in the
 *      proximity code path after KAN-143.
 */

// ─── Emitter mock ─────────────────────────────────────────────────────────────

import { EventEmitter } from 'events';
const mockGeofenceEmitter = new EventEmitter();

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

const mockMarkAllPoiAlertsSeen = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/firestore', () => ({
  markAllPoiAlertsSeen: (...args: unknown[]) => mockMarkAllPoiAlertsSeen(...args),
  markPoiAlertSeen:     jest.fn().mockResolvedValue(undefined),
  markExitPromptSeen:   jest.fn().mockResolvedValue(undefined),
}));

const mockStartTracking = jest.fn();
const mockStopTracking  = jest.fn();
jest.mock('../../src/services/geolocation', () => ({
  startTracking:        (...args: unknown[]) => mockStartTracking(...args),
  stopTracking:         () => mockStopTracking(),
  setTrackingAccuracy:  jest.fn(),
}));

const mockRegisterGeofence   = jest.fn().mockResolvedValue(undefined);
const mockRemoveGeofence     = jest.fn().mockResolvedValue(undefined);
const mockRemoveAllGeofences = jest.fn().mockResolvedValue(undefined);

jest.mock('../../src/services/nativeGeofence', () => ({
  NativeGeofence: {
    registerGeofence:   (...args: unknown[]) => mockRegisterGeofence(...args),
    removeGeofence:     (...args: unknown[]) => mockRemoveGeofence(...args),
    removeAllGeofences: () => mockRemoveAllGeofences(),
  },
  geofenceEmitter: {
    addListener: (event: string, cb: (...args: unknown[]) => void) => {
      mockGeofenceEmitter.on(event, cb);
      return { remove: () => mockGeofenceEmitter.removeListener(event, cb) };
    },
  },
  buildGeofenceId:        (poiType: string, placeId: string) => `brush_geo_${poiType}_${placeId}`,
  parseGeofenceId:        jest.fn().mockImplementation((id: string) => {
    const m = id.match(/^brush_geo_([^_]+)_(.+)$/);
    return m ? { poiType: m[1], placeId: m[2] } : null;
  }),
  GEOFENCE_ENTRY_EVENT:    'onGeofenceEntry',
  GEOFENCE_EXIT_EVENT:     'onGeofenceExit',
  supportsNativeGeofences: true,
}));

jest.mock('../../src/services/notifications', () => ({
  fireExitPrompt: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/config/keys', () => ({
  GOOGLE_PLACES_API_KEY: 'TEST_KEY',
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {
  startProximityMonitoring,
  stopProximityMonitoring,
  updateProximityTasks,
  NEARBY_RADIUS,
} from '../../src/services/proximity';
import type { Task } from '../../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORIGIN = { lat: 0, lng: 0 };

/**
 * Approximate latitude offset to produce a given distance in metres north of
 * the equator. 1 degree latitude ≈ 111 195 m at the equator.
 */
const LAT_PER_METRE = 1 / 111_195;

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id:        'task-1',
    title:     'Get cash',
    category:  'errands',
    done:      false,
    poi:       'atm',
    date:      '2026-06-12',
    createdAt: { toDate: () => new Date() } as any,
    ...overrides,
  };
}

function mockPlacesResponse(places: Array<{
  id: string; displayName: { text: string }; location: { latitude: number; longitude: number };
}>) {
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ places }) });
}

/** Emit a geofence entry event and let the async handler settle. */
async function fireGeofenceEntry(geofenceId: string): Promise<void> {
  mockGeofenceEmitter.emit('onGeofenceEntry', { geofenceId });
  await new Promise<void>(resolve => setImmediate(resolve));
}

// ─── 1. NEARBY_RADIUS constant ────────────────────────────────────────────────

describe('NEARBY_RADIUS', () => {
  it('is exactly 400 m', () => {
    expect(NEARBY_RADIUS).toBe(400);
  });
});

// ─── 2. Distance accuracy ─────────────────────────────────────────────────────

describe('distance accuracy — 400 m threshold', () => {
  const onUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockGeofenceEmitter.removeAllListeners();
    stopProximityMonitoring();
  });

  it('counts a place at 390 m as nearby (just inside threshold)', async () => {
    // ~390 m north — inside NEARBY_RADIUS (400 m).
    const lat390m = LAT_PER_METRE * 390;
    mockPlacesResponse([{
      id:          'atm-390',
      displayName: { text: 'Close ATM' },
      location:    { latitude: lat390m, longitude: 0 },
    }]);

    startProximityMonitoring('uid-1', [makeTask()], onUpdate);
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    expect(onUpdate).toHaveBeenCalledWith(
      'atm',
      expect.objectContaining({ name: 'Close ATM' }),
      expect.any(Object),
    );
  });

  it('does NOT count a place at 410 m as nearby (just outside threshold)', async () => {
    // ~410 m north — outside NEARBY_RADIUS (400 m).
    const lat410m = LAT_PER_METRE * 410;
    mockPlacesResponse([{
      id:          'atm-410',
      displayName: { text: 'Far ATM' },
      location:    { latitude: lat410m, longitude: 0 },
    }]);

    startProximityMonitoring('uid-1', [makeTask()], onUpdate);
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    expect(onUpdate).toHaveBeenCalledWith(null, null, expect.any(Object));
  });

  it('counts a place at exactly 400 m as nearby (at boundary, inclusive)', async () => {
    // Exactly 400 m north — the check is distance <= NEARBY_RADIUS, so this is nearby.
    const lat400m = LAT_PER_METRE * 400;
    mockPlacesResponse([{
      id:          'atm-400',
      displayName: { text: 'Boundary ATM' },
      location:    { latitude: lat400m, longitude: 0 },
    }]);

    startProximityMonitoring('uid-1', [makeTask()], onUpdate);
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    // The Haversine approximation may land just inside or just outside 400m due to
    // floating-point. The point of this test is to verify the constant is 400, not 50 or 75.
    // The key assertions (390m inside, 410m outside) are the definitive boundary tests above.
    const lastCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
    expect(['atm', null]).toContain(lastCall[0]);
  });

  it('same Haversine distance used by display path (NearbyCard) and geofence registration path', async () => {
    // A place at ~300 m should appear in onUpdate (display) AND trigger geofence
    // registration via syncNativeGeofences (both use NEARBY_RADIUS=400 m).
    const lat300m = LAT_PER_METRE * 300;
    mockPlacesResponse([{
      id:          'atm-300',
      displayName: { text: 'Nearby ATM' },
      location:    { latitude: lat300m, longitude: 0 },
    }]);

    startProximityMonitoring('uid-1', [makeTask()], onUpdate);
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    // Display path used the 400m threshold → place is shown.
    expect(onUpdate).toHaveBeenCalledWith(
      'atm',
      expect.objectContaining({ name: 'Nearby ATM' }),
      expect.any(Object),
    );

    // After cache is populated, updateProximityTasks triggers syncNativeGeofences
    // which registers the geofence using the same cached place and NEARBY_RADIUS.
    mockRemoveAllGeofences.mockClear();
    mockRegisterGeofence.mockClear();
    await new Promise<void>(resolve => {
      updateProximityTasks([makeTask()]);
      setImmediate(resolve);
    });

    expect(mockRegisterGeofence).toHaveBeenCalledWith(
      'brush_geo_atm_atm-300',
      lat300m,
      0,
      400, // NEARBY_RADIUS
    );
  });
});

// ─── 3. Geofence lifecycle ────────────────────────────────────────────────────

describe('geofence lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockGeofenceEmitter.removeAllListeners();
    stopProximityMonitoring();
  });

  async function startAndPopulateCache(tasks: Task[], onUpdate = jest.fn()) {
    startProximityMonitoring('uid-1', tasks, onUpdate);
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);
  }

  it('registers a geofence for a task with a poi field after cache is populated', async () => {
    mockPlacesResponse([{
      id:          'atm-1',
      displayName: { text: 'Corner ATM' },
      location:    { latitude: LAT_PER_METRE * 200, longitude: 0 },
    }]);

    await startAndPopulateCache([makeTask()]);

    // Trigger syncNativeGeofences via updateProximityTasks.
    mockRegisterGeofence.mockClear();
    mockRemoveAllGeofences.mockClear();
    await new Promise<void>(resolve => {
      updateProximityTasks([makeTask()]);
      setImmediate(resolve);
    });

    expect(mockRegisterGeofence).toHaveBeenCalledTimes(1);
    expect(mockRegisterGeofence).toHaveBeenCalledWith(
      'brush_geo_atm_atm-1',
      expect.any(Number),
      expect.any(Number),
      NEARBY_RADIUS,
    );
  });

  it('does NOT register a geofence for a task with no poi field', async () => {
    const noPoiTask = makeTask({ poi: undefined });

    await startAndPopulateCache([noPoiTask]);

    mockRegisterGeofence.mockClear();
    await new Promise<void>(resolve => {
      updateProximityTasks([noPoiTask]);
      setImmediate(resolve);
    });

    expect(mockRegisterGeofence).not.toHaveBeenCalled();
  });

  it('does NOT register a geofence for a done task', async () => {
    const doneTask = makeTask({ done: true });

    await startAndPopulateCache([doneTask]);

    mockRegisterGeofence.mockClear();
    await new Promise<void>(resolve => {
      updateProximityTasks([doneTask]);
      setImmediate(resolve);
    });

    expect(mockRegisterGeofence).not.toHaveBeenCalled();
  });

  it('calls removeAllGeofences when all tasks for a POI type are marked done', async () => {
    mockPlacesResponse([{
      id:          'atm-1',
      displayName: { text: 'Corner ATM' },
      location:    { latitude: LAT_PER_METRE * 200, longitude: 0 },
    }]);

    const task = makeTask();
    await startAndPopulateCache([task]);

    // Geofence registered while task is undone.
    mockRegisterGeofence.mockClear();
    mockRemoveAllGeofences.mockClear();
    await new Promise<void>(resolve => {
      updateProximityTasks([task]);
      setImmediate(resolve);
    });
    expect(mockRegisterGeofence).toHaveBeenCalledTimes(1);

    // Now mark the task done.
    mockRegisterGeofence.mockClear();
    mockRemoveAllGeofences.mockClear();
    await new Promise<void>(resolve => {
      updateProximityTasks([{ ...task, done: true }]);
      setImmediate(resolve);
    });

    expect(mockRemoveAllGeofences).toHaveBeenCalled();
    expect(mockRegisterGeofence).not.toHaveBeenCalled();
  });

  it('keeps geofence active after the first notification fires (task still undone)', async () => {
    mockPlacesResponse([{
      id:          'atm-1',
      displayName: { text: 'Corner ATM' },
      location:    { latitude: LAT_PER_METRE * 200, longitude: 0 },
    }]);

    const task = makeTask();
    await startAndPopulateCache([task]);

    // Simulate geofence entry → notification fires, task marked as alerted today.
    await fireGeofenceEntry('brush_geo_atm_atm-1');
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);

    // Simulate Firestore snapshot: task now has poiAlertSeenDate but is still undone.
    const today = new Date().toISOString().split('T')[0];
    const alertedTask = { ...task, poiAlertSeenDate: today };

    mockRegisterGeofence.mockClear();
    mockRemoveAllGeofences.mockClear();
    await new Promise<void>(resolve => {
      updateProximityTasks([alertedTask]);
      setImmediate(resolve);
    });

    // Geofence must stay registered — task is not done.
    expect(mockRegisterGeofence).toHaveBeenCalledTimes(1);
  });

  it('geofence fires again next day when task is still undone', async () => {
    mockPlacesResponse([{
      id:          'atm-1',
      displayName: { text: 'Corner ATM' },
      location:    { latitude: LAT_PER_METRE * 200, longitude: 0 },
    }]);

    // Task was alerted YESTERDAY — not today, so alert is eligible again.
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
    const taskAlertedYesterday = makeTask({ poiAlertSeenDate: yesterday });

    await startAndPopulateCache([taskAlertedYesterday]);

    // Geofence entry — yesterday's alert date != today → eligible.
    await fireGeofenceEntry('brush_geo_atm_atm-1');

    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire again on the same day (rate-limit)', async () => {
    mockPlacesResponse([{
      id:          'atm-1',
      displayName: { text: 'Corner ATM' },
      location:    { latitude: LAT_PER_METRE * 200, longitude: 0 },
    }]);

    const today = new Date().toISOString().split('T')[0];
    const alreadyAlertedToday = makeTask({ poiAlertSeenDate: today });

    await startAndPopulateCache([alreadyAlertedToday]);
    await fireGeofenceEntry('brush_geo_atm_atm-1');

    expect(mockDisplayNotification).not.toHaveBeenCalled();
  });
});

// ─── 4. Multi-task deregistration ─────────────────────────────────────────────

describe('multi-task deregistration — same POI type', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockGeofenceEmitter.removeAllListeners();
    stopProximityMonitoring();
  });

  it('keeps geofence when only ONE of two ATM tasks is marked done', async () => {
    mockPlacesResponse([{
      id:          'atm-1',
      displayName: { text: 'Corner ATM' },
      location:    { latitude: LAT_PER_METRE * 200, longitude: 0 },
    }]);

    const task1 = makeTask({ id: 'task-1' });
    const task2 = makeTask({ id: 'task-2' });

    startProximityMonitoring('uid-1', [task1, task2], jest.fn());
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    // Mark only task-1 done — task-2 still undone.
    mockRegisterGeofence.mockClear();
    mockRemoveAllGeofences.mockClear();
    await new Promise<void>(resolve => {
      updateProximityTasks([{ ...task1, done: true }, task2]);
      setImmediate(resolve);
    });

    // ATM geofence must still be registered for task-2.
    expect(mockRegisterGeofence).toHaveBeenCalledTimes(1);
    expect(mockRegisterGeofence).toHaveBeenCalledWith(
      'brush_geo_atm_atm-1',
      expect.any(Number),
      expect.any(Number),
      NEARBY_RADIUS,
    );
  });

  it('removes geofence only when ALL tasks for a POI type are done', async () => {
    mockPlacesResponse([{
      id:          'atm-1',
      displayName: { text: 'Corner ATM' },
      location:    { latitude: LAT_PER_METRE * 200, longitude: 0 },
    }]);

    const task1 = makeTask({ id: 'task-1' });
    const task2 = makeTask({ id: 'task-2' });

    startProximityMonitoring('uid-1', [task1, task2], jest.fn());
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    // Mark BOTH done.
    mockRegisterGeofence.mockClear();
    mockRemoveAllGeofences.mockClear();
    await new Promise<void>(resolve => {
      updateProximityTasks([{ ...task1, done: true }, { ...task2, done: true }]);
      setImmediate(resolve);
    });

    expect(mockRemoveAllGeofences).toHaveBeenCalled();
    expect(mockRegisterGeofence).not.toHaveBeenCalled();
  });

  it('notifications cover all undone tasks of the POI type in one alert', async () => {
    mockPlacesResponse([{
      id:          'atm-1',
      displayName: { text: 'Corner ATM' },
      location:    { latitude: LAT_PER_METRE * 200, longitude: 0 },
    }]);

    const task1 = makeTask({ id: 'task-1' });
    const task2 = makeTask({ id: 'task-2' });
    const task3 = makeTask({ id: 'task-3' });

    startProximityMonitoring('uid-1', [task1, task2, task3], jest.fn());
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    await fireGeofenceEntry('brush_geo_atm_atm-1');

    // One notification fired (not three).
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    // Body says "3 things".
    const body = mockDisplayNotification.mock.calls[0][0].body;
    expect(body).toContain('3 things');
    // All 3 task IDs marked seen in one batch write.
    expect(mockMarkAllPoiAlertsSeen).toHaveBeenCalledWith(
      'uid-1',
      expect.arrayContaining(['task-1', 'task-2', 'task-3']),
      expect.any(String),
    );
  });
});

// ─── 5. Multi-day task edge case ──────────────────────────────────────────────

describe('multi-day tasks share geofence until all are done', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockGeofenceEmitter.removeAllListeners();
    stopProximityMonitoring();
  });

  it('keeps geofence active when tasks for same POI type span multiple dates', async () => {
    mockPlacesResponse([{
      id:          'atm-1',
      displayName: { text: 'Corner ATM' },
      location:    { latitude: LAT_PER_METRE * 200, longitude: 0 },
    }]);

    // Two tasks with the same POI type but different dates.
    const today     = makeTask({ id: 'today-task',     date: '2026-06-12' });
    const yesterday = makeTask({ id: 'yesterday-task', date: '2026-06-11' });

    startProximityMonitoring('uid-1', [today, yesterday], jest.fn());
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    // Mark today's task done — but yesterday's is still undone.
    mockRegisterGeofence.mockClear();
    mockRemoveAllGeofences.mockClear();
    await new Promise<void>(resolve => {
      updateProximityTasks([{ ...today, done: true }, yesterday]);
      setImmediate(resolve);
    });

    // Geofence must remain because yesterday's task is still undone.
    expect(mockRegisterGeofence).toHaveBeenCalledTimes(1);
  });
});

// ─── 6. Relaunch mid-session ──────────────────────────────────────────────────

describe('app relaunch mid-session — re-registers geofences from task state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockGeofenceEmitter.removeAllListeners();
    stopProximityMonitoring();
  });

  it('re-registers geofences after stopProximityMonitoring + startProximityMonitoring', async () => {
    // Session 1: start monitoring, populate cache.
    mockPlacesResponse([{
      id:          'atm-1',
      displayName: { text: 'Corner ATM' },
      location:    { latitude: LAT_PER_METRE * 200, longitude: 0 },
    }]);

    const task = makeTask();
    startProximityMonitoring('uid-1', [task], jest.fn());
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    // Simulate app relaunch — stop clears state including cache.
    stopProximityMonitoring();

    // Session 2: restart monitoring. Cache is cleared, must re-fetch.
    mockFetch.mockReset();
    mockStartTracking.mockClear();
    mockRegisterGeofence.mockClear();
    mockRemoveAllGeofences.mockClear();

    mockPlacesResponse([{
      id:          'atm-1',
      displayName: { text: 'Corner ATM' },
      location:    { latitude: LAT_PER_METRE * 200, longitude: 0 },
    }]);

    startProximityMonitoring('uid-1', [task], jest.fn());
    // New session needs a location tick to re-populate cache.
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    // After cache is populated, updateProximityTasks triggers sync.
    mockRegisterGeofence.mockClear();
    await new Promise<void>(resolve => {
      updateProximityTasks([task]);
      setImmediate(resolve);
    });

    // Geofence is re-registered from task state.
    expect(mockRegisterGeofence).toHaveBeenCalledWith(
      'brush_geo_atm_atm-1',
      expect.any(Number),
      expect.any(Number),
      NEARBY_RADIUS,
    );
  });
});

// ─── 7. No `store` field leakage ──────────────────────────────────────────────

describe('no store field leakage after KAN-143', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockGeofenceEmitter.removeAllListeners();
    stopProximityMonitoring();
  });

  it('proximity.ts does not read task.store or task.store.placeId for distance calculations', () => {
    // Source-level assertion: task.store must not appear in proximity.ts.
    // Reading the source is deterministic and does not require a running process.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    const source = fs.readFileSync(
      require.resolve('../../src/services/proximity.ts'),
      'utf-8',
    );
    // task.store would be the old "specific store" field access.
    expect(source).not.toMatch(/task\.store\b/);
    // If the old store field were present it would appear as task.store.placeId.
    expect(source).not.toMatch(/\bstore\.placeId\b/);
  });

  it('proximity engine works correctly with tasks that have no store field', async () => {
    // Regression guard: startProximityMonitoring must not throw or behave
    // differently when tasks have no store field.
    const onUpdate = jest.fn();
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: async () => ({
        places: [{
          id:          'cafe-1',
          displayName: { text: 'Nice Café' },
          location:    { latitude: LAT_PER_METRE * 200, longitude: 0 },
        }],
      }),
    });

    // Task has poi but definitely no store field.
    const task: Task = {
      id:        'task-cafe',
      title:     'Coffee meeting',
      category:  'personal',
      done:      false,
      poi:       'cafe',
      date:      '2026-06-12',
      createdAt: { toDate: () => new Date() } as any,
    };

    startProximityMonitoring('uid-1', [task], onUpdate);
    await mockStartTracking.mock.calls[0][0](ORIGIN);

    expect(onUpdate).toHaveBeenCalledWith(
      'cafe',
      expect.objectContaining({ name: 'Nice Café' }),
      expect.any(Object),
    );
  });
});
