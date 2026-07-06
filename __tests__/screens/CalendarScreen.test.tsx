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
import { View } from 'react-native';
import CalendarScreen from '../../src/screens/CalendarScreen';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const mockNavigate = jest.fn();
const mockGoBack   = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualReact = require('react');
  return {
    useNavigation: () => ({ navigate: (...args: unknown[]) => mockNavigate(...args), goBack: (...args: unknown[]) => mockGoBack(...args) }),
    useRoute:      () => ({ params: {} }),
    // Mirrors focus-on-mount for tests — no blur/refocus cycle exercised here.
    useFocusEffect: (cb: () => void | (() => void)) => actualReact.useEffect(cb, []),
  };
});

jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => ({ currentUser: { uid: 'test-uid' } }),
}));

jest.mock('@react-native-firebase/auth', () => ({}));

const mockGetTasksForMonth = jest.fn();
const mockGetAchievements  = jest.fn();
const mockGetCategories    = jest.fn();
const mockSetTaskDone      = jest.fn();
const mockGetTrips         = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  getTasksForMonth: (...args: unknown[]) => mockGetTasksForMonth(...args),
  getAchievements:  (...args: unknown[]) => mockGetAchievements(...args),
  getCategories:    (...args: unknown[]) => mockGetCategories(...args),
  setTaskDone:      (...args: unknown[]) => mockSetTaskDone(...args),
  getTrips:         (...args: unknown[]) => mockGetTrips(...args),
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

async function renderScreen() {
  const utils = render(<CalendarScreen />);
  await act(async () => {});
  return utils;
}

function fakeTimestamp(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  return { toDate: () => date };
}

