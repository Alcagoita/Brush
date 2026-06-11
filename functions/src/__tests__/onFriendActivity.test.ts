/**
 * KAN-125 — onFriendActivity helpers unit tests
 *
 * Tests the pure helpers and per-follower processFollower logic in isolation by
 * mocking firebase-admin. The Firestore trigger itself (onFriendActivity) is
 * exercised against the Firebase emulator in integration tests.
 */

import {
  isCompletionEvent,
  buildFriendNudgeBody,
  evaluateTrigger,
  shouldNotifyFollower,
  processFollower,
  ONE_DAY_MS,
  SESSION_WINDOW_MS,
  SESSION_THRESHOLD,
} from '../onFriendActivity';

// ─── isCompletionEvent ────────────────────────────────────────────────────────

describe('isCompletionEvent', () => {
  it('returns true when completedAt is newly set (before null, after set)', () => {
    expect(isCompletionEvent({}, { completedAt: { toMillis: () => 1 } })).toBe(true);
  });

  it('returns true when before is undefined (document created with completedAt)', () => {
    expect(isCompletionEvent(undefined, { completedAt: { toMillis: () => 1 } })).toBe(true);
  });

  it('returns false when completedAt was already set before', () => {
    const ts = { toMillis: () => 1 };
    expect(isCompletionEvent({ completedAt: ts }, { completedAt: ts })).toBe(false);
  });

  it('returns false when after has no completedAt (not a completion)', () => {
    expect(isCompletionEvent({}, { title: 'Buy milk' })).toBe(false);
  });

  it('returns false when after is undefined (document deleted)', () => {
    expect(isCompletionEvent({ completedAt: { toMillis: () => 1 } }, undefined)).toBe(false);
  });

  it('returns false when both before and after have no completedAt', () => {
    expect(isCompletionEvent({}, {})).toBe(false);
  });
});

// ─── buildFriendNudgeBody ─────────────────────────────────────────────────────

describe('buildFriendNudgeBody', () => {
  it('returns full-list copy when isFullList is true', () => {
    expect(buildFriendNudgeBody('alice', true))
      .toBe('@alice just brushed their whole list. Your turn.');
  });

  it('returns session copy when isFullList is false', () => {
    expect(buildFriendNudgeBody('bob', false))
      .toBe('@bob is on a brushing run. Keep up.');
  });

  it('handles usernames with special characters', () => {
    expect(buildFriendNudgeBody('user_123', false))
      .toBe('@user_123 is on a brushing run. Keep up.');
  });
});

// ─── evaluateTrigger ─────────────────────────────────────────────────────────

describe('evaluateTrigger', () => {
  const NOW = new Date('2024-06-09T12:00:00Z');

  function ts(offsetMs: number) {
    return { toMillis: () => NOW.getTime() + offsetMs };
  }

  it('returns shouldFire=false when tasksForToday is empty', () => {
    expect(evaluateTrigger([], NOW)).toEqual({ shouldFire: false, isFullList: false });
  });

  it('returns shouldFire=true isFullList=true when all tasks are done', () => {
    const tasks = [
      { done: true,  completedAt: ts(-5 * 60_000) },
      { done: true,  completedAt: ts(-1 * 60_000) },
      { done: true,  completedAt: ts(0) },
    ];
    expect(evaluateTrigger(tasks, NOW)).toEqual({ shouldFire: true, isFullList: true });
  });

  it('returns shouldFire=true isFullList=true when only 1 task and it is done', () => {
    expect(evaluateTrigger([{ done: true, completedAt: ts(0) }], NOW))
      .toEqual({ shouldFire: true, isFullList: true });
  });

  it('returns shouldFire=false when fewer than SESSION_THRESHOLD tasks in window', () => {
    // 2 tasks done in window, 1 incomplete
    const tasks = [
      { done: true,  completedAt: ts(-5 * 60_000) },
      { done: true,  completedAt: ts(-1 * 60_000) },
      { done: false, completedAt: null },
    ];
    expect(evaluateTrigger(tasks, NOW)).toEqual({ shouldFire: false, isFullList: false });
  });

  it(`returns shouldFire=true when ${SESSION_THRESHOLD}+ tasks completed within session window`, () => {
    const tasks = [
      { done: true, completedAt: ts(-25 * 60_000) },
      { done: true, completedAt: ts(-15 * 60_000) },
      { done: true, completedAt: ts(-5  * 60_000) },
      { done: false, completedAt: null },
    ];
    expect(evaluateTrigger(tasks, NOW)).toEqual({ shouldFire: true, isFullList: false });
  });

  it('does not count tasks completed outside the session window', () => {
    // 2 tasks inside window, 2 outside
    const tasks = [
      { done: true, completedAt: ts(-(SESSION_WINDOW_MS + 1)) },  // outside
      { done: true, completedAt: ts(-(SESSION_WINDOW_MS + 100)) }, // outside
      { done: true, completedAt: ts(-5 * 60_000) },               // inside
      { done: true, completedAt: ts(-1 * 60_000) },               // inside
      { done: false, completedAt: null },
    ];
    expect(evaluateTrigger(tasks, NOW)).toEqual({ shouldFire: false, isFullList: false });
  });

  it('counts a task completed exactly at the session window boundary as inside', () => {
    const tasks = [
      { done: true, completedAt: ts(-SESSION_WINDOW_MS) },
      { done: true, completedAt: ts(-15 * 60_000) },
      { done: true, completedAt: ts(-5  * 60_000) },
      { done: false, completedAt: null },
    ];
    expect(evaluateTrigger(tasks, NOW)).toEqual({ shouldFire: true, isFullList: false });
  });

  it('ignores tasks with null completedAt when counting session', () => {
    // All 3 have done=true but no completedAt timestamp
    const tasks = Array.from({ length: SESSION_THRESHOLD }, () => ({ done: true, completedAt: null }));
    // Full list is true → shouldFire: true, isFullList: true
    expect(evaluateTrigger(tasks, NOW)).toEqual({ shouldFire: true, isFullList: true });
  });
});

