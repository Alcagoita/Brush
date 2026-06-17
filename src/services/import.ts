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
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Linking, Platform } from 'react-native';
import BrushEventKitModule from '../native/BrushEventKitModule';
import { ImportResult } from '../types';

// ─── Timeout wrapper (KAN-92) ─────────────────────────────────────────────────

export const IMPORT_TIMEOUT_MS = 30_000;

/**
 * Sentinel error message used to distinguish a timeout from a general failure.
 * Check with `err.message === IMPORT_TIMEOUT_ERROR` in catch blocks.
 */
export const IMPORT_TIMEOUT_ERROR = 'IMPORT_TIMEOUT';

/**
 * Races `importFn` against a 30-second hard timeout.
 * Returns { promise, clearTimer } so callers can cancel the timer on unmount
 * and avoid the setState-after-unmount warning.
 */
export function runImportWithTimeout(importFn: () => Promise<ImportResult>): {
  promise:   Promise<ImportResult>;
  clearTimer: () => void;
} {
  let timerId: ReturnType<typeof setTimeout>;
  const clearTimer = () => clearTimeout(timerId);

  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(
      () => reject(new Error(IMPORT_TIMEOUT_ERROR)),
      IMPORT_TIMEOUT_MS,
    );
  });

  // Wrap in Promise.resolve().then() so a synchronous throw inside importFn
  // still triggers .finally(clearTimer) instead of leaking the timer.
  const importPromise = Promise.resolve().then(importFn);
  const promise = Promise.race([importPromise, timeoutPromise]).finally(clearTimer);
  return { promise, clearTimer };
}

// ─── Idempotency key (KAN-92) ─────────────────────────────────────────────────

/**
 * Deterministic Firestore doc ID for an imported task.
 * Two concurrent imports writing the same source+title will resolve to the
 * same doc ID, making the second write a no-op overwrite instead of a duplicate.
 *
 * djb2-variant hash keeps the key short and collision-resistant without a
 * crypto dependency.
 */
export function makeImportDocId(source: string, title: string): string {
  const normalized = `${source}:${title.toLowerCase().trim()}`;
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = (((hash << 5) + hash) ^ normalized.charCodeAt(i)) >>> 0;
  }
  return `imp_${hash.toString(36)}`;
}

// ─── Cancellation helper (KAN-94) ────────────────────────────────────────────

const CANCELLED_RESULT: ImportResult = { imported: 0, skipped: 0, failed: 0, cancelled: 1 };

function isGoogleSignInCancelled(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === statusCodes.SIGN_IN_CANCELLED
  );
}

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
 *
 * TODO: make the cutoff configurable (e.g. user-facing "import range" setting)
 * rather than hardcoding 30 days. Timed events are always imported regardless
 * of how far out they are.
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
  try { return await _importFromGoogleTasks(uid); }
  catch (err) {
    if (isGoogleSignInCancelled(err)) { return CANCELLED_RESULT; }
    throw err;
  }
}

