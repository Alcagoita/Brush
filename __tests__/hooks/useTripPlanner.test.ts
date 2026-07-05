/**
 * KAN-234 — useTripPlanner hook tests.
 *
 * Covers independently-testable hook behaviour (no JSX):
 *   - destination search: debounced autocomplete, selecting a suggestion
 *     resolves via getPlaceDetails and advances to the dates step
 *   - dates step: skipDates / goToRadius both advance to the radius step
 *   - radius step: estimatedBytes and previewUrl update when radiusKey changes
 *   - confirmDownload: calls downloadTripArea then addTrip with a fresh
 *     cacheAreaId/expiresAt, shows a toast, and calls onDone
 *   - confirmDownload failure: surfaces an error and returns to the radius step
 *   - goBack: destination ← dates ← radius
 */

jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => ({ currentUser: { uid: 'test-uid' } }),
}));
jest.mock('@react-native-firebase/auth', () => ({}));

// tripDownload.ts (requireActual'd below, for its real constants/pure
// functions) transitively imports NetInfo and habitatCache.ts (which pulls
// in expo-sqlite, ESM, breaks Jest's transform) — not under test here.
jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock'),
);
jest.mock('../../src/services/habitatCache');

const mockSearchDestinationAutocomplete = jest.fn();
const mockGetPlaceDetails = jest.fn();
const mockBuildStaticMapPreviewUrl = jest.fn((..._args: unknown[]) => 'https://example.com/map.png');
jest.mock('../../src/services/maps', () => ({
  searchDestinationAutocomplete: (...args: unknown[]) => mockSearchDestinationAutocomplete(...args),
  getPlaceDetails: (...args: unknown[]) => mockGetPlaceDetails(...args),
  buildStaticMapPreviewUrl: (...args: unknown[]) => mockBuildStaticMapPreviewUrl(...args),
}));

const mockAddTrip = jest.fn();
const mockGetCategories = jest.fn().mockResolvedValue([]);
jest.mock('../../src/services/firestore', () => ({
  addTrip: (...args: unknown[]) => mockAddTrip(...args),
  getCategories: (...args: unknown[]) => mockGetCategories(...args),
}));

// tripDownload.ts (requireActual'd below) imports updateTrip directly from
// this submodule, not the firestore/ barrel above — it transitively pulls
// in real @react-native-firebase/firestore otherwise. Not under test here.
jest.mock('../../src/services/firestore/trips', () => ({
  updateTrip: jest.fn().mockResolvedValue(undefined),
}));

const mockDownloadTripArea = jest.fn();
jest.mock('../../src/services/tripDownload', () => {
  const actual = jest.requireActual('../../src/services/tripDownload');
  return {
    ...actual,
    downloadTripArea: (...args: unknown[]) => mockDownloadTripArea(...args),
  };
});

const mockShowToast = jest.fn();
jest.mock('../../src/store/toastStore', () => ({
  useToastStore: { getState: () => ({ showToast: mockShowToast }) },
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useTripPlanner } from '../../src/hooks/useTripPlanner';
import { deleteTripAreaPlaces as mockDeleteTripAreaPlaces } from '../../src/services/habitatCache';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCategories.mockResolvedValue([]);
});

describe('destination step', () => {
  it('debounces autocomplete search as the user types', async () => {
    jest.useFakeTimers();
    mockSearchDestinationAutocomplete.mockResolvedValue([{ placeId: 'p1', name: 'Faro', address: 'Portugal' }]);

    const onDone = jest.fn();
    const { result } = renderHook(() => useTripPlanner(onDone));

    act(() => { result.current.setQuery('Far'); });
    expect(mockSearchDestinationAutocomplete).not.toHaveBeenCalled();

    await act(async () => { jest.advanceTimersByTime(300); });
    expect(mockSearchDestinationAutocomplete).toHaveBeenCalledWith('Far');

    jest.useRealTimers();
  });

  it('selecting a suggestion resolves via getPlaceDetails and advances to the dates step', async () => {
    mockGetPlaceDetails.mockResolvedValue({ lat: 37.0179, lng: -7.9304, name: 'Faro, Portugal' });

    const { result } = renderHook(() => useTripPlanner(jest.fn()));

    await act(async () => {
      await result.current.selectDestination({ placeId: 'p1', name: 'Faro', address: 'Portugal' });
    });

    expect(result.current.step).toBe('dates');
    expect(result.current.destination).toEqual({ placeId: 'p1', name: 'Faro, Portugal', lat: 37.0179, lng: -7.9304 });
  });

  it('surfaces an error and stays on the destination step when getPlaceDetails fails', async () => {
    mockGetPlaceDetails.mockResolvedValue(null);

    const { result } = renderHook(() => useTripPlanner(jest.fn()));

    await act(async () => {
      await result.current.selectDestination({ placeId: 'p1', name: 'Faro', address: 'Portugal' });
    });

    expect(result.current.step).toBe('destination');
    expect(result.current.error).not.toBeNull();
  });

  it('does not re-fire the debounced search once a destination has been selected (KAN-234 review fix)', async () => {
    jest.useFakeTimers();
    mockGetPlaceDetails.mockResolvedValue({ lat: 37.0179, lng: -7.9304, name: 'Faro, Portugal' });

    const { result } = renderHook(() => useTripPlanner(jest.fn()));

    await act(async () => {
      await result.current.selectDestination({ placeId: 'p1', name: 'Faro', address: 'Portugal' });
    });
    mockSearchDestinationAutocomplete.mockClear();

    // selectDestination internally calls setQuery(suggestion.name), which
    // re-triggers the debounced-search effect exactly like real typing would
    // — the "just selected" guard must suppress this one re-fire.
    await act(async () => { jest.advanceTimersByTime(300); });
    expect(mockSearchDestinationAutocomplete).not.toHaveBeenCalled();

    jest.useRealTimers();
  });
});

