/**
 * KAN-281 — ItineraryOptionsScreen.
 *
 * Covers:
 *  - loading state while resolving
 *  - empty state when nothing resolves
 *  - renders both "On foot" / "By car" cards from the same computed plan
 *  - tapping a card opens Maps with the correct origin/stops/travelmode
 *  - back button navigates back
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ItineraryOptionsScreen from '../../src/screens/ItineraryOptionsScreen';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      bg: '#fdfdfb', surface: '#f6f5f1', surface2: '#efeeea',
      line: 'rgba(20,20,18,0.08)', text: '#1a1a18', muted: '#8a8a85',
      faint: '#bdbdb7', accent: '#e8a86a',
    },
  }),
}));

jest.mock('../../src/components/AppIcon', () => {
  const React = require('react');
  const { View } = require('react-native');
  const stub = (props: any) => React.createElement(View, props);
  return { ChevronLeftIcon: stub, PoiIcon: stub };
});

const mockGetAuth = jest.fn(() => ({ currentUser: { uid: 'user-123' } }));
jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => mockGetAuth(),
}));

const mockGetTasksForDate = jest.fn().mockResolvedValue([]);
jest.mock('../../src/services/firestore', () => ({
  getTasksForDate: (...args: unknown[]) => mockGetTasksForDate(...args),
}));

const mockGetPositionLowAccuracy = jest.fn().mockResolvedValue({ lat: 38.7, lng: -9.1, accuracy: 10, timestamp: 0 });
jest.mock('../../src/services/geolocation', () => ({
  getPositionLowAccuracy: (...args: unknown[]) => mockGetPositionLowAccuracy(...args),
}));

const mockGetLastSearchCoords = jest.fn().mockReturnValue({ lat: 38.7, lng: -9.1 });
jest.mock('../../src/services/proximity', () => ({
  getLastSearchCoords: (...args: unknown[]) => mockGetLastSearchCoords(...args),
}));

const mockOpenMultiStopDirections = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/maps', () => ({
  openMultiStopDirections: (...args: unknown[]) => mockOpenMultiStopDirections(...args),
  formatDistance: (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`),
}));

const mockResolveTripDestinations = jest.fn();
const mockPlanTrip = jest.fn();
jest.mock('../../src/services/oneTripForAll', () => ({
  resolveTripDestinations: (...args: unknown[]) => mockResolveTripDestinations(...args),
  planTrip: (...args: unknown[]) => mockPlanTrip(...args),
}));

function makeStop(id: string, name: string, source: 'learned' | 'cache' = 'cache', distanceMeters = 400) {
  return {
    task: { id, title: name, category: 'errands', done: false, date: '2026-07-16', createdAt: {}, poi: 'pharmacy' },
    place: { internalId: id, name, lat: 38.71, lng: -9.11, distanceMeters, source },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAuth.mockReturnValue({ currentUser: { uid: 'user-123' } });
  mockGetTasksForDate.mockResolvedValue([]);
  mockGetPositionLowAccuracy.mockResolvedValue({ lat: 38.7, lng: -9.1, accuracy: 10, timestamp: 0 });
  mockGetLastSearchCoords.mockReturnValue({ lat: 38.7, lng: -9.1 });
  mockResolveTripDestinations.mockResolvedValue({ resolved: [], excludedCount: 0 });
  mockPlanTrip.mockReturnValue({ stops: [], excludedCount: 0, totalDistanceMeters: 0 });
});

describe('ItineraryOptionsScreen — loading', () => {
  it('shows a loading state before resolution settles', () => {
    render(<ItineraryOptionsScreen />);
    expect(screen.getByText('Finding the way…')).toBeTruthy();
  });

  it('calls navigation.goBack when the back button is pressed', () => {
    render(<ItineraryOptionsScreen />);
    fireEvent.press(screen.getByLabelText('Back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});

describe('ItineraryOptionsScreen — empty', () => {
  it('shows the empty state when nothing resolves', async () => {
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByText("Couldn't find places for any of these right now.")).toBeTruthy());
  });
});

describe('ItineraryOptionsScreen — resolved trip', () => {
  const stops = [makeStop('t1', 'Farmácia Silva', 'learned'), makeStop('t2', 'Mercado da Vila', 'cache', 400)];

  beforeEach(() => {
    mockPlanTrip.mockReturnValue({ stops, excludedCount: 1, totalDistanceMeters: 1500 });
  });

  it('renders both On foot and By car cards from the same plan', async () => {
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByText('On foot')).toBeTruthy());
    expect(screen.getByText('By car')).toBeTruthy();
    expect(screen.getAllByText(/Farmácia Silva/)).toHaveLength(2); // once per card
    expect(screen.getAllByText(/Mercado da Vila/)).toHaveLength(2);
  });

  it('shows the learned-place and distance labels correctly', async () => {
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getAllByText(/Farmácia Silva · your usual/)[0]).toBeTruthy());
    expect(screen.getAllByText(/Mercado da Vila · 400 m/)[0]).toBeTruthy();
  });

  it('shows the exclusion line when tasks were excluded', async () => {
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getAllByText("Couldn't find a place for 1 of them")[0]).toBeTruthy());
  });

  it('shows the approximate total distance line', async () => {
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getAllByText('About 1.5 km all together')[0]).toBeTruthy());
  });

  it('tapping the "On foot" card opens Maps with walking mode', async () => {
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByText('On foot')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('itinerary-card-walking'));
    });

    expect(mockOpenMultiStopDirections).toHaveBeenCalledWith(
      { lat: 38.7, lng: -9.1 },
      [stops[0].place, stops[1].place],
      'walking',
    );
  });

  it('tapping the "By car" card opens Maps with driving mode', async () => {
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByText('By car')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('itinerary-card-driving'));
    });

    expect(mockOpenMultiStopDirections).toHaveBeenCalledWith(
      { lat: 38.7, lng: -9.1 },
      [stops[0].place, stops[1].place],
      'driving',
    );
  });
});
