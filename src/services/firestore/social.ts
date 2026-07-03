/**
 * Follow system (KAN-98) + Social Inbox (KAN-212).
 *
 * Schema:
 *   users/{uid}/following/{followedUid} → FollowEntry (without uid field)
 *   users/{uid}/followers/{followerUid} → FollowEntry (without uid field)
 *   users/{uid} → { ..., followingCount, followersCount }
 *   users/{uid}/inbox/{id} → InboxEntry
 */

import {
  getFirestore,
  getDoc,
  getDocs,
  updateDoc,
  writeBatch,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
} from '@react-native-firebase/firestore';
import type { FollowEntry, InboxEntry } from '../../types';
import {
  followingRef,
  followingEntryRef,
  followersEntryRef,
  followersRef,
  inboxRef,
  userRef,
} from './refs';
import { mapSnapshotDocs } from './snapshot';

/**
 * Follow another user. Atomically:
 *  - writes to follower's /following/{followedUid}
 *  - writes to followed's /followers/{followerUid}
 *  - increments followingCount on follower's doc
 *  - increments followersCount on followed's doc
 *
 * No-op guard: callers should check isFollowing() first to avoid duplicates.
 * Throws if followerUid === followedUid (cannot follow yourself).
 */
export async function followUser(
  followerUid: string,
  followerUsername: string,
  followerDisplayName: string,
  followedUid: string,
  followedUsername: string,
  followedDisplayName: string,
): Promise<void> {
  if (followerUid === followedUid) {
    throw new Error('cannot_follow_self');
  }
  const db    = getFirestore();
  const batch = writeBatch(db);

  batch.set(followingEntryRef(followerUid, followedUid), {
    username:    followedUsername,
    displayName: followedDisplayName,
    followedAt:  serverTimestamp(),
  });
  batch.set(followersEntryRef(followedUid, followerUid), {
    username:    followerUsername,
    displayName: followerDisplayName,
    followedAt:  serverTimestamp(),
  });
  batch.set(userRef(followerUid), { followingCount: increment(1) }, { merge: true });
  batch.set(userRef(followedUid), { followersCount: increment(1) }, { merge: true });

  // Use followerUid as the deterministic doc ID — prevents duplicate inbox
  // entries if followUser is called more than once for the same pair.
  const inboxDocRef = doc(inboxRef(followedUid), followerUid);
  batch.set(inboxDocRef, {
    type:            'follow_request' as const,
    fromUid:         followerUid,
    fromUsername:    followerUsername,
    fromDisplayName: followerDisplayName,
    read:            false,
    createdAt:       serverTimestamp(),
  });

  // The pendingNotification for the followed user's device is written
  // server-side by the onFollowRequest Cloud Function (KAN-221), triggered
  // off the inbox entry above — the client no longer writes directly to
  // another user's pendingNotifications mailbox.

  await batch.commit();
}

/**
 * Unfollow a user. Atomically removes both subcollection entries and
 * decrements the denormalized counts.
 */
export async function unfollowUser(
  followerUid: string,
  followedUid: string,
): Promise<void> {
  const db    = getFirestore();
  const batch = writeBatch(db);

  batch.delete(followingEntryRef(followerUid, followedUid));
  batch.delete(followersEntryRef(followedUid, followerUid));
  batch.set(userRef(followerUid), { followingCount: increment(-1) }, { merge: true });
  batch.set(userRef(followedUid), { followersCount: increment(-1) }, { merge: true });

  await batch.commit();
}

/** Returns true if followerUid currently follows followedUid. */
export async function isFollowing(
  followerUid: string,
  followedUid: string,
): Promise<boolean> {
  const snap = await getDoc(followingEntryRef(followerUid, followedUid));
  return snap.exists();
}

/** One-shot fetch of the users that uid is following, newest first. */
export async function getFollowing(uid: string): Promise<FollowEntry[]> {
  const snap = await getDocs(query(followingRef(uid), orderBy('followedAt', 'desc')));
  return mapSnapshotDocs<FollowEntry>(snap, 'uid');
}

/** One-shot fetch of the users that follow uid, newest first. */
export async function getFollowers(uid: string): Promise<FollowEntry[]> {
  const snap = await getDocs(query(followersRef(uid), orderBy('followedAt', 'desc')));
  return mapSnapshotDocs<FollowEntry>(snap, 'uid');
}

/** One-shot fetch of inbox entries for uid, newest first. */
export async function getInboxEntries(uid: string): Promise<InboxEntry[]> {
  const snap = await getDocs(query(inboxRef(uid), orderBy('createdAt', 'desc')));
  return mapSnapshotDocs<InboxEntry>(snap);
}

/** Mark a single inbox entry as read. */
export async function markInboxEntryRead(uid: string, entryId: string): Promise<void> {
  await updateDoc(doc(inboxRef(uid), entryId), { read: true });
}

/** Count of unread inbox entries — used for the people-icon badge on Today. */
export async function getInboxUnreadCount(uid: string): Promise<number> {
  const snap = await getDocs(query(inboxRef(uid), where('read', '==', false)));
  return snap.size;
}
