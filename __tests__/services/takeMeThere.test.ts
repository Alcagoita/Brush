/**
 * KAN-279 — "Take me there" destination resolver.
 *
 * Covers all four resolution branches plus the hidden (null) case:
 *   pinned poiPlaceId > learned place > habitat cache nearest > live search > null
 */

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock'),
);

const mockGetPlaceDetails      = jest.fn();
const mockSearchNearbyPlaces   = jest.fn();
jest.mock('../../src/services/maps', () => ({
  getPlaceDetails:    (...args: unknown[]) => mockGetPlaceDetails(...args),
  searchNearbyPlaces: (...args: unknown[]) => mockSearchNearbyPlaces(...args),
}));

const mockQueryHabitatCache  = jest.fn();
const mockGetHabitatPlaceById = jest.fn();
jest.mock('../../src/services/habitatCache', () => ({
  queryHabitatCache:    (...args: unknown[]) => mockQueryHabitatCache(...args),
  getHabitatPlaceById:  (...args: unknown[]) => mockGetHabitatPlaceById(...args),
}));

const mockGetLearnedPlaceCounts = jest.fn();
jest.mock('../../src/services/firestore', () => ({
  getLearnedPlaceCounts: (...args: unknown[]) => mockGetLearnedPlaceCounts(...args),
}));

import NetInfo from '@react-native-community/netinfo';
import { resolveTakeMeThereDestination } from '../../src/services/takeMeThere';

const ORIGIN = { uid: 'user-1', poiType: 'pharmacy', currentLat: 38.7, currentLng: -9.1 };

describe('resolveTakeMeThereDestination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLearnedPlaceCounts.mockResolvedValue([]);
    mockQueryHabitatCache.mockReturnValue({});
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true, isInternetReachable: true });
  });

  it('resolves the pinned poiPlaceId first, skipping every other step', async () => {
    mockGetPlaceDetails.mockResolvedValue({ lat: 1, lng: 2, name: 'Farmácia Silva' });

    const result = await resolveTakeMeThereDestination({ ...ORIGIN, poiPlaceId: 'place-abc' });

    expect(result).toEqual({ lat: 1, lng: 2, name: 'Farmácia Silva', source: 'pinned' });
    expect(mockGetLearnedPlaceCounts).not.toHaveBeenCalled();
    expect(mockQueryHabitatCache).not.toHaveBeenCalled();
    expect(mockSearchNearbyPlaces).not.toHaveBeenCalled();
  });

  it('falls through to learned/cache/live when the pinned place fails to resolve', async () => {
    mockGetPlaceDetails.mockResolvedValue(null);
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [{ placeId: 'cache-1', name: 'Cached Pharmacy', lat: 3, lng: 4, distanceMeters: 900 }],
    });

    const result = await resolveTakeMeThereDestination({ ...ORIGIN, poiPlaceId: 'dead-id' });

    expect(result).toEqual({ lat: 3, lng: 4, name: 'Cached Pharmacy', distanceMeters: 900, source: 'cache' });
  });

  it('prefers a learned place over a closer cached candidate', async () => {
    mockGetLearnedPlaceCounts.mockResolvedValue([
      { placeId: 'internal-1', name: 'Farmácia Silva', poiType: 'pharmacy', visitCount: 5 },
    ]);
    mockGetHabitatPlaceById.mockReturnValue({ placeId: 'internal-1', name: 'Farmácia Silva', lat: 10, lng: 20, distanceMeters: 0 });
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [{ placeId: 'cache-1', name: 'Nearer Pharmacy', lat: 3, lng: 4, distanceMeters: 50 }],
    });

    const result = await resolveTakeMeThereDestination(ORIGIN);

    expect(result).toEqual({ lat: 10, lng: 20, name: 'Farmácia Silva', source: 'learned' });
    expect(mockQueryHabitatCache).not.toHaveBeenCalled();
  });

  it('ignores a learned place below the visit threshold and falls through to cache', async () => {
    mockGetLearnedPlaceCounts.mockResolvedValue([
      { placeId: 'internal-1', name: 'Farmácia Silva', poiType: 'pharmacy', visitCount: 1 },
    ]);
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [{ placeId: 'cache-1', name: 'Cached Pharmacy', lat: 3, lng: 4, distanceMeters: 900 }],
    });

    const result = await resolveTakeMeThereDestination(ORIGIN);

    expect(result?.source).toBe('cache');
    expect(mockGetHabitatPlaceById).not.toHaveBeenCalled();
  });

  it('falls through to cache when the learned place has no resolvable coordinates', async () => {
    mockGetLearnedPlaceCounts.mockResolvedValue([
      { placeId: 'internal-1', name: 'Farmácia Silva', poiType: 'pharmacy', visitCount: 5 },
    ]);
    mockGetHabitatPlaceById.mockReturnValue(null); // evicted from the habitat cache
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [{ placeId: 'cache-1', name: 'Cached Pharmacy', lat: 3, lng: 4, distanceMeters: 900 }],
    });

    const result = await resolveTakeMeThereDestination(ORIGIN);

    expect(result).toEqual({ lat: 3, lng: 4, name: 'Cached Pharmacy', distanceMeters: 900, source: 'cache' });
  });

  it('resolves the nearest cached place when nothing is learned', async () => {
    mockQueryHabitatCache.mockReturnValue({
      pharmacy: [{ placeId: 'cache-1', name: 'Cached Pharmacy', lat: 3, lng: 4, distanceMeters: 900 }],
    });

    const result = await resolveTakeMeThereDestination(ORIGIN);

    expect(result).toEqual({ lat: 3, lng: 4, name: 'Cached Pharmacy', distanceMeters: 900, source: 'cache' });
    expect(mockSearchNearbyPlaces).not.toHaveBeenCalled();
  });

  it('falls through to a live search when online and nothing is cached', async () => {
    mockSearchNearbyPlaces.mockResolvedValue({
      pharmacy: [{ placeId: 'live-1', name: 'Live Pharmacy', lat: 5, lng: 6, distanceMeters: 4000 }],
    });

    const result = await resolveTakeMeThereDestination(ORIGIN);

    expect(mockSearchNearbyPlaces).toHaveBeenCalledWith(ORIGIN.currentLat, ORIGIN.currentLng, ['pharmacy'], expect.any(Number));
    expect(result).toEqual({ lat: 5, lng: 6, name: 'Live Pharmacy', distanceMeters: 4000, source: 'live' });
  });

  it('does NOT attempt a live search when offline', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: false });

    const result = await resolveTakeMeThereDestination(ORIGIN);

    expect(mockSearchNearbyPlaces).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('does NOT attempt a live search when connected but internet is unreachable (captive portal)', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true, isInternetReachable: false });

    const result = await resolveTakeMeThereDestination(ORIGIN);

    expect(mockSearchNearbyPlaces).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('returns null when nothing resolves anywhere (hidden, not an error state)', async () => {
    mockSearchNearbyPlaces.mockResolvedValue({ pharmacy: [] });

    const result = await resolveTakeMeThereDestination(ORIGIN);

    expect(result).toBeNull();
  });

  it('never throws even if every downstream call rejects', async () => {
    mockGetPlaceDetails.mockRejectedValue(new Error('network error'));
    mockGetLearnedPlaceCounts.mockRejectedValue(new Error('firestore error'));
    mockSearchNearbyPlaces.mockRejectedValue(new Error('places error'));

    await expect(
      resolveTakeMeThereDestination({ ...ORIGIN, poiPlaceId: 'place-abc' }),
    ).resolves.toBeNull();
  });
});
