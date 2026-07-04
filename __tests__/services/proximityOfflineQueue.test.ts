/**
 * KAN-205 — Offline queue for Places API calls.
 *
 * Verifies that when searchNearbyPlaces fails while the device is offline,
 * the search is queued and retried (FIFO) when NetInfo fires isConnected=true.
 * Stale entries (>5 min) are discarded on flush.
 */

// ─── NetInfo mock ─────────────────────────────────────────────────────────────

let _netInfoListener: ((state: { isConnected: boolean }) => void) | null = null;
let _mockIsConnected = true;

const mockNetInfoFetch = jest.fn(() => Promise.resolve({ isConnected: _mockIsConnected }));
const mockNetInfoAddEventListener = jest.fn((cb: (state: { isConnected: boolean }) => void) => {
  _netInfoListener = cb;
  return jest.fn(); // unsubscribe
});

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch:            (...args: unknown[]) => mockNetInfoFetch(...args),
    addEventListener: (...args: unknown[]) => mockNetInfoAddEventListener(...args),
  },
}));

// KAN-228 — proximity.ts now fire-and-forgets into the habitat cache, which
// pulls in expo-sqlite (ESM, breaks Jest's transform). Not under test here.
jest.mock('../../src/services/habitatCache');

// ─── Other required mocks ─────────────────────────────────────────────────────

const mockGetCurrentPositionAsync = jest.fn();

jest.mock('expo-location', () => ({
  Accuracy: { High: 4, Balanced: 3, Low: 2 },
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  stopGeofencingAsync: jest.fn().mockResolvedValue(undefined),
  getCurrentPositionAsync: (...args: unknown[]) => mockGetCurrentPositionAsync(...args),
}));

jest.mock('react-native', () => ({
  Alert:              { alert: jest.fn() },
  Linking:            { openSettings: jest.fn() },
  Platform:           { OS: 'android' },
  InteractionManager: { runAfterInteractions: (cb: () => void) => cb() },
}));

const mockSearchNearbyPlaces = jest.fn();
jest.mock('../../src/services/maps', () => ({
  getDistanceMeters: jest.fn(() => 50),
  searchNearbyPlaces: (...args: unknown[]) => mockSearchNearbyPlaces(...args),
  placeTypeLabel: jest.fn((t: string) => t),
}));

jest.mock('@notifee/react-native', () => ({
  default: { createChannel: jest.fn(), displayNotification: jest.fn() },
  AndroidImportance: { HIGH: 4 },
}));

jest.mock('../../src/services/firestore', () => ({
  markAllPoiAlertsSeen: jest.fn(),
  markExitPromptSeen: jest.fn(),
}));

jest.mock('../../src/services/notifications', () => ({
  fireExitPrompt: jest.fn(),
}));

jest.mock('../../src/native/WearNotificationModule', () => null);