// ─── shouldNotifyFollower ─────────────────────────────────────────────────────

describe('shouldNotifyFollower', () => {
  const ACTOR = 'actor-uid-1';
  const NOW   = new Date('2024-06-09T12:00:00Z');

  function ts(offsetMs: number) {
    return { toMillis: () => NOW.getTime() + offsetMs };
  }

  it('returns true when prefs are empty (toggle defaults to enabled)', () => {
    expect(shouldNotifyFollower({}, ACTOR, NOW)).toBe(true);
  });

  it('returns true when friendActivity is true and no prior nudge', () => {
    expect(shouldNotifyFollower({ friendActivity: true }, ACTOR, NOW)).toBe(true);
  });

  it('returns false when friendActivity is explicitly false', () => {
    expect(shouldNotifyFollower({ friendActivity: false }, ACTOR, NOW)).toBe(false);
  });

  it('returns false when lastFriendNudgeFrom[actorUid] was < 24 h ago', () => {
    const prefs = { lastFriendNudgeFrom: { [ACTOR]: ts(-ONE_DAY_MS + 1) } };
    expect(shouldNotifyFollower(prefs, ACTOR, NOW)).toBe(false);
  });

  it('returns true when lastFriendNudgeFrom[actorUid] was exactly 24 h ago', () => {
    const prefs = { lastFriendNudgeFrom: { [ACTOR]: ts(-ONE_DAY_MS) } };
    expect(shouldNotifyFollower(prefs, ACTOR, NOW)).toBe(true);
  });

  it('returns true when lastFriendNudgeFrom[actorUid] was > 24 h ago', () => {
    const prefs = { lastFriendNudgeFrom: { [ACTOR]: ts(-ONE_DAY_MS - 3600_000) } };
    expect(shouldNotifyFollower(prefs, ACTOR, NOW)).toBe(true);
  });

  it('returns true when nudge was sent for a different actor but not this one', () => {
    const prefs = { lastFriendNudgeFrom: { 'other-actor': ts(-1000) } };
    expect(shouldNotifyFollower(prefs, ACTOR, NOW)).toBe(true);
  });

  it('returns false when friendActivity is false regardless of nudge timestamps', () => {
    const prefs = {
      friendActivity: false as const,
      lastFriendNudgeFrom: { [ACTOR]: ts(-ONE_DAY_MS - 3600_000) },
    };
    expect(shouldNotifyFollower(prefs, ACTOR, NOW)).toBe(false);
  });
});

// ─── processFollower ──────────────────────────────────────────────────────────

