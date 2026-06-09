/**
 * KAN-120 — notifications service: EOD check-in logic.
 *
 * Verifies:
 *  - buildEodBody returns correct singular / plural copy
 *  - scheduleEodReminder: no-ops when disabled
 *  - scheduleEodReminder: no-ops when incompleteCount is 0
 *  - scheduleEodReminder: rolls forward to tomorrow when time has already passed
 *  - scheduleEodReminder: calls createTriggerNotification when conditions met
 *  - cancelEodReminder: delegates to notifee.cancelNotification
 */

import { buildEodBody, scheduleEodReminder, cancelEodReminder } from '../../src/services/notifications';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockCreateChannel           = jest.fn().mockResolvedValue(undefined);
const mockCreateTriggerNotification = jest.fn().mockResolvedValue(undefined);
const mockCancelNotification      = jest.fn().mockResolvedValue(undefined);

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel:            (...args: any[]) => mockCreateChannel(...args),
    createTriggerNotification: (...args: any[]) => mockCreateTriggerNotification(...args),
    cancelNotification:        (...args: any[]) => mockCancelNotification(...args),
  },
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  AndroidVisibility: { PUBLIC: 1 },
  TriggerType:       { TIMESTAMP: 0 },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns a future HH:00 time (+2 h, wrapping via modulo so it always
 * maps to a valid same-day or same-context hour — no midnight overflow).
 */
function futureTime(): string {
  const safeHour = (new Date().getHours() + 2) % 24;
  return `${String(safeHour).padStart(2, '0')}:00`;
}

/**
 * Returns a past HH:00 time (−1 h, clamped so it never goes negative).
 */
function pastTime(): string {
  const h = new Date().getHours();
  const safeHour = h === 0 ? 23 : h - 1;
  return `${String(safeHour).padStart(2, '0')}:00`;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildEodBody', () => {
  it('returns singular copy for 1 task', () => {
    expect(buildEodBody(1)).toBe(
      "How'd the brushing go today? You've still got 1 task on your list.",
    );
  });

  it('returns plural copy for 2 tasks', () => {
    expect(buildEodBody(2)).toContain('2 tasks still waiting');
  });

  it('returns plural copy for many tasks', () => {
    expect(buildEodBody(5)).toContain('5 tasks still waiting');
  });
});

describe('scheduleEodReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cancels any existing notification before scheduling', async () => {
    await scheduleEodReminder({ enabled: true, time: futureTime(), incompleteCount: 2 });
    expect(mockCancelNotification).toHaveBeenCalledWith('eod-checkin');
  });

  it('does NOT call createTriggerNotification when disabled', async () => {
    await scheduleEodReminder({ enabled: false, time: futureTime(), incompleteCount: 3 });
    expect(mockCreateTriggerNotification).not.toHaveBeenCalled();
  });

  it('does NOT call createTriggerNotification when incompleteCount is 0', async () => {
    await scheduleEodReminder({ enabled: true, time: futureTime(), incompleteCount: 0 });
    expect(mockCreateTriggerNotification).not.toHaveBeenCalled();
  });

  it('rolls forward to tomorrow and still schedules when time has already passed today', async () => {
    await scheduleEodReminder({ enabled: true, time: pastTime(), incompleteCount: 2 });
    expect(mockCreateTriggerNotification).toHaveBeenCalledTimes(1);
    const [, trigger] = mockCreateTriggerNotification.mock.calls[0];
    // Timestamp should be in the future (tomorrow)
    expect(trigger.timestamp).toBeGreaterThan(Date.now());
  });

  it('schedules a notification when enabled, count > 0, and time is in the future', async () => {
    await scheduleEodReminder({ enabled: true, time: futureTime(), incompleteCount: 3 });
    expect(mockCreateTriggerNotification).toHaveBeenCalledTimes(1);
    const [notif, trigger] = mockCreateTriggerNotification.mock.calls[0];
    expect(notif.id).toBe('eod-checkin');
    expect(notif.body).toContain('3 tasks still waiting');
    expect(trigger.type).toBe(0); // TriggerType.TIMESTAMP
    expect(trigger.timestamp).toBeGreaterThan(Date.now());
  });

  it('notification data contains screen:Today for tap routing', async () => {
    await scheduleEodReminder({ enabled: true, time: futureTime(), incompleteCount: 1 });
    const [notif] = mockCreateTriggerNotification.mock.calls[0];
    expect(notif.data?.screen).toBe('Today');
  });
});

describe('cancelEodReminder', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls notifee.cancelNotification with the EOD id', async () => {
    await cancelEodReminder();
    expect(mockCancelNotification).toHaveBeenCalledWith('eod-checkin');
  });
});
