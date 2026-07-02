/**
 * Unit tests for PointsHistoryScreen — KAN-33
 *
 * Covers:
 *   - Renders heading and both section labels
 *   - Loading state while history subscription hasn't fired
 *   - Empty state when no history
 *   - History rows rendered (title, reason, points)
 *   - "Load more" button appears when there are more than PAGE_SIZE entries
 *   - "Load more" button absent when all entries fit on one page
 *   - Achievements gallery: all catalogue entries rendered
 *   - Locked achievement shows "Locked" badge and condition text
 *   - Earned achievement hides "Locked" badge
 *   - Back button calls navigation.goBack
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import PointsHistoryScreen from '../../src/screens/PointsHistoryScreen';
import { ACHIEVEMENT_CATALOGUE } from '../../src/components/AchievementTile';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSubscribeToPointsHistory = jest.fn(() => jest.fn());
const mockSubscribeToAchievements  = jest.fn(() => jest.fn());
const mockGoBack                   = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  subscribeToPointsHistory: (...args: unknown[]) => mockSubscribeToPointsHistory(...args),
  subscribeToAchievements:  (...args: unknown[]) => mockSubscribeToAchievements(...args),
}));

jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => ({ currentUser: { uid: 'user-123' } }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      bg:         '#fdfdfb',
      surface:    '#f6f5f1',
      surface2:   '#efeeea',
      line:       'rgba(20,20,18,0.08)',
      text:       '#1a1a18',
      muted:      '#8a8a85',
      faint:      '#bdbdb7',
      accent:     '#e8a86a',
      nearTint2:  '#f9ede0',
      nearBorder: '#e8c9a0',
      nearText:   '#7a4a20',
    },
  }),
}));

jest.mock('../../src/components/AppIcon', () => ({
  ChevronLeftIcon: () => null,
  CheckIcon:       () => null,
  SunIcon:         () => null,
  FlameIcon:       () => null,
  PinIcon:         () => null,
  StarIcon:        () => null,
  MedalIcon:       () => null,
  LockIcon:        () => null,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fireHistory(entries: object[]) {
  const call = mockSubscribeToPointsHistory.mock.calls[0];
  if (call) { act(() => { (call[1] as Function)(entries); }); }
}

function fireAchievements(achievements: object[]) {
  const call = mockSubscribeToAchievements.mock.calls[0];
  if (call) { act(() => { (call[1] as Function)(achievements); }); }
}

function makeEntry(overrides: Partial<any> = {}) {
  return {
    id:         'entry-1',
    taskId:     'task-1',
    taskTitle:  'Buy milk',
    awardedAt:  { seconds: 1748908800, nanoseconds: 0 },
    points:     1,
    reason:     'task_completed',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockSubscribeToPointsHistory.mockReturnValue(jest.fn());
  mockSubscribeToAchievements.mockReturnValue(jest.fn());
});

// ── Render ────────────────────────────────────────────────────────────────────

describe('PointsHistoryScreen — render', () => {
  it('renders the screen title', () => {
    render(<PointsHistoryScreen />);
    expect(screen.getByText('Points & Achievements')).toBeTruthy();
  });

  it('renders the Points History section heading', () => {
    render(<PointsHistoryScreen />);
    expect(screen.getByText('Points History')).toBeTruthy();
  });

  it('renders the Achievements section heading', () => {
    render(<PointsHistoryScreen />);
    expect(screen.getByText('Achievements')).toBeTruthy();
  });

  it('calls goBack when back button is pressed', () => {
    render(<PointsHistoryScreen />);
    fireEvent.press(screen.getByLabelText('Back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});

// ── Points history ────────────────────────────────────────────────────────────

describe('PointsHistoryScreen — points history', () => {
  it('shows a loading indicator before history fires', () => {
    render(<PointsHistoryScreen />);
    expect(screen.getByLabelText('Loading points history')).toBeTruthy();
  });

  it('shows the empty state when history is empty', () => {
    render(<PointsHistoryScreen />);
    fireHistory([]);
    expect(screen.getByText(/No points yet/)).toBeTruthy();
  });

  it('renders a history row with task title and points', () => {
    render(<PointsHistoryScreen />);
    fireHistory([makeEntry({ taskTitle: 'Walk the dog', points: 1 })]);
    expect(screen.getByText('Walk the dog')).toBeTruthy();
    expect(screen.getByText('+1')).toBeTruthy();
  });

  it('renders "Brushed" as the reason label for task_completed (KAN-108)', () => {
    render(<PointsHistoryScreen />);
    fireHistory([makeEntry()]);
    expect(screen.getByText(/^Brushed/)).toBeTruthy();
  });

  it('does not show "Load more" when entries fit on one page', () => {
    render(<PointsHistoryScreen />);
    fireHistory([makeEntry()]);
    expect(screen.queryByLabelText('Load more history')).toBeNull();
  });

  it('shows "Load more" when there are more than 20 entries', () => {
    render(<PointsHistoryScreen />);
    const entries = Array.from({ length: 25 }, (_, i) =>
      makeEntry({ id: `entry-${i}`, taskTitle: `Task ${i}` }),
    );
    fireHistory(entries);
    expect(screen.getByLabelText('Load more history')).toBeTruthy();
  });

  it('loads the next page when "Load more" is pressed', () => {
    render(<PointsHistoryScreen />);
    const entries = Array.from({ length: 25 }, (_, i) =>
      makeEntry({ id: `entry-${i}`, taskTitle: `Task ${i}` }),
    );
    fireHistory(entries);
    fireEvent.press(screen.getByLabelText('Load more history'));
    // All 25 now visible — "Load more" disappears
    expect(screen.queryByLabelText('Load more history')).toBeNull();
  });
});

// ── Achievements gallery ──────────────────────────────────────────────────────

describe('PointsHistoryScreen — achievements gallery', () => {
  it('renders all catalogue achievements', () => {
    render(<PointsHistoryScreen />);
    ACHIEVEMENT_CATALOGUE.forEach((def) => {
      expect(screen.getByLabelText(`${def.label} achievement, locked`)).toBeTruthy();
    });
  });

  it('shows "Locked" badge on unearned achievements', () => {
    render(<PointsHistoryScreen />);
    // All 7 catalogue entries are locked when no achievements earned
    expect(screen.getAllByText('Locked').length).toBe(7);
  });

  it('shows the unlock condition for locked achievements', () => {
    render(<PointsHistoryScreen />);
    expect(screen.getByText('Brush away your first task')).toBeTruthy();
  });

  it('marks an earned achievement as earned', () => {
    render(<PointsHistoryScreen />);
    fireAchievements([
      { id: 'first_brush', type: 'first_brush', earnedAt: { seconds: 1748908800, nanoseconds: 0 } },
    ]);
    expect(screen.getByLabelText('First brush achievement, earned')).toBeTruthy();
  });

  it('hides "Locked" badge for earned achievements', () => {
    render(<PointsHistoryScreen />);
    fireAchievements([
      { id: 'first_brush', type: 'first_brush', earnedAt: { seconds: 1748908800, nanoseconds: 0 } },
    ]);
    // 6 locked badges remain (other 6 catalogue entries still locked)
    expect(screen.getAllByText('Locked').length).toBe(6);
  });
});
