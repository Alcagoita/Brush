/**
 * KAN-235 — errandBundles: pure bundle computation + per-day dismissal.
 *
 * Covers the ticket's AC directly:
 *   - anchor selection (a candidate place becomes a valid anchor only when
 *     ≥2 distinct tasks have a candidate within ERRAND_BUNDLE_RADIUS_M of it)
 *   - the ≥2 threshold (a lone task, or two tasks too far apart, never bundles)
 *   - ranking (more tasks wins; ties broken by shorter total walk distance)
 *   - the walking-radius constant is a hard boundary (just inside vs. just outside)
 *   - dismissal persists per (day, bundle key) and doesn't leak across days
 */

interface MockDismissalRow { day: string; bundle_key: string }

let dismissalRows: MockDismissalRow[] = [];

const mockDismissalDb = {
  execSync: jest.fn(),
  getAllSync: jest.fn((sql: string, params: unknown[] = []) => {
    const [day, bundleKey] = params as [string, string];
    const hit = dismissalRows.some(r => r.day === day && r.bundle_key === bundleKey);
    return hit ? [{ one: 1 }] : [];
  }),
  runSync: jest.fn((sql: string, params: unknown[] = []) => {
    const [day, bundle_key] = params as [string, string];
    dismissalRows = dismissalRows.filter(r => !(r.day === day && r.bundle_key === bundle_key));
    dismissalRows.push({ day, bundle_key });
    return {};
  }),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => mockDismissalDb),
}));

const mockTodayISO = jest.fn().mockReturnValue('2026-07-06');
jest.mock('../../src/utils/date', () => ({
  todayISO: () => mockTodayISO(),
}));

import {
  computeErrandBundles,
  errandBundleKey,
  isBundleDismissedToday,
  dismissBundleForToday,
  __resetErrandBundleDb,
  ERRAND_BUNDLE_RADIUS_M,
} from '../../src/services/errandBundles';
import type { PlacesMap } from '../../src/services/proximity';
import type { NearbyPlace } from '../../src/services/maps';
import type { Task } from '../../src/types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1', title: 'Task', category: 'errands', done: false, poi: 'atm',
    date: '2026-07-06', createdAt: {} as Task['createdAt'],
    ...overrides,
  };
}

function makePlace(overrides: Partial<NearbyPlace> = {}): NearbyPlace {
  return { placeId: 'p1', name: 'Place', lat: 0, lng: 0, distanceMeters: 100, ...overrides };
}

// Rough conversion so fixture coordinates land at an intended metre offset
// along longitude at the equator (lat ~0), matching maps.ts's own haversine.
function lngOffset(meters: number): number {
  return meters / 111_195;
}

beforeEach(() => {
  jest.clearAllMocks();
  dismissalRows = [];
  mockTodayISO.mockReturnValue('2026-07-06');
  __resetErrandBundleDb();
});

describe('computeErrandBundles — anchor selection & threshold', () => {
  it('returns nothing with fewer than 2 open POI tasks', () => {
    const tasks = [makeTask({ id: 't1', poi: 'atm' })];
    const poiPlaces: PlacesMap = { atm: [makePlace({ placeId: 'atm-1' })] };
    expect(computeErrandBundles(tasks, poiPlaces)).toEqual([]);
  });

  it('bundles 2 tasks whose candidate places sit within the walking radius of each other', () => {
    const tasks = [
      makeTask({ id: 't1', poi: 'atm' }),
      makeTask({ id: 't2', poi: 'pharmacy' }),
    ];
    const poiPlaces: PlacesMap = {
      atm:      [makePlace({ placeId: 'atm-1', lat: 0, lng: 0 })],
      pharmacy: [makePlace({ placeId: 'pharm-1', lat: 0, lng: lngOffset(300) })],
    };

    const bundles = computeErrandBundles(tasks, poiPlaces);
    expect(bundles).toHaveLength(1);
    expect(bundles[0].entries.map(e => e.task.id).sort()).toEqual(['t1', 't2']);
  });

  it('does not bundle 2 tasks whose candidates sit just outside the walking radius', () => {
    const tasks = [
      makeTask({ id: 't1', poi: 'atm' }),
      makeTask({ id: 't2', poi: 'pharmacy' }),
    ];
    const poiPlaces: PlacesMap = {
      atm:      [makePlace({ placeId: 'atm-1', lat: 0, lng: 0 })],
      pharmacy: [makePlace({ placeId: 'pharm-1', lat: 0, lng: lngOffset(ERRAND_BUNDLE_RADIUS_M + 50) })],
    };

    expect(computeErrandBundles(tasks, poiPlaces)).toEqual([]);
  });

  it('bundles right at the radius boundary but not just past it', () => {
    const tasks = [
      makeTask({ id: 't1', poi: 'atm' }),
      makeTask({ id: 't2', poi: 'pharmacy' }),
    ];
    const withinRadius: PlacesMap = {
      atm:      [makePlace({ placeId: 'atm-1', lat: 0, lng: 0 })],
      pharmacy: [makePlace({ placeId: 'pharm-1', lat: 0, lng: lngOffset(ERRAND_BUNDLE_RADIUS_M - 1) })],
    };
    expect(computeErrandBundles(tasks, withinRadius)).toHaveLength(1);

    const pastRadius: PlacesMap = {
      atm:      [makePlace({ placeId: 'atm-1', lat: 0, lng: 0 })],
      pharmacy: [makePlace({ placeId: 'pharm-1', lat: 0, lng: lngOffset(ERRAND_BUNDLE_RADIUS_M + 1) })],
    };
    expect(computeErrandBundles(tasks, pastRadius)).toEqual([]);
  });

  it('ignores done tasks and tasks with no poi type', () => {
    const tasks = [
      makeTask({ id: 't1', poi: 'atm', done: true }),
      makeTask({ id: 't2', poi: 'pharmacy' }),
      makeTask({ id: 't3', poi: undefined }),
    ];
    const poiPlaces: PlacesMap = {
      atm:      [makePlace({ placeId: 'atm-1', lat: 0, lng: 0 })],
      pharmacy: [makePlace({ placeId: 'pharm-1', lat: 0, lng: lngOffset(300) })],
    };
    expect(computeErrandBundles(tasks, poiPlaces)).toEqual([]);
  });

  it('does not double-count the same task/poi type toward its own bundle', () => {
    // Two tasks share the same poi type — must still need a genuinely
    // different second task, not the same task's own candidate list twice.
    const tasks = [makeTask({ id: 't1', poi: 'atm' })];
    const poiPlaces: PlacesMap = {
      atm: [
        makePlace({ placeId: 'atm-1', lat: 0, lng: 0 }),
        makePlace({ placeId: 'atm-2', lat: 0, lng: lngOffset(100) }),
      ],
    };
    expect(computeErrandBundles(tasks, poiPlaces)).toEqual([]);
  });
});

