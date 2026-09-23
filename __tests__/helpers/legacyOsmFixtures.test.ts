import { cloudflareViaLegacyOsm } from './legacyOsmFixtures';

const place = (osmId: string, name: string, brand?: string, attributes?: Record<string, string[]>) => ({
  osmId, name, lat: 0, lng: 0, distanceMeters: 25, brand, attributes,
});

describe('cloudflareViaLegacyOsm', () => {
  it('matches brand from the structured brand field, not the name', async () => {
    const search = jest.fn().mockResolvedValue({ store: [
      place('store-1', 'Worten', 'Fnac'),
      place('store-2', 'Other store', 'Worten'),
    ] });

    const response = await cloudflareViaLegacyOsm(search, [0, 0, 100, [
      { key: 'worten', type: 'store', brand: 'Worten' },
    ]]);

    expect(response.results.worten.map(result => result.poi_id)).toEqual(['store-2']);
  });

  it('matches only the requested structured attribute dimension', async () => {
    const search = jest.fn().mockResolvedValue({ store: [
      place('books-in-id', 'Other store'),
      place('store-2', 'Books in name', undefined, { food_cuisine: ['books'] }),
      place('store-3', 'Bookshop', undefined, { store_kind: ['books'] }),
    ] });

    const response = await cloudflareViaLegacyOsm(search, [0, 0, 100, [
      { key: 'books', type: 'store', attribute: { dimension: 'store_kind', values: ['books'] } },
    ]]);

    expect(response.results.books.map(result => result.poi_id)).toEqual(['store-3']);
    expect(response.results.books[0].attributes).toEqual({ store_kind: ['books'] });
  });
});
