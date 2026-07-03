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
 *   getTotalPoints / getCurrentStreak (KAN-218 — one-shot, not live subscriptions)
 *     - returns 0 when the field is absent from the user doc
 *     - returns the stored number when present
 *   getAchievements (KAN-218)
 *     - returns {} when the user doc has no achievements field
 *     - returns the achievements map as stored
 *   getPointsHistory (KAN-218, cursor pagination KAN-222)
 *     - returns an empty page when the collection is empty
 *     - maps documents to PointsHistoryEntry objects (includes doc id)
 *     - deduplicates legacy entries within a page — keeps only the latest entry per taskId
 *     - does not collapse non-task entries that share taskId=""
 *     - returns a nextCursor (last doc) when the page is full, null otherwise
 *     - passes the cursor to startAfter when fetching a subsequent page
 *     - throws when uid does not match the authenticated user (KAN-222 review fix)
 */

// ─── Firestore mock ───────────────────────────────────────────────────────────

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
const mockGetDocs         = jest.fn();
const mockSetDoc          = jest.fn();
const mockIncrement       = jest.fn((n: number) => ({ _increment: n }));
const mockServerTimestamp = jest.fn(() => ({ _serverTimestamp: true }));

// getPointsHistory enforces uid === the authenticated user's uid — default to
// 'uid-1' to match the uid used throughout the existing test suite; individual
// tests override via mockGetAuth.mockReturnValueOnce(...) to exercise the guard.
const mockGetAuth = jest.fn(() => ({ currentUser: { uid: 'uid-1' } }));
jest.mock('@react-native-firebase/auth', () => ({
  getAuth: () => mockGetAuth(),
}));

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
  getDocs:         (...args: unknown[]) => mockGetDocs(...args),
  deleteDoc:       jest.fn(),
  query:           jest.fn((...a: unknown[]) => a[0]),
  where:           jest.fn(),
  orderBy:         jest.fn(),
  limit:           jest.fn((n: number) => ({ _limit: n })),
  startAfter:      jest.fn((cursor: unknown) => ({ _startAfter: cursor })),
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
  getTotalPoints,
  getCurrentStreak,
  getAchievements,
  getPointsHistory,
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

describe('getTotalPoints / getCurrentStreak (KAN-218 — one-shot, not live subscriptions)', () => {
  it('getTotalPoints returns 0 when the field is absent from the user doc', async () => {
    mockGetDoc.mockResolvedValueOnce({ data: () => ({ uid: 'uid-1' }), exists: () => true });
    expect(await getTotalPoints('uid-1')).toBe(0);
  });

  it('getTotalPoints returns the stored number when present', async () => {
    mockGetDoc.mockResolvedValueOnce({ data: () => ({ totalPoints: 7 }), exists: () => true });
    expect(await getTotalPoints('uid-1')).toBe(7);
  });

  it('getCurrentStreak returns 0 when the field is absent from the user doc', async () => {
    mockGetDoc.mockResolvedValueOnce({ data: () => ({ uid: 'uid-1' }), exists: () => true });
    expect(await getCurrentStreak('uid-1')).toBe(0);
  });

  it('getCurrentStreak returns the stored number when present', async () => {
    mockGetDoc.mockResolvedValueOnce({ data: () => ({ currentStreak: 4 }), exists: () => true });
    expect(await getCurrentStreak('uid-1')).toBe(4);
  });
});

// ─── getAchievements (KAN-218) ────────────────────────────────────────────────

describe('getAchievements', () => {
  it('returns {} when the user doc has no achievements field', async () => {
    mockGetDoc.mockResolvedValueOnce({ data: () => ({ uid: 'uid-1' }), exists: () => true });
    expect(await getAchievements('uid-1')).toEqual({});
  });

  it('returns the achievements map as stored on the user doc', async () => {
    const map = { first_task: { earnedAt: null, earnCount: 1, progress: 1, target: 1 } };
    mockGetDoc.mockResolvedValueOnce({ data: () => ({ achievements: map }), exists: () => true });
    expect(await getAchievements('uid-1')).toEqual(map);
  });
});

// ─── getPointsHistory (KAN-218, cursor pagination KAN-222) ───────────────────

