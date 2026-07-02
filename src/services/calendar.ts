/**
 * calendar.ts — expo-calendar wrapper for iOS import connectors (KAN-163).
 *
 * Replaces BrushEventKitModule native Swift/ObjC bridge.
 *
 * Both functions throw `{ code: 'PERMISSION_DENIED' }` on access denial,
 * matching the shape that importFromReminders/importFromCalendar check.
 *
 * iOS only: getRemindersAsync is not available on Android.
 *
 * Uses expo-calendar v56 "next" API (class-based). The old async-suffixed
 * functions (getRemindersAsync, getCalendarsAsync, etc.) are legacyWarnings
 * shims that throw immediately — do not use them.
 */

import * as Calendar from 'expo-calendar';

export interface ReminderItem {
  title: string;
  dueDateString?: string;
  notes?: string;  // EKReminder.notes → Task.description (KAN-95)
}

export interface CalendarEventItem {
  title: string;
  startDateString: string;
  isAllDay: boolean;
  notes?: string;  // EKEvent.notes → Task.description (KAN-95)
}

function permissionDeniedError(resource: string): Error {
  return Object.assign(new Error(`${resource} access was not granted.`), {
    code: 'PERMISSION_DENIED',
  });
}

/**
 * Request Reminders permission and return all incomplete reminders.
 * iOS only.
 */
export async function fetchReminders(): Promise<ReminderItem[]> {
  const { status } = await Calendar.requestRemindersPermissions();
  if (status !== 'granted') {
    throw permissionDeniedError('Reminders');
  }

  const reminderCalendars = await Calendar.getCalendars(Calendar.EntityTypes.REMINDER);
  if (reminderCalendars.length === 0) { return []; }

  // listReminders(null, null, Incomplete) → predicateForIncompleteReminders(nil, nil, calendars)
  // — matches original BrushEventKitModule behaviour (all incomplete, no date filter).
  const pages = await Promise.all(
    reminderCalendars.map(cal =>
      cal.listReminders(null, null, Calendar.ReminderStatus.Incomplete),
    ),
  );

  return pages.flat()
    .filter((r): r is typeof r & { title: string } => !!r.title?.trim())
    .map(r => ({
      title: r.title,
      dueDateString: r.dueDate ? new Date(r.dueDate).toISOString() : undefined,
      notes: r.notes ?? undefined,
    }));
}

/**
 * Request Calendar permission and return events from now up to `daysAhead`.
 * Works on iOS and Android.
 */
export async function fetchCalendarEvents(daysAhead: number): Promise<CalendarEventItem[]> {
  const { status } = await Calendar.requestCalendarPermissions();
  if (status !== 'granted') {
    throw permissionDeniedError('Calendar');
  }

  const now = new Date();
  const end = new Date();
  end.setDate(end.getDate() + daysAhead);

  const eventCalendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  if (eventCalendars.length === 0) { return []; }

  const events = await Calendar.listEvents(eventCalendars, now, end);

  return events
    .filter((e): e is typeof e & { title: string } => !!e.title?.trim())
    .map(e => ({
      title:           e.title,
      startDateString: new Date(e.startDate).toISOString(),
      isAllDay:        e.allDay,
      notes:           e.notes ?? undefined,
    }));
}
