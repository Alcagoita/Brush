/**
 * challenges.ts — Firestore service for the challenge system (KAN-102/103/104).
 *
 * Collection: challenges/{challengeId}
 *
 * createChallenge   — write challenge doc + notify all participants (KAN-102)
 * subscribeToChallenge  — real-time listener for a single challenge (KAN-103)
 * subscribeToUserChallenges — all challenges a user participates in (KAN-103)
 * updateParticipantStatus   — accept / decline a challenge (KAN-103)
 * incrementCompletedCount   — called when a task is done during a challenge (KAN-103)
 */

import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  Timestamp,
} from '@react-native-firebase/firestore';
import type { Challenge, ChallengeParticipant, FollowEntry } from '../types';
import { awardChallengeWinnerAchievement } from './achievements';

// ─── Ref helpers ──────────────────────────────────────────────────────────────

export function challengeRef(challengeId: string) {
  return doc(getFirestore(), 'challenges', challengeId);
}

function challengesRef() {
  return collection(getFirestore(), 'challenges');
}

// ─── createChallenge (KAN-102) ────────────────────────────────────────────────

export interface CreateChallengeParams {
  creatorUid:       string;
  creatorUsername:  string;
  creatorName:      string;
  type:             'goal' | 'time';
  goalCount?:       number;
  deadline?:        Date;
  participants:     FollowEntry[];  // people being challenged (excluding creator)
  message?:         string;
}

/**
 * Creates the challenge document. The invite notification to each
 * non-creator participant is sent server-side by the onChallengeNotifications
 * Cloud Function (KAN-221), triggered off this document's creation.
 *
 * Returns the new challenge ID.
 */
export async function createChallenge(params: CreateChallengeParams): Promise<string> {
  const {
    creatorUid, creatorUsername, creatorName,
    type, goalCount, deadline, participants, message,
  } = params;

  if (participants.length === 0) {
    throw new Error('CHALLENGE_NO_PARTICIPANTS');
  }

  const db = getFirestore();

  // Build participants map — creator starts as accepted, others as pending.
  const participantsMap: Record<string, ChallengeParticipant> = {
    [creatorUid]: {
      username:       creatorUsername,
      displayName:    creatorName,
      status:         'accepted',
      completedCount: 0,
      won:            false,
    },
  };
  for (const p of participants) {
    participantsMap[p.uid] = {
      username:       p.username ?? '',
      displayName:    p.displayName,
      status:         'pending',
      completedCount: 0,
      won:            false,
    };
  }

  const challengeDoc: Omit<Challenge, 'id'> = {
    type,
    ...(type === 'goal' && goalCount !== undefined ? { goalCount } : {}),
    ...(type === 'time' && deadline              ? { deadline: Timestamp.fromDate(deadline) } : {}),
    createdBy:    creatorUid,
    participants: participantsMap,
    status:       'pending',
    createdAt:    serverTimestamp() as unknown as Challenge['createdAt'],
    ...(message ? { message } : {}),
  };

  const ref = await addDoc(challengesRef(), challengeDoc);

  // The pendingNotification invite for each non-creator participant is
  // written server-side by the onChallengeNotifications Cloud Function
  // (KAN-221), triggered off this document's creation — the client no
  // longer writes directly to another user's pendingNotifications mailbox.

  return ref.id;
}

// ─── subscribeToChallenge (KAN-103) ──────────────────────────────────────────

export function subscribeToChallenge(
  challengeId: string,
  onUpdate: (challenge: Challenge) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    challengeRef(challengeId),
    snap => {
      if (snap.exists()) {
        onUpdate({ id: snap.id, ...snap.data() } as Challenge);
      }
    },
    onError,
  );
}

// ─── subscribeToUserChallenges (KAN-103) ──────────────────────────────────────
//
// Firestore composite index required:
//   challenges: createdBy ASC + createdAt DESC
//   challenges: participants.{uid}.status (array-contains workaround — use createdBy for now)

