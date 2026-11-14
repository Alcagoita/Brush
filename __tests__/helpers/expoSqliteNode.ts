/**
 * expo-sqlite's synchronous API over real SQLite (node:sqlite, Node >= 22.13),
 * so a store's own SQL — schema, migrations, parameters, transactions — runs
 * for real in Jest instead of being pattern-matched by a fake.
 *
 * Use from a test file:
 *
 *   jest.mock('expo-sqlite', () => require('../helpers/expoSqliteNode').expoSqliteMock);
 *   beforeEach(() => { resetNodeSqlite(); });
 *
 * Every openDatabaseSync() returns the current in-memory database; reset
 * starts a fresh one.
 */
import { DatabaseSync } from 'node:sqlite';

let current = new DatabaseSync(':memory:');

export function resetNodeSqlite(): DatabaseSync {
  current = new DatabaseSync(':memory:');
  return current;
}

export function nodeSqlite(): DatabaseSync {
  return current;
}

export const expoSqliteMock = {
  openDatabaseSync: () => ({
    execSync: (sql: string) => current.exec(sql),
    runSync: (sql: string, params: unknown[] = []) => current.prepare(sql).run(...(params as never[])),
    getAllSync: (sql: string, params: unknown[] = []) => current.prepare(sql).all(...(params as never[])),
    getFirstSync: (sql: string, params: unknown[] = []) => current.prepare(sql).get(...(params as never[])) ?? null,
    withTransactionSync: (task: () => void) => {
      current.exec('BEGIN');
      try {
        task();
        current.exec('COMMIT');
      } catch (error) {
        current.exec('ROLLBACK');
        throw error;
      }
    },
  }),
};
