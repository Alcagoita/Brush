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

/**
 * Safely coerce a Firestore Timestamp (or a plain `{_seconds}` object from
 * cached/serialized data, or an already-native `Date`) into a `Date`.
 * Returns `null` for anything else (including missing/undefined).
 *
 * Consolidates the `(ts as any).toDate?.() ?? new Date((ts as any)._seconds * 1000)`
 * pattern that was duplicated across several screens (KAN-215).
 */
export function toDateSafe(ts: unknown): Date | null {
  if (!ts) { return null; }
  if (ts instanceof Date) { return ts; }
  const maybeTimestamp = ts as { toDate?: () => Date; _seconds?: number };
  if (typeof maybeTimestamp.toDate === 'function') { return maybeTimestamp.toDate(); }
  if (typeof maybeTimestamp._seconds === 'number') { return new Date(maybeTimestamp._seconds * 1000); }
  return null;
}

/**
 * "3m ago" / "2h ago" / "5d ago" relative-time label for a Firestore Timestamp
 * (or anything toDateSafe accepts). Returns '' when ts can't be coerced.
 */
export function relativeTime(ts: unknown): string {
  const date = toDateSafe(ts);
  if (!date) { return ''; }
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  { return 'just now'; }
  if (mins < 60) { return `${mins}m ago`; }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  { return `${hrs}h ago`; }
  return `${Math.floor(hrs / 24)}d ago`;
}
