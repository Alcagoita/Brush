/**
 * poiTypeCache.ts — now a bundled, fully-offline POI dictionary.
 *
 * KAN-253 originally used expo-sqlite as a read-through cache in front of
 * Google Places Text Search. The app now ships the full place-type taxonomy
 * as two local JSON dictionaries (English + pt-PT), so this module keeps the
 * same public API but resolves everything locally with zero startup seed and
 * zero network usage.
 */

import { getCopyLanguage, type SupportedLanguage } from '../constants/copy';
import { normalize } from './poiInference';
import { isGenericPlaceType, type PlaceTypeSuggestion } from './maps';

const EN_DICTIONARY = require('../constants/poiDictionary.en.json') as Record<string, string>;
const PT_DICTIONARY = require('../constants/poiDictionary.pt-PT.json') as Record<string, string>;

const MAX_RESULTS = 8;

interface PoiDictionaryEntry {
  type: string;
  enLabel: string;
  ptLabel: string;
  slugKey: string;
  enKey: string;
  ptKey: string;
}

const SEARCH_ENTRIES: PoiDictionaryEntry[] = Object.keys(EN_DICTIONARY)
  .filter(type => !isGenericPlaceType(type))
  .map(type => {
    const enLabel = EN_DICTIONARY[type] ?? type;
    const ptLabel = PT_DICTIONARY[type] ?? enLabel;
    return {
      type,
      enLabel,
      ptLabel,
      slugKey: normalize(type),
      enKey:   normalize(enLabel),
      ptKey:   normalize(ptLabel),
    };
  });

function activeLabel(entry: PoiDictionaryEntry, lang: SupportedLanguage): string {
  return lang === 'pt-PT' ? entry.ptLabel : entry.enLabel;
}

function entryScore(queryKey: string, entry: PoiDictionaryEntry, lang: SupportedLanguage): number | null {
  const preferred = lang === 'pt-PT'
    ? [entry.ptKey, entry.enKey, entry.slugKey]
    : [entry.enKey, entry.ptKey, entry.slugKey];

  for (let i = 0; i < preferred.length; i++) {
    if (preferred[i] === queryKey) { return i; }
  }
  for (let i = 0; i < preferred.length; i++) {
    if (preferred[i].startsWith(queryKey)) { return 10 + i; }
  }
  for (let i = 0; i < preferred.length; i++) {
    if (preferred[i].includes(queryKey)) { return 20 + i; }
  }
  return null;
}

function sortSuggestions(
  a: { suggestion: PlaceTypeSuggestion; score: number },
  b: { suggestion: PlaceTypeSuggestion; score: number },
): number {
  if (a.score !== b.score) { return a.score - b.score; }
  if (a.suggestion.label.length !== b.suggestion.label.length) {
    return a.suggestion.label.length - b.suggestion.label.length;
  }
  return a.suggestion.label.localeCompare(b.suggestion.label);
}

function localPoiSuggestions(query: string): PlaceTypeSuggestion[] {
  const queryKey = normalize(query);
  if (!queryKey) { return []; }

  const lang = getCopyLanguage();
  const ranked = SEARCH_ENTRIES
    .map(entry => {
      const score = entryScore(queryKey, entry, lang);
      if (score == null) { return null; }
      return {
        score,
        suggestion: {
          type:  entry.type,
          label: activeLabel(entry, lang),
        },
      };
    })
    .filter((value): value is { suggestion: PlaceTypeSuggestion; score: number } => value !== null)
    .sort(sortSuggestions);

  return ranked.slice(0, MAX_RESULTS).map(item => item.suggestion);
}

/**
 * Local lookup against the bundled dictionary. Kept nullable to preserve the
 * previous contract used by tests and callers.
 */
export function lookupPoiTypeCache(query: string): PlaceTypeSuggestion[] | null {
  const results = localPoiSuggestions(query);
  return results.length > 0 ? results : null;
}

/** No-op: the POI dictionary is now bundled in JSON and needs no persistence. */
export function recordPoiTypeSearch(
  _query: string,
  _results: PlaceTypeSuggestion[],
  _source: 'api' | 'seed' = 'api',
): void {}

/** No-op: nothing to seed now that the dictionary ships with the app. */
export function seedPoiTypeCacheIfEmpty(): void {}

/** Test-only compatibility hook from the old sqlite-backed implementation. */
export function __resetPoiTypeCacheDbForTests(): void {}

/** Fully-local search wrapper kept for existing callers. */
export async function searchPlaceTypesCached(query: string): Promise<PlaceTypeSuggestion[]> {
  return localPoiSuggestions(query);
}
