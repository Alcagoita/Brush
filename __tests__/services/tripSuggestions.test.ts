/**
 * KAN-245 — tripSuggestions: permanent per-signal-instance dismissal store.
 */

interface MockRow { signal_id: string }

let rows: MockRow[] = [];
let getAllSyncShouldThrow = false;
let runSyncShouldThrow = false;

const mockDb = {
  execSync: jest.fn(),
  getAllSync: jest.fn((sql: string, params: unknown[] = []) => {
    if (getAllSyncShouldThrow) { throw new Error('getAllSync boom'); }
    const s = sql.replace(/\s+/g, ' ').trim();
    if (s.startsWith('SELECT signal_id FROM dismissed_signals')) {
      return rows.map(r => ({ signal_id: r.signal_id }));
    }
    const [signalId] = params as [string];
    return rows.some(r => r.signal_id === signalId) ? [{ one: 1 }] : [];
  }),
  runSync: jest.fn((_sql: string, params: unknown[] = []) => {
    if (runSyncShouldThrow) { throw new Error('runSync boom'); }
    const [signalId] = params as [string];
    rows = rows.filter(r => r.signal_id !== signalId);
    rows.push({ signal_id: signalId });
    return {};
  }),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => mockDb),
}));

import {
  isSignalDismissed,
  dismissSignal,
  getDismissedSignalIds,
  detectCalendarSignal,
  detectFarPinSignal,
  CALENDAR_SIGNAL_LOOKAHEAD_DAYS,
  __resetTripSuggestionsDb,
} from '../../src/services/tripSuggestions';
import type { CalendarEventItem } from '../../src/services/calendar';

beforeEach(() => {
  rows = [];
  getAllSyncShouldThrow = false;
  runSyncShouldThrow = false;
  jest.clearAllMocks();
  __resetTripSuggestionsDb();
});

describe('tripSuggestions dismissal store', () => {
  it('a signal not yet dismissed reads as not dismissed', () => {
    expect(isSignalDismissed('calendar:evt-1')).toBe(false);
  });

  it('dismissSignal marks it dismissed', () => {
    dismissSignal('calendar:evt-1');
    expect(isSignalDismissed('calendar:evt-1')).toBe(true);
  });

  it('dismissal is permanent — no day scoping, survives a "new day"', () => {
    dismissSignal('farpin:task-1');
    // Unlike errandBundles, there's no date param at all — nothing to roll over.
    expect(isSignalDismissed('farpin:task-1')).toBe(true);
  });

  it('dismissing one signal does not affect another', () => {
    dismissSignal('calendar:evt-1');
    expect(isSignalDismissed('calendar:evt-2')).toBe(false);
  });

  it('a new instance for the same underlying event/task is a distinct id, not auto-dismissed', () => {
    dismissSignal('calendar:evt-1');
    // Caller is responsible for minting a new id for a rescheduled event —
    // this store just does exact-id matching.
    expect(isSignalDismissed('calendar:evt-1-rescheduled')).toBe(false);
  });

  it('getDismissedSignalIds returns every dismissed id in one query', () => {
    dismissSignal('calendar:evt-1');
    dismissSignal('farpin:task-1');
    expect(getDismissedSignalIds()).toEqual(new Set(['calendar:evt-1', 'farpin:task-1']));
  });

  it('getDismissedSignalIds returns an empty set when nothing is dismissed', () => {
    expect(getDismissedSignalIds()).toEqual(new Set());
  });

  it('isSignalDismissed fails open (false) on a DB read error', () => {
    getAllSyncShouldThrow = true;
    expect(isSignalDismissed('calendar:evt-1')).toBe(false);
  });

  it('getDismissedSignalIds fails open (empty set) on a DB read error', () => {
    getAllSyncShouldThrow = true;
    expect(getDismissedSignalIds()).toEqual(new Set());
  });

  it('dismissSignal does not throw on a DB write error', () => {
    runSyncShouldThrow = true;
    expect(() => dismissSignal('calendar:evt-1')).not.toThrow();
  });
});

// ─── Signal detection ───────────────────────────────────────────────────────

