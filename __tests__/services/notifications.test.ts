/**
 * KAN-120 / KAN-121 — notifications service: EOD check-in + streak-at-risk.
 *
 * Verifies:
 *  - buildEodBody returns correct singular / plural copy
 *  - scheduleEodReminder: no-ops when disabled
 *  - scheduleEodReminder: no-ops when incompleteCount is 0
 *  - scheduleEodReminder: rolls forward to tomorrow when time has already passed
 *  - scheduleEodReminder: calls createTriggerNotification when conditions met
 *  - cancelEodReminder: delegates to notifee.cancelNotification
 *  - buildStreakBody returns correct copy
 *  - scheduleStreakReminder: no-ops when disabled
 *  - scheduleStreakReminder: no-ops when streak < 3
 *  - scheduleStreakReminder: no-ops when tasksCompletedToday > 0
 *  - scheduleStreakReminder: schedules at 8 PM when all conditions met
 *  - scheduleStreakReminder: rolls forward when 8 PM already passed
 *  - cancelStreakReminder: delegates to notifee.cancelNotification
 */

import {
  buildEodBody,
  scheduleEodReminder,
  cancelEodReminder,
  buildStreakBody,
  scheduleStreakReminder,
  cancelStreakReminder,
} from '../../src/services/notifications';

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

// ─── Streak at risk (KAN-121) ─────────────────────────────────────────────────

describe('buildStreakBody', () => {
  it('embeds the streak count in the copy', () => {
    expect(buildStreakBody(7)).toBe(
      'Your 7-day streak ends at midnight — brush something away.',
    );
  });

  it('works for large streaks', () => {
    expect(buildStreakBody(30)).toContain('30-day streak');
  });
});

describe('scheduleStreakReminder', () => {
  beforeEach(() => jest.clearAllMocks());

  it('cancels any existing streak notification first', async () => {
    await scheduleStreakReminder({ enabled: true, streakDays: 5, tasksCompletedToday: 0 });
    expect(mockCancelNotification).toHaveBeenCalledWith('streak-at-risk');
  });

  it('does NOT schedule when disabled', async () => {
    await scheduleStreakReminder({ enabled: false, streakDays: 5, tasksCompletedToday: 0 });
    expect(mockCreateTriggerNotification).not.toHaveBeenCalled();
  });

  it('does NOT schedule when streak < 3', async () => {
    await scheduleStreakReminder({ enabled: true, streakDays: 2, tasksCompletedToday: 0 });
    expect(mockCreateTriggerNotification).not.toHaveBeenCalled();
  });

  it('does NOT schedule when streak === 0', async () => {
    await scheduleStreakReminder({ enabled: true, streakDays: 0, tasksCompletedToday: 0 });
    expect(mockCreateTriggerNotification).not.toHaveBeenCalled();
  });

  it('does NOT schedule when tasksCompletedToday > 0', async () => {
    await scheduleStreakReminder({ enabled: true, streakDays: 7, tasksCompletedToday: 1 });
    expect(mockCreateTriggerNotification).not.toHaveBeenCalled();
  });

  it('schedules when enabled, streak ≥ 3, and 0 tasks completed today', async () => {
    await scheduleStreakReminder({ enabled: true, streakDays: 7, tasksCompletedToday: 0 });
    expect(mockCreateTriggerNotification).toHaveBeenCalledTimes(1);
    const [notif, trigger] = mockCreateTriggerNotification.mock.calls[0];
    expect(notif.id).toBe('streak-at-risk');
    expect(notif.body).toContain('7-day streak');
    expect(trigger.type).toBe(0); // TriggerType.TIMESTAMP
    expect(trigger.timestamp).toBeGreaterThan(Date.now());
  });

  it('rolls forward to tomorrow when 8 PM has already passed today', async () => {
    // Fake Date.now() to be 21:00 so the 20:00 fire time is in the past
    const fakeNow = new Date();
    fakeNow.setHours(21, 0, 0, 0);
    jest.spyOn(Date, 'now').mockReturnValue(fakeNow.getTime());

    await scheduleStreakReminder({ enabled: true, streakDays: 5, tasksCompletedToday: 0 });

    const [, trigger] = mockCreateTriggerNotification.mock.calls[0];
    // Tomorrow at 8 PM is definitely after our faked "now" of 9 PM today
    expect(trigger.timestamp).toBeGreaterThan(fakeNow.getTime());

    jest.restoreAllMocks();
  });

  it('notification body contains correct streak count', async () => {
    await scheduleStreakReminder({ enabled: true, streakDays: 14, tasksCompletedToday: 0 });
    const [notif] = mockCreateTriggerNotification.mock.calls[0];
    expect(notif.body).toBe('Your 14-day streak ends at midnight — brush something away.');
  });

  it('notification data contains screen:Today for tap routing', async () => {
    await scheduleStreakReminder({ enabled: true, streakDays: 5, tasksCompletedToday: 0 });
    const [notif] = mockCreateTriggerNotification.mock.calls[0];
    expect(notif.data?.screen).toBe('Today');
  });
});

describe('cancelStreakReminder', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls notifee.cancelNotification with the streak id', async () => {
    await cancelStreakReminder();
    expect(mockCancelNotification).toHaveBeenCalledWith('streak-at-risk');
  });
});
