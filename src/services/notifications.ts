/**
 * notifications.ts — Scheduled local notification helpers (Track B, Sprint 8).
 *
 * Each notification type owns:
 *   - A stable notification ID  (used to cancel / replace)
 *   - An Android channel ID
 *   - A schedule/cancel function pair
 *
 * All scheduling uses @notifee/react-native TriggerType.TIMESTAMP.
 * iOS doesn't use channels but Notifee handles that transparently.
 */

import notifee, {
  AndroidImportance,
  AndroidVisibility,
  TriggerType,
} from '@notifee/react-native';
import type { TimestampTrigger } from '@notifee/react-native';

// ─── Channel IDs ──────────────────────────────────────────────────────────────

export const CHANNEL_EOD    = 'eod-checkin';
export const CHANNEL_STREAK = 'streak-at-risk';
export const CHANNEL_WEEKLY = 'weekly-recap';
export const CHANNEL_EXIT   = 'exit-prompt';

// ─── Notification IDs ─────────────────────────────────────────────────────────

const NOTIF_ID_EOD    = 'eod-checkin';
const NOTIF_ID_STREAK = 'streak-at-risk';
const NOTIF_ID_WEEKLY = 'weekly-recap';

// ─── Fixed fire time for streak-at-risk (8 PM, not user-configurable) ─────────

const STREAK_FIRE_HOUR   = 20; // 20:00
const STREAK_FIRE_MINUTE = 0;

// ─── Channel creation (idempotent) ────────────────────────────────────────────

export async function createEodChannel(): Promise<void> {
  await notifee.createChannel({
    id:          CHANNEL_EOD,
    name:        'End-of-day check-in',
    importance:  AndroidImportance.DEFAULT,
    vibration:   false,
    visibility:  AndroidVisibility.PUBLIC,
  });
}

// ─── Copy helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the notification body for the EOD check-in.
 * `incompleteCount` must be ≥ 1 before this is called.
 */
export function buildEodBody(incompleteCount: number): string {
  if (incompleteCount === 1) {
    return "How'd the brushing go today? You've still got 1 task on your list.";
  }
  return `How'd the brushing go today? ${incompleteCount} tasks still waiting.`;
}

// ─── EOD check-in (KAN-120) ───────────────────────────────────────────────────

/**
 * Schedule (or re-schedule) today's end-of-day check-in notification.
 *
 * Cancels any existing EOD notification first so repeated calls are idempotent.
 * Silent no-ops when:
 *   - `enabled` is false
 *   - `incompleteCount` is 0 (all tasks done — no nag needed)
 *   - the configured time has already passed today
 */
export async function scheduleEodReminder(options: {
  enabled:         boolean;
  time:            string;   // "HH:MM" e.g. "21:00"
  incompleteCount: number;   // incomplete location-tagged tasks for today
}): Promise<void> {
  const { enabled, time, incompleteCount } = options;

  // Always cancel first so stale notifications are cleared.
  await cancelEodReminder();

  if (!enabled || incompleteCount === 0) { return; }

  const [hours, minutes] = time.split(':').map(Number);
  const fireAt = new Date();
  fireAt.setHours(hours, minutes, 0, 0);

  // If the time has already passed today, roll forward to tomorrow so the
  // user still gets the reminder (e.g. they change preferences after 9 PM).
  if (fireAt.getTime() <= Date.now()) {
    fireAt.setDate(fireAt.getDate() + 1);
  }

  await createEodChannel();

  const trigger: TimestampTrigger = {
    type:      TriggerType.TIMESTAMP,
    timestamp: fireAt.getTime(),
  };

  await notifee.createTriggerNotification(
    {
      id:    NOTIF_ID_EOD,
      title: 'Brush',
      body:  buildEodBody(incompleteCount),
      android: {
        channelId:   CHANNEL_EOD,
        importance:  AndroidImportance.DEFAULT,
        pressAction: { id: 'default', launchActivity: 'default' },
        visibility:  AndroidVisibility.PUBLIC,
        smallIcon:   'ic_notification',
      },
      // `screen: Today` is read by the foreground/background notification
      // handler in App.tsx to route the user on tap.
      data: { screen: 'Today' },
    },
    trigger,
  );
}

/** Cancel any pending EOD check-in notification. */
export async function cancelEodReminder(): Promise<void> {
  await notifee.cancelNotification(NOTIF_ID_EOD);
}

// ─── Streak at risk (KAN-121) ─────────────────────────────────────────────────

