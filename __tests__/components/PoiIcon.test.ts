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

  it('maps common API families with suffix rules', () => {
    expect(resolvePoiIconType('portuguese_restaurant')).toBe('restaurant');
    expect(resolvePoiIconType('candy_store')).toBe('store');
    expect(resolvePoiIconType('dog_park')).toBe('park');
    expect(resolvePoiIconType('bus_stop')).toBe('bus');
    expect(resolvePoiIconType('general_hospital')).toBe('clinic');
    expect(resolvePoiIconType('hair_salon')).toBe('salon');
    expect(resolvePoiIconType('church')).toBe('library');
    expect(resolvePoiIconType('parking_garage')).toBe('gas');
  });
});
