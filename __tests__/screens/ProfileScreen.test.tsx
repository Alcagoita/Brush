/**
 * ProfileScreen tests — KAN-112 / KAN-129 / KAN-137
 *
 * KAN-137 changes tested:
 *   - Points hero card: "TOTAL POINTS" label, 56px number, toGo caption
 *   - TierMedal renders with correct props
 *   - Streak chip: shows count when > 0, hidden when = 0
 *   - "POINTS & ACHIEVEMENTS" section label present
 *   - Old ring-based copy ("Bronze badge", "earned through achievements") removed
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

jest.mock('../../src/services/achievements', () => ({
  ACHIEVEMENT_DEFS: {
    first_brush:  { id: 'first_brush',  label: 'First brush',  points: 5,  target: 1   },
    early_bird:   { id: 'early_bird',   label: 'Early bird',   points: 10, target: 1   },
    day_complete: { id: 'day_complete', label: 'Day complete', points: 15, target: 1   },
    on_a_roll:    { id: 'on_a_roll',    label: 'On a roll',    points: 20, target: 3   },
    explorer:     { id: 'explorer',     label: 'Explorer',     points: 25, target: 10  },
    centurion:    { id: 'centurion',    label: 'Centurion',    points: 30, target: 100 },
  },
}));

jest.mock('../../src/constants/tiers', () => ({
  deriveTierStanding: (pts: number) => {
    if (pts < 50)  { return { nextTier: { name: 'Bronze',    at: 50,  color: '#b3793f' }, maxed: false, bandPct: pts / 50,       toGo: 50  - pts }; }
    if (pts < 200) { return { nextTier: { name: 'Silver',    at: 200, color: '#7d93a4' }, maxed: false, bandPct: (pts-50) / 150, toGo: 200 - pts }; }
    return           { nextTier: { name: 'Vibranium', at: 3000, color: '#7256a6' }, maxed: true,  bandPct: 1,                 toGo: 0          };
  },
}));

const mockTierMedal = jest.fn(() => null);
jest.mock('../../src/components/TierMedal', () => (props: object) => {
  mockTierMedal(props);
  return null;
});

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
  const Stub = (props: object) => React.createElement(View, props);
  return { __esModule: true, default: Stub, Circle: Stub, Path: Stub, Rect: Stub, Line: Stub };
});

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
  return (props: object) => React.createElement(View, { testID: 'avatar', ...props });
});

jest.mock('../../src/components/ShareProfileSheet', () => () => null);

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

function fireAchievements(map: AchievementsMap) {
  const call = mockSubscribeToAchievements.mock.calls[0];
  if (call) { act(() => { call[1](map); }); }
}

function renderScreen() {
  return render(<ProfileScreen />);
}

// ─── Identity card ────────────────────────────────────────────────────────────

describe('ProfileScreen — identity card', () => {
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

// ─── Subscriptions ────────────────────────────────────────────────────────────

describe('ProfileScreen — subscriptions', () => {
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

  it('subscribes to achievements with the correct uid', () => {
    renderScreen();
    expect(mockSubscribeToAchievements).toHaveBeenCalledWith(
      'test-uid', expect.any(Function), expect.any(Function),
    );
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

// ─── Points hero card — KAN-137 ───────────────────────────────────────────────

describe('ProfileScreen — KAN-137: points hero card', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  it('shows TOTAL POINTS label', () => {
    renderScreen();
    expect(screen.getByText('TOTAL POINTS')).toBeTruthy();
  });

  it('shows POINTS & ACHIEVEMENTS section label', () => {
    renderScreen();
    expect(screen.getByText('POINTS & ACHIEVEMENTS')).toBeTruthy();
  });

  it('shows 0 points before subscription fires', () => {
    renderScreen();
    expect(screen.getByLabelText('0 points')).toBeTruthy();
  });

  it('shows live point total when subscription fires', () => {
    renderScreen();
    firePoints(42);
    expect(screen.getByLabelText('42 points')).toBeTruthy();
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

  it('renders TierMedal with size 92', () => {
    renderScreen();
    expect(mockTierMedal).toHaveBeenCalledWith(
      expect.objectContaining({ size: 92 }),
    );
  });

  it('passes earned=true and pct=null to TierMedal when maxed', () => {
    renderScreen();
    firePoints(3000);
    const lastCall = mockTierMedal.mock.calls[mockTierMedal.mock.calls.length - 1][0] as Record<string, unknown>;
    expect(lastCall.earned).toBe(true);
    expect(lastCall.pct).toBeNull();
  });

  it('passes earned=false and numeric bandPct when not maxed', () => {
    renderScreen();
    firePoints(25);
    // 25 pts → bandPct = 25/50 = 0.5
    const lastCall = mockTierMedal.mock.calls[mockTierMedal.mock.calls.length - 1][0] as Record<string, unknown>;
    expect(lastCall.earned).toBe(false);
    expect(typeof lastCall.pct).toBe('number');
  });

  it('does not render old ring-based copy', () => {
    renderScreen();
    expect(screen.queryByText(/earned through achievements/)).toBeNull();
    expect(screen.queryByText(/NEXT REWARD/)).toBeNull();
    expect(screen.queryByText(/badge$/)).toBeNull();
  });
});

// ─── Streak chip ─────────────────────────────────────────────────────────────

describe('ProfileScreen — KAN-137: streak chip', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  it('shows streak chip when streak > 0', () => {
    renderScreen();
    fireStreak(5);
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText(/-day streak/)).toBeTruthy();
  });

  it('hides streak chip when streak is 0', () => {
    renderScreen();
    fireStreak(0);
    expect(screen.queryByText(/-day streak/)).toBeNull();
  });
});

// ─── Achievement medal strip ──────────────────────────────────────────────────

describe('ProfileScreen — achievement medal strip', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  it('shows the Achievements header', () => {
    renderScreen();
    expect(screen.getByText(/Achievements/)).toBeTruthy();
  });

  it('shows "See all" button', () => {
    renderScreen();
    expect(screen.getByLabelText('See all achievements')).toBeTruthy();
  });

  it('"See all" navigates to Achievements screen', () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText('See all achievements'));
    expect(mockNavigate).toHaveBeenCalledWith('Achievements');
  });

  it('shows 0/7 count when no achievements earned', () => {
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
    expect(screen.getByText('First to brush it away')).toBeTruthy();
  });
});

// ─── Navigation entries ───────────────────────────────────────────────────────

describe('ProfileScreen — navigation entries', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  it('renders "Share my profile" row', () => {
    renderScreen();
    expect(screen.getByLabelText('Share my profile')).toBeTruthy();
  });

  it('renders Settings entry row', () => {
    renderScreen();
    expect(screen.getByLabelText('Settings')).toBeTruthy();
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
