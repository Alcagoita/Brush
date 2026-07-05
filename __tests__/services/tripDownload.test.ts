/**
 * KAN-234 — tripDownload.ts: Trip Planner business logic.
 *
 * Covers:
 *   - estimateTripDownloadBytes: monotonic in radius and poiTypeCount, sane
 *     (non-zero, non-negative) for each of the 3 radius presets
 *   - computeTripExpiresAt: dateless → now + TRIP_DEFAULT_STALE_MS; dated →
 *     endDate + TRIP_END_GRACE_MS
 *   - shouldPreRefreshTrip: true/false matrix (online/offline, before/at/
 *     after the pre-departure window, already-refreshed, dateless, trip
 *     already ended)
 *   - downloadTripArea: requests the full ALL_POI_TYPES ∪ customCategoryPoiTypes
 *     union, upserts every returned place tagged with cacheAreaId/expiresAt
 *   - refreshTripArea: re-downloads + bumps Firestore expiresAt/preRefreshedAt
 *   - checkAndRunTripPreRefresh: only refreshes due trips; one trip's
 *     failure doesn't block the others
 */

const mockSearchOsmPlaces = jest.fn();
jest.mock('../../src/services/osmPlaces', () => ({
  searchOsmPlaces: (...args: unknown[]) => mockSearchOsmPlaces(...args),
}));

const mockUpsertTripPlace = jest.fn().mockReturnValue('hp_mock');
jest.mock('../../src/services/habitatCache', () => ({
  upsertTripPlace: (...args: unknown[]) => mockUpsertTripPlace(...args),
  HABITAT_BYTES_PER_ROW: 200,
}));

const mockUpdateTrip = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/firestore/trips', () => ({
  updateTrip: (...args: unknown[]) => mockUpdateTrip(...args),
}));

const mockNetInfoFetch = jest.fn();
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: (...args: unknown[]) => mockNetInfoFetch(...args) },
}));

jest.mock('../../src/utils/date', () => ({
  todayISO: jest.fn(() => '2026-07-19'),
}));

import {
  TRIP_RADIUS_PRESETS,
  TRIP_DEFAULT_STALE_MS,
  TRIP_END_GRACE_MS,
  estimateTripDownloadBytes,
  computeTripExpiresAt,
  shouldPreRefreshTrip,
  downloadTripArea,
  refreshTripArea,
  checkAndRunTripPreRefresh,
} from '../../src/services/tripDownload';
import { ALL_POI_TYPES } from '../../src/types';
import type { Trip } from '../../src/types';

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    destination: 'Faro, Portugal',
    placeRef: 'place-abc',
    centerLat: 37.0179,
    centerLng: -7.9304,
    areaRadius: 15_000,
    cacheAreaId: 'ta_123',
    expiresAt: 1_800_000_000_000,
    createdAt: { toDate: () => new Date() } as unknown as Trip['createdAt'],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockNetInfoFetch.mockResolvedValue({ isConnected: true });
});

describe('TRIP_RADIUS_PRESETS', () => {
  it('exposes exactly 3 presets with distinct, ascending radii', () => {
    expect(TRIP_RADIUS_PRESETS).toHaveLength(3);
    const radii = TRIP_RADIUS_PRESETS.map(p => p.radiusMeters);
    expect(radii).toEqual([...radii].sort((a, b) => a - b));
    expect(new Set(radii).size).toBe(3);
  });
});

describe('estimateTripDownloadBytes', () => {
  it('is monotonically increasing in radius', () => {
    const small = estimateTripDownloadBytes(5_000, 16);
    const large = estimateTripDownloadBytes(40_000, 16);
    expect(large).toBeGreaterThan(small);
  });

  it('is monotonically increasing in poiTypeCount', () => {
    const fewer = estimateTripDownloadBytes(15_000, 16);
    const more  = estimateTripDownloadBytes(15_000, 20);
    expect(more).toBeGreaterThan(fewer);
  });

  it('returns a sane (positive) estimate for each radius preset', () => {
    for (const preset of TRIP_RADIUS_PRESETS) {
      expect(estimateTripDownloadBytes(preset.radiusMeters, 16)).toBeGreaterThan(0);
    }
  });
});

