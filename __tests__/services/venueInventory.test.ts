/**
 * KAN-382 — a shopping centre's inventory, downloaded whole and searchable
 * offline.
 *
 * Real SQLite (node:sqlite) behind a thin expo-sqlite adapter, so the SQL the
 * store runs is the SQL being tested — including the transaction that keeps
 * a previous complete copy when a download fails.
 */
import { DatabaseSync } from 'node:sqlite';
import NetInfo from '@react-native-community/netinfo';

let mockSqlite: DatabaseSync;
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: () => ({
    execSync: (sql: string) => mockSqlite.exec(sql),
    runSync: (sql: string, params: unknown[] = []) => mockSqlite.prepare(sql).run(...(params as never[])),
    getAllSync: (sql: string, params: unknown[] = []) => mockSqlite.prepare(sql).all(...(params as never[])),
    getFirstSync: (sql: string, params: unknown[] = []) => mockSqlite.prepare(sql).get(...(params as never[])) ?? null,
    withTransactionSync: (task: () => void) => {
      mockSqlite.exec('BEGIN');
      try { task(); mockSqlite.exec('COMMIT'); } catch (error) { mockSqlite.exec('ROLLBACK'); throw error; }
    },
  }),
}));

let mockWifiOnly = false;
jest.mock('../../src/services/habitatCache', () => ({
  HABITAT_RADIUS_M: 5_000,
  getWifiOnlyDownloads: () => mockWifiOnly,
}));

const mockPoiApiGet = jest.fn();
jest.mock('../../src/services/poiApi', () => {
  class PoiApiError extends Error {
    readonly status: number;
    constructor(code: number, message: string) { super(message); this.status = code; }
  }
  return { poiApiGet: (path: string) => mockPoiApiGet(path), PoiApiError };
});

import {
  __resetVenueInventoryForTests, getVenueInventory, refreshVenueInventoriesIfDue, searchVenueUnits,
  VENUE_RECHECK_MS, type Venue, type VenueUnitWire,
} from '../../src/services/venueInventory';
import { PoiApiError } from '../../src/services/poiApi';

const ALMA: Venue = {
  id: 'alma-shopping', name: 'Alma Shopping', osm: 'way/174739239', centroid: [40.2044, -8.4077],
  rings: [[[40.2040, -8.4080], [40.2050, -8.4080], [40.2050, -8.4070], [40.2040, -8.4070], [40.2040, -8.4080]]],
};
const FORUM: Venue = { ...ALMA, id: 'forum-coimbra', name: 'Forum Coimbra', centroid: [40.2118, -8.4437] };
const FAR: Venue = { ...ALMA, id: 'norteshopping', name: 'NorteShopping', centroid: [41.1806, -8.6560] };
const NEAR_ALMA = { lat: 40.2050, lng: -8.4080 };
const T0 = 1_800_000_000_000;

function unit(key: string, name: string, overrides: Partial<VenueUnitWire> = {}): VenueUnitWire {
  return {
    key, poi_id: key.split(':').slice(1).join(':'), source: 'community', name, name_local: name,
    name_local_lang: null, names: {}, country_code: 'PT', lat: 40.2045, lng: -8.4075,
    primary_poi_type: 'store', types: ['store'], brand: null, address: null, floor: null,
    open_min: null, close_min: null, attributes: {}, ...overrides,
  };
}

/** A fake server: `units` per venue, paged like the Worker, with a version per venue. */
function serve(inventories: Record<string, { version: string; units: VenueUnitWire[] }>, venues: Venue[] = [ALMA, FORUM, FAR]) {
  mockPoiApiGet.mockImplementation(async (path: string) => {
    if (path === '/venues') { return { venues }; }
    const match = /^\/venues\/([^/]+)\/units\?limit=(\d+)(?:&cursor=(.+))?$/.exec(path);
    if (!match) { throw new Error(`unexpected path ${path}`); }
    const inventory = inventories[match[1]];
    if (!inventory) { throw new PoiApiError(404, 'unknown venue'); }
    const limit = Number(match[2]);
    const cursor = match[3] ? decodeURIComponent(match[3]) : null;
    const sorted = [...inventory.units].sort((a, b) => (a.key < b.key ? -1 : 1));
    const from = cursor ? sorted.findIndex(u => u.key > cursor) : 0;
    const page = sorted.slice(from, from + limit);
    const more = from + page.length < sorted.length;
    return {
      venue: { id: match[1], name: match[1] }, version: inventory.version, total: sorted.length,
      units: page, nextCursor: more ? page[page.length - 1].key : null,
    };
  });
}

function unitPaths(): string[] {
  return mockPoiApiGet.mock.calls.map(([path]) => path as string).filter(path => path.includes('/units'));
}

