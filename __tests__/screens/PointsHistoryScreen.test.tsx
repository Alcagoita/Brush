/**
 * Unit tests for PointsHistoryScreen — KAN-33 / KAN-218
 *
 * Covers:
 *   - Renders heading and both section labels
 *   - Loading state while the history fetch hasn't resolved
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

const mockGetPointsHistory = jest.fn();
const mockGetAchievements  = jest.fn();
const mockGoBack           = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  getPointsHistory: (...args: unknown[]) => mockGetPointsHistory(...args),
  getAchievements:  (...args: unknown[]) => mockGetAchievements(...args),
}));

jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => ({ currentUser: { uid: 'user-123' } }),
}));

jest.mock('@react-navigation/native', () => {
  const actualReact = require('react');
  return {
    useNavigation: () => ({ goBack: mockGoBack }),
    // Mirrors focus-on-mount for tests — no blur/refocus cycle exercised here.
    useFocusEffect: (cb: () => void | (() => void)) => actualReact.useEffect(cb, []),
  };
});

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

/** Renders the screen and flushes the one-shot getPointsHistory/getAchievements fetches (KAN-218). */
async function renderScreen() {
  const utils = render(<PointsHistoryScreen />);
  await act(async () => {});
  return utils;
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

/** AchievementsMap entry — matches AchievementEntry shape (earnCount > 0 = earned). */
function makeAchievementsMap(type: string, overrides: Partial<any> = {}) {
  return {
    [type]: {
      earnedAt:  { seconds: 1748908800, nanoseconds: 0 },
      earnCount: 1,
      progress:  1,
      target:    1,
      ...overrides,
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPointsHistory.mockReturnValue(new Promise(() => {})); // never resolves by default
  mockGetAchievements.mockResolvedValue({});
});

// ── Render ────────────────────────────────────────────────────────────────────

describe('PointsHistoryScreen — render', () => {
  it('renders the screen title', async () => {
    await renderScreen();
    expect(screen.getByText('Points & Achievements')).toBeTruthy();
  });

  it('renders the Points History section heading', async () => {
    await renderScreen();
    expect(screen.getByText('Points History')).toBeTruthy();
  });

  it('renders the Achievements section heading', async () => {
    await renderScreen();
    expect(screen.getByText('Achievements')).toBeTruthy();
  });

  it('calls goBack when back button is pressed', async () => {
    await renderScreen();
    fireEvent.press(screen.getByLabelText('Back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});

// ── Points history ────────────────────────────────────────────────────────────

describe('PointsHistoryScreen — points history', () => {
  it('shows a loading indicator before the fetch resolves', async () => {
    await renderScreen();
    expect(screen.getByLabelText('Loading points history')).toBeTruthy();
  });

  it('shows the empty state when history is empty', async () => {
    mockGetPointsHistory.mockResolvedValue([]);
    await renderScreen();
    expect(screen.getByText(/No points yet/)).toBeTruthy();
  });

  it('renders a history row with task title and points', async () => {
    mockGetPointsHistory.mockResolvedValue([makeEntry({ taskTitle: 'Walk the dog', points: 1 })]);
    await renderScreen();
    expect(screen.getByText('Walk the dog')).toBeTruthy();
    expect(screen.getByText('+1')).toBeTruthy();
  });

  it('renders "Brushed" as the reason label for task_completed (KAN-108)', async () => {
    mockGetPointsHistory.mockResolvedValue([makeEntry()]);
    await renderScreen();
    expect(screen.getByText(/^Brushed/)).toBeTruthy();
  });

  it('does not show "Load more" when entries fit on one page', async () => {
    mockGetPointsHistory.mockResolvedValue([makeEntry()]);
    await renderScreen();
    expect(screen.queryByLabelText('Load more history')).toBeNull();
  });

  it('shows "Load more" when there are more than 20 entries', async () => {
    const entries = Array.from({ length: 25 }, (_, i) =>
      makeEntry({ id: `entry-${i}`, taskTitle: `Task ${i}` }),
    );
    mockGetPointsHistory.mockResolvedValue(entries);
    await renderScreen();
    expect(screen.getByLabelText('Load more history')).toBeTruthy();
  });

  it('loads the next page when "Load more" is pressed', async () => {
    const entries = Array.from({ length: 25 }, (_, i) =>
      makeEntry({ id: `entry-${i}`, taskTitle: `Task ${i}` }),
    );
    mockGetPointsHistory.mockResolvedValue(entries);
    await renderScreen();
    fireEvent.press(screen.getByLabelText('Load more history'));
    // All 25 now visible — "Load more" disappears
    expect(screen.queryByLabelText('Load more history')).toBeNull();
  });
});

// ── Achievements gallery ──────────────────────────────────────────────────────

describe('PointsHistoryScreen — achievements gallery', () => {
  it('renders all catalogue achievements', async () => {
    await renderScreen();
    ACHIEVEMENT_CATALOGUE.forEach((def) => {
      expect(screen.getByLabelText(`${def.label} achievement, locked`)).toBeTruthy();
    });
  });

  it('shows "Locked" badge on unearned achievements', async () => {
    await renderScreen();
    // All 7 catalogue entries are locked when no achievements earned
    expect(screen.getAllByText('Locked').length).toBe(7);
  });

  it('shows the unlock condition for locked achievements', async () => {
    await renderScreen();
    expect(screen.getByText('Brush away your first task')).toBeTruthy();
  });

  it('marks an earned achievement as earned', async () => {
    mockGetAchievements.mockResolvedValue(makeAchievementsMap('first_brush'));
    await renderScreen();
    expect(screen.getByLabelText('First brush achievement, earned')).toBeTruthy();
  });

  it('hides "Locked" badge for earned achievements', async () => {
    mockGetAchievements.mockResolvedValue(makeAchievementsMap('first_brush'));
    await renderScreen();
    // 6 locked badges remain (other 6 catalogue entries still locked)
    expect(screen.getAllByText('Locked').length).toBe(6);
  });

  it('treats earnCount=0 as not earned', async () => {
    mockGetAchievements.mockResolvedValue(makeAchievementsMap('first_brush', { earnCount: 0 }));
    await renderScreen();
    expect(screen.getAllByText('Locked').length).toBe(7);
  });
});
