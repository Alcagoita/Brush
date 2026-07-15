import { getTypeSuggestions } from '../../../src/screens/TaskFormScreen/poiSuggestions';
import { setCopyLanguage } from '../../../src/constants/copy';

jest.mock('../../../src/services/placesFunctions', () => ({
  getPlaceDetailsProxy: jest.fn(),
  placesAutocompleteProxy: jest.fn(),
  searchNearbyPlacesProxy: jest.fn(),
  searchPlaceTypesProxy: jest.fn(),
}));

beforeEach(() => {
  setCopyLanguage('en');
});

afterEach(() => {
  setCopyLanguage('en');
});

describe('getTypeSuggestions', () => {
  it('returns an empty array for an empty query', () => {
    expect(getTypeSuggestions('')).toEqual([]);
  });

  it('returns an empty array for a whitespace-only query', () => {
    expect(getTypeSuggestions('   ')).toEqual([]);
  });

  it('matches labels from the shared bundled dictionary', () => {
    const results = getTypeSuggestions('bus');
    expect(results.some(r => r.label === 'Bus Station')).toBe(true);
  });

  it('surfaces police from the shared bundled dictionary', () => {
    const results = getTypeSuggestions('police');
    expect(results.some(r => r.type === 'police')).toBe(true);
  });

  it('supports concept search from the shared dictionary', () => {
    const results = getTypeSuggestions('buy a book');
    expect(results[0]).toEqual({ type: 'book_store', label: 'Book Store' });
  });

  it('returns localized labels for pt-PT', () => {
    setCopyLanguage('pt-PT');

    const results = getTypeSuggestions('policia');
    expect(results.some(r => r.label === 'Polícia')).toBe(true);
  });

  it('caps results at 6', () => {
    const results = getTypeSuggestions('place');
    expect(results.length).toBeLessThanOrEqual(6);
  });

  it('is case-insensitive', () => {
    const lower = getTypeSuggestions('bank');
    const upper = getTypeSuggestions('BANK');
    expect(upper).toEqual(lower);
  });
});
