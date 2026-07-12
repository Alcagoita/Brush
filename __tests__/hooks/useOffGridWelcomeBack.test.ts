/**
 * KAN-246 — useOffGridWelcomeBack: the "payoff moment" toast + auto-expiry.
 */

const mockDeleteTrip = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/firestore', () => ({
  deleteTrip: (...args: unknown[]) => mockDeleteTrip(...args),
}));

const mockDeleteTripAreaPlaces = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/habitatCache', () => ({
  deleteTripAreaPlaces: (...args: unknown[]) => mockDeleteTripAreaPlaces(...args),
}));

const mockShowToast = jest.fn();
jest.mock('../../src/store/toastStore', () => ({
  useToastStore: { getState: () => ({ showToast: mockShowToast }) },
}));

// offGrid.ts (requireActual'd for its real countBrushedDuringWindow) imports
// tripDownload.ts for TRIP_RADIUS_PRESETS, which pulls in NetInfo — stub it.
jest.mock('../../src/services/tripDownload', () => ({
  TRIP_RADIUS_PRESETS: [
    { key: 'town', radiusMeters: 5_000 },
    { key: 'town_and_around', radiusMeters: 15_000 },
    { key: 'region', radiusMeters: 40_000 },
  ],
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { useOffGridWelcomeBack } from '../../src/hooks/useOffGridWelcomeBack';
import { COPY } from '../../src/constants/copy';
import type { Task, Trip } from '../../src/types';

const NOW = Date.now();

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'og-1', destination: 'this area', placeRef: '',
    centerLat: 0, centerLng: 0, areaRadius: 15_000,
    cacheAreaId: 'og_1', expiresAt: NOW - 1_000, // already expired by default
    kind: 'offgrid',
    createdAt: { toDate: () => new Date(NOW - 5 * 60 * 60 * 1_000) } as unknown as Trip['createdAt'],
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1', title: 'Task', category: 'errands', done: true,
    date: '2026-07-15', createdAt: {} as unknown as Task['createdAt'],
    ...overrides,
  };
}

function completedAt(msAgo: number): Task['completedAt'] {
  return { toDate: () => new Date(NOW - msAgo) } as unknown as Task['completedAt'];
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useOffGridWelcomeBack', () => {
  it('does nothing when uid is undefined', () => {
    renderHook(() => useOffGridWelcomeBack(undefined, [], [makeTrip()]));
    expect(mockDeleteTrip).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('does nothing when there is no offgrid trip', () => {
    renderHook(() => useOffGridWelcomeBack('u1', [], []));
    expect(mockDeleteTrip).not.toHaveBeenCalled();
  });

  it('does nothing while the off-grid trip is still active (not yet expired)', () => {
    renderHook(() => useOffGridWelcomeBack('u1', [], [makeTrip({ expiresAt: NOW + 1_000_000 })]));
    expect(mockDeleteTrip).not.toHaveBeenCalled();
  });

  it('does nothing for a regular (non-offgrid) trip, even if its expiresAt has passed', () => {
    renderHook(() => useOffGridWelcomeBack('u1', [], [makeTrip({ kind: undefined })]));
    expect(mockDeleteTrip).not.toHaveBeenCalled();
  });

  it('shows the welcome-back toast with N when N >= 1, and deletes the trip', async () => {
    const trip = makeTrip();
    const tasks = [
      makeTask({ id: 'a', completedAt: completedAt(2 * 60 * 60 * 1_000) }), // 2h ago — inside the window
      makeTask({ id: 'b', completedAt: completedAt(10 * 60 * 60 * 1_000) }), // 10h ago — before the window
    ];

    renderHook(() => useOffGridWelcomeBack('u1', tasks, [trip]));

    await waitFor(() => expect(mockDeleteTrip).toHaveBeenCalledWith('u1', 'og-1'));
    expect(mockShowToast).toHaveBeenCalledWith(COPY.offGrid.welcomeBackToast(1));
    expect(mockDeleteTripAreaPlaces).toHaveBeenCalledWith('og_1');
  });

  it('does not show a toast when N = 0, but still deletes the trip (no guilt version)', async () => {
    const trip = makeTrip();
    renderHook(() => useOffGridWelcomeBack('u1', [], [trip]));

    await waitFor(() => expect(mockDeleteTrip).toHaveBeenCalledWith('u1', 'og-1'));
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(mockDeleteTripAreaPlaces).toHaveBeenCalledWith('og_1');
  });

  it('only handles the same expired trip once, even across re-renders', async () => {
    const trip = makeTrip();
    const { rerender } = renderHook(
      ({ tasks, trips }: { tasks: Task[]; trips: Trip[] }) => useOffGridWelcomeBack('u1', tasks, trips),
      { initialProps: { tasks: [] as Task[], trips: [trip] } },
    );
    await waitFor(() => expect(mockDeleteTrip).toHaveBeenCalledTimes(1));

    rerender({ tasks: [], trips: [trip] });
    rerender({ tasks: [], trips: [trip] });

    expect(mockDeleteTrip).toHaveBeenCalledTimes(1);
  });

  it('does not throw when deleteTrip fails', async () => {
    mockDeleteTrip.mockRejectedValueOnce(new Error('offline'));
    const trip = makeTrip();
    expect(() => renderHook(() => useOffGridWelcomeBack('u1', [], [trip]))).not.toThrow();
    await waitFor(() => expect(mockDeleteTrip).toHaveBeenCalled());
    expect(mockDeleteTripAreaPlaces).toHaveBeenCalledWith('og_1');
  });
});
