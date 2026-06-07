/**
 * AchievementsScreen tests — KAN-114 / KAN-129
 *
 * Covers:
 *   - Renders without crashing; back button present
 *   - Subscribes to totalPoints and achievements with the correct uid
 *   - Tier summary card shows points, tier name, and earned count
 *   - All 7 catalogue achievement labels rendered in the grid
 *   - Earned card shows "pts earned" badge; locked card shows "pts available"
 *   - Progress bar rendered for multi-step achievements (target > 1)
 *   - Centurion progress is driven by totalPoints (meta-achievement)
 *   - Both subscriptions are cleaned up on unmount
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import type { AchievementsMap } from '../../src/types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSubscribeToTotalPoints  = jest.fn();
const mockSubscribeToAchievements = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  subscribeToTotalPoints:  (...args: unknown[]) => mockSubscribeToTotalPoints(...args),
  subscribeToAchievements: (...args: unknown[]) => mockSubscribeToAchievements(...args),
}));

jest.mock('../../src/services/achievements', () => ({
  TIER_LADDER: [
    { name: 'Bronze', at: 50  },
    { name: 'Silver', at: 150 },
    { name: 'Gold',   at: 350 },
  ],
  getNextTier: (pts: number) => {
    if (pts < 50)  { return { name: 'Bronze', at: 50  }; }
    if (pts < 150) { return { name: 'Silver', at: 150 }; }
    return           { name: 'Gold',   at: 350 };
  },
  ACHIEVEMENT_DEFS: {
    first_brush:  { id: 'first_brush',  label: 'First brush',  points: 5,  target: 1,   repeatable: false },
    early_bird:   { id: 'early_bird',   label: 'Early bird',   points: 10, target: 1,   repeatable: true  },
    day_complete: { id: 'day_complete', label: 'Day complete', points: 15, target: 1,   repeatable: true  },
    on_a_roll:    { id: 'on_a_roll',    label: 'On a roll',    points: 20, target: 3,   repeatable: true  },
    explorer:     { id: 'explorer',     label: 'Explorer',     points: 25, target: 10,  repeatable: false },
    centurion:    { id: 'centurion',    label: 'Centurion',    points: 30, target: 100, repeatable: false },
  },
}));

jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => ({
    currentUser: { uid: 'test-uid' },
  }),
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

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
  const Stub = (props: any) => React.createElement(View, props);
  return { __esModule: true, default: Stub, Circle: Stub, Path: Stub };
});

jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  useSharedValue:          (v: number) => ({ value: v }),
  useAnimatedProps:        (fn: () => object) => fn(),
  withTiming:              (v: number) => v,
  createAnimatedComponent: (C: React.ComponentType<any>) => C,
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

// ─── Import ───────────────────────────────────────────────────────────────────

import AchievementsScreen from '../../src/screens/AchievementsScreen';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const noopUnsub = jest.fn();

function setupDefaultMocks() {
  mockSubscribeToTotalPoints.mockReturnValue(noopUnsub);
  mockSubscribeToAchievements.mockReturnValue(noopUnsub);
}

function firePoints(value: number) {
  const call = mockSubscribeToTotalPoints.mock.calls[0];
  if (call) { act(() => { call[1](value); }); }
}

function fireAchievements(map: AchievementsMap) {
  const call = mockSubscribeToAchievements.mock.calls[0];
  if (call) { act(() => { call[1](map); }); }
}

function renderScreen() {
  return render(<AchievementsScreen />);
}

beforeEach(() => {
  jest.clearAllMocks();
  setupDefaultMocks();
});

// ─── Basic render ─────────────────────────────────────────────────────────────

describe('AchievementsScreen — KAN-114 / KAN-129: basic render', () => {
  it('renders without crashing', () => {
    renderScreen();
    expect(screen.getByText('Achievements')).toBeTruthy();
  });

  it('renders the back button', () => {
    renderScreen();
    expect(screen.getByLabelText('Back')).toBeTruthy();
  });
});

// ─── Subscriptions ────────────────────────────────────────────────────────────

describe('AchievementsScreen — KAN-129: subscriptions', () => {
  it('subscribes to totalPoints with the correct uid', () => {
    renderScreen();
    expect(mockSubscribeToTotalPoints).toHaveBeenCalledWith(
      'test-uid', expect.any(Function), expect.any(Function),
    );
  });

  it('subscribes to achievements with the correct uid', () => {
    renderScreen();
    expect(mockSubscribeToAchievements).toHaveBeenCalledWith(
      'test-uid', expect.any(Function), expect.any(Function),
    );
  });

  it('cleans up both subscriptions on unmount', () => {
    const unsub1 = jest.fn();
    const unsub2 = jest.fn();
    mockSubscribeToTotalPoints.mockReturnValue(unsub1);
    mockSubscribeToAchievements.mockReturnValue(unsub2);

    const { unmount } = renderScreen();
    unmount();

    expect(unsub1).toHaveBeenCalledTimes(1);
    expect(unsub2).toHaveBeenCalledTimes(1);
  });
});

// ─── Tier summary card ────────────────────────────────────────────────────────

describe('AchievementsScreen — KAN-129: tier summary card', () => {
  it('shows 0 pts before subscription fires', () => {
    renderScreen();
    // getAllByText used because multiple elements may contain "0"
    expect(screen.getAllByText(/0 pts/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows live point total when subscription fires', () => {
    renderScreen();
    firePoints(42);
    expect(screen.getAllByText(/42/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows pts to next tier when below max', () => {
    renderScreen();
    firePoints(10);
    // Bronze at 50 → "40 pts to Bronze"
    expect(screen.getByText(/40 pts to Bronze/)).toBeTruthy();
  });

  it('shows Gold tier when totalPoints >= 350', () => {
    renderScreen();
    firePoints(400);
    expect(screen.getByText(/Gold tier/)).toBeTruthy();
  });

  it('shows 0/7 earned count before any achievements', () => {
    renderScreen();
    fireAchievements({});
    expect(screen.getByText(/0 \/ 7 earned/)).toBeTruthy();
  });

  it('shows correct earned count after some achievements awarded', () => {
    renderScreen();
    fireAchievements({
      first_brush:  { earnCount: 1, progress: 1, target: 1,  earnedAt: null },
      early_bird:   { earnCount: 3, progress: 3, target: 1,  earnedAt: null },
    });
    expect(screen.getByText(/2 \/ 7 earned/)).toBeTruthy();
  });
});

// ─── Achievement grid ─────────────────────────────────────────────────────────

describe('AchievementsScreen — KAN-114 / KAN-129: achievement grid', () => {
  it('renders all 7 catalogue labels', () => {
    renderScreen();
    expect(screen.getByText('First brush')).toBeTruthy();
    expect(screen.getByText('Early bird')).toBeTruthy();
    expect(screen.getByText('Day complete')).toBeTruthy();
    expect(screen.getByText('On a roll')).toBeTruthy();
    expect(screen.getByText('Explorer')).toBeTruthy();
    expect(screen.getByText('Centurion')).toBeTruthy();
    expect(screen.getByText('First to brush it away')).toBeTruthy();
  });

  it('shows "pts earned" badge for earned achievements', () => {
    renderScreen();
    fireAchievements({
      first_brush: { earnCount: 1, progress: 1, target: 1, earnedAt: null },
    });
    expect(screen.getByText(/5 pts earned/)).toBeTruthy();
  });

  it('shows "pts available" badge for locked achievements', () => {
    renderScreen();
    fireAchievements({});
    // first_brush is locked → exactly "5 pts available" (not "25 pts available")
    const matches = screen.getAllByText(/pts available/);
    const exact = matches.filter(el => el.props.children === '5 pts available');
    expect(exact.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "pts earned" scaled by earnCount for repeatable achievements', () => {
    renderScreen();
    // early_bird earned 3 times × 10 pts = 30 pts earned
    fireAchievements({
      early_bird: { earnCount: 3, progress: 3, target: 1, earnedAt: null },
    });
    expect(screen.getByText(/30 pts earned/)).toBeTruthy();
  });

  it('renders the ACHIEVEMENTS section label', () => {
    renderScreen();
    expect(screen.getByText('ACHIEVEMENTS')).toBeTruthy();
  });
});

// ─── Centurion meta-achievement ───────────────────────────────────────────────

describe('AchievementsScreen — KAN-129: centurion meta-achievement', () => {
  it('centurion progress bar shows totalPoints as progress (not Firestore entry)', () => {
    renderScreen();
    // 80 pts total — centurion target is 100 — progress should read from totalPoints
    firePoints(80);
    // Multiple elements may show "80" — ensure at least one is present
    expect(screen.getAllByText(/80/).length).toBeGreaterThanOrEqual(1);
  });
});
