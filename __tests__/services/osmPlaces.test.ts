/**
 * KAN-228 — searchOsmPlaces: Overpass API integration for the habitat cache.
 *
 * Verifies:
 *   - Builds one node[...] Overpass clause per requested POI type
 *   - Parses elements[] into OsmPlace[], grouped by type, sorted by distance
 *   - Falls back to the tag value as a name when OSM has no name tag
 *   - Unrecognized POI types (no OSM tag mapping) are skipped, not errored
 *   - Never throws: empty poiTypes, non-200 response, network failure, timeout
 */

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import { searchOsmPlaces } from '../../src/services/osmPlaces';

const ORIGIN = { lat: 0, lng: 0 };

function mockOverpassResponse(elements: Array<{
  type?: string; id: number; lat: number; lon: number; tags: Record<string, string>;
}>) {
  mockFetch.mockResolvedValueOnce({
    ok:   true,
    json: async () => ({
      elements: elements.map(e => ({ type: e.type ?? 'node', ...e })),
    }),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('searchOsmPlaces', () => {
  it('returns an empty result for each type without calling fetch when poiTypes is empty', async () => {
    const result = await searchOsmPlaces(ORIGIN.lat, ORIGIN.lng, [], 5000);
    expect(result).toEqual({});
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('builds one node clause per requested POI type using POI_OSM_TAGS', async () => {
    mockOverpassResponse([]);
    await searchOsmPlaces(ORIGIN.lat, ORIGIN.lng, ['pharmacy', 'cafe'], 5000);

    const [, options] = mockFetch.mock.calls[0];
    const body = decodeURIComponent((options.body as string).replace(/^data=/, ''));
    expect(body).toContain('node["amenity"="pharmacy"](around:5000,0,0);');
    expect(body).toContain('node["amenity"="cafe"](around:5000,0,0);');
  });

  it('skips POI types with no OSM tag mapping instead of erroring', async () => {
    mockOverpassResponse([]);
    const result = await searchOsmPlaces(ORIGIN.lat, ORIGIN.lng, ['not-a-real-type'], 5000);
    expect(result).toEqual({ 'not-a-real-type': [] });
  });

  it('parses elements into OsmPlace[], grouped by type and sorted by distance', async () => {
    // ~30m and ~55m north of the origin (same latitude math used elsewhere in this suite).
    mockOverpassResponse([
      { id: 1, lat: 0.0005, lon: 0, tags: { amenity: 'cafe', name: 'Far Cafe' } },
      { id: 2, lat: 0.00027, lon: 0, tags: { amenity: 'cafe', name: 'Near Cafe' } },
    ]);

    const result = await searchOsmPlaces(ORIGIN.lat, ORIGIN.lng, ['cafe'], 5000);

    expect(result.cafe).toHaveLength(2);
    expect(result.cafe[0].name).toBe('Near Cafe');
    expect(result.cafe[0].osmId).toBe('node/2');
    expect(result.cafe[1].name).toBe('Far Cafe');
    expect(result.cafe[0].distanceMeters).toBeLessThan(result.cafe[1].distanceMeters);
  });

  it('falls back to the tag value as the name when OSM has no name tag', async () => {
    mockOverpassResponse([
      { id: 3, lat: 0.0001, lon: 0, tags: { amenity: 'pharmacy' } },
    ]);

    const result = await searchOsmPlaces(ORIGIN.lat, ORIGIN.lng, ['pharmacy'], 5000);
    expect(result.pharmacy[0].name).toBe('pharmacy');
  });

  it('ignores elements missing lat/lon or tags', async () => {
    mockOverpassResponse([
      { id: 4, lat: undefined as unknown as number, lon: 0, tags: { amenity: 'atm' } },
    ]);

    const result = await searchOsmPlaces(ORIGIN.lat, ORIGIN.lng, ['atm'], 5000);
    expect(result.atm).toEqual([]);
  });

  it('returns empty results on a non-200 response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const result = await searchOsmPlaces(ORIGIN.lat, ORIGIN.lng, ['atm'], 5000);
    expect(result).toEqual({ atm: [] });
  });

  it('returns empty results on a network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    const result = await searchOsmPlaces(ORIGIN.lat, ORIGIN.lng, ['atm'], 5000);
    expect(result).toEqual({ atm: [] });
  });

  it('sends a User-Agent header identifying the app', async () => {
    mockOverpassResponse([]);
    await searchOsmPlaces(ORIGIN.lat, ORIGIN.lng, ['atm'], 5000);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['User-Agent']).toMatch(/^BrushApp\//);
  });

  it('aborts and returns empty results when the request exceeds the timeout', async () => {
    jest.useFakeTimers();
    mockFetch.mockImplementationOnce((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new Error('AbortError')));
    }));

    const resultPromise = searchOsmPlaces(ORIGIN.lat, ORIGIN.lng, ['atm'], 5000);
    jest.advanceTimersByTime(8_001);
    const result = await resultPromise;

    expect(result).toEqual({ atm: [] });
    jest.useRealTimers();
  });

  it('honors an explicit timeoutMs override (KAN-234 trip downloads) instead of the 8s default', async () => {
    jest.useFakeTimers();
    mockFetch.mockImplementationOnce((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new Error('AbortError')));
    }));

    const resultPromise = searchOsmPlaces(ORIGIN.lat, ORIGIN.lng, ['atm'], 5000, 20_000);

    jest.advanceTimersByTime(8_001); // past the default — must NOT have aborted yet
    let settled = false;
    resultPromise.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);

    jest.advanceTimersByTime(12_000); // past the 20s override
    const result = await resultPromise;
    expect(result).toEqual({ atm: [] });

    jest.useRealTimers();
  });
});
