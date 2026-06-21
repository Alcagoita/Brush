/**
 * calendar.ts — expo-calendar wrapper for iOS import connectors (KAN-163).
 *
 * Replaces BrushEventKitModule native Swift/ObjC bridge.
 *
 * Both functions throw `{ code: 'PERMISSION_DENIED' }` on access denial,
 * matching the shape that importFromReminders/importFromCalendar check.
 *
 * iOS only: getRemindersAsync is not available on Android.
 */

import * as Calendar from 'expo-calendar';
export interface ReminderItem {
  title: string;
  dueDateString?: string;
}

export interface CalendarEventItem {
  title: string;
  startDateString: string;
  isAllDay: boolean;
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
  const { status } = await Calendar.requestRemindersPermissionsAsync();
  if (status !== 'granted') {
    throw permissionDeniedError('Reminders');
  }

  // Wide range to match original `predicateForIncompleteReminders(nil, nil, nil)`
  const past   = new Date(0);
  const future = new Date('2100-01-01T00:00:00Z');

  const reminders = await Calendar.getRemindersAsync(
    null,
    Calendar.ReminderStatus.Incomplete,
    past,
    future,
  );

  return reminders
    .filter(r => r.title?.trim())
    .map(r => ({
      title: r.title!,
      dueDateString: r.dueDate ? new Date(r.dueDate).toISOString() : undefined,
    }));
}

/**
 * Request Calendar permission and return events from now up to `daysAhead`.
 * Works on iOS and Android.
 */
export async function fetchCalendarEvents(daysAhead: number): Promise<CalendarEventItem[]> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    throw permissionDeniedError('Calendar');
  }

  const now = new Date();
  const end = new Date();
  end.setDate(end.getDate() + daysAhead);

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  if (calendars.length === 0) { return []; }

  const calendarIds = calendars.map(c => c.id);
  const events = await Calendar.getEventsAsync(calendarIds, now, end);

  return events
    .filter(e => e.title?.trim())
    .map(e => ({
      title:           e.title!,
      startDateString: new Date(e.startDate).toISOString(),
      isAllDay:        e.allDay,
    }));
}
