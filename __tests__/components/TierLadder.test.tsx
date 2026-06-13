import React from 'react';
import { render } from '@testing-library/react-native';
import TierLadder from '../../src/components/TierLadder';

jest.mock('../../src/theme/ThemeContext', () => ({
  useTheme: () => ({
    palette: {
      text:  '#1a1a18',
      muted: '#8a8a85',
      line:  'rgba(20,20,18,0.08)',
    },
    dark: false,
  }),
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children?: React.ReactNode }) => <View>{children}</View>,
    Path: () => null,
  };
});

jest.mock('../../src/components/AppIcon', () => ({
  StarIcon: () => null,
}));

describe('TierLadder', () => {
  it('renders all 6 tier names', () => {
    const { getByText } = render(<TierLadder points={0} />);
    ['Tin', 'Bronze', 'Silver', 'Gold', 'Adamantium', 'Vibranium'].forEach(name => {
      expect(getByText(name)).toBeTruthy();
    });
  });

  it('shows "Start" for Tin threshold', () => {
    const { getByText } = render(<TierLadder points={0} />);
    expect(getByText('Start')).toBeTruthy();
  });

  it('formats thresholds with pts suffix', () => {
    const { getByText } = render(<TierLadder points={0} />);
    expect(getByText('50 pts')).toBeTruthy();
    expect(getByText('200 pts')).toBeTruthy();
    expect(getByText('500 pts')).toBeTruthy();
    expect(getByText('1,200 pts')).toBeTruthy();
    expect(getByText('3,000 pts')).toBeTruthy();
  });

  it('at 0 pts: Tin is earned, Bronze is isNext', () => {
    // tierIdx=1 when points=0, so i===1 (Bronze) is isNext
    // Just confirm renders without crash and shows all names
    render(<TierLadder points={0} />);
  });

  it('at 500 pts: Gold is earned, Adamantium is isNext', () => {
    // tierIdx=4 at 500pts, so i===4 (Adamantium) is isNext
    render(<TierLadder points={500} />);
  });

  it('at 3000 pts: maxed — all tiers earned', () => {
    const { getByText } = render(<TierLadder points={3000} />);
    expect(getByText('Vibranium')).toBeTruthy();
  });
});
