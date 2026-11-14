/**
 * KAN-514 — when Today shows the mall card: inside a centre (KAN-513) AND
 * holding a complete inventory of it (KAN-382). Real SQLite for the stored
 * inventory.
 */
import { act, renderHook } from '@testing-library/react-native';
import { resetNodeSqlite } from '../helpers/expoSqliteNode';

jest.mock('expo-sqlite', () => require('../helpers/expoSqliteNode').expoSqliteMock);
jest.mock('../../src/services/habitatCache', () => ({ HABITAT_RADIUS_M: 5_000, getWifiOnlyDownloads: () => false }));
jest.mock('../../src/services/poiApi', () => ({ poiApiGet: jest.fn(), PoiApiError: class extends Error {} }));
let mockCurrentCentre: { venueId: string; name: string } | null = null;
jest.mock('../../src/services/centreDetection', () => ({ getCurrentCentre: () => mockCurrentCentre }));

import { useMallCard } from '../../src/hooks/useMallCard';
import { __resetVenueInventoryForTests, writeVenueInventory, type Venue, type VenueUnitWire } from '../../src/services/venueInventory';
import type { PlaceContext } from '../../src/services/proximity';
import type { Task } from '../../src/types';

const ALMA: Venue = {
  id: 'alma-shopping', name: 'Alma Shopping', osm: 'way/1', centroid: [40.2044, -8.4077],
  rings: [[[40.204, -8.408], [40.205, -8.408], [40.205, -8.407], [40.204, -8.407], [40.204, -8.408]]],
};
const ZARA: VenueUnitWire = {
  key: 'community:zara', poi_id: 'zara', source: 'community', name: 'Zara', name_local: 'Zara', name_local_lang: null,
  names: {}, country_code: 'PT', lat: 40.2045, lng: -8.4075, primary_poi_type: 'store', types: ['store'],
  brand: 'Zara', address: null, floor: '1', open_min: null, close_min: null, attributes: { store_kind: ['clothing'] },
};
const TASKS = [{ id: 'shirt', title: 'Buy a white shirt', poi: 'store', done: false } as unknown as Task];
const IN_ALMA: PlaceContext = { kind: 'centre', venueId: 'alma-shopping', name: 'Alma Shopping' };

beforeEach(() => {
  resetNodeSqlite();
  __resetVenueInventoryForTests();
  mockCurrentCentre = null;
});

it('is null outside a centre', () => {
  writeVenueInventory(ALMA, 'v1', [ZARA]);
  const { result } = renderHook(() => useMallCard(null, TASKS, []));
  expect(result.current).toBeNull();
});

it('is null inside a centre we hold no complete inventory of', () => {
  const { result } = renderHook(() => useMallCard(IN_ALMA, TASKS, []));
  expect(result.current).toBeNull();
});

it('lists the rows from the stored inventory inside a centre', () => {
  writeVenueInventory(ALMA, 'v1', [ZARA]);
  const { result } = renderHook(() => useMallCard(IN_ALMA, TASKS, []));
  expect(result.current?.name).toBe('Alma Shopping');
  expect(result.current?.rows.map(r => [r.task.id, r.candidates[0].name, r.candidates[0].floors])).toEqual([
    ['shirt', 'Zara', ['1']],
  ]);
});

it('uses the detector memory when the engine has no context this tick', () => {
  writeVenueInventory(ALMA, 'v1', [ZARA]);
  mockCurrentCentre = { venueId: 'alma-shopping', name: 'Alma Shopping' };
  const { result } = renderHook(() => useMallCard(null, TASKS, []));
  expect(result.current?.venueId).toBe('alma-shopping');
});

it('does not use the detector memory over a snapshot or trip the engine resolved', () => {
  writeVenueInventory(ALMA, 'v1', [ZARA]);
  mockCurrentCentre = { venueId: 'alma-shopping', name: 'Alma Shopping' };
  const trip = { kind: 'trip', trip: {} } as unknown as PlaceContext;
  const { result } = renderHook(() => useMallCard(trip, TASKS, []));
  expect(result.current).toBeNull();
});

it('appears when the inventory finishes downloading while the user is already inside', () => {
  const { result } = renderHook(() => useMallCard(IN_ALMA, TASKS, []));
  expect(result.current).toBeNull();

  act(() => { writeVenueInventory(ALMA, 'v1', [ZARA]); });

  expect(result.current?.rows).toHaveLength(1);
});
