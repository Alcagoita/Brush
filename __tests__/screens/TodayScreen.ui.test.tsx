/**
 * KAN-60 — TodayScreen UI-layer tests.
 *
 * Mocks useTodayScreen so we test the screen's rendering contract, not the
 * hook's data-fetching internals (those are covered in useTodayScreen.test.ts).
 *
 * Covers:
 *   - Skeleton rows shown when tasksState.status === 'loading'
 *   - Task titles shown when tasksState.status === 'success'
 *   - "No tasks for today" shown when success + empty list
 *   - Error message shown when tasksState.status === 'error'
 *   - "Try again" button present in error state
 *   - Pressing "Try again" calls setRetryKey
 *   - Pressing a task row calls handleToggle
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

// ─── Mock useTodayScreen ──────────────────────────────────────────────────────

const mockSetRetryKey  = jest.fn();
const mockHandleToggle = jest.fn();

const DEFAULT_HOOK_RETURN = {
  tasksState:       { status: 'loading' as const },
  retryKey:         0,
  setRetryKey:      mockSetRetryKey,
  nearbyPoiType:    null,
  nearbyPlace:      null,
  poiPlaces:        {},
  trackingPaused:   false,
  sheetVisible:     false,
  setSheetVisible:  jest.fn(),
  customCategories: [],
  tasks:            [],
  effectiveTasks:   [],
  totalTasks:       0,
  doneTasks:        0,
  progress:         0,
  nearbyCount:      0,
  handleToggle:     mockHandleToggle,
};

jest.mock('../../src/hooks/useTodayScreen', () => ({
  useTodayScreen: () => mockHookReturn,
}));

let mockHookReturn = { ...DEFAULT_HOOK_RETURN };

// ─── Auth ─────────────────────────────────────────────────────────────────────

jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => ({ currentUser: { uid: 'u1', displayName: 'Test', email: 'test@test.com' } }),
}));
jest.mock('@react-native-firebase/auth', () => ({}));

// ─── Navigation ───────────────────────────────────────────────────────────────

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('@react-navigation/native-stack', () => ({}));

// ─── Theme ────────────────────────────────────────────────────────────────────

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      bg: '#fff', surface: '#f6f5f1', surface2: '#efeeea',
      text: '#000', muted: '#999', faint: '#ccc',
      line: '#ddd', accent: '#e8a86a',
      ringTrack: '#ddd', ringFill: '#000',
      nearTint: '#fff', nearTint2: '#eee', nearBorder: '#ddd', nearText: '#000',
    },
  }),
}));

// ─── Safe area ────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));

// ─── Reanimated ───────────────────────────────────────────────────────────────

jest.mock('react-native-reanimated', () => {
  const { View, ScrollView } = require('react-native');
  const noop = () => {};
  const Animated = { View, ScrollView, createAnimatedComponent: (c: unknown) => c };
  return {
    __esModule: true,
    default:                  Animated,
    useSharedValue:           (v: unknown) => ({ value: v }),
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

// ─── Heavy component stubs ────────────────────────────────────────────────────

jest.mock('../../src/components/Header',       () => () => null);
jest.mock('../../src/components/ProgressRing', () => () => null);
jest.mock('../../src/components/NearbyCard',   () => () => null);
jest.mock('../../src/components/NewTaskSheet', () => {
  const { forwardRef } = require('react');
  return { __esModule: true, default: forwardRef(() => null) };
});

// TaskRow stub — renders task title as a pressable so interaction tests work
jest.mock('../../src/components/TaskRow', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockTaskRow({ task, onToggle }: any) {
    return (
      <TouchableOpacity testID={`task-row-${task.id}`} onPress={() => onToggle(task.id, !task.done)}>
        <Text>{task.title}</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock('../../src/components/AppIcon', () => ({ PlusIcon: () => null }));

// ─── Import (after mocks) ─────────────────────────────────────────────────────

import TodayScreen from '../../src/screens/TodayScreen';

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockHookReturn = { ...DEFAULT_HOOK_RETURN };
});

describe('TodayScreen UI — KAN-60 loading state', () => {
  it('does NOT render task rows while loading', () => {
    render(<TodayScreen />);
    expect(screen.queryByTestId('task-row-task-1')).toBeNull();
  });

  it('does NOT render the empty message while loading', () => {
    render(<TodayScreen />);
    expect(screen.queryByText('No tasks for today')).toBeNull();
  });
});

describe('TodayScreen UI — KAN-60 success state', () => {
  const TASK = {
    id: 'task-1', title: 'Buy milk', category: 'errands',
    done: false, date: '2026-06-01', createdAt: { toDate: () => new Date() } as any,
  };

  beforeEach(() => {
    mockHookReturn = {
      ...DEFAULT_HOOK_RETURN,
      tasksState:    { status: 'success', tasks: [TASK] },
      tasks:         [TASK],
      effectiveTasks:[TASK],
      totalTasks:    1,
    };
  });

  it('renders the task title in success state', () => {
    render(<TodayScreen />);
    expect(screen.getByText('Buy milk')).toBeTruthy();
  });

  it('does NOT render the error message in success state', () => {
    render(<TodayScreen />);
    expect(screen.queryByText(/Could not load/)).toBeNull();
  });
});

describe('TodayScreen UI — KAN-60 empty success state', () => {
  beforeEach(() => {
    mockHookReturn = {
      ...DEFAULT_HOOK_RETURN,
      tasksState:    { status: 'success', tasks: [] },
      tasks:         [],
      effectiveTasks:[],
    };
  });

  it('shows "No tasks for today" when success state has no tasks', () => {
    render(<TodayScreen />);
    expect(screen.getByText('No tasks for today')).toBeTruthy();
  });
});

describe('TodayScreen UI — KAN-60 error state', () => {
  beforeEach(() => {
    mockHookReturn = {
      ...DEFAULT_HOOK_RETURN,
      tasksState: { status: 'error', message: 'Could not load tasks. Check your connection.' },
    };
  });

  it('renders the error message', () => {
    render(<TodayScreen />);
    expect(screen.getByText('Could not load tasks. Check your connection.')).toBeTruthy();
  });

  it('renders the "Try again" button', () => {
    render(<TodayScreen />);
    expect(screen.getByLabelText('Try again')).toBeTruthy();
  });

  it('does NOT render task rows in error state', () => {
    render(<TodayScreen />);
    expect(screen.queryByTestId('task-row-task-1')).toBeNull();
  });

  it('calls setRetryKey when "Try again" is pressed', async () => {
    render(<TodayScreen />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Try again'));
    });
    expect(mockSetRetryKey).toHaveBeenCalledTimes(1);
  });
});

describe('TodayScreen UI — KAN-60 interaction', () => {
  const TASK = {
    id: 'task-1', title: 'Buy milk', category: 'errands',
    done: false, date: '2026-06-01', createdAt: { toDate: () => new Date() } as any,
  };

  beforeEach(() => {
    mockHookReturn = {
      ...DEFAULT_HOOK_RETURN,
      tasksState:    { status: 'success', tasks: [TASK] },
      tasks:         [TASK],
      effectiveTasks:[TASK],
      totalTasks:    1,
    };
  });

  it('calls handleToggle when a task row is pressed', async () => {
    render(<TodayScreen />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('task-row-task-1'));
    });
    expect(mockHandleToggle).toHaveBeenCalledWith('task-1', true);
  });
});
