import React from 'react';
import { render } from '@testing-library/react-native';
import TierMedal from '../../src/components/TierMedal';
import { TIERS } from '../../src/constants/tiers';

jest.mock('../../src/theme/ThemeContext', () => ({
  useTheme: () => ({
    palette: {
      ringTrack: 'rgba(20,20,18,0.08)',
      text:      '#1a1a18',
      muted:     '#8a8a85',
      line:      'rgba(20,20,18,0.08)',
    },
    dark: false,
  }),
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children?: React.ReactNode }) => <View testID="svg">{children}</View>,
    Circle: (props: Record<string, unknown>) => {
      const { View: V } = require('react-native');
      return <V testID={`circle-${props.stroke}`} />;
    },
  };
});

jest.mock('../../src/components/AppIcon', () => ({
  StarIcon: () => null,
}));

const TIN = TIERS[0]; // { name: 'Tin', at: 0, color: '#9b9690' }
const GOLD = TIERS[3]; // { name: 'Gold', at: 500, color: '#c0972d' }

describe('TierMedal', () => {
  it('renders without crashing (no ring, default pct=null)', () => {
    // pct defaults to null → no ring SVG rendered, just the coin disc
    const { queryByTestId } = render(<TierMedal tier={TIN} />);
    expect(queryByTestId('svg')).toBeNull();
  });

  it('shows ring SVG when pct is provided and not earned', () => {
    const { getByTestId } = render(<TierMedal tier={GOLD} pct={0.5} earned={false} />);
    expect(getByTestId('svg')).toBeTruthy();
  });

  it('does not render SVG ring when earned=true', () => {
    const { queryByTestId } = render(<TierMedal tier={GOLD} earned={true} pct={null} />);
    // SVG (ring) should not be rendered
    expect(queryByTestId('svg')).toBeNull();
  });

  it('does not render SVG ring when pct=null', () => {
    const { queryByTestId } = render(<TierMedal tier={TIN} earned={false} pct={null} />);
    expect(queryByTestId('svg')).toBeNull();
  });

  it('defaults to size 96', () => {
    // Just confirms it renders with default props without crashing
    render(<TierMedal tier={TIN} />);
  });
});
