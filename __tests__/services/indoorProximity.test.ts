/**
 * indoorProximity.test.ts — KAN-75 / updated KAN-143
 *
 * Unit tests for the indoor proximity engine.
 * Store-based matching tests removed (KAN-143 — Task.store deleted).
 * POI-type proximity will be rebuilt in KAN-142.
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
    const dlat = (lat2 - lat1) * 111_320;
    const dlng = (lng2 - lng1) * 111_320 * Math.cos((lat1 * Math.PI) / 180);
    return Math.sqrt(dlat * dlat + dlng * dlng);
  }),
}));
jest.mock('../../src/services/geolocation', () => ({
  getCurrentPosition: jest.fn(),
}));
jest.mock('../../src/services/firestore', () => ({
  markExitPromptSeen: jest.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = '2026-06-08';

function makeTask(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title:     `Task ${id}`,
    category:  'errands',
    done:      false,
    date:      TODAY,
    createdAt: { seconds: 0, nanoseconds: 0 } as any,
    ...overrides,
  };
}

function makePlace(overrides: Partial<NearbyPlace> = {}): NearbyPlace {
  return {
    placeId:        'place-1',
    name:           'Test Store',
    lat:            51.5,
    lng:            -0.1,
    distanceMeters: 5,
    ...overrides,
  };
}

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

// ─── Matching now always returns null (KAN-143) ───────────────────────────────

describe('matching (store-based matching removed in KAN-143)', () => {
  it('always fires callback with (null, null) — POI proximity rebuilt in KAN-142', async () => {
    const place = makePlace({ distanceMeters: 5 });
    mockSearch.mockResolvedValue([place]);

    const onNearby = jest.fn();
    startIndoorProximityMonitoring('uid-1', [makeTask('t1')], onNearby);
    await __pollOnce();

    expect(onNearby).toHaveBeenCalledWith(null, null);
    expect(mockFireNotif).not.toHaveBeenCalled();
    expect(mockMarkSeen).not.toHaveBeenCalled();
  });
});

// ─── Stationary optimisation ──────────────────────────────────────────────────

describe('stationary optimisation', () => {
  it('calls Places API on the first tick', async () => {
    startIndoorProximityMonitoring('uid-1', [makeTask('t1')], jest.fn());
    await __pollOnce();
    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  it('skips Places API call when user moved less than INDOOR_STATIONARY_THRESHOLD_M', async () => {
    mockGetPos.mockResolvedValue(AT_STORE);
    startIndoorProximityMonitoring('uid-1', [makeTask('t1')], jest.fn());
    await __pollOnce();
    expect(mockSearch).toHaveBeenCalledTimes(1);

    // Tiny movement — well under threshold.
    mockGetPos.mockResolvedValue({
      lat: AT_STORE.lat + 0.000001,
      lng: AT_STORE.lng,
      accuracy: AT_STORE.accuracy,
    });
    await __pollOnce();
    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  it('calls Places API again when user moves past INDOOR_STATIONARY_THRESHOLD_M', async () => {
    mockGetPos.mockResolvedValue(AT_STORE);
    startIndoorProximityMonitoring('uid-1', [makeTask('t1')], jest.fn());
    await __pollOnce();
    expect(mockSearch).toHaveBeenCalledTimes(1);

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

    expect(onNearby).not.toHaveBeenCalled();
    expect(mockSearch).not.toHaveBeenCalled();
  });
});

// ─── updateIndoorTasks ────────────────────────────────────────────────────────

describe('updateIndoorTasks', () => {
  it('does not throw when updating the task list', async () => {
    startIndoorProximityMonitoring('uid-1', [makeTask('t1')], jest.fn());
    expect(() => updateIndoorTasks([makeTask('t1'), makeTask('t2')])).not.toThrow();
  });

  it('is a no-op when engine is not running', () => {
    expect(() => updateIndoorTasks([makeTask('t1')])).not.toThrow();
  });
});
