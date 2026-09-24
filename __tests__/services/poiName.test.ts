import { displayPlaceName, parsePlaceNames, selectPoiName, setPlaceNameChoices } from '../../src/services/poiName';

afterEach(() => setPlaceNameChoices({}));

describe('place-name selection', () => {
  const names = { en: 'Jerónimos Monastery', pt: 'Mosteiro dos Jerónimos', fr: 'Monastère des Hiéronymites' };

  it('defaults to the source name for a known country regardless of app language', () => {
    expect(selectPoiName('Mosteiro dos Jerónimos', names, 'PT')).toBe('Mosteiro dos Jerónimos');
  });

  it('uses a saved country-specific source language without changing place identity', () => {
    expect(selectPoiName('Mosteiro dos Jerónimos', names, 'PT', { PT: 'en' })).toBe('Jerónimos Monastery');
    expect(selectPoiName('Mosteiro dos Jerónimos', names, 'PT', { PT: 'fr' })).toBe('Monastère des Hiéronymites');
    expect(selectPoiName('Mosteiro dos Jerónimos', names, 'ES', { PT: 'en' })).toBe('Mosteiro dos Jerónimos');
  });

  it('falls back to the source name when a selected translation is absent', () => {
    expect(selectPoiName('Original', { en: 'English' }, 'PT', { PT: 'fr' })).toBe('Original');
  });

  it('uses English with no known country and otherwise keeps the source name', () => {
    expect(selectPoiName('Original', names, null)).toBe('Jerónimos Monastery');
    expect(selectPoiName('Original', {}, null)).toBe('Original');
  });

  it('updates an already loaded place when the preference changes', () => {
    const place = { name: 'Mosteiro dos Jerónimos', names, countryCode: 'PT' };
    setPlaceNameChoices({ PT: 'en' });
    expect(displayPlaceName(place)).toBe('Jerónimos Monastery');
    setPlaceNameChoices({ PT: 'native' });
    expect(displayPlaceName(place)).toBe('Mosteiro dos Jerónimos');
  });

  it('keeps only valid source-provided language names', () => {
    expect(parsePlaceNames('{"en":"English","pt":"Português","bad key":"Wrong","fr":""}'))
      .toEqual({ en: 'English', pt: 'Português' });
  });
});
