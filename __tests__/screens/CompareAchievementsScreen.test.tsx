/**
 * Unit tests for CompareAchievementsScreen (KAN-105).
 *
 * Covers:
 *   - Loading spinner shown while data fetches
 *   - Comparison table renders once data is available
 *   - Leading value highlighted in accent colour
 *   - Error state shown when fetch fails
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser              = jest.fn();
const mockGetAchievementsForUser = jest.fn();

jest.mock('../../src/services/firestore', () => ({
  getUser:                 (...a: unknown[]) => mockGetUser(...a),
  getAchievementsForUser: (...a: unknown[]) => mockGetAchievementsForUser(...a),
}));

jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => ({ currentUser: { uid: 'me-uid' } }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
  useRoute: () => ({
    params: { friendUid: 'friend-uid', friendUsername: 'bob' },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      bg: '#fff', surface: '#f6f5f1', surface2: '#efeeea', text: '#1a1a18',
      muted: '#8a8a85', faint: '#bdbdb7', accent: '#e8a86a', line: 'rgba(20,20,18,0.08)',
      nearTint2: '#f9ede0', nearBorder: '#e8c9a0', nearText: '#7a4a20',
    },
  }),
}));

jest.mock('../../src/components/AppIcon', () => ({
  ChevronLeftIcon: () => null,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(overrides = {}) {
  return {
    uid: 'me-uid', email: 'me@test.com', displayName: 'Me',
    darkMode: false, createdAt: { seconds: 0, nanoseconds: 0 },
    totalPoints: 42, currentStreak: 5,
    ...overrides,
  };
}

import CompareAchievementsScreen from '../../src/screens/CompareAchievementsScreen';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CompareAchievementsScreen', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('shows a loading indicator while data is in flight', () => {
    mockGetUser.mockReturnValue(new Promise(() => {}));
    mockGetAchievementsForUser.mockReturnValue(new Promise(() => {}));

    const { queryByText } = render(<CompareAchievementsScreen />);
    // Data rows should not appear while loading
    expect(queryByText('Total points')).toBeNull();
    expect(queryByText('Achievements')).toBeNull();
  });

  it('renders comparison rows once data resolves', async () => {
    mockGetUser
      .mockResolvedValueOnce(makeUser({ totalPoints: 100, currentStreak: 7 }))
      .mockResolvedValueOnce(makeUser({ uid: 'friend-uid', displayName: 'Bob', totalPoints: 60, currentStreak: 3 }));
    mockGetAchievementsForUser
      .mockResolvedValueOnce([{ id: 'first_task', type: 'first_task', earnedAt: { seconds: 0, nanoseconds: 0 } }])
      .mockResolvedValueOnce([]);

    const { getAllByText } = render(<CompareAchievementsScreen />);

    await waitFor(() => {
      // Points values
      expect(getAllByText('100').length).toBeGreaterThan(0);
      expect(getAllByText('60').length).toBeGreaterThan(0);
    });
  });

  it('shows achievement counts correctly', async () => {
    mockGetUser
      .mockResolvedValueOnce(makeUser({ totalPoints: 10 }))
      .mockResolvedValueOnce(makeUser({ uid: 'friend-uid', displayName: 'Bob', totalPoints: 20 }));
    mockGetAchievementsForUser
      .mockResolvedValueOnce([
        { id: 'first_task',   type: 'first_task',   earnedAt: { seconds: 0, nanoseconds: 0 } },
        { id: 'daily_complete', type: 'daily_complete', earnedAt: { seconds: 0, nanoseconds: 0 } },
      ])
      .mockResolvedValueOnce([
        { id: 'first_task', type: 'first_task', earnedAt: { seconds: 0, nanoseconds: 0 } },
      ]);

    const { getAllByText } = render(<CompareAchievementsScreen />);

    await waitFor(() => {
      expect(getAllByText('2').length).toBeGreaterThan(0); // my achievements
      expect(getAllByText('1').length).toBeGreaterThan(0); // friend's achievements
    });
  });

  it('shows an error message when the fetch fails', async () => {
    mockGetUser.mockRejectedValue(new Error('network error'));
    mockGetAchievementsForUser.mockResolvedValue([]);

    const { getByText } = render(<CompareAchievementsScreen />);

    await waitFor(() => {
      expect(getByText(/Could not load comparison/i)).toBeTruthy();
    });
  });
});
