/**
 * KAN-120 / KAN-121 / KAN-123 / KAN-119 — notifications service.
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
 *  - buildWeeklyBody: 0-task, ≥1-task, streak suffix variants
 *  - nextSundayAt7PM: returns correct upcoming Sunday at 19:00
 *  - scheduleWeeklyRecap: no-ops when disabled or not opened this week
 *  - scheduleWeeklyRecap: schedules correctly when conditions met
 *  - cancelWeeklyRecap: delegates to notifee.cancelNotification
 *  - buildExitBody: with / without store name (KAN-119)
 *  - fireExitPrompt: calls displayNotification with correct body + actions (KAN-119)
 */

import {
  buildEodBody,
  scheduleEodReminder,
  cancelEodReminder,
  buildStreakBody,
  scheduleStreakReminder,
  cancelStreakReminder,
  buildWeeklyBody,
  nextSundayAt7PM,
  scheduleWeeklyRecap,
  cancelWeeklyRecap,
  buildExitBody,
  fireExitPrompt,
  registerExitPromptCategory,
  EXIT_ACTION_MARK_DONE,
} from '../../src/services/notifications';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockCreateChannel              = jest.fn().mockResolvedValue(undefined);
const mockCreateTriggerNotification  = jest.fn().mockResolvedValue(undefined);
const mockCancelNotification         = jest.fn().mockResolvedValue(undefined);
const mockDisplayNotification        = jest.fn().mockResolvedValue(undefined);
const mockSetNotificationCategories  = jest.fn().mockResolvedValue(undefined);

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel:              (...args: any[]) => mockCreateChannel(...args),
    createTriggerNotification:  (...args: any[]) => mockCreateTriggerNotification(...args),
    cancelNotification:          (...args: any[]) => mockCancelNotification(...args),
    displayNotification:         (...args: any[]) => mockDisplayNotification(...args),
    setNotificationCategories:   (...args: any[]) => mockSetNotificationCategories(...args),
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

// ─── Weekly recap (KAN-123) ───────────────────────────────────────────────────

describe('buildWeeklyBody', () => {
  it('returns zero-task copy when weeklyCount is 0', () => {
    expect(buildWeeklyBody(0, 0)).toBe('Fresh week ahead — time to start brushing.');
  });

  it('returns zero-task copy regardless of streak when count is 0', () => {
    expect(buildWeeklyBody(0, 10)).toBe('Fresh week ahead — time to start brushing.');
  });

  it('includes streak suffix when count ≥ 1 and streak ≥ 3', () => {
    expect(buildWeeklyBody(5, 7)).toBe('You brushed away 5 tasks this week. 7-day streak going strong.');
  });

  it('uses "Keep it brushing" suffix when count ≥ 1 and streak < 3', () => {
    expect(buildWeeklyBody(3, 2)).toBe('You brushed away 3 tasks this week. Keep it brushing.');
  });

  it('uses singular "task" when count is 1', () => {
    expect(buildWeeklyBody(1, 0)).toBe('You brushed away 1 task this week. Keep it brushing.');
  });

  it('uses streak suffix at exactly streak === 3', () => {
    expect(buildWeeklyBody(4, 3)).toContain('3-day streak going strong.');
  });
});

