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

const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

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
    writeBatch:      jest.fn(() => ({ update: mockBatchUpdate, commit: mockBatchCommit })),
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

const mockGetPosition = jest.fn();
jest.mock('../../src/services/geolocation', () => ({
  getPositionLowAccuracy: (...args: unknown[]) => mockGetPosition(...args),
  requestLocationPermission: jest.fn().mockResolvedValue('granted'),
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

jest.mock('../../src/services/notifications', () => ({
  fireExitPrompt: jest.fn().mockResolvedValue(undefined),
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
  runProximitySearch,
  resetProximityState,
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

    // 'yoga_studio' is not in POI_GEOFENCE_RADIUS so it falls back to DEFAULT_GEOFENCE_RADIUS (75 m)
    const pref = await getPoiPreference('uid-1', 'yoga_studio');
    expect(pref).toEqual({ type: 'yoga_studio', radiusMeters: 75 });
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

const ORIGIN = { lat: 0, lng: 0, accuracy: 10 };

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
  mockGetPosition.mockClear();
  mockGetPosition.mockResolvedValue(ORIGIN);
  resetProximityState();
});

describe('proximity engine — user pref radius (KAN-25)', () => {
  it('places within HERO_RADIUS_M (100 m) become the hero type', async () => {
    // ATM is 80 m away — inside HERO_RADIUS_M (100 m).
    // updateProximityPoiPreferences still accepted but display threshold is
    // always HERO_RADIUS_M for hero and NEARBY_RADIUS for grey zone.
    updateProximityPoiPreferences({ atm: 100 });

    mockPlacesResponse([{
      id:          'atm-1',
      displayName: { text: 'City ATM' },
      location:    { latitude: 0.00072, longitude: 0 }, // ~80 m
      types:       ['atm'],
    }]);

    const onUpdate = jest.fn();
    await runProximitySearch('uid-1', [atmTask], onUpdate);

    expect(onUpdate).toHaveBeenCalledWith(
      'atm',
      expect.objectContaining({ name: 'City ATM' }),
      expect.any(Object),
    );
  });

  it('alerts when place is within NEARBY_RADIUS (400 m), regardless of user-saved radius (KAN-142)', async () => {
    // KAN-142 unified the display threshold to NEARBY_RADIUS=400 m.
    // User preferences no longer gate what appears in the NearbyCard.
    // 40 m < HERO_RADIUS_M (100 m) → hero type.
    updateProximityPoiPreferences({ atm: 25 });

    mockPlacesResponse([{
      id:          'atm-close',
      displayName: { text: 'Nearby ATM' },
      location:    { latitude: 0.00036, longitude: 0 }, // ~40 m
      types:       ['atm'],
    }]);

    const onUpdate = jest.fn();
    await runProximitySearch('uid-1', [atmTask], onUpdate);

    expect(onUpdate).toHaveBeenCalledWith(
      'atm',
      expect.objectContaining({ name: 'Nearby ATM' }),
      expect.any(Object),
    );
  });

  it('alerts when place is within NEARBY_RADIUS and no user pref is stored', async () => {
    updateProximityPoiPreferences({});

    mockPlacesResponse([{
      id:          'atm-near',
      displayName: { text: 'Corner ATM' },
      location:    { latitude: 0.00027, longitude: 0 }, // ~30 m
      types:       ['atm'],
    }]);

    const onUpdate = jest.fn();
    await runProximitySearch('uid-1', [atmTask], onUpdate);

    expect(onUpdate).toHaveBeenCalledWith(
      'atm',
      expect.objectContaining({ name: 'Corner ATM' }),
      expect.any(Object),
    );
  });

  it('alerts for custom POI types (gym) when within NEARBY_RADIUS (400 m)', async () => {
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

    // Gym is 60 m away — inside HERO_RADIUS_M (100 m) → hero.
    mockPlacesResponse([{
      id:          'gym-1',
      displayName: { text: 'Downtown Gym' },
      location:    { latitude: 0.00054, longitude: 0 }, // ~60 m
      types:       ['gym'],
    }]);

    const onUpdate = jest.fn();
    await runProximitySearch('uid-1', [gymTask], onUpdate);

    expect(onUpdate).toHaveBeenCalledWith(
      'gym',
      expect.objectContaining({ name: 'Downtown Gym' }),
      expect.any(Object),
    );
  });
});
