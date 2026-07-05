/**
 * tripPlannerMaps.test.ts — KAN-234
 *
 * Unit tests for maps.ts's Trip Planner additions:
 *   - getPlaceDetails: resolves a Places Autocomplete placeId (which carries
 *     no coordinates) to lat/lng + name
 *   - buildStaticMapPreviewUrl: pure URL construction for the trip radius
 *     preview image (no network) — asserts center/size/key and that zoom
 *     scales sanely with radius
 */

import { getPlaceDetails, buildStaticMapPreviewUrl } from '../../src/services/maps';

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// ─── Mock config/keys ─────────────────────────────────────────────────────────

jest.mock('../../src/config/keys', () => ({
  GOOGLE_PLACES_API_KEY: 'TEST_KEY',
}));

beforeEach(() => {
  mockFetch.mockReset();
});

describe('getPlaceDetails', () => {
  it('resolves a placeId to lat/lng + name', async () => {
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: async () => ({
        location:    { latitude: 37.0179, longitude: -7.9304 },
        displayName: { text: 'Faro, Portugal' },
      }),
    });

    const details = await getPlaceDetails('place-abc');

    expect(details).toEqual({ lat: 37.0179, lng: -7.9304, name: 'Faro, Portugal' });
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://places.googleapis.com/v1/places/place-abc');
    expect(options.headers['X-Goog-Api-Key']).toBe('TEST_KEY');
    expect(options.headers['X-Goog-FieldMask']).toBe('location,displayName');
  });

  it('falls back to the placeId as the name when displayName is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: async () => ({ location: { latitude: 1, longitude: 2 } }),
    });

    const details = await getPlaceDetails('place-abc');

    expect(details?.name).toBe('place-abc');
  });

  it('returns null when location is missing from the response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    expect(await getPlaceDetails('place-abc')).toBeNull();
  });

  it('returns null on a non-200 response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    expect(await getPlaceDetails('place-abc')).toBeNull();
  });

  it('returns null on a network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    expect(await getPlaceDetails('place-abc')).toBeNull();
  });

  it('URL-encodes the placeId', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ location: { latitude: 1, longitude: 2 } }) });
    await getPlaceDetails('place/with/slashes');
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('https://places.googleapis.com/v1/places/place%2Fwith%2Fslashes');
  });
});

describe('buildStaticMapPreviewUrl', () => {
  it('includes the correct center, size, and API key', () => {
    const url = buildStaticMapPreviewUrl(37.0179, -7.9304, 5_000, 300, 200);
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe('https://maps.googleapis.com/maps/api/staticmap');
    expect(parsed.searchParams.get('center')).toBe('37.0179,-7.9304');
    expect(parsed.searchParams.get('size')).toBe('300x200');
    expect(parsed.searchParams.get('key')).toBe('TEST_KEY');
  });

  it('produces a smaller zoom for a larger radius (zooms out to fit a bigger circle)', () => {
    const townUrl  = new URL(buildStaticMapPreviewUrl(37.0179, -7.9304, 5_000, 300, 200));
    const regionUrl = new URL(buildStaticMapPreviewUrl(37.0179, -7.9304, 40_000, 300, 200));

    const townZoom = Number(townUrl.searchParams.get('zoom'));
    const regionZoom = Number(regionUrl.searchParams.get('zoom'));

    expect(regionZoom).toBeLessThan(townZoom);
  });

  it('clamps zoom to a sane range for an extreme radius', () => {
    const hugeUrl = new URL(buildStaticMapPreviewUrl(0, 0, 10_000_000, 300, 200));
    const tinyUrl = new URL(buildStaticMapPreviewUrl(0, 0, 1, 300, 200));

    expect(Number(hugeUrl.searchParams.get('zoom'))).toBeGreaterThanOrEqual(1);
    expect(Number(tinyUrl.searchParams.get('zoom'))).toBeLessThanOrEqual(20);
  });
});