describe('computeErrandBundles — ranking', () => {
  it('ranks a 3-task bundle above a 2-task bundle', () => {
    const tasks = [
      makeTask({ id: 't1', poi: 'atm' }),
      makeTask({ id: 't2', poi: 'pharmacy' }),
      makeTask({ id: 't3', poi: 'cafe' }),
      makeTask({ id: 't4', poi: 'supermarket' }),
    ];
    // t1/t2/t3 cluster tightly around 0,0; t4 is far away with no partner.
    const poiPlaces: PlacesMap = {
      atm:         [makePlace({ placeId: 'atm-1', lat: 0, lng: 0 })],
      pharmacy:    [makePlace({ placeId: 'pharm-1', lat: 0, lng: lngOffset(100) })],
      cafe:        [makePlace({ placeId: 'cafe-1', lat: 0, lng: lngOffset(200) })],
      supermarket: [makePlace({ placeId: 'super-1', lat: 5, lng: 5 })],
    };

    const bundles = computeErrandBundles(tasks, poiPlaces);
    expect(bundles).toHaveLength(1);
    expect(bundles[0].entries).toHaveLength(3);
  });

  it('breaks a tie in task count by shorter total walk distance', () => {
    const tasks = [
      makeTask({ id: 't1', poi: 'atm' }),
      makeTask({ id: 't2', poi: 'pharmacy' }),
      makeTask({ id: 't3', poi: 'cafe' }),
      makeTask({ id: 't4', poi: 'supermarket' }),
    ];
    // Two independent, non-overlapping 2-task bundles far apart from each
    // other (lat offset keeps them out of one another's radius): the tight
    // cluster (atm/pharmacy, ~100 m apart) must outrank the loose one
    // (cafe/supermarket, ~650 m apart) despite both meeting the ≥2 threshold.
    const poiPlaces: PlacesMap = {
      atm:         [makePlace({ placeId: 'atm-1', lat: 0, lng: 0 })],
      pharmacy:    [makePlace({ placeId: 'pharm-1', lat: 0, lng: lngOffset(100) })],
      cafe:        [makePlace({ placeId: 'cafe-1', lat: 5, lng: 5 })],
      supermarket: [makePlace({ placeId: 'super-1', lat: 5, lng: 5 + lngOffset(650) })],
    };

    const bundles = computeErrandBundles(tasks, poiPlaces);
    expect(bundles).toHaveLength(2);
    expect(bundles[0].entries.map(e => e.task.id).sort()).toEqual(['t1', 't2']);
    expect(bundles[1].entries.map(e => e.task.id).sort()).toEqual(['t3', 't4']);
  });
});

describe('bundle dismissal', () => {
  it('is not dismissed by default', () => {
    expect(isBundleDismissedToday('anchor-1')).toBe(false);
  });

  it('is dismissed after calling dismissBundleForToday, for that key only', () => {
    dismissBundleForToday('anchor-1');
    expect(isBundleDismissedToday('anchor-1')).toBe(true);
    expect(isBundleDismissedToday('anchor-2')).toBe(false);
  });

  it('does not carry over to a different day', () => {
    dismissBundleForToday('anchor-1');
    mockTodayISO.mockReturnValue('2026-07-07');
    expect(isBundleDismissedToday('anchor-1')).toBe(false);
  });
});

describe('errandBundleKey', () => {
  it('is the anchor place id', () => {
    const bundle = {
      anchor: makePlace({ placeId: 'anchor-xyz' }),
      entries: [],
      totalWalkDistanceMeters: 0,
    };
    expect(errandBundleKey(bundle)).toBe('anchor-xyz');
  });
});
