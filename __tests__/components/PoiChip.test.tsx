import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PoiChip from '../../src/components/PoiChip';
import { setCopyLanguage } from '../../src/constants/copy';

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      surface: '#f6f5f1',
      line: '#ddd',
      muted: '#999',
      nearTint2: '#f9ede0',
      nearBorder: '#e8c9a0',
      nearText: '#7a4a20',
      accent: '#e8a86a',
    },
  }),
}));

jest.mock('../../src/components/AppIcon', () => ({
  PoiIcon: () => null,
}));

describe('PoiChip', () => {
  beforeEach(() => { setCopyLanguage('en'); });
  afterEach(() => { setCopyLanguage('en'); });

  it('reads the active English POI label', () => {
    render(<PoiChip poi="supermarket" />);
    expect(screen.getByText('Market')).toBeTruthy();
  });

  it('reads the active pt-PT POI label', () => {
    setCopyLanguage('pt-PT');
    render(<PoiChip poi="supermarket" />);
    expect(screen.getByText('Mercado')).toBeTruthy();
  });
});
