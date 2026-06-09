/**
 * KAN-120 — notifications service: EOD check-in logic.
 *
 * Verifies:
 *  - buildEodBody returns correct singular / plural copy
 *  - scheduleEodReminder: no-ops when disabled
 *  - scheduleEodReminder: no-ops when incompleteCount is 0
 *  - scheduleEodReminder: no-ops when time has already passed today
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

/** Returns a future HH:MM time (1 hour from now). */
function futureTime(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Returns a past HH:MM time (1 hour ago). */
function pastTime(): string {
  const d = new Date(Date.now() - 60 * 60 * 1000);
  const h = d.getHours();
  const m = d.getMinutes();
  // Clamp to valid time range
  if (h < 0) { return '00:00'; }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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

  it('does NOT call createTriggerNotification when time has already passed', async () => {
    await scheduleEodReminder({ enabled: true, time: pastTime(), incompleteCount: 2 });
    expect(mockCreateTriggerNotification).not.toHaveBeenCalled();
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
