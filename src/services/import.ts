/**
 * src/services/import.ts — KAN-83 / KAN-84 / KAN-85
 *
 * Task import service.
 *
 * This file is the single entry point for all import connectors. Each connector
 * is responsible for fetching tasks from an external source and writing them to
 * Firestore, returning an ImportResult with imported / skipped / failed counts.
 *
 * Connectors implemented here:
 *   - importFromGoogleTasks      (KAN-84 — Android, Google Tasks API)
 *   - importFromGoogleCalendar   (KAN-84 — Android, Google Calendar API)
 *   - importFromReminders        (KAN-85 — iOS, EventKit)
 *   - importFromCalendar         (KAN-85 — iOS, EventKit)
 *
 * Duplicate detection (shared across all connectors):
 *   A task is a duplicate if a task with the same title (case-insensitive) already
 *   exists in the user's task list. Duplicates are silently skipped — their count
 *   is incremented in ImportResult.skipped.
 */

import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { ImportResult } from '../types';

// ─── Google API helpers ───────────────────────────────────────────────────────

const GOOGLE_TASKS_URL =
  'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=false';

const GOOGLE_CALENDAR_URL = (timeMin: string) =>
  `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}`;

/**
 * Returns the current Google OAuth access token.
 * Refreshes silently if the cached token has expired.
 */
async function getGoogleAccessToken(): Promise<string> {
  const tokens = await GoogleSignin.getTokens();
  return tokens.accessToken;
}

/**
 * Fetch a Google API endpoint with the user's OAuth access token.
 * Throws on HTTP errors with a message including the status code.
 */
async function googleFetch(url: string): Promise<unknown> {
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Google API error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Format a JS Date as "YYYY-MM-DD" for Brush task.date field. */
export function formatDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Parse a date from Google APIs.
 * Google Tasks uses RFC 3339 ("2026-06-01T00:00:00.000Z").
 * Google Calendar uses either "YYYY-MM-DD" (all-day) or RFC 3339 (timed).
 * Returns null if the value is absent or unparseable.
 */
export function parseGoogleDate(value: string | undefined): Date | null {
  if (!value) { return null; }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns true if the event should be filtered out:
 *   - All-day events more than 30 days in the future.
 */
export function shouldSkipCalendarEvent(
  startDate: Date,
  isAllDay: boolean,
  now: Date,
): boolean {
  if (!isAllDay) { return false; }
  const thirtyDaysOut = new Date(now);
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
  return startDate > thirtyDaysOut;
}

// ─── Duplicate detection ──────────────────────────────────────────────────────

/**
 * Fetch the set of lowercase titles for all tasks belonging to `uid`.
 * Used by every connector to check for duplicates before writing.
 */
export async function fetchExistingTitles(uid: string): Promise<Set<string>> {
  const snapshot = await firestore()
    .collection('users')
    .doc(uid)
    .collection('tasks')
    .get();

  const titles = new Set<string>();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (typeof data.title === 'string') {
      titles.add(data.title.toLowerCase().trim());
    }
  }
  return titles;
}

/**
 * Returns true if `title` already exists in `existingTitles` (case-insensitive).
 */
export function isDuplicate(title: string, existingTitles: Set<string>): boolean {
  return existingTitles.has(title.toLowerCase().trim());
}

// ─── Connectors ───────────────────────────────────────────────────────────────

/**
 * Import tasks from Google Tasks (KAN-84).
 *
 * Fetches all incomplete tasks from the user's default Google Tasks list,
 * maps them to Brush tasks, skips duplicates, and writes to Firestore.
 */
export async function importFromGoogleTasks(uid: string): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, failed: 0 };

  const existingTitles = await fetchExistingTitles(uid);
  const data = await googleFetch(GOOGLE_TASKS_URL) as { items?: GoogleTaskItem[] };
  const items: GoogleTaskItem[] = data.items ?? [];

  const batch = firestore().batch();
  const tasksRef = firestore().collection('users').doc(uid).collection('tasks');

  for (const item of items) {
    const title = item.title?.trim();
    if (!title) { result.skipped++; continue; }

    if (isDuplicate(title, existingTitles)) { result.skipped++; continue; }

    try {
      const dueDate = parseGoogleDate(item.due);
      const docRef = tasksRef.doc();
      batch.set(docRef, {
        id:        docRef.id,
        title,
        category:  'work',
        done:      false,
        date:      dueDate ? formatDateString(dueDate) : formatDateString(new Date()),
        source:    'google_tasks',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      existingTitles.add(title.toLowerCase()); // prevent intra-batch duplicates
      result.imported++;
    } catch {
      result.failed++;
    }
  }

  await batch.commit();
  return result;
}

/**
 * Import events from Google Calendar (KAN-84).
 *
 * Fetches future primary calendar events, maps them to Brush tasks,
 * skips all-day events more than 30 days out and duplicates, writes to Firestore.
 */
export async function importFromGoogleCalendar(uid: string): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, failed: 0 };
  const now = new Date();

  const existingTitles = await fetchExistingTitles(uid);
  const data = await googleFetch(GOOGLE_CALENDAR_URL(now.toISOString())) as { items?: GoogleCalendarEvent[] };
  const items: GoogleCalendarEvent[] = data.items ?? [];

  const batch = firestore().batch();
  const tasksRef = firestore().collection('users').doc(uid).collection('tasks');

  for (const item of items) {
    const title = item.summary?.trim();
    if (!title) { result.skipped++; continue; }

    if (isDuplicate(title, existingTitles)) { result.skipped++; continue; }

    try {
      // Google Calendar start: all-day events have start.date; timed events have start.dateTime.
      const isAllDay = Boolean(item.start?.date && !item.start?.dateTime);
      const rawDate  = item.start?.dateTime ?? item.start?.date;
      const startDate = parseGoogleDate(rawDate);

      if (!startDate) { result.skipped++; continue; }
      if (shouldSkipCalendarEvent(startDate, isAllDay, now)) { result.skipped++; continue; }

      const docRef = tasksRef.doc();
      batch.set(docRef, {
        id:        docRef.id,
        title,
        category:  'work',
        done:      false,
        date:      formatDateString(startDate),
        source:    'google_calendar',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      existingTitles.add(title.toLowerCase());
      result.imported++;
    } catch {
      result.failed++;
    }
  }

  await batch.commit();
  return result;
}

// ─── Google API response types ────────────────────────────────────────────────

interface GoogleTaskItem {
  id:     string;
  title?: string;
  due?:   string;  // RFC 3339
  status: 'needsAction' | 'completed';
}

interface GoogleCalendarEvent {
  id:       string;
  summary?: string;
  start?: {
    date?:     string;  // "YYYY-MM-DD" for all-day
    dateTime?: string;  // RFC 3339 for timed
  };
}

/**
 * Import reminders from iOS EventKit (Reminders app).
 *
 * Implementation in KAN-85.
 *
 * @throws {Error} until KAN-85 is implemented.
 */
export async function importFromReminders(_uid: string): Promise<ImportResult> {
  throw new Error('importFromReminders: not yet implemented (KAN-85)');
}

/**
 * Import events from iOS EventKit (Calendar app).
 *
 * Implementation in KAN-85.
 *
 * @throws {Error} until KAN-85 is implemented.
 */
export async function importFromCalendar(_uid: string): Promise<ImportResult> {
  throw new Error('importFromCalendar: not yet implemented (KAN-85)');
}
