/**
 * useMallSnapshotToggle — KAN-237
 *
 * Covers:
 *   - initial load reflects an existing snapshot (enabled true/false)
 *   - toggle on: fetches position, downloads the snapshot, feeds it into
 *     proximity.ts, sets enabled true
 *   - toggle on failure (no mall found / network error): shows the right
 *     toast, leaves enabled false
 *   - toggle off: deletes the doc + cached rows, clears proximity.ts, sets
 *     enabled false
 *   - loading is true only while the async work is in flight
 */

jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => ({ currentUser: { uid: 'test-uid' } }),
}));
jest.mock('@react-native-firebase/auth', () => ({}));

const mockGetCurrentPosition = jest.fn();
jest.mock('../../src/services/geolocation', () => ({
  getCurrentPosition: () => mockGetCurrentPosition(),
}));

const mockGetCategories = jest.fn().mockResolvedValue([]);
jest.mock('../../src/services/firestore', () => ({
  getCategories: (...args: unknown[]) => mockGetCategories(...args),
}));

const mockDeleteTripAreaPlaces = jest.fn();
jest.mock('../../src/services/habitatCache', () => ({
  deleteTripAreaPlaces: (...args: unknown[]) => mockDeleteTripAreaPlaces(...args),
}));

const mockSetProximityMallSnapshot = jest.fn();
jest.mock('../../src/services/proximity', () => ({
  setMallSnapshot: (...args: unknown[]) => mockSetProximityMallSnapshot(...args),
}));

const mockGetMallSnapshot = jest.fn();
const mockDownloadMallSnapshot = jest.fn();
const mockDeleteMallSnapshotDoc = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/mallSnapshots', () => ({
  getMallSnapshot: (...args: unknown[]) => mockGetMallSnapshot(...args),
  downloadMallSnapshot: (...args: unknown[]) => mockDownloadMallSnapshot(...args),
  deleteMallSnapshotDoc: (...args: unknown[]) => mockDeleteMallSnapshotDoc(...args),
  MALL_SNAPSHOT_CACHE_AREA_ID: 'mall_snapshot',
}));

const mockShowToast = jest.fn();
jest.mock('../../src/store/toastStore', () => ({
  useToastStore: { getState: () => ({ showToast: mockShowToast }) },
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useMallSnapshotToggle } from '../../src/hooks/useMallSnapshotToggle';
import { COPY } from '../../src/constants/copy';

const SNAPSHOT = {
  placeId: 'mall-1', name: 'Test Mall', centerLat: 1, centerLng: 2, radius: 300,
  cacheAreaId: 'mall_snapshot', expiresAt: 9_999_999_999_999,
  createdAt: {} as unknown,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMallSnapshot.mockResolvedValue(null);
  mockGetCategories.mockResolvedValue([]);
  mockGetCurrentPosition.mockResolvedValue({ lat: 1, lng: 2, accuracy: 5, timestamp: 0 });
  mockDownloadMallSnapshot.mockResolvedValue(SNAPSHOT);
});

describe('initial load', () => {
  it('reflects enabled: true when a snapshot already exists', async () => {
    mockGetMallSnapshot.mockResolvedValue(SNAPSHOT);
    const { result } = renderHook(() => useMallSnapshotToggle());
    await waitFor(() => expect(result.current.enabled).toBe(true));
  });

  it('reflects enabled: false when no snapshot exists', async () => {
    mockGetMallSnapshot.mockResolvedValue(null);
    const { result } = renderHook(() => useMallSnapshotToggle());
    await waitFor(() => expect(mockGetMallSnapshot).toHaveBeenCalled());
    expect(result.current.enabled).toBe(false);
  });
});

describe('toggle(true)', () => {
  it('downloads the snapshot, feeds it into proximity.ts, and sets enabled true', async () => {
    mockGetCategories.mockResolvedValue([{ id: 'c1', name: 'Custom', poi: 'library' }]);
    const { result } = renderHook(() => useMallSnapshotToggle());

    let toggling!: Promise<void>;
    act(() => { toggling = result.current.toggle(true); });
    expect(result.current.loading).toBe(true);

    await act(async () => { await toggling; });

    expect(mockDownloadMallSnapshot).toHaveBeenCalledWith(
      'test-uid', { lat: 1, lng: 2 }, expect.arrayContaining(['library']),
    );
    expect(mockSetProximityMallSnapshot).toHaveBeenCalledWith(SNAPSHOT);
    expect(result.current.enabled).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('shows the "no mall found" toast and leaves enabled false when no mall is nearby', async () => {
    mockDownloadMallSnapshot.mockRejectedValue(new Error('No shopping mall found nearby'));
    const { result } = renderHook(() => useMallSnapshotToggle());

    await act(async () => { await result.current.toggle(true); });

    expect(mockShowToast).toHaveBeenCalledWith(COPY.mallSnapshot.noMallFoundToast);
    expect(result.current.enabled).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('shows the generic error toast on any other failure', async () => {
    mockDownloadMallSnapshot.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useMallSnapshotToggle());

    await act(async () => { await result.current.toggle(true); });

    expect(mockShowToast).toHaveBeenCalledWith(COPY.mallSnapshot.errorToast);
    expect(result.current.enabled).toBe(false);
  });
});

describe('toggle(false)', () => {
  it('deletes the doc + cached rows and clears proximity.ts', async () => {
    mockGetMallSnapshot.mockResolvedValue(SNAPSHOT);
    const { result } = renderHook(() => useMallSnapshotToggle());
    await waitFor(() => expect(result.current.enabled).toBe(true));

    await act(async () => { await result.current.toggle(false); });

    expect(mockDeleteMallSnapshotDoc).toHaveBeenCalledWith('test-uid');
    expect(mockDeleteTripAreaPlaces).toHaveBeenCalledWith('mall_snapshot');
    expect(mockSetProximityMallSnapshot).toHaveBeenCalledWith(null);
    expect(result.current.enabled).toBe(false);
  });
});
