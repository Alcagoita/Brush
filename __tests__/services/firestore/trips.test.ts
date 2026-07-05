/**
 * KAN-234 — trips.ts: CRUD for /users/{uid}/trips/{tripId}.
 *
 * Covers:
 *   - addTrip stamps createdAt and returns the new doc id
 *   - getTrips maps docs into Trip objects, including optional startDate/endDate/preRefreshedAt
 *   - updateTrip only writes the allowed fields (preRefreshedAt/expiresAt)
 *   - deleteTrip removes the doc (habitat_places cleanup is the caller's job — see module docs)
 */

const mockAddDoc    = jest.fn();
const mockGetDocs   = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();

const NOW_TIMESTAMP = { _isNow: true };

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection:   jest.fn(() => ({ _type: 'collection' })),
  doc:          jest.fn(() => ({ _type: 'doc' })),
  addDoc:       (...args: unknown[]) => mockAddDoc(...args),
  getDocs:      (...args: unknown[]) => mockGetDocs(...args),
  updateDoc:    (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc:    (...args: unknown[]) => mockDeleteDoc(...args),
  Timestamp:    { now: jest.fn(() => NOW_TIMESTAMP) },
}));

import { addTrip, getTrips, updateTrip, deleteTrip } from '../../../src/services/firestore';
import type { Trip } from '../../../src/types';

function fakeSnap(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return { docs: docs.map(d => ({ id: d.id, data: () => d.data })) };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('addTrip', () => {
  it('stamps createdAt and returns the new doc id', async () => {
    mockAddDoc.mockResolvedValue({ id: 'trip-1' });

    const tripData: Omit<Trip, 'id' | 'createdAt'> = {
      destination: 'Faro, Portugal',
      placeRef: 'place-abc',
      centerLat: 37.0179,
      centerLng: -7.9304,
      areaRadius: 15_000,
      cacheAreaId: 'ta_123',
      expiresAt: 1_800_000_000_000,
    };

    const id = await addTrip('uid-1', tripData);

    expect(id).toBe('trip-1');
    expect(mockAddDoc).toHaveBeenCalledWith(
      { _type: 'collection' },
      { ...tripData, createdAt: NOW_TIMESTAMP },
    );
  });

  it('accepts explicit undefined startDate/endDate keys (real caller shape when dates are skipped)', async () => {
    // useTripPlanner.confirmDownload always includes startDate/endDate keys
    // in the object it passes to addTrip, even when the user skipped dates
    // (skipDates sets both to undefined rather than omitting them) — this
    // must not throw. addTrip does no filtering of its own; Firestore's
    // ignoreUndefinedProperties (set globally in firebase.ts) is what
    // drops these before the write actually reaches the server.
    mockAddDoc.mockResolvedValue({ id: 'trip-2' });

    const tripData: Omit<Trip, 'id' | 'createdAt'> = {
      destination: 'Lisbon', placeRef: 'place-xyz',
      centerLat: 38.7223, centerLng: -9.1393,
      startDate: undefined, endDate: undefined,
      areaRadius: 5_000, cacheAreaId: 'ta_456', expiresAt: 1_900_000_000_000,
    };

    const id = await addTrip('uid-1', tripData);

    expect(id).toBe('trip-2');
    expect(mockAddDoc).toHaveBeenCalledWith(
      { _type: 'collection' },
      { ...tripData, createdAt: NOW_TIMESTAMP },
    );
  });
});

describe('getTrips', () => {
  it('maps docs into Trip objects, including optional date fields when present', async () => {
    mockGetDocs.mockResolvedValue(fakeSnap([
      {
        id: 'trip-1',
        data: {
          destination: 'Faro, Portugal', placeRef: 'place-abc',
          centerLat: 37.0179, centerLng: -7.9304,
          startDate: '2026-07-20', endDate: '2026-07-27',
          areaRadius: 15_000, cacheAreaId: 'ta_123', expiresAt: 1_800_000_000_000,
          createdAt: NOW_TIMESTAMP,
        },
      },
    ]));

    const trips = await getTrips('uid-1');

    expect(trips).toEqual([{
      id: 'trip-1',
      destination: 'Faro, Portugal', placeRef: 'place-abc',
      centerLat: 37.0179, centerLng: -7.9304,
      startDate: '2026-07-20', endDate: '2026-07-27',
      areaRadius: 15_000, cacheAreaId: 'ta_123', expiresAt: 1_800_000_000_000,
      createdAt: NOW_TIMESTAMP,
    }]);
  });

  it('maps a dateless trip (no startDate/endDate) correctly', async () => {
    mockGetDocs.mockResolvedValue(fakeSnap([
      {
        id: 'trip-2',
        data: {
          destination: 'Lisbon', placeRef: 'place-xyz',
          centerLat: 38.7223, centerLng: -9.1393,
          areaRadius: 5_000, cacheAreaId: 'ta_456', expiresAt: 1_900_000_000_000,
          createdAt: NOW_TIMESTAMP,
        },
      },
    ]));

    const trips = await getTrips('uid-1');

    expect(trips[0].startDate).toBeUndefined();
    expect(trips[0].endDate).toBeUndefined();
  });

  it('returns an empty array when the user has no trips', async () => {
    mockGetDocs.mockResolvedValue(fakeSnap([]));
    expect(await getTrips('uid-1')).toEqual([]);
  });
});

describe('updateTrip', () => {
  it('writes only the given fields', async () => {
    mockUpdateDoc.mockResolvedValue(undefined);

    await updateTrip('uid-1', 'trip-1', { preRefreshedAt: 1_700_000_000_000 });

    expect(mockUpdateDoc).toHaveBeenCalledWith({ _type: 'doc' }, { preRefreshedAt: 1_700_000_000_000 });
  });
});

describe('deleteTrip', () => {
  it('deletes the trip document', async () => {
    mockDeleteDoc.mockResolvedValue(undefined);

    await deleteTrip('uid-1', 'trip-1');

    expect(mockDeleteDoc).toHaveBeenCalledWith({ _type: 'doc' });
  });
});