/**
 * Returns the notification body for the streak-at-risk nudge.
 * `streakDays` must be ≥ 3 before this is called.
 */
export function buildStreakBody(streakDays: number): string {
  return `Your ${streakDays}-day streak ends at midnight — brush something away.`;
}

/**
 * Schedule (or re-schedule) today's streak-at-risk notification at 8 PM.
 *
 * Cancels any existing streak notification first (idempotent).
 * Silent no-ops when:
 *   - `enabled` is false
 *   - `streakDays` < 3 (not yet emotionally significant)
 *   - `tasksCompletedToday` > 0 (user already brushed — no need to nudge)
 *
 * If 8 PM has already passed today the notification is scheduled for
 * tomorrow at 8 PM (e.g. the user enables the toggle after 8 PM).
 */
export async function scheduleStreakReminder(options: {
  enabled:             boolean;
  streakDays:          number;
  tasksCompletedToday: number;
}): Promise<void> {
  const { enabled, streakDays, tasksCompletedToday } = options;

  // Always cancel first so stale notifications are cleared.
  await cancelStreakReminder();

  if (!enabled || streakDays < 3 || tasksCompletedToday > 0) { return; }

  const fireAt = new Date();
  fireAt.setHours(STREAK_FIRE_HOUR, STREAK_FIRE_MINUTE, 0, 0);

  // Roll forward to tomorrow if 8 PM has already passed today.
  if (fireAt.getTime() <= Date.now()) {
    fireAt.setDate(fireAt.getDate() + 1);
  }

  await notifee.createChannel({
    id:         CHANNEL_STREAK,
    name:       'Streak at risk',
    importance: AndroidImportance.HIGH,
    vibration:  true,
    visibility: AndroidVisibility.PUBLIC,
  });

  const trigger: TimestampTrigger = {
    type:      TriggerType.TIMESTAMP,
    timestamp: fireAt.getTime(),
  };

  await notifee.createTriggerNotification(
    {
      id:    NOTIF_ID_STREAK,
      title: 'Brush',
      body:  buildStreakBody(streakDays),
      android: {
        channelId:   CHANNEL_STREAK,
        importance:  AndroidImportance.HIGH,
        pressAction: { id: 'default', launchActivity: 'default' },
        visibility:  AndroidVisibility.PUBLIC,
        smallIcon:   'ic_notification',
      },
      data: { screen: 'Today' },
    },
    trigger,
  );
}

/** Cancel any pending streak-at-risk notification. */
export async function cancelStreakReminder(): Promise<void> {
  await notifee.cancelNotification(NOTIF_ID_STREAK);
}

// ─── Weekly recap (KAN-123) ───────────────────────────────────────────────────

const WEEKLY_FIRE_HOUR   = 19; // 19:00 (7 PM)
const WEEKLY_FIRE_MINUTE = 0;

/**
 * Returns the notification body for the Sunday weekly recap.
 *
 * Rules:
 *   - 0 tasks: "Fresh week ahead — time to start brushing."
 *   - ≥ 1 task, streak ≥ 3: "You brushed away X tasks this week. N-day streak going strong."
 *   - ≥ 1 task, streak < 3:  "You brushed away X tasks this week. Keep it brushing."
 */
export function buildWeeklyBody(weeklyCount: number, streakDays: number): string {
  if (weeklyCount === 0) {
    return 'Fresh week ahead — time to start brushing.';
  }
  const taskPart = `You brushed away ${weeklyCount} task${weeklyCount === 1 ? '' : 's'} this week.`;
  const streakPart = streakDays >= 3
    ? ` ${streakDays}-day streak going strong.`
    : ' Keep it brushing.';
  return taskPart + streakPart;
}

/**
 * Returns a Date set to the next Sunday at 7 PM (local time).
 * If today IS Sunday and 7 PM has not yet passed, returns today at 7 PM.
 * Otherwise returns the following Sunday.
 *
 * @param now  Current time (defaults to `new Date()`). Injectable for tests.
 */
export function nextSundayAt7PM(now: Date = new Date()): Date {
  const dayOfWeek = now.getDay(); // 0 = Sunday

  const candidate = new Date(now);
  candidate.setHours(WEEKLY_FIRE_HOUR, WEEKLY_FIRE_MINUTE, 0, 0);

  if (dayOfWeek === 0 && candidate.getTime() > now.getTime()) {
    // Today is Sunday and 7 PM hasn't passed yet
    return candidate;
  }

  // Advance to next Sunday
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  candidate.setDate(now.getDate() + daysUntilSunday);
  return candidate;
}

