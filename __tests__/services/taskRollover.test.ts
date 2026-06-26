/**
 * KAN-146 — client-side rolloverIncompleteTasks tests.
 *
 * Tasks persist until brushed away — there is no end-of-day cleanup. Any
 * task still undone when a new day starts is rolled forward: `date` and
 * `createdAt` bump to today, so it's treated as a brand-new task for the
 * new day (matches today's Today list and scores against today's ring).
 */

const mockGetDocs     = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
const mockWhere       = jest.fn((...a: unknown[]) => a);
const mockQuery       = jest.fn((...a: unknown[]) => a);

const NOW_TIMESTAMP = { _isNow: true };

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore:    jest.fn(),
  collection:      jest.fn(() => ({ _type: 'collection' })),
  doc:             jest.fn(() => ({ _type: 'doc' })),
  addDoc:          jest.fn(),
  getDoc:          jest.fn(),
  getDocs:         (...args: unknown[]) => mockGetDocs(...args),
  updateDoc:       jest.fn(),
  deleteDoc:       jest.fn(),
  setDoc:          jest.fn(),
  writeBatch:      jest.fn(() => ({ update: mockBatchUpdate, commit: mockBatchCommit })),
  query:           (...args: unknown[]) => mockQuery(...args),
  where:           (...args: unknown[]) => mockWhere(...args),
  orderBy:         jest.fn(),
  onSnapshot:      jest.fn(),
  serverTimestamp: jest.fn(() => ({ _serverTimestamp: true })),
  increment:       jest.fn(),
  Timestamp:       { now: jest.fn(() => NOW_TIMESTAMP) },
  runTransaction:  jest.fn(),
}));

import { rolloverIncompleteTasks } from '../../src/services/firestore';

describe('rolloverIncompleteTasks', () => {
  const TODAY = '2026-06-16';

  beforeEach(() => {
    jest.clearAllMocks();
    mockBatchCommit.mockResolvedValue(undefined);
  });

  it('queries done == false and date < today', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

    await rolloverIncompleteTasks('uid-1', TODAY);

    expect(mockWhere).toHaveBeenCalledWith('done', '==', false);
    expect(mockWhere).toHaveBeenCalledWith('date', '<', TODAY);
  });

  it('does nothing when there are no stale undone tasks', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

    await rolloverIncompleteTasks('uid-1', TODAY);

    expect(mockBatchUpdate).not.toHaveBeenCalled();
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('bumps date and createdAt to today for every stale task, then commits once', async () => {
    const docs = [
      { ref: { id: 't1' } },
      { ref: { id: 't2' } },
    ];
    mockGetDocs.mockResolvedValue({ empty: false, docs });

    await rolloverIncompleteTasks('uid-1', TODAY);

    expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      docs[0].ref,
      { date: TODAY, createdAt: NOW_TIMESTAMP },
    );
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      docs[1].ref,
      { date: TODAY, createdAt: NOW_TIMESTAMP },
    );
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('splits writes into multiple batches when over the 500 limit', async () => {
    const docs = Array.from({ length: 501 }, (_, i) => ({ ref: { id: `t${i}` } }));
    mockGetDocs.mockResolvedValue({ empty: false, docs });

    await rolloverIncompleteTasks('uid-1', TODAY);

    expect(mockBatchUpdate).toHaveBeenCalledTimes(501);
    expect(mockBatchCommit).toHaveBeenCalledTimes(2); // 500 + 1
  });

  it('defaults `today` to the device-local date when not passed', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

    await rolloverIncompleteTasks('uid-1');

    // Whatever todayISO() resolves to right now must appear in the where clause.
    const dateArgs = mockWhere.mock.calls.find(call => call[0] === 'date');
    expect(dateArgs).toBeDefined();
    expect(typeof dateArgs?.[2]).toBe('string');
    expect(dateArgs?.[2]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
