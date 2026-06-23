/**
 * src/services/poiInference.ts — KAN-195
 *
 * Rule-based POI inference: map a task title to a POI type using an on-device,
 * offline keyword dictionary. This is the FIRST pass of POI inference on
 * imported tasks (wired into the import flow in KAN-197). No AI, no network —
 * the on-device LLM fallback for titles this misses lands in KAN-196.
 *
 * Output is a `PoiType` or `null`. `null` is a valid, expected result: when no
 * keyword matches we do NOT guess, and the caller simply leaves `task.poi`
 * unset. Scope for v1 is the four geofence-backed types
 * (`atm | cafe | supermarket | pharmacy`); the structure supports any
 * `PoiType`, so extra types are a data-only addition.
 *
 * ── Self-growing dictionary ───────────────────────────────────────────────
 * The dictionary has two layers:
 *   - SEED_DICTIONARY — hand-curated, checked in, never mutated at runtime.
 *   - learned layer   — confirmed keyword→POI pairs appended at runtime via
 *                       `registerLearnedKeyword`, fed by the LLM (KAN-196) and
 *                       user edits (KAN-197) so the rule map keeps improving.
 * Lookups consult the learned layer first, then the seed. This file owns the
 * in-memory structure only; durable persistence (local + Firestore) is wired
 * in KAN-196.
 *
 * ── Adding a language ─────────────────────────────────────────────────────
 * Add a new `SupportedLang` literal and a matching entry in SEED_DICTIONARY.
 * Nothing else changes — matching is fully data-driven.
 */

import { PoiType } from '../types';

/** Languages the dictionary currently ships keywords for. */
export type SupportedLang = 'en' | 'pt-PT';

/** Fallback language when a caller does not specify one. */
export const DEFAULT_LANG: SupportedLang = 'en';

/** keyword (human-readable, may contain accents) → POI type. */
type KeywordMap = Record<string, PoiType>;

// ─── Seed dictionary ──────────────────────────────────────────────────────────
//
// Keys are written naturally (accents, casing) for readability; they are
// normalized (accent-folded, lowercased, de-punctuated) before matching, so
// "Café" here matches a title containing "cafe" and vice-versa. Multi-word
// keys ("pastel de nata") are supported and matched as a whole phrase.

const SEED_DICTIONARY: Record<SupportedLang, KeywordMap> = {
  en: {
    // supermarket
    groceries: 'supermarket', grocery: 'supermarket', supermarket: 'supermarket',
    market: 'supermarket', 'food shopping': 'supermarket',
    bread: 'supermarket', milk: 'supermarket', eggs: 'supermarket',
    butter: 'supermarket', vegetables: 'supermarket', veggies: 'supermarket',
    fruit: 'supermarket',
    // cafe
    coffee: 'cafe', latte: 'cafe', espresso: 'cafe', cappuccino: 'cafe',
    cafe: 'cafe', tea: 'cafe',
    // atm
    atm: 'atm', cash: 'atm', withdraw: 'atm', withdrawal: 'atm',
    // pharmacy
    pharmacy: 'pharmacy', drugstore: 'pharmacy', prescription: 'pharmacy',
    meds: 'pharmacy', medicine: 'pharmacy', medication: 'pharmacy',
    pills: 'pharmacy', vitamins: 'pharmacy',
  },
  'pt-PT': {
    // supermarket
    compras: 'supermarket', supermercado: 'supermarket', mercearia: 'supermarket',
    mercado: 'supermarket', 'pão': 'supermarket', leite: 'supermarket',
    ovos: 'supermarket', fruta: 'supermarket', legumes: 'supermarket',
    // cafe
    'café': 'cafe', galão: 'cafe', bica: 'cafe', 'chá': 'cafe',
    'pastel de nata': 'cafe', 'pequeno almoço': 'cafe',
    // atm
    multibanco: 'atm', dinheiro: 'atm', levantar: 'atm', levantamento: 'atm',
    // pharmacy
    'farmácia': 'pharmacy', receita: 'pharmacy', medicamentos: 'pharmacy',
    'remédios': 'pharmacy', comprimidos: 'pharmacy',
  },
};

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Normalize text for matching:
 *   - lowercase
 *   - accent-fold (NFD decomposition + strip combining marks) so "café" → "cafe"
 *   - replace punctuation with spaces
 *   - collapse runs of whitespace
 *
 * Applied to both task titles and dictionary keys so matching is
 * accent- and punctuation-insensitive.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Learned layer (KAN-196 / KAN-197 feed this) ─────────────────────────────

const learned: Record<SupportedLang, KeywordMap> = { en: {}, 'pt-PT': {} };

/**
 * Append a confirmed keyword→POI pair to the runtime learned layer for `lang`.
 * Called by the on-device LLM (KAN-196) and by user POI edits (KAN-197).
 * Keywords are normalized before storage; empty/whitespace keywords are ignored.
 *
 * Note: this only updates the in-memory layer. Durable persistence is added in
 * KAN-196 — until then, learned entries live for the app session.
 */
export function registerLearnedKeyword(
  keyword: string,
  poi: PoiType,
  lang: SupportedLang = DEFAULT_LANG,
): void {
  const key = normalize(keyword);
  if (!key) { return; }
  learned[lang][key] = poi;
}

/** Clear the learned layer (one language or all). Primarily for tests. */
export function clearLearnedKeywords(lang?: SupportedLang): void {
  if (lang) { learned[lang] = {}; return; }
  (Object.keys(learned) as SupportedLang[]).forEach(l => { learned[l] = {}; });
}

// ─── Normalized-entry cache ───────────────────────────────────────────────────

/** Cache of normalized seed entries per language (seed never changes). */
const seedCache: Partial<Record<SupportedLang, [string, PoiType][]>> = {};

function normalizedSeed(lang: SupportedLang): [string, PoiType][] {
  const cached = seedCache[lang];
  if (cached) { return cached; }
  const entries = Object.entries(SEED_DICTIONARY[lang])
    .map(([kw, poi]) => [normalize(kw), poi] as [string, PoiType])
    .filter(([kw]) => kw.length > 0);
  seedCache[lang] = entries;
  return entries;
}

/**
 * All candidate [normalizedKeyword, poi] entries for a language, learned layer
 * first (so user/LLM signals take precedence on ties), then the seed.
 */
function lookupEntries(lang: SupportedLang): [string, PoiType][] {
  const learnedEntries = Object.entries(learned[lang]) as [string, PoiType][];
  return [...learnedEntries, ...normalizedSeed(lang)];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Infer a POI type from a task title using the keyword dictionary.
 *
 * Matching is whole-word/phrase against the normalized title. When multiple
 * keywords match, the longest keyword wins (most specific); ties resolve to the
 * learned layer over the seed. Returns `null` when nothing matches — callers
 * must treat `null` as "no POI", never as an error.
 */
export function inferPoiFromRules(
  title: string,
  lang: SupportedLang = DEFAULT_LANG,
): PoiType | null {
  if (!title) { return null; }
  const normalized = normalize(title);
  if (!normalized) { return null; }
  const haystack = ` ${normalized} `;

  let best: { kw: string; poi: PoiType } | null = null;
  for (const [kw, poi] of lookupEntries(lang)) {
    if (haystack.includes(` ${kw} `)) {
      if (!best || kw.length > best.kw.length) { best = { kw, poi }; }
    }
  }
  return best ? best.poi : null;
}
