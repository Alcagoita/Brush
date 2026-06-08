/**
 * indoorProximity.test.ts — KAN-75
 *
 * Unit tests for the indoor proximity engine.
 *
 * All external I/O is replaced with injected mocks via __set* helpers so
 * tests run without native modules or timers. __pollOnce() drives individual
 * tick executions synchronously.
 */

import {
  startIndoorProximityMonitoring,
  stopIndoorProximityMonitoring,
  updateIndoorTasks,
  __setGetPosition,
  __setSearchPlaces,
  __setFireNotif,
  __setMarkSeen,
  __setGetToday,
  __resetDeps,
  __isMonitoring,
  __pollOnce,
  INDOOR_MATCH_RADIUS_M,
  INDOOR_STATIONARY_THRESHOLD_M,
} from '../../src/services/indoorProximity';
import type { Task } from '../../src/types';
import type { NearbyPlace } from '../../src/services/maps';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('../../src/services/indoorDetection', () => ({
  feedLocation: jest.fn(),
}));
jest.mock('@notifee/react-native', () => ({
  __esModule:          true,
  default:             { createChannel: jest.fn(), displayNotification: jest.fn() },
  AndroidImportance:   { HIGH: 4 },
}));
jest.mock('../../src/services/maps', () => ({
  searchNearbyPlaces: jest.fn(),
  getDistanceMeters:  jest.fn((lat1: number, lng1: number, lat2: number, lng2: number) => {
    // Real haversine is overkill in tests — use Euclidean distance scaled to metres.
    const dlat = (lat2 - lat1) * 111_320;
    const dlng = (lng2 - lng1) * 111_320 * Math.cos((lat1 * Math.PI) / 180);
    return Math.sqrt(dlat * dlat + dlng * dlng);
  }),
}));
jest.mock('../../src/services/geolocation', () => ({
  getCurrentPosition: jest.fn(),
}));
jest.mock('../../src/services/firestore', () => ({
  markStoreAlertSeen: jest.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = '2026-06-08';

/** Build a minimal Task with a `store` tag. */
function makeTask(
  id: string,
  overrides: Partial<Task> & { storeName?: string; storePlaceId?: string; storeSeenDate?: string } = {},
): Task {
  const { storeName = 'Test Store', storePlaceId, storeSeenDate, ...rest } = overrides;
  return {
    id,
    title:     `Task ${id}`,
    category:  'errands',
    done:      false,
    date:      TODAY,
    createdAt: { seconds: 0, nanoseconds: 0 } as any,
    store: {
      name:          storeName,
      placeId:       storePlaceId,
      alertSeenDate: storeSeenDate,
    },
    ...rest,
  };
}

/** Build a NearbyPlace fixture. */
function makePlace(
  overrides: Partial<NearbyPlace> = {},
): NearbyPlace {
  return {
    placeId:        'place-1',
    name:           'Test Store',
    lat:            51.5,
    lng:            -0.1,
    distanceMeters: 5,
    ...overrides,
  };
}

/** Position fixture — simulates GPS at the store location. */
const AT_STORE = { lat: 51.5, lng: -0.1, accuracy: 8 };

// ─── Setup / teardown ─────────────────────────────────────────────────────────

let mockFireNotif: jest.Mock;
let mockMarkSeen:  jest.Mock;
let mockSearch:    jest.Mock;
let mockGetPos:    jest.Mock;

beforeEach(() => {
  __resetDeps();
  stopIndoorProximityMonitoring();

  mockGetPos    = jest.fn().mockResolvedValue(AT_STORE);
  mockSearch    = jest.fn().mockResolvedValue([]);
  mockFireNotif = jest.fn().mockResolvedValue(undefined);
  mockMarkSeen  = jest.fn().mockResolvedValue(undefined);

  __setGetPosition(mockGetPos);
  __setSearchPlaces(mockSearch);
  __setFireNotif(mockFireNotif);
  __setMarkSeen(mockMarkSeen);
  __setGetToday(() => TODAY);
});

afterEach(() => {
  stopIndoorProximityMonitoring();
  __resetDeps();
  jest.clearAllMocks();
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────

describe('lifecycle', () => {
  it('starts monitoring and returns a cleanup function', () => {
    const stop = startIndoorProximityMonitoring('uid-1', [], jest.fn());
    expect(__isMonitoring()).toBe(true);
    stop();
    expect(__isMonitoring()).toBe(false);
  });

  it('stops monitoring via stopIndoorProximityMonitoring()', () => {
    startIndoorProximityMonitoring('uid-1', [], jest.fn());
    stopIndoorProximityMonitoring();
    expect(__isMonitoring()).toBe(false);
  });

  it('restarts cleanly if started twice', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    startIndoorProximityMonitoring('uid-1', [], cb1);
    startIndoorProximityMonitoring('uid-1', [], cb2);
    expect(__isMonitoring()).toBe(true);
  });
});

// ─── Match logic: placeId ─────────────────────────────────────────────────────

describe('match by placeId', () => {
  it('fires callback when task placeId matches place placeId', async () => {
    const place = makePlace({ placeId: 'gpl-123', distanceMeters: INDOOR_MATCH_RADIUS_M - 1 });
    const task  = makeTask('t1', { storePlaceId: 'gpl-123' });
    mockSearch.mockResolvedValue([place]);

    const onNearby = jest.fn();
    startIndoorProximityMonitoring('uid-1', [task], onNearby);
    await __pollOnce();

    expect(onNearby).toHaveBeenCalledWith(task, place);
  });

  it('does not match when placeId differs', async () => {
    const place = makePlace({ placeId: 'gpl-999', distanceMeters: 5 });
    const task  = makeTask('t1', { storePlaceId: 'gpl-123' });
    mockSearch.mockResolvedValue([place]);

    const onNearby = jest.fn();
    startIndoorProximityMonitoring('uid-1', [task], onNearby);
    await __pollOnce();

    expect(onNearby).toHaveBeenCalledWith(null, null);
  });
});

// ─── Match logic: name (fallback) ─────────────────────────────────────────────

describe('match by name (case-insensitive)', () => {
  it('matches when names are equal (exact case)', async () => {
    const place = makePlace({ placeId: 'gpl-x', name: 'Whole Foods', distanceMeters: 5 });
    const task  = makeTask('t1', { storeName: 'Whole Foods' });
    mockSearch.mockResolvedValue([place]);

    const onNearby = jest.fn();
    startIndoorProximityMonitoring('uid-1', [task], onNearby);
    await __pollOnce();

    expect(onNearby).toHaveBeenCalledWith(task, place);
  });

  it('matches case-insensitively', async () => {
    const place = makePlace({ placeId: 'gpl-x', name: 'WHOLE FOODS', distanceMeters: 5 });
    const task  = makeTask('t1', { storeName: 'whole foods' });
    mockSearch.mockResolvedValue([place]);

    const onNearby = jest.fn();
    startIndoorProximityMonitoring('uid-1', [task], onNearby);
    await __pollOnce();

    expect(onNearby).toHaveBeenCalledWith(task, place);
  });

  it('does not match when names differ', async () => {
    const place = makePlace({ name: 'Whole Foods', distanceMeters: 5 });
    const task  = makeTask('t1', { storeName: 'Boots Pharmacy' });
    mockSearch.mockResolvedValue([place]);

    const onNearby = jest.fn();
    startIndoorProximityMonitoring('uid-1', [task], onNearby);
    await __pollOnce();

    expect(onNearby).toHaveBeenCalledWith(null, null);
  });
});

// ─── Distance threshold ────────────────────────────────────────────────────────

describe('distance threshold', () => {
  it('does not match when place is beyond INDOOR_MATCH_RADIUS_M', async () => {
    const place = makePlace({ distanceMeters: INDOOR_MATCH_RADIUS_M + 1 });
    const task  = makeTask('t1');
    mockSearch.mockResolvedValue([place]);

    const onNearby = jest.fn();
    startIndoorProximityMonitoring('uid-1', [task], onNearby);
    await __pollOnce();

    expect(onNearby).toHaveBeenCalledWith(null, null);
  });

  it('matches when place is exactly at INDOOR_MATCH_RADIUS_M', async () => {
    const place = makePlace({ distanceMeters: INDOOR_MATCH_RADIUS_M });
    const task  = makeTask('t1');
    mockSearch.mockResolvedValue([place]);

    const onNearby = jest.fn();
    startIndoorProximityMonitoring('uid-1', [task], onNearby);
    await __pollOnce();

    expect(onNearby).toHaveBeenCalledWith(task, place);
  });
});

// ─── Deduplication (alertSeenDate) ────────────────────────────────────────────

describe('deduplication via alertSeenDate', () => {
  it('skips a task whose alertSeenDate matches today', async () => {
    const place = makePlace({ distanceMeters: 5 });
    const task  = makeTask('t1', { storeSeenDate: TODAY });
    mockSearch.mockResolvedValue([place]);

    const onNearby = jest.fn();
    startIndoorProximityMonitoring('uid-1', [task], onNearby);
    await __pollOnce();

    expect(onNearby).toHaveBeenCalledWith(null, null);
    expect(mockFireNotif).not.toHaveBeenCalled();
  });

  it('alerts when alertSeenDate is yesterday', async () => {
    const place = makePlace({ distanceMeters: 5 });
    const task  = makeTask('t1', { storeSeenDate: '2026-06-07' });
    mockSearch.mockResolvedValue([place]);

    const onNearby = jest.fn();
    startIndoorProximityMonitoring('uid-1', [task], onNearby);
    await __pollOnce();

    expect(onNearby).toHaveBeenCalledWith(task, place);
    expect(mockFireNotif).toHaveBeenCalledWith(task, place);
  });

  it('optimistically stamps alertSeenDate in memory to prevent double-alert on next tick', async () => {
    const place = makePlace({ distanceMeters: 5 });
    const task  = makeTask('t1');
    mockSearch.mockResolvedValue([place]);

    const onNearby = jest.fn();
    startIndoorProximityMonitoring('uid-1', [task], onNearby);

    // First tick — should alert.
    await __pollOnce();
    expect(mockFireNotif).toHaveBeenCalledTimes(1);

    // Second tick — memory stamp suppresses.
    await __pollOnce();
    expect(mockFireNotif).toHaveBeenCalledTimes(1);
  });

  it('writes alertSeenDate to Firestore via markStoreAlertSeen', async () => {
    const place = makePlace({ distanceMeters: 5 });
    const task  = makeTask('t1');
    mockSearch.mockResolvedValue([place]);

    startIndoorProximityMonitoring('uid-1', [task], jest.fn());
    await __pollOnce();

    expect(mockMarkSeen).toHaveBeenCalledWith('uid-1', 't1', TODAY);
  });
});

// ─── Skips done tasks ─────────────────────────────────────────────────────────

describe('done tasks', () => {
  it('ignores done tasks', async () => {
    const place = makePlace({ distanceMeters: 5 });
    const task  = makeTask('t1', { done: true } as any);
    mockSearch.mockResolvedValue([place]);

    const onNearby = jest.fn();
    startIndoorProximityMonitoring('uid-1', [task], onNearby);
    await __pollOnce();

    expect(onNearby).toHaveBeenCalledWith(null, null);
  });

  it('ignores tasks without a store field', async () => {
    const place = makePlace({ distanceMeters: 5 });
    const task = { ...makeTask('t1'), store: undefined };
    mockSearch.mockResolvedValue([place]);

    const onNearby = jest.fn();
    startIndoorProximityMonitoring('uid-1', [task], onNearby);
    await __pollOnce();

    expect(onNearby).toHaveBeenCalledWith(null, null);
  });
});

// ─── Stationary optimisation ──────────────────────────────────────────────────

describe('stationary optimisation', () => {
  it('calls Places API on the first tick', async () => {
    const task = makeTask('t1');
    mockSearch.mockResolvedValue([]);

    startIndoorProximityMonitoring('uid-1', [task], jest.fn());
    await __pollOnce();

    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  it('skips Places API call when user moved less than INDOOR_STATIONARY_THRESHOLD_M', async () => {
    const task = makeTask('t1');
    mockSearch.mockResolvedValue([]);

    // First tick — establishes lastPos.
    mockGetPos.mockResolvedValue(AT_STORE);
    startIndoorProximityMonitoring('uid-1', [task], jest.fn());
    await __pollOnce();
    expect(mockSearch).toHaveBeenCalledTimes(1);

    // Second tick — tiny movement (0.000001° ≈ 0.11m, well under threshold).
    mockGetPos.mockResolvedValue({
      lat: AT_STORE.lat + 0.000001,
      lng: AT_STORE.lng,
      accuracy: AT_STORE.accuracy,
    });
    await __pollOnce();
    expect(mockSearch).toHaveBeenCalledTimes(1); // still once
  });

  it('calls Places API again when user moves enough', async () => {
    const task = makeTask('t1');
    mockSearch.mockResolvedValue([]);

    mockGetPos.mockResolvedValue(AT_STORE);
    startIndoorProximityMonitoring('uid-1', [task], jest.fn());
    await __pollOnce();
    expect(mockSearch).toHaveBeenCalledTimes(1);

    // Move 5m north (≈ 0.000045° latitude).
    const movedPos = {
      lat: AT_STORE.lat + (INDOOR_STATIONARY_THRESHOLD_M + 3) / 111_320,
      lng: AT_STORE.lng,
      accuracy: AT_STORE.accuracy,
    };
    mockGetPos.mockResolvedValue(movedPos);
    await __pollOnce();
    expect(mockSearch).toHaveBeenCalledTimes(2);
  });
});

// ─── GPS unavailable ──────────────────────────────────────────────────────────

describe('GPS error handling', () => {
  it('skips the tick gracefully when getCurrentPosition rejects', async () => {
    mockGetPos.mockRejectedValue(new Error('GPS timeout'));

    const onNearby = jest.fn();
    startIndoorProximityMonitoring('uid-1', [makeTask('t1')], onNearby);
    await __pollOnce();

    // No crash; callback not called; no Places search attempted.
    expect(onNearby).not.toHaveBeenCalled();
    expect(mockSearch).not.toHaveBeenCalled();
  });
});

// ─── updateIndoorTasks ────────────────────────────────────────────────────────

describe('updateIndoorTasks', () => {
  it('updates the task list consumed by subsequent ticks', async () => {
    const place    = makePlace({ distanceMeters: 5 });
    const task     = makeTask('t1');
    const noopTask = makeTask('t2', { storeName: 'Other Store' });
    mockSearch.mockResolvedValue([place]);

    const onNearby = jest.fn();
    startIndoorProximityMonitoring('uid-1', [noopTask], onNearby);

    // Replace task list so t1 is now visible.
    updateIndoorTasks([noopTask, task]);

    await __pollOnce();

    expect(onNearby).toHaveBeenCalledWith(task, place);
  });

  it('is a no-op when engine is not running', () => {
    expect(() => updateIndoorTasks([makeTask('t1')])).not.toThrow();
  });
});
