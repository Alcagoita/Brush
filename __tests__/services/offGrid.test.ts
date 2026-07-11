/**
 * KAN-246 — offGrid.ts: duration → expiry resolution.
 */

// offGrid.ts only needs TRIP_RADIUS_PRESETS from tripDownload.ts, which
// otherwise pulls in NetInfo/expo-sqlite/Firestore native modules this pure
// duration/radius test has no business depending on — stub the one value used.
jest.mock('../../src/services/tripDownload', () => ({
  TRIP_RADIUS_PRESETS: [
    { key: 'town', radiusMeters: 5_000 },
    { key: 'town_and_around', radiusMeters: 15_000 },
    { key: 'region', radiusMeters: 40_000 },
  ],
}));

import { computeOffGridExpiresAt, countBrushedDuringWindow, OFFGRID_AREA_RADIUS_M } from '../../src/services/offGrid';
import type { Task } from '../../src/types';

describe('OFFGRID_AREA_RADIUS_M', () => {
  // habitatCache.ts's HABITAT_RADIUS_M (5km) pulls in NetInfo/expo-sqlite
  // native modules this pure-logic test has no business depending on —
  // the value is a stable, documented constant, asserted directly.
  it('is larger than the ambient habitat radius (HABITAT_RADIUS_M = 5,000m)', () => {
    expect(OFFGRID_AREA_RADIUS_M).toBeGreaterThan(5_000);
  });
});

describe('computeOffGridExpiresAt', () => {
  const NOW = new Date('2026-07-15T10:00:00').getTime(); // 10:00 local

  it('few_hours resolves to now + 5h', () => {
    expect(computeOffGridExpiresAt('few_hours', undefined, NOW)).toBe(NOW + 5 * 60 * 60 * 1_000);
  });

  it('until_tonight resolves to 22:00 local today when that is still ahead', () => {
    const result = computeOffGridExpiresAt('until_tonight', undefined, NOW);
    const d = new Date(result);
    expect(d.getHours()).toBe(22);
    expect(d.getMinutes()).toBe(0);
    expect(d > new Date(NOW)).toBe(true);
  });

  it('until_tonight falls back to now + 3h when 22:00 has already passed today', () => {
    const lateNow = new Date('2026-07-15T23:00:00').getTime(); // 23:00 local
    expect(computeOffGridExpiresAt('until_tonight', undefined, lateNow)).toBe(lateNow + 3 * 60 * 60 * 1_000);
  });

  it('pick_time uses the supplied future time as-is', () => {
    const picked = NOW + 2 * 60 * 60 * 1_000;
    expect(computeOffGridExpiresAt('pick_time', picked, NOW)).toBe(picked);
  });

  it('pick_time falls back to now + 5h when the supplied time is in the past', () => {
    const pastPick = NOW - 1_000;
    expect(computeOffGridExpiresAt('pick_time', pastPick, NOW)).toBe(NOW + 5 * 60 * 60 * 1_000);
  });

  it('pick_time falls back to now + 5h when no time is supplied', () => {
    expect(computeOffGridExpiresAt('pick_time', undefined, NOW)).toBe(NOW + 5 * 60 * 60 * 1_000);
  });
});

describe('countBrushedDuringWindow', () => {
  const WINDOW_START = new Date('2026-07-15T10:00:00Z').getTime();
  const WINDOW_END   = new Date('2026-07-15T15:00:00Z').getTime();

  function makeTask(overrides: Partial<Task> = {}): Task {
    return {
      id: 't1', title: 'Task', category: 'errands', done: true,
      date: '2026-07-15', createdAt: {} as unknown as Task['createdAt'],
      ...overrides,
    };
  }

  function ts(iso: string) {
    return { toDate: () => new Date(iso) } as unknown as Task['completedAt'];
  }

  it('counts a task completed inside the window', () => {
    const tasks = [makeTask({ completedAt: ts('2026-07-15T12:00:00Z') })];
    expect(countBrushedDuringWindow(tasks, WINDOW_START, WINDOW_END)).toBe(1);
  });

  it('does not count a task completed before the window', () => {
    const tasks = [makeTask({ completedAt: ts('2026-07-15T09:00:00Z') })];
    expect(countBrushedDuringWindow(tasks, WINDOW_START, WINDOW_END)).toBe(0);
  });

  it('does not count a task completed after the window', () => {
    const tasks = [makeTask({ completedAt: ts('2026-07-15T16:00:00Z') })];
    expect(countBrushedDuringWindow(tasks, WINDOW_START, WINDOW_END)).toBe(0);
  });

  it('does not count a task with no completedAt (still open)', () => {
    const tasks = [makeTask({ completedAt: undefined, done: false })];
    expect(countBrushedDuringWindow(tasks, WINDOW_START, WINDOW_END)).toBe(0);
  });

  it('counts the window boundaries inclusively', () => {
    const tasks = [
      makeTask({ id: 'start', completedAt: ts('2026-07-15T10:00:00Z') }),
      makeTask({ id: 'end',   completedAt: ts('2026-07-15T15:00:00Z') }),
    ];
    expect(countBrushedDuringWindow(tasks, WINDOW_START, WINDOW_END)).toBe(2);
  });

  it('counts multiple qualifying tasks', () => {
    const tasks = [
      makeTask({ id: 'a', completedAt: ts('2026-07-15T11:00:00Z') }),
      makeTask({ id: 'b', completedAt: ts('2026-07-15T13:00:00Z') }),
      makeTask({ id: 'c', completedAt: ts('2026-07-15T09:00:00Z') }), // before
    ];
    expect(countBrushedDuringWindow(tasks, WINDOW_START, WINDOW_END)).toBe(2);
  });

  it('returns 0 for an empty task list', () => {
    expect(countBrushedDuringWindow([], WINDOW_START, WINDOW_END)).toBe(0);
  });
});
