/**
 * AchievementsScreen tests — KAN-114 / KAN-129 / KAN-136
 *
 * KAN-136 changes tested:
 *   - Tier header card: "TOTAL POINTS" label, point number, "points earned so far" caption
 *   - TierMedal caption: "{toGo} pts to {name}" / maxed state
 *   - TierLadder renders
 *   - Achievement gallery split into EARNED · N and LOCKED · N sections
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import type { AchievementsMap } from '../../src/types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetTotalPoints  = jest.fn();
const mockGetAchievements = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  getTotalPoints:  (...args: unknown[]) => mockGetTotalPoints(...args),
  getAchievements: (...args: unknown[]) => mockGetAchievements(...args),
}));

jest.mock('../../src/services/achievements', () => ({
  ACHIEVEMENT_DEFS: {
    first_task:       { id: 'first_task',       points: 5,  target: 1, repeatable: false },
    first_brush:      { id: 'first_brush',      points: 10, target: 1, repeatable: false },
    right_place:      { id: 'right_place',      points: 10, target: 1, repeatable: false },
    worth_wait:       { id: 'worth_wait',       points: 10, target: 1, repeatable: false },
    custom_cat:       { id: 'custom_cat',       points: 5,  target: 1, repeatable: false },
    out_about:        { id: 'out_about',        points: 10, target: 3, repeatable: false },
  },
}));

jest.mock('../../src/constants/tiers', () => ({
  deriveTierStanding: (pts: number) => {
    const tin = { name: 'Tin', at: 0, color: '#9b9690' };
    if (pts < 50)   { return { curTier: tin,                                            nextTier: { name: 'Bronze',     at: 50,   color: '#b3793f' }, maxed: false, bandPct: pts        / 50,  toGo: 50   - pts }; }
    if (pts < 200)  { return { curTier: { name: 'Bronze',     color: '#b3793f' },       nextTier: { name: 'Silver',     at: 200,  color: '#7d93a4' }, maxed: false, bandPct: (pts-50)  / 150,  toGo: 200  - pts }; }
    if (pts < 500)  { return { curTier: { name: 'Silver',     color: '#7d93a4' },       nextTier: { name: 'Gold',       at: 500,  color: '#c0972d' }, maxed: false, bandPct: (pts-200) / 300,  toGo: 500  - pts }; }
    if (pts < 1200) { return { curTier: { name: 'Gold',       color: '#c0972d' },       nextTier: { name: 'Adamantium', at: 1200, color: '#5e788c' }, maxed: false, bandPct: (pts-500) / 700,  toGo: 1200 - pts }; }
    if (pts < 3000) { return { curTier: { name: 'Adamantium', color: '#5e788c' },       nextTier: { name: 'Vibranium',  at: 3000, color: '#7256a6' }, maxed: false, bandPct: (pts-1200)/1800,  toGo: 3000 - pts }; }
    return           { curTier: { name: 'Vibranium',           color: '#7256a6' },       nextTier: { name: 'Vibranium',  at: 3000, color: '#7256a6' }, maxed: true,  bandPct: 1, toGo: 0 };
  },
}));

jest.mock('../../src/components/TierMedal', () => () => null);
jest.mock('../../src/components/TierLadder', () => () => null);

jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => ({
    currentUser: { uid: 'test-uid' },
  }),
}));

const mockGoBack = jest.fn();
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
      bg:         '#fff',
      surface:    '#f6f5f1',
      surface2:   '#efeeea',
      text:       '#1a1a18',
      muted:      '#8a8a85',
      faint:      '#bdbdb7',
      line:       'rgba(20,20,18,0.08)',
      accent:     '#e8a86a',
      nearTint:   '#fdf7f0',
      nearTint2:  '#f9ede0',
      nearBorder: '#e8c9a0',
      nearText:   '#7a4a20',
      ringTrack:  'rgba(20,20,18,0.08)',
    },
  }),
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Stub = (props: React.ComponentProps<typeof View>) => React.createElement(View, props);
  return { __esModule: true, default: Stub, Circle: Stub, Path: Stub };
});

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

// ─── Import ───────────────────────────────────────────────────────────────────

import AchievementsScreen from '../../src/screens/AchievementsScreen';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupDefaultMocks() {
  mockGetTotalPoints.mockResolvedValue(0);
  mockGetAchievements.mockResolvedValue({});
}

/** Renders the screen and flushes the one-shot getTotalPoints/getAchievements fetches (KAN-218). */
async function renderScreen() {
  const utils = render(<AchievementsScreen />);
  await act(async () => {});
  return utils;
}

beforeEach(() => {
  jest.clearAllMocks();
  setupDefaultMocks();
});

// ─── Basic render ─────────────────────────────────────────────────────────────

describe('AchievementsScreen — basic render', () => {
  it('renders without crashing', async () => {
    await renderScreen();
    expect(screen.getByText('Achievements')).toBeTruthy();
  });

  it('renders the back button', async () => {
    await renderScreen();
    expect(screen.getByLabelText('Back')).toBeTruthy();
  });
});

// ─── One-shot fetch (KAN-218) ─────────────────────────────────────────────────

describe('AchievementsScreen — one-shot fetch (KAN-218)', () => {
  it('fetches totalPoints with the correct uid', async () => {
    await renderScreen();
    expect(mockGetTotalPoints).toHaveBeenCalledWith('test-uid');
  });

  it('fetches achievements with the correct uid', async () => {
    await renderScreen();
    expect(mockGetAchievements).toHaveBeenCalledWith('test-uid');
  });
});

