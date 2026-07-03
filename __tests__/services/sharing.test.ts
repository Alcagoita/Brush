/**
 * KAN-86 — sharing service unit tests.
 *
 * Covers:
 *   - findUserByEmail returns user summary on match
 *   - findUserByEmail returns null when no match
 *   - findUserByEmail returns null for empty input
 *   - sendSharedTask writes the incoming record via one atomic batch
 *   - sendSharedTask does not write pendingNotifications directly (KAN-221 —
 *     moved server-side to the onSharedTaskCreated Cloud Function)
 *   - sendSharedTask throws CANNOT_SEND_TO_SELF
 *   - acceptSharedTask writes task and deletes incoming record
 *   - declineSharedTask deletes incoming record
 */

import {
  findUserByEmail,
  sendSharedTask,
  acceptSharedTask,
  declineSharedTask,
} from '../../src/services/sharing';
import { Task } from '../../src/types';

// ─── Firestore mock ───────────────────────────────────────────────────────────

const mockGetDocs     = jest.fn();
const mockAddDoc      = jest.fn();
const mockDeleteDoc   = jest.fn();
const mockCollection  = jest.fn(() => ({ _type: 'collection' }));
const mockBatchSet    = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn();
const mockWriteBatch  = jest.fn(() => ({
  set:    mockBatchSet,
  delete: mockBatchDelete,
  commit: mockBatchCommit,
}));

function mockDoc(...args: unknown[]) {
  // doc(collectionRef) — auto-generated ID (no path segments passed).
  // doc(db, ...segments) — explicit path; last segment doubles as the id.
  const segments = args.slice(1).filter((a): a is string => typeof a === 'string');
  const id = segments.length > 0 ? segments[segments.length - 1] : 'generated-id';
  return { id, _path: segments.length > 0 ? segments.join('/') : id };
}

jest.mock('@react-native-firebase/firestore', () => {
  const qFn = jest.fn((...args: unknown[]) => args);

  return {
    getFirestore:    jest.fn(() => ({})),
    collection:      (...args: unknown[]) => mockCollection(...args),
    doc:             (...args: unknown[]) => mockDoc(...args),
    query:           qFn,
    where:           jest.fn((...args: unknown[]) => args),
    addDoc:          (...args: unknown[]) => mockAddDoc(...args),
    deleteDoc:       (...args: unknown[]) => mockDeleteDoc(...args),
    getDocs:         (...args: unknown[]) => mockGetDocs(...args),
    onSnapshot:      jest.fn(),
    serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
    writeBatch:      () => mockWriteBatch(),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id:        'task-abc',
    title:     'Buy groceries',
    category:  'errands',
    done:      false,
    date:      '2026-06-10',
    createdAt: { seconds: 0, nanoseconds: 0 } as unknown as Task['createdAt'],
    ...overrides,
  } as Task;
}

// ─── findUserByEmail ──────────────────────────────────────────────────────────

describe('findUserByEmail', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns user summary when email matches', async () => {
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs:  [{
        id:   'uid-recipient',
        data: () => ({ displayName: 'Alice', email: 'alice@example.com' }),
      }],
    });

    const result = await findUserByEmail('alice@example.com');
    expect(result).toEqual({ uid: 'uid-recipient', displayName: 'Alice', email: 'alice@example.com' });
  });

  it('normalises email to lowercase before querying', async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });
    await findUserByEmail('ALICE@EXAMPLE.COM');
    // where() is called with the lowercased email.
    const firestoreMod = jest.requireMock('@react-native-firebase/firestore');
    expect(firestoreMod.where).toHaveBeenCalledWith('email', '==', 'alice@example.com');
  });

  it('returns null when no user is found', async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });
    const result = await findUserByEmail('unknown@example.com');
    expect(result).toBeNull();
  });

  it('returns null for empty input without querying Firestore', async () => {
    const result = await findUserByEmail('   ');
    expect(result).toBeNull();
    expect(mockGetDocs).not.toHaveBeenCalled();
  });
});

// ─── sendSharedTask ───────────────────────────────────────────────────────────

