/**
 * KAN-245 — useTripSuggestion: calendar-signal lifecycle for the Today screen.
 */

const mockFetchCalendarEvents = jest.fn();
jest.mock('../../../src/services/calendar', () => ({
  fetchCalendarEvents: (...args: unknown[]) => mockFetchCalendarEvents(...args),
}));

// tripSuggestions.ts imports expo-sqlite (for the dismissal store) even
// though this test only needs its pure detectCalendarSignal — stub the
// native module so requireActual below can load the real file.
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({ execSync: jest.fn(), getAllSync: jest.fn(), runSync: jest.fn() })),
}));

const mockGetDismissedSignalIds = jest.fn().mockReturnValue(new Set());
const mockDismissSignal = jest.fn();
jest.mock('../../../src/services/tripSuggestions', () => {
  const actual = jest.requireActual('../../../src/services/tripSuggestions');
  return {
    ...actual,
    getDismissedSignalIds: (...args: unknown[]) => mockGetDismissedSignalIds(...args),
    dismissSignal: (...args: unknown[]) => mockDismissSignal(...args),
  };
});

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useTripSuggestion } from '../../../src/hooks/useTodayScreen/useTripSuggestion';
import type { Trip, MallSnapshot } from '../../../src/types';
import type { CalendarEventItem } from '../../../src/services/calendar';

function makeEvent(overrides: Partial<CalendarEventItem> = {}): CalendarEventItem {
  return {
    id: 'evt-1',
    title: 'Conference',
    startDateString: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    isAllDay: false,
    location: 'Berlin, Germany',
    ...overrides,
  };
}

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 't1', destination: 'Faro, Portugal', placeRef: 'p1',
    centerLat: 0, centerLng: 0, areaRadius: 5000,
    cacheAreaId: 'ta_1', expiresAt: Date.now() + 1_000_000,
    createdAt: {} as unknown as Trip['createdAt'],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDismissedSignalIds.mockReturnValue(new Set());
});

describe('useTripSuggestion', () => {
  it('does not fetch calendar events during the first session', () => {
    renderHook(() => useTripSuggestion(true, [], null));
    expect(mockFetchCalendarEvents).not.toHaveBeenCalled();
  });

  it('fetches and surfaces a qualifying candidate outside the first session', async () => {
    mockFetchCalendarEvents.mockResolvedValue([makeEvent()]);

    const { result } = renderHook(() => useTripSuggestion(false, [], null));

    await waitFor(() => expect(result.current.suggestion).not.toBeNull());
    expect(result.current.suggestion?.place).toBe('Berlin, Germany');
  });

  it('does not surface a candidate matching a known trip destination', async () => {
    mockFetchCalendarEvents.mockResolvedValue([makeEvent({ location: 'Faro, Portugal' })]);

    const { result } = renderHook(() => useTripSuggestion(false, [makeTrip()], null));

    await waitFor(() => expect(mockFetchCalendarEvents).toHaveBeenCalled());
    expect(result.current.suggestion).toBeNull();
  });

  it('does not surface a candidate matching the mall snapshot name', async () => {
    mockFetchCalendarEvents.mockResolvedValue([makeEvent({ location: 'Downtown Mall' })]);
    const mallSnapshot: MallSnapshot = {
      placeId: 'm1', name: 'Downtown Mall', centerLat: 0, centerLng: 0, radius: 300,
      cacheAreaId: 'mall_snapshot', expiresAt: Date.now() + 1_000_000,
      createdAt: {} as unknown as MallSnapshot['createdAt'],
    };

    const { result } = renderHook(() => useTripSuggestion(false, [], mallSnapshot));

    await waitFor(() => expect(mockFetchCalendarEvents).toHaveBeenCalled());
    expect(result.current.suggestion).toBeNull();
  });

  it('excludes an already-dismissed signal id', async () => {
    mockFetchCalendarEvents.mockResolvedValue([makeEvent()]);
    mockGetDismissedSignalIds.mockReturnValue(new Set(['calendar:evt-1']));

    const { result } = renderHook(() => useTripSuggestion(false, [], null));

    await waitFor(() => expect(mockFetchCalendarEvents).toHaveBeenCalled());
    expect(result.current.suggestion).toBeNull();
  });

  it('fails silent (no suggestion) when the calendar read fails', async () => {
    mockFetchCalendarEvents.mockRejectedValue(Object.assign(new Error('denied'), { code: 'PERMISSION_DENIED' }));

    const { result } = renderHook(() => useTripSuggestion(false, [], null));

    await waitFor(() => expect(mockFetchCalendarEvents).toHaveBeenCalled());
    expect(result.current.suggestion).toBeNull();
  });

  it('dismiss() clears the suggestion and persists the dismissal', async () => {
    mockFetchCalendarEvents.mockResolvedValue([makeEvent()]);
    const { result } = renderHook(() => useTripSuggestion(false, [], null));
    await waitFor(() => expect(result.current.suggestion).not.toBeNull());

    act(() => { result.current.dismiss(); });

    expect(mockDismissSignal).toHaveBeenCalledWith('calendar:evt-1');
    expect(result.current.suggestion).toBeNull();
  });

  it('dismiss() is a safe no-op when there is no current suggestion', () => {
    const { result } = renderHook(() => useTripSuggestion(false, [], null));
    expect(() => act(() => { result.current.dismiss(); })).not.toThrow();
    expect(mockDismissSignal).not.toHaveBeenCalled();
  });

  it('fetches once when isFirstSession flips from true to false, not on every render', async () => {
    mockFetchCalendarEvents.mockResolvedValue([]);
    const { rerender } = renderHook(
      ({ first }: { first: boolean }) => useTripSuggestion(first, [], null),
      { initialProps: { first: true } },
    );
    expect(mockFetchCalendarEvents).not.toHaveBeenCalled();

    rerender({ first: false });
    await waitFor(() => expect(mockFetchCalendarEvents).toHaveBeenCalledTimes(1));

    rerender({ first: false });
    expect(mockFetchCalendarEvents).toHaveBeenCalledTimes(1);
  });
});
