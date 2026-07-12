/**
 * birthday.ts — Birthday-event detection for import (KAN-248).
 *
 * A deliberate, narrow exception to two core rules ("POI required", "no
 * auto-expiry") — kept in its own module so the detection heuristic stays
 * easy to audit and never accidentally generalizes to other task kinds.
 *
 * Signals, checked in priority order by isBirthdayEvent:
 *   1. eventType — Google Calendar's own classification ("birthday"),
 *      authoritative when present.
 *   2. Title heuristic — per-locale keyword match, tried in both supported
 *      languages regardless of device locale (an imported event's language
 *      is unknown — same reasoning as inferImportedPoi in import.ts).
 *   3. Description heuristic — same keyword match against the event's notes,
 *      for events with a generic title ("Dinner", "Reminder") that only
 *      state the occasion in the body. Same false-positive risk as the
 *      title match, accepted for the same reason: the edit-screen Birthday
 *      toggle exists specifically to correct a wrong/missed classification.
 */

const TITLE_KEYWORDS = ['birthday', 'aniversario'];

/** Strips combining diacritical marks (U+0300–U+036F) after NFD decomposition — "aniversário" → "aniversario". */
function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** True if `text` contains a birthday keyword in any supported language, case/diacritics-insensitive. */
export function textLooksLikeBirthday(text: string): boolean {
  const normalized = stripDiacritics(text.toLowerCase());
  return TITLE_KEYWORDS.some(kw => normalized.includes(kw));
}

/**
 * Resolves whether a calendar event is a birthday.
 * `eventType` is Google Calendar-only (undefined for EventKit, which has no
 * equivalent field) — when present it wins outright; otherwise falls back to
 * the title heuristic, then the description heuristic.
 */
export function isBirthdayEvent(title: string, eventType?: string, description?: string): boolean {
  if (eventType === 'birthday') { return true; }
  if (textLooksLikeBirthday(title)) { return true; }
  return !!description && textLooksLikeBirthday(description);
}
