/**
 * KAN-221 — onChallengeNotifications helpers unit tests
 *
 * Tests buildChallengeInviteNotifications, detectNewWinner, and
 * buildChallengeOutcomeNotifications in isolation. The Firestore trigger
 * itself (onChallengeNotifications) is exercised against the Firebase
 * emulator in integration tests.
 */

import {
  buildChallengeInviteNotifications,
  detectNewWinner,
  buildChallengeOutcomeNotifications,
  ChallengeDoc,
} from '../onChallengeNotifications';

function makeChallenge(overrides: Partial<ChallengeDoc> = {}): ChallengeDoc {
  return {
    type:      'goal',
    goalCount: 10,
    createdBy: 'uid-me',
    status:    'pending',
    participants: {
      'uid-me': { username: 'me', displayName: 'Me', status: 'accepted', completedCount: 0, won: false },
      'uid-alice': { username: 'alice', displayName: 'Alice', status: 'pending', completedCount: 0, won: false },
      'uid-bob': { username: 'bob', displayName: 'Bob', status: 'pending', completedCount: 0, won: false },
    },
    ...overrides,
  };
}

// ─── buildChallengeInviteNotifications ────────────────────────────────────────

describe('buildChallengeInviteNotifications', () => {
  it('returns one notification per non-creator participant', () => {
    const notifications = buildChallengeInviteNotifications('challenge-1', makeChallenge());
    expect(notifications.map(n => n.uid).sort()).toEqual(['uid-alice', 'uid-bob']);
  });

  it('uses @creatorUsername in the invite title', () => {
    const notifications = buildChallengeInviteNotifications('challenge-1', makeChallenge());
    expect(notifications[0].payload.title).toContain('@me');
  });

  it('sets sentBy to the creator uid', () => {
    const notifications = buildChallengeInviteNotifications('challenge-1', makeChallenge());
    expect(notifications.every(n => n.payload.sentBy === 'uid-me')).toBe(true);
  });

  it('includes screen: ChallengeDetail in data', () => {
    const notifications = buildChallengeInviteNotifications('challenge-1', makeChallenge());
    expect(notifications[0].payload.data).toMatchObject({
      type: 'challenge_invite', challengeId: 'challenge-1', screen: 'ChallengeDetail',
    });
  });

  it('uses the custom message as the body when provided', () => {
    const notifications = buildChallengeInviteNotifications(
      'challenge-1', makeChallenge({ message: 'gl hf' }),
    );
    expect(notifications[0].payload.body).toBe('gl hf');
  });

  it('falls back to the type label as the body when no message is set', () => {
    const notifications = buildChallengeInviteNotifications('challenge-1', makeChallenge());
    expect(notifications[0].payload.body).toBe('First to brush away 10 tasks');
  });
});

// ─── detectNewWinner ──────────────────────────────────────────────────────────

describe('detectNewWinner', () => {
  it('returns null when before is undefined (document just created)', () => {
    expect(detectNewWinner(undefined, makeChallenge())).toBeNull();
  });

  it('returns null when no participant won flag changed', () => {
    const before = makeChallenge();
    const after  = makeChallenge();
    expect(detectNewWinner(before, after)).toBeNull();
  });

  it('returns the uid whose won flag flips false -> true', () => {
    const before = makeChallenge();
    const after  = makeChallenge();
    after.participants['uid-alice'].won = true;
    expect(detectNewWinner(before, after)).toBe('uid-alice');
  });

  it('returns null when won was already true before this write', () => {
    const before = makeChallenge();
    before.participants['uid-alice'].won = true;
    const after = makeChallenge();
    after.participants['uid-alice'].won = true;
    expect(detectNewWinner(before, after)).toBeNull();
  });
});

// ─── buildChallengeOutcomeNotifications ──────────────────────────────────────

describe('buildChallengeOutcomeNotifications', () => {
  it('returns one notification per participant (winner + others)', () => {
    const notifications = buildChallengeOutcomeNotifications('challenge-1', makeChallenge(), 'uid-alice');
    expect(notifications).toHaveLength(3);
  });

  it('sends challenge_won only to the winner', () => {
    const notifications = buildChallengeOutcomeNotifications('challenge-1', makeChallenge(), 'uid-alice');
    const winnerNotif = notifications.find(n => n.uid === 'uid-alice');
    expect(winnerNotif?.payload.type).toBe('challenge_won');
  });

  it('sends challenge_ended to everyone else, with the winner handle in the title', () => {
    const notifications = buildChallengeOutcomeNotifications('challenge-1', makeChallenge(), 'uid-alice');
    const loserNotif = notifications.find(n => n.uid === 'uid-bob');
    expect(loserNotif?.payload.type).toBe('challenge_ended');
    expect(loserNotif?.payload.title).toBe('@alice won the challenge!');
  });

  it('sets sentBy to the winner uid on every notification', () => {
    const notifications = buildChallengeOutcomeNotifications('challenge-1', makeChallenge(), 'uid-alice');
    expect(notifications.every(n => n.payload.sentBy === 'uid-alice')).toBe(true);
  });
});
