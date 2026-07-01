/**
 * Unit tests for points & achievements helpers (KAN-30 / KAN-128).
 *
 * Covers:
 *   awardPoint (KAN-31 / KAN-128 — now uses runTransaction for idempotency)
 *     - uses runTransaction (not writeBatch)
 *     - writes a correctly shaped PointsHistoryEntry when no entry exists today
 *     - increments totalPoints on the user document
 *     - is idempotent: no-ops if the deterministic doc already exists
 *     - rejects if the transaction rejects
 *   revokePoint (KAN-128)
 *     - deletes the history entry and decrements totalPoints when entry exists
 *     - is a no-op when no entry exists for today
 *     - rejects if the transaction rejects
 *   hasAchievement
 *     - returns true when the achievement document exists
 *     - returns false when the document does not exist
 *   awardAchievement
 *     - writes the correct document for a global achievement
 *     - writes the correct document for a date-scoped achievement with metadata
 *     - omits the metadata field when none supplied
 *   subscribeToTotalPoints
 *     - fires 0 when totalPoints is absent from user doc
 *     - fires the stored number when totalPoints is present
 *     - returns an unsubscribe function
 *   subscribeToAchievements
 *     - fires an empty array when collection is empty
 *     - maps documents to Achievement objects (includes doc id)
 *     - returns an unsubscribe function
 *   subscribeToPointsHistory
 *     - fires an empty array when collection is empty
 *     - maps documents to PointsHistoryEntry objects (includes doc id)
 *     - returns an unsubscribe function
 */

// ─── Firestore mock ───────────────────────────────────────────────────────────

type DocSnapshotCallback  = (snap: { data: () => object | undefined; exists: () => boolean }) => void;
type CollSnapshotCallback = (snap: { docs: Array<{ id: string; data: () => object }> }) => void;

// Transaction mocks
const mockTxGet    = jest.fn();
const mockTxSet    = jest.fn();
const mockTxUpdate = jest.fn();
const mockTxDelete = jest.fn();

const mockRunTransaction = jest.fn(async (_db: unknown, fn: (tx: unknown) => Promise<void>) => {
  const tx = {
    get:    mockTxGet,
    set:    mockTxSet,
    update: mockTxUpdate,
    delete: mockTxDelete,
  };
  return fn(tx);
});

// Batch mocks (still used by awardPointsBatch and the KAN-63 helpers)
const mockBatchUpdate  = jest.fn();
const mockBatchSet     = jest.fn();
const mockBatchCommit  = jest.fn();
const mockWriteBatch   = jest.fn(() => ({
  update: mockBatchUpdate,
  set:    mockBatchSet,
  commit: mockBatchCommit,
}));

const mockGetDoc          = jest.fn();
const mockSetDoc          = jest.fn();
const mockOnSnapshot      = jest.fn();
const mockIncrement       = jest.fn((n: number) => ({ _increment: n }));
const mockServerTimestamp = jest.fn(() => ({ _serverTimestamp: true }));

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore:    jest.fn(),
  collection:      jest.fn(() => ({ _type: 'collection' })),
  doc:             jest.fn(() => ({ _type: 'doc' })),
  addDoc:          jest.fn(),
  getDoc:          (...args: unknown[]) => mockGetDoc(...args),
  updateDoc:       jest.fn(),
  setDoc:          (...args: unknown[]) => mockSetDoc(...args),
  writeBatch:      () => mockWriteBatch(),
  runTransaction:  (...args: unknown[]) => mockRunTransaction(...args),
  getDocs:         jest.fn(),
  deleteDoc:       jest.fn(),
  query:           jest.fn((...a: unknown[]) => a[0]),
  where:           jest.fn(),
  orderBy:         jest.fn(),
  onSnapshot:      (...args: unknown[]) => mockOnSnapshot(...args),
  serverTimestamp: () => mockServerTimestamp(),
  increment:       (n: number) => mockIncrement(n),
  Timestamp:       {},
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {
  awardPoint,
  revokePoint,
  hasAchievement,
  awardAchievement,
  subscribeToTotalPoints,
  subscribeToAchievements,
  subscribeToPointsHistory,
} from '../../src/services/firestore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