jest.mock('../../src/utils/date', () => ({
  todayISO: jest.fn(() => '2026-06-27'),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import {
  runProximitySearch,
  resetProximityState,
  __getPendingQueue,
  __clearPendingQueue,
  __setNetInfoUnsubscribe,
} from '../../src/services/proximity';
import { Task } from '../../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makePosition = (lat: number, lng: number) => ({
  coords: { latitude: lat, longitude: lng, accuracy: 20 },
});

const makeTask = (id: string, poi: string): Task => ({
  id,
  title:     'Test task',
  category:  'errands',
  done:      false,
  poi:       poi as Task['poi'],
  date:      '2026-06-27',
  createdAt: { toDate: () => new Date() } as unknown as Task['createdAt'],
});

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  _netInfoListener    = null;
  _mockIsConnected    = true;
  mockGetCurrentPositionAsync.mockResolvedValue(makePosition(38.7, -9.1));
  resetProximityState();
  __setNetInfoUnsubscribe(null); // force fresh listener registration
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('offline queue — enqueue', () => {
  it('enqueues search when Places API fails offline', async () => {
    _mockIsConnected = false;
    mockNetInfoFetch.mockResolvedValue({ isConnected: false });
    mockSearchNearbyPlaces.mockRejectedValue(new Error('Network request failed'));

    const onUpdate = jest.fn();
    const tasks    = [makeTask('t1', 'supermarket')];

    await runProximitySearch('uid1', tasks, onUpdate);

    expect(__getPendingQueue()).toHaveLength(1);
    expect(__getPendingQueue()[0].uid).toBe('uid1');
  });

  it('does NOT enqueue when Places API fails online (e.g. timeout, API error)', async () => {
    _mockIsConnected = true;
    mockNetInfoFetch.mockResolvedValue({ isConnected: true });
    mockSearchNearbyPlaces.mockRejectedValue(new Error('Places API 429: Too Many Requests'));

    const onUpdate = jest.fn();
    await runProximitySearch('uid1', [makeTask('t1', 'supermarket')], onUpdate);

    expect(__getPendingQueue()).toHaveLength(0);
  });

  it('registers NetInfo listener on first enqueue', async () => {
    _mockIsConnected = false;
    mockNetInfoFetch.mockResolvedValue({ isConnected: false });
    mockSearchNearbyPlaces.mockRejectedValue(new Error('Network request failed'));

    await runProximitySearch('uid1', [makeTask('t1', 'cafe')], jest.fn());

    expect(mockNetInfoAddEventListener).toHaveBeenCalledTimes(1);
  });

  it('does not register NetInfo listener twice', async () => {
    _mockIsConnected = false;
    mockNetInfoFetch.mockResolvedValue({ isConnected: false });
    mockSearchNearbyPlaces.mockRejectedValue(new Error('Network request failed'));

    await runProximitySearch('uid1', [makeTask('t1', 'cafe')], jest.fn());
    await runProximitySearch('uid2', [makeTask('t2', 'atm')], jest.fn());

    expect(mockNetInfoAddEventListener).toHaveBeenCalledTimes(1);
  });
});

describe('offline queue — flush on reconnect', () => {
  it('flushes queue FIFO when connection returns', async () => {
    // Enqueue two searches while offline.
    _mockIsConnected = false;
    mockNetInfoFetch.mockResolvedValue({ isConnected: false });
    mockSearchNearbyPlaces.mockRejectedValue(new Error('Network request failed'));

    const onUpdate1 = jest.fn();
    const onUpdate2 = jest.fn();
    await runProximitySearch('uid1', [makeTask('t1', 'supermarket')], onUpdate1);
    await runProximitySearch('uid2', [makeTask('t2', 'cafe')], onUpdate2);

    expect(__getPendingQueue()).toHaveLength(2);

    // Come back online — Places API now succeeds.
    // Reset call count so we only count flush calls.
    mockSearchNearbyPlaces.mockClear();
    mockSearchNearbyPlaces.mockResolvedValue({ supermarket: [], cafe: [] });

    _mockIsConnected = true;
    _netInfoListener?.({ isConnected: true });

    // Allow microtasks to settle.
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(__getPendingQueue()).toHaveLength(0);
    expect(mockSearchNearbyPlaces).toHaveBeenCalledTimes(2);
  });

  it('queue is empty after flush — does not double-flush', async () => {
    _mockIsConnected = false;
    mockNetInfoFetch.mockResolvedValue({ isConnected: false });
    mockSearchNearbyPlaces.mockRejectedValue(new Error('Network request failed'));
    await runProximitySearch('uid1', [makeTask('t1', 'pharmacy')], jest.fn());

    _mockIsConnected = true;
    mockSearchNearbyPlaces.mockResolvedValue({ pharmacy: [] });
    _netInfoListener?.({ isConnected: true });
    await new Promise(resolve => setTimeout(resolve, 0));

    // Second flush: nothing to do.
    const callsAfterFirstFlush = mockSearchNearbyPlaces.mock.calls.length;
    _netInfoListener?.({ isConnected: true });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mockSearchNearbyPlaces.mock.calls.length).toBe(callsAfterFirstFlush);
  });
});

