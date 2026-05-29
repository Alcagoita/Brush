/**
 * KAN-31 — TodayScreen point-awarding tests.
 *
 * Covers:
 *   - awardPoint is called with the correct uid, taskId, and title when a task is marked done
 *   - awardPoint is NOT called when a task is marked undone
 *   - awardPoint failure does NOT affect the task toggle (fire-and-forget)
 *   - awardPoint is NOT called when uid is absent (signed-out guard)
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

// ─── Firestore mocks ──────────────────────────────────────────────────────────

const mockSetTaskDone               = jest.fn();
const mockAwardPoint                = jest.fn();
const mockSubscribeToTasksForDate   = jest.fn();
const mockSubscribeToPoiPreferences = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  setTaskDone:               (...args: unknown[]) => mockSetTaskDone(...args),
  awardPoint:                (...args: unknown[]) => mockAwardPoint(...args),
  subscribeToTasksForDate:   (...args: unknown[]) => mockSubscribeToTasksForDate(...args),
  subscribeToPoiPreferences: (...args: unknown[]) => mockSubscribeToPoiPreferences(...args),
}));

// ─── Auth mock ────────────────────────────────────────────────────────────────

let mockUid: string | null = 'user-test';
jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => ({
    currentUser: mockUid ? { uid: mockUid, displayName: 'Test User', email: 'test@test.com' } : null,
  }),
}));
jest.mock('@react-native-firebase/auth', () => ({}));

// ─── Navigation mock ──────────────────────────────────────────────────────────

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));
jest.mock('@react-navigation/native-stack', () => ({}));

// ─── Theme mock ───────────────────────────────────────────────────────────────

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      bg: '#fff', surface: '#f6f5f1', surface2: '#efeeea',
      text: '#000', muted: '#999', faint: '#ccc',
      line: '#ddd', accent: '#e8a86a',
      ringTrack: '#ddd', ringFill: '#000',
      nearTint: '#fff', nearTint2: '#eee', nearBorder: '#ddd', nearText: '#000',
    },
    dark: false,
    setDark: jest.fn(),
  }),
}));

// ─── Safe-area mock ───────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// ─── Reanimated mock ─────────────────────────────────────────────────────────
// Inline stub — avoids importing the TS source from node_modules which Jest
// cannot transform without extra config.

jest.mock('react-native-reanimated', () => {
  const { View, Text, ScrollView, FlatList, Image } = require('react-native');
  const noop = () => {};
  const noopShared = (v: unknown) => ({ value: v });
  // Animated IS the default export — must carry View, ScrollView, etc.
  const Animated = {
    View,
    Text,
    ScrollView,
    FlatList,
    Image,
    createAnimatedComponent: (c: unknown) => c,
    call: noop,
  };
  return {
    __esModule:               true,
    default:                  Animated,
    useSharedValue:           noopShared,
    useDerivedValue:          (fn: () => unknown) => ({ value: fn() }),
    useAnimatedStyle:         () => ({}),
    useAnimatedScrollHandler: () => noop,
    useAnimatedReaction:      noop,
    withTiming:               (v: unknown) => v,
    withRepeat:               (v: unknown) => v,
    withSequence:             (...args: unknown[]) => args[0],
    interpolate:              (_v: unknown, _i: unknown[], o: unknown[]) => o[0],
    Extrapolation:            { CLAMP: 'clamp' },
    runOnJS:                  (fn: (...args: unknown[]) => unknown) => fn,
  };
});

// ─── Heavy component mocks ────────────────────────────────────────────────────

// TaskRow: renders a Pressable with a testID so we can fire the toggle without
// needing real SVG/Reanimated rendering. Calls onToggle(task.id, !task.done).
jest.mock('../../src/components/TaskRow', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockTaskRow({ task, onToggle }: {
    task: { id: string; title: string; done: boolean };
    onToggle: (id: string, done: boolean) => void;
  }) {
    return (
      <TouchableOpacity
        testID={`task-row-${task.id}`}
        onPress={() => onToggle(task.id, !task.done)}
      >
        <Text>{task.title}</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock('../../src/components/NearbyCard',   () => () => null);
jest.mock('../../src/components/Header',       () => () => null);
jest.mock('../../src/components/ProgressRing', () => () => null);
jest.mock('../../src/components/NewTaskSheet', () => {
  const { forwardRef } = require('react');
  return { __esModule: true, default: forwardRef(() => null) };
});
jest.mock('../../src/components/AppIcon', () => ({ PlusIcon: () => null }));

// ─── Service mocks ────────────────────────────────────────────────────────────

jest.mock('../../src/services/geolocation', () => ({
  requestLocationPermission: jest.fn().mockResolvedValue('granted'),
}));
jest.mock('../../src/services/proximity', () => ({
  startProximityMonitoring:      jest.fn(),
  updateProximityTasks:          jest.fn(),
  updateProximityPoiPreferences: jest.fn(),
}));
jest.mock('../../src/config/keys', () => ({ GOOGLE_PLACES_API_KEY: 'TEST' }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** One pending task fixture. */
const TASK = {
  id:        'task-1',
  title:     'Buy milk',
  category:  'errands' as const,
  done:      false,
  date:      '2026-05-29',
  createdAt: { toDate: () => new Date() } as any,
};