beforeEach(() => {
  mockSqlite = new DatabaseSync(':memory:');
  __resetVenueInventoryForTests();
  mockPoiApiGet.mockReset();
  mockWifiOnly = false;
  jest.spyOn(NetInfo, 'fetch').mockResolvedValue({ isConnected: true, type: 'wifi' } as never);
});

describe('download', () => {
  it('downloads every centre near the user, all pages, and stores it complete', async () => {
    const units = Array.from({ length: 450 }, (_, i) =>
      unit(`community:mall:alma:shop-${String(i).padStart(3, '0')}`, `Shop ${i}`, { floor: String(i % 3) }));
    serve({ 'alma-shopping': { version: 'v1', units }, 'forum-coimbra': { version: 'f1', units: [unit('community:f:1', 'Zara')] } });

    await refreshVenueInventoriesIfDue(NEAR_ALMA.lat, NEAR_ALMA.lng, T0);

    expect(getVenueInventory('alma-shopping')).toMatchObject({ complete: true, version: 'v1', unitCount: 450, rings: ALMA.rings });
    expect(unitPaths().filter(path => path.startsWith('/venues/alma-shopping'))).toHaveLength(3);
    // Forum Coimbra is ~3 km away: prefetched too, so a first visit there works offline.
    expect(getVenueInventory('forum-coimbra')?.complete).toBe(true);
    // NorteShopping is 110 km away.
    expect(getVenueInventory('norteshopping')).toBeNull();
    expect(unitPaths().some(path => path.startsWith('/venues/norteshopping'))).toBe(false);
  });

  it('keeps the previous complete copy when a later download fails part-way', async () => {
    serve({ 'alma-shopping': { version: 'v1', units: [unit('community:a:zara', 'Zara', { floor: '1' })] } }, [ALMA]);
    await refreshVenueInventoriesIfDue(NEAR_ALMA.lat, NEAR_ALMA.lng, T0);

    const many = Array.from({ length: 300 }, (_, i) => unit(`community:a:s${String(i).padStart(3, '0')}`, `S${i}`));
    serve({ 'alma-shopping': { version: 'v2', units: many } }, [ALMA]);
    const real = mockPoiApiGet.getMockImplementation()!;
    mockPoiApiGet.mockImplementation(async (path: string) => {
      if (path.includes('cursor=')) { throw new Error('network dropped'); }
      return real(path);
    });

    await refreshVenueInventoriesIfDue(NEAR_ALMA.lat, NEAR_ALMA.lng, T0 + VENUE_RECHECK_MS + 1);

    expect(getVenueInventory('alma-shopping')).toMatchObject({ complete: true, version: 'v1', unitCount: 1 });
    expect(searchVenueUnits('alma-shopping', { poiType: 'store' }).map(u => u.name)).toEqual(['Zara']);
  });

  it('starts over when the centre changes between pages, and writes one consistent state', async () => {
    const units = Array.from({ length: 250 }, (_, i) => unit(`community:a:s${String(i).padStart(3, '0')}`, `S${i}`));
    serve({ 'alma-shopping': { version: 'v1', units } }, [ALMA]);
    const real = mockPoiApiGet.getMockImplementation()!;
    let calls = 0;
    mockPoiApiGet.mockImplementation(async (path: string) => {
      const response = await real(path);
      if (path.includes('/units') && ++calls === 2) { return { ...response, version: 'v2-mid-download' }; }
      return response;
    });

    await refreshVenueInventoriesIfDue(NEAR_ALMA.lat, NEAR_ALMA.lng, T0);

    expect(getVenueInventory('alma-shopping')).toMatchObject({ complete: true, version: 'v1', unitCount: 250 });
  });

  it('re-checks a complete copy at most once a day, and downloads again only on a new version', async () => {
    serve({ 'alma-shopping': { version: 'v1', units: [unit('community:a:zara', 'Zara')] } }, [ALMA]);
    await refreshVenueInventoriesIfDue(NEAR_ALMA.lat, NEAR_ALMA.lng, T0);
    mockPoiApiGet.mockClear();

    await refreshVenueInventoriesIfDue(NEAR_ALMA.lat, NEAR_ALMA.lng, T0 + 60_000);
    expect(unitPaths()).toEqual([]);

    await refreshVenueInventoriesIfDue(NEAR_ALMA.lat, NEAR_ALMA.lng, T0 + VENUE_RECHECK_MS + 1);
    expect(unitPaths()).toEqual(['/venues/alma-shopping/units?limit=1']);

    serve({ 'alma-shopping': { version: 'v2', units: [unit('community:a:zara', 'Zara'), unit('community:a:fnac', 'FNAC')] } }, [ALMA]);
    mockPoiApiGet.mockClear();
    await refreshVenueInventoriesIfDue(NEAR_ALMA.lat, NEAR_ALMA.lng, T0 + 2 * VENUE_RECHECK_MS + 2);
    expect(getVenueInventory('alma-shopping')).toMatchObject({ version: 'v2', unitCount: 2 });
  });

  it('waits for Wi-Fi when the user asked for it, and does nothing offline', async () => {
    serve({ 'alma-shopping': { version: 'v1', units: [unit('community:a:zara', 'Zara')] } }, [ALMA]);
    mockWifiOnly = true;
    jest.spyOn(NetInfo, 'fetch').mockResolvedValue({ isConnected: true, type: 'cellular' } as never);
    await refreshVenueInventoriesIfDue(NEAR_ALMA.lat, NEAR_ALMA.lng, T0);
    jest.spyOn(NetInfo, 'fetch').mockResolvedValue({ isConnected: false, type: 'none' } as never);
    mockWifiOnly = false;
    await refreshVenueInventoriesIfDue(NEAR_ALMA.lat, NEAR_ALMA.lng, T0);

    expect(mockPoiApiGet).not.toHaveBeenCalled();
    expect(getVenueInventory('alma-shopping')).toBeNull();
  });

  it('stops every remaining centre on HTTP 429', async () => {
    serve({ 'alma-shopping': { version: 'v1', units: [] }, 'forum-coimbra': { version: 'f1', units: [unit('community:f:1', 'Zara')] } });
    const real = mockPoiApiGet.getMockImplementation()!;
    mockPoiApiGet.mockImplementation(async (path: string) => {
      if (path.startsWith('/venues/alma-shopping')) { throw new PoiApiError(429, 'slow down'); }
      return real(path);
    });

    await refreshVenueInventoriesIfDue(NEAR_ALMA.lat, NEAR_ALMA.lng, T0);

    expect(unitPaths().some(path => path.startsWith('/venues/forum-coimbra'))).toBe(false);
  });

  it('joins a refresh already running instead of downloading twice', async () => {
    serve({ 'alma-shopping': { version: 'v1', units: [unit('community:a:zara', 'Zara')] } }, [ALMA]);

    await Promise.all([
      refreshVenueInventoriesIfDue(NEAR_ALMA.lat, NEAR_ALMA.lng, T0),
      refreshVenueInventoriesIfDue(NEAR_ALMA.lat, NEAR_ALMA.lng, T0),
    ]);

    expect(unitPaths()).toEqual(['/venues/alma-shopping/units?limit=200']);
  });
});