describe('computeTripExpiresAt', () => {
  const NOW = 1_700_000_000_000;

  it('dateless — now + TRIP_DEFAULT_STALE_MS', () => {
    expect(computeTripExpiresAt(undefined, NOW)).toBe(NOW + TRIP_DEFAULT_STALE_MS);
  });

  it('dated — endDate + TRIP_END_GRACE_MS', () => {
    const endDateMs = new Date('2026-07-27T00:00:00').getTime();
    expect(computeTripExpiresAt('2026-07-27', NOW)).toBe(endDateMs + TRIP_END_GRACE_MS);
  });
});

describe('shouldPreRefreshTrip', () => {
  const TODAY = '2026-07-19';

  it('true the day before departure, online, not yet refreshed', () => {
    expect(shouldPreRefreshTrip(makeTrip({ startDate: '2026-07-20' }), TODAY, true)).toBe(true);
  });

  it('true on or after the start date too (tolerates a skipped day)', () => {
    expect(shouldPreRefreshTrip(makeTrip({ startDate: '2026-07-19', endDate: '2026-07-26' }), TODAY, true)).toBe(true);
    expect(shouldPreRefreshTrip(makeTrip({ startDate: '2026-07-15', endDate: '2026-07-26' }), TODAY, true)).toBe(true);
  });

  it('false when offline', () => {
    expect(shouldPreRefreshTrip(makeTrip({ startDate: '2026-07-20' }), TODAY, false)).toBe(false);
  });

  it('false for a dateless trip', () => {
    expect(shouldPreRefreshTrip(makeTrip({ startDate: undefined }), TODAY, true)).toBe(false);
  });

  it('false when already pre-refreshed', () => {
    expect(shouldPreRefreshTrip(makeTrip({ startDate: '2026-07-20', preRefreshedAt: Date.now() }), TODAY, true)).toBe(false);
  });

  it('false well before the window (more than a day out)', () => {
    expect(shouldPreRefreshTrip(makeTrip({ startDate: '2026-07-25' }), TODAY, true)).toBe(false);
  });

  it('false once the trip\'s endDate has passed', () => {
    expect(shouldPreRefreshTrip(makeTrip({ startDate: '2026-07-01', endDate: '2026-07-10' }), TODAY, true)).toBe(false);
  });

  it('false for a dateless-end trip more than a week past its start', () => {
    expect(shouldPreRefreshTrip(makeTrip({ startDate: '2026-07-01', endDate: undefined }), TODAY, true)).toBe(false);
  });
});

