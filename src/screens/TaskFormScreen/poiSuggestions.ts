import { PLACE_TYPE_LABELS } from '../../services/maps';

// ─── POI type suggestion catalog ──────────────────────────────────────────────

const ALL_TYPE_SUGGESTIONS = Object.entries(PLACE_TYPE_LABELS).map(
  ([type, label]) => ({ type, label }),
);

export function getTypeSuggestions(q: string): { type: string; label: string }[] {
  if (!q.trim()) { return []; }
  // Split query into words; every query word must match the START of some label word.
  // "bus" → matches "Bus Station"; "b" → matches "Bank" but not "Library" or "Night Club".
  const queryWords = q.toLowerCase().replace(/_/g, ' ').trim().split(/\s+/);
  return ALL_TYPE_SUGGESTIONS
    .filter(s => {
      const labelWords = s.label.toLowerCase().split(/\s+/);
      return queryWords.every(qw => labelWords.some(lw => lw.startsWith(qw)));
    })
    .slice(0, 6);
}
