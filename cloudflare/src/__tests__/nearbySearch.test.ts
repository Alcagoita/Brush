import { describe, it, expect, vi } from 'vitest';

// index.ts imports getContainer/Container at module load (KAN-354) — mock so
// importing the handler doesn't need a Container runtime.
vi.mock('@cloudflare/containers', () => ({
  getContainer: () => ({ start: vi.fn() }),
  Container: class {},
}));

import worker, { type Env } from '../index';

/**
 * KAN-344 end-to-end (Worker layer): a structured POST /poi/nearby request
 * with a group cuisine (pizza/asian) must return only that group's matches,
 * while a generic restaurant request returns the broad bucket. Hand-rolled
 * fake D1 answers exactly the queries queryNearbyPoiDb issues (type_relation +
 * one SELECT per source) — brittle to a query-text change by design, the
 * tradeoff for exercising the real handler without SQLite.
 *
 * KAN-438 moved the base source from Foursquare to Overture. KAN-442 keeps
 * retained OSM rows out of nearby results while they are reviewed offline;
 * curated mall tenants remain available through the community source.
 */
interface FakePoi {
  overture_id: string;
  name: string;
  name_local?: string | null;
  name_en?: string | null;
  name_local_lang?: string | null;
  names_json?: string | null;
  country_code?: string | null;
  food_cuisine?: string[];
  financial_service_kind?: string[];
  primary_poi_type?: string;
  brand?: string | null;
  floor?: string | null;
  open_min?: number | null;
  close_min?: number | null;
}

interface FakeCuratedPoi {
  poi_id: string;
  name: string;
  name_local?: string | null;
  name_en?: string | null;
  name_local_lang?: string | null;
  primary_poi_type: string;
  food_cuisine?: string[];
}

interface FakeMultibancoPoi {
  source_id: string;
  name: string;
  primary_poi_type: string;
  is_demo_zone?: number;
}

interface FakeSourceCorrection {
  source: 'overture' | 'openstreetmap';
  source_id: string;
  visible: number;
  name_override?: string | null;
  dedupe_name_override?: string | null;
}

const LAT = 38.72;
const LNG = -9.14;