// ─── awardPoint ───────────────────────────────────────────────────────────────

describe('awardPoint', () => {
  // Default: no entry exists today — transaction should proceed.
  beforeEach(() => {
    mockTxGet.mockResolvedValue({ exists: () => false });
    mockRunTransaction.mockImplementation(async (_db: unknown, fn: (tx: unknown) => Promise<void>) => {
      const tx = { get: mockTxGet, set: mockTxSet, update: mockTxUpdate, delete: mockTxDelete };
      return fn(tx);
    });
  });

  it('uses runTransaction (not writeBatch)', async () => {
    await awardPoint('uid-1', 'task-abc', 'Buy milk');
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    expect(mockWriteBatch).not.toHaveBeenCalled();
  });

  it('tx.set writes a correctly shaped PointsHistoryEntry', async () => {
    await awardPoint('uid-1', 'task-abc', 'Buy milk');

    expect(mockTxSet).toHaveBeenCalledTimes(1);
    expect(mockTxSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        taskId:    'task-abc',
        taskTitle: 'Buy milk',
        points:    1,
        reason:    'task_completed',
        awardedAt: expect.anything(),
      }),
    );
  });

  it('tx.update increments totalPoints by 1', async () => {
    await awardPoint('uid-1', 'task-abc', 'Buy milk');

    expect(mockTxUpdate).toHaveBeenCalledTimes(1);
    expect(mockTxUpdate).toHaveBeenCalledWith(
      expect.anything(),
      { totalPoints: expect.objectContaining({ _increment: 1 }) },
    );
  });

  it('is idempotent — no-ops if the history entry already exists today', async () => {
    mockTxGet.mockResolvedValue({ exists: () => true });

    await awardPoint('uid-1', 'task-abc', 'Buy milk');

    expect(mockTxSet).not.toHaveBeenCalled();
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('rejects if the transaction rejects', async () => {
    mockRunTransaction.mockRejectedValueOnce(new Error('Network error'));
    await expect(awardPoint('uid-1', 'task-abc', 'Buy milk')).rejects.toThrow('Network error');
  });
});

// ─── revokePoint ─────────────────────────────────────────────────────────────

describe('revokePoint', () => {
  beforeEach(() => {
    mockRunTransaction.mockImplementation(async (_db: unknown, fn: (tx: unknown) => Promise<void>) => {
      const tx = { get: mockTxGet, set: mockTxSet, update: mockTxUpdate, delete: mockTxDelete };
      return fn(tx);
    });
  });

  it('tx.delete removes the history entry when it exists', async () => {
    mockTxGet.mockResolvedValue({ exists: () => true });

    await revokePoint('uid-1', 'task-abc');

    expect(mockTxDelete).toHaveBeenCalledTimes(1);
  });

  it('tx.update decrements totalPoints by 1 when the entry exists', async () => {
    mockTxGet.mockResolvedValue({ exists: () => true });

    await revokePoint('uid-1', 'task-abc');

    expect(mockTxUpdate).toHaveBeenCalledTimes(1);
    expect(mockTxUpdate).toHaveBeenCalledWith(
      expect.anything(),
      { totalPoints: expect.objectContaining({ _increment: -1 }) },
    );
  });

  it('is a no-op when no history entry exists for today', async () => {
    mockTxGet.mockResolvedValue({ exists: () => false });

    await revokePoint('uid-1', 'task-abc');

    expect(mockTxDelete).not.toHaveBeenCalled();
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('rejects if the transaction rejects', async () => {
    mockRunTransaction.mockRejectedValueOnce(new Error('Network error'));
    await expect(revokePoint('uid-1', 'task-abc')).rejects.toThrow('Network error');
  });
});

// ─── hasAchievement ───────────────────────────────────────────────────────────

describe('hasAchievement', () => {
  it('returns true when the achievement document exists', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true });
    expect(await hasAchievement('uid-1', 'first_task')).toBe(true);
  });

  it('returns false when the document does not exist', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    expect(await hasAchievement('uid-1', 'daily_complete_2026-05-29')).toBe(false);
  });
});

// ─── awardAchievement ─────────────────────────────────────────────────────────

