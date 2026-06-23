/**
 * KAN-195 — rule-based POI inference unit tests.
 *
 * Covers:
 *   normalize
 *     - lowercases, accent-folds, strips punctuation, collapses whitespace
 *   inferPoiFromRules
 *     - EN matches for each of the four core POI types
 *     - pt-PT matches for each of the four core POI types
 *     - accent-insensitive matching (café / cafe, farmácia / farmacia)
 *     - case / punctuation insensitive
 *     - multi-word phrase keys (pastel de nata)
 *     - longest-keyword-wins on competing matches
 *     - no-match → null; empty / whitespace / garbage → null
 *   registerLearnedKeyword / clearLearnedKeywords
 *     - learned keyword is matched
 *     - learned layer takes precedence on ties
 *     - clear removes learned entries
 */

import {
  inferPoiFromRules,
  normalize,
  registerLearnedKeyword,
  clearLearnedKeywords,
} from '../../src/services/poiInference';

afterEach(() => { clearLearnedKeywords(); });

// ─── normalize ────────────────────────────────────────────────────────────────

describe('normalize', () => {
  it('lowercases', () => {
    expect(normalize('BUY BREAD')).toBe('buy bread');
  });

  it('accent-folds diacritics', () => {
    expect(normalize('Café com Pão')).toBe('cafe com pao');
    expect(normalize('farmácia')).toBe('farmacia');
  });

  it('strips punctuation to spaces and collapses whitespace', () => {
    expect(normalize('  buy:  bread,  milk!  ')).toBe('buy bread milk');
  });

  it('returns empty string for punctuation-only input', () => {
    expect(normalize('!!! ...')).toBe('');
  });
});

// ─── inferPoiFromRules: English ────────────────────────────────────────────────

describe('inferPoiFromRules (en)', () => {
  it('maps "buy bread" to supermarket', () => {
    expect(inferPoiFromRules('buy bread')).toBe('supermarket');
  });

  it('maps a coffee task to cafe', () => {
    expect(inferPoiFromRules('grab a coffee')).toBe('cafe');
  });

  it('maps a cash task to atm', () => {
    expect(inferPoiFromRules('withdraw cash')).toBe('atm');
  });

  it('maps a prescription task to pharmacy', () => {
    expect(inferPoiFromRules('pick up prescription')).toBe('pharmacy');
  });

  it('is case-insensitive', () => {
    expect(inferPoiFromRules('BUY MILK')).toBe('supermarket');
  });

  it('ignores surrounding punctuation', () => {
    expect(inferPoiFromRules('Groceries: milk, eggs!')).toBe('supermarket');
  });
});

// ─── inferPoiFromRules: Português de Portugal ──────────────────────────────────

describe('inferPoiFromRules (pt-PT)', () => {
  it('maps "comprar pão" to supermarket', () => {
    expect(inferPoiFromRules('comprar pão', 'pt-PT')).toBe('supermarket');
  });

  it('maps a café task to cafe', () => {
    expect(inferPoiFromRules('tomar um café', 'pt-PT')).toBe('cafe');
  });

  it('maps a multibanco task to atm', () => {
    expect(inferPoiFromRules('levantar dinheiro no multibanco', 'pt-PT')).toBe('atm');
  });

  it('maps a farmácia task to pharmacy', () => {
    expect(inferPoiFromRules('ir à farmácia', 'pt-PT')).toBe('pharmacy');
  });

  it('matches accent-folded input (cafe without accent)', () => {
    expect(inferPoiFromRules('beber um cafe', 'pt-PT')).toBe('cafe');
  });

  it('matches a multi-word phrase key (pastel de nata)', () => {
    expect(inferPoiFromRules('comprar pastel de nata', 'pt-PT')).toBe('cafe');
  });
});

// ─── No-match / edge cases ─────────────────────────────────────────────────────

describe('inferPoiFromRules: no match returns null', () => {
  it('returns null when no keyword matches', () => {
    expect(inferPoiFromRules('call mom')).toBeNull();
    expect(inferPoiFromRules('finish quarterly report')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(inferPoiFromRules('')).toBeNull();
  });

  it('returns null for whitespace-only input', () => {
    expect(inferPoiFromRules('    ')).toBeNull();
  });

  it('returns null for punctuation-only input', () => {
    expect(inferPoiFromRules('!!!')).toBeNull();
  });

  it('does not match a keyword embedded inside another word', () => {
    // "teamwork" contains "tea" but must not match cafe (whole-word matching)
    expect(inferPoiFromRules('teamwork sync')).toBeNull();
  });
});

// ─── Longest-keyword-wins ──────────────────────────────────────────────────────

describe('inferPoiFromRules: specificity', () => {
  it('prefers the longest matching keyword', () => {
    // "food shopping" (supermarket) is longer than "tea" — but here ensure a
    // multi-word key wins over a shorter incidental one.
    expect(inferPoiFromRules('weekly food shopping')).toBe('supermarket');
  });
});

// ─── Learned layer ─────────────────────────────────────────────────────────────

describe('learned layer', () => {
  it('matches a keyword registered at runtime', () => {
    expect(inferPoiFromRules('refill propane')).toBeNull();
    registerLearnedKeyword('propane', 'gas');
    expect(inferPoiFromRules('refill propane')).toBe('gas');
  });

  it('normalizes learned keywords before storing', () => {
    registerLearnedKeyword('  Padaria!  ', 'supermarket', 'pt-PT');
    expect(inferPoiFromRules('ir à padaria', 'pt-PT')).toBe('supermarket');
  });

  it('ignores empty / whitespace keywords', () => {
    registerLearnedKeyword('   ', 'cafe');
    expect(inferPoiFromRules('   ')).toBeNull();
  });

  it('clearLearnedKeywords removes learned entries', () => {
    registerLearnedKeyword('propane', 'gas');
    expect(inferPoiFromRules('refill propane')).toBe('gas');
    clearLearnedKeywords();
    expect(inferPoiFromRules('refill propane')).toBeNull();
  });

  it('learned layer wins over seed on an equal-length tie', () => {
    // Seed maps "tea" → cafe. Register same-length "tea" → supermarket; learned
    // is consulted first so it wins on the length tie.
    registerLearnedKeyword('tea', 'supermarket');
    expect(inferPoiFromRules('buy tea')).toBe('supermarket');
  });
});
