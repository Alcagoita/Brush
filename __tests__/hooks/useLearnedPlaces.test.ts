/**
 * KAN-230 — useLearnedPlaces: one-shot fetch + compute of the learned-place
 * ranking, with a manual refresh() for after a completion.
 */

const mockGetCompletedTasksWithPlace = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  getCompletedTasksWithPlace: (...args: unknown[]) => mockGetCompletedTasksWithPlace(...args),
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useLearnedPlaces } from '../../src/hooks/useTodayScreen/useLearnedPlaces';
import type { Task } from '../../src/types';

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
});
