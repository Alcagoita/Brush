/**
 * Unit tests for POI_CATALOG and PoiType — KAN-143
 *
 * Covers:
 *   - All 16 types are present in POI_CATALOG
 *   - Each catalog entry has a non-empty label
 *   - POI_GEOFENCE_RADIUS covers all 16 types
 *   - POI_GOOGLE_TYPES covers all 16 types
 *   - No duplicate types in catalog
 */

import { POI_CATALOG, POI_GEOFENCE_RADIUS, POI_GOOGLE_TYPES, PoiType } from '../../src/types';

const EXPECTED_TYPES: PoiType[] = [
  'atm', 'cafe', 'supermarket', 'pharmacy',
  'gas', 'gym', 'bank', 'restaurant', 'park',
  'library', 'post', 'store', 'clinic', 'salon',
  'bus', 'school',
];

describe('POI_CATALOG', () => {
  it('contains exactly 16 entries', () => {
    expect(POI_CATALOG).toHaveLength(16);
  });

  it('contains all expected POI types', () => {
    const catalogTypes = POI_CATALOG.map(e => e.type);
    for (const type of EXPECTED_TYPES) {
      expect(catalogTypes).toContain(type);
    }
  });

  it('has no duplicate types', () => {
    const types = POI_CATALOG.map(e => e.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('every entry has a non-empty label', () => {
    for (const entry of POI_CATALOG) {
      expect(entry.label.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('POI_GEOFENCE_RADIUS', () => {
  it('has a radius for every POI type', () => {
    for (const type of EXPECTED_TYPES) {
      expect(POI_GEOFENCE_RADIUS[type]).toBeGreaterThan(0);
    }
  });
});

describe('POI_GOOGLE_TYPES', () => {
  it('has a Google Places type string for every POI type', () => {
    for (const type of EXPECTED_TYPES) {
      expect(typeof POI_GOOGLE_TYPES[type]).toBe('string');
      expect(POI_GOOGLE_TYPES[type].length).toBeGreaterThan(0);
    }
  });
});
