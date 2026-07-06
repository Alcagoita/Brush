/**
 * storeAutocomplete.test.ts — KAN-76
 *
 * Unit tests for the searchPlacesAutocomplete function in maps.ts.
 *
 * Network calls are mocked via global.fetch.
 */

import { searchPlacesAutocomplete, searchDestinationAutocomplete, searchAddressAutocomplete } from '../../src/services/maps';

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// ─── Mock config/keys ─────────────────────────────────────────────────────────

jest.mock('../../src/config/keys', () => ({
  GOOGLE_PLACES_API_KEY: 'TEST_KEY',
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockApiResponse(suggestions: unknown[]) {
  mockFetch.mockResolvedValueOnce({
    ok:   true,
    json: async () => ({ suggestions }),
  });
}

function mockApiError(status = 500) {
  mockFetch.mockResolvedValueOnce({
    ok:     false,
    status,
    text:   async () => 'Internal Server Error',
  });
}

function makeSuggestion(placeId: string, name: string, address: string) {
  return {
    placePrediction: {
      placeId,
      structuredFormat: {
        mainText:      { text: name    },
        secondaryText: { text: address },
      },
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

describe('searchPlacesAutocomplete', () => {
  it('returns empty array for empty query without calling the API', async () => {
    const results = await searchPlacesAutocomplete('');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(results).toEqual([]);
  });

  it('returns empty array for whitespace-only query', async () => {
    const results = await searchPlacesAutocomplete('   ');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(results).toEqual([]);
  });

  it('maps API response to PlaceAutocompleteSuggestion[]', async () => {
    mockApiResponse([
      makeSuggestion('gpl-1', 'Nike Store',  'Oxford Street, London'),
      makeSuggestion('gpl-2', 'Adidas Store', 'Bond Street, London'),
    ]);

    const results = await searchPlacesAutocomplete('nike');

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      placeId: 'gpl-1',
      name:    'Nike Store',
      address: 'Oxford Street, London',
    });
    expect(results[1]).toEqual({
      placeId: 'gpl-2',
      name:    'Adidas Store',
      address: 'Bond Street, London',
    });
  });

  it('caps results at 5 even when API returns more', async () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      makeSuggestion(`gpl-${i}`, `Store ${i}`, `Address ${i}`),
    );
    mockApiResponse(many);

    const results = await searchPlacesAutocomplete('store');
    expect(results).toHaveLength(5);
  });

  it('skips suggestions without a placeId', async () => {
    mockApiResponse([
      { placePrediction: {} },    // no placeId
      makeSuggestion('gpl-1', 'Nike Store', 'London'),
    ]);

    const results = await searchPlacesAutocomplete('nike');
    expect(results).toHaveLength(1);
    expect(results[0].placeId).toBe('gpl-1');
  });

  it('falls back to placeId as name when mainText is absent', async () => {
    mockApiResponse([
      { placePrediction: { placeId: 'gpl-1', structuredFormat: {} } },
    ]);

    const results = await searchPlacesAutocomplete('test');
    expect(results[0].name).toBe('gpl-1');
    expect(results[0].address).toBe('');
  });

  it('includes location bias in the request body when lat/lng are provided', async () => {
    mockApiResponse([]);

    await searchPlacesAutocomplete('coffee', 51.5, -0.1);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.locationBias).toEqual({
      circle: {
        center: { latitude: 51.5, longitude: -0.1 },
        radius: 50_000,
      },
    });
  });

  it('omits locationBias when lat/lng are not provided', async () => {
    mockApiResponse([]);

    await searchPlacesAutocomplete('coffee');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.locationBias).toBeUndefined();
  });

  it('returns empty array on API error (non-2xx status)', async () => {
    mockApiError(503);
    const results = await searchPlacesAutocomplete('nike');
    expect(results).toEqual([]);
  });

  it('returns empty array on network error (fetch throws)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const results = await searchPlacesAutocomplete('nike');
    expect(results).toEqual([]);
  });

  it('requests the correct FieldMask header', async () => {
    mockApiResponse([]);

    await searchPlacesAutocomplete('test');

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['X-Goog-FieldMask']).toBe(
      'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat',
    );
  });

  it('restricts to establishment results (not cities/regions)', async () => {
    mockApiResponse([]);
    await searchPlacesAutocomplete('faro');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.includedPrimaryTypes).toEqual(['establishment']);
  });
});

