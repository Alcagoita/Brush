/**
 * KAN-253 — poiTypeCache now resolves from bundled local JSON only.
 *
 * Covers:
 *   - English and pt-PT labels come from the active app language
 *   - Slug / prefix matching works locally with no network path
 *   - Generic Google types filtered out by the old live-search policy stay hidden
 *   - Legacy compatibility exports are harmless no-ops
 */

import { setCopyLanguage } from '../../src/constants/copy';
import {
  __resetPoiTypeCacheDbForTests,
  lookupPoiTypeCache,
  recordPoiTypeSearch,
  searchPlaceTypesCached,
  seedPoiTypeCacheIfEmpty,
} from '../../src/services/poiTypeCache';

jest.mock('../../src/config/keys', () => ({
  GOOGLE_PLACES_API_KEY: 'TEST_KEY',
}));

beforeEach(() => {
  setCopyLanguage('en');
  __resetPoiTypeCacheDbForTests();
});

afterEach(() => {
  setCopyLanguage('en');
});

describe('searchPlaceTypesCached', () => {
  it('returns English labels from the bundled dictionary', async () => {
    await expect(searchPlaceTypesCached('gym')).resolves.toEqual([
      { type: 'gym', label: 'Gym' },
    ]);
  });

  it('returns pt-PT labels from the bundled dictionary', async () => {
    setCopyLanguage('pt-PT');

    await expect(searchPlaceTypesCached('ginasio')).resolves.toEqual([
      { type: 'gym', label: 'Ginásio' },
    ]);
  });

  it('matches a raw type slug locally', async () => {
    const results = await searchPlaceTypesCached('sushi_restaurant');

    expect(results[0]).toEqual({ type: 'sushi_restaurant', label: 'Sushi Restaurant' });
  });

  it('supports prefix search without any live API fallback', async () => {
    const results = await searchPlaceTypesCached('sushi');

    expect(results.some(result => result.type === 'sushi_restaurant')).toBe(true);
  });

  it('prefers commercial POIs for "buy a book"', async () => {
    const results = await searchPlaceTypesCached('buy a book');

    expect(results[0]).toEqual({ type: 'book_store', label: 'Book Store' });
  });

  it('prefers florist for flower-buying intent', async () => {
    const results = await searchPlaceTypesCached('buy flowers');

    expect(results[0]).toEqual({ type: 'florist', label: 'Florist' });
  });

  it('prefers coffee shops for coffee-buying intent', async () => {
    const results = await searchPlaceTypesCached('get coffee');

    expect(results[0]).toEqual({ type: 'coffee_shop', label: 'Coffee Shop' });
  });

  it('prefers pharmacy for medicine pickup intent', async () => {
    const results = await searchPlaceTypesCached('pick up medicine');

    expect(results[0]).toEqual({ type: 'pharmacy', label: 'Pharmacy' });
  });

  it('prefers shoe stores for shoe-buying intent', async () => {
    const results = await searchPlaceTypesCached('buy shoes');

    expect(results[0]).toEqual({ type: 'shoe_store', label: 'Shoe Store' });
  });

  it('matches built-in labels inside longer task phrasing', async () => {
    const results = await searchPlaceTypesCached('go to the gym');

    expect(results[0]).toEqual({ type: 'gym', label: 'Gym' });
  });

  it('supports Portuguese synonym ranking offline', async () => {
    setCopyLanguage('pt-PT');

    const results = await searchPlaceTypesCached('comprar um livro');

    expect(results[0]).toEqual({ type: 'book_store', label: 'Livraria' });
  });

  it('keeps exact built-in label matches stable', async () => {
    await expect(searchPlaceTypesCached('library')).resolves.toEqual([
      { type: 'library', label: 'Library' },
    ]);
  });

  it('returns an empty list on a miss', async () => {
    await expect(searchPlaceTypesCached('totally made up poi xyz')).resolves.toEqual([]);
  });

  it('keeps generic Google types hidden from results', async () => {
    const results = await searchPlaceTypesCached('country');

    expect(results.some(result => result.type === 'country')).toBe(false);
  });
});

describe('lookupPoiTypeCache', () => {
  it('returns null on a miss', () => {
    expect(lookupPoiTypeCache('nothing here')).toBeNull();
  });

  it('returns local bundled suggestions on a hit', () => {
    expect(lookupPoiTypeCache('florist')).toEqual([
      { type: 'florist', label: 'Florist' },
    ]);
  });
});

describe('legacy compatibility exports', () => {
  it('keeps the old seed/record/reset exports as harmless no-ops', () => {
    expect(() => seedPoiTypeCacheIfEmpty()).not.toThrow();
    expect(() => recordPoiTypeSearch('gym', [{ type: 'gym', label: 'Gym' }])).not.toThrow();
    expect(() => __resetPoiTypeCacheDbForTests()).not.toThrow();
  });
});
