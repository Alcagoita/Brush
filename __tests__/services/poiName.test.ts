import { defaultPlaceNameChoice, displayPlaceName, parsePlaceNames, placeNameOptions, selectPoiName, setPlaceNameChoices } from '../../src/services/poiName';

afterEach(() => setPlaceNameChoices({}));

describe('place-name selection', () => {
  const names = { en: 'Jerónimos Monastery', pt: 'Mosteiro dos Jerónimos', fr: 'Monastère des Hiéronymites' };

  it('defaults to the local name for a known country regardless of app language', () => {
    expect(selectPoiName('Mosteiro dos Jerónimos', names, 'PT', {}, null, names.pt)).toBe('Mosteiro dos Jerónimos');
  });

  it('uses a saved country-specific source language without changing place identity', () => {
    expect(selectPoiName('Mosteiro dos Jerónimos', names, 'PT', { PT: 'en' })).toBe('Jerónimos Monastery');
    expect(selectPoiName('Mosteiro dos Jerónimos', names, 'PT', { PT: 'fr' })).toBe('Monastère des Hiéronymites');
    expect(selectPoiName('Mosteiro dos Jerónimos', names, 'ES', { PT: 'en' })).toBe('Mosteiro dos Jerónimos');
  });

  it('falls back to the source name when the chosen or native name is absent', () => {
    expect(selectPoiName('Original', { en: 'English' }, 'PT', { PT: 'fr' })).toBe('Original');
    expect(selectPoiName('Original', {}, 'PT', { PT: 'fr' }, 'Legacy English')).toBe('Original');
    expect(selectPoiName('Original', {}, 'PT', { PT: 'fr' })).toBe('Original');
    expect(selectPoiName('Original', { en: 'English' }, 'PT')).toBe('Original');
    expect(selectPoiName('Original', { en: 'English', fr: ' ' }, 'PT', { PT: 'fr' })).toBe('Original');
    expect(selectPoiName('Original', {}, 'PT', { PT: 'en' }, 'Legacy English')).toBe('Legacy English');
  });

  it('uses English with no known country and otherwise keeps the source name', () => {
    expect(selectPoiName('Original', names, null)).toBe('Jerónimos Monastery');
    expect(selectPoiName('Original', {}, null)).toBe('Original');
  });

  it('updates an already loaded place when the preference changes', () => {
    const place = { name: 'Mosteiro dos Jerónimos', nameLocal: names.pt, names, countryCode: 'PT' };
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

describe('KAN-474 — the source name is a choice of its own', () => {
  const PT = 'PT';

  it('offers the country name or the source name where there is one language', () => {
    expect(placeNameOptions(['pt'])).toEqual(['native', 'source']);
    expect(placeNameOptions([])).toEqual(['native', 'source']);
  });

  it('adds one choice per language where there are two, keeping the default offered', () => {
    expect(placeNameOptions(['en', 'fr'])).toEqual(['native', 'source', 'en', 'fr']);
  });

  it('always offers the default choice, or a user who has chosen nothing has none selected', () => {
    for (const languages of [[], ['pt'], ['en', 'fr'], ['en', 'fr', 'iu']]) {
      expect(placeNameOptions(languages)).toContain(defaultPlaceNameChoice());
    }
  });

  it('ignores duplicates and blanks in the configured list', () => {
    expect(placeNameOptions(['pt', 'pt', '  '])).toEqual(['native', 'source']);
  });

  it('returns the source name when that is the choice', () => {
    expect(selectPoiName('Jerónimos Monastery', {}, PT, { PT: 'source' }, null, 'Mosteiro dos Jerónimos'))
      .toBe('Jerónimos Monastery');
  });

  it('returns the native name by default, which is what production shows', () => {
    expect(selectPoiName('Jerónimos Monastery', {}, PT, {}, null, 'Mosteiro dos Jerónimos'))
      .toBe('Mosteiro dos Jerónimos');
  });

  it('reads the same under both choices when no native name was recorded', () => {
    const name = 'Praia de Machico';
    expect(selectPoiName(name, {}, PT, { PT: 'native' }, null, null)).toBe(name);
    expect(selectPoiName(name, {}, PT, { PT: 'source' }, null, null)).toBe(name);
  });

  it('asking for the language of the recorded native name gets it', () => {
    expect(selectPoiName('Jerónimos Monastery', {}, PT, { PT: 'pt' }, null, 'Mosteiro dos Jerónimos', 'pt'))
      .toBe('Mosteiro dos Jerónimos');
  });

  it('the default matches what is shown when nothing is chosen', () => {
    const shown = selectPoiName('Jerónimos Monastery', {}, PT, {}, null, 'Mosteiro dos Jerónimos');
    const chosen = selectPoiName('Jerónimos Monastery', {}, PT, { PT: defaultPlaceNameChoice() },
      null, 'Mosteiro dos Jerónimos');
    expect(chosen).toBe(shown);
  });

  it('asking for the other language of a two-language country reads its map', () => {
    const names = { fr: 'Rue Saint-Jean' };
    expect(selectPoiName('Saint John Street', names, 'CA', { CA: 'fr' }, null, 'Saint John Street', 'en'))
      .toBe('Rue Saint-Jean');
  });

  it('falls back to the source name when the chosen language has none recorded', () => {
    expect(selectPoiName('Saint John Street', {}, 'CA', { CA: 'fr' }, null, null, 'en'))
      .toBe('Saint John Street');
  });

  it('still has no country to resolve against offline with no country', () => {
    expect(selectPoiName('Jerónimos Monastery', {}, null, { PT: 'native' }, null, 'Mosteiro dos Jerónimos'))
      .toBe('Jerónimos Monastery');
  });
});
