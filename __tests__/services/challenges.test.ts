/**
 * Unit tests for challenges service (KAN-102).
 *
 * Covers:
 *   createChallenge
 *     - throws CHALLENGE_NO_PARTICIPANTS when participant list is empty
 *     - writes challenge document with correct shape (goal-based)
 *     - writes challenge document with correct shape (time-based)
 *     - creator participant has status 'accepted'
 *     - other participants have status 'pending'
 *     - does not write pendingNotifications directly (KAN-221 — moved
 *       server-side to the onChallengeNotifications Cloud Function)
 *     - includes message when provided, omits when not
 *   updateParticipantStatus
 *     - calls updateDoc with correct field path
 */

// ─── External mocks ──────────────────────────────────────────────────────────

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: { createChannel: jest.fn(), displayNotification: jest.fn() },
  AndroidImportance: { HIGH: 4 },
}));

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

jest.mock('../../src/services/achievements', () => ({
  awardChallengeWinnerAchievement: jest.fn().mockResolvedValue(undefined),
}));

// ─── Firestore mock ───────────────────────────────────────────────────────────

const mockAddDoc    = jest.fn();
const mockUpdateDoc = jest.fn();

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore:    jest.fn(),
  collection:      jest.fn((_db: unknown, ...segs: string[]) => ({ _path: segs.join('/') })),
  doc:             jest.fn((_db: unknown, ...segs: string[]) => ({ _path: segs.join('/') })),
  addDoc:          (...args: unknown[]) => mockAddDoc(...args),
  updateDoc:       (...args: unknown[]) => mockUpdateDoc(...args),
  onSnapshot:      jest.fn(() => jest.fn()),
  query:           jest.fn(coll => coll),
  where:           jest.fn(),
  orderBy:         jest.fn(),
  serverTimestamp: jest.fn(() => ({ _serverTimestamp: true })),
  Timestamp:       {
    fromDate: (d: Date) => ({ _seconds: Math.floor(d.getTime() / 1000) }),
  },
  increment:       jest.fn((n: number) => ({ _increment: n })),
}));

import {
  createChallenge,
  updateParticipantStatus,
} from '../../src/services/challenges';
import type { FollowEntry } from '../../src/types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ALICE: FollowEntry = {
  uid: 'uid-alice', username: 'alice', displayName: 'Alice',
  followedAt: { toDate: () => new Date() } as any,
};
const BOB: FollowEntry = {
  uid: 'uid-bob', username: 'bob', displayName: 'Bob',
  followedAt: { toDate: () => new Date() } as any,
};

const BASE_PARAMS = {
  creatorUid: 'uid-me', creatorUsername: 'me', creatorName: 'Me',
};

// ─── createChallenge ──────────────────────────────────────────────────────────

describe('createChallenge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddDoc.mockResolvedValue({ id: 'challenge-1' });
  });

  it('throws when participant list is empty', async () => {
    await expect(createChallenge({
      ...BASE_PARAMS, type: 'goal', goalCount: 10, participants: [],
    })).rejects.toThrow('CHALLENGE_NO_PARTICIPANTS');
  });

  it('writes a goal-based challenge document', async () => {
    await createChallenge({ ...BASE_PARAMS, type: 'goal', goalCount: 10, participants: [ALICE] });
    const [, data] = mockAddDoc.mock.calls[0];
    expect(data.type).toBe('goal');
    expect(data.goalCount).toBe(10);
    expect(data.status).toBe('pending');
    expect(data.createdBy).toBe('uid-me');
  });

  it('writes a time-based challenge document with deadline Timestamp', async () => {
    const deadline = new Date('2026-07-01T12:00:00Z');
    await createChallenge({ ...BASE_PARAMS, type: 'time', deadline, participants: [ALICE] });
    const [, data] = mockAddDoc.mock.calls[0];
    expect(data.type).toBe('time');
    expect(data.deadline).toBeDefined();
    expect(data.goalCount).toBeUndefined();
  });

  it('sets creator participant status to accepted', async () => {
    await createChallenge({ ...BASE_PARAMS, type: 'goal', goalCount: 5, participants: [ALICE] });
    const [, data] = mockAddDoc.mock.calls[0];
    expect(data.participants['uid-me'].status).toBe('accepted');
  });

  it('sets other participants status to pending', async () => {
    await createChallenge({ ...BASE_PARAMS, type: 'goal', goalCount: 5, participants: [ALICE, BOB] });
    const [, data] = mockAddDoc.mock.calls[0];
    expect(data.participants['uid-alice'].status).toBe('pending');
    expect(data.participants['uid-bob'].status).toBe('pending');
  });

  it('writes exactly one document — the challenge itself (no direct notifications)', async () => {
    await createChallenge({ ...BASE_PARAMS, type: 'goal', goalCount: 5, participants: [ALICE, BOB] });
    // The invite notification for each non-creator participant is now written
    // server-side by the onChallengeNotifications Cloud Function (KAN-221),
    // triggered off this document's creation — the client only writes the
    // challenge doc itself.
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
  });

  it('includes message in challenge doc when provided', async () => {
    await createChallenge({ ...BASE_PARAMS, type: 'goal', goalCount: 5, participants: [ALICE], message: 'gl hf' });
    const [, data] = mockAddDoc.mock.calls[0];
    expect(data.message).toBe('gl hf');
  });

  it('omits message field when not provided', async () => {
    await createChallenge({ ...BASE_PARAMS, type: 'goal', goalCount: 5, participants: [ALICE] });
    const [, data] = mockAddDoc.mock.calls[0];
    expect(data).not.toHaveProperty('message');
  });
});

// ─── updateParticipantStatus ──────────────────────────────────────────────────

describe('updateParticipantStatus', () => {
  beforeEach(() => { jest.clearAllMocks(); mockUpdateDoc.mockResolvedValue(undefined); });

  it('updates the correct field path for accepted status', async () => {
    await updateParticipantStatus('challenge-1', 'uid-alice', 'accepted');
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { 'participants.uid-alice.status': 'accepted' },
    );
  });

  it('updates the correct field path for declined status', async () => {
    await updateParticipantStatus('challenge-1', 'uid-alice', 'declined');
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { 'participants.uid-alice.status': 'declined' },
    );
  });
});
