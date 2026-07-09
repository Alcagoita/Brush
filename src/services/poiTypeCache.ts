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
const COMMERCIAL_POI_TYPES = new Set([
  'book_store',
  'clothing_store',
  'coffee_shop',
  'convenience_store',
  'department_store',
  'discount_store',
  'drugstore',
  'electronics_store',
  'florist',
  'furniture_store',
  'grocery_store',
  'home_goods_store',
  'liquor_store',
  'pet_store',
  'pharmacy',
  'shoe_store',
  'sporting_goods_store',
  'store',
  'supermarket',
  'warehouse_store',
]);

const COMMERCIAL_INTENT_TERMS: Record<SupportedLanguage, string[]> = {
  en: ['buy', 'shop', 'purchase', 'get', 'pick up'],
  'pt-PT': ['comprar', 'loja', 'buscar', 'ir buscar', 'levantar'],
};

const POI_ALIASES: Partial<Record<string, Record<SupportedLanguage, string[]>>> = {
  book_store: {
    en: ['book', 'books', 'book shop', 'bookstore'],
    'pt-PT': ['livro', 'livros', 'livraria'],
  },
  florist: {
    en: ['flower', 'flowers', 'bouquet'],
    'pt-PT': ['flor', 'flores', 'ramo de flores'],
  },
  coffee_shop: {
    en: ['coffee', 'coffee shop', 'espresso'],
    'pt-PT': ['cafe', 'café', 'cafetaria', 'café para levar'],
  },
  pharmacy: {
    en: ['medicine', 'medicines', 'medication', 'prescription', 'chemist'],
    'pt-PT': ['medicamento', 'medicamentos', 'farmacia', 'farmácia', 'remedio', 'remédios'],
  },
  shoe_store: {
    en: ['shoe', 'shoes', 'sneakers', 'footwear'],
    'pt-PT': ['sapato', 'sapatos', 'tenis', 'ténis', 'calcado', 'calçado'],
  },
  gym: {
    en: ['gym', 'workout', 'fitness', 'exercise'],
    'pt-PT': ['ginasio', 'ginásio', 'treino', 'fitness', 'exercicio', 'exercício'],
  },
};

interface PoiDictionaryEntry {
  type: string;
  enLabel: string;
  ptLabel: string;
  slugKey: string;
  enKey: string;
  ptKey: string;
  enAliasKeys: string[];
  ptAliasKeys: string[];
  isCommercial: boolean;
}

function normalizeKeys(values: string[]): string[] {
  return Array.from(new Set(values.map(value => normalize(value)).filter(Boolean)));
}

function tokenize(normalizedText: string): string[] {
  return normalizedText.split(' ').filter(Boolean);
}

const SEARCH_ENTRIES: PoiDictionaryEntry[] = Object.keys(EN_DICTIONARY)
  .filter(type => !isGenericPlaceType(type))
  .map(type => {
    const enLabel = EN_DICTIONARY[type] ?? type;
    const ptLabel = PT_DICTIONARY[type] ?? enLabel;
    const aliases = POI_ALIASES[type];
    return {
      type,
      enLabel,
      ptLabel,
      slugKey: normalize(type),
      enKey:   normalize(enLabel),
      ptKey:   normalize(ptLabel),
      enAliasKeys: normalizeKeys(aliases?.en ?? []),
      ptAliasKeys: normalizeKeys(aliases?.['pt-PT'] ?? []),
      isCommercial: COMMERCIAL_POI_TYPES.has(type),
    };
  });

function activeLabel(entry: PoiDictionaryEntry, lang: SupportedLanguage): string {
  return lang === 'pt-PT' ? entry.ptLabel : entry.enLabel;
}

function hasCommercialIntent(queryKey: string, lang: SupportedLanguage): boolean {
  return COMMERCIAL_INTENT_TERMS[lang].some(term =>
    queryKey === term || queryKey.includes(` ${term} `) || queryKey.startsWith(`${term} `),
  );
}

function scoreMatch(
  queryKey: string,
  queryHaystack: string,
  queryTokens: Set<string>,
  candidateKey: string,
  baseScore: number,
): number | null {
  if (!candidateKey) { return null; }
  const candidateTokens = tokenize(candidateKey);
  const specificityBonus = Math.min(candidateKey.length, 99) / 100;

  if (candidateKey === queryKey) { return baseScore - specificityBonus; }
  if (queryHaystack.includes(` ${candidateKey} `)) { return 10 + baseScore - specificityBonus; }
  if (candidateTokens.length > 0 && candidateTokens.every(token => queryTokens.has(token))) {
    return 20 + baseScore - specificityBonus;
  }
  if (candidateKey.startsWith(queryKey)) { return 30 + baseScore - specificityBonus; }
  if (candidateKey.includes(queryKey)) { return 40 + baseScore - specificityBonus; }
  return null;
}

function entryScore(
  queryKey: string,
  queryHaystack: string,
  queryTokens: Set<string>,
  entry: PoiDictionaryEntry,
  lang: SupportedLanguage,
): number | null {
  const preferred = lang === 'pt-PT'
    ? [entry.ptKey, entry.enKey, entry.slugKey, ...entry.ptAliasKeys, ...entry.enAliasKeys]
    : [entry.enKey, entry.ptKey, entry.slugKey, ...entry.enAliasKeys, ...entry.ptAliasKeys];

  let best: number | null = null;
  for (let i = 0; i < preferred.length; i++) {
    const score = scoreMatch(queryKey, queryHaystack, queryTokens, preferred[i], i);
    if (score == null) { continue; }
    if (best == null || score < best) {
      best = score;
    }
  }

  if (best == null) { return null; }
  if (entry.isCommercial && hasCommercialIntent(queryKey, lang)) {
    return best - 2;
  }
  return best;
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
  const queryHaystack = ` ${queryKey} `;
  const queryTokens = new Set(tokenize(queryKey));
  const ranked = SEARCH_ENTRIES
    .map(entry => {
      const score = entryScore(queryKey, queryHaystack, queryTokens, entry, lang);
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
