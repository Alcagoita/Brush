/**
 * KAN-281 — ItineraryOptionsScreen.
 *
 * Covers:
 *  - loading state while resolving
 *  - empty state when nothing resolves
 *  - renders the single suggestion card from the computed plan
 *  - tapping the card opens Maps with the correct origin/stops (no travelmode
 *    — the user picks that inside Maps itself)
 *  - back button navigates back
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ItineraryOptionsScreen from '../../src/screens/ItineraryOptionsScreen';

const mockGoBack = jest.fn();
const mockRouteParams = { tasks: [], origin: { lat: 38.7, lng: -9.1 }, farTaskIds: [] };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
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
  const stub = (props: React.ComponentProps<typeof View>) => React.createElement(View, props);
  return { ChevronLeftIcon: stub, PoiIcon: stub, RefreshIcon: stub, ShoppingBagIcon: stub };
});

const mockGetAuth = jest.fn(() => ({ currentUser: { uid: 'user-123' } }));
jest.mock('@react-native-firebase/auth/lib/modular', () => ({
  getAuth: () => mockGetAuth(),
}));

const mockEnsureCurrentDay = jest.fn().mockResolvedValue({ tasks: [] });
jest.mock('../../src/services/firestore', () => ({
  ensureCurrentDay: (...args: unknown[]) => mockEnsureCurrentDay(...args),
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
const mockGetLocalTripAlternativeCount = jest.fn();
const mockPlanLocalTripAlternative = jest.fn();
jest.mock('../../src/services/oneTripForAll', () => ({
  getLocalTripAlternativeCount: (...args: unknown[]) => mockGetLocalTripAlternativeCount(...args),
  planLocalTripAlternative: (...args: unknown[]) => mockPlanLocalTripAlternative(...args),
  planBestLocalTrip: (...args: unknown[]) => mockPlanTrip(...args),
  planTripAroundFarTask: (...args: unknown[]) => Promise.resolve(mockPlanTrip(...args)),
  resolveTripDestinations: (...args: unknown[]) => mockResolveTripDestinations(...args),
  planTrip: (...args: unknown[]) => mockPlanTrip(...args),
}));

// KAN-282 — mall card. Detection logic itself is covered by mallRoute.test.ts;
// mocked wholesale here so this file only tests the screen's own wiring.
const mockGetMallSnapshot = jest.fn().mockResolvedValue(null);
jest.mock('../../src/services/mallSnapshots', () => ({
  getMallSnapshot: (...args: unknown[]) => mockGetMallSnapshot(...args),
}));

const mockFindMallOption = jest.fn().mockReturnValue(null);
const mockFindMallOptions = jest.fn((...args: unknown[]) => {
  const option = mockFindMallOption(...args);
  return option ? [option] : [];
});
jest.mock('../../src/services/mallRoute', () => ({
  findMallOption: (...args: unknown[]) => mockFindMallOption(...args),
  findMallOptions: (...args: unknown[]) => mockFindMallOptions(...args),
}));

// KAN-282 — the screen kicks off a fire-and-forget mall sweep when no mall
// qualifies. habitatCache pulls in expo-sqlite (native, unavailable under
// Jest), so mock at the service boundary.
const mockRefreshMallsIfDue = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/habitatCache', () => ({
  refreshMallsIfDue: (...args: unknown[]) => mockRefreshMallsIfDue(...args),
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
  mockEnsureCurrentDay.mockResolvedValue({ tasks: [] });
  mockGetPositionLowAccuracy.mockResolvedValue({ lat: 38.7, lng: -9.1, accuracy: 10, timestamp: 0 });
  mockGetLastSearchCoords.mockReturnValue({ lat: 38.7, lng: -9.1 });
  mockResolveTripDestinations.mockResolvedValue({ resolved: [], excludedCount: 0 });
  mockPlanTrip.mockReturnValue({ stops: [], excludedCount: 0, totalDistanceMeters: 0 });
  mockGetLocalTripAlternativeCount.mockReturnValue([]);
  mockGetMallSnapshot.mockResolvedValue(null);
  mockFindMallOption.mockReturnValue(null);
  mockFindMallOptions.mockImplementation((...args: unknown[]) => {
    const option = mockFindMallOption(...args);
    return option ? [option] : [];
  });
});

describe('ItineraryOptionsScreen — loading', () => {
  it('shows loading while the single anchored candidate lookup is in progress', () => {
    render(<ItineraryOptionsScreen />);
    expect(screen.getByText('Finding the way…')).toBeTruthy();
  });

  it('calls navigation.goBack when the back button is pressed', () => {
    render(<ItineraryOptionsScreen />);
    fireEvent.press(screen.getByLabelText('Back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('keeps the walking loader visible beside a known mall beyond 15 seconds', () => {
    mockPlanTrip.mockReturnValue(new Promise(() => {}));
    mockFindMallOption.mockReturnValue({ placeId: 'mall-1', name: 'Centro Colombo', lat: 38.72, lng: -9.12, distanceMeters: 900 });
    jest.useFakeTimers();
    try {
      render(<ItineraryOptionsScreen />);
      expect(screen.getByTestId('mall-card')).toBeTruthy();
      expect(screen.getByTestId('walking-route-loading')).toBeTruthy();

      act(() => { jest.advanceTimersByTime(15000); });
      expect(screen.getByTestId('walking-route-loading')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
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

  it('renders the suggestion card with every stop from the plan', async () => {
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByText(/Farmácia Silva/)).toBeTruthy());
    expect(screen.getByText(/Mercado da Vila/)).toBeTruthy();
  });

  it('shows mall discovery loading beside an already available walking route', async () => {
    let finishSweep!: () => void;
    mockRefreshMallsIfDue.mockImplementationOnce(() => new Promise<void>(resolve => { finishSweep = resolve; }));

    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByTestId('itinerary-card')).toBeTruthy());
    expect(screen.getByTestId('mall-route-loading')).toBeTruthy();
    expect(screen.getByText('Finding shopping malls…')).toBeTruthy();

    await act(async () => { finishSweep(); });
    expect(screen.queryByTestId('mall-route-loading')).toBeNull();
  });

  it('applies a completed mall sweep after a walking refresh changes the request ID', async () => {
    const firstMall = { placeId: 'mall-1', name: 'First Mall', lat: 38.72, lng: -9.12, distanceMeters: 900 };
    const newMall = { placeId: 'mall-2', name: 'New Mall', lat: 38.73, lng: -9.13, distanceMeters: 1000 };
    let finishSweep!: () => void;
    let sweepFinished = false;
    mockFindMallOption.mockImplementation(() => sweepFinished ? newMall : firstMall);
    mockRefreshMallsIfDue.mockImplementationOnce(() => new Promise<void>(resolve => {
      finishSweep = () => { sweepFinished = true; resolve(); };
    }));
    mockGetLocalTripAlternativeCount.mockReturnValue([0, 1]);
    mockPlanTrip.mockReturnValue({ stops: [makeStop('t1', 'First stop')], excludedCount: 0, totalDistanceMeters: 500 });
    mockPlanLocalTripAlternative.mockReturnValue({ stops: [makeStop('t2', 'Next stop')], excludedCount: 0, totalDistanceMeters: 600 });

    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByText('First Mall')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('refresh-itinerary-button').props.accessibilityState.disabled).toBe(false));
    await act(async () => { fireEvent.press(screen.getByTestId('refresh-itinerary-button')); });
    await act(async () => { finishSweep(); });

    expect(screen.getByText('New Mall')).toBeTruthy();
  });

  it('aborts the walking search when the screen effect is cleaned up', () => {
    mockPlanTrip.mockReturnValue(new Promise(() => {}));
    const { unmount } = render(<ItineraryOptionsScreen />);
    const signal = mockPlanTrip.mock.calls[0][3] as AbortSignal;

    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it('shows the learned-place and distance labels correctly', async () => {
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByText(/Farmácia Silva · your usual/)).toBeTruthy());
    expect(screen.getByText(/Mercado da Vila · 400 m/)).toBeTruthy();
  });

  it('shows the exclusion line when tasks were excluded', async () => {
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByText("Couldn't find a place for 1 of them")).toBeTruthy());
  });

  it('shows the approximate total distance line', async () => {
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByText('About 1.5 km all together')).toBeTruthy());
  });

  it('tapping the card opens Maps with the origin and stops, no travelmode', async () => {
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByTestId('itinerary-card')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('itinerary-card'));
    });

    expect(mockOpenMultiStopDirections).toHaveBeenCalledWith(
      { lat: 38.7, lng: -9.1 },
      [stops[0].place, stops[1].place],
    );
  });

  it('refreshes a walking alternative without recalculating a known mall', async () => {
    const refreshedPlan = { stops: [makeStop('t3', 'Farmácia Nova')], excludedCount: 0, totalDistanceMeters: 900 };
    mockFindMallOption.mockReturnValue({ placeId: 'mall-1', name: 'Centro Colombo', lat: 38.72, lng: -9.12, distanceMeters: 900 });
    mockEnsureCurrentDay.mockResolvedValue({ tasks: [{ id: 't1' }] });
    mockGetLocalTripAlternativeCount.mockReturnValue([0, 1]);
    mockPlanLocalTripAlternative.mockReturnValue(refreshedPlan);
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByTestId('itinerary-card')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('refresh-itinerary-button'));
    });

    expect(screen.getByTestId('refresh-itinerary-icon')).toBeTruthy();
    expect(mockPlanLocalTripAlternative).toHaveBeenCalledWith(
      [], { lat: 38.7, lng: -9.1 }, [], 1,
    );
    expect(screen.getByText('Centro Colombo')).toBeTruthy();
    expect(mockFindMallOption).toHaveBeenCalledTimes(2);
    expect(mockRefreshMallsIfDue).toHaveBeenCalledTimes(1);
  });

  it('disables refresh when one walking route and a mall are already known', async () => {
    mockGetLocalTripAlternativeCount.mockReturnValue([0]);
    mockFindMallOption.mockReturnValue({ placeId: 'mall-1', name: 'Centro Colombo', lat: 38.72, lng: -9.12, distanceMeters: 900 });
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByTestId('itinerary-card')).toBeTruthy());
    expect(screen.getByTestId('refresh-itinerary-button').props.accessibilityState).toEqual({ disabled: true });
  });

  it('retries missing mall discovery when the walking route has no alternative', async () => {
    mockGetLocalTripAlternativeCount.mockReturnValue([0]);
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByTestId('itinerary-card')).toBeTruthy());
    expect(screen.getByTestId('refresh-itinerary-button').props.accessibilityState.disabled).toBe(false);

    await act(async () => { fireEvent.press(screen.getByTestId('refresh-itinerary-button')); });
    expect(mockRefreshMallsIfDue).toHaveBeenCalledTimes(2);
    expect(mockPlanTrip).toHaveBeenCalledTimes(1);
    expect(mockPlanLocalTripAlternative).not.toHaveBeenCalled();
    expect(screen.getByTestId('itinerary-card')).toBeTruthy();
  });

  it('skips a cache slot that repeats the initially displayed POIs', async () => {
    const currentPlan = { stops: [makeStop('t1', 'Farmácia A')], excludedCount: 0, totalDistanceMeters: 400 };
    const alternativePlan = { stops: [makeStop('t2', 'Farmácia B')], excludedCount: 0, totalDistanceMeters: 500 };
    mockPlanTrip.mockReturnValue(currentPlan);
    mockGetLocalTripAlternativeCount.mockReturnValue([0, 1]);
    mockPlanLocalTripAlternative
      .mockReturnValueOnce(currentPlan)
      .mockReturnValueOnce(alternativePlan);
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByTestId('itinerary-card')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('refresh-itinerary-button'));
    });

    expect(mockPlanLocalTripAlternative).toHaveBeenNthCalledWith(
      1, [], { lat: 38.7, lng: -9.1 }, [], 1,
    );
    expect(mockPlanLocalTripAlternative).toHaveBeenNthCalledWith(
      2, [], { lat: 38.7, lng: -9.1 }, [], 0,
    );
  });

  it('uses raw indices when duplicate combinations leave a gap in the cycle', async () => {
    mockGetLocalTripAlternativeCount.mockReturnValue([0, 2]);
    mockPlanLocalTripAlternative.mockReturnValue({
      stops: [makeStop('t3', 'Farmácia Nova')], excludedCount: 0, totalDistanceMeters: 900,
    });
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByTestId('itinerary-card')).toBeTruthy());

    await act(async () => { fireEvent.press(screen.getByTestId('refresh-itinerary-button')); });

    expect(mockPlanLocalTripAlternative).toHaveBeenCalledWith(
      [], { lat: 38.7, lng: -9.1 }, [], 2,
    );
  });

  it('does NOT render a mall card when findMallOption returns null (the normal outcome)', async () => {
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByTestId('itinerary-card')).toBeTruthy());
    expect(screen.queryByTestId('mall-card')).toBeNull();
  });

  it('renders a qualifying mall when no walking stop resolves', async () => {
    mockPlanTrip.mockReturnValue({ stops: [], excludedCount: 4, totalDistanceMeters: 0 });
    mockFindMallOption.mockReturnValue({ placeId: 'mall-1', name: 'Centro Colombo', lat: 38.72, lng: -9.12, distanceMeters: 900 });

    render(<ItineraryOptionsScreen />);

    await waitFor(() => expect(screen.getByTestId('mall-card')).toBeTruthy());
    expect(screen.queryByTestId('itinerary-card')).toBeNull();
  });

  it('retries walking from a mall-only result without searching or changing the mall', async () => {
    const mall = { placeId: 'mall-1', name: 'Centro Colombo', lat: 38.72, lng: -9.12, distanceMeters: 900 };
    const nextPlan = { stops: [makeStop('t1', 'Farmácia Nova')], excludedCount: 0, totalDistanceMeters: 700 };
    let finishWalking: (plan: typeof nextPlan) => void = () => {};
    mockPlanTrip.mockReturnValueOnce({ stops: [], excludedCount: 4, totalDistanceMeters: 0 })
      .mockImplementationOnce(() => new Promise(resolve => { finishWalking = resolve; }));
    mockFindMallOption.mockReturnValue(mall);

    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByTestId('mall-card')).toBeTruthy());
    await waitFor(() => expect(mockPlanTrip).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('refresh-itinerary-button').props.accessibilityState.disabled).toBe(false);

    fireEvent.press(screen.getByTestId('refresh-itinerary-button'));
    expect(screen.getByText('Centro Colombo')).toBeTruthy();
    expect(mockPlanTrip).toHaveBeenCalledTimes(2);
    expect(mockRefreshMallsIfDue).toHaveBeenCalledTimes(1);
    expect(mockFindMallOption).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('itinerary-card')).toBeNull();

    await act(async () => { finishWalking(nextPlan); });
    await waitFor(() => expect(screen.getByTestId('itinerary-card')).toBeTruthy());
    expect(screen.getByText('Centro Colombo')).toBeTruthy();
  });

  it('does not retry walking after every far candidate was checked', async () => {
    mockPlanTrip.mockReturnValue({ stops: [], excludedCount: 4, totalDistanceMeters: 0, searchExhausted: true });
    mockFindMallOption.mockReturnValue({ placeId: 'mall-1', name: 'Centro Colombo', lat: 38.72, lng: -9.12, distanceMeters: 900 });
    render(<ItineraryOptionsScreen />);

    await waitFor(() => expect(mockPlanTrip).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('refresh-itinerary-button').props.accessibilityState.disabled).toBe(true));
    fireEvent.press(screen.getByTestId('refresh-itinerary-button'));
    expect(mockPlanTrip).toHaveBeenCalledTimes(1);
  });

  it('waits for an in-flight mall sweep only when no mall is known', async () => {
    const mall = { placeId: 'mall-1', name: 'Centro Colombo', lat: 38.72, lng: -9.12, distanceMeters: 900 };
    let finishSweep: () => void = () => {};
    let sweepFinished = false;
    mockPlanTrip.mockReturnValue({ stops: [], excludedCount: 4, totalDistanceMeters: 0 });
    mockFindMallOption.mockImplementation(() => sweepFinished ? mall : null);
    mockRefreshMallsIfDue.mockImplementationOnce(() => new Promise<void>(resolve => {
      finishSweep = () => { sweepFinished = true; resolve(); };
    }));

    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByText('Finding shopping malls…')).toBeTruthy());
    fireEvent.press(screen.getByTestId('refresh-itinerary-button'));
    expect(mockRefreshMallsIfDue).toHaveBeenCalledTimes(1);
    await act(async () => { finishSweep(); });
    await waitFor(() => expect(screen.getByText('Centro Colombo')).toBeTruthy());
  });

  it('keeps a qualifying mall visible when walking resolution fails', async () => {
    mockPlanTrip.mockRejectedValueOnce(new Error('walking lookup failed'));
    mockFindMallOption.mockReturnValue({ placeId: 'mall-1', name: 'Centro Colombo', lat: 38.72, lng: -9.12, distanceMeters: 900 });

    render(<ItineraryOptionsScreen />);

    await waitFor(() => expect(screen.getByTestId('mall-card')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('refresh-itinerary-button').props.accessibilityState.disabled).toBe(false));
    expect(screen.queryByTestId('itinerary-card')).toBeNull();
    expect(screen.getByText("We couldn't find a path for these tasks near you.")).toBeTruthy();
  });

  // KAN-282 — "no qualifying mall" can mean we simply have no OSM mall data
  // cached here yet, so the screen kicks off a background refresh for that
  // one type rather than waiting on proximity's 200m-movement gate. Free
  // (Overpass), fire-and-forget, and must never block or fail the render.
  it('kicks off a background mall cache refresh when no mall qualifies', async () => {
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByTestId('itinerary-card')).toBeTruthy());
    await waitFor(() => expect(mockRefreshMallsIfDue).toHaveBeenCalledWith(38.7, -9.1, 4_500));
  });

  it('rechecks the mall cache when the background refresh completes', async () => {
    const refreshedMall = { placeId: 'mall-1', name: 'Centro Colombo', lat: 38.72, lng: -9.12, distanceMeters: 900 };
    let refreshFinished = false;
    let completeRefresh: () => void = () => {};
    mockRefreshMallsIfDue.mockImplementationOnce(() => new Promise<void>(resolve => {
      completeRefresh = () => {
        refreshFinished = true;
        resolve();
      };
    }));
    mockFindMallOption.mockImplementation(() => (refreshFinished ? refreshedMall : null));

    render(<ItineraryOptionsScreen />);

    await waitFor(() => expect(mockRefreshMallsIfDue).toHaveBeenCalledWith(38.7, -9.1, 4_500));
    expect(screen.queryByTestId('mall-card')).toBeNull();
    await act(async () => { completeRefresh(); });
    await waitFor(() => expect(screen.getByTestId('mall-card')).toBeTruthy());
  });

  it('still renders normally when that background refresh rejects', async () => {
    mockRefreshMallsIfDue.mockRejectedValueOnce(new Error('Overpass unreachable'));
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByTestId('itinerary-card')).toBeTruthy());
    expect(screen.queryByTestId('mall-card')).toBeNull();
  });
});

describe('ItineraryOptionsScreen — mall card (KAN-282)', () => {
  const stops = [makeStop('t1', 'Farmácia Silva'), makeStop('t2', 'Mercado da Vila')];
  const mallOption = { placeId: 'mall-1', name: 'Centro Colombo', lat: 38.72, lng: -9.12, distanceMeters: 900 };

  beforeEach(() => {
    mockPlanTrip.mockReturnValue({ stops, excludedCount: 0, totalDistanceMeters: 1500 });
    mockFindMallOption.mockReturnValue(mallOption);
  });

  // The subtitle is the mall name alone — no task count. Coverage evidence
  // was retired (mallRoute.ts), so the copy must not claim any.
  it('renders below the stop-by-stop card, with the mall name and distance', async () => {
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByTestId('mall-card')).toBeTruthy());
    expect(screen.getByText('All in one place')).toBeTruthy();
    expect(screen.getByText('Centro Colombo')).toBeTruthy();
    expect(screen.getByText('900 m away')).toBeTruthy();
    expect(screen.queryByText('Try another place')).toBeNull();
  });

  it('cycles known malls from a card button without searching again or opening Maps', async () => {
    const secondMall = { ...mallOption, placeId: 'mall-2', name: 'Strada Outlet', distanceMeters: 1200 };
    mockFindMallOptions.mockReturnValue([mallOption, secondMall]);
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByText('Centro Colombo')).toBeTruthy());
    const searchesBeforePress = mockRefreshMallsIfDue.mock.calls.length;
    const mallReadsBeforePress = mockFindMallOptions.mock.calls.length;
    const switchStyle = StyleSheet.flatten(screen.getByTestId('mall-try-another-button').props.style);
    expect(switchStyle.minHeight).toBeGreaterThanOrEqual(44);

    fireEvent.press(screen.getByTestId('mall-try-another-button'));
    expect(screen.getByText('Strada Outlet')).toBeTruthy();
    expect(screen.getByText('1.2 km away')).toBeTruthy();
    expect(mockRefreshMallsIfDue).toHaveBeenCalledTimes(searchesBeforePress);
    expect(mockFindMallOptions).toHaveBeenCalledTimes(mallReadsBeforePress);
    expect(mockOpenMultiStopDirections).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('mall-card'));
    expect(mockOpenMultiStopDirections).toHaveBeenCalledWith(
      { lat: 38.7, lng: -9.1 }, [secondMall],
    );

    fireEvent.press(screen.getByTestId('mall-try-another-button'));
    expect(screen.getByText('Centro Colombo')).toBeTruthy();
  });

  it('keeps the selected mall when a background sweep returns the same candidates', async () => {
    const secondMall = { ...mallOption, placeId: 'mall-2', name: 'Strada Outlet', distanceMeters: 1200 };
    let finishSweep: () => void = () => {};
    mockFindMallOptions.mockReturnValue([mallOption, secondMall]);
    mockRefreshMallsIfDue.mockImplementationOnce(() => new Promise<void>(resolve => { finishSweep = resolve; }));

    render(<ItineraryOptionsScreen />);
    fireEvent.press(screen.getByTestId('mall-try-another-button'));
    expect(screen.getByText('Strada Outlet')).toBeTruthy();
    await act(async () => { finishSweep(); });
    expect(screen.getByText('Strada Outlet')).toBeTruthy();
  });

  it('refreshes mall candidates even when one is already cached', async () => {
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByTestId('mall-card')).toBeTruthy());
    expect(mockRefreshMallsIfDue).toHaveBeenCalledWith(38.7, -9.1, 4_500);
  });

  it('updates an already visible mall when the refresh finds a closer candidate', async () => {
    const closerMall = { placeId: 'mall-2', name: 'Closer Mall', lat: 38.71, lng: -9.11, distanceMeters: 400 };
    let completeRefresh: () => void = () => {};
    mockRefreshMallsIfDue.mockImplementationOnce(() => new Promise<void>(resolve => {
      completeRefresh = resolve;
    }));
    mockFindMallOption.mockReturnValueOnce(mallOption).mockReturnValue(closerMall);

    render(<ItineraryOptionsScreen />);
    expect(screen.getByText('Centro Colombo')).toBeTruthy();
    await act(async () => { completeRefresh(); });
    expect(screen.getByText('Closer Mall')).toBeTruthy();
  });

  it('tapping the mall card opens Maps with the mall as the single destination', async () => {
    render(<ItineraryOptionsScreen />);
    await waitFor(() => expect(screen.getByTestId('mall-card')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('mall-card'));
    });

    expect(mockOpenMultiStopDirections).toHaveBeenCalledWith(
      { lat: 38.7, lng: -9.1 },
      [mallOption],
    );
  });
});
