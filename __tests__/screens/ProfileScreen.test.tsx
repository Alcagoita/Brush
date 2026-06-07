/**
 * ProfileScreen tests — KAN-112 / KAN-129
 *
 * Covers:
 *   - Identity card renders name, email; edit flow opens/closes
 *   - Points ring driven by real totalPoints subscription
 *   - "earned through achievements" copy (KAN-129 — not "completing tasks")
 *   - Streak chip shows real streak count; hidden when streak is 0
 *   - "pts to go" caption reflects live points (Bronze tier now at 50 pts)
 *   - Achievement medal strip: earned count uses AchievementsMap (KAN-129)
 *   - All 7 catalogue labels visible in the strip
 *   - "See all" navigates to Achievements screen (KAN-129 — no longer Alert)
 *   - "Settings" and "Share my profile" entries exist
 *   - All three Firestore subscriptions are cleaned up on unmount
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { AchievementsMap } from '../../src/types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSubscribeToTotalPoints   = jest.fn();
const mockSubscribeToCurrentStreak = jest.fn();
const mockSubscribeToAchievements  = jest.fn();
const mockGetUser                  = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  subscribeToTotalPoints:   (...args: unknown[]) => mockSubscribeToTotalPoints(...args),
  subscribeToCurrentStreak: (...args: unknown[]) => mockSubscribeToCurrentStreak(...args),
  subscribeToAchievements:  (...args: unknown[]) => mockSubscribeToAchievements(...args),
  getUser:                  (...args: unknown[]) => mockGetUser(...args),
  updateDisplayName:        jest.fn().mockResolvedValue(undefined),
  updateUsername:           jest.fn().mockResolvedValue(undefined),
  checkUsernameAvailable:   jest.fn().mockResolvedValue(true),
  validateUsername:         jest.fn(() => null),
  USERNAME_COOLDOWN_DAYS:   30,
}));

// KAN-129: getNextTier and TIER_LADDER now live in services/achievements.
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
    first_brush:  { id: 'first_brush',  label: 'First brush',  points: 5,  target: 1   },
    early_bird:   { id: 'early_bird',   label: 'Early bird',   points: 10, target: 1   },
    day_complete: { id: 'day_complete', label: 'Day complete', points: 15, target: 1   },
    on_a_roll:    { id: 'on_a_roll',    label: 'On a roll',    points: 20, target: 3   },
    explorer:     { id: 'explorer',     label: 'Explorer',     points: 25, target: 10  },
    centurion:    { id: 'centurion',    label: 'Centurion',    points: 30, target: 100 },
  },
}));

jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => ({
    currentUser: {
      uid:         'test-uid',
      email:       'test@example.com',
      displayName: 'Jane Doe',
      photoURL:    null,
    },
  }),
  updateProfile: jest.fn().mockResolvedValue(undefined),
}));

const mockGoBack   = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
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
  useSharedValue:          (v: number) => ({ value: v }),
  useAnimatedProps:        (fn: () => object) => fn(),
  withTiming:              (v: number) => v,
  createAnimatedComponent: (C: React.ComponentType<any>) => C,
}));

jest.mock('../../src/components/AppIcon', () => ({
  ChevronLeftIcon:  () => null,
  ChevronRightIcon: () => null,
  CameraIcon:       () => null,
  CheckIcon:        () => null,
  FlameIcon:        () => null,
  LockIcon:         () => null,
  MedalIcon:        () => null,
  PencilIcon:       () => null,
  PinIcon:          () => null,
  SettingsIcon:     () => null,
  ShareIcon:        () => null,
  StarIcon:         () => null,
}));

jest.mock('../../src/components/Avatar', () => {
  const React = require('react');
  const { View } = require('react-native');
  return (props: any) => React.createElement(View, { testID: 'avatar', ...props });
});

// ─── Imports ──────────────────────────────────────────────────────────────────

import ProfileScreen from '../../src/screens/ProfileScreen';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const noopUnsub = jest.fn();

function setupDefaultMocks() {
  mockSubscribeToTotalPoints.mockReturnValue(noopUnsub);
  mockSubscribeToCurrentStreak.mockReturnValue(noopUnsub);
  mockSubscribeToAchievements.mockReturnValue(noopUnsub);
  mockGetUser.mockResolvedValue(null);
}

function firePoints(value: number) {
  const call = mockSubscribeToTotalPoints.mock.calls[0];
  if (call) { act(() => { call[1](value); }); }
}

function fireStreak(value: number) {
  const call = mockSubscribeToCurrentStreak.mock.calls[0];
  if (call) { act(() => { call[1](value); }); }
}

/** KAN-129: subscription now delivers AchievementsMap, not Achievement[]. */
function fireAchievements(map: AchievementsMap) {
  const call = mockSubscribeToAchievements.mock.calls[0];
  if (call) { act(() => { call[1](map); }); }
}

