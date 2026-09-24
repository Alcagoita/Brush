jest.mock('../../src/services/deviceLocale', () => ({ rawDeviceLocale: () => 'pt-PT' }));

import { selectPoiName } from '../../src/services/poiName';

describe('selectPoiName', () => {
  it('uses the country-local name for its matching device language', () => {
    expect(selectPoiName('Original', 'Livraria', 'Bookshop', 'pt', 'pt-PT')).toBe('Livraria');
  });

  it('uses source-supplied English for an English device', () => {
    expect(selectPoiName('Livraria', 'Livraria', 'Bookshop', 'pt', 'en-US')).toBe('Bookshop');
  });

  it('keeps the original when no matching source-supplied name exists', () => {
    expect(selectPoiName('Livraria', null, null, null, 'en-US')).toBe('Livraria');
  });

  it('does not treat an untagged local name as matching the device language', () => {
    expect(selectPoiName('Original', 'Livraria', null, null, 'pt-PT')).toBe('Original');
  });
});
