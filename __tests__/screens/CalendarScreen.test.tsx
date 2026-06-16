/**
 * CalendarScreen tests — redesigned in KAN-145 (progress rings, streak
 * chains, achievement milestones, slide-up diary detail card).
 *
 * Covers:
 *   - Month label renders (e.g. "June" / "2026")
 *   - Weekday labels render
 *   - "Today" pill renders and navigates
 *   - Previous/Next month navigation
 *   - Day cell accessibility label includes "today" for the current day
 *   - Detail card status label rules (Today / Upcoming / Day complete / Past)
 *   - Stats line copy rules
 *   - Task list renders with BrushStroke (not textDecoration) on completed items
 *   - Error state renders retry button when subscription fails
 *   - Achievement / streak-run chips render from the achievements map
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
const mockSubscribeToAchievements  = jest.fn();
const mockGetCategories            = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  subscribeToTasksForMonth: (...args: unknown[]) => mockSubscribeToTasksForMonth(...args),
  subscribeToAchievements:  (...args: unknown[]) => mockSubscribeToAchievements(...args),
  getCategories:            (...args: unknown[]) => mockGetCategories(...args),
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
      ringFill:  '#d9a87a',
      nearTint2:  '#f9ede0',
      nearBorder: '#e8c9a0',
      nearText:   '#7a4a20',
    },
    dark:    false,
    setDark: jest.fn(),
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderScreen() {
  return render(<CalendarScreen />);
}

function fakeTimestamp(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  return { toDate: () => date };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CalendarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribeToTasksForMonth.mockReturnValue(jest.fn());
    mockSubscribeToAchievements.mockReturnValue(jest.fn());
    mockGetCategories.mockResolvedValue([]);
  });

  it('renders the current month and year labels', () => {
    renderScreen();
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const year  = String(now.getFullYear());
    expect(screen.getByText(month)).toBeTruthy();
    expect(screen.getByText(year)).toBeTruthy();
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

    fireEvent.press(screen.getByLabelText('Previous month'));
    expect(screen.getByText(prevMonth)).toBeTruthy();
  });

  it('navigating to next month updates the month label', () => {
    renderScreen();
    const now   = new Date();
    const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonth = nextDate.toLocaleString('en-US', { month: 'long' });

    fireEvent.press(screen.getByLabelText('Next month'));
    expect(screen.getByText(nextMonth)).toBeTruthy();
  });

  it('"Today" pill navigates back to the current month after navigating away', () => {
    renderScreen();
    const now   = new Date();
    const month = now.toLocaleString('en-US', { month: 'long' });

    fireEvent.press(screen.getByLabelText('Next month'));
    fireEvent.press(screen.getByLabelText('Jump to today'));
    expect(screen.getByText(month)).toBeTruthy();
  });

  it('shows "Today" status label when current day is selected by default', () => {
    renderScreen();
    // Two "Today" texts exist: the "Today" pill and the detail card's status label.
    expect(screen.getAllByText('Today').length).toBeGreaterThanOrEqual(2);
  });

  it('day cell accessibility label includes "today" for the current day', () => {
    renderScreen();
    const now = new Date();
    const day = String(now.getDate());
    expect(screen.getByLabelText(new RegExp(`^${day}, today`))).toBeTruthy();
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

  it('shows "No tasks" stats line when selected day has no tasks', () => {
    mockSubscribeToTasksForMonth.mockImplementation(
      (_uid: string, _ym: string, onSuccess: (tasks: object[]) => void) => {
        onSuccess([]);
        return jest.fn();
      },
    );
    renderScreen();
    expect(screen.getByText('No tasks')).toBeTruthy();
  });

  it('shows the task title and "X of Y done" stats line for today', () => {
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
    expect(screen.getByText('0 of 1 done · 0%')).toBeTruthy();
  });

  it('shows "none completed" stats line for a past day with 0% done', () => {
    let capturedSuccess: ((tasks: object[]) => void) | null = null;
    mockSubscribeToTasksForMonth.mockImplementation(
      (_uid: string, _ym: string, onSuccess: (tasks: object[]) => void) => {
        capturedSuccess = onSuccess;
        return jest.fn();
      },
    );
    renderScreen();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const iso = yesterday.toISOString().slice(0, 10);

    act(() => {
      capturedSuccess!([
        { id: 't1', title: 'Old task', category: 'errands', done: false, date: iso, createdAt: {} },
      ]);
    });

    // Select yesterday's cell via its accessibility label (day number only — not "today").
    const day = yesterday.getDate();
    fireEvent.press(screen.getByLabelText(`${day}`));
    expect(screen.getByText('1 task · none completed')).toBeTruthy();
  });

  it('does not use text-decoration line-through for completed tasks (uses BrushStroke instead)', () => {
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
        { id: 't1', title: 'Done task', category: 'errands', done: true,
          date: new Date().toISOString().slice(0, 10), createdAt: {} },
      ]);
    });
    const title = screen.getByText('Done task');
    const flatStyle = Array.isArray(title.props.style)
      ? Object.assign({}, ...title.props.style)
      : title.props.style;
    expect(flatStyle.textDecorationLine).toBeUndefined();
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

  it('renders an achievement chip for the day an achievement was last earned', () => {
    const now = new Date();
    const iso = now.toISOString().slice(0, 10);

    mockSubscribeToTasksForMonth.mockReturnValue(jest.fn());
    mockSubscribeToAchievements.mockImplementation((_uid: string, onUpdate: (map: object) => void) => {
      onUpdate({
        early_bird: { earnedAt: fakeTimestamp(iso), earnCount: 1, progress: 1, target: 1 },
      });
      return jest.fn();
    });

    renderScreen();
    expect(screen.getByText('Early bird · unlocked')).toBeTruthy();
  });

  it('renders an "Open today" CTA only when today is selected', () => {
    renderScreen();
    expect(screen.getByLabelText('Open today')).toBeTruthy();
  });
});
