/**
 * Unit tests for username helpers (KAN-97).
 *
 * Covers:
 *   validateUsername
 *     - rejects strings shorter than 3 characters
 *     - rejects strings longer than 20 characters
 *     - rejects strings with uppercase letters
 *     - rejects strings with spaces or special characters
 *     - accepts valid usernames (lowercase, digits, underscores)
 *     - returns null for a valid username
 *   checkUsernameAvailable
 *     - returns true when the usernames document does not exist
 *     - returns false when the usernames document exists
 *   claimUsername
 *     - writes to usernames/{username} index with { uid }
 *     - writes to users/{uid} with username and usernameUpdatedAt via set-merge
 *     - commits the batch atomically
 *   updateUsername
 *     - throws username_cooldown error when cooldown has not expired
 *     - deletes old username index entry when one exists
 *     - claims the new username and updates the user document
 *   getUserByUsername
 *     - returns null when username is not in index
 *     - fetches the user document for the uid stored in the index
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

const mockGetDoc = jest.fn();

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
  query:           jest.fn(),
  where:           jest.fn(),
  orderBy:         jest.fn(),
  onSnapshot:      jest.fn(),
  serverTimestamp: jest.fn(() => ({ _serverTimestamp: true })),
  increment:       jest.fn((n: number) => ({ _increment: n })),
  Timestamp:       { now: jest.fn() },
  deleteDoc:       jest.fn(),
}));

import {
  validateUsername,
  checkUsernameAvailable,
  claimUsername,
  updateUsername,
  getUserByUsername,
  USERNAME_MIN,
  USERNAME_MAX,
} from '../../src/services/firestore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSnap(exists: boolean, data?: object) {
  return { exists: () => exists, data: () => data };
}

// ─── validateUsername ─────────────────────────────────────────────────────────

describe('validateUsername', () => {
  it('rejects strings shorter than min length', () => {
    expect(validateUsername('ab')).not.toBeNull();
  });

  it('rejects strings longer than max length', () => {
    expect(validateUsername('a'.repeat(USERNAME_MAX + 1))).not.toBeNull();
  });

  it('rejects strings with uppercase letters', () => {
    expect(validateUsername('Hello')).not.toBeNull();
  });

  it('rejects strings with spaces', () => {
    expect(validateUsername('user name')).not.toBeNull();
  });

  it('rejects strings with special characters', () => {
    expect(validateUsername('user@name')).not.toBeNull();
    expect(validateUsername('user-name')).not.toBeNull();
  });

  it('accepts lowercase letters, digits, and underscores', () => {
    expect(validateUsername('cool_user123')).toBeNull();
    expect(validateUsername('abc')).toBeNull();
    expect(validateUsername('a'.repeat(USERNAME_MAX))).toBeNull();
  });
});

// ─── checkUsernameAvailable ──────────────────────────────────────────────────

describe('checkUsernameAvailable', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns true when the document does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce(makeSnap(false));
    await expect(checkUsernameAvailable('newuser')).resolves.toBe(true);
  });

  it('returns false when the document exists', async () => {
    mockGetDoc.mockResolvedValueOnce(makeSnap(true, { uid: 'uid123' }));
    await expect(checkUsernameAvailable('takenuser')).resolves.toBe(false);
  });
});

// ─── claimUsername ────────────────────────────────────────────────────────────

describe('claimUsername', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('writes to the username index with { uid } and set-merges the user document', async () => {
    await claimUsername('uid42', 'myhandle');

    expect(mockBatchSet).toHaveBeenCalledTimes(2);

    // First call: index document
    const [indexRef, indexData] = mockBatchSet.mock.calls[0];
    expect(indexRef._path).toContain('myhandle');
    expect(indexData).toEqual({ uid: 'uid42' });

    // Second call: user document with merge
    const [, userData, opts] = mockBatchSet.mock.calls[1];
    expect(userData.username).toBe('myhandle');
    expect(userData.usernameUpdatedAt).toEqual({ _serverTimestamp: true });
    expect(opts).toEqual({ merge: true });

    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });
});

// ─── updateUsername ───────────────────────────────────────────────────────────

describe('updateUsername', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  const recentTimestamp = {
    toDate: () => new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  };
  const oldTimestamp = {
    toDate: () => new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
  };

  it('throws a cooldown error when last update was within 30 days', async () => {
    // getUser inner getDoc call
    mockGetDoc.mockResolvedValueOnce(makeSnap(true, {
      uid: 'uid1',
      username: 'old',
      usernameUpdatedAt: recentTimestamp,
    }));

    await expect(updateUsername('uid1', 'newname')).rejects.toThrow(/username_cooldown:/);
  });

  it('deletes the old index entry, creates the new one, and updates the user doc', async () => {
    // getUser inner getDoc call
    mockGetDoc.mockResolvedValueOnce(makeSnap(true, {
      uid: 'uid1',
      username: 'oldname',
      usernameUpdatedAt: oldTimestamp,
    }));

    await updateUsername('uid1', 'newname');

    expect(mockBatchDelete).toHaveBeenCalledTimes(1);
    const [deletedRef] = mockBatchDelete.mock.calls[0];
    expect(deletedRef._path).toContain('oldname');

    expect(mockBatchSet).toHaveBeenCalledTimes(2);
    const [indexRef] = mockBatchSet.mock.calls[0];
    expect(indexRef._path).toContain('newname');

    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });
});

// ─── getUserByUsername ────────────────────────────────────────────────────────

describe('getUserByUsername', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('returns null when username is not in the index', async () => {
    mockGetDoc.mockResolvedValueOnce(makeSnap(false));
    await expect(getUserByUsername('ghost')).resolves.toBeNull();
  });

  it('fetches the user document for the uid stored in the index', async () => {
    const userData = { uid: 'uid99', displayName: 'Ghost', username: 'ghost' };
    mockGetDoc
      .mockResolvedValueOnce(makeSnap(true, { uid: 'uid99' })) // index snap
      .mockResolvedValueOnce(makeSnap(true, userData));          // user snap

    const result = await getUserByUsername('ghost');
    expect(result).toMatchObject(userData);
  });
});
