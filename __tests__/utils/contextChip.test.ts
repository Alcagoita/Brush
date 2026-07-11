/**
 * KAN-242 — ContextChip priority resolver.
 *
 * Covers the AC directly: mall > trip > offline glyph > none, overlap
 * cases never render two indicators, and trip's date gating.
 */
import { isTodayWithinTripDates, resolveContextChipView } from '../../src/utils/contextChip';
import type { MallSnapshot, Trip } from '../../src/types';

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    destination: 'Faro',
    placeRef: 'place-1',
    centerLat: 0,
    centerLng: 0,
    areaRadius: 5_000,
    cacheAreaId: 'area-1',
    expiresAt: Date.now() + 1_000_000,
    createdAt: {} as Trip['createdAt'],
    ...overrides,
  };
}

function makeMallSnapshot(overrides: Partial<MallSnapshot> = {}): MallSnapshot {
  return {
    placeId: 'mall-1',
    name: 'Colombo',
    centerLat: 0,
    centerLng: 0,
    radius: 300,
    cacheAreaId: 'mall_snapshot',
    expiresAt: Date.now() + 1_000_000,
    createdAt: {} as MallSnapshot['createdAt'],
    ...overrides,
  };
}

describe('isTodayWithinTripDates', () => {
  it('is true for a dateless trip (both skipped)', () => {
    expect(isTodayWithinTripDates(makeTrip({ startDate: undefined, endDate: undefined }), '2026-07-06')).toBe(true);
  });

  it('is true when today falls within start/end', () => {
    const trip = makeTrip({ startDate: '2026-07-01', endDate: '2026-07-24' });
    expect(isTodayWithinTripDates(trip, '2026-07-06')).toBe(true);
  });

  it('is false before the start date', () => {
    const trip = makeTrip({ startDate: '2026-07-10', endDate: '2026-07-24' });
    expect(isTodayWithinTripDates(trip, '2026-07-06')).toBe(false);
  });

  it('is false after the end date', () => {
    const trip = makeTrip({ startDate: '2026-07-01', endDate: '2026-07-04' });
    expect(isTodayWithinTripDates(trip, '2026-07-06')).toBe(false);
  });
});

describe('resolveContextChipView — priority mall > trip > offline > none', () => {
  const baseInput = { todayIso: '2026-07-06', offline: false, hasCache: false as boolean | null };

  it('shows the mall chip when the place context is a mall', () => {
    const view = resolveContextChipView({
      ...baseInput,
      placeContext: { kind: 'mall', snapshot: makeMallSnapshot({ name: 'Colombo' }) },
    });
    expect(view).toEqual({ kind: 'mall', name: 'Colombo', offlineDot: false });
  });

  it('shows the trip chip when inside an active trip within its dates', () => {
    const trip = makeTrip({ destination: 'Faro', startDate: '2026-07-01', endDate: '2026-07-24' });
    const view = resolveContextChipView({ ...baseInput, placeContext: { kind: 'trip', trip } });
    expect(view).toEqual({
      kind: 'trip', destination: 'Faro', startDate: '2026-07-01', endDate: '2026-07-24', offlineDot: false,
    });
  });

  it('the resolved view is always exactly one kind — a mall view never carries trip fields', () => {
    const view = resolveContextChipView({
      ...baseInput,
      placeContext: { kind: 'mall', snapshot: makeMallSnapshot({ name: 'Colombo' }) },
    });
    expect(view.kind).toBe('mall');
    expect(view).not.toHaveProperty('destination');
  });

  it('falls through to offline glyph when the trip is outside its dates', () => {
    const trip = makeTrip({ startDate: '2026-08-01', endDate: '2026-08-10' });
    const view = resolveContextChipView({
      todayIso: '2026-07-06', offline: true, hasCache: true,
      placeContext: { kind: 'trip', trip },
    });
    expect(view).toEqual({ kind: 'offline' });
  });

  it('falls through to offline glyph when there is no place context', () => {
    const view = resolveContextChipView({ ...baseInput, offline: true, hasCache: true, placeContext: null });
    expect(view).toEqual({ kind: 'offline' });
  });

  it('shows nothing when offline but hasCache is null (not yet known)', () => {
    const view = resolveContextChipView({ ...baseInput, offline: true, hasCache: null, placeContext: null });
    expect(view).toEqual({ kind: 'none' });
  });

  it('shows nothing online with no place context', () => {
    const view = resolveContextChipView({ ...baseInput, placeContext: null });
    expect(view).toEqual({ kind: 'none' });
  });

  it('sets offlineDot on the mall chip when offline (modifier, not a separate indicator)', () => {
    const view = resolveContextChipView({
      todayIso: '2026-07-06', offline: true, hasCache: true,
      placeContext: { kind: 'mall', snapshot: makeMallSnapshot() },
    });
    expect(view).toMatchObject({ kind: 'mall', offlineDot: true });
  });

  it('sets offlineDot on the trip chip when offline', () => {
    const trip = makeTrip({ startDate: '2026-07-01', endDate: '2026-07-24' });
    const view = resolveContextChipView({
      todayIso: '2026-07-06', offline: true, hasCache: true,
      placeContext: { kind: 'trip', trip },
    });
    expect(view).toMatchObject({ kind: 'trip', offlineDot: true });
  });
});

describe('off-grid window priority (KAN-246)', () => {
  const baseInput = { todayIso: '2026-07-06', offline: false, hasCache: false as boolean | null };
  const offGridWindow = { destination: 'this area', expiresAt: 1_800_000_000_000 };

  it('shows the off-grid view when a window is active and there is no place context', () => {
    const view = resolveContextChipView({ ...baseInput, placeContext: null, offGridWindow });
    expect(view).toEqual({ kind: 'offgrid', destination: 'this area', expiresAt: 1_800_000_000_000 });
  });

  it('mall still wins over an active off-grid window', () => {
    const view = resolveContextChipView({
      ...baseInput,
      placeContext: { kind: 'mall', snapshot: makeMallSnapshot() },
      offGridWindow,
    });
    expect(view.kind).toBe('mall');
  });

  it('a real trip still wins over an active off-grid window', () => {
    const trip = makeTrip({ startDate: '2026-07-01', endDate: '2026-07-24' });
    const view = resolveContextChipView({
      ...baseInput,
      todayIso: '2026-07-06',
      placeContext: { kind: 'trip', trip },
      offGridWindow,
    });
    expect(view.kind).toBe('trip');
  });

  it('off-grid wins over the plain offline glyph', () => {
    const view = resolveContextChipView({
      ...baseInput, offline: true, hasCache: true, placeContext: null, offGridWindow,
    });
    expect(view).toEqual({ kind: 'offgrid', destination: 'this area', expiresAt: 1_800_000_000_000 });
  });

  it('falls through to offline glyph when there is no active off-grid window', () => {
    const view = resolveContextChipView({
      ...baseInput, offline: true, hasCache: true, placeContext: null, offGridWindow: null,
    });
    expect(view).toEqual({ kind: 'offline' });
  });

  it('is unaffected by callers that omit offGridWindow entirely (defaults to null)', () => {
    const view = resolveContextChipView({ ...baseInput, placeContext: null });
    expect(view).toEqual({ kind: 'none' });
  });
});
