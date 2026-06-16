/**
 * KAN-146 — rolloverIncompleteTasks helpers unit tests
 *
 * Tests the pure date helper and the rolloverAllUsers batch logic in
 * isolation by mocking firebase-admin's Firestore collectionGroup/batch API.
 *
 * The scheduled function wrapper itself is not unit-tested here (it just
 * wires admin.firestore() + todayISOUTC() into rolloverAllUsers) — that glue
 * is exercised in integration tests against the Firebase emulator.
 */

import { todayISOUTC, rolloverAllUsers } from '../rolloverIncompleteTasks';

// ─── todayISOUTC ───────────────────────────────────────────────────────────

describe('todayISOUTC', () => {
  it('formats a UTC date as YYYY-MM-DD', () => {
    expect(todayISOUTC(new Date('2024-06-09T23:59:00Z'))).toBe('2024-06-09');
  });

  it('does not roll over based on local time — pure UTC slice', () => {
    expect(todayISOUTC(new Date('2024-01-01T00:00:01Z'))).toBe('2024-01-01');
  });
});

// ─── rolloverAllUsers ────────────────────────────────────────────────────────

describe('rolloverAllUsers', () => {
  const TODAY = '2024-06-09';

  function makeDoc(id: string) {
    return { ref: { id } };
  }

  function makeDb(docs: ReturnType<typeof makeDoc>[]) {
    const updateMock = jest.fn();
    const commitMock = jest.fn().mockResolvedValue(undefined);
    const batchMock   = jest.fn(() => ({ update: updateMock, commit: commitMock }));

    const whereMock: jest.Mock = jest.fn();
    const getMock = jest.fn().mockResolvedValue({ empty: docs.length === 0, docs });
    whereMock.mockReturnValue({ where: whereMock, get: getMock });

    const db = {
      collectionGroup: jest.fn(() => ({ where: whereMock, get: getMock })),
      batch: batchMock,
    } as unknown as import('firebase-admin').firestore.Firestore;

    return { db, updateMock, commitMock, batchMock, getMock };
  }

  it('returns 0 and writes nothing when no tasks are stale', async () => {
    const { db, batchMock } = makeDb([]);
    const count = await rolloverAllUsers(db, TODAY);
    expect(count).toBe(0);
    expect(batchMock).not.toHaveBeenCalled();
  });

  it('queries done == false and date < today', async () => {
    const { db, getMock } = makeDb([]);
    await rolloverAllUsers(db, TODAY);
    expect(db.collectionGroup).toHaveBeenCalledWith('tasks');
    expect(getMock).toHaveBeenCalled();

    const whereMock = (db.collectionGroup('tasks') as unknown as { where: jest.Mock }).where;
    expect(whereMock).toHaveBeenCalledWith('done', '==', false);
    expect(whereMock).toHaveBeenCalledWith('date', '<', TODAY);
  });

  it('updates every stale task with date and createdAt bumped to today', async () => {
    const docs = [makeDoc('t1'), makeDoc('t2'), makeDoc('t3')];
    const { db, updateMock, commitMock } = makeDb(docs);

    const count = await rolloverAllUsers(db, TODAY);

    expect(count).toBe(3);
    expect(updateMock).toHaveBeenCalledTimes(3);
    docs.forEach(d => {
      expect(updateMock).toHaveBeenCalledWith(
        d.ref,
        expect.objectContaining({ date: TODAY, createdAt: expect.anything() }),
      );
    });
    expect(commitMock).toHaveBeenCalledTimes(1);
  });

  it('splits writes into multiple batches when over the 500 limit', async () => {
    const docs = Array.from({ length: 501 }, (_, i) => makeDoc(`t${i}`));
    const { db, commitMock, updateMock } = makeDb(docs);

    const count = await rolloverAllUsers(db, TODAY);

    expect(count).toBe(501);
    expect(commitMock).toHaveBeenCalledTimes(2); // 500 + 1
    expect(updateMock).toHaveBeenCalledTimes(501);
  });
});
