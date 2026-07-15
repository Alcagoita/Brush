import { resolvePoiIconType } from '../../src/components/AppIcon/poi';

describe('resolvePoiIconType', () => {
  it('maps police to the official building icon family', () => {
    expect(resolvePoiIconType('police')).toBe('bank');
    expect(resolvePoiIconType('neighborhood_police_station')).toBe('bank');
  });

  it('keeps existing built-in poi keys unchanged', () => {
    expect(resolvePoiIconType('atm')).toBe('atm');
    expect(resolvePoiIconType('supermarket')).toBe('supermarket');
  });
});
