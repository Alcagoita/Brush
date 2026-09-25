const mockCurrentIfPermitted = jest.fn();
const mockLast = jest.fn();
const mockLookup = jest.fn();
jest.mock('../../src/services/geolocation', () => ({
  getCurrentPositionIfPermitted: (...args: unknown[]) => mockCurrentIfPermitted(...args),
  getLastKnownPosition: (...args: unknown[]) => mockLast(...args),
}));
jest.mock('../../src/services/cloudflarePoiFunctions', () => ({
  cloudflarePlaceNameLanguages: (...args: unknown[]) => mockLookup(...args),
}));
const mockSavedCountry = jest.fn();
const mockPersistCountry = jest.fn();
jest.mock('../../src/services/firestore/users', () => ({
  getPlaceNameCountry: (...args: unknown[]) => mockSavedCountry(...args),
  savePlaceNameCountry: (...args: unknown[]) => mockPersistCountry(...args),
}));

import { resolvePlaceNameCountry } from '../../src/services/placeNameCountry';

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentIfPermitted.mockResolvedValue(null);
  mockLast.mockResolvedValue(null);
  mockSavedCountry.mockResolvedValue({ countryCode: null, languages: [] });
  mockPersistCountry.mockResolvedValue(undefined);
});

it('uses last-known coordinates when location permission is blocked', async () => {
  mockLast.mockResolvedValue({ lat: 38.7, lng: -9.1 });
  mockLookup.mockResolvedValue({ countryCode: 'PT', languages: ['pt', 'en', 'pt'] });
  expect(await resolvePlaceNameCountry('user')).toEqual({ countryCode: 'PT', languages: ['en', 'pt'] });
  expect(mockCurrentIfPermitted).toHaveBeenCalled();
  expect(mockLookup).toHaveBeenCalledWith({ lat: 38.7, lng: -9.1 });
});

it('uses a permitted current position when available', async () => {
  mockCurrentIfPermitted.mockResolvedValue({ lat: 41.1, lng: -8.6 });
  mockLast.mockResolvedValue(null);
  mockLookup.mockResolvedValue({ countryCode: 'PT', languages: ['pt', 'en'] });
  expect(await resolvePlaceNameCountry('user')).toEqual({ countryCode: 'PT', languages: ['en', 'pt'] });
  expect(mockLookup).toHaveBeenCalledWith({ lat: 41.1, lng: -8.6 });
  expect(mockPersistCountry).toHaveBeenCalledWith('user', { countryCode: 'PT', languages: ['en', 'pt'] });
});

it('uses the saved last country if position and network are unavailable', async () => {
  mockSavedCountry.mockResolvedValue({ countryCode: 'CA', languages: ['en', 'fr'] });
  expect(await resolvePlaceNameCountry('user')).toEqual({ countryCode: 'CA', languages: ['en', 'fr'] });
  expect(mockLookup).not.toHaveBeenCalled();
});

it('falls back to English when neither current nor last country is known', async () => {
  expect(await resolvePlaceNameCountry('user')).toEqual({ countryCode: null, languages: [] });
});
