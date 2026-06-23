/**
 * src/services/poiInference.ts — KAN-195
 *
 * Rule-based POI inference: map a task title to a POI type using an on-device,
 * offline keyword dictionary. This is the FIRST pass of POI inference on
 * imported tasks (wired into the import flow in KAN-197). No AI, no network —
 * the on-device LLM fallback for titles this misses lands in KAN-196.
 *
 * Output is a `PoiResolution` (a built-in `PoiType` or, for custom categories,
 * any Google Places type string) or `null`. `null` is a valid, expected result:
 * when no keyword matches we do NOT guess, and the caller simply leaves
 * `task.poi` unset. The seed covers all 16 built-in `PoiType`s in EN + pt-PT.
 *
 * ── Self-growing dictionary ───────────────────────────────────────────────
 * The dictionary has two layers:
 *   - SEED_DICTIONARY — hand-curated, checked in, never mutated at runtime.
 *   - learned layer   — keyword→POI pairs appended at runtime, fed by:
 *       • the on-device LLM (KAN-196) and user POI edits (KAN-197), and
 *       • custom categories the user adds — `registerCategoryKeywords` /
 *         `syncCategoryKeywords` turn a category's name (+ synonyms) into
 *         keywords pointing at its POI, so user-added POIs are inferable too.
 * Lookups consult the learned layer first, then the seed. This file owns the
 * in-memory structure only; durable persistence (local + Firestore) is wired
 * in KAN-196 — custom categories are re-synced from Firestore on load until then.
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

/**
 * What a keyword can resolve to: one of the 16 built-in `PoiType`s, or — for
 * dynamically registered custom categories — any Google Places type string
 * (e.g. "bakery", "stadium"). The `string & {}` keeps `PoiType` autocomplete
 * while still accepting arbitrary place types.
 */
export type PoiResolution = PoiType | (string & {});

/** keyword (human-readable, may contain accents) → POI/Places type. */
type KeywordMap = Record<string, PoiResolution>;

// ─── Seed dictionary ──────────────────────────────────────────────────────────
//
// Keys are written naturally (accents, casing) for readability; they are
// normalized (accent-folded, lowercased, de-punctuated) before matching, so
// "Café" here matches a title containing "cafe" and vice-versa. Multi-word
// keys ("pastel de nata") are supported and matched as a whole phrase.

