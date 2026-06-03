/**
 * Unit tests for points & achievements helpers (KAN-30).
 *
 * Covers:
 *   awardPoint
 *     - uses a write batch (atomic — both writes commit or neither does)
 *     - batch.update increments totalPoints on the user document
 *     - batch.set adds a correctly shaped PointsHistoryEntry
 *     - batch.commit is called exactly once
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

const mockBatchUpdate  = jest.fn();
const mockBatchSet     = jest.fn();
const mockBatchCommit  = jest.fn();
const mockWriteBatch   = jest.fn(() => ({
  update: mockBatchUpdate,
  set:    mockBatchSet,
  commit: mockBatchCommit,
}));

const mockGetDoc      = jest.fn();
const mockSetDoc      = jest.fn();
const mockOnSnapshot  = jest.fn();
const mockIncrement   = jest.fn((n: number) => ({ _increment: n }));
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
  beforeEach(() => {
    mockBatchCommit.mockResolvedValue(undefined);
  });

  it('uses a write batch (creates one batch per call)', async () => {
    await awardPoint('uid-1', 'task-abc', 'Buy milk');
    expect(mockWriteBatch).toHaveBeenCalledTimes(1);
  });

  it('batch.update increments totalPoints on the user document', async () => {
    await awardPoint('uid-1', 'task-abc', 'Buy milk');

    expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      { totalPoints: expect.objectContaining({ _increment: 1 }) },
    );
  });

  it('batch.set adds a correctly shaped PointsHistoryEntry', async () => {
    await awardPoint('uid-1', 'task-abc', 'Buy milk');

    expect(mockBatchSet).toHaveBeenCalledTimes(1);
    expect(mockBatchSet).toHaveBeenCalledWith(
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

  it('calls batch.commit exactly once', async () => {
    await awardPoint('uid-1', 'task-abc', 'Buy milk');
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('rejects if batch.commit rejects (atomic — no partial writes)', async () => {
    mockBatchCommit.mockRejectedValue(new Error('Network error'));
    await expect(awardPoint('uid-1', 'task-abc', 'Buy milk')).rejects.toThrow('Network error');
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
    mockBatchCommit.mockResolvedValue(undefined);
  });

  it('no-ops when entries array is empty', async () => {
    await awardPointsBatch('uid-1', []);
    expect(mockWriteBatch).not.toHaveBeenCalled();
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('increments totalPoints by the sum of all entry points', async () => {
    await awardPointsBatch('uid-1', [
      { taskId: 't1', taskTitle: 'Task 1', points: 1 },
      { taskId: 't2', taskTitle: 'Task 2', points: 2 },
      { taskId: 't3', taskTitle: 'Task 3', points: 3 },
    ]);
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      { totalPoints: mockIncrement(6) },
    );
  });

  it('calls batch.set once per entry', async () => {
    await awardPointsBatch('uid-1', [
      { taskId: 't1', taskTitle: 'Task A', points: 1 },
      { taskId: 't2', taskTitle: 'Task B', points: 1 },
    ]);
    expect(mockBatchSet).toHaveBeenCalledTimes(2);
  });

  it('calls batch.commit exactly once', async () => {
    await awardPointsBatch('uid-1', [
      { taskId: 't1', taskTitle: 'Task A', points: 1 },
    ]);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('each batch.set entry contains correct taskId, taskTitle and points', async () => {
    await awardPointsBatch('uid-1', [
      { taskId: 'task-x', taskTitle: 'Walk the dog', points: 5 },
    ]);
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        taskId:    'task-x',
        taskTitle: 'Walk the dog',
        points:    5,
        reason:    'task_completed',
      }),
    );
  });

  it('rejects if batch.commit rejects', async () => {
    mockBatchCommit.mockRejectedValueOnce(new Error('network error'));
    await expect(
      awardPointsBatch('uid-1', [{ taskId: 't1', taskTitle: 'Task', points: 1 }]),
    ).rejects.toThrow('network error');
  });
});
