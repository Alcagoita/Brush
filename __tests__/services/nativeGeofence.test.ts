/**
 * Unit tests for geofence ID helpers — KAN-56 / KAN-162.
 *
 * Covers:
 *   buildGeofenceId / parseGeofenceId round-trip
 *   parseGeofenceId edge cases (unknown prefix, missing separator)
 *
 * Functions moved from nativeGeofence.ts to proximity.ts in KAN-162.
 */

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock'),
);

jest.mock('../../src/services/geolocation', () => ({
  getPositionLowAccuracy: jest.fn().mockResolvedValue({ lat: 0, lng: 0, accuracy: 10 }),
}));

jest.mock('../../src/services/maps', () => ({
  searchNearbyPlaces: jest.fn().mockResolvedValue({}),
  getDistanceMeters:  jest.fn().mockReturnValue(0),
  placeTypeLabel:     jest.fn().mockReturnValue('ATM'),
}));

jest.mock('../../src/services/firestore', () => ({
  markAllPoiAlertsSeen: jest.fn().mockResolvedValue(undefined),
  markExitPromptSeen:   jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/notifications', () => ({
  fireExitPrompt: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native', () => ({
  Platform:      { OS: 'ios' },
  NativeModules: {},
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: { createChannel: jest.fn(), displayNotification: jest.fn() },
  AndroidImportance: { HIGH: 4 },
}));

jest.mock('../../src/native/WearNotificationModule', () => null);
jest.mock('../../src/constants/copy', () => ({
  COPY: { notification: { proximityTitle: jest.fn(), proximityBody: jest.fn() } },
}));

import {
  buildGeofenceId,
  parseGeofenceId,
} from '../../src/services/proximity';

// ─── ID helpers ───────────────────────────────────────────────────────────────

describe('buildGeofenceId', () => {
  it('produces a correctly prefixed ID', () => {
    expect(buildGeofenceId('pharmacy', 'ChIJ123')).toBe('brush_geo_pharmacy_ChIJ123');
  });

  it('works with all four built-in POI types', () => {
    expect(buildGeofenceId('atm',         'place1')).toBe('brush_geo_atm_place1');
    expect(buildGeofenceId('cafe',        'place2')).toBe('brush_geo_cafe_place2');
    expect(buildGeofenceId('supermarket', 'place3')).toBe('brush_geo_supermarket_place3');
    expect(buildGeofenceId('pharmacy',    'place4')).toBe('brush_geo_pharmacy_place4');
  });

  it('handles custom POI types', () => {
    expect(buildGeofenceId('gym', 'ChIJgym')).toBe('brush_geo_gym_ChIJgym');
  });
});

describe('parseGeofenceId', () => {
  it('correctly parses a valid geofence ID', () => {
    const result = parseGeofenceId('brush_geo_pharmacy_ChIJ123');
    expect(result).toEqual({ poiType: 'pharmacy', placeId: 'ChIJ123' });
  });

  it('handles placeId containing underscores', () => {
    const id  = buildGeofenceId('cafe', 'place_with_underscores');
    const result = parseGeofenceId(id);
    expect(result).toEqual({ poiType: 'cafe', placeId: 'place_with_underscores' });
  });

  it('returns null for an unknown prefix', () => {
    expect(parseGeofenceId('other_geo_atm_place1')).toBeNull();
  });

  it('returns null for an ID with no separator after poiType', () => {
    expect(parseGeofenceId('brush_geo_')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseGeofenceId('')).toBeNull();
  });

  it('round-trips correctly for all built-in types', () => {
    const types = ['atm', 'cafe', 'supermarket', 'pharmacy'];
    for (const type of types) {
      const id = buildGeofenceId(type, 'ChIJtest');
      expect(parseGeofenceId(id)).toEqual({ poiType: type, placeId: 'ChIJtest' });
    }
  });
});