describe('nextSundayAt7PM', () => {
  /** Returns a Date set to the given day-of-week and hour (this week). */
  function makeDayTime(day: 0 | 1 | 2 | 3 | 4 | 5 | 6, hour: number): Date {
    const d = new Date();
    // Advance/rewind to the target day within ±7 days
    const diff = day - d.getDay();
    d.setDate(d.getDate() + diff);
    d.setHours(hour, 0, 0, 0);
    return d;
  }

  it('always returns a Date at 19:00', () => {
    const result = nextSundayAt7PM();
    expect(result.getHours()).toBe(19);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });

  it('always returns day-of-week 0 (Sunday)', () => {
    const result = nextSundayAt7PM();
    expect(result.getDay()).toBe(0);
  });

  it('returns today at 7 PM when today is Sunday before 7 PM', () => {
    const sundayAt3PM = makeDayTime(0, 15);
    const result = nextSundayAt7PM(sundayAt3PM);
    expect(result.getDay()).toBe(0);
    expect(result.getDate()).toBe(sundayAt3PM.getDate()); // same day
    expect(result.getHours()).toBe(19);
  });

  it('returns next Sunday when today is Sunday after 7 PM', () => {
    const sundayAt8PM = makeDayTime(0, 20);
    const result = nextSundayAt7PM(sundayAt8PM);
    // Should be 7 days later
    expect(result.getDate()).toBe(sundayAt8PM.getDate() + 7);
    expect(result.getHours()).toBe(19);
  });

  it('returns next Sunday when today is a weekday', () => {
    const wednesday = makeDayTime(3, 10); // Wednesday 10:00
    const result = nextSundayAt7PM(wednesday);
    expect(result.getDay()).toBe(0);
    // 4 days until Sunday from Wednesday
    expect(result.getDate()).toBe(wednesday.getDate() + 4);
  });
});

describe('scheduleWeeklyRecap', () => {
  beforeEach(() => jest.clearAllMocks());

  it('cancels any existing notification before scheduling', async () => {
    await scheduleWeeklyRecap({ enabled: true, weeklyCount: 3, streakDays: 0, appOpenedThisWeek: true });
    expect(mockCancelNotification).toHaveBeenCalledWith('weekly-recap');
  });

  it('does NOT schedule when disabled', async () => {
    await scheduleWeeklyRecap({ enabled: false, weeklyCount: 3, streakDays: 0, appOpenedThisWeek: true });
    expect(mockCreateTriggerNotification).not.toHaveBeenCalled();
  });

  it('does NOT schedule when app not opened this week', async () => {
    await scheduleWeeklyRecap({ enabled: true, weeklyCount: 0, streakDays: 0, appOpenedThisWeek: false });
    expect(mockCreateTriggerNotification).not.toHaveBeenCalled();
  });

  it('schedules when enabled and app opened this week', async () => {
    await scheduleWeeklyRecap({ enabled: true, weeklyCount: 5, streakDays: 0, appOpenedThisWeek: true });
    expect(mockCreateTriggerNotification).toHaveBeenCalledTimes(1);
    const [notif, trigger] = mockCreateTriggerNotification.mock.calls[0];
    expect(notif.id).toBe('weekly-recap');
    expect(trigger.type).toBe(0); // TriggerType.TIMESTAMP
    expect(trigger.timestamp).toBeGreaterThan(Date.now());
  });

  it('notification body reflects weeklyCount and streak', async () => {
    await scheduleWeeklyRecap({ enabled: true, weeklyCount: 8, streakDays: 5, appOpenedThisWeek: true });
    const [notif] = mockCreateTriggerNotification.mock.calls[0];
    expect(notif.body).toContain('8 tasks');
    expect(notif.body).toContain('5-day streak');
  });

  it('notification data contains screen:Today for tap routing', async () => {
    await scheduleWeeklyRecap({ enabled: true, weeklyCount: 2, streakDays: 0, appOpenedThisWeek: true });
    const [notif] = mockCreateTriggerNotification.mock.calls[0];
    expect(notif.data?.screen).toBe('Today');
  });

  it('schedules 0-task variant when app opened but 0 tasks completed', async () => {
    await scheduleWeeklyRecap({ enabled: true, weeklyCount: 0, streakDays: 0, appOpenedThisWeek: true });
    expect(mockCreateTriggerNotification).toHaveBeenCalledTimes(1);
    const [notif] = mockCreateTriggerNotification.mock.calls[0];
    expect(notif.body).toBe('Fresh week ahead — time to start brushing.');
  });
});

describe('cancelWeeklyRecap', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls notifee.cancelNotification with the weekly recap id', async () => {
    await cancelWeeklyRecap();
    expect(mockCancelNotification).toHaveBeenCalledWith('weekly-recap');
  });
});

