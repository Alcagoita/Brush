/**
 * KAN-23 — Category-to-POI type mapping tests.
 *
 * Covers:
 *   - resolveCategoryPlaceType: maps Category.poi to the Google Places type string
 *   - searchNearbyPlaces:       accepts built-in PoiType values AND custom strings
 *   - placeTypeLabel:           human-readable labels + fallback title-casing
 *   - proximity engine:         custom POI types flow through checkProximity,
 *                               DEFAULT_GEOFENCE_RADIUS used for unknown types
 */

jest.mock('../../src/config/keys', () => ({
  GOOGLE_PLACES_API_KEY: 'TEST_KEY',
}));

// ─── Notifee / geolocation / firestore stubs ──────────────────────────────────

jest.mock('@notifee/react-native', () => ({
  __esModule:       true,
  default: {
    createChannel:         jest.fn().mockResolvedValue(undefined),
    displayNotification:   jest.fn().mockResolvedValue(undefined),
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

jest.mock('expo-location', () => ({
  stopGeofencingAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/firestore', () => ({
  markPoiAlertSeen:     jest.fn().mockResolvedValue(undefined),
  markAllPoiAlertsSeen: jest.fn().mockResolvedValue(undefined),
}));

// ─── fetch mock ───────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch    = mockFetch as unknown as typeof fetch;

function mockPlacesResponse(
  places: Array<{ id: string; displayName: { text: string }; location: { latitude: number; longitude: number }; types?: string[] }>,
) {
  mockFetch.mockResolvedValueOnce({
    ok:   true,
    json: async () => ({ places }),
  });
}

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { resolveCategoryPlaceType, searchNearbyPlaces, placeTypeLabel } from '../../src/services/maps';
import { startProximityMonitoring, stopProximityMonitoring, PlacesMap } from '../../src/services/proximity';
import { Category } from '../../src/types';
import type { NearbyPlace } from '../../src/services/maps';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id:        'cat-1',
    name:      'Test',
    color:     '#ff0000',
    poi:       null,
    isBuiltIn: false,
    ...overrides,
  };
}

// ─── resolveCategoryPlaceType ─────────────────────────────────────────────────

describe('resolveCategoryPlaceType', () => {
  it('returns null for a category with no location association', () => {
    expect(resolveCategoryPlaceType(makeCategory({ poi: null }))).toBeNull();
  });

  it('returns the poi string unchanged for a built-in type', () => {
    expect(resolveCategoryPlaceType(makeCategory({ poi: 'pharmacy' }))).toBe('pharmacy');
    expect(resolveCategoryPlaceType(makeCategory({ poi: 'atm' }))).toBe('atm');
    expect(resolveCategoryPlaceType(makeCategory({ poi: 'cafe' }))).toBe('cafe');
    expect(resolveCategoryPlaceType(makeCategory({ poi: 'supermarket' }))).toBe('supermarket');
  });

  it('returns the poi string unchanged for a custom Google Places type', () => {
    expect(resolveCategoryPlaceType(makeCategory({ poi: 'gym' }))).toBe('gym');
    expect(resolveCategoryPlaceType(makeCategory({ poi: 'restaurant' }))).toBe('restaurant');
    expect(resolveCategoryPlaceType(makeCategory({ poi: 'beauty_salon' }))).toBe('beauty_salon');
  });
});

// ─── placeTypeLabel ───────────────────────────────────────────────────────────

describe('placeTypeLabel', () => {
  it('returns known labels for built-in POI types', () => {
    expect(placeTypeLabel('atm')).toBe('ATM');
    expect(placeTypeLabel('cafe')).toBe('Café');
    expect(placeTypeLabel('supermarket')).toBe('Supermarket');
    expect(placeTypeLabel('pharmacy')).toBe('Pharmacy');
  });

  it('returns the mapped label for well-known custom types', () => {
    expect(placeTypeLabel('gym')).toBe('Gym');
    expect(placeTypeLabel('restaurant')).toBe('Restaurant');
    expect(placeTypeLabel('beauty_salon')).toBe('Beauty Salon');
    expect(placeTypeLabel('fitness_center')).toBe('Fitness Center');
  });

  it('title-cases unknown type strings as a fallback', () => {
    expect(placeTypeLabel('nail_salon')).toBe('Nail Salon');
    expect(placeTypeLabel('ice_cream_shop')).toBe('Ice Cream Shop');
  });
});

// ─── searchNearbyPlaces — custom type ─────────────────────────────────────────

describe('searchNearbyPlaces — custom type', () => {
  beforeEach(() => { mockFetch.mockClear(); });

  it('passes a built-in type to the Places API via POI_GOOGLE_TYPES mapping', async () => {
    mockPlacesResponse([
      { id: 'p1', displayName: { text: 'Corner ATM' }, location: { latitude: 1.0, longitude: 2.0 }, types: ['atm'] },
    ]);

    const results = await searchNearbyPlaces(1.0, 2.0, ['atm'], 50);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.includedTypes).toEqual(['atm']); // POI_GOOGLE_TYPES['atm'] = 'atm'
    expect(results['atm']).toHaveLength(1);
    expect(results['atm'][0].name).toBe('Corner ATM');
  });

  it('passes a custom type directly to the Places API', async () => {
    mockPlacesResponse([
      { id: 'g1', displayName: { text: 'City Gym' }, location: { latitude: 10.0, longitude: 20.0 }, types: ['gym'] },
    ]);

    const results = await searchNearbyPlaces(10.0, 20.0, ['gym'], 75);

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    // 'gym' has no mapping in POI_GOOGLE_TYPES — it must be passed as-is.
    expect(body.includedTypes).toEqual(['gym']);
    expect(results['gym'][0].name).toBe('City Gym');
  });

  it('returns sorted results for a custom restaurant type', async () => {
    mockPlacesResponse([
      { id: 'r2', displayName: { text: 'Far Bistro' },  location: { latitude: 10.001, longitude: 20.001 }, types: ['restaurant'] },
      { id: 'r1', displayName: { text: 'Near Bistro' }, location: { latitude: 10.0002, longitude: 20.0002 }, types: ['restaurant'] },
    ]);

    const results = await searchNearbyPlaces(10.0, 20.0, ['restaurant'], 75);

    expect(results['restaurant'][0].name).toBe('Near Bistro');
    expect(results['restaurant'][1].name).toBe('Far Bistro');
  });
});

// ─── Proximity engine — custom POI types ──────────────────────────────────────

describe('proximity engine — custom POI types', () => {
  const ORIGIN = { lat: 0, lng: 0 };

  // A task with a custom 'gym' POI type.
  const gymTask = {
    id:        'task-gym',
    title:     'Morning workout',
    category:  'health' as const,
    done:      false,
    poi:       'gym',         // custom type — not a PoiType
    date:      '2026-05-26',
    createdAt: { toDate: () => new Date() } as any,
  };

  beforeEach(() => {
    mockFetch.mockClear();
    mockStartTracking.mockClear();
    stopProximityMonitoring();
  });

  it('initiates a Places API search for a custom POI type string', async () => {
    // Gym 60 m away — inside DEFAULT_GEOFENCE_RADIUS (75 m).
    mockPlacesResponse([{
      id:          'gym-1',
      displayName: { text: 'Downtown Gym' },
      location:    { latitude: 0.0005, longitude: 0 }, // ~55 m north
    }]);

    const onUpdate = jest.fn();
    startProximityMonitoring('uid-1', [gymTask], onUpdate);

    // Grab the location callback passed to startTracking.
    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    // Verify a search was fired for 'gym'.
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.includedTypes).toEqual(['gym']);

    // The callback should report 'gym' as the nearby type.
    expect(onUpdate).toHaveBeenCalledWith(
      'gym',
      expect.objectContaining({ name: 'Downtown Gym' }),
      expect.any(Object),
    );
  });

  it('alerts for a built-in POI (ATM) at 100 m — inside 400 m but outside old 50 m threshold', async () => {
    // This distance would have been suppressed under the old per-type 50 m radius,
    // proving the new 400 m threshold is actually in effect.
    const atmTask = {
      id:        'task-atm',
      title:     'Get cash',
      category:  'errands' as const,
      done:      false,
      poi:       'atm',
      date:      '2026-05-26',
      createdAt: { toDate: () => new Date() } as any,
    };

    mockPlacesResponse([{
      id:          'atm-100m',
      displayName: { text: 'Mid-range ATM' },
      location:    { latitude: 0.0009, longitude: 0 }, // ~100 m north
    }]);

    const onUpdate = jest.fn();
    startProximityMonitoring('uid-1', [atmTask], onUpdate);

    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    expect(onUpdate).toHaveBeenCalledWith(
      'atm',
      expect.objectContaining({ name: 'Mid-range ATM' }),
      expect.any(Object),
    );
  });

  it('alerts for a custom/unknown POI (spa) at 200 m — inside 400 m but outside old 75 m default', async () => {
    // This distance would have been suppressed under the old DEFAULT_GEOFENCE_RADIUS (75 m),
    // proving the new 400 m threshold is actually in effect for unknown types.
    const spaTask = {
      id:        'task-spa-200',
      title:     'Spa day',
      category:  'personal' as const,
      done:      false,
      poi:       'spa',
      date:      '2026-05-26',
      createdAt: { toDate: () => new Date() } as any,
    };

    mockPlacesResponse([{
      id:          'spa-200m',
      displayName: { text: 'City Spa' },
      location:    { latitude: 0.0018, longitude: 0 }, // ~200 m north
    }]);

    const onUpdate = jest.fn();
    startProximityMonitoring('uid-1', [spaTask], onUpdate);

    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    expect(onUpdate).toHaveBeenCalledWith(
      'spa',
      expect.objectContaining({ name: 'City Spa' }),
      expect.any(Object),
    );
  });

  it('does not fire a geofence alert when custom-type place is outside NEARBY_RADIUS (400 m)', async () => {
    // KAN-142: display threshold is now NEARBY_RADIUS=400 m for all POI types.
    // Gym 550 m away — outside 400 m NEARBY_RADIUS.
    mockPlacesResponse([{
      id:          'gym-far',
      displayName: { text: 'Faraway Gym' },
      location:    { latitude: 0.005, longitude: 0 }, // ~556 m north
    }]);

    const onUpdate = jest.fn();
    startProximityMonitoring('uid-1', [gymTask], onUpdate);

    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    // Places map should be populated, but nearbyPoiType should be null.
    expect(onUpdate).toHaveBeenCalledWith(
      null,
      null,
      expect.any(Object),
    );
  });

  it('handles a mix of built-in and custom POI types in the same task list', async () => {
    const atmTask = {
      id:        'task-atm',
      title:     'Get cash',
      category:  'errands' as const,
      done:      false,
      poi:       'atm',
      date:      '2026-05-26',
      createdAt: { toDate: () => new Date() } as any,
    };

    // ATM: 30 m away — closest, wins.
    mockPlacesResponse([{
      id:          'atm-1',
      displayName: { text: 'Nearby ATM' },
      location:    { latitude: 0.00027, longitude: 0 }, // ~30 m
    }]);
    // Gym: 222 m away — also within 400 m, but ATM is closer so ATM wins.
    mockPlacesResponse([{
      id:          'gym-1',
      displayName: { text: 'Far Gym' },
      location:    { latitude: 0.002, longitude: 0 },   // ~222 m
    }]);

    const onUpdate = jest.fn();
    startProximityMonitoring('uid-1', [atmTask, gymTask], onUpdate);

    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    // ATM wins (30 m < 222 m) — rule: closest POI when multiple are within NEARBY_RADIUS.
    const lastCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
    expect(lastCall[0]).toBe('atm');
    expect(lastCall[1]).toMatchObject({ name: 'Nearby ATM' });
  });

  it('alerts for unknown POI types (spa) when within NEARBY_RADIUS (400 m)', async () => {
    // KAN-142: all POI types use the same 400 m display threshold.
    const spaTask = {
      id:        'task-spa',
      title:     'Spa day',
      category:  'personal' as const,
      done:      false,
      poi:       'spa', // not in POI_GEOFENCE_RADIUS
      date:      '2026-05-26',
      createdAt: { toDate: () => new Date() } as any,
    };

    // Place is 60 m away — well within NEARBY_RADIUS (400 m).
    mockPlacesResponse([{
      id:          'spa-1',
      displayName: { text: 'Urban Spa' },
      location:    { latitude: 0.00054, longitude: 0 }, // ~60 m
    }]);

    const onUpdate = jest.fn();
    startProximityMonitoring('uid-1', [spaTask], onUpdate);

    const locationCb = mockStartTracking.mock.calls[0][0];
    await locationCb(ORIGIN);

    expect(onUpdate).toHaveBeenCalledWith(
      'spa',
      expect.objectContaining({ name: 'Urban Spa' }),
      expect.any(Object),
    );
  });
});