function renderScreen() {
  return render(<ProfileScreen />);
}

// ─── Identity card ────────────────────────────────────────────────────────────

describe('ProfileScreen — KAN-112: identity card', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  it('renders without crashing', () => {
    renderScreen();
    expect(screen.getByText('Profile')).toBeTruthy();
  });

  it('shows display name from currentUser', () => {
    renderScreen();
    expect(screen.getByText('Jane Doe')).toBeTruthy();
  });

  it('shows email from currentUser', () => {
    renderScreen();
    expect(screen.getByText('test@example.com')).toBeTruthy();
  });

  it('shows the edit button', () => {
    renderScreen();
    expect(screen.getByLabelText('Edit profile')).toBeTruthy();
  });

  it('opens inline edit panel when pencil button is pressed', () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText('Edit profile'));
    expect(screen.getByLabelText('Edit name')).toBeTruthy();
    expect(screen.getByLabelText('Edit username')).toBeTruthy();
  });

  it('shows Cancel and Save in edit mode', () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText('Edit profile'));
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('closes edit panel when Cancel is pressed', () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText('Edit profile'));
    fireEvent.press(screen.getByText('Cancel'));
    expect(screen.queryByLabelText('Edit name')).toBeNull();
  });
});

// ─── Points hero card ─────────────────────────────────────────────────────────

describe('ProfileScreen — KAN-112 / KAN-129: points hero card', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  it('subscribes to total points with the correct uid', () => {
    renderScreen();
    expect(mockSubscribeToTotalPoints).toHaveBeenCalledWith(
      'test-uid', expect.any(Function), expect.any(Function),
    );
  });

  it('subscribes to current streak with the correct uid', () => {
    renderScreen();
    expect(mockSubscribeToCurrentStreak).toHaveBeenCalledWith(
      'test-uid', expect.any(Function), expect.any(Function),
    );
  });

  it('shows 0 points before subscription fires', () => {
    renderScreen();
    expect(screen.getByLabelText('0 points')).toBeTruthy();
  });

  it('updates the displayed point count when subscription fires', () => {
    renderScreen();
    firePoints(7);
    expect(screen.getByLabelText('7 points')).toBeTruthy();
  });

  it('shows Bronze badge when points < 50 (KAN-129 tier ladder)', () => {
    renderScreen();
    firePoints(4);
    expect(screen.getByText('Bronze badge')).toBeTruthy();
  });

  it('shows Silver badge when points are in the 50–149 range', () => {
    renderScreen();
    firePoints(60);
    expect(screen.getByText('Silver badge')).toBeTruthy();
  });

  it('shows correct pts-to-go — Bronze tier is now at 50 pts (KAN-129)', () => {
    renderScreen();
    firePoints(4);
    // Bronze at 50; 50 − 4 = 46 pts to go
    expect(screen.getByText('46 pts')).toBeTruthy();
  });

  it('shows "earned through achievements" copy (KAN-129)', () => {
    renderScreen();
    expect(screen.queryByText(/completing tasks/)).toBeNull();
    expect(screen.queryByText(/brushing away tasks/)).toBeNull();
    expect(screen.getByText(/earned through achievements/)).toBeTruthy();
  });

  it('shows streak chip when streak > 0', () => {
    renderScreen();
    fireStreak(3);
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText(/-day streak/)).toBeTruthy();
  });

  it('hides streak chip when streak is 0', () => {
    renderScreen();
    fireStreak(0);
    expect(screen.queryByText(/-day streak/)).toBeNull();
  });
});

