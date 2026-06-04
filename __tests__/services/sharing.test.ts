/**
 * KAN-86 — sharing service unit tests.
 *
 * Covers:
 *   - findUserByEmail returns user summary on match
 *   - findUserByEmail returns null when no match
 *   - findUserByEmail returns null for empty input
 *   - sendSharedTask writes incoming record and pending notification
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

const mockGetDocs    = jest.fn();
const mockAddDoc     = jest.fn();
const mockDeleteDoc  = jest.fn();

jest.mock('@react-native-firebase/firestore', () => {
  const col  = jest.fn().mockReturnThis();
  const docFn = jest.fn().mockReturnThis();
  const qFn  = jest.fn((...args: unknown[]) => args);

  return {
    getFirestore:    jest.fn(() => ({})),
    collection:      col,
    doc:             docFn,
    query:           qFn,
    where:           jest.fn((...args: unknown[]) => args),
    addDoc:          (...args: unknown[]) => mockAddDoc(...args),
    deleteDoc:       (...args: unknown[]) => mockDeleteDoc(...args),
    getDocs:         (...args: unknown[]) => mockGetDocs(...args),
    onSnapshot:      jest.fn(),
    serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
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
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('writes the incoming record and a pending notification', async () => {
    mockAddDoc
      .mockResolvedValueOnce({ id: 'incoming-123' }) // incoming record
      .mockResolvedValueOnce({ id: 'notif-456' });   // pending notification

    const id = await sendSharedTask({
      senderUid:     'uid-sender',
      senderName:    'Bob',
      recipientUid:  'uid-recipient',
      recipientName: 'Alice',
      task:          makeTask({ id: 'task-abc', title: 'Buy groceries' }),
    });

    expect(id).toBe('incoming-123');
    expect(mockAddDoc).toHaveBeenCalledTimes(2);

    // First call: incoming record
    const [, incomingPayload] = mockAddDoc.mock.calls[0];
    expect(incomingPayload).toMatchObject({
      taskId:     'task-abc',
      title:      'Buy groceries',
      category:   'errands',
      sentBy:     'uid-sender',
      sentByName: 'Bob',
      status:     'pending',
    });

    // Second call: pending notification
    const [, notifPayload] = mockAddDoc.mock.calls[1];
    expect(notifPayload).toMatchObject({
      type:  'shared_task',
      title: 'Bob sent you a task',
      body:  'Buy groceries',
    });
  });

  it('includes poi in the record when the task has one', async () => {
    mockAddDoc.mockResolvedValue({ id: 'x' });

    await sendSharedTask({
      senderUid:     'uid-a',
      senderName:    'A',
      recipientUid:  'uid-b',
      recipientName: 'B',
      task:          makeTask({ poi: 'supermarket' }),
    });

    const [, payload] = mockAddDoc.mock.calls[0];
    expect(payload.poi).toBe('supermarket');
  });

  it('omits poi when the task has none', async () => {
    mockAddDoc.mockResolvedValue({ id: 'x' });

    await sendSharedTask({
      senderUid:     'uid-a',
      senderName:    'A',
      recipientUid:  'uid-b',
      recipientName: 'B',
      task:          makeTask({ poi: undefined }),
    });

    const [, payload] = mockAddDoc.mock.calls[0];
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
