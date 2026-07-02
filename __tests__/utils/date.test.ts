import { toDateSafe, relativeTime } from '../../src/utils/date';

describe('toDateSafe', () => {
  it('returns null for null/undefined', () => {
    expect(toDateSafe(null)).toBeNull();
    expect(toDateSafe(undefined)).toBeNull();
  });

  it('passes through a native Date unchanged', () => {
    const d = new Date('2026-05-01T12:00:00.000Z');
    expect(toDateSafe(d)).toBe(d);
  });

  it('coerces a Firestore-Timestamp-like object via toDate()', () => {
    const date = new Date('2026-05-01T12:00:00.000Z');
    const ts = { toDate: () => date };
    expect(toDateSafe(ts)).toBe(date);
  });

  it('falls back to a plain {_seconds} object', () => {
    const seconds = 1_800_000_000;
    const result = toDateSafe({ _seconds: seconds });
    expect(result).toEqual(new Date(seconds * 1000));
  });

  it('returns null for an object with neither toDate nor _seconds', () => {
    expect(toDateSafe({ foo: 'bar' })).toBeNull();
  });

  it('returns null for a primitive that is not a Date', () => {
    expect(toDateSafe('2026-05-01')).toBeNull();
    expect(toDateSafe(12345)).toBeNull();
  });
});

describe('relativeTime', () => {
  const NOW = new Date('2026-05-01T12:00:00.000Z').getTime();

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns an empty string when the timestamp cannot be coerced', () => {
    expect(relativeTime(null)).toBe('');
    expect(relativeTime({})).toBe('');
  });

  it('returns "just now" for under a minute', () => {
    const ts = { toDate: () => new Date(NOW - 30_000) };
    expect(relativeTime(ts)).toBe('just now');
  });

  it('returns minutes for under an hour', () => {
    const ts = { toDate: () => new Date(NOW - 5 * 60_000) };
    expect(relativeTime(ts)).toBe('5m ago');
  });

  it('returns hours for under a day', () => {
    const ts = { toDate: () => new Date(NOW - 3 * 60 * 60_000) };
    expect(relativeTime(ts)).toBe('3h ago');
  });

  it('returns days for a day or more', () => {
    const ts = { toDate: () => new Date(NOW - 2 * 24 * 60 * 60_000) };
    expect(relativeTime(ts)).toBe('2d ago');
  });
});
