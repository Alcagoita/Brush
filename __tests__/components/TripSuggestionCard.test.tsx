/**
 * TripSuggestionCard — KAN-245.
 *
 * Covers: renders the place/date line, tap fires onPress, dismiss fires
 * onDismiss without also firing onPress.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import TripSuggestionCard from '../../src/components/TripSuggestionCard';
import { COPY } from '../../src/constants/copy';
import type { CalendarSuggestion } from '../../src/services/tripSuggestions';

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      bg: '#fff', surface: '#f6f5f1', surface2: '#efeeea',
      text: '#000', muted: '#999', faint: '#ccc', line: 'rgba(20,20,18,0.08)',
    },
  }),
}));

jest.mock('../../src/theme/tokens', () => ({
  radius:  { card: 16, listIcon: 10 },
  spacing: { page: 22 },
}));

jest.mock('../../src/components/AppIcon', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const mock = (name: string) => () => React.createElement(Text, null, name);
  return { CloseIcon: mock('CloseIcon'), SuitcaseIcon: mock('SuitcaseIcon') };
});

const mockLogTap = jest.fn();
jest.mock('../../src/services/analytics', () => ({
  logTap: (...args: unknown[]) => mockLogTap(...args),
}));

const suggestion: CalendarSuggestion = {
  signalId: 'calendar:evt-1',
  eventId:  'evt-1',
  place:    'Berlin, Germany',
  dateISO:  '2026-07-15T09:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TripSuggestionCard', () => {
  it('renders the place and formatted date in the card line', () => {
    render(<TripSuggestionCard suggestion={suggestion} language="en" onPress={jest.fn()} onDismiss={jest.fn()} />);
    const day = new Date(suggestion.dateISO).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    expect(screen.getByText(COPY.tripSuggestion.cardLine(suggestion.place, day))).toBeTruthy();
  });

  it('formats the date in pt-PT when language is pt-PT', () => {
    render(<TripSuggestionCard suggestion={suggestion} language="pt-PT" onPress={jest.fn()} onDismiss={jest.fn()} />);
    const day = new Date(suggestion.dateISO).toLocaleDateString('pt-PT', { weekday: 'short', month: 'short', day: 'numeric' });
    expect(screen.getByText(COPY.tripSuggestion.cardLine(suggestion.place, day))).toBeTruthy();
  });

  it('tapping the card fires onPress', () => {
    const onPress = jest.fn();
    render(<TripSuggestionCard suggestion={suggestion} language="en" onPress={onPress} onDismiss={jest.fn()} />);
    fireEvent.press(screen.getByRole('button', { name: /Off to Berlin, Germany/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('tapping dismiss fires onDismiss, not onPress', () => {
    const onPress = jest.fn();
    const onDismiss = jest.fn();
    render(<TripSuggestionCard suggestion={suggestion} language="en" onPress={onPress} onDismiss={onDismiss} />);
    fireEvent.press(screen.getByRole('button', { name: COPY.tripSuggestion.dismissA11y }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });
});
