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

export const CHANNEL_EOD = 'eod-checkin';

// ─── Notification IDs ─────────────────────────────────────────────────────────

const NOTIF_ID_EOD = 'eod-checkin';

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
