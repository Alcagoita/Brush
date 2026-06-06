/**
 * KAN-25 — Firebase POI preferences tests.
 *
 * Covers:
 *   - subscribeToPoiPreferences: fires correct Record<string, number> from snapshot
 *   - getPoiPreference: returns stored value; falls back to spec default
 *   - setPoiPreference: writes correct Firestore document
 *   - getPoiPreferencesMap: one-shot flat map
 *   - Proximity engine: user pref overrides built-in default
 *   - Proximity engine: falls back to built-in when no pref stored
 *   - Proximity engine: uses DEFAULT_GEOFENCE_RADIUS for custom types with no pref
 *   - updateProximityPoiPreferences: invalidates place cache (forces re-search)
 */

jest.mock('../../src/config/keys', () => ({
  GOOGLE_PLACES_API_KEY: 'TEST_KEY',
}));

// ─── Firestore mock ───────────────────────────────────────────────────────────

type SnapshotCallback = (snap: { docs: Array<{ data: () => object }> }) => void;

const mockOnSnapshot  = jest.fn();
const mockGetDoc      = jest.fn();
const mockGetDocs     = jest.fn();
const mockSetDoc      = jest.fn();

jest.mock('@react-native-firebase/firestore', () => {
  const col  = jest.fn(() => ({ _type: 'collection' }));
  const docFn = jest.fn(() => ({ _type: 'doc' }));
  return {
    getFirestore:    jest.fn(),
    collection:      col,
    doc:             docFn,
    addDoc:          jest.fn(),
    getDoc:          (...args: unknown[]) => mockGetDoc(...args),
    getDocs:         (...args: unknown[]) => mockGetDocs(...args),
    updateDoc:       jest.fn(),
    deleteDoc:       jest.fn(),
    setDoc:          (...args: unknown[]) => mockSetDoc(...args),
    query:           jest.fn((...a: unknown[]) => a[0]),
    where:           jest.fn(),
    orderBy:         jest.fn(),
    onSnapshot:      (...args: unknown[]) => mockOnSnapshot(...args),
    serverTimestamp: jest.fn(),
    Timestamp:       {},
  };
});

// ─── Notifee / geolocation / firestore (proximity) stubs ─────────────────────

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel:       jest.fn().mockResolvedValue(undefined),
    displayNotification: jest.fn().mockResolvedValue(undefined),
  },
  AndroidImportance: { HIGH: 4 },
  AndroidStyle:      { BIGTEXT: 'BIGTEXT' },
}));

