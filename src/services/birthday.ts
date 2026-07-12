/**
 * birthday.ts — Birthday-event detection for import (KAN-248).
 *
 * A deliberate, narrow exception to two core rules ("POI required", "no
 * auto-expiry") — kept in its own module so the detection heuristic stays
 * easy to audit and never accidentally generalizes to other task kinds.
 *
 * Two independent signals, checked in priority order by isBirthdayEvent:
 *   1. eventType — Google Calendar's own classification ("birthday"),
 *      authoritative when present.
 *   2. Title heuristic — per-locale keyword match, tried in both supported
 *      languages regardless of device locale (an imported event's language
 *      is unknown — same reasoning as inferImportedPoi in import.ts).
 */

const TITLE_KEYWORDS = ['birthday', 'aniversario'];

/** Strips combining diacritical marks (U+0300–U+036F) after NFD decomposition — "aniversário" → "aniversario". */
function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** True if `title` contains a birthday keyword in any supported language, case/diacritics-insensitive. */
export function titleLooksLikeBirthday(title: string): boolean {
  const normalized = stripDiacritics(title.toLowerCase());
  return TITLE_KEYWORDS.some(kw => normalized.includes(kw));
}

/**
 * Resolves whether a calendar event is a birthday.
 * `eventType` is Google Calendar-only (undefined for EventKit, which has no
 * equivalent field) — when present it wins outright; otherwise falls back
 * to the title heuristic.
 */
export function isBirthdayEvent(title: string, eventType?: string): boolean {
  if (eventType === 'birthday') { return true; }
  return titleLooksLikeBirthday(title);
}
