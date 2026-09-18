import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { schemaDb } from './d1TestDb';

/**
 * KAN-452 — migration 0042 against a curated_poi built the way production's
 * was: 0008, then the two ALTERs (0010 brand, 0030 floor), then rows shaped
 * like the 294 production rows measured on 2026-09-18.
 */
const ROOT = join(__dirname, '..', '..');
const MIGRATION = readFileSync(join(ROOT, 'migrations', '0042_curated_poi_provenance.sql'), 'utf8');
// Everything from the backfill marker on is UPDATEs guarded on
// `origin_source IS NULL`; the ALTERs above it can only run once.
const BACKFILL = MIGRATION.slice(MIGRATION.indexOf('-- Backfill'));

function productionShapedDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(join(ROOT, 'migrations', '0008_moderated_manual_pois.sql'), 'utf8'));
  // 0010's curated_poi part (the rest of that file touches `poi`); 0030's.
  db.exec('ALTER TABLE curated_poi ADD COLUMN brand TEXT; CREATE INDEX idx_curated_poi_brand_geo ON curated_poi (brand, geohash);');
  db.exec('ALTER TABLE curated_poi ADD COLUMN floor TEXT;');
  db.exec(`CREATE TABLE multibanco_import_staging (
    source_id TEXT PRIMARY KEY, source_name TEXT NOT NULL, municipality_relation_id INTEGER NOT NULL,
    source_url TEXT NOT NULL, request_bounds_json TEXT NOT NULL, raw_payload_json TEXT NOT NULL,
    fetched_at TEXT NOT NULL, published_poi_id TEXT NOT NULL, published_at TEXT NOT NULL)`);

  const insert = db.prepare(
    `INSERT INTO curated_poi (poi_id, source, name, dedupe_name, lat, lng, geohash, primary_poi_type, status, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, ?, ?, 38.7, -9.1, 'eycs0', 'store', 'active', ?, ?, ?, ?)`,
  );
  const row = (id: string, source: string, createdBy: string, createdAt: string) =>
    insert.run(id, source, id, id, createdAt, createdBy, createdAt, createdBy);
  row('mall:way-1229547231', 'manual', 'KAN-435 operator tenant list', '2026-08-31T13:37:48.227127+00:00');
  row('mall:node-13938064398', 'manual', 'KAN-435 operator tenant list', '2026-09-01T10:05:29Z');
  row('mall:pt-38.767342--9.098735', 'manual', 'KAN-435 operator tenant list', '2026-08-31T14:48:24.012496+00:00');
  row('multibanco:PT-1234', 'manual', 'multibanco-import', '2026-09-02T00:59:47.266Z');
  row('multibanco:PT-orphan', 'manual', 'multibanco-import', '2026-09-02T00:59:47.266Z');
  row('community:5d1c', 'community', 'olegario.nascimento@brushaway.app', '2026-08-09T21:08:22.705Z');
  db.prepare(
    `INSERT INTO multibanco_import_staging VALUES ('multibanco:PT-1234', 'multibanco', 5400891, 'u', '{}', '{}', 't', 'multibanco:PT-1234', 't')`,
  ).run();
  return db;
}

const provenance = (db: DatabaseSync, id: string) => db.prepare(
  'SELECT origin_source, origin_id, origin_licence, imported_at, import_run_id FROM curated_poi WHERE poi_id = ?',
).get(id);

describe('migration 0042 — curated_poi provenance', () => {
  it('adds the columns, keeps every row readable, and backfills only what is derivable', () => {
    const db = productionShapedDb();
    db.exec(MIGRATION);

    expect(db.prepare('SELECT count(*) AS n FROM curated_poi').get()).toEqual({ n: 6 });
    expect(provenance(db, 'mall:way-1229547231')).toEqual({
      origin_source: 'osm', origin_id: 'way/1229547231', origin_licence: 'ODbL',
      imported_at: '2026-08-31T13:37:48.227127+00:00', import_run_id: null,
    });
    expect(provenance(db, 'mall:node-13938064398')).toMatchObject({ origin_source: 'osm', origin_id: 'node/13938064398' });
    expect(provenance(db, 'multibanco:PT-1234')).toEqual({
      origin_source: 'multibanco', origin_id: 'multibanco:PT-1234', origin_licence: null,
      imported_at: '2026-09-02T00:59:47.266Z', import_run_id: null,
    });
    // A hand-placed tenant has no origin id anywhere; a multibanco row with
    // no staging row has nothing to point at; a moderator's row has no
    // origin by definition.
    for (const id of ['mall:pt-38.767342--9.098735', 'multibanco:PT-orphan', 'community:5d1c']) {
      expect(provenance(db, id)).toEqual({ origin_source: null, origin_id: null, origin_licence: null, imported_at: null, import_run_id: null });
    }
  });

  it('is a no-op the second time the backfill runs', () => {
    const db = productionShapedDb();
    db.exec(MIGRATION);
    const before = db.prepare('SELECT * FROM curated_poi ORDER BY poi_id').all();
    db.exec(BACKFILL);
    expect(db.prepare('SELECT * FROM curated_poi ORDER BY poi_id').all()).toEqual(before);
  });

  it('refuses the same origin twice and allows any number of rows with none', () => {
    const db = productionShapedDb();
    db.exec(MIGRATION);
    const insert = db.prepare(
      `INSERT INTO curated_poi (poi_id, source, name, dedupe_name, lat, lng, geohash, primary_poi_type, status, created_at, created_by, updated_at, updated_by, origin_source, origin_id)
       VALUES (?, 'manual', 'x', 'x', 38.7, -9.1, 'eycs0', 'store', 'active', 't', 'test', 't', 'test', ?, ?)`,
    );
    expect(() => insert.run('dup', 'osm', 'way/1229547231')).toThrow(/UNIQUE constraint failed/);
    insert.run('none-1', null, null);
    insert.run('none-2', null, null);
    // origin_source without origin_id (or the reverse) is not an identity
    // and is not deduplicated either.
    insert.run('half-1', 'osm', null);
    insert.run('half-2', 'osm', null);
    expect(db.prepare('SELECT count(*) AS n FROM curated_poi').get()).toEqual({ n: 10 });
  });

  it('contains no DROP, DELETE or TRUNCATE', () => {
    expect(MIGRATION).not.toMatch(/\b(DROP|DELETE|TRUNCATE)\b/i);
  });

  it('leaves curated_poi with exactly the columns schema.sql declares', () => {
    const db = productionShapedDb();
    db.exec(MIGRATION);
    const columns = (database: DatabaseSync) =>
      (database.prepare('PRAGMA table_info(curated_poi)').all() as Array<{ name: string }>).map(column => column.name);
    expect(columns(db)).toEqual(columns(schemaDb()));
    const indexes = (database: DatabaseSync) =>
      (database.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'curated_poi' AND name LIKE 'idx_%' ORDER BY name").all() as Array<{ name: string }>).map(index => index.name);
    expect(indexes(db)).toEqual(indexes(schemaDb()));
  });
});