jest.mock('react-native', () => ({
  Platform:      { OS: 'android' },
  NativeModules: { WearNotificationModule: { sendProximityAlert: jest.fn() } },
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

const mockFetch = jest.fn();
global.fetch    = mockFetch as unknown as typeof fetch;

function mockPlacesResponse(places: Array<{ id: string; displayName: { text: string }; location: { latitude: number; longitude: number } }>) {
  mockFetch.mockResolvedValueOnce({
    ok:   true,
    json: async () => ({ places }),
  });
}

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {
  subscribeToPoiPreferences,
  getPoiPreference,
  setPoiPreference,
  getPoiPreferencesMap,
} from '../../src/services/firestore';
import {
  startProximityMonitoring,
  stopProximityMonitoring,
  updateProximityPoiPreferences,
} from '../../src/services/proximity';

// ─── subscribeToPoiPreferences ────────────────────────────────────────────────

describe('subscribeToPoiPreferences', () => {
  beforeEach(() => {
    mockOnSnapshot.mockClear();
  });

  it('fires onUpdate with an empty map when collection is empty', () => {
    mockOnSnapshot.mockImplementation((_ref: unknown, cb: SnapshotCallback) => {
      cb({ docs: [] });
      return jest.fn();
    });

    const onUpdate = jest.fn();
    subscribeToPoiPreferences('uid-1', onUpdate);

    expect(onUpdate).toHaveBeenCalledWith({});
  });

  it('fires onUpdate with correct type→radius map from stored docs', () => {
    mockOnSnapshot.mockImplementation((_ref: unknown, cb: SnapshotCallback) => {
      cb({
        docs: [
          { data: () => ({ type: 'atm',      radiusMeters: 100 }) },
          { data: () => ({ type: 'pharmacy', radiusMeters: 80  }) },
          { data: () => ({ type: 'gym',      radiusMeters: 90  }) },
        ],
      });
      return jest.fn();
    });

    const onUpdate = jest.fn();
    subscribeToPoiPreferences('uid-1', onUpdate);

    expect(onUpdate).toHaveBeenCalledWith({
      atm:      100,
      pharmacy: 80,
      gym:      90,
    });
  });

  it('fires again when preferences change (snapshot re-fires)', () => {
    let capturedCb: SnapshotCallback | null = null;
    mockOnSnapshot.mockImplementation((_ref: unknown, cb: SnapshotCallback) => {
      capturedCb = cb;
      return jest.fn();
    });

    const onUpdate = jest.fn();
    subscribeToPoiPreferences('uid-1', onUpdate);

    // Initial empty state
    capturedCb!({ docs: [] });
    expect(onUpdate).toHaveBeenCalledTimes(1);

    // User updates ATM radius
    capturedCb!({
      docs: [{ data: () => ({ type: 'atm', radiusMeters: 150 }) }],
    });
    expect(onUpdate).toHaveBeenCalledTimes(2);
    expect(onUpdate).toHaveBeenLastCalledWith({ atm: 150 });
  });

  it('returns an unsubscribe function', () => {
    const unsub = jest.fn();
    mockOnSnapshot.mockReturnValue(unsub);

    const stop = subscribeToPoiPreferences('uid-1', jest.fn());
    stop();

    expect(unsub).toHaveBeenCalledTimes(1);
  });
});

// ─── getPoiPreference ─────────────────────────────────────────────────────────

describe('getPoiPreference', () => {
  beforeEach(() => { mockGetDoc.mockClear(); });

  it('returns stored document when preference exists', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ type: 'atm', radiusMeters: 120 }),
    });

    const pref = await getPoiPreference('uid-1', 'atm');
    expect(pref).toEqual({ type: 'atm', radiusMeters: 120 });
  });

  it('returns built-in spec default when no document stored (atm → 50 m)', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const pref = await getPoiPreference('uid-1', 'atm');
    expect(pref).toEqual({ type: 'atm', radiusMeters: 50 });
  });

  it('returns 75 m default for unknown custom type with no stored preference', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const pref = await getPoiPreference('uid-1', 'gym');
    expect(pref).toEqual({ type: 'gym', radiusMeters: 75 });
  });
});

// ─── setPoiPreference ─────────────────────────────────────────────────────────

describe('setPoiPreference', () => {
  it('writes the correct document with type and radiusMeters', async () => {
    mockSetDoc.mockResolvedValue(undefined);

    await setPoiPreference('uid-1', 'pharmacy', 80);

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      { type: 'pharmacy', radiusMeters: 80 },
    );
  });

  it('accepts custom type strings', async () => {
    mockSetDoc.mockResolvedValue(undefined);

    await setPoiPreference('uid-1', 'gym', 120);

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      { type: 'gym', radiusMeters: 120 },
    );
  });
});

// ─── getPoiPreferencesMap ─────────────────────────────────────────────────────

describe('getPoiPreferencesMap', () => {
  it('returns a flat Record from a collection snapshot', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { data: () => ({ type: 'atm',      radiusMeters: 100 }) },
        { data: () => ({ type: 'pharmacy', radiusMeters: 80  }) },
      ],
    });

    const map = await getPoiPreferencesMap('uid-1');
    expect(map).toEqual({ atm: 100, pharmacy: 80 });
  });

  it('returns an empty map when no preferences are stored', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });

    const map = await getPoiPreferencesMap('uid-1');
    expect(map).toEqual({});
  });
});

// ─── Proximity engine — user pref radius integration ─────────────────────────

const ORIGIN = { lat: 0, lng: 0 };

const atmTask = {
  id:        'task-atm',
  title:     'Get cash',
  category:  'errands' as const,
  done:      false,
  poi:       'atm',
  date:      '2026-05-26',
  createdAt: { toDate: () => new Date() } as any,
};

beforeEach(() => {
  mockFetch.mockClear();
  mockStartTracking.mockClear();
  stopProximityMonitoring(); // reset module state between tests
});

