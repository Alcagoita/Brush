/**
 * onChallengeNotifications — KAN-221
 *
 * Firestore trigger on challenges/{challengeId} that replaces the client's
 * direct writes to pendingNotifications for challenge invites and outcomes
 * (KAN-102/103/104). The client previously wrote these notifications itself
 * with only sentBy == auth.uid enforced — any authenticated user could send
 * a fake "you won!" / "you were invited" notification to anyone. This
 * function derives notifications purely from the challenge document's own
 * state transitions, which are already protected by the challenges create/
 * update rules (only the creator can create; only participants/creator can
 * update, and immutable fields can't be changed).
 *
 *   - Document created            → invite every non-creator participant.
 *   - A participant's `won` flips
 *     false/absent → true          → notify that participant (challenge_won)
 *                                     and every other participant
 *                                     (challenge_ended).
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { awardChallengeWinnerReward } from './rewards';

export interface ChallengeParticipant {
  username:       string;
  displayName:    string;
  status:         'pending' | 'accepted' | 'declined';
  completedCount: number;
  won:            boolean;
}

export interface ChallengeDoc {
  type:         'goal' | 'time';
  goalCount?:   number;
  createdBy:    string;
  participants: Record<string, ChallengeParticipant>;
  status:       'pending' | 'active' | 'completed';
  message?:     string;
}

const CHALLENGE_WON_TITLE = '🏆 You won the challenge!';
const CHALLENGE_WON_BODY  = 'Achievement unlocked: First to brush it away';
const CHALLENGE_ENDED_BODY = 'Better luck next time!';

// ─── Pure helpers (exported for unit tests) ───────────────────────────────────

function participantHandle(p: ChallengeParticipant | undefined): string {
  if (!p) { return 'Someone'; }
  return p.username ? `@${p.username}` : p.displayName;
}

/** Builds one pendingNotification payload per non-creator participant (invite). */
export function buildChallengeInviteNotifications(
  challengeId: string,
  challenge:   ChallengeDoc,
): { uid: string; payload: Record<string, unknown> }[] {
  const typeLabel = challenge.type === 'goal'
    ? `First to brush away ${challenge.goalCount ?? 0} tasks`
    : 'Most tasks by deadline';

  const creator = challenge.participants[challenge.createdBy];
  const challengerHandle = participantHandle(creator);
  const title = `${challengerHandle} challenged you: [${typeLabel}] 🏆 — Accept?`;

  return Object.keys(challenge.participants)
    .filter(uid => uid !== challenge.createdBy)
    .map(uid => ({
      uid,
      payload: {
        type:      'challenge_invite' as const,
        sentBy:    challenge.createdBy,
        title,
        body:      challenge.message ?? typeLabel,
        data:      { type: 'challenge_invite', challengeId, screen: 'ChallengeDetail' },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    }));
}

/**
 * Returns the uid of the participant whose `won` flag just flipped from
 * false/absent to true, or null if no such transition occurred in this write.
 */
export function detectNewWinner(
  before: ChallengeDoc | undefined,
  after:  ChallengeDoc,
): string | null {
  for (const [uid, participant] of Object.entries(after.participants)) {
    const wasWon = before?.participants[uid]?.won === true;
    if (participant.won === true && !wasWon) { return uid; }
  }
  return null;
}

/** Builds the winner (challenge_won) + everyone-else (challenge_ended) notifications. */
export function buildChallengeOutcomeNotifications(
  challengeId: string,
  after:       ChallengeDoc,
  winnerUid:   string,
): { uid: string; payload: Record<string, unknown> }[] {
  const winnerHandle = participantHandle(after.participants[winnerUid]);
  const notifications: { uid: string; payload: Record<string, unknown> }[] = [];

  for (const uid of Object.keys(after.participants)) {
    if (uid === winnerUid) {
      notifications.push({
        uid,
        payload: {
          type:      'challenge_won' as const,
          sentBy:    winnerUid,
          title:     CHALLENGE_WON_TITLE,
          body:      CHALLENGE_WON_BODY,
          data:      { type: 'challenge_won', challengeId, screen: 'ChallengeDetail' },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
    } else {
      notifications.push({
        uid,
        payload: {
          type:      'challenge_ended' as const,
          sentBy:    winnerUid,
          title:     `${winnerHandle} won the challenge!`,
          body:      CHALLENGE_ENDED_BODY,
          data:      { type: 'challenge_ended', challengeId, screen: 'ChallengeDetail' },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
    }
  }

  return notifications;
}

// ─── Firestore trigger ────────────────────────────────────────────────────────

export const onChallengeNotifications = onDocumentWritten(
  'challenges/{challengeId}',
  async (event) => {
    const challengeId = event.params.challengeId;
    const before = event.data?.before.exists ? (event.data.before.data() as ChallengeDoc) : undefined;
    const after  = event.data?.after.exists  ? (event.data.after.data()  as ChallengeDoc) : undefined;

    if (!after) { return; } // document deleted — nothing to notify.

    const db = admin.firestore();
    let notifications: { uid: string; payload: Record<string, unknown> }[] = [];
    let idPrefix = '';

    if (!before) {
      notifications = buildChallengeInviteNotifications(challengeId, after);
      idPrefix = 'challenge_invite_';
    } else {
      const winnerUid = detectNewWinner(before, after);
      if (winnerUid) {
        await awardChallengeWinnerReward(winnerUid, challengeId, db);
        notifications = buildChallengeOutcomeNotifications(challengeId, after, winnerUid);
        idPrefix = 'challenge_ended_';
      }
    }

    if (notifications.length === 0) { return; }

    const results = await Promise.allSettled(
      notifications.map(({ uid, payload }) =>
        db
          .collection('pendingNotifications').doc(uid)
          .collection('items').doc(`${idPrefix}${challengeId}`)
          .set(payload),
      ),
    );

    // Unlike the FCM sends in onFriendActivity/onUserLapsed (best-effort,
    // no single source of truth), these writes ARE the notification record —
    // a failed one is permanently lost unless we throw so Cloud Functions
    // retries the whole trigger.
    const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failures.length > 0) {
      console.error(
        `[onChallengeNotifications] ${failures.length}/${notifications.length} write(s) failed for challenge ${challengeId}`,
        failures.map(f => f.reason),
      );
      throw new Error(
        `onChallengeNotifications: ${failures.length} of ${notifications.length} notification writes failed`,
      );
    }
  },
);