describe('awardAchievement', () => {
  it('writes the correct document for a global achievement', async () => {
    mockSetDoc.mockResolvedValue(undefined);

    await awardAchievement('uid-1', 'first_task', 'first_task');

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'first_task', earnedAt: expect.anything() }),
      { merge: false },
    );
    // metadata should not be present
    const writtenData = mockSetDoc.mock.calls[0][1];
    expect(writtenData).not.toHaveProperty('metadata');
  });

  it('writes the correct document for a date-scoped achievement with metadata', async () => {
    mockSetDoc.mockResolvedValue(undefined);

    await awardAchievement(
      'uid-1',
      'daily_complete_2026-05-29',
      'daily_complete',
      { date: '2026-05-29' },
    );

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type:     'daily_complete',
        earnedAt: expect.anything(),
        metadata: { date: '2026-05-29' },
      }),
      { merge: false },
    );
  });

  it('omits the metadata field when none is supplied', async () => {
    mockSetDoc.mockResolvedValue(undefined);

    await awardAchievement('uid-1', 'first_task', 'first_task');

    const writtenData = mockSetDoc.mock.calls[0][1];
    expect(Object.keys(writtenData)).not.toContain('metadata');
  });
});

// ─── subscribeToTotalPoints ───────────────────────────────────────────────────

describe('subscribeToTotalPoints', () => {
  it('fires 0 when totalPoints is absent from user doc', () => {
    mockOnSnapshot.mockImplementation((_ref: unknown, cb: DocSnapshotCallback) => {
      cb({ data: () => ({ uid: 'uid-1' }), exists: () => true });
      return jest.fn();
    });

    const onUpdate = jest.fn();
    subscribeToTotalPoints('uid-1', onUpdate);

    expect(onUpdate).toHaveBeenCalledWith(0);
  });

  it('fires the stored number when totalPoints is present', () => {
    mockOnSnapshot.mockImplementation((_ref: unknown, cb: DocSnapshotCallback) => {
      cb({ data: () => ({ totalPoints: 7 }), exists: () => true });
      return jest.fn();
    });

    const onUpdate = jest.fn();
    subscribeToTotalPoints('uid-1', onUpdate);

    expect(onUpdate).toHaveBeenCalledWith(7);
  });

  it('returns an unsubscribe function', () => {
    const unsub = jest.fn();
    mockOnSnapshot.mockReturnValue(unsub);

    const stop = subscribeToTotalPoints('uid-1', jest.fn());
    stop();

    expect(unsub).toHaveBeenCalledTimes(1);
  });
});

// ─── subscribeToAchievements ──────────────────────────────────────────────────

describe('subscribeToAchievements', () => {
  it('fires an empty array when the collection is empty', () => {
    mockOnSnapshot.mockImplementation((_ref: unknown, cb: CollSnapshotCallback) => {
      cb({ docs: [] });
      return jest.fn();
    });

    const onUpdate = jest.fn();
    subscribeToAchievements('uid-1', onUpdate);

    expect(onUpdate).toHaveBeenCalledWith([]);
  });

  it('maps documents to Achievement objects including doc id', () => {
    const fakeTs = { toDate: () => new Date('2026-05-29') };
    mockOnSnapshot.mockImplementation((_ref: unknown, cb: CollSnapshotCallback) => {
      cb({
        docs: [
          { id: 'first_task',                   data: () => ({ type: 'first_task',    earnedAt: fakeTs }) },
          { id: 'daily_complete_2026-05-29',     data: () => ({ type: 'daily_complete', earnedAt: fakeTs, metadata: { date: '2026-05-29' } }) },
        ],
      });
      return jest.fn();
    });

    const onUpdate = jest.fn();
    subscribeToAchievements('uid-1', onUpdate);

    expect(onUpdate).toHaveBeenCalledWith([
      { id: 'first_task',               type: 'first_task',    earnedAt: fakeTs },
      { id: 'daily_complete_2026-05-29', type: 'daily_complete', earnedAt: fakeTs, metadata: { date: '2026-05-29' } },
    ]);
  });

  it('returns an unsubscribe function', () => {
    const unsub = jest.fn();
    mockOnSnapshot.mockReturnValue(unsub);

    const stop = subscribeToAchievements('uid-1', jest.fn());
    stop();

    expect(unsub).toHaveBeenCalledTimes(1);
  });
});

