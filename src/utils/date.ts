/**
 * date.ts — Shared date utilities.
 */

/** Returns today's date as a YYYY-MM-DD string in the device's local timezone. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Returns the Monday 00:00:00.000 and Sunday 23:59:59.999 boundaries of the
 * current local calendar week (ISO week: Mon–Sun).
 */
export function getCurrentWeekBoundaries(): { monday: Date; sunday: Date } {
  const now       = new Date();
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 1 (Mon) – 7 (Sun)

  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

/**
 * Returns true if `date` falls within the current Mon–Sun calendar week.
 */
export function isThisWeek(date: Date): boolean {
  const { monday, sunday } = getCurrentWeekBoundaries();
  return date >= monday && date <= sunday;
}
