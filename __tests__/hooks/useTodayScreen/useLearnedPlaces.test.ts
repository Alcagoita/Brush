/**
 * KAN-230 — useLearnedPlaces: one-shot fetch + compute of the learned-place
 * ranking, with a manual refresh() for after a completion.
 *
 * Also covers the request-token guard: a uid change clears the ranking
 * immediately and discards whatever the previous uid's in-flight fetch
 * later resolves with — otherwise a shared device could briefly show one
 * account's learned places under a different signed-in account.
 */

const mockGetCompletedTasksWithPlace = jest.fn();

jest.mock('../../../src/services/firestore', () => ({
  getCompletedTasksWithPlace: (...args: unknown[]) => mockGetCompletedTasksWithPlace(...args),
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useLearnedPlaces } from '../../../src/hooks/useTodayScreen/useLearnedPlaces';
import type { LearnedPlacesState } from '../../../src/hooks/useTodayScreen/useLearnedPlaces';
import type { Task } from '../../../src/types';

function brush(placeId: string, name: string, poiType: string): Task {
  return {
    id: `task-${Math.random()}`, title: 'Errand', category: 'errands', done: true,
    date: '2026-07-05', createdAt: { toDate: () => new Date() } as unknown as Task['createdAt'],
    completedPlaceId: placeId, completedPlaceName: name, completedPoiType: poiType,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useLearnedPlaces', () => {
  it('returns an empty ranking when uid is undefined', async () => {
    const { result } = renderHook(() => useLearnedPlaces(undefined));
    await waitFor(() => expect(result.current.learnedPlaces).toEqual([]));
    expect(mockGetCompletedTasksWithPlace).not.toHaveBeenCalled();
  });

  it('fetches and computes the ranking on mount for a given uid', async () => {
    mockGetCompletedTasksWithPlace.mockResolvedValue([
      brush('hp_1', 'Corner ATM', 'atm'),
      brush('hp_1', 'Corner ATM', 'atm'),
      brush('hp_1', 'Corner ATM', 'atm'),
    ]);

    const { result } = renderHook(() => useLearnedPlaces('uid-1'));

    await waitFor(() => expect(result.current.learnedPlaces).toHaveLength(1));
    expect(result.current.learnedPlaces[0]).toEqual({
      placeId: 'hp_1', name: 'Corner ATM', poiType: 'atm', visitCount: 3,
    });
    expect(mockGetCompletedTasksWithPlace).toHaveBeenCalledWith('uid-1');
  });

  it('refresh() re-fetches and recomputes the ranking', async () => {
    mockGetCompletedTasksWithPlace.mockResolvedValue([]);
    const { result } = renderHook(() => useLearnedPlaces('uid-1'));
    await waitFor(() => expect(mockGetCompletedTasksWithPlace).toHaveBeenCalledTimes(1));
    expect(result.current.learnedPlaces).toEqual([]);

    mockGetCompletedTasksWithPlace.mockResolvedValue([
      brush('hp_1', 'Corner ATM', 'atm'),
      brush('hp_1', 'Corner ATM', 'atm'),
      brush('hp_1', 'Corner ATM', 'atm'),
    ]);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.learnedPlaces).toHaveLength(1);
    expect(mockGetCompletedTasksWithPlace).toHaveBeenCalledTimes(2);
  });

  it('does not throw and logs a warning when the fetch fails', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockGetCompletedTasksWithPlace.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useLearnedPlaces('uid-1'));

    await waitFor(() => expect(warnSpy).toHaveBeenCalledWith('[useLearnedPlaces] refresh failed', expect.any(Error)));
    expect(result.current.learnedPlaces).toEqual([]);
    warnSpy.mockRestore();
  });

  it('discards a stale in-flight fetch from the previous uid after uid changes', async () => {
    let resolveFirstFetch!: (tasks: Task[]) => void;
    mockGetCompletedTasksWithPlace.mockImplementationOnce(
      () => new Promise<Task[]>(resolve => { resolveFirstFetch = resolve; }),
    );

    const { result, rerender } = renderHook<LearnedPlacesState, { uid: string }>(
      ({ uid }) => useLearnedPlaces(uid),
      { initialProps: { uid: 'uid-A' } },
    );
    await waitFor(() => expect(mockGetCompletedTasksWithPlace).toHaveBeenCalledWith('uid-A'));

    // Switch accounts before uid-A's fetch resolves — the ranking must
    // clear immediately, not keep showing uid-A's (still empty) state.
    mockGetCompletedTasksWithPlace.mockResolvedValueOnce([
      brush('hp_b', 'Uid B Cafe', 'cafe'),
      brush('hp_b', 'Uid B Cafe', 'cafe'),
      brush('hp_b', 'Uid B Cafe', 'cafe'),
    ]);
    rerender({ uid: 'uid-B' });
    await waitFor(() => expect(result.current.learnedPlaces).toHaveLength(1));
    expect(result.current.learnedPlaces[0].placeId).toBe('hp_b');

    // uid-A's fetch finally resolves — must be ignored, not overwrite uid-B's ranking.
    resolveFirstFetch([
      brush('hp_a', 'Uid A ATM', 'atm'),
      brush('hp_a', 'Uid A ATM', 'atm'),
      brush('hp_a', 'Uid A ATM', 'atm'),
    ]);
    await act(async () => { await Promise.resolve(); });

    expect(result.current.learnedPlaces).toHaveLength(1);
    expect(result.current.learnedPlaces[0].placeId).toBe('hp_b');
  });

  it('ignores an overlapping refresh() response that resolves out of order', async () => {
    let resolveFirst!: (tasks: Task[]) => void;
    mockGetCompletedTasksWithPlace.mockResolvedValueOnce([]); // initial mount fetch
    const { result } = renderHook(() => useLearnedPlaces('uid-1'));
    await waitFor(() => expect(mockGetCompletedTasksWithPlace).toHaveBeenCalledTimes(1));

    // First manual refresh — left pending.
    mockGetCompletedTasksWithPlace.mockImplementationOnce(
      () => new Promise<Task[]>(resolve => { resolveFirst = resolve; }),
    );
    const firstRefresh = result.current.refresh();

    // Second manual refresh — resolves immediately, should win.
    mockGetCompletedTasksWithPlace.mockResolvedValueOnce([
      brush('hp_new', 'New Place', 'atm'),
      brush('hp_new', 'New Place', 'atm'),
      brush('hp_new', 'New Place', 'atm'),
    ]);
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.learnedPlaces[0]?.placeId).toBe('hp_new');

    // The first (older) refresh finally resolves — must not overwrite the newer result.
    resolveFirst([
      brush('hp_old', 'Old Place', 'cafe'),
      brush('hp_old', 'Old Place', 'cafe'),
      brush('hp_old', 'Old Place', 'cafe'),
    ]);
    await act(async () => { await firstRefresh; });

    expect(result.current.learnedPlaces[0]?.placeId).toBe('hp_new');
  });
});
