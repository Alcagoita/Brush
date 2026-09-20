/**
 * useErrandBundle — KAN-235.
 *
 * Covers: exposes the top-ranked bundle from computeErrandBundles; loads
 * today's persisted dismissals once (getDismissedBundleKeysToday) rather
 * than checking each candidate synchronously; dismiss() persists the
 * dismissal and immediately hides that bundle without waiting for a
 * re-render triggered by props changing.
 */

import { act, renderHook } from '@testing-library/react-native';
import { useErrandBundle } from '../../src/hooks/useErrandBundle';
import type { Task } from '../../src/types';
import type { PlacesMap } from '../../src/services/proximity';

const mockComputeErrandBundles = jest.fn();
const mockDismissBundleForToday = jest.fn();
const mockGetDismissedBundleKeysToday = jest.fn().mockReturnValue(new Set());

// KAN-293 — the hook now also asks clusterLeisure for a companion place.
// That module imports maps.ts, which reaches @react-native-firebase/functions
// (native, unavailable under Jest), so stub at the service boundary. These
// tests are about bundle selection and dismissal, not leisure detection —
// clusterLeisure has its own suite.
const mockFindClusterLeisure = jest.fn(() => null);
jest.mock('../../src/services/clusterLeisure', () => ({
  findClusterLeisure: () => mockFindClusterLeisure(),
}));

jest.mock('../../src/services/errandBundles', () => ({
  computeErrandBundles: (...args: unknown[]) => mockComputeErrandBundles(...args),
  dismissBundleForToday: (...args: unknown[]) => mockDismissBundleForToday(...args),
  getDismissedBundleKeysToday: (...args: unknown[]) => mockGetDismissedBundleKeysToday(...args),
  errandBundleKey: (bundle: { anchor: { placeId: string } }) => bundle.anchor.placeId,
}));

function makeBundle(anchorId: string, taskCount: number) {
  return {
    anchor: { placeId: anchorId, name: `Anchor ${anchorId}`, lat: 0, lng: 0, distanceMeters: 0 },
    entries: Array.from({ length: taskCount }, (_, i) => ({
      task: { id: `t${i}` } as Task,
      place: { placeId: `p${i}`, name: 'Place', lat: 0, lng: 0, distanceMeters: 0 },
      distanceToAnchorMeters: 0,
    })),
    totalWalkDistanceMeters: 0,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDismissedBundleKeysToday.mockReturnValue(new Set());
});

describe('useErrandBundle', () => {
  it('returns null when computeErrandBundles finds nothing', async () => {
    mockComputeErrandBundles.mockReturnValue([]);
    const { result } = renderHook(() => useErrandBundle([] as Task[], {} as PlacesMap));
    await act(async () => {});
    expect(result.current.bundle).toBeNull();
  });

  it('exposes the top-ranked (first) bundle', async () => {
    const top = makeBundle('a1', 3);
    mockComputeErrandBundles.mockReturnValue([top, makeBundle('a2', 2)]);
    const { result } = renderHook(() => useErrandBundle([] as Task[], {} as PlacesMap));
    await act(async () => {});
    expect(result.current.bundle).toBe(top);
  });

  it('loads persisted dismissals once and skips an already-dismissed bundle, falling through to the next one', async () => {
    mockGetDismissedBundleKeysToday.mockReturnValue(new Set(['a1']));
    const second = makeBundle('a2', 2);
    mockComputeErrandBundles.mockReturnValue([makeBundle('a1', 3), second]);
    const { result } = renderHook(() => useErrandBundle([] as Task[], {} as PlacesMap));
    await act(async () => {});
    expect(result.current.bundle).toBe(second);
  });

  it('dismiss() persists the dismissal and immediately hides the bundle', async () => {
    const only = makeBundle('a1', 2);
    mockComputeErrandBundles.mockReturnValue([only]);
    const { result } = renderHook(() => useErrandBundle([] as Task[], {} as PlacesMap));
    await act(async () => {});
    expect(result.current.bundle).toBe(only);

    act(() => { result.current.dismiss(); });

    expect(mockDismissBundleForToday).toHaveBeenCalledWith('a1');
    expect(result.current.bundle).toBeNull();
  });

  it('dismiss() is a no-op when there is no current bundle', async () => {
    mockComputeErrandBundles.mockReturnValue([]);
    const { result } = renderHook(() => useErrandBundle([] as Task[], {} as PlacesMap));
    await act(async () => {});
    act(() => { result.current.dismiss(); });
    expect(mockDismissBundleForToday).not.toHaveBeenCalled();
  });

  it('only re-loads persisted dismissals once, not on every recompute within the same day', async () => {
    mockComputeErrandBundles.mockReturnValue([makeBundle('a1', 2)]);
    const { rerender } = renderHook(
      ({ tasks }: { tasks: Task[] }) => useErrandBundle(tasks, {} as PlacesMap),
      { initialProps: { tasks: [] as Task[] } },
    );
    await act(async () => {});
    expect(mockGetDismissedBundleKeysToday).toHaveBeenCalledTimes(1);

    // A new proximity tick (tasks identity changes) recomputes bundles but
    // must not re-hit the dismissal DB again for the same day.
    mockComputeErrandBundles.mockReturnValue([makeBundle('a1', 2)]);
    await act(async () => { rerender({ tasks: [{ id: 'x' } as Task] }); });
    expect(mockGetDismissedBundleKeysToday).toHaveBeenCalledTimes(1);
  });
});
