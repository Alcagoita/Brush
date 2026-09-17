/**
 * KAN-451 — one place decides which namespace a place id belongs to.
 */
import { placeSourceRef, isFreelyStorable } from '../../src/services/placeIdentity';

describe('placeSourceRef', () => {
  it('an OSM tick is an OSM id whatever the row says', () => {
    expect(placeSourceRef('node/1', 'osm')).toEqual({ osm: 'node/1' });
    expect(placeSourceRef('node/1', 'osm', 'overture')).toEqual({ osm: 'node/1' });
  });

  it('a Cloudflare row goes under the table the Worker read it from', () => {
    expect(placeSourceRef('gers-1', 'cloudflare', 'overture')).toEqual({ overture: 'gers-1' });
    expect(placeSourceRef('community:1', 'cloudflare', 'community')).toEqual({ brush: 'community:1' });
    expect(placeSourceRef('manual:2', 'cloudflare', 'manual')).toEqual({ brush: 'manual:2' });
    expect(placeSourceRef('multibanco:3', 'cloudflare', 'multibanco')).toEqual({ brush: 'multibanco:3' });
    expect(placeSourceRef('4sq', 'cloudflare', 'legacy')).toEqual({ fsq: '4sq' });
    expect(placeSourceRef('node/7', 'cloudflare', 'openstreetmap')).toEqual({ osm: 'node/7' });
  });

  it('a Cloudflare row with no source is Overture — never Foursquare by default', () => {
    // Between KAN-438 and KAN-451 every API row was recorded as Foursquare.
    expect(placeSourceRef('gers-2', 'cloudflare')).toEqual({ overture: 'gers-2' });
  });

  it('sets exactly one namespace', () => {
    for (const ref of [
      placeSourceRef('a', 'osm'),
      placeSourceRef('b', 'cloudflare', 'overture'),
      placeSourceRef('c', 'cloudflare', 'legacy'),
      placeSourceRef('d', 'cloudflare', 'manual'),
    ]) {
      expect(Object.values(ref).filter(v => v != null)).toHaveLength(1);
    }
  });
});

describe('isFreelyStorable', () => {
  it('everything but Google may keep its coordinates', () => {
    expect(isFreelyStorable({ osm: 'x' })).toBe(true);
    expect(isFreelyStorable({ overture: 'x' })).toBe(true);
    expect(isFreelyStorable({ fsq: 'x' })).toBe(true);
    expect(isFreelyStorable({ brush: 'x' })).toBe(true);
    expect(isFreelyStorable({ google: 'x' })).toBe(false);
    expect(isFreelyStorable({})).toBe(false);
  });
});