describe('offline lookup', () => {
  beforeEach(async () => {
    serve({
      'alma-shopping': {
        version: 'v1',
        units: [
          unit('community:a:zara', 'Zara', { floor: '1', brand: 'Zara', attributes: { store_kind: ['clothing'] } }),
          unit('community:a:zara-2', 'Zara Home', { floor: '-1', brand: 'Zara Home', attributes: { store_kind: ['home'] } }),
          unit('overture:ov-fnac', 'FNAC', { source: 'overture', floor: null, attributes: { store_kind: ['electronics'] } }),
          unit('community:a:pans', 'Café Pans', { primary_poi_type: 'bakery', types: ['bakery', 'cafe'], floor: '0' }),
        ],
      },
    }, [ALMA]);
    await refreshVenueInventoriesIfDue(NEAR_ALMA.lat, NEAR_ALMA.lng, T0);
  });

  it('answers by type, lowest floor first, units with no floor last', () => {
    expect(searchVenueUnits('alma-shopping', { poiType: 'store' }).map(u => [u.name, u.floor]))
      .toEqual([['Zara Home', '-1'], ['Zara', '1'], ['FNAC', null]]);
  });

  it('answers by subtype and by brand', () => {
    expect(searchVenueUnits('alma-shopping', { poiType: 'store', attribute: { dimension: 'store_kind', value: 'electronics' } })
      .map(u => u.name)).toEqual(['FNAC']);
    expect(searchVenueUnits('alma-shopping', { poiType: 'store', brand: 'Zara' }).map(u => u.name)).toEqual(['Zara']);
  });

  it('finds a unit under each type it answers', () => {
    expect(searchVenueUnits('alma-shopping', { poiType: 'cafe' }).map(u => [u.name, u.primaryPoiType, u.floor]))
      .toEqual([['Café Pans', 'bakery', '0']]);
  });

  it('answers nothing for a centre it holds no complete copy of', () => {
    expect(searchVenueUnits('norteshopping', { poiType: 'store' })).toEqual([]);
    mockSqlite.prepare("UPDATE venue SET complete = 0 WHERE venue_id = 'alma-shopping'").run();
    expect(searchVenueUnits('alma-shopping', { poiType: 'store' })).toEqual([]);
  });
});
