/**
 * ProfileScreen tests — KAN-112
 *
 * Covers:
 *   - Identity card renders name, email; edit flow opens/closes
 *   - Points ring driven by real totalPoints subscription
 *   - "earned by brushing away tasks" copy (not "completing tasks")
 *   - Streak chip shows real streak count; hidden when streak is 0
 *   - "pts to go" caption reflects live points
 *   - Achievement medal strip: earned count, all 5 V1 labels visible
 *   - "See all" achievements, "Settings", and "Share my profile" entries exist
 *   - All three Firestore subscriptions are cleaned up on unmount
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

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
  useSharedValue:         (v: number) => ({ value: v }),
  useAnimatedProps:       (fn: () => object) => fn(),
  withTiming:             (v: number) => v,
  createAnimatedComponent: (C: React.ComponentType<any>) => C,
}));

jest.mock('../../src/components/AppIcon', () => ({
  ChevronLeftIcon:  () => null,
  ChevronRightIcon: () => null,
  CameraIcon:       () => null,
  FlameIcon:        () => null,
  LockIcon:         () => null,
  MedalIcon:        () => null,
  PencilIcon:       () => null,
  SettingsIcon:     () => null,
  ShareIcon:        () => null,
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

/** Set all subscriptions to return a no-op unsubscribe (default state). */
function setupDefaultMocks() {
  mockSubscribeToTotalPoints.mockReturnValue(noopUnsub);
  mockSubscribeToCurrentStreak.mockReturnValue(noopUnsub);
  mockSubscribeToAchievements.mockReturnValue(noopUnsub);
  mockGetUser.mockResolvedValue(null);
}

/** Fire the totalPoints subscription callback after render. */
function firePoints(value: number) {
  const call = mockSubscribeToTotalPoints.mock.calls[0];
  if (call) { act(() => { call[1](value); }); }
}

/** Fire the currentStreak subscription callback after render. */
function fireStreak(value: number) {
  const call = mockSubscribeToCurrentStreak.mock.calls[0];
  if (call) { act(() => { call[1](value); }); }
}

/** Fire the achievements subscription callback after render. */
function fireAchievements(items: object[]) {
  const call = mockSubscribeToAchievements.mock.calls[0];
  if (call) { act(() => { call[1](items); }); }
}

function renderScreen() {
  return render(<ProfileScreen />);
}

// ─── Identity card ────────────────────────────────────────────────────────────

describe('ProfileScreen — KAN-112: identity card', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

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

describe('ProfileScreen — KAN-112: points hero card', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

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

  it('shows the next tier name when points < tierAt', () => {
    renderScreen();
    firePoints(4);
    expect(screen.getByText('Bronze badge')).toBeTruthy();
  });

  it('shows "earned by brushing away tasks" — not "completing tasks"', () => {
    renderScreen();
    expect(screen.queryByText(/completing tasks/)).toBeNull();
    expect(screen.getByText(/brushing away tasks/)).toBeTruthy();
  });

  it('shows correct pts-to-go when totalPoints is updated', () => {
    renderScreen();
    firePoints(4);
    // Bronze tier at 10 pts; 10 − 4 = 6 pts to go
    expect(screen.getByText('6 pts')).toBeTruthy();
  });

  it('shows streak chip when streak > 0', () => {
    renderScreen();
    fireStreak(3);
    // streak chip: nested Text renders "3" + "-day streak" inside one parent
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText(/day streak/)).toBeTruthy();
  });

  it('hides streak chip when streak is 0', () => {
    renderScreen();
    fireStreak(0);
    expect(screen.queryByText('-day streak')).toBeNull();
  });
});

// ─── Achievement medal strip ──────────────────────────────────────────────────

describe('ProfileScreen — KAN-112: achievement medal strip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

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

  it('shows 0/5 count when no achievements earned', () => {
    renderScreen();
    fireAchievements([]);
    expect(screen.getByText(' · 0/5')).toBeTruthy();
  });

  it('shows correct earned/total count when some achievements are earned', () => {
    renderScreen();
    fireAchievements([
      { id: 'day_complete', type: 'day_complete', earnedAt: {} },
      { id: 'early_bird',   type: 'early_bird',   earnedAt: {} },
    ]);
    expect(screen.getByText(' · 2/5')).toBeTruthy();
  });

  it('shows all 5 V1 achievement labels in the strip', () => {
    renderScreen();
    expect(screen.getByText('Day complete')).toBeTruthy();
    expect(screen.getByText('Early bird')).toBeTruthy();
    expect(screen.getByText('On a roll')).toBeTruthy();
    expect(screen.getByText('Explorer')).toBeTruthy();
    expect(screen.getByText('Centurion')).toBeTruthy();
  });
});

// ─── Navigation entries ───────────────────────────────────────────────────────

describe('ProfileScreen — KAN-112: navigation entries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

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