describe('downloadTripArea', () => {
  it('requests ALL_POI_TYPES union with custom category types, in one searchOsmPlaces call', async () => {
    mockSearchOsmPlaces.mockResolvedValue({});

    await downloadTripArea({ lat: 1, lng: 2 }, 15_000, 'ta_1', 1_800_000_000_000, ['climbing_gym']);

    expect(mockSearchOsmPlaces).toHaveBeenCalledTimes(1);
    const [lat, lng, poiTypes, radius] = mockSearchOsmPlaces.mock.calls[0];
    expect(lat).toBe(1);
    expect(lng).toBe(2);
    expect(radius).toBe(15_000);
    expect(new Set(poiTypes)).toEqual(new Set([...ALL_POI_TYPES, 'climbing_gym']));
  });

  it('dedupes a custom type that overlaps a built-in one', async () => {
    mockSearchOsmPlaces.mockResolvedValue({});
    await downloadTripArea({ lat: 1, lng: 2 }, 15_000, 'ta_1', 1_800_000_000_000, ['gym']);

    const [, , poiTypes] = mockSearchOsmPlaces.mock.calls[0];
    expect(poiTypes.filter((t: string) => t === 'gym')).toHaveLength(1);
  });

  it('upserts every returned place tagged with cacheAreaId/expiresAt, and returns the written count', async () => {
    mockSearchOsmPlaces.mockResolvedValue({
      atm: [{ osmId: 'node/1', name: 'ATM', isGenericName: false, lat: 1, lng: 2, distanceMeters: 10 }],
      cafe: [{ osmId: 'node/2', name: 'Cafe', isGenericName: false, lat: 1, lng: 2, distanceMeters: 20 }],
    });

    const count = await downloadTripArea({ lat: 1, lng: 2 }, 15_000, 'ta_1', 1_800_000_000_000, []);

    expect(count).toBe(2);
    expect(mockUpsertTripPlace).toHaveBeenCalledWith(expect.objectContaining({
      poiType: 'atm', cacheAreaId: 'ta_1', expiresAt: 1_800_000_000_000,
    }));
    expect(mockUpsertTripPlace).toHaveBeenCalledWith(expect.objectContaining({
      poiType: 'cafe', cacheAreaId: 'ta_1', expiresAt: 1_800_000_000_000,
    }));
  });

  it('throws when searchOsmPlaces fails — a user-initiated action must surface the error, not swallow it', async () => {
    mockSearchOsmPlaces.mockRejectedValue(new Error('network down'));
    await expect(downloadTripArea({ lat: 1, lng: 2 }, 15_000, 'ta_1', 1_800_000_000_000, [])).rejects.toThrow('network down');
  });
});

describe('refreshTripArea', () => {
  it('re-downloads and bumps Firestore expiresAt/preRefreshedAt', async () => {
    mockSearchOsmPlaces.mockResolvedValue({});
    const trip = makeTrip({ endDate: '2026-07-27' });

    await refreshTripArea('uid-1', trip, []);

    expect(mockSearchOsmPlaces).toHaveBeenCalledWith(trip.centerLat, trip.centerLng, expect.anything(), trip.areaRadius, expect.anything());
    expect(mockUpdateTrip).toHaveBeenCalledWith('uid-1', 'trip-1', {
      expiresAt: computeTripExpiresAt('2026-07-27'),
      preRefreshedAt: expect.any(Number),
    });
  });
});

describe('checkAndRunTripPreRefresh', () => {
  it('only refreshes trips that are due', async () => {
    mockSearchOsmPlaces.mockResolvedValue({});
    const due = makeTrip({ id: 'due', startDate: '2026-07-20' });
    const notDue = makeTrip({ id: 'not-due', startDate: '2026-08-20' });

    await checkAndRunTripPreRefresh('uid-1', [due, notDue], []);

    expect(mockUpdateTrip).toHaveBeenCalledTimes(1);
    expect(mockUpdateTrip).toHaveBeenCalledWith('uid-1', 'due', expect.anything());
  });

  it('isolates a failing trip\'s refresh — other trips still get refreshed', async () => {
    mockSearchOsmPlaces
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({});
    const failing = makeTrip({ id: 'failing', startDate: '2026-07-20' });
    const ok      = makeTrip({ id: 'ok', startDate: '2026-07-19' });

    await expect(checkAndRunTripPreRefresh('uid-1', [failing, ok], [])).resolves.toBeUndefined();

    expect(mockUpdateTrip).toHaveBeenCalledTimes(1);
    expect(mockUpdateTrip).toHaveBeenCalledWith('uid-1', 'ok', expect.anything());
  });

  it('does nothing when offline', async () => {
    mockNetInfoFetch.mockResolvedValue({ isConnected: false });
    const due = makeTrip({ id: 'due', startDate: '2026-07-20' });

    await checkAndRunTripPreRefresh('uid-1', [due], []);

    expect(mockSearchOsmPlaces).not.toHaveBeenCalled();
    expect(mockUpdateTrip).not.toHaveBeenCalled();
  });
});