describe('processFollower', () => {
  const FOLLOWER_UID   = 'follower-uid';
  const ACTOR_UID      = 'actor-uid';
  const ACTOR_USERNAME = 'alice';
  const NOW            = new Date('2024-06-09T12:00:00Z');

  const mockUpdate = jest.fn().mockResolvedValue(undefined);
  const mockSend   = jest.fn();

  function makeDb(prefs: Record<string, unknown>, tokens: string[]) {
    return {
      collection: () => ({
        doc: () => ({
          collection: (subCol: string) => ({
            doc: () => ({
              get:    jest.fn().mockResolvedValue({ data: () => prefs }),
              update: mockUpdate,
            }),
            get: jest.fn().mockResolvedValue({
              empty: tokens.length === 0,
              docs:  tokens.map(t => ({ id: t })),
            }),
          }),
        }),
      }),
    } as unknown as import('firebase-admin').firestore.Firestore;
  }

  function makeMessaging() {
    return { send: mockSend } as unknown as import('firebase-admin').messaging.Messaging;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue('msg-id');
  });

  it('returns false when friendActivity is false', async () => {
    const result = await processFollower(
      FOLLOWER_UID, ACTOR_UID, ACTOR_USERNAME, false,
      makeDb({ friendActivity: false }, ['tok']), makeMessaging(), NOW,
    );
    expect(result).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns false when nudge was sent < 24 h ago', async () => {
    const prefs = {
      lastFriendNudgeFrom: { [ACTOR_UID]: { toMillis: () => NOW.getTime() - ONE_DAY_MS + 1 } },
    };
    const result = await processFollower(
      FOLLOWER_UID, ACTOR_UID, ACTOR_USERNAME, false,
      makeDb(prefs, ['tok']), makeMessaging(), NOW,
    );
    expect(result).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('returns false when follower has no registered tokens', async () => {
    const result = await processFollower(
      FOLLOWER_UID, ACTOR_UID, ACTOR_USERNAME, false,
      makeDb({}, []), makeMessaging(), NOW,
    );
    expect(result).toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('stamps before sending (stamp-before-fire atomicity)', async () => {
    const callOrder: string[] = [];
    mockUpdate.mockImplementation(() => {
      callOrder.push('stamp');
      return Promise.resolve();
    });
    mockSend.mockImplementation(() => {
      callOrder.push('send');
      return Promise.resolve('msg-id');
    });

    await processFollower(
      FOLLOWER_UID, ACTOR_UID, ACTOR_USERNAME, false,
      makeDb({}, ['tok']), makeMessaging(), NOW,
    );

    expect(callOrder[0]).toBe('stamp');
    expect(callOrder[1]).toBe('send');
  });

  it('stamps lastFriendNudgeFrom[actorUid] with dot-notation key', async () => {
    await processFollower(
      FOLLOWER_UID, ACTOR_UID, ACTOR_USERNAME, false,
      makeDb({}, ['tok']), makeMessaging(), NOW,
    );
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const [updateData] = mockUpdate.mock.calls[0];
    // The key is a literal dotted string (Firestore path notation for nested field update).
    // toHaveProperty would misinterpret the dot — use toMatchObject instead.
    expect(updateData).toMatchObject({ [`lastFriendNudgeFrom.${ACTOR_UID}`]: expect.anything() });
  });

  it('sends full-list copy when isFullList=true', async () => {
    await processFollower(
      FOLLOWER_UID, ACTOR_UID, ACTOR_USERNAME, true,
      makeDb({}, ['tok']), makeMessaging(), NOW,
    );
    expect(mockSend).toHaveBeenCalledTimes(1);
    const [msg] = mockSend.mock.calls[0];
    expect(msg.notification.body).toBe('@alice just brushed their whole list. Your turn.');
  });

  it('sends session copy when isFullList=false', async () => {
    await processFollower(
      FOLLOWER_UID, ACTOR_UID, ACTOR_USERNAME, false,
      makeDb({}, ['tok']), makeMessaging(), NOW,
    );
    const [msg] = mockSend.mock.calls[0];
    expect(msg.notification.body).toBe('@alice is on a brushing run. Keep up.');
  });

  it('sends to every registered token', async () => {
    await processFollower(
      FOLLOWER_UID, ACTOR_UID, ACTOR_USERNAME, false,
      makeDb({}, ['t1', 't2', 't3']), makeMessaging(), NOW,
    );
    expect(mockSend).toHaveBeenCalledTimes(3);
    const sentTokens = mockSend.mock.calls.map((c: unknown[]) => (c[0] as { token: string }).token);
    expect(sentTokens).toEqual(expect.arrayContaining(['t1', 't2', 't3']));
  });

  it('returns true and still stamps when one token send fails', async () => {
    mockSend
      .mockRejectedValueOnce(new Error('messaging/invalid-registration-token'))
      .mockResolvedValueOnce('msg-id');

    const result = await processFollower(
      FOLLOWER_UID, ACTOR_UID, ACTOR_USERNAME, false,
      makeDb({}, ['bad', 'good']), makeMessaging(), NOW,
    );
    expect(result).toBe(true);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('sets data.screen to Today', async () => {
    await processFollower(
      FOLLOWER_UID, ACTOR_UID, ACTOR_USERNAME, false,
      makeDb({}, ['tok']), makeMessaging(), NOW,
    );
    const [msg] = mockSend.mock.calls[0];
    expect(msg.data.screen).toBe('Today');
  });
});