// ─── Tier header card (KAN-136) ───────────────────────────────────────────────

describe('AchievementsScreen — KAN-136: tier header card', () => {
  it('shows TOTAL POINTS label', async () => {
    await renderScreen();
    expect(screen.getByText('TOTAL POINTS')).toBeTruthy();
  });

  it('shows "points earned so far" caption', async () => {
    await renderScreen();
    expect(screen.getByText('points earned so far')).toBeTruthy();
  });

  it('shows 0 before the fetch resolves', () => {
    mockGetTotalPoints.mockReturnValue(new Promise(() => {})); // never resolves
    render(<AchievementsScreen />);
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
  });

  it('shows the point total once the fetch resolves', async () => {
    mockGetTotalPoints.mockResolvedValue(42);
    await renderScreen();
    expect(screen.getAllByText('42').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Tin · Bronze is on its way" when not maxed (KAN-150: no countdown)', async () => {
    mockGetTotalPoints.mockResolvedValue(10);
    await renderScreen();
    // 10 pts → curTier = Tin, nextTier = Bronze
    expect(screen.getByText(/Tin/)).toBeTruthy();
    expect(screen.getByText(/Bronze is on its way/)).toBeTruthy();
    expect(screen.queryByText(/pts to/)).toBeNull(); // no countdown number
  });

  it('shows "Top tier · {name}" when maxed', async () => {
    mockGetTotalPoints.mockResolvedValue(3000);
    await renderScreen();
    expect(screen.getByText(/Top tier/)).toBeTruthy();
    expect(screen.getByText(/Vibranium/)).toBeTruthy();
  });
});

// ─── Achievement gallery — sections (KAN-136) ─────────────────────────────────

describe('AchievementsScreen — KAN-136: achievement sections', () => {
  it('shows all Tin-tier catalogue labels (KAN-150)', async () => {
    await renderScreen();
    expect(screen.getByText('Off your mind')).toBeTruthy();
    expect(screen.getByText('First brush')).toBeTruthy();
    expect(screen.getByText('Right place, right time')).toBeTruthy();
    expect(screen.getByText('Worth the wait')).toBeTruthy();
    expect(screen.getByText('Make it yours')).toBeTruthy();
    expect(screen.getByText('Out and about')).toBeTruthy();
    expect(screen.getByText('First to brush it away')).toBeTruthy();
  });

  it('shows LOCKED · N section when no achievements earned', async () => {
    mockGetAchievements.mockResolvedValue({});
    await renderScreen();
    expect(screen.getByText(/LOCKED · 7/)).toBeTruthy();
  });

  it('shows EARNED · N section after earning some', async () => {
    mockGetAchievements.mockResolvedValue({
      first_task:  { earnCount: 1, progress: 1, target: 1, earnedAt: null },
      first_brush: { earnCount: 1, progress: 1, target: 1, earnedAt: null },
    });
    await renderScreen();
    expect(screen.getByText(/EARNED · 2/)).toBeTruthy();
    expect(screen.getByText(/LOCKED · 5/)).toBeTruthy();
  });

  it('hides EARNED section when nothing earned', async () => {
    mockGetAchievements.mockResolvedValue({});
    await renderScreen();
    expect(screen.queryByText(/EARNED ·/)).toBeNull();
  });

  it('hides LOCKED section when everything earned', async () => {
    const allEarned: AchievementsMap = {};
    const keys: (keyof AchievementsMap)[] = ['first_task', 'first_brush', 'right_place', 'worth_wait', 'custom_cat', 'out_about', 'challenge_winner'];
    keys.forEach(t => { allEarned[t] = { earnCount: 1, progress: 1, target: 1, earnedAt: null }; });
    mockGetAchievements.mockResolvedValue(allEarned);
    await renderScreen();
    expect(screen.queryByText(/LOCKED ·/)).toBeNull();
  });
});

// ─── Achievement cards ────────────────────────────────────────────────────────

describe('AchievementsScreen — achievement cards', () => {
  it('shows "pts earned" badge for earned achievements', async () => {
    mockGetAchievements.mockResolvedValue({
      first_brush: { earnCount: 1, progress: 1, target: 1, earnedAt: null },
    });
    await renderScreen();
    expect(screen.getByText(/10 pts earned/)).toBeTruthy();
  });

  it('shows "pts available" badge for locked achievements (5pt entries)', async () => {
    mockGetAchievements.mockResolvedValue({});
    await renderScreen();
    const matches = screen.getAllByText(/pts available/);
    const fivePt = matches.filter(el => el.props.children === '5 pts available');
    expect(fivePt.length).toBeGreaterThanOrEqual(1); // first_task and custom_cat are 5 pts each
  });
});

// ─── Tin-tier anti-guilt design (KAN-150) ────────────────────────────────────

describe('AchievementsScreen — KAN-150: anti-guilt design', () => {
  it('locked cards do not show a progress bar (surprises, not quests)', async () => {
    mockGetAchievements.mockResolvedValue({});
    await renderScreen();
    // out_about is the only multi-step Tin achievement (target 3);
    // its progress bar should be absent while locked.
    expect(screen.queryByText(/\/3/)).toBeNull();
  });

  it('earned out_about card shows progress fraction', async () => {
    mockGetAchievements.mockResolvedValue({
      out_about: { earnCount: 1, progress: 3, target: 3, earnedAt: null },
    });
    await renderScreen();
    // progress fraction rendered as "3" + "/" + "3" in two sibling Text nodes
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(2);
  });
});
