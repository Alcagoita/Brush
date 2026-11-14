/**
 * KAN-513 — inside a shopping centre = inside its strict outline; leave only
 * once 30 m outside it. Geometry on a square with known distances; the rule
 * on Colombo's real outline; the stored-outline path on real SQLite.
 */
import { resetNodeSqlite } from '../helpers/expoSqliteNode';

jest.mock('expo-sqlite', () => require('../helpers/expoSqliteNode').expoSqliteMock);
jest.mock('../../src/services/habitatCache', () => ({ HABITAT_RADIUS_M: 5_000, getWifiOnlyDownloads: () => false }));
jest.mock('../../src/services/poiApi', () => ({ poiApiGet: jest.fn(), PoiApiError: class extends Error {} }));

import {
  CENTRE_LEAVE_BUFFER_M, __resetCentreDetectionForTests, getCurrentCentre, insideRings, metresOutside,
  nextCentre, updateCentreContext,
} from '../../src/services/centreDetection';
import { __resetVenueInventoryForTests, writeVenueInventory, type Venue } from '../../src/services/venueInventory';

const footprints = jest.requireActual('../../cloudflare/extraction/mall_lists/footprints.json') as Record<string, {
  id: string; osm: string; centroid: [number, number]; rings: [number, number][][];
}>;
const venue = (name: string): Venue => {
  const f = footprints[name];
  return { id: f.id, name, osm: f.osm, centroid: f.centroid, rings: f.rings };
};
const COLOMBO = venue('Centro Comercial Colombo');
const AMOREIRAS = venue('Amoreiras Shopping Center');
const VENUES = [COLOMBO, AMOREIRAS];

const M_LAT = 1 / 111_320;
/** A 100 m square (lat 0..100 m, lng 0..100 m) near the equator. */
const SQUARE: [number, number][][] = [[[0, 0], [100 * M_LAT, 0], [100 * M_LAT, 100 * M_LAT], [0, 100 * M_LAT], [0, 0]]];

/** A point straight north of Colombo's northernmost vertex, at `metres` outside the outline. */
function northOfColombo(metres: number): [number, number] {
  const top = COLOMBO.rings[0].reduce((a, b) => (b[0] > a[0] ? b : a));
  for (let step = 0; step < 400; step++) {
    const lat = top[0] + step * 0.5 * M_LAT;
    if (metresOutside(lat, top[1], COLOMBO.rings) >= metres) { return [lat, top[1]]; }
  }
  throw new Error('no point found');
}

describe('geometry', () => {
  it('knows inside from outside, holes included', () => {
    expect(insideRings(50 * M_LAT, 50 * M_LAT, SQUARE)).toBe(true);
    expect(insideRings(150 * M_LAT, 50 * M_LAT, SQUARE)).toBe(false);
    const withHole = [SQUARE[0], [[40 * M_LAT, 40 * M_LAT], [60 * M_LAT, 40 * M_LAT], [60 * M_LAT, 60 * M_LAT], [40 * M_LAT, 60 * M_LAT], [40 * M_LAT, 40 * M_LAT]] as [number, number][]];
    expect(insideRings(50 * M_LAT, 50 * M_LAT, withHole)).toBe(false);
  });

  it('measures metres to the nearest edge, 0 inside', () => {
    expect(metresOutside(50 * M_LAT, 50 * M_LAT, SQUARE)).toBe(0);
    expect(metresOutside(120 * M_LAT, 50 * M_LAT, SQUARE)).toBeCloseTo(20, 0);
    expect(metresOutside(130 * M_LAT, 130 * M_LAT, SQUARE)).toBeCloseTo(Math.hypot(30, 30), 0);
  });
});

describe('the enter / leave rule', () => {
  const inside = COLOMBO.centroid;
  const nearDoor = northOfColombo(10);
  const farOutside = northOfColombo(CENTRE_LEAVE_BUFFER_M + 10);

  it('enters only on a fix inside the strict outline', () => {
    expect(insideRings(...inside, COLOMBO.rings)).toBe(true);
    expect(nextCentre(null, ...inside, VENUES)).toEqual({ venueId: 'centro-comercial-colombo', name: 'Centro Comercial Colombo' });
    expect(nextCentre(null, ...nearDoor, VENUES)).toBeNull();
  });

  it('holds between the outline and outline + 30 m, and leaves beyond it', () => {
    const entered = nextCentre(null, ...inside, VENUES);
    expect(nextCentre(entered, ...nearDoor, VENUES)).toEqual(entered);
    expect(nextCentre(entered, ...farOutside, VENUES)).toBeNull();
  });

  it('moves straight to another centre whose outline the fix is inside', () => {
    const atColombo = nextCentre(null, ...inside, VENUES);
    expect(nextCentre(atColombo, ...AMOREIRAS.centroid, VENUES))
      .toEqual({ venueId: 'amoreiras-shopping-center', name: 'Amoreiras Shopping Center' });
  });

  it('never treats a place with no outline as a centre', () => {
    // Rua Augusta, a dense high street with no centre outline.
    expect(nextCentre(null, 38.7101, -9.1373, VENUES)).toBeNull();
    expect(nextCentre(null, ...inside, [])).toBeNull();
  });

  it('lets go of a centre whose outline is no longer known', () => {
    const entered = nextCentre(null, ...inside, VENUES);
    expect(nextCentre(entered, ...inside, [AMOREIRAS])).toBeNull();
  });
});

describe('from stored outlines, offline', () => {
  beforeEach(() => {
    resetNodeSqlite();
    __resetVenueInventoryForTests();
    __resetCentreDetectionForTests();
  });

  it('answers from the venue inventory with no network, and remembers across fixes', () => {
    expect(updateCentreContext(...COLOMBO.centroid)).toBeNull();

    writeVenueInventory(COLOMBO, 'v1', []);

    expect(updateCentreContext(...COLOMBO.centroid)).toEqual({ venueId: 'centro-comercial-colombo', name: 'Centro Comercial Colombo' });
    expect(updateCentreContext(...northOfColombo(10))).toEqual({ venueId: 'centro-comercial-colombo', name: 'Centro Comercial Colombo' });
    expect(getCurrentCentre()?.venueId).toBe('centro-comercial-colombo');
    expect(updateCentreContext(...northOfColombo(CENTRE_LEAVE_BUFFER_M + 10))).toBeNull();
    expect(getCurrentCentre()).toBeNull();
  });
});
