/**
 * KAN-59 / KAN-154 — useTodayScreen hook tests.
 *
 * Covers:
 *   - isLoading: true initially, false after one-shot fetch resolves
 *   - isRefreshing: true during pull-to-refresh, false after
 *   - error: null on success, string on fetch failure
 *   - refresh(): re-runs the full fetch (used by onTaskAdded after task creation)
 *   - Proximity engine: starts when undone POI tasks are present
 *   - Proximity engine: does NOT start without POI tasks
 *   - Optimistic toggle: calls setTaskDone and evaluateAchievements
 *   - Progress derived values: totalTasks, doneTasks, progress, nearbyCount
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetTasksForDate        = jest.fn();
const mockGetCategories          = jest.fn();
const mockGetUser                = jest.fn();
const mockGetUserPreferences     = jest.fn();
const mockGetPoiPreferencesMap   = jest.fn();
const mockGetTotalPoints         = jest.fn();
const mockSetTaskDone            = jest.fn();
const mockRunProximitySearch     = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  getTasksForDate:      (...args: unknown[]) => mockGetTasksForDate(...args),
  getCategories:        (...args: unknown[]) => mockGetCategories(...args),
  getUser:              (...args: unknown[]) => mockGetUser(...args),
  getUserPreferences:   (...args: unknown[]) => mockGetUserPreferences(...args),
  getPoiPreferencesMap: (...args: unknown[]) => mockGetPoiPreferencesMap(...args),
  getTotalPoints:       (...args: unknown[]) => mockGetTotalPoints(...args),
  setStoreTuningPref:   jest.fn().mockResolvedValue(undefined),
  setTaskDone:          (...args: unknown[]) => mockSetTaskDone(...args),
  awardPoint:           jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/sharing', () => ({
  getIncomingSharedTasksCount: jest.fn().mockResolvedValue(0),
}));

jest.mock('../../src/services/wearSync', () => ({
  syncTasksToWatch: jest.fn(),
}));

jest.mock('../../src/utils/date', () => ({
  todayISO: () => '2026-06-15',
}));

jest.mock('../../src/store/appStore', () => ({
  useAppStore: {
    getState: () => ({ bootData: null, clearBootData: jest.fn() }),
  },
}));

jest.mock('../../src/services/achievements', () => ({
  evaluateAchievements:         jest.fn().mockResolvedValue({ nudgeCandidate: null }),
  checkAndFireAchievementNudge: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/challenges', () => ({
  getActiveChallengesForUser: jest.fn().mockResolvedValue([]),
  incrementCompletedCount:    jest.fn().mockResolvedValue(false),
}));

jest.mock('../../src/services/geolocation', () => ({
  requestLocationPermission: jest.fn().mockResolvedValue('granted'),
  LocationContext:           {},
}));

jest.mock('../../src/services/proximity', () => ({
  runProximitySearch:            (...args: unknown[]) => mockRunProximitySearch(...args),
  getLastSearchCoords:           jest.fn().mockReturnValue(null),
  updateProximityPoiPreferences: jest.fn(),
  setLocationTap:                jest.fn(),
  updateNotifNearbyEnabled:      jest.fn(),
  updateExitPromptPref:          jest.fn(),
}));

jest.mock('../../src/services/maps', () => ({
  getDistanceMeters: jest.fn().mockReturnValue(0),
}));

jest.mock('../../src/services/indoorProximity', () => ({
  startIndoorProximityMonitoring: jest.fn().mockReturnValue(jest.fn()),
  stopIndoorProximityMonitoring:  jest.fn(),
  updateIndoorTasks:              jest.fn(),
  updateIndoorExitPromptPref:     jest.fn(),
}));

jest.mock('../../src/services/indoorDetection', () => ({
  startIndoorDetection: jest.fn().mockReturnValue(jest.fn()),
  feedLocation:         jest.fn(),
  stopIndoorDetection:  jest.fn(),
}));

jest.mock('../../src/services/storeTuning', () => ({
  startStoreTuning:        jest.fn().mockReturnValue(jest.fn()),
  onLocationContextChange: jest.fn(),
  activateStoreTuning:     jest.fn(),
  dismissStoreTuning:      jest.fn(),
}));

jest.mock('../../src/services/battery', () => ({
  useBatteryLevel:       () => 1.0,
  getBatteryLevel:       jest.fn().mockResolvedValue(1.0),
  shouldPauseForBattery: () => false,
  LOW_BATTERY_THRESHOLD: 0.20,
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { act, renderHook } from '@testing-library/react-native';
import { useTodayScreen } from '../../src/hooks/useTodayScreen';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const UID = 'test-uid';

const TASK = {
  id:        'task-1',
  title:     'Buy milk',
  category:  'errands',
  done:      false,
  date:      '2026-06-15',
  createdAt: { toDate: () => new Date() } as any,
};

const POI_TASK = {
  ...TASK,
  id:  'poi-task-1',
  poi: 'pharmacy',
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function setupDefaults() {
  mockGetTasksForDate.mockResolvedValue([]);
  mockGetCategories.mockResolvedValue([]);
  mockGetUser.mockResolvedValue(null);
  mockGetUserPreferences.mockResolvedValue({});
  mockGetPoiPreferencesMap.mockResolvedValue({});
  mockGetTotalPoints.mockResolvedValue(0);
  mockSetTaskDone.mockResolvedValue(undefined);
  mockRunProximitySearch.mockResolvedValue(undefined);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  setupDefaults();
});

describe('useTodayScreen — one-shot fetch', () => {
  it('starts in loading state before the fetch resolves', () => {
    // Never resolves — stays in loading
    mockGetTasksForDate.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useTodayScreen(UID));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('transitions to loaded after the fetch resolves', async () => {
    mockGetTasksForDate.mockResolvedValue([TASK]);

    const { result } = renderHook(() => useTodayScreen(UID));
    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].id).toBe('task-1');
  });

  it('sets error when the fetch fails', async () => {
    mockGetTasksForDate.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTodayScreen(UID));
    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).not.toBeNull();
  });

  it('returns empty tasks and no error when uid is undefined', async () => {
    const { result } = renderHook(() => useTodayScreen(undefined));
    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.tasks).toHaveLength(0);
  });
});

describe('useTodayScreen — refresh', () => {
  it('re-runs the full fetch when refresh() is called (onTaskAdded path)', async () => {
    const { result } = renderHook(() => useTodayScreen(UID));
    await act(async () => {});

    const callsBefore = mockGetTasksForDate.mock.calls.length;

    await act(async () => { result.current.refresh(); });
    await act(async () => {});

    expect(mockGetTasksForDate.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('sets isRefreshing=true during a pull-to-refresh fetch', async () => {
    // First fetch resolves, second hangs so we can observe isRefreshing
    mockGetTasksForDate
      .mockResolvedValueOnce([])
      .mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTodayScreen(UID));
    await act(async () => {});
    expect(result.current.isLoading).toBe(false);

    act(() => { result.current.refresh(); });
    expect(result.current.isRefreshing).toBe(true);
  });
});

describe('useTodayScreen — proximity engine', () => {
  it('runs proximity search when an undone POI task is present and permission is granted', async () => {
    mockGetTasksForDate.mockResolvedValue([POI_TASK]);

    renderHook(() => useTodayScreen(UID));
    await act(async () => {});

    expect(mockRunProximitySearch).toHaveBeenCalledWith(
      UID,
      expect.arrayContaining([expect.objectContaining({ id: 'poi-task-1' })]),
      expect.any(Function),
    );
  });

  it('does NOT run proximity search when there are no POI tasks', async () => {
    renderHook(() => useTodayScreen(UID));
    await act(async () => {});

    expect(mockRunProximitySearch).not.toHaveBeenCalled();
  });
});

describe('useTodayScreen — progress derived values', () => {
  it('computes totalTasks, doneTasks, progress, and nearbyCount correctly', async () => {
    const done = { ...TASK, id: 'task-done', done: true };
    const poi  = { ...POI_TASK, id: 'poi-1' };

    mockGetTasksForDate.mockResolvedValue([TASK, done, poi]);

    const { result } = renderHook(() => useTodayScreen(UID));
    await act(async () => {});

    expect(result.current.totalTasks).toBe(3);
    expect(result.current.doneTasks).toBe(1);
    expect(result.current.progress).toBeCloseTo(1 / 3);
    expect(result.current.nearbyCount).toBe(1);
  });
});

describe('useTodayScreen — optimistic toggle', () => {
  it('calls setTaskDone with the correct arguments', async () => {
    mockGetTasksForDate.mockResolvedValue([TASK]);

    const { result } = renderHook(() => useTodayScreen(UID));
    await act(async () => {});

    await act(async () => {
      await result.current.handleToggle('task-1', true);
    });

    expect(mockSetTaskDone).toHaveBeenCalledWith(UID, 'task-1', true);
  });

  it('calls evaluateAchievements when marking done', async () => {
    const { evaluateAchievements } = jest.requireMock('../../src/services/achievements');
    mockGetTasksForDate.mockResolvedValue([TASK]);

    const { result } = renderHook(() => useTodayScreen(UID));
    await act(async () => {});

    await act(async () => {
      await result.current.handleToggle('task-1', true);
    });
    await act(async () => {});

    expect(evaluateAchievements).toHaveBeenCalledWith(
      UID,
      expect.objectContaining({ id: 'task-1' }),
      expect.any(Object),
    );
  });

  it('refreshes only the points total after completing a task, not the full data (KAN-157)', async () => {
    mockGetTasksForDate.mockResolvedValue([TASK]);
    mockGetTotalPoints.mockResolvedValue(7);

    const { result } = renderHook(() => useTodayScreen(UID));
    await act(async () => {});

    // Ignore the calls made during the initial one-shot load.
    mockGetTotalPoints.mockClear();
    mockGetTasksForDate.mockClear();

    await act(async () => {
      await result.current.handleToggle('task-1', true);
    });
    // Flush the deferred (InteractionManager) achievement + points work.
    await act(async () => {});

    // Completion refreshes ONLY the lightweight total-points read…
    expect(mockGetTotalPoints).toHaveBeenCalledWith(UID);
    // …and does NOT trigger a full task refetch.
    expect(mockGetTasksForDate).not.toHaveBeenCalled();
  });

  it('reverts the local task state when setTaskDone fails', async () => {
    mockSetTaskDone.mockRejectedValue(new Error('Network error'));
    mockGetTasksForDate.mockResolvedValue([TASK]);

    const { result } = renderHook(() => useTodayScreen(UID));
    await act(async () => {});

    await act(async () => {
      await result.current.handleToggle('task-1', true).catch(() => {});
    });

    expect(result.current.tasks[0].done).toBe(false);
  });
});