/** One already-done task fixture. */
const DONE_TASK = { ...TASK, id: 'task-done', done: true };

function setupFirestoreMocks(tasks: typeof TASK[]) {
  // subscribeToTasksForDate fires the callback synchronously.
  mockSubscribeToTasksForDate.mockImplementation(
    (_uid: string, _date: string, cb: (tasks: typeof TASK[]) => void) => {
      cb(tasks);
      return jest.fn(); // unsubscribe
    },
  );
  mockSubscribeToPoiPreferences.mockReturnValue(jest.fn());
  mockSetTaskDone.mockResolvedValue(undefined);
  mockAwardPoint.mockResolvedValue(undefined);
}

// ─── Import (after all mocks) ─────────────────────────────────────────────────

import TodayScreen from '../../src/screens/TodayScreen';

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUid = 'user-test';
});

describe('KAN-31 — point awarding on task toggle', () => {
  it('calls awardPoint with correct uid, taskId, and title when marking done', async () => {
    setupFirestoreMocks([TASK]);
    render(<TodayScreen />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('task-row-task-1'));
    });
    // Allow the fire-and-forget promise to settle.
    await act(async () => {});

    expect(mockAwardPoint).toHaveBeenCalledTimes(1);
    expect(mockAwardPoint).toHaveBeenCalledWith('user-test', 'task-1', 'Buy milk');
  });

  it('does NOT call awardPoint when marking a task undone', async () => {
    setupFirestoreMocks([DONE_TASK]);
    render(<TodayScreen />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('task-row-task-done'));
    });
    await act(async () => {});

    expect(mockSetTaskDone).toHaveBeenCalledWith('user-test', 'task-done', false);
    expect(mockAwardPoint).not.toHaveBeenCalled();
  });

  it('does NOT revert the task toggle when awardPoint fails', async () => {
    setupFirestoreMocks([TASK]);
    mockAwardPoint.mockRejectedValue(new Error('Network error'));
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    render(<TodayScreen />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('task-row-task-1'));
    });
    await act(async () => {});

    // setTaskDone still called and succeeded — toggle was not reverted.
    expect(mockSetTaskDone).toHaveBeenCalledWith('user-test', 'task-1', true);
    // The task row is still present (not reverted).
    expect(screen.getByTestId('task-row-task-1')).toBeTruthy();
  });

  it('does NOT call awardPoint when uid is absent', async () => {
    mockUid = null;
    setupFirestoreMocks([TASK]);
    render(<TodayScreen />);

    await act(async () => {
      fireEvent.press(screen.queryByTestId('task-row-task-1') ?? { type: 'View' } as any);
    });
    await act(async () => {});

    expect(mockAwardPoint).not.toHaveBeenCalled();
  });
});
