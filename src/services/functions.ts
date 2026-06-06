/**
 * functions.ts — Firebase Cloud Function callers (KAN-90)
 *
 * Wraps @react-native-firebase/functions httpsCallable calls.
 * All functions authenticate automatically because Firebase Callable
 * functions verify the caller's Auth token on the server side.
 *
 * Scoped to: Cloud Functions deployed in the brush-away Firebase project.
 */

import functions from '@react-native-firebase/functions';
import type { PoiType } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParseMessageOutput {
  title: string;
  suggestedPoi: PoiType | null;
  suggestedTime: string | null;   // "HH:MM" 24-hour format, or null
  confidence: 'high' | 'medium' | 'low';
}

// ─── parseMessageToTask ───────────────────────────────────────────────────────

/**
 * Call the `parseMessageToTask` Cloud Function.
 *
 * Sends a free-text message to the backend, which uses Claude Haiku to extract
 * a structured task (title, POI, time, confidence level).
 *
 * @param text  The raw shared message (max 2 000 chars — server enforces this).
 * @returns     Structured task data; confidence 'low' means best-effort only.
 * @throws      HttpsError on auth failure or hard server error.
 */
export async function parseMessageToTask(text: string): Promise<ParseMessageOutput> {
  const callable = functions().httpsCallable<{ text: string }, ParseMessageOutput>(
    'parseMessageToTask',
  );
  const result = await callable({ text });
  return result.data;
}