describe('sendSharedTask', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws CANNOT_SEND_TO_SELF when sender and recipient are the same', async () => {
    await expect(
      sendSharedTask({
        senderUid:     'uid-me',
        senderName:    'Me',
        recipientUid:  'uid-me',
        recipientName: 'Me',
        task:          makeTask(),
      }),
    ).rejects.toThrow('CANNOT_SEND_TO_SELF');
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('writes the incoming record via a single batch.set call', async () => {
    const id = await sendSharedTask({
      senderUid:     'uid-sender',
      senderName:    'Bob',
      recipientUid:  'uid-recipient',
      recipientName: 'Alice',
      task:          makeTask({ id: 'task-abc', title: 'Buy groceries' }),
    });

    expect(id).toBe('generated-id');
    expect(mockBatchSet).toHaveBeenCalledTimes(1);

    const [, payload] = mockBatchSet.mock.calls[0];
    expect(payload).toMatchObject({
      taskId:     'task-abc',
      title:      'Buy groceries',
      category:   'errands',
      sentBy:     'uid-sender',
      sentByName: 'Bob',
      status:     'pending',
    });
  });

  it('does not write directly to pendingNotifications (KAN-221)', async () => {
    await sendSharedTask({
      senderUid:     'uid-sender',
      senderName:    'Bob',
      recipientUid:  'uid-recipient',
      recipientName: 'Alice',
      task:          makeTask(),
    });

    // The shared_task pendingNotification is now written server-side by the
    // onSharedTaskCreated Cloud Function, triggered off the incoming record —
    // the client must not write to another user's mailbox directly.
    expect(mockCollection).not.toHaveBeenCalledWith(
      expect.anything(), 'pendingNotifications', expect.anything(), 'items',
    );
    expect(mockBatchSet).toHaveBeenCalledTimes(1);
  });

  it('deletes the task from the sender via the same batch', async () => {
    await sendSharedTask({
      senderUid:     'uid-sender',
      senderName:    'Bob',
      recipientUid:  'uid-recipient',
      recipientName: 'Alice',
      task:          makeTask({ id: 'task-abc' }),
    });

    expect(mockBatchDelete).toHaveBeenCalledTimes(1);
    const [deletedRef] = mockBatchDelete.mock.calls[0];
    expect(deletedRef._path).toBe('users/uid-sender/tasks/task-abc');
  });

  it('commits exactly one batch', async () => {
    await sendSharedTask({
      senderUid:     'uid-sender',
      senderName:    'Bob',
      recipientUid:  'uid-recipient',
      recipientName: 'Alice',
      task:          makeTask(),
    });
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  // ── KAN-101: senderUsername ──────────────────────────────────────────────────

  it('includes sentByUsername in the record when provided (KAN-101)', async () => {
    await sendSharedTask({
      senderUid: 'uid-a', senderName: 'Alice', senderUsername: 'alice',
      recipientUid: 'uid-b', recipientName: 'Bob',
      task: makeTask(),
    });
    const [, payload] = mockBatchSet.mock.calls[0];
    expect(payload.sentByUsername).toBe('alice');
  });

  it('omits sentByUsername when not provided (KAN-101)', async () => {
    await sendSharedTask({
      senderUid: 'uid-a', senderName: 'Alice',
      recipientUid: 'uid-b', recipientName: 'Bob',
      task: makeTask(),
    });
    const [, payload] = mockBatchSet.mock.calls[0];
    expect(payload).not.toHaveProperty('sentByUsername');
  });

  it('includes poi in the record when the task has one', async () => {
    await sendSharedTask({
      senderUid:     'uid-a',
      senderName:    'A',
      recipientUid:  'uid-b',
      recipientName: 'B',
      task:          makeTask({ poi: 'supermarket' }),
    });

    const [, payload] = mockBatchSet.mock.calls[0];
    expect(payload.poi).toBe('supermarket');
  });

  it('omits poi when the task has none', async () => {
    await sendSharedTask({
      senderUid:     'uid-a',
      senderName:    'A',
      recipientUid:  'uid-b',
      recipientName: 'B',
      task:          makeTask({ poi: undefined }),
    });

    const [, payload] = mockBatchSet.mock.calls[0];
    expect(payload).not.toHaveProperty('poi');
  });
});

// ─── acceptSharedTask ─────────────────────────────────────────────────────────

describe('acceptSharedTask', () => {
  beforeEach(() => jest.clearAllMocks());

  it('writes the task to the recipient collection and deletes incoming', async () => {
    mockAddDoc.mockResolvedValueOnce({ id: 'new-task-id' });
    mockDeleteDoc.mockResolvedValueOnce(undefined);

    const shared = {
      id:         'incoming-123',
      taskId:     'task-abc',
      title:      'Buy groceries',
      category:   'errands',
      sentBy:     'uid-sender',
      sentByName: 'Bob',
      sentAt:     { seconds: 0, nanoseconds: 0 } as unknown as ReturnType<typeof Date.now>,
      status:     'pending' as const,
    };

    await acceptSharedTask('uid-recipient', shared as never);

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const [, payload] = mockAddDoc.mock.calls[0];
    expect(payload).toMatchObject({ title: 'Buy groceries', category: 'errands', done: false });

    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});

// ─── declineSharedTask ────────────────────────────────────────────────────────

describe('declineSharedTask', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes the incoming record and nothing else', async () => {
    mockDeleteDoc.mockResolvedValueOnce(undefined);

    await declineSharedTask('uid-recipient', 'incoming-123');

    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    expect(mockAddDoc).not.toHaveBeenCalled();
  });
});