const SEED_DICTIONARY: Record<SupportedLang, KeywordMap> = {
  en: {
    // ── atm ──
    atm: 'atm', cash: 'atm', withdraw: 'atm', withdrawal: 'atm', 'cash machine': 'atm',
    // ── cafe ──
    coffee: 'cafe', latte: 'cafe', espresso: 'cafe', cappuccino: 'cafe',
    cafe: 'cafe', tea: 'cafe', 'flat white': 'cafe',
    // ── supermarket ──
    groceries: 'supermarket', grocery: 'supermarket', supermarket: 'supermarket',
    market: 'supermarket', 'food shopping': 'supermarket',
    bread: 'supermarket', milk: 'supermarket', eggs: 'supermarket',
    butter: 'supermarket', vegetables: 'supermarket', veggies: 'supermarket',
    fruit: 'supermarket',
    // ── pharmacy ──
    pharmacy: 'pharmacy', drugstore: 'pharmacy', prescription: 'pharmacy',
    meds: 'pharmacy', medicine: 'pharmacy', medication: 'pharmacy',
    pills: 'pharmacy', vitamins: 'pharmacy',
    // ── gas ──
    gas: 'gas', 'gas station': 'gas', fuel: 'gas', petrol: 'gas',
    diesel: 'gas', 'fill up': 'gas', 'fill the tank': 'gas',
    // ── gym ──
    gym: 'gym', workout: 'gym', 'work out': 'gym', exercise: 'gym',
    fitness: 'gym', training: 'gym',
    // ── bank ──
    bank: 'bank', deposit: 'bank', 'bank branch': 'bank', cheque: 'bank',
    // ── restaurant ──
    restaurant: 'restaurant', lunch: 'restaurant', dinner: 'restaurant',
    'eat out': 'restaurant', 'dine out': 'restaurant', reservation: 'restaurant',
    // ── park ──
    park: 'park', walk: 'park', playground: 'park', picnic: 'park',
    // ── library ──
    library: 'library', 'return book': 'library', 'borrow book': 'library',
    'library book': 'library',
    // ── post ──
    'post office': 'post', mail: 'post', parcel: 'post', package: 'post',
    stamp: 'post', stamps: 'post', 'ship package': 'post',
    // ── store ──
    store: 'store', shop: 'store', mall: 'store', 'shopping mall': 'store',
    // ── clinic ──
    clinic: 'clinic', doctor: 'clinic', 'doctor appointment': 'clinic',
    checkup: 'clinic', dentist: 'clinic', 'medical appointment': 'clinic',
    // ── salon ──
    salon: 'salon', haircut: 'salon', barber: 'salon', 'hair appointment': 'salon',
    nails: 'salon', manicure: 'salon',
    // ── bus ──
    bus: 'bus', 'bus stop': 'bus', 'bus station': 'bus', 'catch the bus': 'bus',
    // ── school ──
    school: 'school', class: 'school', 'pick up kids': 'school',
    'parent meeting': 'school', 'drop off kids': 'school',
  },
  'pt-PT': {
    // ── atm ──
    multibanco: 'atm', dinheiro: 'atm', levantar: 'atm', levantamento: 'atm',
    // ── cafe ──
    'café': 'cafe', galão: 'cafe', bica: 'cafe', 'chá': 'cafe',
    'pastel de nata': 'cafe', 'pequeno almoço': 'cafe',
    // ── supermarket ──
    compras: 'supermarket', supermercado: 'supermarket', mercearia: 'supermarket',
    mercado: 'supermarket', 'pão': 'supermarket', leite: 'supermarket',
    ovos: 'supermarket', fruta: 'supermarket', legumes: 'supermarket',
    // ── pharmacy ──
    'farmácia': 'pharmacy', receita: 'pharmacy', medicamentos: 'pharmacy',
    'remédios': 'pharmacy', comprimidos: 'pharmacy',
    // ── gas ──
    gasolina: 'gas', 'combustível': 'gas', 'gasóleo': 'gas',
    abastecer: 'gas', 'meter gasolina': 'gas', 'bomba de gasolina': 'gas',
    // ── gym ──
    'ginásio': 'gym', treino: 'gym', 'exercício': 'gym', 'musculação': 'gym',
    // ── bank ──
    banco: 'bank', 'depósito': 'bank', 'balcão': 'bank',
    // ── restaurant ──
    restaurante: 'restaurant', 'almoço': 'restaurant', jantar: 'restaurant',
    reserva: 'restaurant', 'refeição': 'restaurant',
    // ── park ──
    parque: 'park', passear: 'park', jardim: 'park', piquenique: 'park',
    // ── library ──
    biblioteca: 'library', 'devolver livro': 'library', 'requisitar livro': 'library',
    // ── post ──
    correios: 'post', carta: 'post', encomenda: 'post', selo: 'post',
    'enviar encomenda': 'post',
    // ── store ──
    loja: 'store', 'centro comercial': 'store', shopping: 'store',
    // ── clinic ──
    'clínica': 'clinic', 'médico': 'clinic', consulta: 'clinic',
    dentista: 'clinic', exame: 'clinic',
    // ── salon ──
    cabeleireiro: 'salon', 'corte de cabelo': 'salon', barbeiro: 'salon',
    unhas: 'salon', manicure: 'salon',
    // ── bus ──
    autocarro: 'bus', paragem: 'bus', 'apanhar o autocarro': 'bus',
    // ── school ──
    escola: 'school', aula: 'school', 'buscar os miúdos': 'school',
    'reunião de pais': 'school',
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
 * KAN-196 — until then, learned entries live for the app session (custom
 * categories are re-registered from Firestore on load via `syncCategoryKeywords`).
 */
export function registerLearnedKeyword(
  keyword: string,
  poi: PoiResolution,
  lang: SupportedLang = DEFAULT_LANG,
): void {
  const key = normalize(keyword);
  if (!key) { return; }
  learned[lang][key] = poi;
}

/** Bulk variant of {@link registerLearnedKeyword} — register many synonyms for one POI. */
export function registerPoiKeywords(
  poi: PoiResolution,
  keywords: string[],
  lang: SupportedLang = DEFAULT_LANG,
): void {
  for (const kw of keywords) { registerLearnedKeyword(kw, poi, lang); }
}

/**
 * Register a custom category's wording into the dictionary so future imports
 * infer its POI. This is the "user adds a new POI" hook: when a user creates or
 * edits a custom category that has a POI association, its `name` (and any extra
 * `synonyms`) become keywords pointing at that POI/Places type.
 *
 * No-op for categories without a POI (`poi == null`) or with an empty name.
 * Idempotent — re-registering the same category just overwrites its entry.
 */
export function registerCategoryKeywords(
  category: { name: string; poi: string | null; synonyms?: string[] },
  lang: SupportedLang = DEFAULT_LANG,
): void {
  if (!category.poi) { return; }
  registerLearnedKeyword(category.name, category.poi, lang);
  if (category.synonyms) { registerPoiKeywords(category.poi, category.synonyms, lang); }
}

/**
 * Re-register every custom category's wording into the dictionary. Call on app
 * start / category load so user-added POIs survive a restart even before the
 * KAN-196 durable store lands. Categories without a POI are skipped.
 */
export function syncCategoryKeywords(
  categories: { name: string; poi: string | null; synonyms?: string[] }[],
  lang: SupportedLang = DEFAULT_LANG,
): void {
  for (const c of categories) { registerCategoryKeywords(c, lang); }
}

/** Clear the learned layer (one language or all). Primarily for tests. */
export function clearLearnedKeywords(lang?: SupportedLang): void {
  if (lang) { learned[lang] = {}; return; }
  (Object.keys(learned) as SupportedLang[]).forEach(l => { learned[l] = {}; });
}

// ─── Normalized-entry cache ───────────────────────────────────────────────────

/** Cache of normalized seed entries per language (seed never changes). */
const seedCache: Partial<Record<SupportedLang, [string, PoiResolution][]>> = {};

function normalizedSeed(lang: SupportedLang): [string, PoiResolution][] {
  const cached = seedCache[lang];
  if (cached) { return cached; }
  const entries = Object.entries(SEED_DICTIONARY[lang])
    .map(([kw, poi]) => [normalize(kw), poi] as [string, PoiResolution])
    .filter(([kw]) => kw.length > 0);
  seedCache[lang] = entries;
  return entries;
}

/**
 * All candidate [normalizedKeyword, poi] entries for a language, learned layer
 * first (so user/LLM signals take precedence on ties), then the seed.
 */
function lookupEntries(lang: SupportedLang): [string, PoiResolution][] {
  const learnedEntries = Object.entries(learned[lang]) as [string, PoiResolution][];
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
): PoiResolution | null {
  if (!title) { return null; }
  const normalized = normalize(title);
  if (!normalized) { return null; }
  const haystack = ` ${normalized} `;

  let best: { kw: string; poi: PoiResolution } | null = null;
  for (const [kw, poi] of lookupEntries(lang)) {
    if (haystack.includes(` ${kw} `)) {
      if (!best || kw.length > best.kw.length) { best = { kw, poi }; }
    }
  }
  return best ? best.poi : null;
}
