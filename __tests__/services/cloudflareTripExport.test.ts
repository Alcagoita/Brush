/**
 * KAN-451 — the trip download reads the Overture export, and still reads a
 * Foursquare one built before KAN-450 rather than failing the download.
 */
const mockExportProxy = jest.fn();
const mockWriteTripAreaPlaces = jest.fn();
const mockDeserialize = jest.fn();

jest.mock('../../src/services/cloudflarePoiFunctions', () => ({
  cloudflareExportProxy: (...args: unknown[]) => mockExportProxy(...args),
}));
jest.mock('../../src/services/habitatCache', () => ({
  writeTripAreaPlaces: (...args: unknown[]) => mockWriteTripAreaPlaces(...args),
}));
jest.mock('expo-sqlite', () => ({
  deserializeDatabaseAsync: (...args: unknown[]) => mockDeserialize(...args),
}));

import { importCloudflareTripExport, detectExportShape } from '../../src/services/cloudflareTripExport';

type Row = { id: string; name: string; lat: number; lng: number; poi_type: string; brand: string | null };

/** A fake export: the meta columns decide the shape, the rows come back for any bbox. */
function fakeExport(metaColumns: string[], source: string | null, rows: Row[]) {
  const queries: string[] = [];
  const database = {
    queries,
    getAllAsync: jest.fn(async (sql: string) => {
      queries.push(sql);
      if (sql.startsWith('PRAGMA table_info(_export_meta)')) return metaColumns.map(name => ({ name }));
      return rows.map(r => ({ source_id: r.id, name: r.name, lat: r.lat, lng: r.lng, poi_type: r.poi_type, brand: r.brand }));
    }),
    getFirstAsync: jest.fn(async () => (source == null ? null : { source })),
    closeAsync: jest.fn(async () => undefined),
  };
  return database;
}

const CENTER = { lat: 38.72, lng: -9.14 };
const OVERTURE_META = ['place_id', 'build_id', 'generated_at', 'pipeline_version', 'source', 'row_count'];
const FOURSQUARE_META = ['place_id', 'build_id', 'generated_at', 'pipeline_version', 'row_count'];

beforeEach(() => {
  jest.clearAllMocks();
  mockExportProxy.mockResolvedValue(new Uint8Array([1]));
  mockWriteTripAreaPlaces.mockImplementation((_area: string, _exp: number, places: unknown[]) => places.length);
});

describe('detectExportShape', () => {
  it('an export that names Overture is keyed on overture_id', async () => {
    const shape = await detectExportShape(fakeExport(OVERTURE_META, 'overture_places', []) as never);
    expect(shape.idColumn).toBe('overture_id');
    expect(shape.ref('g1')).toEqual({ overture: 'g1' });
  });

  it('an export with no source column is the Foursquare shape from before KAN-450', async () => {
    const shape = await detectExportShape(fakeExport(FOURSQUARE_META, null, []) as never);
    expect(shape.idColumn).toBe('fsq_place_id');
    expect(shape.ref('4sq')).toEqual({ fsq: '4sq' });
  });

  it('an unknown source is refused rather than guessed', async () => {
    await expect(detectExportShape(fakeExport(OVERTURE_META, 'something_new', []) as never))
      .rejects.toThrow('unknown source: something_new');
  });
});

describe('importCloudflareTripExport', () => {
  it('writes Overture rows within the radius as Overture-anchored trip places', async () => {
    const database = fakeExport(OVERTURE_META, 'overture_places', [
      { id: 'g1', name: 'Farmácia', lat: 38.7205, lng: -9.14, poi_type: 'pharmacy', brand: null },
      { id: 'g2', name: 'Far Away', lat: 39.5, lng: -9.14, poi_type: 'pharmacy', brand: null },
    ]);
    mockDeserialize.mockResolvedValue(database);

    const written = await importCloudflareTripExport('osm-relation-1', CENTER, 1000, 'trip-1', 123, ['pharmacy']);

    expect(written).toBe(1);
    expect(mockWriteTripAreaPlaces).toHaveBeenCalledWith('trip-1', 123, [
      { poiType: 'pharmacy', name: 'Farmácia', lat: 38.7205, lng: -9.14, brand: null, source: { overture: 'g1' } },
    ]);
    expect(database.queries.some(q => q.includes('p.overture_id AS source_id') && q.includes('pt.overture_id = p.overture_id'))).toBe(true);
    expect(database.closeAsync).toHaveBeenCalled();
  });

  it('still imports a Foursquare-shaped export, tagged as what it is', async () => {
    const database = fakeExport(FOURSQUARE_META, null, [
      { id: '4sq-1', name: 'Old Pharmacy', lat: 38.7205, lng: -9.14, poi_type: 'pharmacy', brand: 'Wells' },
    ]);
    mockDeserialize.mockResolvedValue(database);

    await importCloudflareTripExport('osm-relation-1', CENTER, 1000, 'trip-1', 123, ['pharmacy']);

    expect(mockWriteTripAreaPlaces).toHaveBeenCalledWith('trip-1', 123, [
      expect.objectContaining({ name: 'Old Pharmacy', brand: 'Wells', source: { fsq: '4sq-1' } }),
    ]);
    expect(database.queries.some(q => q.includes('p.fsq_place_id AS source_id'))).toBe(true);
  });

  it('an export with nothing in the area is an error the caller falls back on, and the db is closed', async () => {
    const database = fakeExport(OVERTURE_META, 'overture_places', []);
    mockDeserialize.mockResolvedValue(database);

    await expect(importCloudflareTripExport('osm-relation-1', CENTER, 1000, 'trip-1', 123, ['pharmacy']))
      .rejects.toThrow('no places');
    expect(mockWriteTripAreaPlaces).not.toHaveBeenCalled();
    expect(database.closeAsync).toHaveBeenCalled();
  });
});