// ─── subscribeToPointsHistory ─────────────────────────────────────────────────

describe('subscribeToPointsHistory', () => {
  it('fires an empty array when the collection is empty', () => {
    mockOnSnapshot.mockImplementation((_ref: unknown, cb: CollSnapshotCallback) => {
      cb({ docs: [] });
      return jest.fn();
    });

    const onUpdate = jest.fn();
    subscribeToPointsHistory('uid-1', onUpdate);

    expect(onUpdate).toHaveBeenCalledWith([]);
  });

  it('maps documents to PointsHistoryEntry objects including doc id', () => {
    const fakeTs = { toDate: () => new Date('2026-05-29') };
    mockOnSnapshot.mockImplementation((_ref: unknown, cb: CollSnapshotCallback) => {
      cb({
        docs: [
          {
            id:   'hist-2',
            data: () => ({
              taskId:    'task-2',
              taskTitle: 'Pick up meds',
              awardedAt: fakeTs,
              points:    1,
              reason:    'task_completed',
            }),
          },
          {
            id:   'hist-1',
            data: () => ({
              taskId:    'task-1',
              taskTitle: 'Buy milk',
              awardedAt: fakeTs,
              points:    1,
              reason:    'task_completed',
            }),
          },
        ],
      });
      return jest.fn();
    });

    const onUpdate = jest.fn();
    subscribeToPointsHistory('uid-1', onUpdate);

    expect(onUpdate).toHaveBeenCalledWith([
      { id: 'hist-2', taskId: 'task-2', taskTitle: 'Pick up meds', awardedAt: fakeTs, points: 1, reason: 'task_completed' },
      { id: 'hist-1', taskId: 'task-1', taskTitle: 'Buy milk',     awardedAt: fakeTs, points: 1, reason: 'task_completed' },
    ]);
  });

  it('deduplicates legacy entries — keeps only the latest entry per taskId (KAN-128)', () => {
    const olderTs = { toDate: () => new Date('2026-05-28') };
    const newerTs = { toDate: () => new Date('2026-05-29') };
    mockOnSnapshot.mockImplementation((_ref: unknown, cb: CollSnapshotCallback) => {
      // Docs arrive ordered newest-first (as Firestore orderBy awardedAt desc guarantees).
      cb({
        docs: [
          // Newest duplicate for task-1 — should be kept.
          {
            id:   'task-1_2026-05-29',
            data: () => ({
              taskId:    'task-1',
              taskTitle: 'Buy milk',
              awardedAt: newerTs,
              points:    1,
              reason:    'task_completed',
            }),
          },
          // Older duplicate for task-1 — should be dropped.
          {
            id:   'auto-id-legacy',
            data: () => ({
              taskId:    'task-1',
              taskTitle: 'Buy milk',
              awardedAt: olderTs,
              points:    1,
              reason:    'task_completed',
            }),
          },
          // Unique entry — should be kept.
          {
            id:   'task-2_2026-05-29',
            data: () => ({
              taskId:    'task-2',
              taskTitle: 'Pick up meds',
              awardedAt: newerTs,
              points:    1,
              reason:    'task_completed',
            }),
          },
        ],
      });
      return jest.fn();
    });

    const onUpdate = jest.fn();
    subscribeToPointsHistory('uid-1', onUpdate);

    const result = onUpdate.mock.calls[0][0] as unknown[];
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'task-1_2026-05-29', taskId: 'task-1' });
    expect(result[1]).toMatchObject({ id: 'task-2_2026-05-29', taskId: 'task-2' });
  });

  it('does not collapse non-task entries that share taskId=""', () => {
    const fakeTs = { toDate: () => new Date('2026-05-29') };
    mockOnSnapshot.mockImplementation((_ref: unknown, cb: CollSnapshotCallback) => {
      cb({
        docs: [
          {
            id:   'streak-1',
            data: () => ({
              taskId: '', taskTitle: '3-day streak', awardedAt: fakeTs,
              points: 1, reason: 'streak_bonus',
            }),
          },
          {
            id:   'achievement-1',
            data: () => ({
              taskId: '', taskTitle: 'Achievement unlocked: first_brush', awardedAt: fakeTs,
              points: 5, reason: 'achievement_bonus',
            }),
          },
          {
            id:   'daily-1',
            data: () => ({
              taskId: '', taskTitle: 'Daily complete: 2026-05-29', awardedAt: fakeTs,
              points: 2, reason: 'daily_complete_bonus',
            }),
          },
        ],
      });
      return jest.fn();
    });

    const onUpdate = jest.fn();
    subscribeToPointsHistory('uid-1', onUpdate);

    // All three must be present — none collapsed despite sharing taskId:''
    const result = onUpdate.mock.calls[0][0] as unknown[];
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ id: 'streak-1',      reason: 'streak_bonus' });
    expect(result[1]).toMatchObject({ id: 'achievement-1', reason: 'achievement_bonus' });
    expect(result[2]).toMatchObject({ id: 'daily-1',       reason: 'daily_complete_bonus' });
  });

  it('returns an unsubscribe function', () => {
    const unsub = jest.fn();
    mockOnSnapshot.mockReturnValue(unsub);

    const stop = subscribeToPointsHistory('uid-1', jest.fn());
    stop();

    expect(unsub).toHaveBeenCalledTimes(1);
  });
});