describe('offline queue — stale discard', () => {
  it('discards entries older than 5 minutes on flush', async () => {
    _mockIsConnected = false;
    mockNetInfoFetch.mockResolvedValue({ isConnected: false });
    mockSearchNearbyPlaces.mockRejectedValue(new Error('Network request failed'));

    await runProximitySearch('uid1', [makeTask('t1', 'atm')], jest.fn());

    // Back-date the entry by 6 minutes.
    const queue = __getPendingQueue();
    queue[0].enqueuedAt = Date.now() - 6 * 60 * 1_000;

    // Reset call count — interested in calls during flush only.
    mockSearchNearbyPlaces.mockClear();
    mockSearchNearbyPlaces.mockResolvedValue({ atm: [] });

    _mockIsConnected = true;
    _netInfoListener?.({ isConnected: true });
    await new Promise(resolve => setTimeout(resolve, 0));

    // Stale entry discarded — no API call fired during flush.
    expect(mockSearchNearbyPlaces).not.toHaveBeenCalled();
    expect(__getPendingQueue()).toHaveLength(0);
  });

  it('keeps fresh entries and discards stale ones in mixed queue', async () => {
    _mockIsConnected = false;
    mockNetInfoFetch.mockResolvedValue({ isConnected: false });
    mockSearchNearbyPlaces.mockRejectedValue(new Error('Network request failed'));

    await runProximitySearch('uid-stale', [makeTask('t1', 'atm')], jest.fn());
    await runProximitySearch('uid-fresh', [makeTask('t2', 'cafe')], jest.fn());

    // Back-date only the first entry.
    __getPendingQueue()[0].enqueuedAt = Date.now() - 6 * 60 * 1_000;

    // Reset call count — interested in calls during flush only.
    mockSearchNearbyPlaces.mockClear();
    mockSearchNearbyPlaces.mockResolvedValue({ cafe: [] });

    _mockIsConnected = true;
    _netInfoListener?.({ isConnected: true });
    await new Promise(resolve => setTimeout(resolve, 0));

    // Only the fresh entry ran.
    expect(mockSearchNearbyPlaces).toHaveBeenCalledTimes(1);
  });
});

describe('offline queue — reset', () => {
  it('resetProximityState clears the pending queue', async () => {
    _mockIsConnected = false;
    mockNetInfoFetch.mockResolvedValue({ isConnected: false });
    mockSearchNearbyPlaces.mockRejectedValue(new Error('Network request failed'));
    await runProximitySearch('uid1', [makeTask('t1', 'supermarket')], jest.fn());

    expect(__getPendingQueue()).toHaveLength(1);
    resetProximityState();
    expect(__getPendingQueue()).toHaveLength(0);
  });

  it('resetProximityState tears down the NetInfo listener', async () => {
    _mockIsConnected = false;
    mockNetInfoFetch.mockResolvedValue({ isConnected: false });
    mockSearchNearbyPlaces.mockRejectedValue(new Error('Network request failed'));
    await runProximitySearch('uid1', [makeTask('t1', 'supermarket')], jest.fn());

    const unsubscribeSpy = mockNetInfoAddEventListener.mock.results[0]?.value;
    resetProximityState();

    expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
  });
});

describe('offline queue — resilience', () => {
  it('does not enqueue when NetInfo.fetch() rejects', async () => {
    _mockIsConnected = false;
    mockNetInfoFetch.mockRejectedValue(new Error('NetInfo unavailable'));
    mockSearchNearbyPlaces.mockRejectedValue(new Error('Network request failed'));

    await runProximitySearch('uid1', [makeTask('t1', 'supermarket')], jest.fn());

    // NetInfo.fetch() threw — connection state unknown — should NOT enqueue.
    expect(__getPendingQueue()).toHaveLength(0);
  });

  it('listener is unregistered after queue fully drains', async () => {
    _mockIsConnected = false;
    mockNetInfoFetch.mockResolvedValue({ isConnected: false });
    mockSearchNearbyPlaces.mockRejectedValue(new Error('Network request failed'));
    await runProximitySearch('uid1', [makeTask('t1', 'cafe')], jest.fn());

    const unsubscribeSpy = mockNetInfoAddEventListener.mock.results[0]?.value;

    // Flush successfully.
    mockSearchNearbyPlaces.mockClear();
    mockSearchNearbyPlaces.mockResolvedValue({ cafe: [] });
    _mockIsConnected = true;
    _netInfoListener?.({ isConnected: true });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(__getPendingQueue()).toHaveLength(0);
    expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
  });
});
