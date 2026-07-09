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
type SearchIntent = 'retail' | 'food' | 'fitness' | 'medical' | 'postal';

const COMMERCIAL_POI_TYPES = new Set([
  'bakery',
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

const BROAD_COMMERCIAL_POI_TYPES = new Set([
  'convenience_store',
  'department_store',
  'discount_store',
  'grocery_store',
  'market',
  'store',
  'supermarket',
  'warehouse_store',
]);

const INTENT_TERMS: Record<SupportedLanguage, Record<SearchIntent, string[]>> = {
  en: {
    retail: ['buy', 'shop', 'purchase', 'get', 'pick up'],
    food: ['eat', 'drink', 'grab'],
    fitness: ['work out', 'train', 'exercise'],
    medical: ['pick up medicine', 'pick up prescription', 'get medicine', 'get prescription'],
    postal: ['mail', 'post', 'ship', 'send package'],
  },
  'pt-PT': {
    retail: ['comprar', 'loja', 'buscar', 'ir buscar', 'levantar'],
    food: ['comer', 'beber', 'lanchar'],
    fitness: ['treinar', 'exercicio', 'exercício', 'ginasio', 'ginásio'],
    medical: ['buscar medicamento', 'levantar receita', 'comprar remedios', 'comprar remédios'],
    postal: ['correio', 'enviar encomenda', 'posta'],
  },
};

const QUERY_NOISE_WORDS: Record<SupportedLanguage, string[]> = {
  en: ['a', 'an', 'the', 'go', 'new', 'some', 'my', 'to', 'for', 'from', 'near'],
  'pt-PT': ['o', 'a', 'os', 'as', 'ir', 'um', 'uma', 'uns', 'umas', 'novo', 'nova', 'algum', 'alguma', 'meu', 'minha', 'para', 'perto'],
};

const POI_ALIASES: Partial<Record<string, Record<SupportedLanguage, string[]>>> = {
  bakery: {
    en: ['bakery', 'bread', 'loaf', 'pastry', 'cake', 'croissant'],
    'pt-PT': ['padaria', 'pao', 'pão', 'broa', 'pastel', 'croissant', 'bolo'],
  },
  book_store: {
    en: ['book', 'books', 'book shop', 'bookstore', 'novel', 'notebook'],
    'pt-PT': ['livro', 'livros', 'livraria', 'romance', 'caderno'],
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
  isBroadCommercial: boolean;
}

function normalizeKeys(values: string[]): string[] {
  return Array.from(new Set(values.map(value => normalize(value)).filter(Boolean)));
}

function tokenize(normalizedText: string): string[] {
  return normalizedText.split(' ').filter(Boolean);
}

function generateNgrams(tokens: string[], maxLength: number): string[] {
  const result: string[] = [];
  for (let size = Math.min(maxLength, tokens.length); size >= 1; size--) {
    for (let start = 0; start + size <= tokens.length; start++) {
      result.push(tokens.slice(start, start + size).join(' '));
    }
  }
  return result;
}

function intentTermTokens(lang: SupportedLanguage): Set<string> {
  return new Set(
    Object.values(INTENT_TERMS[lang])
      .flat()
      .flatMap(term => tokenize(normalize(term))),
  );
}

type QueryVariant = {
  key: string;
  haystack: string;
  tokens: Set<string>;
  penalty: number;
};

function buildQueryVariants(queryKey: string, lang: SupportedLanguage): QueryVariant[] {
  const allTokens = tokenize(queryKey);
  const stopWords = new Set([...QUERY_NOISE_WORDS[lang], ...intentTermTokens(lang)]);
  const focusedTokens = allTokens.filter(token => !stopWords.has(token));
  const rawVariants = [
    queryKey,
    ...generateNgrams(focusedTokens, 3),
  ];

  return Array.from(new Set(rawVariants.filter(Boolean)))
    .filter(key => key === queryKey || tokenize(key).length > 1 || key.length >= 4)
    .map((key, index) => ({
    key,
    haystack: ` ${key} `,
    tokens: new Set(tokenize(key)),
    penalty: index === 0 ? 0 : 5 + index,
    }));
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
      isBroadCommercial: BROAD_COMMERCIAL_POI_TYPES.has(type),
    };
  });

function activeLabel(entry: PoiDictionaryEntry, lang: SupportedLanguage): string {
  return lang === 'pt-PT' ? entry.ptLabel : entry.enLabel;
}

function inferIntents(queryKey: string, lang: SupportedLanguage): Set<SearchIntent> {
  const intents = new Set<SearchIntent>();
  const haystack = ` ${queryKey} `;
  for (const [intent, terms] of Object.entries(INTENT_TERMS[lang]) as [SearchIntent, string[]][]) {
    if (terms.some(term => haystack.includes(` ${normalize(term)} `) || queryKey === normalize(term))) {
      intents.add(intent);
    }
  }
  return intents;
}

function intentScoreAdjustment(entry: PoiDictionaryEntry, intents: Set<SearchIntent>): number {
  let adjustment = 0;

  if (intents.has('retail') && entry.isCommercial) { adjustment -= 2; }
  if (intents.has('retail') && entry.isBroadCommercial) { adjustment += 6; }

  if (intents.has('food') && ['bakery', 'cafe', 'coffee_shop', 'restaurant'].includes(entry.type)) {
    adjustment -= 2;
  }
  if (intents.has('fitness') && entry.type === 'gym') { adjustment -= 3; }
  if (intents.has('medical') && ['pharmacy', 'drugstore', 'clinic'].includes(entry.type)) {
    adjustment -= 3;
  }
  if (intents.has('postal') && ['post_office', 'post'].includes(entry.type)) { adjustment -= 3; }

  return adjustment;
}

function scoreMatch(
  queryVariant: QueryVariant,
  candidateKey: string,
  baseScore: number,
): number | null {
  if (!candidateKey) { return null; }
  const candidateTokens = tokenize(candidateKey);
  const specificityBonus = Math.min(candidateKey.length, 99) / 100;

  if (candidateKey === queryVariant.key) { return queryVariant.penalty + baseScore - specificityBonus; }
  if (queryVariant.haystack.includes(` ${candidateKey} `)) {
    return queryVariant.penalty + 10 + baseScore - specificityBonus;
  }
  if (candidateTokens.length > 0 && candidateTokens.every(token => queryVariant.tokens.has(token))) {
    return queryVariant.penalty + 20 + baseScore - specificityBonus;
  }
  if (candidateKey.startsWith(queryVariant.key)) { return queryVariant.penalty + 30 + baseScore - specificityBonus; }
  if (candidateKey.includes(queryVariant.key)) { return queryVariant.penalty + 40 + baseScore - specificityBonus; }
  return null;
}

function entryScore(
  queryVariants: QueryVariant[],
  intents: Set<SearchIntent>,
  entry: PoiDictionaryEntry,
  lang: SupportedLanguage,
): number | null {
  const preferred = lang === 'pt-PT'
    ? [entry.ptKey, entry.enKey, entry.slugKey, ...entry.ptAliasKeys, ...entry.enAliasKeys]
    : [entry.enKey, entry.ptKey, entry.slugKey, ...entry.enAliasKeys, ...entry.ptAliasKeys];

  let best: number | null = null;
  for (const queryVariant of queryVariants) {
    for (let i = 0; i < preferred.length; i++) {
      const score = scoreMatch(queryVariant, preferred[i], i);
      if (score == null) { continue; }
      if (best == null || score < best) {
        best = score;
      }
    }
  }

  if (best == null) { return null; }
  return best + intentScoreAdjustment(entry, intents);
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
  const queryVariants = buildQueryVariants(queryKey, lang);
  const intents = inferIntents(queryKey, lang);
  const ranked = SEARCH_ENTRIES
    .map(entry => {
      const score = entryScore(queryVariants, intents, entry, lang);
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
