/**
 * KAN-134 — Header: achievement points chip.
 *
 * Verifies:
 *  - Chip always renders (even when points === 0)
 *  - Chip shows the correct points number
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

describe('Header — KAN-134 achievement points chip', () => {
  it('renders the points number when points > 0', () => {
    render(<Header displayName="Manel" points={42} />);
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('renders 0 when points is 0 (chip always visible)', () => {
    render(<Header displayName="Manel" points={0} />);
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('renders 0 when points prop is omitted (defaults to 0)', () => {
    render(<Header displayName="Manel" />);
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('calls onAchievementsPress when chip is tapped', () => {
    const onAchievements = jest.fn();
    render(
      <Header
        displayName="Manel"
        points={5}
        onAchievementsPress={onAchievements}
      />,
    );
    fireEvent.press(screen.getByLabelText('5 achievement points · view achievements'));
    expect(onAchievements).toHaveBeenCalledTimes(1);
  });

  it('chip accessibility label includes points count', () => {
    render(
      <Header displayName="Manel" points={100} onAchievementsPress={jest.fn()} />,
    );
    expect(screen.getByLabelText('100 achievement points · view achievements')).toBeTruthy();
  });
});