/**
 * Schedule (or re-schedule) the next Sunday weekly-recap notification.
 *
 * Cancels any existing weekly recap first (idempotent).
 * Silent no-ops when:
 *   - `enabled` is false
 *   - `appOpenedThisWeek` is false (user hasn't opened the app this week)
 */
export async function scheduleWeeklyRecap(options: {
  enabled:           boolean;
  weeklyCount:       number;
  streakDays:        number;
  appOpenedThisWeek: boolean;
}): Promise<void> {
  const { enabled, weeklyCount, streakDays, appOpenedThisWeek } = options;

  await cancelWeeklyRecap();

  if (!enabled || !appOpenedThisWeek) { return; }

  await notifee.createChannel({
    id:         CHANNEL_WEEKLY,
    name:       'Weekly recap',
    importance: AndroidImportance.DEFAULT,
    vibration:  false,
    visibility: AndroidVisibility.PUBLIC,
  });

  const trigger: TimestampTrigger = {
    type:      TriggerType.TIMESTAMP,
    timestamp: nextSundayAt7PM().getTime(),
  };

  await notifee.createTriggerNotification(
    {
      id:    NOTIF_ID_WEEKLY,
      title: 'Brush',
      body:  buildWeeklyBody(weeklyCount, streakDays),
      android: {
        channelId:   CHANNEL_WEEKLY,
        importance:  AndroidImportance.DEFAULT,
        pressAction: { id: 'default', launchActivity: 'default' },
        visibility:  AndroidVisibility.PUBLIC,
        smallIcon:   'ic_notification',
      },
      data: { screen: 'Today' },
    },
    trigger,
  );
}

/** Cancel any pending weekly recap notification. */
export async function cancelWeeklyRecap(): Promise<void> {
  await notifee.cancelNotification(NOTIF_ID_WEEKLY);
}

// ─── Location exit prompt (KAN-119) ───────────────────────────────────────────

/** Stable action ID for the "Yes, brushed ✓" quick-action. */
export const EXIT_ACTION_MARK_DONE = 'exit_mark_done';

/**
 * Returns the notification body for the exit prompt.
 *
 *   With store name:   "Left [Store Name] — did you brush it away?"
 *   Without:           "Did you brush it away while you were there?"
 */
export function buildExitBody(storeName?: string): string {
  if (storeName) {
    return `Left ${storeName} — did you brush it away?`;
  }
  return 'Did you brush it away while you were there?';
}

/**
 * Fire an immediate exit-prompt notification for the given task.
 *
 * Includes a "Yes, brushed ✓" quick-action that carries `taskId` in its
 * payload so App.tsx can mark the task complete directly from the lock screen.
 *
 * This is a fire-and-forget notification (not scheduled) — it displays
 * immediately. The deduplication guard (`exitPromptSeenDate`) must be checked
 * by the caller before invoking this function.
 */
export async function fireExitPrompt(options: {
  taskId:    string;
  taskTitle: string;
  storeName?: string;
}): Promise<void> {
  const { taskId, taskTitle, storeName } = options;

  // Register a notification category on iOS so the action button appears.
  await notifee.setNotificationCategories([
    {
      id: 'exit_prompt',
      actions: [
        {
          id:    EXIT_ACTION_MARK_DONE,
          title: 'Yes, brushed ✓',
        },
      ],
    },
  ]);

  await notifee.createChannel({
    id:         CHANNEL_EXIT,
    name:       'Location exit prompts',
    importance: AndroidImportance.HIGH,
    vibration:  true,
    visibility: AndroidVisibility.PUBLIC,
  });

  await notifee.displayNotification({
    title: 'Brush',
    body:  buildExitBody(storeName),
    android: {
      channelId:   CHANNEL_EXIT,
      importance:  AndroidImportance.HIGH,
      pressAction: { id: 'default', launchActivity: 'default' },
      visibility:  AndroidVisibility.PUBLIC,
      smallIcon:   'ic_notification',
      actions: [
        {
          title:       'Yes, brushed ✓',
          pressAction: { id: EXIT_ACTION_MARK_DONE },
        },
      ],
    },
    ios: {
      categoryId: 'exit_prompt',
    },
    // taskId is forwarded to the action handler in App.tsx.
    data: { screen: 'Today', taskId, taskTitle },
  });
}