describe('dates step', () => {
  async function goToDatesStep() {
    mockGetPlaceDetails.mockResolvedValue({ lat: 1, lng: 2, name: 'Faro' });
    const { result } = renderHook(() => useTripPlanner(jest.fn()));
    await act(async () => {
      await result.current.selectDestination({ placeId: 'p1', name: 'Faro', address: '' });
    });
    return result;
  }

  it('skipDates clears dates and advances to radius', async () => {
    const result = await goToDatesStep();
    act(() => { result.current.setStartDate('2026-07-20'); });
    act(() => { result.current.skipDates(); });

    expect(result.current.step).toBe('radius');
    expect(result.current.startDate).toBeUndefined();
    expect(result.current.endDate).toBeUndefined();
  });

  it('goToRadius keeps whatever dates were set', async () => {
    const result = await goToDatesStep();
    act(() => { result.current.setStartDate('2026-07-20'); result.current.setEndDate('2026-07-27'); });
    act(() => { result.current.goToRadius(); });

    expect(result.current.step).toBe('radius');
    expect(result.current.startDate).toBe('2026-07-20');
    expect(result.current.endDate).toBe('2026-07-27');
  });
});

describe('radius step', () => {
  async function goToRadiusStep() {
    mockGetPlaceDetails.mockResolvedValue({ lat: 1, lng: 2, name: 'Faro' });
    const { result } = renderHook(() => useTripPlanner(jest.fn()));
    await act(async () => {
      await result.current.selectDestination({ placeId: 'p1', name: 'Faro', address: '' });
    });
    act(() => { result.current.skipDates(); });
    return result;
  }

  it('estimatedBytes and previewUrl change when radiusKey changes', async () => {
    const result = await goToRadiusStep();
    const initialEstimate = result.current.estimatedBytes;

    act(() => { result.current.setRadiusKey('region'); });

    expect(result.current.estimatedBytes).toBeGreaterThan(initialEstimate);
    expect(mockBuildStaticMapPreviewUrl).toHaveBeenLastCalledWith(1, 2, 40_000, expect.any(Number), expect.any(Number));
  });
});

describe('confirmDownload', () => {
  async function goToRadiusStep() {
    mockGetPlaceDetails.mockResolvedValue({ lat: 1, lng: 2, name: 'Faro' });
    const { result } = renderHook(() => useTripPlanner(onDoneMock));
    await act(async () => {
      await result.current.selectDestination({ placeId: 'p1', name: 'Faro', address: '' });
    });
    act(() => { result.current.skipDates(); });
    return result;
  }

  let onDoneMock: jest.Mock;
  beforeEach(() => { onDoneMock = jest.fn(); });

  it('downloads the area, creates the trip, shows a toast, and calls onDone', async () => {
    mockDownloadTripArea.mockResolvedValue(5);
    mockAddTrip.mockResolvedValue('trip-1');
    const result = await goToRadiusStep();

    await act(async () => { await result.current.confirmDownload(); });

    expect(mockDownloadTripArea).toHaveBeenCalledWith(
      { lat: 1, lng: 2 }, expect.any(Number), expect.any(String), expect.any(Number), [],
    );
    expect(mockAddTrip).toHaveBeenCalledWith('test-uid', expect.objectContaining({
      destination: 'Faro', placeRef: 'p1', centerLat: 1, centerLng: 2,
    }));
    expect(mockShowToast).toHaveBeenCalled();
    expect(onDoneMock).toHaveBeenCalled();
  });

  it('surfaces an error and returns to the radius step on failure', async () => {
    mockDownloadTripArea.mockRejectedValue(new Error('network down'));
    const result = await goToRadiusStep();

    await act(async () => { await result.current.confirmDownload(); });

    expect(result.current.step).toBe('radius');
    expect(result.current.error).not.toBeNull();
    expect(onDoneMock).not.toHaveBeenCalled();
  });

  it('rolls back the downloaded cache rows when addTrip fails after a successful download (KAN-234 review fix)', async () => {
    mockDownloadTripArea.mockResolvedValue(5);
    mockAddTrip.mockRejectedValue(new Error('firestore unavailable'));
    const result = await goToRadiusStep();

    await act(async () => { await result.current.confirmDownload(); });

    expect(mockDownloadTripArea).toHaveBeenCalled();
    const [, , cacheAreaId] = mockDownloadTripArea.mock.calls[0];
    expect(mockDeleteTripAreaPlaces).toHaveBeenCalledWith(cacheAreaId);
    expect(result.current.step).toBe('radius');
    expect(result.current.error).not.toBeNull();
    expect(onDoneMock).not.toHaveBeenCalled();
  });
});

describe('goBack', () => {
  it('steps back radius -> dates -> destination', async () => {
    mockGetPlaceDetails.mockResolvedValue({ lat: 1, lng: 2, name: 'Faro' });
    const { result } = renderHook(() => useTripPlanner(jest.fn()));

    await act(async () => {
      await result.current.selectDestination({ placeId: 'p1', name: 'Faro', address: '' });
    });
    act(() => { result.current.goToRadius(); });
    expect(result.current.step).toBe('radius');

    act(() => { result.current.goBack(); });
    expect(result.current.step).toBe('dates');

    act(() => { result.current.goBack(); });
    expect(result.current.step).toBe('destination');
  });
});