describe('searchDestinationAutocomplete (KAN-234 Trip Planner)', () => {
  it('restricts results to cities/towns, not individual businesses', async () => {
    mockApiResponse([]);
    await searchDestinationAutocomplete('faro');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.includedPrimaryTypes).toEqual(['(cities)']);
  });

  it('returns empty array for empty query without calling the API', async () => {
    const results = await searchDestinationAutocomplete('');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(results).toEqual([]);
  });

  it('maps API response to PlaceAutocompleteSuggestion[]', async () => {
    mockApiResponse([makeSuggestion('gpl-1', 'Faro', 'Faro, Portugal')]);

    const results = await searchDestinationAutocomplete('faro');

    expect(results).toEqual([{ placeId: 'gpl-1', name: 'Faro', address: 'Faro, Portugal' }]);
  });

  it('returns empty array on API error', async () => {
    mockApiError(503);
    const results = await searchDestinationAutocomplete('faro');
    expect(results).toEqual([]);
  });

  it('includes location bias in the request body when lat/lng are provided (disambiguates same-named cities)', async () => {
    mockApiResponse([]);

    await searchDestinationAutocomplete('faro', 37.0179, -7.9304);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.locationBias).toEqual({
      circle: {
        center: { latitude: 37.0179, longitude: -7.9304 },
        radius: 50_000,
      },
    });
  });

  it('omits locationBias when lat/lng are not provided', async () => {
    mockApiResponse([]);
    await searchDestinationAutocomplete('faro');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.locationBias).toBeUndefined();
  });
});

describe('searchAddressAutocomplete (KAN-247 Home address)', () => {
  it('omits includedPrimaryTypes entirely — no restriction, so a specific street address matches', async () => {
    mockApiResponse([]);
    await searchAddressAutocomplete('221b baker street');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).not.toHaveProperty('includedPrimaryTypes');
  });

  it('returns empty array for empty query without calling the API', async () => {
    const results = await searchAddressAutocomplete('');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(results).toEqual([]);
  });

  it('maps API response to PlaceAutocompleteSuggestion[]', async () => {
    mockApiResponse([makeSuggestion('gpl-1', '221B Baker Street', 'London, UK')]);

    const results = await searchAddressAutocomplete('221b baker street');

    expect(results).toEqual([{ placeId: 'gpl-1', name: '221B Baker Street', address: 'London, UK' }]);
  });

  it('returns empty array on API error', async () => {
    mockApiError(503);
    const results = await searchAddressAutocomplete('baker street');
    expect(results).toEqual([]);
  });

  it('includes location bias in the request body when lat/lng are provided', async () => {
    mockApiResponse([]);
    await searchAddressAutocomplete('baker street', 51.5, -0.1);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.locationBias).toEqual({
      circle: {
        center: { latitude: 51.5, longitude: -0.1 },
        radius: 50_000,
      },
    });
  });
});

describe('searchPlacesAutocomplete / searchDestinationAutocomplete still send includedPrimaryTypes (regression guard for the shared fetchPlacesAutocomplete change)', () => {
  it('searchPlacesAutocomplete still sends ["establishment"]', async () => {
    mockApiResponse([]);
    await searchPlacesAutocomplete('nike');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.includedPrimaryTypes).toEqual(['establishment']);
  });

  it('searchDestinationAutocomplete still sends ["(cities)"]', async () => {
    mockApiResponse([]);
    await searchDestinationAutocomplete('faro');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.includedPrimaryTypes).toEqual(['(cities)']);
  });
});