describe('proximity engine — user pref radius (KAN-25)', () => {
  it('uses user-saved radius when it is larger than the built-in default', async () => {
    // User saved ATM radius = 100 m (vs. built-in 50 m).
    updateProximityPoiPreferences({ atm: 100 });

    // ATM is 80 m away — inside 100 m pref but outside 50 m default.
    mockPlacesResponse([{
      id:          'atm-1',
      displayName: { text: 'City ATM' },
      location:    { latitude: 0.00072, longitude: 0 }, // ~80 m
    }]);

    const onUpdate = jest.fn();
    startProximityMonitoring('uid-1', [atmTask], onUpdate);

    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    // Should alert because 80 m ≤ 100 m user pref.
    expect(onUpdate).toHaveBeenCalledWith(
      'atm',
      expect.objectContaining({ name: 'City ATM' }),
      expect.any(Object),
    );
  });

  it('does NOT alert when user-saved radius is smaller and place is outside it', async () => {
    // User tightened ATM radius to 25 m.
    updateProximityPoiPreferences({ atm: 25 });

    // ATM is 40 m away — inside 50 m default but outside 25 m pref.
    mockPlacesResponse([{
      id:          'atm-close',
      displayName: { text: 'Nearby ATM' },
      location:    { latitude: 0.00036, longitude: 0 }, // ~40 m
    }]);

    const onUpdate = jest.fn();
    startProximityMonitoring('uid-1', [atmTask], onUpdate);

    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    // 40 m > 25 m pref → should NOT be nearby.
    expect(onUpdate).toHaveBeenCalledWith(null, null, expect.any(Object));
  });

  it('falls back to built-in default when no user pref is stored', async () => {
    // No prefs set → ATM uses built-in 50 m.
    updateProximityPoiPreferences({});

    // ATM is 30 m away — inside 50 m built-in.
    mockPlacesResponse([{
      id:          'atm-near',
      displayName: { text: 'Corner ATM' },
      location:    { latitude: 0.00027, longitude: 0 }, // ~30 m
    }]);

    const onUpdate = jest.fn();
    startProximityMonitoring('uid-1', [atmTask], onUpdate);

    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    expect(onUpdate).toHaveBeenCalledWith(
      'atm',
      expect.objectContaining({ name: 'Corner ATM' }),
      expect.any(Object),
    );
  });

  it('uses DEFAULT_GEOFENCE_RADIUS (75 m) for custom types with no pref stored', async () => {
    const gymTask = {
      id:        'task-gym',
      title:     'Workout',
      category:  'health' as const,
      done:      false,
      poi:       'gym',
      date:      '2026-05-26',
      createdAt: { toDate: () => new Date() } as any,
    };

    updateProximityPoiPreferences({}); // no gym pref

    // Gym is 60 m away — inside DEFAULT 75 m.
    mockPlacesResponse([{
      id:          'gym-1',
      displayName: { text: 'Downtown Gym' },
      location:    { latitude: 0.00054, longitude: 0 }, // ~60 m
    }]);

    const onUpdate = jest.fn();
    startProximityMonitoring('uid-1', [gymTask], onUpdate);

    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    expect(onUpdate).toHaveBeenCalledWith(
      'gym',
      expect.objectContaining({ name: 'Downtown Gym' }),
      expect.any(Object),
    );
  });

  it('updateProximityPoiPreferences invalidates place cache (forces re-search)', async () => {
    updateProximityPoiPreferences({});

    // First location ping — ATM found 30 m away.
    mockPlacesResponse([{
      id:          'atm-1',
      displayName: { text: 'Old ATM' },
      location:    { latitude: 0.00027, longitude: 0 },
    }]);

    const onUpdate = jest.fn();
    startProximityMonitoring('uid-1', [atmTask], onUpdate);
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    const firstCallCount = mockFetch.mock.calls.length;

    // Update prefs — should clear cache.
    updateProximityPoiPreferences({ atm: 100 });

    // Second ping at same location — cache was cleared, so a new API call fires.
    mockPlacesResponse([{
      id:          'atm-2',
      displayName: { text: 'New ATM' },
      location:    { latitude: 0.00027, longitude: 0 },
    }]);
    await locationCb(ORIGIN);

    expect(mockFetch.mock.calls.length).toBeGreaterThan(firstCallCount);
  });
});
