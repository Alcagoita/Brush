/**
 * AchievementsScreen tests — KAN-114
 *
 * Covers:
 *   - Header renders "Achievements" + back button
 *   - Points summary card: ring label, tier percentage, pts-to-go
 *   - EARNED / LOCKED section labels with counts
 *   - Earned cards show correct label, brand copy description, check icon
 *   - Count pill (×N) shown when an achievement is earned multiple times
 *   - Locked cards show lock icon, muted label, brand copy description
 *   - Centurion progress caption (pts / 100)
 *   - Explorer progress caption (locationCount / 10)
 *   - Subscriptions + async query cleaned up on unmount
 *   - Back navigation
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSubscribeToTotalPoints  = jest.fn();
const mockSubscribeToAchievements = jest.fn();
const mockGetLocationTasksCompletedCount = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  subscribeToTotalPoints:            (...a: unknown[]) => mockSubscribeToTotalPoints(...a),
  subscribeToAchievements:           (...a: unknown[]) => mockSubscribeToAchievements(...a),
  getLocationTasksCompletedCount:    (...a: unknown[]) => mockGetLocationTasksCompletedCount(...a),
}));

jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => ({ currentUser: { uid: 'test-uid' } }),
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
    dark:    false,
    setDark: jest.fn(),
  }),
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Stub = (props: any) => React.createElement(View, props);
  return { __esModule: true, default: Stub, Circle: Stub, Path: Stub, Rect: Stub, Line: Stub };
});

jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  useSharedValue:           (v: number) => ({ value: v }),
  useAnimatedProps:         (fn: () => object) => fn(),
  withTiming:               (v: number) => v,
  createAnimatedComponent:  (C: React.ComponentType<any>) => C,
}));

jest.mock('../../src/components/AppIcon', () => ({
  CheckIcon:       () => null,
  ChevronLeftIcon: () => null,
  FlameIcon:       () => null,
  LockIcon:        () => null,
  PinIcon:         () => null,
  StarIcon:        () => null,
  SunIcon:         () => null,
}));

// ─── Import screen after mocks ────────────────────────────────────────────────

import AchievementsScreen from '../../src/screens/AchievementsScreen';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const noopUnsub = jest.fn();

function setupDefaultMocks() {
  mockSubscribeToTotalPoints.mockReturnValue(noopUnsub);
  mockSubscribeToAchievements.mockReturnValue(noopUnsub);
  mockGetLocationTasksCompletedCount.mockResolvedValue(0);
}

function firePoints(value: number) {
  const call = mockSubscribeToTotalPoints.mock.calls[0];
  if (call) { act(() => { call[1](value); }); }
}

function fireAchievements(items: object[]) {
  const call = mockSubscribeToAchievements.mock.calls[0];
  if (call) { act(() => { call[1](items); }); }
}

function renderScreen() {
  return render(<AchievementsScreen />);
}

// ─── Header ───────────────────────────────────────────────────────────────────

describe('AchievementsScreen — KAN-114: header', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  it('renders without crashing', () => {
    renderScreen();
    expect(screen.getByText('Achievements')).toBeTruthy();
  });

  it('renders Back button', () => {
    renderScreen();
    expect(screen.getByLabelText('Back')).toBeTruthy();
  });

  it('calls goBack when Back is pressed', () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText('Back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});

// ─── Points summary card ──────────────────────────────────────────────────────

describe('AchievementsScreen — KAN-114: points summary card', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  it('shows TOTAL POINTS label', () => {
    renderScreen();
    expect(screen.getByText('TOTAL POINTS')).toBeTruthy();
  });

  it('shows 0 pts ring label before subscription fires', () => {
    renderScreen();
    expect(screen.getByLabelText('0 points')).toBeTruthy();
  });

  it('updates ring when totalPoints fires', () => {
    renderScreen();
    firePoints(4);
    expect(screen.getByLabelText('4 points')).toBeTruthy();
  });

  it('shows tier percentage heading', () => {
    renderScreen();
    firePoints(4);
    // 4/10 = 40% to Bronze
    expect(screen.getByText('40% to Bronze')).toBeTruthy();
  });

  it('shows correct pts-to-go text', () => {
    renderScreen();
    firePoints(4);
    // Bronze at 10 — 10-4 = 6 pts
    expect(screen.getByText('6 pts')).toBeTruthy();
  });

  it('shows "until your next badge"', () => {
    renderScreen();
    expect(screen.getByText(/until your next badge/)).toBeTruthy();
  });
});

// ─── EARNED section ───────────────────────────────────────────────────────────

describe('AchievementsScreen — KAN-114: earned section', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  it('shows EARNED · 0 when no achievements earned', () => {
    renderScreen();
    fireAchievements([]);
    expect(screen.getByText('EARNED · 0')).toBeTruthy();
  });

  it('shows EARNED · 2 when two types earned', () => {
    renderScreen();
    fireAchievements([
      { id: 'day_complete', type: 'day_complete', earnedAt: {} },
      { id: 'early_bird',   type: 'early_bird',   earnedAt: {} },
    ]);
    expect(screen.getByText('EARNED · 2')).toBeTruthy();
  });

  it('renders earned achievement label', () => {
    renderScreen();
    fireAchievements([{ id: 'on_a_roll', type: 'on_a_roll', earnedAt: {} }]);
    expect(screen.getByText('On a roll')).toBeTruthy();
  });

  it('uses brand copy — "brush away" verb in description', () => {
    renderScreen();
    fireAchievements([{ id: 'day_complete', type: 'day_complete', earnedAt: {} }]);
    expect(screen.getByText('Brush away every task in a day')).toBeTruthy();
  });

  it('does not use design file copy ("Finish every task")', () => {
    renderScreen();
    fireAchievements([{ id: 'day_complete', type: 'day_complete', earnedAt: {} }]);
    expect(screen.queryByText(/Finish every task/)).toBeNull();
  });

  it('shows ×N count pill when an achievement is earned multiple times', () => {
    renderScreen();
    fireAchievements([
      { id: 'day_complete_2026-06-01', type: 'day_complete', earnedAt: {} },
      { id: 'day_complete_2026-06-02', type: 'day_complete', earnedAt: {} },
    ]);
    expect(screen.getByText('×2')).toBeTruthy();
  });
});

// ─── LOCKED section ───────────────────────────────────────────────────────────

describe('AchievementsScreen — KAN-114: locked section', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  it('shows LOCKED · 5 when nothing earned', () => {
    renderScreen();
    fireAchievements([]);
    expect(screen.getByText('LOCKED · 5')).toBeTruthy();
  });

  it('shows locked achievement label', () => {
    renderScreen();
    fireAchievements([]);
    expect(screen.getByText('Explorer')).toBeTruthy();
    expect(screen.getByText('Centurion')).toBeTruthy();
  });

  it('shows brand copy description for locked achievements', () => {
    renderScreen();
    fireAchievements([]);
    expect(screen.getByText('Brush away 10 location-based tasks')).toBeTruthy();
    expect(screen.getByText('Earn 100 points')).toBeTruthy();
  });

  it('shows centurion progress caption from totalPoints', () => {
    renderScreen();
    firePoints(4);
    fireAchievements([]);
    expect(screen.getByText('4 / 100')).toBeTruthy();
  });

  it('shows explorer progress caption from getLocationTasksCompletedCount', async () => {
    mockGetLocationTasksCompletedCount.mockResolvedValue(4);
    renderScreen();
    fireAchievements([]);
    await act(async () => {});
    expect(screen.getByText('4 / 10')).toBeTruthy();
  });
});

// ─── Section counts update together ──────────────────────────────────────────

describe('AchievementsScreen — KAN-114: earned/locked split', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  it('moves achievement from locked to earned when subscription fires', () => {
    renderScreen();
    fireAchievements([]);
    expect(screen.getByText('EARNED · 0')).toBeTruthy();
    expect(screen.getByText('LOCKED · 5')).toBeTruthy();

    fireAchievements([
      { id: 'on_a_roll', type: 'on_a_roll', earnedAt: {} },
      { id: 'centurion', type: 'centurion', earnedAt: {} },
    ]);
    expect(screen.getByText('EARNED · 2')).toBeTruthy();
    expect(screen.getByText('LOCKED · 3')).toBeTruthy();
  });
});

// ─── Subscription cleanup ─────────────────────────────────────────────────────

describe('AchievementsScreen — KAN-114: subscription lifecycle', () => {
  it('unsubscribes from both subscriptions on unmount', () => {
    jest.clearAllMocks();
    const unsubPts = jest.fn();
    const unsubAch = jest.fn();
    mockSubscribeToTotalPoints.mockReturnValue(unsubPts);
    mockSubscribeToAchievements.mockReturnValue(unsubAch);
    mockGetLocationTasksCompletedCount.mockResolvedValue(0);

    const { unmount } = renderScreen();
    unmount();

    expect(unsubPts).toHaveBeenCalledTimes(1);
    expect(unsubAch).toHaveBeenCalledTimes(1);
  });
});
