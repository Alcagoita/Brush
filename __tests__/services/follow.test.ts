/**
 * Unit tests for the follow system (KAN-98).
 *
 * Covers:
 *   followUser
 *     - throws cannot_follow_self when follower === followed
 *     - writes following entry with correct shape
 *     - writes followers entry with correct shape
 *     - increments followingCount on follower doc (set-merge)
 *     - increments followersCount on followed doc (set-merge)
 *     - commits one atomic batch
 *   unfollowUser
 *     - deletes both subcollection entries
 *     - decrements followingCount and followersCount
 *     - commits one atomic batch
 *   isFollowing
 *     - returns true when the following document exists
 *     - returns false when the document does not exist
 *   subscribeToFollowing
 *     - maps snapshot docs to FollowEntry objects (uid from doc id)
 *     - returns an unsubscribe function
 *   subscribeToFollowers
 *     - maps snapshot docs to FollowEntry objects (uid from doc id)
 *     - returns an unsubscribe function
 */

// ─── Firestore mock ───────────────────────────────────────────────────────────

const mockBatchSet    = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn();
const mockWriteBatch  = jest.fn(() => ({
  set:    mockBatchSet,
  delete: mockBatchDelete,
  commit: mockBatchCommit,
}));

const mockGetDoc     = jest.fn();
const mockOnSnapshot = jest.fn();

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore:    jest.fn(),
  collection:      jest.fn(() => ({ _type: 'collection' })),
  doc:             jest.fn((_db: unknown, ...segments: string[]) => ({ _path: segments.join('/') })),
  addDoc:          jest.fn(),
  getDoc:          (...args: unknown[]) => mockGetDoc(...args),
  updateDoc:       jest.fn(),
  setDoc:          jest.fn(),
  writeBatch:      () => mockWriteBatch(),
  getDocs:         jest.fn(),
  query:           jest.fn(coll => coll),
  where:           jest.fn(),
  orderBy:         jest.fn(),
  onSnapshot:      (...args: unknown[]) => mockOnSnapshot(...args),
  serverTimestamp: jest.fn(() => ({ _serverTimestamp: true })),
  increment:       jest.fn((n: number) => ({ _increment: n })),
  Timestamp:       { now: jest.fn() },
  deleteDoc:       jest.fn(),
}));

import {
  followUser,
  unfollowUser,
  isFollowing,
  subscribeToFollowing,
  subscribeToFollowers,
} from '../../src/services/firestore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSnap(exists: boolean, data?: object) {
  return { exists: () => exists, data: () => data };
}

function makeCollSnap(docs: Array<{ id: string; data: object }>) {
  return { docs: docs.map(d => ({ id: d.id, data: () => d.data })) };
}

// ─── followUser ───────────────────────────────────────────────────────────────

describe('followUser', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('throws cannot_follow_self when follower equals followed', async () => {
    await expect(
      followUser('uid1', 'alice', 'Alice', 'uid1', 'alice', 'Alice'),
    ).rejects.toThrow('cannot_follow_self');
  });

  it('writes the following entry under the follower doc', async () => {
    await followUser('uid_a', 'alice', 'Alice', 'uid_b', 'bob', 'Bob');

    const followingCall = mockBatchSet.mock.calls.find(
      ([ref]) => ref._path.includes('uid_a/following/uid_b'),
    );
    expect(followingCall).toBeDefined();
    expect(followingCall[1]).toMatchObject({ username: 'bob', displayName: 'Bob' });
  });

  it('writes the followers entry under the followed doc', async () => {
    await followUser('uid_a', 'alice', 'Alice', 'uid_b', 'bob', 'Bob');

    const followersCall = mockBatchSet.mock.calls.find(
      ([ref]) => ref._path.includes('uid_b/followers/uid_a'),
    );
    expect(followersCall).toBeDefined();
    expect(followersCall[1]).toMatchObject({ username: 'alice', displayName: 'Alice' });
  });

  it('increments followingCount on the follower user doc', async () => {
    await followUser('uid_a', 'alice', 'Alice', 'uid_b', 'bob', 'Bob');

    const countCall = mockBatchSet.mock.calls.find(
      ([ref, data]) => ref._path === 'users/uid_a' && data.followingCount,
    );
    expect(countCall).toBeDefined();
    expect(countCall[1].followingCount).toEqual({ _increment: 1 });
    expect(countCall[2]).toEqual({ merge: true });
  });

  it('increments followersCount on the followed user doc', async () => {
    await followUser('uid_a', 'alice', 'Alice', 'uid_b', 'bob', 'Bob');

    const countCall = mockBatchSet.mock.calls.find(
      ([ref, data]) => ref._path === 'users/uid_b' && data.followersCount,
    );
    expect(countCall).toBeDefined();
    expect(countCall[1].followersCount).toEqual({ _increment: 1 });
  });

  it('commits exactly one batch', async () => {
    await followUser('uid_a', 'alice', 'Alice', 'uid_b', 'bob', 'Bob');
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });
});

