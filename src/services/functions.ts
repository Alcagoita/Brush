/**
 * functions.ts — task parsing helpers (KAN-90, updated KAN-116)
 *
 * Originally called a Firebase Cloud Function (Claude Haiku) to parse shared
 * text. Now fully client-side:
 *   1. Local keyword dictionary (offline, instant) via poiInference.ts
 *   2. Google Places Text Search fallback (1 network call, no AI cost)
 *   3. Give up → confidence 'low', user edits manually
 *
 * Same ParseMessageOutput shape as before — ShareReceiveScreen is unchanged.
 */

import { inferPoiFromRules } from './poiInference';
import { searchPlaceTypes }  from './maps';
import { POI_GOOGLE_TYPES }  from '../types';
import type { PoiType }      from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParseMessageOutput {
  title:        string;
  suggestedPoi: PoiType | null;
  suggestedTime: string | null;   // "HH:MM" 24-hour format, or null
  confidence:   'high' | 'medium' | 'low';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Reverse map: Google Places primary type string → our PoiType. */
const GOOGLE_TYPE_TO_POI: Record<string, PoiType> = {
  ...Object.fromEntries(
    (Object.entries(POI_GOOGLE_TYPES) as [PoiType, string][])
      .map(([poi, googleType]) => [googleType, poi]),
  ),
  // Extra aliases the Places API may return that aren't in POI_GOOGLE_TYPES.
  coffee_shop:        'cafe',
  grocery_store:      'supermarket',
  convenience_store:  'supermarket',
  drugstore:          'pharmacy',
  transit_station:    'bus',
  light_rail_station: 'bus',
};

const VALID_POI_TYPES = new Set<string>(Object.keys(POI_GOOGLE_TYPES));

function isPoiType(s: string): s is PoiType {
  return VALID_POI_TYPES.has(s);
}

/**
 * Extract "HH:MM" from shared text.
 * Handles: "at 9am", "at 14:30", "3:45pm", "9 PM".
 */
function extractTime(text: string): string | null {
  const m =
    text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i) ??
    text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (!m) { return null; }
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = (m[3] ?? '').toLowerCase();
  if (meridiem === 'pm' && h < 12) { h += 12; }
  if (meridiem === 'am' && h === 12) { h = 0; }
  if (h > 23 || min > 59) { return null; }
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// ─── parseMessageToTask ───────────────────────────────────────────────────────

/**
 * Parse a free-text shared message into structured task data.
 *
 * No AI, no Cloud Function — runs entirely on-device with a Google Places
 * fallback for unknown vocabulary.
 *
 * @param text  Raw shared message.
 * @returns     Structured task data. confidence 'low' → user should review.
 */
export async function parseMessageToTask(text: string): Promise<ParseMessageOutput> {
  const trimmed = text.trim().slice(0, 2_000);
  const title   = trimmed.slice(0, 80);
  const suggestedTime = extractTime(trimmed);

  // Pass 1: offline local dictionary.
  const localPoi = inferPoiFromRules(trimmed);
  if (localPoi && isPoiType(localPoi)) {
    return { title, suggestedPoi: localPoi, suggestedTime, confidence: 'high' };
  }

  // Pass 2: Google Places Text Search — extract primary type from top results.
  try {
    const suggestions = await searchPlaceTypes(trimmed.slice(0, 200));
    for (const { type } of suggestions) {
      const poi = GOOGLE_TYPE_TO_POI[type];
      if (poi) {
        return { title, suggestedPoi: poi, suggestedTime, confidence: 'medium' };
      }
    }
  } catch {
    // Network error — fall through to low-confidence.
  }

  return { title, suggestedPoi: null, suggestedTime, confidence: 'low' };
}
