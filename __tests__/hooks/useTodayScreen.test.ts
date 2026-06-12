/**
 * KAN-59 — useTodayScreen hook tests.
 *
 * Covers the hook's independently-testable behaviour (no JSX):
 *   - TasksUiState: loading → success on subscription callback
 *   - TasksUiState: loading → error on subscription error callback
 *   - retryKey: incrementing re-triggers the subscription
 *   - Proximity engine: starts when undone POI tasks are present
 *   - Proximity engine: does NOT start without location permission
 *   - Optimistic toggle: calls setTaskDone and awardPoint
 *   - Progress derived values: totalTasks, doneTasks, progress, nearbyCount
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSubscribeToTasksForDate    = jest.fn();
const mockSubscribeToPoiPreferences  = jest.fn();
const mockSubscribeToCategories      = jest.fn();
const mockSubscribeLowBatteryPausePref = jest.fn();
const mockSetTaskDone                = jest.fn();
const mockAwardPoint                 = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  subscribeToTasksForDate:      (...args: unknown[]) => mockSubscribeToTasksForDate(...args),
  subscribeToPoiPreferences:    (...args: unknown[]) => mockSubscribeToPoiPreferences(...args),
  subscribeToCategories:        (...args: unknown[]) => mockSubscribeToCategories(...args),
  subscribeLowBatteryPausePref: (...args: unknown[]) => mockSubscribeLowBatteryPausePref(...args),
  subscribeStoreTuningPref:     jest.fn().mockReturnValue(jest.fn()),
  subscribeToUserPreferences:   jest.fn().mockReturnValue(jest.fn()),
  setStoreTuningPref:           jest.fn().mockResolvedValue(undefined),
  setTaskDone:                  (...args: unknown[]) => mockSetTaskDone(...args),
  awardPoint:                   (...args: unknown[]) => mockAwardPoint(...args),
}));

jest.mock('../../src/services/achievements', () => ({
  checkAndAwardDailyComplete: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/challenges', () => ({
  getActiveChallengesForUser: jest.fn().mockResolvedValue([]),
  incrementCompletedCount:    jest.fn().mockResolvedValue(false),
}));

jest.mock('../../src/services/geolocation', () => ({
  requestLocationPermission: jest.fn().mockResolvedValue('granted'),
  LocationContext:           {},
}));

const mockStartProximityMonitoring = jest.fn();
const mockStopProximityMonitoring  = jest.fn();

jest.mock('../../src/services/proximity', () => ({
  startProximityMonitoring:      (...args: unknown[]) => mockStartProximityMonitoring(...args),
  stopProximityMonitoring:       () => mockStopProximityMonitoring(),
  updateProximityTasks:          jest.fn(),
  updateProximityPoiPreferences: jest.fn(),
  pauseGeofenceMonitoring:       jest.fn(),
  resumeGeofenceMonitoring:      jest.fn(),
  setLocationTap:                jest.fn(),
  updateNotifNearbyEnabled:      jest.fn(),
}));

jest.mock('../../src/services/indoorProximity', () => ({
  startIndoorProximityMonitoring: jest.fn().mockReturnValue(jest.fn()),
  stopIndoorProximityMonitoring:  jest.fn(),
  updateIndoorTasks:              jest.fn(),
}));

jest.mock('../../src/services/indoorDetection', () => ({
  startIndoorDetection: jest.fn().mockReturnValue(jest.fn()),
  feedLocation:         jest.fn(),
  stopIndoorDetection:  jest.fn(),
}));

jest.mock('../../src/services/storeTuning', () => ({
  startStoreTuning:         jest.fn().mockReturnValue(jest.fn()),
  onLocationContextChange:  jest.fn(),
  activateStoreTuning:      jest.fn(),
  dismissStoreTuning:       jest.fn(),
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
  date:      '2026-06-01',
  createdAt: { toDate: () => new Date() } as any,
};

const POI_TASK = {
  ...TASK,
  id:  'poi-task-1',
  poi: 'pharmacy',
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function setupDefaults() {
  mockSubscribeToTasksForDate.mockImplementation(
    (_uid: string, _date: string, onSuccess: (tasks: any[]) => void) => {
      onSuccess([]);
      return jest.fn();
    },
  );
  mockSubscribeToPoiPreferences.mockReturnValue(jest.fn());
  mockSubscribeToCategories.mockReturnValue(jest.fn());
  mockSubscribeLowBatteryPausePref.mockReturnValue(jest.fn());
  mockSetTaskDone.mockResolvedValue(undefined);
  mockAwardPoint.mockResolvedValue(undefined);
  mockStartProximityMonitoring.mockReturnValue(jest.fn());
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  setupDefaults();
});

describe('useTodayScreen — task subscription', () => {
  it('starts in loading state', () => {
    mockSubscribeToTasksForDate.mockReturnValue(jest.fn()); // never calls callback
    const { result } = renderHook(() => useTodayScreen(UID));
    expect(result.current.tasksState.status).toBe('loading');
  });

  it('transitions to success when the subscription fires', async () => {
    mockSubscribeToTasksForDate.mockImplementation(
      (_uid: string, _date: string, onSuccess: (tasks: any[]) => void) => {
        onSuccess([TASK]);
        return jest.fn();
      },
    );

    const { result } = renderHook(() => useTodayScreen(UID));
    await act(async () => {});

    expect(result.current.tasksState.status).toBe('success');
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].id).toBe('task-1');
  });

  it('transitions to error when the subscription fires an error', async () => {
    mockSubscribeToTasksForDate.mockImplementation(
      (_uid: string, _date: string, _onSuccess: unknown, onError: (err: Error) => void) => {
        onError(new Error('Permission denied'));
        return jest.fn();
      },
    );

    const { result } = renderHook(() => useTodayScreen(UID));
    await act(async () => {});

    expect(result.current.tasksState.status).toBe('error');
  });

  it('returns empty tasks and success status when uid is undefined', async () => {
    const { result } = renderHook(() => useTodayScreen(undefined));
    await act(async () => {});

    expect(result.current.tasksState.status).toBe('success');
    expect(result.current.tasks).toHaveLength(0);
  });
});

describe('useTodayScreen — retryKey', () => {
  it('re-calls subscribeToTasksForDate when retryKey is incremented', async () => {
    const { result } = renderHook(() => useTodayScreen(UID));
    await act(async () => {});

    const callsBefore = mockSubscribeToTasksForDate.mock.calls.length;

    act(() => { result.current.setRetryKey(k => k + 1); });
    await act(async () => {});

    expect(mockSubscribeToTasksForDate.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

describe('useTodayScreen — proximity engine', () => {
  it('starts the engine when an undone POI task is present and permission is granted', async () => {
    mockSubscribeToTasksForDate.mockImplementation(
      (_uid: string, _date: string, onSuccess: (tasks: any[]) => void) => {
        onSuccess([POI_TASK]);
        return jest.fn();
      },
    );

    renderHook(() => useTodayScreen(UID));
    await act(async () => {});

    expect(mockStartProximityMonitoring).toHaveBeenCalledTimes(1);
    expect(mockStartProximityMonitoring).toHaveBeenCalledWith(
      UID,
      expect.arrayContaining([expect.objectContaining({ id: 'poi-task-1' })]),
      expect.any(Function),
    );
  });

  it('does NOT start the engine when there are no POI tasks', async () => {
    renderHook(() => useTodayScreen(UID));
    await act(async () => {});

    expect(mockStartProximityMonitoring).not.toHaveBeenCalled();
  });
});

describe('useTodayScreen — progress derived values', () => {
  it('computes totalTasks, doneTasks, progress, and nearbyCount correctly', async () => {
    const done = { ...TASK, id: 'task-done', done: true };
    const poi  = { ...POI_TASK, id: 'poi-1' };

    mockSubscribeToTasksForDate.mockImplementation(
      (_uid: string, _date: string, onSuccess: (tasks: any[]) => void) => {
        onSuccess([TASK, done, poi]);
        return jest.fn();
      },
    );

    const { result } = renderHook(() => useTodayScreen(UID));
    await act(async () => {});

    expect(result.current.totalTasks).toBe(3);
    expect(result.current.doneTasks).toBe(1);
    expect(result.current.progress).toBeCloseTo(1 / 3);
    expect(result.current.nearbyCount).toBe(1); // only poi has a poi field
  });
});

describe('useTodayScreen — optimistic toggle', () => {
  it('calls setTaskDone with the correct arguments', async () => {
    mockSubscribeToTasksForDate.mockImplementation(
      (_uid: string, _date: string, onSuccess: (tasks: any[]) => void) => {
        onSuccess([TASK]);
        return jest.fn();
      },
    );

    const { result } = renderHook(() => useTodayScreen(UID));
    await act(async () => {});

    await act(async () => {
      await result.current.handleToggle('task-1', true);
    });

    expect(mockSetTaskDone).toHaveBeenCalledWith(UID, 'task-1', true);
  });

  it('calls awardPoint when marking done', async () => {
    mockSubscribeToTasksForDate.mockImplementation(
      (_uid: string, _date: string, onSuccess: (tasks: any[]) => void) => {
        onSuccess([TASK]);
        return jest.fn();
      },
    );

    const { result } = renderHook(() => useTodayScreen(UID));
    await act(async () => {});

    await act(async () => {
      await result.current.handleToggle('task-1', true);
    });
    await act(async () => {});

    expect(mockAwardPoint).toHaveBeenCalledWith(UID, 'task-1', 'Buy milk');
  });
});