// ─── KAN-119: Exit prompt ─────────────────────────────────────────────────────

describe('buildExitBody', () => {
  it('returns store-name copy when storeName is provided', () => {
    expect(buildExitBody('Whole Foods')).toBe(
      'Left Whole Foods — did you brush it away?',
    );
  });

  it('returns generic copy when storeName is omitted', () => {
    expect(buildExitBody()).toBe(
      'Did you brush it away while you were there?',
    );
  });

  it('returns generic copy when storeName is undefined', () => {
    expect(buildExitBody(undefined)).toBe(
      'Did you brush it away while you were there?',
    );
  });
});

describe('fireExitPrompt', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls displayNotification with the correct body (with store name)', async () => {
    await fireExitPrompt({ taskId: 'task-1', taskTitle: 'Buy milk', storeName: 'Whole Foods' });
    expect(mockDisplayNotification).toHaveBeenCalledTimes(1);
    const [notif] = mockDisplayNotification.mock.calls[0];
    expect(notif.body).toBe('Left Whole Foods — did you brush it away?');
  });

  it('calls displayNotification with generic body when no store name', async () => {
    await fireExitPrompt({ taskId: 'task-2', taskTitle: 'Pick up meds' });
    const [notif] = mockDisplayNotification.mock.calls[0];
    expect(notif.body).toBe('Did you brush it away while you were there?');
  });

  it('includes taskId in notification data', async () => {
    await fireExitPrompt({ taskId: 'task-abc', taskTitle: 'Get coffee' });
    const [notif] = mockDisplayNotification.mock.calls[0];
    expect(notif.data?.taskId).toBe('task-abc');
  });

  it('includes screen:Today in notification data for tap routing', async () => {
    await fireExitPrompt({ taskId: 'task-abc', taskTitle: 'Get coffee' });
    const [notif] = mockDisplayNotification.mock.calls[0];
    expect(notif.data?.screen).toBe('Today');
  });

  it('android actions include the mark-done quick-action', async () => {
    await fireExitPrompt({ taskId: 'task-3', taskTitle: 'Grab groceries' });
    const [notif] = mockDisplayNotification.mock.calls[0];
    const actions: any[] = notif.android?.actions ?? [];
    const markDone = actions.find((a: any) => a.pressAction?.id === EXIT_ACTION_MARK_DONE);
    expect(markDone).toBeDefined();
    expect(markDone.title).toContain('brushed');
  });

  it('does NOT call setNotificationCategories (category registered at startup)', async () => {
    await fireExitPrompt({ taskId: 'task-4', taskTitle: 'Drop off package' });
    expect(mockSetNotificationCategories).not.toHaveBeenCalled();
  });

  it('creates the exit-prompt channel with DEFAULT importance', async () => {
    await fireExitPrompt({ taskId: 'task-5', taskTitle: 'ATM errand' });
    expect(mockCreateChannel).toHaveBeenCalledTimes(1);
    const [channel] = mockCreateChannel.mock.calls[0];
    expect(channel.id).toBe('exit-prompt');
    expect(channel.importance).toBe(3); // AndroidImportance.DEFAULT
  });
});

describe('registerExitPromptCategory', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls setNotificationCategories with exit_prompt category', async () => {
    await registerExitPromptCategory();
    expect(mockSetNotificationCategories).toHaveBeenCalledTimes(1);
    const [cats] = mockSetNotificationCategories.mock.calls[0];
    const exitCat = cats.find((c: any) => c.id === 'exit_prompt');
    expect(exitCat).toBeDefined();
  });

  it('includes the mark-done action in the category', async () => {
    await registerExitPromptCategory();
    const [cats] = mockSetNotificationCategories.mock.calls[0];
    const exitCat = cats.find((c: any) => c.id === 'exit_prompt');
    const action = exitCat.actions.find((a: any) => a.id === EXIT_ACTION_MARK_DONE);
    expect(action).toBeDefined();
    expect(action.title).toContain('brushed');
  });
});
