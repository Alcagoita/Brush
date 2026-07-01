import { getTypeSuggestions } from '../../../src/screens/TaskFormScreen/poiSuggestions';

describe('getTypeSuggestions', () => {
  it('returns an empty array for an empty query', () => {
    expect(getTypeSuggestions('')).toEqual([]);
  });

  it('returns an empty array for a whitespace-only query', () => {
    expect(getTypeSuggestions('   ')).toEqual([]);
  });

  it('matches labels by word-start prefix', () => {
    const results = getTypeSuggestions('bus');
    expect(results.some(r => r.label === 'Bus Station')).toBe(true);
  });

  it('does not match a prefix that is not at the start of a label word', () => {
    const results = getTypeSuggestions('bus');
    expect(results.some(r => r.label === 'Night Club')).toBe(false);
  });

  it('normalizes underscores to spaces before matching', () => {
    const results = getTypeSuggestions('bus_stat');
    expect(results.some(r => r.label === 'Bus Station')).toBe(true);
  });

  it('requires every query word to match some label word (multi-word prefix matching)', () => {
    const results = getTypeSuggestions('bus stat');
    expect(results.some(r => r.label === 'Bus Station')).toBe(true);
    expect(results.every(r => r.label !== 'Bank')).toBe(true);
  });

  it('caps results at 6', () => {
    // Single common letter matches many labels across the catalog.
    const results = getTypeSuggestions('a');
    expect(results.length).toBeLessThanOrEqual(6);
  });

  it('is case-insensitive', () => {
    const lower = getTypeSuggestions('bank');
    const upper = getTypeSuggestions('BANK');
    expect(upper).toEqual(lower);
  });
});