// ─── awardPointsBatch (KAN-64) ────────────────────────────────────────────────

import { awardPointsBatch } from '../../src/services/firestore';

describe('awardPointsBatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no history doc exists yet for any entry (fresh award).
    mockTxGet.mockResolvedValue({ exists: () => false });
  });

  it('no-ops when entries array is empty', async () => {
    await awardPointsBatch('uid-1', []);
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('increments totalPoints by the sum of all entry points', async () => {
    await awardPointsBatch('uid-1', [
      { taskId: 't1', taskTitle: 'Task 1', points: 1 },
      { taskId: 't2', taskTitle: 'Task 2', points: 2 },
      { taskId: 't3', taskTitle: 'Task 3', points: 3 },
    ]);
    expect(mockTxUpdate).toHaveBeenCalledWith(
      expect.anything(),
      { totalPoints: mockIncrement(6) },
    );
  });

  it('calls tx.set once per entry', async () => {
    await awardPointsBatch('uid-1', [
      { taskId: 't1', taskTitle: 'Task A', points: 1 },
      { taskId: 't2', taskTitle: 'Task B', points: 1 },
    ]);
    expect(mockTxSet).toHaveBeenCalledTimes(2);
  });

  it('each tx.set entry contains correct taskId, taskTitle and points', async () => {
    await awardPointsBatch('uid-1', [
      { taskId: 'task-x', taskTitle: 'Walk the dog', points: 5 },
    ]);
    expect(mockTxSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        taskId:    'task-x',
        taskTitle: 'Walk the dog',
        points:    5,
        reason:    'task_completed',
      }),
    );
  });

  it('rejects if the transaction rejects', async () => {
    mockRunTransaction.mockRejectedValueOnce(new Error('network error'));
    await expect(
      awardPointsBatch('uid-1', [{ taskId: 't1', taskTitle: 'Task', points: 1 }]),
    ).rejects.toThrow('network error');
  });

  it('uses a deterministic doc ID so calling twice is idempotent', async () => {
    const mockDoc = require('@react-native-firebase/firestore').doc as jest.Mock;
    mockDoc.mockClear();

    await awardPointsBatch('uid-1', [{ taskId: 'task-x', taskTitle: 'Buy milk', points: 1 }]);

    // doc() should have been called with a deterministic ID string (taskId + date)
    const callsWithId = mockDoc.mock.calls.filter(
      (args: unknown[]) => typeof args[args.length - 1] === 'string' &&
        (args[args.length - 1] as string).startsWith('task-x_'),
    );
    expect(callsWithId.length).toBeGreaterThanOrEqual(1);
  });

  it('skips an entry already awarded today and excludes it from the totalPoints increment', async () => {
    // t1 already has a history doc for today; t2 does not.
    mockTxGet
      .mockResolvedValueOnce({ exists: () => true })
      .mockResolvedValueOnce({ exists: () => false });

    await awardPointsBatch('uid-1', [
      { taskId: 't1', taskTitle: 'Already awarded', points: 5 },
      { taskId: 't2', taskTitle: 'New', points: 2 },
    ]);

    expect(mockTxSet).toHaveBeenCalledTimes(1);
    expect(mockTxSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ taskId: 't2', points: 2 }),
    );
    expect(mockTxUpdate).toHaveBeenCalledWith(
      expect.anything(),
      { totalPoints: mockIncrement(2) },
    );
  });

  it('does not touch totalPoints when every entry is already awarded', async () => {
    mockTxGet.mockResolvedValue({ exists: () => true });

    await awardPointsBatch('uid-1', [
      { taskId: 't1', taskTitle: 'Already awarded', points: 5 },
    ]);

    expect(mockTxSet).not.toHaveBeenCalled();
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });
});