function makeEvent(overrides: Partial<CalendarEventItem> = {}): CalendarEventItem {
  return {
    id: 'evt-1',
    title: 'Team offsite',
    startDateString: '2026-07-15T09:00:00.000Z',
    isAllDay: false,
    ...overrides,
  };
}

const NOW = new Date('2026-07-11T00:00:00.000Z');
const KNOWN_AREAS = ['Faro, Portugal', 'Downtown Mall'];

describe('detectCalendarSignal', () => {
  it('fires for an event with a location outside every known area, within the lookahead window', () => {
    const result = detectCalendarSignal(
      [makeEvent({ location: 'Berlin, Germany' })],
      KNOWN_AREAS,
      new Set(),
      NOW,
    );
    expect(result).toEqual({
      signalId: 'calendar:evt-1',
      eventId:  'evt-1',
      place:    'Berlin, Germany',
      dateISO:  '2026-07-15T09:00:00.000Z',
    });
  });

  it('does not fire for an event with no location', () => {
    const result = detectCalendarSignal([makeEvent({ location: undefined })], KNOWN_AREAS, new Set(), NOW);
    expect(result).toBeNull();
  });

  it('does not fire when the event location matches a known area name (substring, case-insensitive)', () => {
    const result = detectCalendarSignal(
      [makeEvent({ location: 'somewhere near faro, portugal' })],
      KNOWN_AREAS,
      new Set(),
      NOW,
    );
    expect(result).toBeNull();
  });

  it('does not fire when a known area name contains the event location (reverse match)', () => {
    const result = detectCalendarSignal(
      [makeEvent({ location: 'Faro' })],
      KNOWN_AREAS,
      new Set(),
      NOW,
    );
    expect(result).toBeNull();
  });

  it(`does not fire for an event beyond the ${CALENDAR_SIGNAL_LOOKAHEAD_DAYS}-day lookahead window`, () => {
    const tooFar = new Date(NOW);
    tooFar.setDate(tooFar.getDate() + CALENDAR_SIGNAL_LOOKAHEAD_DAYS + 1);
    const result = detectCalendarSignal(
      [makeEvent({ location: 'Berlin, Germany', startDateString: tooFar.toISOString() })],
      KNOWN_AREAS,
      new Set(),
      NOW,
    );
    expect(result).toBeNull();
  });

  it('does not fire for a past event', () => {
    const past = new Date(NOW);
    past.setDate(past.getDate() - 1);
    const result = detectCalendarSignal(
      [makeEvent({ location: 'Berlin, Germany', startDateString: past.toISOString() })],
      KNOWN_AREAS,
      new Set(),
      NOW,
    );
    expect(result).toBeNull();
  });

  it('does not fire for an already-dismissed signal id', () => {
    const result = detectCalendarSignal(
      [makeEvent({ location: 'Berlin, Germany' })],
      KNOWN_AREAS,
      new Set(['calendar:evt-1']),
      NOW,
    );
    expect(result).toBeNull();
  });

  it('picks the earliest-dated eligible candidate when multiple qualify', () => {
    const later = makeEvent({ id: 'evt-later', location: 'Rome, Italy', startDateString: '2026-07-17T09:00:00.000Z' });
    const earlier = makeEvent({ id: 'evt-earlier', location: 'Berlin, Germany', startDateString: '2026-07-13T09:00:00.000Z' });
    const result = detectCalendarSignal([later, earlier], KNOWN_AREAS, new Set(), NOW);
    expect(result?.eventId).toBe('evt-earlier');
  });

  it('returns null when there are no events', () => {
    expect(detectCalendarSignal([], KNOWN_AREAS, new Set(), NOW)).toBeNull();
  });
});

describe('detectFarPinSignal', () => {
  it('fires when the pinned place is outside every known area and not dismissed', () => {
    const result = detectFarPinSignal('task-1', 'Some Café', false, new Set());
    expect(result).toEqual({ signalId: 'farpin:task-1', taskId: 'task-1', placeName: 'Some Café' });
  });

  it('does not fire when the pinned place is inside a known area', () => {
    expect(detectFarPinSignal('task-1', 'Some Café', true, new Set())).toBeNull();
  });

  it('does not fire for an already-dismissed signal id', () => {
    expect(detectFarPinSignal('task-1', 'Some Café', false, new Set(['farpin:task-1']))).toBeNull();
  });
});
