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
import { ImportResult } from '../types';

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
 * Import tasks from Google Tasks.
 *
 * Implementation in KAN-84. Stub here so the UI (ImportTasksSection) can call
 * it without a conditional import and the interface is stable for testing.
 *
 * @throws {Error} until KAN-84 is implemented.
 */
export async function importFromGoogleTasks(_uid: string): Promise<ImportResult> {
  throw new Error('importFromGoogleTasks: not yet implemented (KAN-84)');
}

/**
 * Import events from Google Calendar.
 *
 * Implementation in KAN-84. Stub here for the same reasons as above.
 *
 * @throws {Error} until KAN-84 is implemented.
 */
export async function importFromGoogleCalendar(_uid: string): Promise<ImportResult> {
  throw new Error('importFromGoogleCalendar: not yet implemented (KAN-84)');
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
