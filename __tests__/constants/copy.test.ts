import { COPY, setCopyLanguage } from '../../src/constants/copy';

describe('COPY — pt-PT localized count strings', () => {
  beforeEach(() => {
    setCopyLanguage('pt-PT');
  });

  afterEach(() => {
    setCopyLanguage('en');
  });

  it('uses singular and plural forms for Today and Nearby labels', () => {
    expect(COPY.today.leftCount(1)).toBe('Falta 1');
    expect(COPY.today.leftCount(4)).toBe('Faltam 4');
    expect(COPY.today.nearbyCount(1)).toBe('1 local');
    expect(COPY.today.nearbyCount(3)).toBe('3 locais');
    expect(COPY.nearbyCard.headerLabel).toBe('Na proximidade');
    expect(COPY.nearbyCard.placesCount(1)).toBe('1 local');
    expect(COPY.nearbyCard.placesCount(2)).toBe('2 locais');
  });
});