describe('getPointsHistory', () => {
  it('returns an empty page when the collection is empty', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });
    expect(await getPointsHistory('uid-1', 20)).toEqual({ entries: [], nextCursor: null });
  });

  it('maps documents to PointsHistoryEntry objects including doc id', async () => {
    const fakeTs = { toDate: () => new Date('2026-05-29') };
    const docs = [
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
    ];
    mockGetDocs.mockResolvedValueOnce({ docs });

    const result = await getPointsHistory('uid-1', 20);

    expect(result.entries).toEqual([
      { id: 'hist-2', taskId: 'task-2', taskTitle: 'Pick up meds', awardedAt: fakeTs, points: 1, reason: 'task_completed' },
      { id: 'hist-1', taskId: 'task-1', taskTitle: 'Buy milk',     awardedAt: fakeTs, points: 1, reason: 'task_completed' },
    ]);
    // Fewer docs than pageSize — no more pages.
    expect(result.nextCursor).toBeNull();
  });

  it('deduplicates legacy entries within a page — keeps only the latest entry per taskId (KAN-128)', async () => {
    const olderTs = { toDate: () => new Date('2026-05-28') };
    const newerTs = { toDate: () => new Date('2026-05-29') };
    // Docs arrive ordered newest-first (as Firestore orderBy awardedAt desc guarantees).
    mockGetDocs.mockResolvedValueOnce({
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

    const { entries } = await getPointsHistory('uid-1', 20);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ id: 'task-1_2026-05-29', taskId: 'task-1' });
    expect(entries[1]).toMatchObject({ id: 'task-2_2026-05-29', taskId: 'task-2' });
  });

  it('does not collapse non-task entries that share taskId=""', async () => {
    const fakeTs = { toDate: () => new Date('2026-05-29') };
    mockGetDocs.mockResolvedValueOnce({
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

    // All three must be present — none collapsed despite sharing taskId:''
    const { entries } = await getPointsHistory('uid-1', 20);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({ id: 'streak-1',      reason: 'streak_bonus' });
    expect(entries[1]).toMatchObject({ id: 'achievement-1', reason: 'achievement_bonus' });
    expect(entries[2]).toMatchObject({ id: 'daily-1',       reason: 'daily_complete_bonus' });
  });

  it('returns a nextCursor (the last doc) when the page is exactly full', async () => {
    const fakeTs = { toDate: () => new Date('2026-05-29') };
    const lastDoc = {
      id:   'hist-2',
      data: () => ({
        taskId: 'task-2', taskTitle: 'Pick up meds', awardedAt: fakeTs,
        points: 1, reason: 'task_completed',
      }),
    };
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        {
          id:   'hist-1',
          data: () => ({
            taskId: 'task-1', taskTitle: 'Buy milk', awardedAt: fakeTs,
            points: 1, reason: 'task_completed',
          }),
        },
        lastDoc,
      ],
    });

    const result = await getPointsHistory('uid-1', 2);
    expect(result.nextCursor).toBe(lastDoc);
  });

  it('passes the cursor to startAfter when fetching a subsequent page', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });
    const cursor = { id: 'hist-2' };

    await getPointsHistory('uid-1', 20, cursor as never);

    expect(mockGetDocs).toHaveBeenCalled();
    const { startAfter } = jest.requireMock('@react-native-firebase/firestore') as {
      startAfter: jest.Mock;
    };
    expect(startAfter).toHaveBeenCalledWith(cursor);
  });

  it('throws when uid does not match the authenticated user', async () => {
    mockGetAuth.mockReturnValueOnce({ currentUser: { uid: 'someone-else' } });

    await expect(getPointsHistory('uid-1', 20)).rejects.toThrow(
      'getPointsHistory: uid must match the authenticated user',
    );
    expect(mockGetDocs).not.toHaveBeenCalled();
  });

  it('throws when there is no authenticated user', async () => {
    mockGetAuth.mockReturnValueOnce({ currentUser: null });

    await expect(getPointsHistory('uid-1', 20)).rejects.toThrow(
      'getPointsHistory: uid must match the authenticated user',
    );
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
