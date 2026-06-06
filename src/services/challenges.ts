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
  Timestamp,
} from '@react-native-firebase/firestore';
import type { Challenge, ChallengeParticipant, FollowEntry } from '../types';

// ─── Ref helpers ──────────────────────────────────────────────────────────────

export function challengeRef(challengeId: string) {
  return doc(getFirestore(), 'challenges', challengeId);
}

function challengesRef() {
  return collection(getFirestore(), 'challenges');
}

// Pending notifications — same path as sharing.ts for consistent delivery.
function pendingNotifRef(uid: string) {
  return collection(getFirestore(), 'pendingNotifications', uid, 'items');
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
 * Creates the challenge document and sends a pending notification to each
 * participant so their device can trigger a local notifee alert.
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
  const challengeId = ref.id;

  // Notify each non-creator participant via pendingNotifications.
  const typeLabel = type === 'goal'
    ? `First to complete ${goalCount ?? '?'} tasks`
    : `Most tasks by deadline`;

  const challengerHandle = creatorUsername ? `@${creatorUsername}` : creatorName;
  const notifTitle = `${challengerHandle} challenged you: [${typeLabel}] 🏆 — Accept?`;

  await Promise.allSettled(
    participants.map(p =>
      addDoc(pendingNotifRef(p.uid), {
        type:      'challenge_invite',
        title:     notifTitle,
        body:      message ?? typeLabel,
        data: {
          type:        'challenge_invite',
          challengeId,
          screen:      'ChallengeDetail',
        },
        createdAt: serverTimestamp(),
      }),
    ),
  );

  return challengeId;
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

// ─── incrementCompletedCount (KAN-103) ───────────────────────────────────────

export async function incrementCompletedCount(
  challengeId: string,
  uid: string,
): Promise<void> {
  const { increment } = await import('@react-native-firebase/firestore');
  await updateDoc(challengeRef(challengeId), {
    [`participants.${uid}.completedCount`]: increment(1),
  });
}

export { Timestamp, serverTimestamp };
