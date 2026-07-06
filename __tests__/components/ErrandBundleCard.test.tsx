/**
 * ErrandBundleCard — KAN-235.
 *
 * Covers: card renders the task-count/anchor line, tap opens a sheet listing
 * every bundled task with its place + distance and an "Open in Maps" action
 * for the anchor, and the dismiss control calls onDismiss without opening
 * the sheet.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import ErrandBundleCard from '../../src/components/ErrandBundleCard';
import { COPY } from '../../src/constants/copy';
import type { ErrandBundle } from '../../src/services/errandBundles';
import type { Task } from '../../src/types';

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      bg: '#fff', surface: '#f6f5f1', surface2: '#efeeea',
      text: '#000', muted: '#999', faint: '#ccc', line: 'rgba(20,20,18,0.08)',
      scrim: 'rgba(0,0,0,0.4)',
    },
  }),
}));

jest.mock('../../src/theme/tokens', () => ({
  radius:  { card: 16, listIcon: 10, chip: 9999, ctaBtn: 12 },
  spacing: { page: 22 },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../src/components/AppIcon', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const mock = (name: string) => () => React.createElement(Text, null, name);
  return { CloseIcon: mock('CloseIcon'), PinIcon: mock('PinIcon'), ChevronRightIcon: mock('ChevronRightIcon') };
});

const mockOpenInMaps = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/maps', () => ({
  openInMaps: (...args: unknown[]) => mockOpenInMaps(...args),
  formatDistance: (m: number) => `${Math.round(m)} m`,
}));

const mockLogTap = jest.fn();
jest.mock('../../src/services/analytics', () => ({
  logTap: (...args: unknown[]) => mockLogTap(...args),
}));

function makeTask(overrides: Partial<Task> = {}): Task {
  return { id: 't1', title: 'Get cash', category: 'errands', done: false, poi: 'atm', date: '2026-07-06', createdAt: {} as Task['createdAt'], ...overrides };
}

function makeBundle(): ErrandBundle {
  return {
    anchor: { placeId: 'anchor-1', name: 'Mercado da Vila', lat: 1, lng: 2, distanceMeters: 300 },
    entries: [
      { task: makeTask({ id: 't1', title: 'Get cash' }), place: { placeId: 'p1', name: 'ATM Central', lat: 1, lng: 2, distanceMeters: 250 }, distanceToAnchorMeters: 50 },
      { task: makeTask({ id: 't2', title: 'Buy stamps', poi: 'post' }), place: { placeId: 'p2', name: 'Post Office', lat: 1, lng: 2, distanceMeters: 320 }, distanceToAnchorMeters: 90 },
    ],
    totalWalkDistanceMeters: 140,
  };
}

beforeEach(() => { jest.clearAllMocks(); });

describe('ErrandBundleCard', () => {
  it('shows the card line with task count and anchor name', () => {
    render(<ErrandBundleCard bundle={makeBundle()} onDismiss={jest.fn()} />);
    expect(screen.getByText(COPY.errandBundle.cardLine(2, 'Mercado da Vila'))).toBeTruthy();
  });

  it('opens the sheet on tap, listing every bundled task with its place and distance, plus an anchor maps action', async () => {
    render(<ErrandBundleCard bundle={makeBundle()} onDismiss={jest.fn()} />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.errandBundle.cardA11y(2, 'Mercado da Vila')));
    });

    expect(screen.getByText(COPY.errandBundle.sheetTitle('Mercado da Vila'))).toBeTruthy();
    expect(screen.getByText('Get cash')).toBeTruthy();
    expect(screen.getByText('ATM Central · 250 m')).toBeTruthy();
    expect(screen.getByText('Buy stamps')).toBeTruthy();
    expect(screen.getByText('Post Office · 320 m')).toBeTruthy();
    expect(screen.getByLabelText(COPY.errandBundle.openAnchorInMaps('Mercado da Vila'))).toBeTruthy();
  });

  it('opens the anchor in Maps when the maps button is pressed', async () => {
    render(<ErrandBundleCard bundle={makeBundle()} onDismiss={jest.fn()} />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.errandBundle.cardA11y(2, 'Mercado da Vila')));
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.errandBundle.openAnchorInMaps('Mercado da Vila')));
    });
    expect(mockOpenInMaps).toHaveBeenCalledWith(1, 2, 'Mercado da Vila');
  });

  it('calls onDismiss without opening the sheet when the dismiss control is pressed', () => {
    const onDismiss = jest.fn();
    render(<ErrandBundleCard bundle={makeBundle()} onDismiss={onDismiss} />);
    fireEvent.press(screen.getByLabelText(COPY.errandBundle.dismissA11y));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(COPY.errandBundle.sheetTitle('Mercado da Vila'))).toBeNull();
  });

  it('closes the sheet when the close button is pressed', async () => {
    jest.useFakeTimers();
    render(<ErrandBundleCard bundle={makeBundle()} onDismiss={jest.fn()} />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText(COPY.errandBundle.cardA11y(2, 'Mercado da Vila')));
    });
    expect(screen.getByText(COPY.errandBundle.sheetTitle('Mercado da Vila'))).toBeTruthy();

    act(() => {
      fireEvent.press(screen.getByLabelText(COPY.errandBundle.closeA11y));
    });
    act(() => { jest.advanceTimersByTime(200); });
    expect(screen.queryByText(COPY.errandBundle.sheetTitle('Mercado da Vila'))).toBeNull();
    jest.useRealTimers();
  });
});
