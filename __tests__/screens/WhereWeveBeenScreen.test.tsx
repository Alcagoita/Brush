/**
 * KAN-257 — WhereWeveBeenScreen.
 *
 * Covers:
 *   - renders year groups with destination + dates (no counts anywhere)
 *   - back button navigates back
 *   - "Forget this trip" — confirm sheet calls forgetTrip; cancel doesn't
 *   - highlightTripId param renders without crashing (visual-only highlight)
 */

import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockUseWhereWeveBeen = jest.fn();
jest.mock('../../src/hooks/useWhereWeveBeen', () => ({
  useWhereWeveBeen: () => mockUseWhereWeveBeen(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockGoBack = jest.fn();
let mockRouteParams: { highlightTripId?: string } | undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
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
}));

import WhereWeveBeenScreen from '../../src/screens/WhereWeveBeenScreen';

function makeTrip(overrides: Partial<any> = {}) {
  return {
    id: 'trip-1', destination: 'Faro', placeRef: 'p1',
    centerLat: 0, centerLng: 0, areaRadius: 15_000,
    cacheAreaId: 'ta_1', expiresAt: 0,
    startDate: '2025-05-01', endDate: '2025-05-10',
    createdAt: {} as unknown,
    ...overrides,
  };
}

const mockForgetTrip = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = undefined;
  mockUseWhereWeveBeen.mockReturnValue({
    loading: false,
    yearGroups: [],
    forgetTrip: mockForgetTrip,
  });
});

describe('WhereWeveBeenScreen — rendering', () => {
  it('shows a loading indicator instead of the list while loading', () => {
    mockUseWhereWeveBeen.mockReturnValue({
      loading: true,
      yearGroups: [],
      forgetTrip: mockForgetTrip,
    });

    render(<WhereWeveBeenScreen />);

    expect(screen.getByTestId('where-weve-been-loading')).toBeTruthy();
  });

  it('renders destination and dates, grouped by year, with no counts anywhere', () => {
    mockUseWhereWeveBeen.mockReturnValue({
      loading: false,
      yearGroups: [
        { year: '2025', trips: [makeTrip({ id: 't1', destination: 'Faro', startDate: '2025-05-01', endDate: '2025-05-10' })] },
        { year: '2024', trips: [makeTrip({ id: 't2', destination: 'Tokyo', startDate: '2024-11-01', endDate: '2024-11-05' })] },
      ],
      forgetTrip: mockForgetTrip,
    });

    render(<WhereWeveBeenScreen />);

    expect(screen.getByText('2025')).toBeTruthy();
    expect(screen.getByText('2024')).toBeTruthy();
    expect(screen.getByText('Faro')).toBeTruthy();
    expect(screen.getByText('Tokyo')).toBeTruthy();
    expect(screen.queryByText(/\d+ things? brushed/)).toBeNull();
  });

  it('navigates back when the back button is pressed', () => {
    render(<WhereWeveBeenScreen />);
    fireEvent.press(screen.getByLabelText('Back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('renders without crashing when a highlightTripId param is present', () => {
    mockRouteParams = { highlightTripId: 't1' };
    mockUseWhereWeveBeen.mockReturnValue({
      loading: false,
      yearGroups: [{ year: '2025', trips: [makeTrip({ id: 't1' })] }],
      forgetTrip: mockForgetTrip,
    });

    render(<WhereWeveBeenScreen />);
    expect(screen.getByText('Faro')).toBeTruthy();
  });
});

describe('WhereWeveBeenScreen — Forget this trip', () => {
  beforeEach(() => {
    mockUseWhereWeveBeen.mockReturnValue({
      loading: false,
      yearGroups: [{ year: '2025', trips: [makeTrip()] }],
      forgetTrip: mockForgetTrip,
    });
  });

  it('calls forgetTrip after the user confirms', () => {
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _msg, buttons) => {
        const destructive = buttons?.find(b => b.style === 'destructive');
        destructive?.onPress?.();
      });

    render(<WhereWeveBeenScreen />);
    fireEvent.press(screen.getByLabelText('Forget this trip — Faro'));

    expect(mockForgetTrip).toHaveBeenCalledWith(expect.objectContaining({ id: 'trip-1' }));
    alertSpy.mockRestore();
  });

  it('does not call forgetTrip when the user cancels', () => {
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _msg, buttons) => {
        const cancelBtn = buttons?.find(b => b.style === 'cancel');
        cancelBtn?.onPress?.();
      });

    render(<WhereWeveBeenScreen />);
    fireEvent.press(screen.getByLabelText('Forget this trip — Faro'));

    expect(mockForgetTrip).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
