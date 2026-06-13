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

const mockSubscribeToTotalPoints  = jest.fn();
const mockSubscribeToAchievements = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  subscribeToTotalPoints:  (...args: unknown[]) => mockSubscribeToTotalPoints(...args),
  subscribeToAchievements: (...args: unknown[]) => mockSubscribeToAchievements(...args),
}));

jest.mock('../../src/services/achievements', () => ({
  ACHIEVEMENT_DEFS: {
    first_brush:  { id: 'first_brush',  label: 'First brush',  points: 5,  target: 1,   repeatable: false },
    early_bird:   { id: 'early_bird',   label: 'Early bird',   points: 10, target: 1,   repeatable: true  },
    day_complete: { id: 'day_complete', label: 'Day complete', points: 15, target: 1,   repeatable: true  },
    on_a_roll:    { id: 'on_a_roll',    label: 'On a roll',    points: 20, target: 3,   repeatable: true  },
    explorer:     { id: 'explorer',     label: 'Explorer',     points: 25, target: 10,  repeatable: false },
    centurion:    { id: 'centurion',    label: 'Centurion',    points: 30, target: 100, repeatable: false },
  },
}));

jest.mock('../../src/constants/tiers', () => ({
  deriveTierStanding: (pts: number) => {
    if (pts < 50)   { return { nextTier: { name: 'Bronze', at: 50,  color: '#b3793f' }, maxed: false, bandPct: pts / 50,         toGo: 50  - pts }; }
    if (pts < 200)  { return { nextTier: { name: 'Silver', at: 200, color: '#7d93a4' }, maxed: false, bandPct: (pts-50)  / 150,  toGo: 200 - pts }; }
    if (pts < 3000) { return { nextTier: { name: 'Gold',   at: 500, color: '#c0972d' }, maxed: false, bandPct: (pts-200) / 300,  toGo: 500 - pts }; }
    return           { nextTier: { name: 'Vibranium', at: 3000, color: '#7256a6' }, maxed: true,  bandPct: 1,            toGo: 0           };
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

describe('AchievementsScreen — basic render', () => {
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

describe('AchievementsScreen — subscriptions', () => {
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

// ─── Tier header card (KAN-136) ───────────────────────────────────────────────

describe('AchievementsScreen — KAN-136: tier header card', () => {
  it('shows TOTAL POINTS label', () => {
    renderScreen();
    expect(screen.getByText('TOTAL POINTS')).toBeTruthy();
  });

  it('shows "points earned so far" caption', () => {
    renderScreen();
    expect(screen.getByText('points earned so far')).toBeTruthy();
  });

  it('shows 0 before subscription fires', () => {
    renderScreen();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
  });

  it('shows live point total when subscription fires', () => {
    renderScreen();
    firePoints(42);
    expect(screen.getAllByText('42').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "{toGo} pts to {name}" when not maxed', () => {
    renderScreen();
    firePoints(10);
    // 10 pts → toGo = 40, nextTier = Bronze
    expect(screen.getByText(/40 pts/)).toBeTruthy();
    expect(screen.getByText(/Bronze/)).toBeTruthy();
  });

  it('shows "Top tier · {name}" when maxed', () => {
    renderScreen();
    firePoints(3000);
    expect(screen.getByText(/Top tier/)).toBeTruthy();
    expect(screen.getByText(/Vibranium/)).toBeTruthy();
  });
});

// ─── Achievement gallery — sections (KAN-136) ─────────────────────────────────

describe('AchievementsScreen — KAN-136: achievement sections', () => {
  it('shows all catalogue labels', () => {
    renderScreen();
    expect(screen.getByText('First brush')).toBeTruthy();
    expect(screen.getByText('Early bird')).toBeTruthy();
    expect(screen.getByText('Day complete')).toBeTruthy();
    expect(screen.getByText('On a roll')).toBeTruthy();
    expect(screen.getByText('Explorer')).toBeTruthy();
    expect(screen.getByText('Centurion')).toBeTruthy();
    expect(screen.getByText('First to brush it away')).toBeTruthy();
  });

  it('shows LOCKED · N section when no achievements earned', () => {
    renderScreen();
    fireAchievements({});
    expect(screen.getByText(/LOCKED · 7/)).toBeTruthy();
  });

  it('shows EARNED · N section after earning some', () => {
    renderScreen();
    fireAchievements({
      first_brush: { earnCount: 1, progress: 1, target: 1, earnedAt: null },
      early_bird:  { earnCount: 2, progress: 2, target: 1, earnedAt: null },
    });
    expect(screen.getByText(/EARNED · 2/)).toBeTruthy();
    expect(screen.getByText(/LOCKED · 5/)).toBeTruthy();
  });

  it('hides EARNED section when nothing earned', () => {
    renderScreen();
    fireAchievements({});
    expect(screen.queryByText(/EARNED ·/)).toBeNull();
  });

  it('hides LOCKED section when everything earned', () => {
    renderScreen();
    const allEarned: AchievementsMap = {};
    ['first_brush', 'early_bird', 'day_complete', 'on_a_roll', 'explorer', 'centurion', 'challenge_winner'].forEach(t => {
      allEarned[t as any] = { earnCount: 1, progress: 1, target: 1, earnedAt: null };
    });
    fireAchievements(allEarned);
    expect(screen.queryByText(/LOCKED ·/)).toBeNull();
  });
});

// ─── Achievement cards ────────────────────────────────────────────────────────

describe('AchievementsScreen — achievement cards', () => {
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
    const matches = screen.getAllByText(/pts available/);
    const exact = matches.filter(el => el.props.children === '5 pts available');
    expect(exact.length).toBeGreaterThanOrEqual(1);
  });

  it('scales "pts earned" by earnCount for repeatable achievements', () => {
    renderScreen();
    fireAchievements({
      early_bird: { earnCount: 3, progress: 3, target: 1, earnedAt: null },
    });
    expect(screen.getByText(/30 pts earned/)).toBeTruthy();
  });
});

// ─── Centurion meta-achievement ───────────────────────────────────────────────

describe('AchievementsScreen — centurion meta-achievement', () => {
  it('centurion progress uses totalPoints', () => {
    renderScreen();
    firePoints(80);
    expect(screen.getAllByText(/80/).length).toBeGreaterThanOrEqual(1);
  });
});
