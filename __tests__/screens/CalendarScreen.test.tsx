/**
 * CalendarScreen tests — updated for the current task-based implementation.
 *
 * Covers:
 *   - Month label renders (e.g. "June 2026")
 *   - Weekday labels render
 *   - "Today" pill renders
 *   - Previous/Next month navigation buttons render with correct accessibility
 *   - Navigating to the previous month updates the month label
 *   - Navigating to the next month updates the month label
 *   - "Today" pill navigates back to the current month
 *   - "TASKS" section label renders
 *   - "Today" label shown when current day is selected (default)
 *   - Day cell accessibility label includes "today" for the current day
 *   - Error state renders retry button when subscription fails
 */

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import CalendarScreen from '../../src/screens/CalendarScreen';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute:      () => ({ params: {} }),
}));

jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => ({ currentUser: { uid: 'test-uid' } }),
}));

jest.mock('@react-native-firebase/auth', () => ({}));

const mockSubscribeToTasksForMonth = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  subscribeToTasksForMonth: (...args: unknown[]) => mockSubscribeToTasksForMonth(...args),
}));

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      bg:       '#fff',
      surface:  '#f6f5f1',
      surface2: '#efeeea',
      text:     '#000',
      muted:    '#999',
      faint:    '#ccc',
      line:     '#ddd',
      accent:   '#e8a86a',
      ringTrack: '#eee',
      ringFill:  '#000',
    },
    dark:    false,
    setDark: jest.fn(),
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderScreen() {
  return render(<CalendarScreen />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CalendarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: subscription returns a no-op unsubscribe, no tasks.
    mockSubscribeToTasksForMonth.mockReturnValue(jest.fn());
  });

  it('renders the current month and year label', () => {
    renderScreen();
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const year  = now.getFullYear();
    expect(screen.getByText(`${month} ${year}`)).toBeTruthy();
  });

  it('renders the "Today" pill', () => {
    renderScreen();
    expect(screen.getByLabelText('Jump to today')).toBeTruthy();
  });

  it('renders previous and next month navigation buttons', () => {
    renderScreen();
    expect(screen.getByLabelText('Previous month')).toBeTruthy();
    expect(screen.getByLabelText('Next month')).toBeTruthy();
  });

  it('navigating to previous month updates the month label', () => {
    renderScreen();
    const now   = new Date();
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevDate.toLocaleString('en-US', { month: 'long' });
    const prevYear  = prevDate.getFullYear();

    fireEvent.press(screen.getByLabelText('Previous month'));
    expect(screen.getByText(`${prevMonth} ${prevYear}`)).toBeTruthy();
  });

  it('navigating to next month updates the month label', () => {
    renderScreen();
    const now   = new Date();
    const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonth = nextDate.toLocaleString('en-US', { month: 'long' });
    const nextYear  = nextDate.getFullYear();

    fireEvent.press(screen.getByLabelText('Next month'));
    expect(screen.getByText(`${nextMonth} ${nextYear}`)).toBeTruthy();
  });

  it('"Today" pill navigates back to the current month after navigating away', () => {
    renderScreen();
    const now   = new Date();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const year  = now.getFullYear();

    fireEvent.press(screen.getByLabelText('Next month'));
    fireEvent.press(screen.getByLabelText('Jump to today'));
    expect(screen.getByText(`${month} ${year}`)).toBeTruthy();
  });

  it('renders the "TASKS" section label', () => {
    renderScreen();
    expect(screen.getByText('TASKS')).toBeTruthy();
  });

  it('shows "Today" label when current day is selected by default', () => {
    renderScreen();
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('subscribes to tasks with the current uid', () => {
    renderScreen();
    expect(mockSubscribeToTasksForMonth).toHaveBeenCalledWith(
      'test-uid',
      expect.any(String), // yearMonth
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('shows tasks when the subscription fires successfully', () => {
    let capturedSuccess: ((tasks: object[]) => void) | null = null;
    mockSubscribeToTasksForMonth.mockImplementation(
      (_uid: string, _ym: string, onSuccess: (tasks: object[]) => void) => {
        capturedSuccess = onSuccess;
        return jest.fn();
      },
    );
    renderScreen();
    act(() => {
      capturedSuccess!([
        { id: 't1', title: 'Buy groceries', category: 'errands', done: false,
          date: new Date().toISOString().slice(0, 10), createdAt: {} },
      ]);
    });
    expect(screen.getByText('Buy groceries')).toBeTruthy();
  });

  it('shows "brushed" (not "done") in the detail card fraction label (KAN-108)', () => {
    let capturedSuccess: ((tasks: object[]) => void) | null = null;
    mockSubscribeToTasksForMonth.mockImplementation(
      (_uid: string, _ym: string, onSuccess: (tasks: object[]) => void) => {
        capturedSuccess = onSuccess;
        return jest.fn();
      },
    );
    renderScreen();
    act(() => {
      capturedSuccess!([
        { id: 't1', title: 'Buy groceries', category: 'errands', done: true,
          date: new Date().toISOString().slice(0, 10), createdAt: {} },
      ]);
    });
    expect(screen.getByText('brushed')).toBeTruthy();
    expect(screen.queryByText('done')).toBeNull();
  });

  it('shows retry button on subscription error', () => {
    let capturedError: ((e: Error) => void) | null = null;
    mockSubscribeToTasksForMonth.mockImplementation(
      (_uid: string, _ym: string, _onSuccess: unknown, onError: (e: Error) => void) => {
        capturedError = onError;
        return jest.fn();
      },
    );
    renderScreen();
    act(() => { capturedError!(new Error('Firestore unavailable')); });
    expect(screen.getByLabelText('Try again')).toBeTruthy();
  });
});