async function _importFromGoogleTasks(uid: string): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, failed: 0, cancelled: 0 };

  const existingTitles = await fetchExistingTitles(uid);
  const data = await googleFetch(GOOGLE_TASKS_URL) as { items?: GoogleTaskItem[] };
  const items: GoogleTaskItem[] = data.items ?? [];

  // NOTE: Firestore batches are capped at 500 writes. For MVP this is acceptable
  // since users typically have <100 tasks. If imports grow large, chunk into
  // multiple batches of ≤500 writes each. (Future optimisation.)
  const batch = firestore().batch();
  const tasksRef = firestore().collection('users').doc(uid).collection('tasks');

  for (const item of items) {
    const title = item.title?.trim();
    if (!title) { result.skipped++; continue; }

    if (isDuplicate(title, existingTitles)) { result.skipped++; continue; }

    try {
      const dueDate = parseGoogleDate(item.due);
      const docRef = tasksRef.doc(makeImportDocId('google_tasks', title));
      batch.set(docRef, {
        id:        docRef.id,
        title,
        category:  'work',
        done:      false,
        date:      dueDate ? formatDateString(dueDate) : formatDateString(new Date()),
        source:    'google_tasks',
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      // Track the title in the local Set to prevent intra-batch duplicates.
      // Safe because batch.commit() is atomic — either all writes land or none
      // do, so the Set never diverges from Firestore on a partial failure.
      existingTitles.add(title.toLowerCase());
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
  try { return await _importFromGoogleCalendar(uid); }
  catch (err) {
    if (isGoogleSignInCancelled(err)) { return CANCELLED_RESULT; }
    throw err;
  }
}

async function _importFromGoogleCalendar(uid: string): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, failed: 0, cancelled: 0 };
  const now = new Date();

  const existingTitles = await fetchExistingTitles(uid);
  const data = await googleFetch(GOOGLE_CALENDAR_URL(now.toISOString())) as { items?: GoogleCalendarEvent[] };
  const items: GoogleCalendarEvent[] = data.items ?? [];

  // NOTE: Firestore batches are capped at 500 writes. For MVP this is acceptable
  // since users typically have <100 events. If imports grow large, chunk into
  // multiple batches of ≤500 writes each. (Future optimisation.)
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

      const docRef = tasksRef.doc(makeImportDocId('google_calendar', title));
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
 * Import reminders from iOS EventKit (Reminders app) (KAN-85).
 *
 * Requests Reminders access at call time. If the user previously denied it,
 * opens the Settings app so they can grant it, then throws so the UI can
 * show an appropriate message.
 */
export async function importFromReminders(uid: string): Promise<ImportResult> {
  if (Platform.OS !== 'ios') {
    throw new Error('importFromReminders is only available on iOS.');
  }
  if (!BrushEventKitModule) {
    throw new Error('BrushEventKitModule native module is not available.');
  }

  let items: Awaited<ReturnType<typeof BrushEventKitModule.fetchReminders>>;
  try {
    items = await BrushEventKitModule.fetchReminders();
  } catch (err: unknown) {
    if (isPermissionDenied(err)) {
      await openSettings();
    }
    throw err;
  }

  const result: ImportResult = { imported: 0, skipped: 0, failed: 0, cancelled: 0 };
  const existingTitles = await fetchExistingTitles(uid);
  const batch = firestore().batch();
  const tasksRef = firestore().collection('users').doc(uid).collection('tasks');

  for (const item of items) {
    const title = item.title?.trim();
    if (!title) { result.skipped++; continue; }
    if (isDuplicate(title, existingTitles)) { result.skipped++; continue; }

    try {
      const dueDate = item.dueDateString ? new Date(item.dueDateString) : null;
      const docRef = tasksRef.doc(makeImportDocId('eventkit_reminders', title));
      batch.set(docRef, {
        id:        docRef.id,
        title,
        category:  'personal',
        done:      false,
        date:      dueDate && !isNaN(dueDate.getTime())
                     ? formatDateString(dueDate)
                     : formatDateString(new Date()),
        source:    'eventkit_reminders',
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

/**
 * Import events from iOS EventKit (Calendar app) (KAN-85).
 *
 * Fetches events from today up to 30 days ahead. All-day events beyond 30 days
 * are filtered by the native module. Requests Calendar access at call time.
 */
export async function importFromCalendar(uid: string): Promise<ImportResult> {
  if (Platform.OS !== 'ios') {
    throw new Error('importFromCalendar is only available on iOS.');
  }
  if (!BrushEventKitModule) {
    throw new Error('BrushEventKitModule native module is not available.');
  }

  const DAYS_AHEAD = 30;
  let items: Awaited<ReturnType<typeof BrushEventKitModule.fetchCalendarEvents>>;
  try {
    items = await BrushEventKitModule.fetchCalendarEvents(DAYS_AHEAD);
  } catch (err: unknown) {
    if (isPermissionDenied(err)) {
      await openSettings();
    }
    throw err;
  }

  const result: ImportResult = { imported: 0, skipped: 0, failed: 0, cancelled: 0 };
  const now = new Date();
  const existingTitles = await fetchExistingTitles(uid);
  const batch = firestore().batch();
  const tasksRef = firestore().collection('users').doc(uid).collection('tasks');

  for (const item of items) {
    const title = item.title?.trim();
    if (!title) { result.skipped++; continue; }
    if (isDuplicate(title, existingTitles)) { result.skipped++; continue; }

    try {
      const startDate = new Date(item.startDateString);
      if (isNaN(startDate.getTime())) { result.skipped++; continue; }
      if (shouldSkipCalendarEvent(startDate, item.isAllDay, now)) { result.skipped++; continue; }

      const docRef = tasksRef.doc(makeImportDocId('eventkit_calendar', title));
      batch.set(docRef, {
        id:        docRef.id,
        title,
        category:  'work',
        done:      false,
        date:      formatDateString(startDate),
        source:    'eventkit_calendar',
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

// ─── EventKit helpers ─────────────────────────────────────────────────────────

function isPermissionDenied(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'PERMISSION_DENIED'
  );
}

async function openSettings(): Promise<void> {
  await Linking.openSettings();
}