// ─── unfollowUser ─────────────────────────────────────────────────────────────

describe('unfollowUser', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('deletes the following entry', async () => {
    await unfollowUser('uid_a', 'uid_b');
    const deleted = mockBatchDelete.mock.calls.map(([ref]) => ref._path);
    expect(deleted.some(p => p.includes('uid_a/following/uid_b'))).toBe(true);
  });

  it('deletes the followers entry', async () => {
    await unfollowUser('uid_a', 'uid_b');
    const deleted = mockBatchDelete.mock.calls.map(([ref]) => ref._path);
    expect(deleted.some(p => p.includes('uid_b/followers/uid_a'))).toBe(true);
  });

  it('decrements followingCount and followersCount', async () => {
    await unfollowUser('uid_a', 'uid_b');
    const setCalls = mockBatchSet.mock.calls;
    const followerCountCall = setCalls.find(([ref, data]) => ref._path === 'users/uid_a' && data.followingCount);
    const followedCountCall = setCalls.find(([ref, data]) => ref._path === 'users/uid_b' && data.followersCount);
    expect(followerCountCall[1].followingCount).toEqual({ _increment: -1 });
    expect(followedCountCall[1].followersCount).toEqual({ _increment: -1 });
  });

  it('commits exactly one batch', async () => {
    await unfollowUser('uid_a', 'uid_b');
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });
});

// ─── isFollowing ─────────────────────────────────────────────────────────────

describe('isFollowing', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns true when the following document exists', async () => {
    mockGetDoc.mockResolvedValueOnce(makeSnap(true));
    await expect(isFollowing('uid_a', 'uid_b')).resolves.toBe(true);
  });

  it('returns false when the document does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce(makeSnap(false));
    await expect(isFollowing('uid_a', 'uid_b')).resolves.toBe(false);
  });
});

// ─── subscribeToFollowing ─────────────────────────────────────────────────────

describe('subscribeToFollowing', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('maps snapshot docs to FollowEntry objects with uid from doc id', () => {
    const onUpdate = jest.fn();
    mockOnSnapshot.mockImplementationOnce((_q: unknown, cb: Function) => {
      cb(makeCollSnap([
        { id: 'uid_b', data: { username: 'bob', displayName: 'Bob', followedAt: {} } },
      ]));
      return jest.fn();
    });

    subscribeToFollowing('uid_a', onUpdate);
    expect(onUpdate).toHaveBeenCalledWith([
      expect.objectContaining({ uid: 'uid_b', username: 'bob', displayName: 'Bob' }),
    ]);
  });

  it('returns an unsubscribe function', () => {
    const unsub = jest.fn();
    mockOnSnapshot.mockReturnValueOnce(unsub);
    const result = subscribeToFollowing('uid_a', jest.fn());
    expect(result).toBe(unsub);
  });
});

// ─── subscribeToFollowers ─────────────────────────────────────────────────────

describe('subscribeToFollowers', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('maps snapshot docs to FollowEntry objects with uid from doc id', () => {
    const onUpdate = jest.fn();
    mockOnSnapshot.mockImplementationOnce((_q: unknown, cb: Function) => {
      cb(makeCollSnap([
        { id: 'uid_c', data: { username: 'carol', displayName: 'Carol', followedAt: {} } },
      ]));
      return jest.fn();
    });

    subscribeToFollowers('uid_a', onUpdate);
    expect(onUpdate).toHaveBeenCalledWith([
      expect.objectContaining({ uid: 'uid_c', username: 'carol', displayName: 'Carol' }),
    ]);
  });

  it('returns an unsubscribe function', () => {
    const unsub = jest.fn();
    mockOnSnapshot.mockReturnValueOnce(unsub);
    const result = subscribeToFollowers('uid_a', jest.fn());
    expect(result).toBe(unsub);
  });
});