export function subscribeToUserChallenges(
  uid: string,
  onUpdate: (challenges: Challenge[]) => void,
  onError?: (err: Error) => void,
): () => void {
  // Fetch challenges where the user is the creator (simple query — no composite index).
  // For full participant view, a Cloud Function fan-out or a subcollection is needed.
  // For v1, we show challenges created by or with the user — handled client-side after fetch.
  return onSnapshot(
    query(
      challengesRef(),
      where('createdBy', '==', uid),
      orderBy('createdAt', 'desc'),
    ),
    snap => {
      if (!snap) { return; }
      onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as Challenge)));
    },
    onError,
  );
}

// ─── updateParticipantStatus (KAN-103) ───────────────────────────────────────

export async function updateParticipantStatus(
  challengeId: string,
  uid: string,
  status: 'accepted' | 'declined',
): Promise<void> {
  await updateDoc(challengeRef(challengeId), {
    [`participants.${uid}.status`]: status,
  });
}

// ─── incrementCompletedCount + goal check (KAN-103) ─────────────────────────

/**
 * Increment the participant's completed count and check for goal-based completion.
 *
 * If the challenge is goal-based and the participant now equals or exceeds
 * goalCount, mark them as the winner and close the challenge.
 * Returns true if the challenge just ended.
 */
export async function incrementCompletedCount(
  challengeId: string,
  uid: string,
  challenge: Challenge,
): Promise<boolean> {
  const newCount = (challenge.participants[uid]?.completedCount ?? 0) + 1;
  const isGoalMet = challenge.type === 'goal' && newCount >= (challenge.goalCount ?? Infinity);

  if (isGoalMet) {
    // Atomic: increment count + mark winner + close challenge.
    await updateDoc(challengeRef(challengeId), {
      [`participants.${uid}.completedCount`]: increment(1),
      [`participants.${uid}.won`]:            true,
      status:                                 'completed',
    });

    // The pendingNotification for every other participant (challenge_ended)
    // is written server-side by the onChallengeNotifications Cloud Function
    // (KAN-221), triggered off the `won` flag flip above.

    // Award winner achievement + bonus points (KAN-104) — fire-and-forget.
    awardChallengeWinnerAchievement(uid, challengeId).catch(err =>
      console.warn('[challenges] awardChallengeWinnerAchievement failed', err),
    );

    return true;
  }

  await updateDoc(challengeRef(challengeId), {
    [`participants.${uid}.completedCount`]: increment(1),
  });
  return false;
}

/**
 * Called at challenge deadline for time-based challenges.
 * Determines winner by highest completedCount, marks them won, closes challenge.
 */
export async function resolveTimeBasedChallenge(
  challengeId: string,
  challenge: Challenge,
): Promise<void> {
  const entries = Object.entries(challenge.participants);
  if (entries.length === 0) { return; }

  const [winnerUid] = entries.reduce(
    (best, curr) => curr[1].completedCount > best[1].completedCount ? curr : best,
    entries[0],
  );

  const updates: Record<string, unknown> = { status: 'completed' };
  updates[`participants.${winnerUid}.won`] = true;

  await updateDoc(challengeRef(challengeId), updates);

  // The pendingNotification for the winner (challenge_won) and every other
  // participant (challenge_ended) is written server-side by the
  // onChallengeNotifications Cloud Function (KAN-221), triggered off the
  // `won` flag flip above.

  // Award winner achievement + bonus points (KAN-104) — fire-and-forget.
  awardChallengeWinnerAchievement(winnerUid, challengeId).catch(err =>
    console.warn('[challenges] awardChallengeWinnerAchievement failed', err),
  );
}

/**
 * Get all active challenges for a user (as a participant).
 * Used by useTodayScreen to know which challenges to update on task done.
 * Returns a one-time fetch (not subscribed).
 */
export async function getActiveChallengesForUser(uid: string): Promise<Challenge[]> {
  const { getDocs } = await import('@react-native-firebase/firestore');
  const snap = await getDocs(
    query(challengesRef(), where('status', '==', 'active')),
  );
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Challenge))
    .filter(c => uid in c.participants && c.participants[uid].status === 'accepted');
}

export { Timestamp, serverTimestamp };
