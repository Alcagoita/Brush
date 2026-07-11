/**
 * KAN-250 — PlacesIKnowScreen back button.
 *
 * The only entry point to this screen is TripPlanner's post-download "done"
 * flow (navigation.navigate('PlacesIKnow')) — goBack() would land back on
 * the just-finished download screen instead of Calendar. Covers the fix:
 * the back button must always navigate to Calendar, not goBack().
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockUsePlacesIKnow = jest.fn();
jest.mock('../../src/hooks/usePlacesIKnow', () => ({
  usePlacesIKnow: () => mockUsePlacesIKnow(),
}));

// PlacesIKnowScreen imports formatTripSizeMb from tripDownload.ts, which
// transitively pulls in NetInfo/habitatCache (expo-sqlite, ESM) — not under
// test here (see useTripPlanner.test.ts for the same precedent).
jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock'),
);
jest.mock('../../src/services/habitatCache');
jest.mock('../../src/services/firestore/trips', () => ({
  updateTrip: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('../../src/theme', () => ({
  useTheme: () => ({
    palette: {
      bg: '#fff', surface: '#f6f5f1', surface2: '#efeeea', text: '#1a1a18',
      muted: '#8a8a85', faint: '#bdbdb7', line: 'rgba(0,0,0,0.08)', accent: '#e8a86a',
    },
  }),
}));

jest.mock('../../src/components/AppIcon', () => ({
  ChevronLeftIcon: () => null,
  SuitcaseIcon:     () => null,
  CloudOffIcon:     () => null,
}));

import PlacesIKnowScreen from '../../src/screens/PlacesIKnowScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockUsePlacesIKnow.mockReturnValue({
    loading: false,
    habitatSizeBytes: 0,
    trips: [],
    refresh: jest.fn().mockResolvedValue(undefined),
    refreshingTripId: null,
    refreshTrip: jest.fn(),
    deleteTrip: jest.fn(),
  });
});

describe('PlacesIKnowScreen — back navigation (KAN-250)', () => {
  it('navigates to Calendar when the back button is pressed', () => {
    render(<PlacesIKnowScreen />);
    fireEvent.press(screen.getByLabelText('Back'));

    expect(mockNavigate).toHaveBeenCalledWith('Calendar');
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});

describe('PlacesIKnowScreen — off-grid rows (KAN-246)', () => {
  it('shows the off-grid "until HH:mm" line instead of the trip dates/expiry line', () => {
    mockUsePlacesIKnow.mockReturnValue({
      loading: false,
      habitatSizeBytes: 0,
      trips: [{
        id: 'og-1', destination: 'this area', placeRef: '',
        centerLat: 0, centerLng: 0, areaRadius: 15_000,
        cacheAreaId: 'og_1', expiresAt: new Date(2026, 6, 15, 18, 0).getTime(),
        kind: 'offgrid',
        createdAt: {} as unknown,
      }],
      refresh: jest.fn().mockResolvedValue(undefined),
      refreshingTripId: null,
      refreshTrip: jest.fn(),
      deleteTrip: jest.fn(),
    });

    render(<PlacesIKnowScreen />);

    expect(screen.getByText('this area')).toBeTruthy();
    expect(screen.getByText("I'll know this area until 18:00.")).toBeTruthy();
    expect(screen.queryByText('No dates set')).toBeNull();
  });

  it('a regular trip still shows the normal dates/expiry line, unaffected', () => {
    mockUsePlacesIKnow.mockReturnValue({
      loading: false,
      habitatSizeBytes: 0,
      trips: [{
        id: 'trip-1', destination: 'Faro', placeRef: 'p1',
        centerLat: 0, centerLng: 0, areaRadius: 5_000,
        cacheAreaId: 'ta_1', expiresAt: Date.now() + 1_000_000,
        createdAt: {} as unknown,
      }],
      refresh: jest.fn().mockResolvedValue(undefined),
      refreshingTripId: null,
      refreshTrip: jest.fn(),
      deleteTrip: jest.fn(),
    });

    render(<PlacesIKnowScreen />);

    expect(screen.getByText('Faro')).toBeTruthy();
    expect(screen.getByText(/No dates set/)).toBeTruthy();
  });
});