// ─── KAN-63: Additional reason types ─────────────────────────────────────────

import {
  awardPointsAchievementBonus,
  awardPointsDailyCompleteBonus,
  awardPointsStreakBonus,
} from '../../src/services/firestore';

describe('awardPointsAchievementBonus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBatchCommit.mockResolvedValue(undefined);
  });

  it('increments totalPoints by the given amount', async () => {
    await awardPointsAchievementBonus('uid-1', 'first_task', 5);
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      { totalPoints: mockIncrement(5) },
    );
  });

  it('sets reason to achievement_bonus', async () => {
    await awardPointsAchievementBonus('uid-1', 'first_task', 5);
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ reason: 'achievement_bonus' }),
    );
  });

  it('includes the achievement type in the title', async () => {
    await awardPointsAchievementBonus('uid-1', 'first_task', 5);
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ taskTitle: 'Achievement unlocked: first_task' }),
    );
  });

  it('calls batch.commit once', async () => {
    await awardPointsAchievementBonus('uid-1', 'first_task', 5);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('rejects if batch.commit rejects', async () => {
    mockBatchCommit.mockRejectedValueOnce(new Error('fail'));
    await expect(awardPointsAchievementBonus('uid-1', 'first_task', 5)).rejects.toThrow('fail');
  });
});

describe('awardPointsDailyCompleteBonus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBatchCommit.mockResolvedValue(undefined);
  });

  it('increments totalPoints by the given amount', async () => {
    await awardPointsDailyCompleteBonus('uid-1', '2026-06-03', 3);
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      { totalPoints: mockIncrement(3) },
    );
  });

  it('sets reason to daily_complete_bonus', async () => {
    await awardPointsDailyCompleteBonus('uid-1', '2026-06-03', 3);
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ reason: 'daily_complete_bonus' }),
    );
  });

  it('includes the date in the title', async () => {
    await awardPointsDailyCompleteBonus('uid-1', '2026-06-03', 3);
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ taskTitle: 'Daily complete: 2026-06-03' }),
    );
  });

  it('calls batch.commit once', async () => {
    await awardPointsDailyCompleteBonus('uid-1', '2026-06-03', 3);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('rejects if batch.commit rejects', async () => {
    mockBatchCommit.mockRejectedValueOnce(new Error('fail'));
    await expect(awardPointsDailyCompleteBonus('uid-1', '2026-06-03', 3)).rejects.toThrow('fail');
  });
});

describe('awardPointsStreakBonus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBatchCommit.mockResolvedValue(undefined);
  });

  it('increments totalPoints by the given amount', async () => {
    await awardPointsStreakBonus('uid-1', 7, 2);
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      { totalPoints: mockIncrement(2) },
    );
  });

  it('sets reason to streak_bonus', async () => {
    await awardPointsStreakBonus('uid-1', 7, 2);
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ reason: 'streak_bonus' }),
    );
  });

  it('includes the streak length in the title', async () => {
    await awardPointsStreakBonus('uid-1', 7, 2);
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ taskTitle: '7-day streak' }),
    );
  });

  it('calls batch.commit once', async () => {
    await awardPointsStreakBonus('uid-1', 7, 2);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('rejects if batch.commit rejects', async () => {
    mockBatchCommit.mockRejectedValueOnce(new Error('fail'));
    await expect(awardPointsStreakBonus('uid-1', 7, 2)).rejects.toThrow('fail');
  });
});
