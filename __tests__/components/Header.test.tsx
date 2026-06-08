/**
 * KAN-134 — Header: streak chip.
 *
 * Verifies:
 *  - Chip renders when streak > 0
 *  - Chip is absent when streak === 0 (or omitted)
 *  - Chip shows the correct streak number
 *  - Tapping chip calls onAchievementsPress
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Header from '../../src/components/Header';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      bg: '#fdfcfa', text: '#1f1c16', muted: '#8b857a',
      accent: '#e8a86a', nearTint: '#fdf7f0', nearText: '#7a4a20',
      line: 'rgba(40,33,20,0.08)', surface2: '#ece9e2',
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('../../src/components/Avatar', () => () => null);

jest.mock('../../src/components/AppIcon', () => ({
  BellIcon:         () => null,
  UsersIcon:        () => null,
  FilledFlameIcon:  () => null,
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Header — KAN-134 streak chip', () => {
  it('renders the streak number when streak > 0', () => {
    render(
      <Header displayName="Manel" streak={7} />,
    );
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('does NOT render a streak number when streak is 0', () => {
    render(
      <Header displayName="Manel" streak={0} />,
    );
    expect(screen.queryByText('0')).toBeNull();
  });

  it('does NOT render a streak chip when streak prop is omitted', () => {
    render(
      <Header displayName="Manel" />,
    );
    // No digit should appear in the streak position
    expect(screen.queryByText(/^\d+$/)).toBeNull();
  });

  it('calls onAchievementsPress when streak chip is tapped', () => {
    const onAchievements = jest.fn();
    render(
      <Header
        displayName="Manel"
        streak={5}
        onAchievementsPress={onAchievements}
      />,
    );
    // RNTL 12+ uses getByLabelText instead of getByAccessibilityLabel
    fireEvent.press(screen.getByLabelText('5 day streak · achievements'));
    expect(onAchievements).toHaveBeenCalledTimes(1);
  });

  it('chip accessibility label includes streak count', () => {
    render(
      <Header displayName="Manel" streak={12} onAchievementsPress={jest.fn()} />,
    );
    expect(screen.getByLabelText('12 day streak · achievements')).toBeTruthy();
  });
});