// Fixed clock — avoids flakiness around month/day boundaries. All `new
// Date()` calls in both the component and the tests below resolve to this
// instant while fake timers are active, so "today" is deterministic.
const FIXED_NOW = new Date('2026-06-16T12:00:00');

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CalendarScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
    jest.clearAllMocks();
    mockGetTasksForMonth.mockResolvedValue([]);
    mockGetAchievements.mockResolvedValue({});
    mockGetCategories.mockResolvedValue([]);
    mockSetTaskDone.mockResolvedValue(undefined);
    mockGetTrips.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the current month and year labels', async () => {
    await renderScreen();
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const year  = String(now.getFullYear());
    expect(screen.getByText(month)).toBeTruthy();
    expect(screen.getByText(year)).toBeTruthy();
  });

  it('renders the "Today" pill', async () => {
    await renderScreen();
    expect(screen.getByLabelText('Jump to today')).toBeTruthy();
  });

  it('renders previous and next month navigation buttons', async () => {
    await renderScreen();
    expect(screen.getByLabelText('Previous month')).toBeTruthy();
    expect(screen.getByLabelText('Next month')).toBeTruthy();
  });

  it('navigating to previous month updates the month label', async () => {
    await renderScreen();
    const now   = new Date();
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevDate.toLocaleString('en-US', { month: 'long' });

    await act(async () => { fireEvent.press(screen.getByLabelText('Previous month')); });
    expect(screen.getByText(prevMonth)).toBeTruthy();
  });

  it('navigating to next month updates the month label', async () => {
    await renderScreen();
    const now   = new Date();
    const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonth = nextDate.toLocaleString('en-US', { month: 'long' });

    await act(async () => { fireEvent.press(screen.getByLabelText('Next month')); });
    expect(screen.getByText(nextMonth)).toBeTruthy();
  });

  it('"Today" pill navigates back to the current month after navigating away', async () => {
    await renderScreen();
    const now   = new Date();
    const month = now.toLocaleString('en-US', { month: 'long' });

    await act(async () => { fireEvent.press(screen.getByLabelText('Next month')); });
    await act(async () => { fireEvent.press(screen.getByLabelText('Jump to today')); });
    expect(screen.getByText(month)).toBeTruthy();
  });

  it('shows "Today" status label when current day is selected by default', async () => {
    await renderScreen();
    // Two "Today" texts exist: the "Today" pill and the detail card's status label.
    expect(screen.getAllByText('Today').length).toBeGreaterThanOrEqual(2);
  });

  it('day cell accessibility label includes "today" for the current day', async () => {
    await renderScreen();
    const now = new Date();
    const day = String(now.getDate());
    expect(screen.getByLabelText(new RegExp(`^${day}, today`))).toBeTruthy();
  });

  it('fetches tasks for the current uid (KAN-218 — one-shot, not a live subscription)', async () => {
    await renderScreen();
    expect(mockGetTasksForMonth).toHaveBeenCalledWith('test-uid', expect.any(String));
  });

  it('shows "No tasks" stats line when selected day has no tasks', async () => {
    mockGetTasksForMonth.mockResolvedValue([]);
    await renderScreen();
    expect(screen.getByText('No tasks')).toBeTruthy();
  });

  it('shows the task title and "X of Y done" stats line for today', async () => {
    mockGetTasksForMonth.mockResolvedValue([
      { id: 't1', title: 'Buy groceries', category: 'errands', done: false,
        date: new Date().toISOString().slice(0, 10), createdAt: {} },
    ]);
    await renderScreen();
    expect(screen.getByText('Buy groceries')).toBeTruthy();
    expect(screen.getByText('0 of 1 done · 0%')).toBeTruthy();
  });

  it('shows "none completed" stats line for a past day with 0% done', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const iso = yesterday.toISOString().slice(0, 10);

    mockGetTasksForMonth.mockResolvedValue([
      { id: 't1', title: 'Old task', category: 'errands', done: false, date: iso, createdAt: {} },
    ]);
    await renderScreen();

    // Select yesterday's cell via its accessibility label (day number only — not "today").
    const day = yesterday.getDate();
    fireEvent.press(screen.getByLabelText(`${day}`));
    expect(screen.getByText('1 task · none completed')).toBeTruthy();
  });

  it('does not use text-decoration line-through for completed tasks (uses BrushStroke instead)', async () => {
    mockGetTasksForMonth.mockResolvedValue([
      { id: 't1', title: 'Done task', category: 'errands', done: true,
        date: new Date().toISOString().slice(0, 10), createdAt: {} },
    ]);
    await renderScreen();
    const title = screen.getByText('Done task');
    const flatStyle = Array.isArray(title.props.style)
      ? Object.assign({}, ...title.props.style)
      : title.props.style;
    expect(flatStyle.textDecorationLine).toBeUndefined();
  });

  it('shows retry button when the tasks fetch rejects', async () => {
    mockGetTasksForMonth.mockRejectedValue(new Error('Firestore unavailable'));
    await renderScreen();
    expect(screen.getByLabelText('Try again')).toBeTruthy();
  });

  it('renders an achievement chip for the day an achievement was last earned', async () => {
    const now = new Date();
    const iso = now.toISOString().slice(0, 10);

    mockGetAchievements.mockResolvedValue({
      first_brush: { earnedAt: fakeTimestamp(iso), earnCount: 1, progress: 1, target: 1 },
    });

    await renderScreen();
    expect(screen.getByText('First brush · unlocked')).toBeTruthy();
  });

  describe('trip range band (KAN-234)', () => {
    function flattenStyle(style: unknown): Record<string, unknown> {
      return Array.isArray(style) ? Object.assign({}, ...style) : (style as Record<string, unknown>);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function cellHasTripBand(cellInstance: any): boolean {
      return cellInstance.findAllByType(View).some((v: any) => flattenStyle(v.props.style)?.backgroundColor === '#e8c9a0');
    }
    const trip = {
      id: 'trip-1', destination: 'Faro', placeRef: 'p1', centerLat: 1, centerLng: 2,
      startDate: '2026-06-10', endDate: '2026-06-20', areaRadius: 15_000,
      cacheAreaId: 'ta_1', expiresAt: 0, createdAt: fakeTimestamp('2026-06-01'),
    };

    it('fetches trips for the current uid', async () => {
      await renderScreen();
      expect(mockGetTrips).toHaveBeenCalledWith('test-uid');
    });

    it('marks a day inside a dated trip range, and not one outside it', async () => {
      mockGetTrips.mockResolvedValue([trip]);
      await renderScreen();

      const inRangeCell    = screen.getByLabelText(/^16, today/);
      const outOfRangeCell = screen.getByLabelText('25');
      expect(cellHasTripBand(inRangeCell)).toBe(true);
      expect(cellHasTripBand(outOfRangeCell)).toBe(false);
    });

    it('does not mark any day when the trip has no dates', async () => {
      mockGetTrips.mockResolvedValue([{ ...trip, startDate: undefined, endDate: undefined }]);
      await renderScreen();
      expect(cellHasTripBand(screen.getByLabelText(/^16, today/))).toBe(false);
    });

    it('does not change the selected day stats line — ring/streak math unaffected (regression guard)', async () => {
      mockGetTasksForMonth.mockResolvedValue([
        { id: 't1', title: 'A', category: 'errands', done: true, date: '2026-06-16', createdAt: {} },
      ]);
      mockGetTrips.mockResolvedValue([trip]);
      await renderScreen();
      expect(screen.getByText('1 of 1 done · 100%')).toBeTruthy();
    });
  });

  it('renders an "Open today" CTA only when today is selected', async () => {
    await renderScreen();
    expect(screen.getByLabelText('Open today')).toBeTruthy();
  });

  describe('"Going somewhere?" Trip Planner entry (KAN-243)', () => {
    // Both the persistent row and the future-day CTA share the "Going
    // somewhere?" label — disambiguated by their distinct accessibility labels.
    const FUTURE_DAY_CTA_LABEL = /^Plan a trip starting/;

    it('renders a persistent entry row that opens the flow with no prefill', async () => {
      await renderScreen();
      await act(async () => {
        fireEvent.press(screen.getByLabelText('Plan a trip'));
      });
      expect(mockNavigate).toHaveBeenCalledWith('TripPlanner');
    });

    it('shows the future-day CTA in the detail card only for a future day', async () => {
      await renderScreen();
      // Today (the 16th) selected by default — no future-day CTA yet, only the persistent row.
      expect(screen.queryByLabelText(FUTURE_DAY_CTA_LABEL)).toBeNull();
      expect(screen.getAllByText('Going somewhere?')).toHaveLength(1);

      await act(async () => { fireEvent.press(screen.getByLabelText('25')); });
      expect(screen.getByLabelText(FUTURE_DAY_CTA_LABEL)).toBeTruthy();
      expect(screen.getAllByText('Going somewhere?')).toHaveLength(2);
    });

    it('does not show the future-day CTA for a past day', async () => {
      await renderScreen();
      await act(async () => { fireEvent.press(screen.getByLabelText('10')); });
      expect(screen.queryByLabelText(FUTURE_DAY_CTA_LABEL)).toBeNull();
    });

    it('opens the flow with that day pre-filled as the trip start when the future-day CTA is tapped', async () => {
      await renderScreen();
      await act(async () => { fireEvent.press(screen.getByLabelText('25')); });

      await act(async () => {
        fireEvent.press(screen.getByLabelText(FUTURE_DAY_CTA_LABEL));
      });

      expect(mockNavigate).toHaveBeenCalledWith('TripPlanner', { prefillStartDate: '2026-06-25' });
    });

    it('leaves past/today day-tap selection behavior unchanged (still just selects the day)', async () => {
      await renderScreen();
      await act(async () => { fireEvent.press(screen.getByLabelText('10')); });
      expect(screen.getByText('Past')).toBeTruthy();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('toggling a task applies the change locally and calls setTaskDone (KAN-218 — no live listener to reflect it)', async () => {
    mockGetTasksForMonth.mockResolvedValue([
      { id: 't1', title: 'Buy groceries', category: 'errands', done: false,
        date: new Date().toISOString().slice(0, 10), createdAt: {} },
    ]);
    await renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByRole('checkbox'));
    });

    expect(mockSetTaskDone).toHaveBeenCalledWith('test-uid', 't1', true);
  });

  it('reverts the optimistic toggle when setTaskDone fails', async () => {
    mockGetTasksForMonth.mockResolvedValue([
      { id: 't1', title: 'Buy groceries', category: 'errands', done: false,
        date: new Date().toISOString().slice(0, 10), createdAt: {} },
    ]);
    mockSetTaskDone.mockRejectedValue(new Error('write failed'));
    await renderScreen();

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.props.accessibilityState.checked).toBe(false);

    await act(async () => {
      fireEvent.press(checkbox);
    });

    expect(mockSetTaskDone).toHaveBeenCalledWith('test-uid', 't1', true);
    expect(screen.getByRole('checkbox').props.accessibilityState.checked).toBe(false);
  });
});
