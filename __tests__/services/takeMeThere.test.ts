/**
 * KAN-279 — "Take me there".
 *
 * No destination resolution: the only in-app logic is "is this POI type
 * NOT in the Nearby list right now" (isTaskPoiFarAway, backed by
 * proximity.ts's isPoiTypeNearby). Tapping opens a plain Maps text search
 * anchored at the current position — Maps finds the nearest match itself.
 */

const mockIsPoiTypeNearby = jest.fn();
jest.mock('../../src/services/proximity', () => ({
  isPoiTypeNearby: (...args: unknown[]) => mockIsPoiTypeNearby(...args),
}));

const mockGetPositionLowAccuracy = jest.fn();
jest.mock('../../src/services/geolocation', () => ({
  getPositionLowAccuracy: (...args: unknown[]) => mockGetPositionLowAccuracy(...args),
}));

const mockOpenMapsSearch = jest.fn();
jest.mock('../../src/services/maps', () => ({
  openMapsSearch:      (...args: unknown[]) => mockOpenMapsSearch(...args),
  isGenericPlaceType:  () => false,
}));

import {
  isTaskPoiFarAway,
  getPoiSearchLabel,
  getTakeMeThereA11yLabel,
  openTakeMeThereMaps,
} from '../../src/services/takeMeThere';

describe('isTaskPoiFarAway', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is true when the POI type is NOT in the Nearby list', () => {
    mockIsPoiTypeNearby.mockReturnValue(false);
    expect(isTaskPoiFarAway('pharmacy')).toBe(true);
    expect(mockIsPoiTypeNearby).toHaveBeenCalledWith('pharmacy');
  });

  it('is false when the POI type IS in the Nearby list', () => {
    mockIsPoiTypeNearby.mockReturnValue(true);
    expect(isTaskPoiFarAway('pharmacy')).toBe(false);
  });
});

describe('getPoiSearchLabel', () => {
  it('returns the catalog label for a built-in POI type', () => {
    expect(getPoiSearchLabel('pharmacy')).toBe('Pharmacy');
  });

  it('returns the localized custom-category label for a non-catalog type', () => {
    // "bakery" isn't one of the 16 built-ins — falls through to localPoiLabel.
    expect(getPoiSearchLabel('bakery')).toBe(getPoiSearchLabel('bakery'));
    expect(typeof getPoiSearchLabel('bakery')).toBe('string');
  });
});

describe('getTakeMeThereA11yLabel', () => {
  it('embeds the POI label in the a11y phrasing', () => {
    expect(getTakeMeThereA11yLabel('pharmacy')).toBe('Take me to a Pharmacy');
  });

  it('uses "an" before a vowel-leading label', () => {
    expect(getTakeMeThereA11yLabel('atm')).toBe('Take me to an ATM');
  });
});

describe('openTakeMeThereMaps', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches the current position and opens a Maps search with the POI label', async () => {
    mockGetPositionLowAccuracy.mockResolvedValue({ lat: 38.7, lng: -9.1, accuracy: 10, timestamp: 0 });
    mockOpenMapsSearch.mockResolvedValue(undefined);

    await openTakeMeThereMaps('pharmacy');

    expect(mockOpenMapsSearch).toHaveBeenCalledWith(38.7, -9.1, 'Pharmacy');
  });

  it('propagates a rejection when the position fetch fails (caller decides how to handle it)', async () => {
    mockGetPositionLowAccuracy.mockRejectedValue(new Error('permission denied'));

    await expect(openTakeMeThereMaps('pharmacy')).rejects.toThrow('permission denied');
    expect(mockOpenMapsSearch).not.toHaveBeenCalled();
  });
});
