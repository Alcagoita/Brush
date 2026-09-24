const mockPermission = jest.fn();
const mockCurrent = jest.fn();
const mockLast = jest.fn();
const mockLookup = jest.fn();
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockLastSearchCoords = jest.fn();

jest.mock('expo-location', () => ({ getForegroundPermissionsAsync: (...args: unknown[]) => mockPermission(...args) }));
jest.mock('../../src/services/geolocation', () => ({
  getCurrentPosition: (...args: unknown[]) => mockCurrent(...args),
  getLastKnownPosition: (...args: unknown[]) => mockLast(...args),
}));
jest.mock('../../src/services/proximity', () => ({ getLastSearchCoords: () => mockLastSearchCoords() }));
jest.mock('../../src/services/cloudflarePoiFunctions', () => ({
  cloudflarePlaceNameLanguages: (...args: unknown[]) => mockLookup(...args),
}));
jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: () => ({}), doc: () => 'user-ref',
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
}));

import { resolvePlaceNameCountry } from '../../src/services/placeNameCountry';

beforeEach(() => {
  jest.clearAllMocks();
  mockPermission.mockResolvedValue({ granted: false });
  mockCurrent.mockResolvedValue(null);
  mockLast.mockResolvedValue(null);
  mockLastSearchCoords.mockReturnValue(null);
  mockGetDoc.mockResolvedValue({ data: () => ({}) });
  mockSetDoc.mockResolvedValue(undefined);
});

it('uses last-known coordinates when location permission is blocked', async () => {
  mockLast.mockResolvedValue({ lat: 38.7, lng: -9.1 });
  mockLookup.mockResolvedValue({ countryCode: 'PT', languages: ['pt', 'en', 'pt'] });
  expect(await resolvePlaceNameCountry('user')).toEqual({ countryCode: 'PT', languages: ['en', 'pt'] });
  expect(mockCurrent).not.toHaveBeenCalled();
  expect(mockLookup).toHaveBeenCalledWith({ lat: 38.7, lng: -9.1 });
});

it('uses the app’s last searched coordinates when the OS fix is unavailable', async () => {
  mockLastSearchCoords.mockReturnValue({ lat: 41.1, lng: -8.6 });
  mockLookup.mockResolvedValue({ countryCode: 'PT', languages: ['pt', 'en'] });
  expect(await resolvePlaceNameCountry('user')).toEqual({ countryCode: 'PT', languages: ['en', 'pt'] });
  expect(mockLookup).toHaveBeenCalledWith({ lat: 41.1, lng: -8.6 });
});

it('uses the saved last country if position and network are unavailable', async () => {
  mockGetDoc.mockResolvedValue({ data: () => ({ placeNameLastCountryCode: 'CA', placeNameLastLanguages: ['en', 'fr'] }) });
  expect(await resolvePlaceNameCountry('user')).toEqual({ countryCode: 'CA', languages: ['en', 'fr'] });
  expect(mockLookup).not.toHaveBeenCalled();
});

it('falls back to English when neither current nor last country is known', async () => {
  expect(await resolvePlaceNameCountry('user')).toEqual({ countryCode: null, languages: [] });
});
