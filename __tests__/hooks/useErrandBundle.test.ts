/**
 * useErrandBundle — KAN-235.
 *
 * Covers: exposes the top-ranked bundle from computeErrandBundles; dismiss()
 * persists the dismissal (isBundleDismissedToday) and immediately hides that
 * bundle without waiting for a re-render triggered by props changing.
 */

import { act, renderHook } from '@testing-library/react-native';
import { useErrandBundle } from '../../src/hooks/useErrandBundle';
import type { Task } from '../../src/types';
import type { PlacesMap } from '../../src/services/proximity';

const mockComputeErrandBundles = jest.fn();
const mockDismissBundleForToday = jest.fn();
const mockIsBundleDismissedToday = jest.fn().mockReturnValue(false);

jest.mock('../../src/services/errandBundles', () => ({
  computeErrandBundles: (...args: unknown[]) => mockComputeErrandBundles(...args),
  dismissBundleForToday: (...args: unknown[]) => mockDismissBundleForToday(...args),
  isBundleDismissedToday: (...args: unknown[]) => mockIsBundleDismissedToday(...args),
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
  mockIsBundleDismissedToday.mockReturnValue(false);
});

describe('useErrandBundle', () => {
  it('returns null when computeErrandBundles finds nothing', () => {
    mockComputeErrandBundles.mockReturnValue([]);
    const { result } = renderHook(() => useErrandBundle([] as Task[], {} as PlacesMap));
    expect(result.current.bundle).toBeNull();
  });

  it('exposes the top-ranked (first) bundle', () => {
    const top = makeBundle('a1', 3);
    mockComputeErrandBundles.mockReturnValue([top, makeBundle('a2', 2)]);
    const { result } = renderHook(() => useErrandBundle([] as Task[], {} as PlacesMap));
    expect(result.current.bundle).toBe(top);
  });

  it('skips a bundle already dismissed today and falls through to the next one', () => {
    mockIsBundleDismissedToday.mockImplementation((key: string) => key === 'a1');
    const second = makeBundle('a2', 2);
    mockComputeErrandBundles.mockReturnValue([makeBundle('a1', 3), second]);
    const { result } = renderHook(() => useErrandBundle([] as Task[], {} as PlacesMap));
    expect(result.current.bundle).toBe(second);
  });

  it('dismiss() persists the dismissal and immediately hides the bundle', () => {
    const only = makeBundle('a1', 2);
    mockComputeErrandBundles.mockReturnValue([only]);
    const { result } = renderHook(() => useErrandBundle([] as Task[], {} as PlacesMap));
    expect(result.current.bundle).toBe(only);

    act(() => { result.current.dismiss(); });

    expect(mockDismissBundleForToday).toHaveBeenCalledWith('a1');
    expect(result.current.bundle).toBeNull();
  });

  it('dismiss() is a no-op when there is no current bundle', () => {
    mockComputeErrandBundles.mockReturnValue([]);
    const { result } = renderHook(() => useErrandBundle([] as Task[], {} as PlacesMap));
    act(() => { result.current.dismiss(); });
    expect(mockDismissBundleForToday).not.toHaveBeenCalled();
  });
});