function fakeDb(
  pois: FakePoi[], curatedPois: FakeCuratedPoi[] = [],
  sourceCorrections: FakeSourceCorrection[] = [], multibancoPois: FakeMultibancoPoi[] = [],
): Env['REGISTRY_DB'] {
  const prepare = (sql: string) => {
    const trimmed = sql.trim();
    queriedSql.push(trimmed);
    const stmt = {
      bind: (..._args: unknown[]) => stmt,
      async all() {
        if (trimmed.startsWith('SELECT search_type, include_type FROM type_relation')) {
          return { results: [] };
        }
        // KAN-377 — /poi/nearby resolves the settlement alongside the POI
        // query so the client can name the area offline. These fixtures are
        // about POI matching, so no place row: placeName comes back null.
        if (trimmed.startsWith('SELECT * FROM place WHERE min_lat IS NOT NULL')) {
          return { results: [] };
        }
        if (trimmed.startsWith('SELECT overture_poi.overture_id')) {
          const results: unknown[] = [];
          for (const p of pois) {
            const correction = sourceCorrections.find(candidate => candidate.source === 'overture' && candidate.source_id === p.overture_id);
            const base = {
              overture_id: p.overture_id, dedupe_name: p.name.toLowerCase(), name: p.name,
              name_local: p.name_local ?? null, name_en: p.name_en ?? null,
              name_local_lang: p.name_local_lang ?? null, names_json: p.names_json ?? null,
              country_code: p.country_code ?? null, lat: LAT, lng: LNG,
              primary_poi_type: p.primary_poi_type ?? 'restaurant', brand: p.brand ?? null,
              address: null, floor: p.floor ?? null, open_min: p.open_min ?? null, close_min: p.close_min ?? null,
              matched_type: p.primary_poi_type ?? 'restaurant',
              correction_visible: correction?.visible ?? null,
              correction_name_override: correction?.name_override ?? null,
              correction_dedupe_name_override: correction?.dedupe_name_override ?? null,
            };
            const attributes = [
              ...(p.food_cuisine ?? []).map(value => ({ dimension: 'food_cuisine', value })),
              ...(p.financial_service_kind ?? []).map(value => ({ dimension: 'financial_service_kind', value })),
            ];
            if (attributes.length === 0) {
              results.push({ ...base, attribute_dimension: null, attribute_value: null });
            } else {
              for (const attribute of attributes) {
                results.push({ ...base, attribute_dimension: attribute.dimension, attribute_value: attribute.value });
              }
            }
          }
          return { results };
        }
        if (trimmed.startsWith('SELECT curated_poi.poi_id')) {
          const results: unknown[] = [];
          for (const p of curatedPois) {
            const base = {
              poi_id: p.poi_id, dedupe_name: p.name.toLowerCase(), name: p.name,
              name_local: p.name_local ?? null, name_en: p.name_en ?? null,
              name_local_lang: p.name_local_lang ?? null, lat: LAT, lng: LNG,
              primary_poi_type: p.primary_poi_type, address: null, floor: null,
            };
            const cuisines = p.food_cuisine ?? [];
            if (cuisines.length === 0) {
              results.push({ ...base, attribute_dimension: null, attribute_value: null });
            } else {
              for (const value of cuisines) {
                results.push({ ...base, attribute_dimension: 'food_cuisine', attribute_value: value });
              }
            }
          }
          return { results };
        }
        if (trimmed.startsWith('SELECT source_id, dedupe_name, name, lat, lng, primary_poi_type, address, is_demo_zone')) {
          return { results: multibancoPois.map(p => ({
            ...p, dedupe_name: p.name.toLowerCase(), lat: LAT, lng: LNG, address: 'Odivelas', is_demo_zone: p.is_demo_zone ?? 0,
          })) };
        }
        // KAN-454: nearby reads Overture, curated and MULTIBANCO only. A
        // query against legacy_poi or osm_poi is a regression, not a fixture.
        throw new Error(`fake D1 unhandled all(): ${trimmed}`);
      },
    };
    return stmt;
  };
  return { prepare } as unknown as Env['REGISTRY_DB'];
}

const POIS: FakePoi[] = [
  // Every cuisine is a classified value now. Overture's categories map onto
  // the app's 87 cuisines one-to-one, so there is no label path to fall back
  // to and none is needed.
  { overture_id: 'pz', name: 'Tutto Pizza', food_cuisine: ['pizza'] },
  { overture_id: 'su', name: 'Aron Sushi', food_cuisine: ['sushi'] },
  { overture_id: 'pt', name: 'Portugália', food_cuisine: ['portuguese'] },
];

function nearbyRequest(requests: unknown[]) {
  return new Request('https://poi-api.test/poi/nearby', {
    method: 'POST',
    headers: { 'X-Api-Key': 'test-key', 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: LAT, lng: LNG, radius: 1000, requests, limitPerRequest: 20 }),
  });
}

function env(
  pois: FakePoi[] = POIS, curatedPois: FakeCuratedPoi[] = [],
  sourceCorrections: FakeSourceCorrection[] = [], multibancoPois: FakeMultibancoPoi[] = [],
): Env {
  return { API_KEY: 'test-key', REGISTRY_DB: fakeDb(pois, curatedPois, sourceCorrections, multibancoPois) } as unknown as Env;
}

/** Every statement the fake D1 was asked to prepare, for the KAN-454 check below. */
const queriedSql: string[] = [];

const CTX = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;

const names = (bucket: Array<{ name: string }> | undefined) => (bucket ?? []).map(p => p.name).sort();