// ─── Achievement medal strip ──────────────────────────────────────────────────

describe('ProfileScreen — KAN-112 / KAN-129: achievement medal strip', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  it('subscribes to achievements with the correct uid', () => {
    renderScreen();
    expect(mockSubscribeToAchievements).toHaveBeenCalledWith(
      'test-uid', expect.any(Function), expect.any(Function),
    );
  });

  it('shows the Achievements header', () => {
    renderScreen();
    expect(screen.getByText(/Achievements/)).toBeTruthy();
  });

  it('shows "See all" button', () => {
    renderScreen();
    expect(screen.getByLabelText('See all achievements')).toBeTruthy();
  });

  it('"See all" navigates to Achievements screen (KAN-129 — no longer Alert)', () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText('See all achievements'));
    expect(mockNavigate).toHaveBeenCalledWith('Achievements');
  });

  it('shows 0/7 count when no achievements earned (7 catalogue items)', () => {
    renderScreen();
    fireAchievements({});
    expect(screen.getByText(/ · 0\/7/)).toBeTruthy();
  });

  it('shows correct earned count when some achievements are earned', () => {
    renderScreen();
    fireAchievements({
      day_complete: { earnCount: 1, progress: 1, target: 1, earnedAt: null },
      early_bird:   { earnCount: 2, progress: 2, target: 1, earnedAt: null },
    });
    expect(screen.getByText(/ · 2\/7/)).toBeTruthy();
  });

  it('shows all 7 V1 catalogue labels in the medal strip', () => {
    renderScreen();
    expect(screen.getByText('First brush')).toBeTruthy();
    expect(screen.getByText('Early bird')).toBeTruthy();
    expect(screen.getByText('Day complete')).toBeTruthy();
    expect(screen.getByText('On a roll')).toBeTruthy();
    expect(screen.getByText('Explorer')).toBeTruthy();
    expect(screen.getByText('Centurion')).toBeTruthy();
    // challenge_winner label from COPY
    expect(screen.getByText('First to brush it away')).toBeTruthy();
  });
});

// ─── Navigation entries ───────────────────────────────────────────────────────

describe('ProfileScreen — KAN-112: navigation entries', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  it('renders "Share my profile" row', () => {
    renderScreen();
    expect(screen.getByLabelText('Share my profile')).toBeTruthy();
  });

  it('renders Settings entry row', () => {
    renderScreen();
    expect(screen.getByLabelText('Settings')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('renders "App & account" subtitle on Settings row', () => {
    renderScreen();
    expect(screen.getByText('App & account')).toBeTruthy();
  });

  it('navigates to Settings when Settings row is pressed', () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText('Settings'));
    expect(mockNavigate).toHaveBeenCalledWith('Settings');
  });
});

// ─── Subscription cleanup ─────────────────────────────────────────────────────

describe('ProfileScreen — KAN-112: subscription lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue(null);
  });

  it('unsubscribes from all three subscriptions on unmount', () => {
    const unsub1 = jest.fn();
    const unsub2 = jest.fn();
    const unsub3 = jest.fn();
    mockSubscribeToTotalPoints.mockReturnValue(unsub1);
    mockSubscribeToCurrentStreak.mockReturnValue(unsub2);
    mockSubscribeToAchievements.mockReturnValue(unsub3);

    const { unmount } = renderScreen();
    unmount();

    expect(unsub1).toHaveBeenCalledTimes(1);
    expect(unsub2).toHaveBeenCalledTimes(1);
    expect(unsub3).toHaveBeenCalledTimes(1);
  });
});
