/**
 * KAN-281 — destinationResolver.ts
 *
 * Four branches, first match wins: pinned poiPlaceId > learned place >
 * habitat cache > pre-fetched live results. No live network call happens
 * inside this module — branch 4 only reads whatever liveResults it's given.
 */

const mockGetPlaceDetails = jest.fn();
jest.mock('../../src/services/maps', () => ({
  getPlaceDetails: (...args: unknown[]) => mockGetPlaceDetails(...args),
  getDistanceMeters: (lat1: number, lng1: number, lat2: number, lng2: number) =>
    Math.round(Math.hypot(lat2 - lat1, lng2 - lng1) * 111_000),
}));

const mockQueryHabitatCache = jest.fn();
const mockGetHabitatPlaceById = jest.fn();
jest.mock('../../src/services/habitatCache', () => ({
  queryHabitatCache:   (...args: unknown[]) => mockQueryHabitatCache(...args),
  getHabitatPlaceById: (...args: unknown[]) => mockGetHabitatPlaceById(...args),
}));

import { resolveTaskDestination } from '../../src/services/destinationResolver';
import type { Task } from '../../src/types';
import type { LearnedPlace } from '../../src/services/learnedPlaces';

const COORDS = { lat: 38.7, lng: -9.1 };

const FAKE_TIMESTAMP = { seconds: 0, nanoseconds: 0 } as unknown as Task['createdAt'];

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1', title: 'Pick up aspirin', category: 'health', done: false,
    date: '2026-07-16', createdAt: FAKE_TIMESTAMP, poi: 'pharmacy',
    ...overrides,
  };
}

describe('resolveTaskDestination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryHabitatCache.mockReturnValue({});
  });

  it('resolves the pinned poiPlaceId first, skipping learned/cache/live', async () => {
    mockGetPlaceDetails.mockResolvedValue({ lat: 38.71, lng: -9.11, name: 'Farmácia Silva' });

    const result = await resolveTaskDestination(makeTask({ poiPlaceId: 'place-abc' }), COORDS, []);

    expect(result).toEqual(expect.objectContaining({ name: 'Farmácia Silva', source: 'pinned', internalId: 'place-abc' }));
    expect(mockQueryHabitatCache).not.toHaveBeenCalled();
  });

  it('falls through to learned/cache when the pinned place fails to resolve', async () => {
    mockGetPlaceDetails.mockResolvedValue(null);
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [{ placeId: 'cache-1', name: 'Cached Pharmacy', lat: 38.72, lng: -9.12, distanceMeters: 900 }],
    });

    const result = await resolveTaskDestination(makeTask({ poiPlaceId: 'dead-id' }), COORDS, []);

    expect(result).toEqual({ internalId: 'cache-1', name: 'Cached Pharmacy', lat: 38.72, lng: -9.12, distanceMeters: 900, source: 'cache' });
  });

  it('prefers a learned place over a closer cached candidate', async () => {
    const learned: LearnedPlace[] = [{ placeId: 'internal-1', name: 'Farmácia Silva', poiType: 'pharmacy', visitCount: 5 }];
    mockGetHabitatPlaceById.mockReturnValue({ placeId: 'internal-1', name: 'Farmácia Silva', lat: 38.71, lng: -9.11, distanceMeters: 0 });
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [{ placeId: 'cache-1', name: 'Nearer Pharmacy', lat: 38.701, lng: -9.101, distanceMeters: 50 }],
    });

    const result = await resolveTaskDestination(makeTask(), COORDS, learned);

    expect(result?.source).toBe('learned');
    expect(result?.name).toBe('Farmácia Silva');
    expect(mockQueryHabitatCache).not.toHaveBeenCalled();
  });

  it('falls through to cache when the learned place has no resolvable coordinates', async () => {
    const learned: LearnedPlace[] = [{ placeId: 'internal-1', name: 'Farmácia Silva', poiType: 'pharmacy', visitCount: 5 }];
    mockGetHabitatPlaceById.mockReturnValue(null); // evicted from the habitat cache
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [{ placeId: 'cache-1', name: 'Cached Pharmacy', lat: 38.72, lng: -9.12, distanceMeters: 900 }],
    });

    const result = await resolveTaskDestination(makeTask(), COORDS, learned);

    expect(result?.source).toBe('cache');
  });

  it('resolves the nearest cached place when nothing is learned', async () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [{ placeId: 'cache-1', name: 'Cached Pharmacy', lat: 38.72, lng: -9.12, distanceMeters: 900 }],
    });

    const result = await resolveTaskDestination(makeTask(), COORDS, []);

    expect(result).toEqual({ internalId: 'cache-1', name: 'Cached Pharmacy', lat: 38.72, lng: -9.12, distanceMeters: 900, source: 'cache' });
  });

  it('resolves from pre-fetched liveResults when nothing else matched', async () => {
    const liveResults = {
      pharmacy: [{ placeId: 'live-1', name: 'Live Pharmacy', lat: 38.73, lng: -9.13, distanceMeters: 4000 }],
    };

    const result = await resolveTaskDestination(makeTask(), COORDS, [], liveResults);

    expect(result).toEqual({ internalId: 'live-1', name: 'Live Pharmacy', lat: 38.73, lng: -9.13, distanceMeters: 4000, source: 'live' });
  });

  it('ignores a live result beyond ROUTE_MAX_RADIUS_M', async () => {
    const liveResults = {
      pharmacy: [{ placeId: 'live-1', name: 'Far Pharmacy', lat: 39.5, lng: -9.9, distanceMeters: 50_000 }],
    };

    const result = await resolveTaskDestination(makeTask(), COORDS, [], liveResults);

    expect(result).toBeNull();
  });

  it('returns null for a task with no poi', async () => {
    const result = await resolveTaskDestination(makeTask({ poi: undefined }), COORDS, []);
    expect(result).toBeNull();
    expect(mockQueryHabitatCache).not.toHaveBeenCalled();
  });

  it('returns null when nothing resolves anywhere', async () => {
    const result = await resolveTaskDestination(makeTask(), COORDS, []);
    expect(result).toBeNull();
  });
});