describe('POST /poi/nearby — KAN-344 cuisine groups end-to-end', () => {
  it('serves source-supplied language variants without changing the legacy name', async () => {
    const res = await worker.fetch(nearbyRequest([{ key: 'store', type: 'store' }]), env([
      { overture_id: 'bookshop', name: 'Livraria', name_local: 'Livraria', name_en: 'Bookshop',
        name_local_lang: 'pt', names_json: '{"pt":"Livraria","en":"Bookshop"}', country_code: 'PT', primary_poi_type: 'store' },
    ]), CTX);
    const body = await res.json() as { results: Record<string, Array<Record<string, unknown>>> };
    expect(body.results.store).toEqual([expect.objectContaining({
      name: 'Livraria', name_local: 'Livraria', name_en: 'Bookshop', name_local_lang: 'pt',
      names: { pt: 'Livraria', en: 'Bookshop' }, country_code: 'PT',
    })]);
  });

  it('returns English for a missing local name and never returns an empty display fallback', async () => {
    const res = await worker.fetch(nearbyRequest([{ key: 'store', type: 'store' }]), env([
      { overture_id: 'english-fallback', name: 'Source', name_en: 'English', country_code: 'PT', primary_poi_type: 'store' },
      { overture_id: 'source-fallback', name: 'Only source', country_code: 'PT', primary_poi_type: 'store' },
      { overture_id: 'blank-local', name: 'Another source', name_local: ' ', name_en: 'Another English', country_code: 'PT', primary_poi_type: 'store' },
    ]), CTX);
    const body = await res.json() as { results: Record<string, Array<Record<string, unknown>>> };
    expect(body.results.store).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Source', name_local: 'English', name_en: 'English' }),
      expect.objectContaining({ name: 'Only source', name_local: 'Only source', name_en: 'Only source' }),
      expect.objectContaining({ name: 'Another source', name_local: 'Another English', name_en: 'Another English' }),
    ]));
  });

  it('suppresses cross-source duplicates when their source-supplied aliases match', async () => {
    const res = await worker.fetch(nearbyRequest([{ key: 'store', type: 'store' }]), env([
      { overture_id: 'bookshop', name: 'Bookshop', name_local: 'Livraria',
        name_en: 'Bookshop', name_local_lang: 'pt', primary_poi_type: 'store' },
    ], [
      { poi_id: 'curated-bookshop', name: 'Livraria', primary_poi_type: 'store' },
    ]), CTX);
    const body = await res.json() as { results: Record<string, Array<{ poi_id: string }>> };
    expect(body.results.store.map(place => place.poi_id)).toEqual(['curated-bookshop']);
  });

  it('uses the official MULTIBANCO ATM and suppresses the matching Odivelas source row', async () => {
    const res = await worker.fetch(nearbyRequest([{ key: 'atm', type: 'atm' }]), env([
      { overture_id: 'stale-atm', name: 'ATM', primary_poi_type: 'atm' },
    ], [], [], [
      { source_id: 'multibanco:odivelas', name: 'MULTIBANCO', primary_poi_type: 'atm', is_demo_zone: 1 },
    ]), CTX);
    expect(res.status).toBe(200);
    const body = await res.json() as { results: Record<string, Array<{ poi_id: string; source: string }>> };
    expect(body.results.atm).toEqual([
      expect.objectContaining({ poi_id: 'multibanco:odivelas', source: 'multibanco' }),
    ]);
  });

  it('does not suppress a non-demo-zone ATM source', async () => {
    const res = await worker.fetch(nearbyRequest([{ key: 'atm', type: 'atm' }]), env([
      { overture_id: 'existing-atm', name: 'ATM', primary_poi_type: 'atm' },
    ], [], [], [
      { source_id: 'multibanco:outside', name: 'MULTIBANCO', primary_poi_type: 'atm' },
    ]), CTX);
    const body = await res.json() as { results: Record<string, Array<{ source: string }>> };
    expect(body.results.atm.map(p => p.source).sort()).toEqual(['multibanco', 'overture']);
  });

  it('never queries osm_poi or legacy_poi (KAN-442, KAN-454): the served set is Overture, curated, MULTIBANCO', async () => {
    queriedSql.length = 0;
    const res = await worker.fetch(nearbyRequest([
      { key: 'restaurant', type: 'restaurant' },
    ]), env([{ overture_id: 'ovt-santo-amaro', name: 'Santo Amaro' }]), CTX);
    expect(res.status).toBe(200);
    // The fake D1 throws on any unhandled statement, so a reintroduced read
    // of either table fails this request outright; the assertion below is
    // the explicit form of the same guarantee.
    expect(queriedSql.filter(sql => /\b(osm_poi|legacy_poi)\b/.test(sql))).toEqual([]);
    const body = await res.json() as { results: Record<string, Array<{ poi_id: string; source: string }>> };
    expect(body.results.restaurant).toEqual([expect.objectContaining({ poi_id: 'ovt-santo-amaro', source: 'overture' })]);
  });

  it('a curated row outranks both, because a mall operator is the authority', async () => {
    const res = await worker.fetch(nearbyRequest([
      { key: 'restaurant', type: 'restaurant' },
    ]), env([
      { overture_id: 'ovt-h3', name: 'H3' },
    ], [
      { poi_id: 'mall:way-1', name: 'H3', primary_poi_type: 'restaurant' },
    ], [
      { osm_element_id: 'node/9', name: 'H3', primary_poi_type: 'restaurant' },
    ]), CTX);
    const body = await res.json() as { results: Record<string, Array<{ poi_id: string; source: string }>> };
    expect(body.results.restaurant).toEqual([
      expect.objectContaining({ poi_id: 'mall:way-1', source: 'community' }),
    ]);
  });

  it('a hidden Overture row is not served, and nothing steps in for it', async () => {
    // KAN-392 hid the stale row; KAN-442/454 mean no OSM replacement can
    // surface in its place — the only sources are the three read above.
    const res = await worker.fetch(nearbyRequest([
      { key: 'restaurant', type: 'restaurant' },
    ]), env([
      { overture_id: 'stale-lagar', name: 'Lagar Restaurante' },
    ], [], [
      { source: 'overture', source_id: 'stale-lagar', visible: 0 },
    ]), CTX);
    expect(res.status).toBe(200);
    const body = await res.json() as { results: Record<string, Array<{ name: string; source: string }>> };
    expect(body.results.restaurant).toEqual([]);
  });

  it('returns only pizza matches for a pizza subtype request, all for the broad bucket', async () => {
    const res = await worker.fetch(nearbyRequest([
      { key: 'restaurant', type: 'restaurant' },
      { key: 'restaurant:food_cuisine:pizza', type: 'restaurant', attribute: { dimension: 'food_cuisine', values: ['pizza'] } },
    ]), env(), CTX);
    expect(res.status).toBe(200);
    const body = await res.json() as { results: Record<string, Array<{ name: string }>> };
    expect(names(body.results.restaurant)).toEqual(['Aron Sushi', 'Portugália', 'Tutto Pizza']);
    // Pizza is its own cuisine and does not drag in Italian: the old group was
    // ['Pizzeria', 'Italian Restaurant'], which made Telepizza Italian.
    expect(names(body.results['restaurant:food_cuisine:pizza'])).toEqual(['Tutto Pizza']);
  });

  it('returns the whole Asian hierarchy for an asian request (umbrella)', async () => {
    const res = await worker.fetch(nearbyRequest([
      { key: 'restaurant:food_cuisine:asian', type: 'restaurant', attribute: { dimension: 'food_cuisine', values: ['asian'] } },
    ]), env(), CTX);
    const body = await res.json() as { results: Record<string, Array<{ name: string }>> };
    // `sushi` is one of the cuisines the asian umbrella covers; `pizza` and
    // `portuguese` are not.
    expect(names(body.results['restaurant:food_cuisine:asian'])).toEqual(['Aron Sushi']);
  });

  it('rejects an unsupported cuisine value before it reaches the grouping', async () => {
    const res = await worker.fetch(nearbyRequest([
      { key: 'restaurant:food_cuisine:ramen', type: 'restaurant', attribute: { dimension: 'food_cuisine', values: ['ramen'] } },
    ]), env(), CTX);
    expect(res.status).toBe(400);
  });

  it('accepts only the requested canonical Gym brand', async () => {
    const gyms: FakePoi[] = [
      { overture_id: 'solinca', name: 'Solinca Coimbra', primary_poi_type: 'gym', brand: 'Solinca' },
      { overture_id: 'fitness-hut', name: 'Fitness Hut Coimbra', primary_poi_type: 'gym', brand: 'Fitness Hut' },
    ];
    const res = await worker.fetch(nearbyRequest([
      { key: 'gym:brand:Solinca', type: 'gym', brand: 'Solinca' },
    ]), env(gyms), CTX);
    expect(res.status).toBe(200);
    const body = await res.json() as { results: Record<string, Array<{ name: string; brand: string | null }>> };
    expect(body.results['gym:brand:Solinca']).toEqual([
      expect.objectContaining({ name: 'Solinca Coimbra', brand: 'Solinca' }),
    ]);
  });

  it('accepts only the requested optional Store brand', async () => {
    const stores: FakePoi[] = [
      { overture_id: 'worten', name: 'Worten Coimbra', primary_poi_type: 'store', brand: 'Worten' },
      { overture_id: 'fnac', name: 'Fnac Coimbra', primary_poi_type: 'store', brand: 'Fnac' },
    ];
    const res = await worker.fetch(nearbyRequest([
      { key: 'store:brand:Worten', type: 'store', brand: 'Worten' },
    ]), env(stores), CTX);
    expect(res.status).toBe(200);
    const body = await res.json() as { results: Record<string, Array<{ name: string; brand: string | null }>> };
    expect(body.results['store:brand:Worten']).toEqual([
      expect.objectContaining({ name: 'Worten Coimbra', brand: 'Worten' }),
    ]);
  });

  it('rejects an unknown brand and a brand on an unsupported POI type', async () => {
    const unknown = await worker.fetch(nearbyRequest([
      { key: 'gym:brand:nope', type: 'gym', brand: 'Nope Gym' },
    ]), env(), CTX);
    expect(unknown.status).toBe(400);
    const wrongType = await worker.fetch(nearbyRequest([
      { key: 'cafe:brand:Solinca', type: 'cafe', brand: 'Solinca' },
    ]), env(), CTX);
    expect(wrongType.status).toBe(400);
  });

  it('returns an approved community POI with its own identity, never a fabricated id from another source', async () => {
    const res = await worker.fetch(nearbyRequest([
      { key: 'restaurant:food_cuisine:sushi', type: 'restaurant', attribute: { dimension: 'food_cuisine', values: ['sushi'] } },
    ]), env([], [{ poi_id: 'community:123', name: 'The Sushi Soul', primary_poi_type: 'restaurant', food_cuisine: ['sushi'] }]), CTX);
    const body = await res.json() as { results: Record<string, Array<{ poi_id: string; source: string }>> };
    expect(body.results['restaurant:food_cuisine:sushi']).toEqual([expect.objectContaining({ poi_id: 'community:123', source: 'community' })]);
    // KAN-454: no fsq_place_id on the wire — not null, absent.
    expect(body.results['restaurant:food_cuisine:sushi'][0]).not.toHaveProperty('fsq_place_id');
  });

  it('returns only the requested Financial service kind', async () => {
    const services: FakePoi[] = [
      { overture_id: 'credit', name: 'Cofidis', primary_poi_type: 'financial_service', financial_service_kind: ['consumer_credit'] },
      { overture_id: 'insurance', name: 'Fidelidade', primary_poi_type: 'financial_service', financial_service_kind: ['insurance'] },
    ];
    const res = await worker.fetch(nearbyRequest([
      { key: 'financial_service', type: 'financial_service' },
      { key: 'financial_service:financial_service_kind:consumer_credit', type: 'financial_service', attribute: { dimension: 'financial_service_kind', values: ['consumer_credit'] } },
    ]), env(services), CTX);
    expect(res.status).toBe(200);
    const body = await res.json() as { results: Record<string, Array<{ name: string; attributes: Record<string, string[]> }>> };
    expect(names(body.results.financial_service)).toEqual(['Cofidis', 'Fidelidade']);
    expect(body.results['financial_service:financial_service_kind:consumer_credit']).toEqual([
      expect.objectContaining({ name: 'Cofidis', attributes: { financial_service_kind: ['consumer_credit'] } }),
    ]);
  });
});
