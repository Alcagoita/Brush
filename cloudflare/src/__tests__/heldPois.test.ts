import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';

import { findHeldPois } from '../heldPois';
import { d1Binding, schemaDb } from './d1TestDb';

/**
 * KAN-452 — the shared lookup over everything the registry serves, run
 * against real SQLite carrying the project's own schema. A fake would only
 * prove the module asks the questions we expect; the point here is what the
 * database answers, correction join and all.
 */
const LAT = 38.78247;
const LNG = -9.19256;

function insertOverture(db: DatabaseSync, id: string, name: string, dedupe: string, lat = LAT, lng = LNG, type = 'store') {
  db.prepare(
    `INSERT INTO overture_poi (overture_id, name, dedupe_name, lat, lng, geohash, primary_poi_type, address, imported_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'eycs0', ?, 'Odivelas Parque', 't', 't')`,
  ).run(id, name, dedupe, lat, lng, type);
}

function insertCurated(db: DatabaseSync, id: string, name: string, dedupe: string, status = 'active', lat = LAT, lng = LNG) {
  db.prepare(
    `INSERT INTO curated_poi (poi_id, source, name, dedupe_name, lat, lng, geohash, primary_poi_type, status, created_at, created_by, updated_at, updated_by)
     VALUES (?, 'manual', ?, ?, ?, ?, 'eycs0', 'store', ?, 't', 'test', 't', 'test')`,
  ).run(id, name, dedupe, lat, lng, status);
}

function insertMultibanco(db: DatabaseSync, id: string, name: string, dedupe: string) {
  db.prepare(
    `INSERT INTO multibanco_poi (source_id, name, dedupe_name, lat, lng, geohash, primary_poi_type, address, source_url, raw_payload_json, fetched_at, imported_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'eycs0', 'atm', 'Rua A', 'https://example.test', '{}', 't', 't', 't')`,
  ).run(id, name, dedupe, LAT, LNG);
}

function hide(db: DatabaseSync, overtureId: string, nameOverride: string | null = null, visible = 0) {
  db.prepare(
    "INSERT INTO poi_source_correction (source, source_id, visible, name_override, review_note) VALUES ('overture', ?, ?, ?, 'test')",
  ).run(overtureId, visible, nameOverride);
}

describe('findHeldPois', () => {
  let db: DatabaseSync;
  beforeEach(() => { db = schemaDb(); });

  const exact = (dedupeName: string, radiusMeters = 20) =>
    findHeldPois(d1Binding(db), { dedupeName, lat: LAT, lng: LNG, radiusMeters, perSourceLimit: 50 });

  it('finds an Overture row by exact normalised name at the point', async () => {
    insertOverture(db, 'ovt-1', 'Continente', 'continente');
    const held = await exact('continente');
    expect(held).toEqual([expect.objectContaining({
      source: 'overture', id: 'ovt-1', name: 'Continente', poiType: 'store', address: 'Odivelas Parque', distanceMeters: 0,
    })]);
  });

  it('reads all three served sources and orders by distance', async () => {
    insertOverture(db, 'ovt-1', 'Continente', 'continente', LAT + 0.0001, LNG);
    insertCurated(db, 'mall:way-1', 'Continente', 'continente');
    insertMultibanco(db, 'multibanco:9', 'Continente', 'continente');
    const held = await exact('continente', 50);
    expect(held.map(row => [row.source, row.id])).toEqual([
      ['community', 'mall:way-1'], ['multibanco', 'multibanco:9'], ['overture', 'ovt-1'],
    ]);
    expect(held[2].distanceMeters).toBe(11);
  });

  it('never reads poi or osm_poi', async () => {
    db.prepare(
      `INSERT INTO poi (fsq_place_id, name, dedupe_name, lat, lng, geohash, primary_poi_type, date_refreshed)
       VALUES ('fsq-1', 'Continente', 'continente', ?, ?, 'eycs0', 'store', 't')`,
    ).run(LAT, LNG);
    expect(await exact('continente')).toEqual([]);
  });

  it('leaves out an Overture row a correction has hidden, and shows a corrected name', async () => {
    insertOverture(db, 'ovt-hidden', 'Continente', 'continente');
    insertOverture(db, 'ovt-renamed', 'CONTINENTE MODELO', 'continente', LAT, LNG);
    hide(db, 'ovt-hidden');
    hide(db, 'ovt-renamed', 'Continente Modelo', 1);
    const held = await exact('continente');
    expect(held).toEqual([expect.objectContaining({ id: 'ovt-renamed', name: 'Continente Modelo' })]);
  });

  it('leaves out removed curated rows and the legacy multibanco: mirror', async () => {
    insertCurated(db, 'community:removed', 'Continente', 'continente', 'removed');
    insertCurated(db, 'multibanco:legacy', 'Continente', 'continente');
    expect(await exact('continente')).toEqual([]);
  });

  it('restricts to the sources asked for', async () => {
    insertOverture(db, 'ovt-1', 'Continente', 'continente');
    insertMultibanco(db, 'multibanco:9', 'Continente', 'continente');
    const held = await findHeldPois(d1Binding(db), {
      dedupeName: 'continente', lat: LAT, lng: LNG, radiusMeters: 20, perSourceLimit: 50, sources: ['overture', 'community'],
    });
    expect(held.map(row => row.source)).toEqual(['overture']);
  });

  it('matches on the start of the name when asked to, and bounds by the radius', async () => {
    insertOverture(db, 'ovt-near', 'Continente Bom Dia', 'continente bom dia');
    insertOverture(db, 'ovt-far', 'Continente Bom Dia', 'continente bom dia', LAT + 0.5, LNG);
    insertOverture(db, 'ovt-other', 'Pingo Doce', 'pingo doce');
    const held = await findHeldPois(d1Binding(db), {
      dedupeName: 'conti', prefix: true, lat: LAT, lng: LNG, radiusMeters: 30_000, perSourceLimit: 200,
    });
    expect(held.map(row => row.id)).toEqual(['ovt-near']);
    expect(await exact('conti')).toEqual([]);
  });

  it('keeps a same-named row just outside the radius out', async () => {
    insertOverture(db, 'ovt-1', 'Continente', 'continente', LAT + 0.0003, LNG);
    expect(await exact('continente', 20)).toEqual([]);
    expect(await exact('continente', 50)).toHaveLength(1);
  });
});
