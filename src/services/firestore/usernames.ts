/**
 * Usernames (KAN-97).
 *
 * Schema:
 *   usernames/{username}  →  { uid: string }          — uniqueness index
 *   users/{uid}           →  { ..., username, usernameUpdatedAt }
 */

import { getDoc, writeBatch, getFirestore, serverTimestamp, Timestamp } from '@react-native-firebase/firestore';
import type { User } from '../../types';
import { userRef, usernameIndexRef } from './refs';
import { getUser } from './users';

/**
 * Usernames are stored and compared in lowercase only — `alice` and `Alice`
 * are treated as the same handle. The stored value never contains the `@`
 * prefix; display code is responsible for prepending it (e.g. `@${username}`).
 */
export const USERNAME_REGEX = /^[a-z0-9_]+$/;
export const USERNAME_MIN   = 3;
export const USERNAME_MAX   = 20;
export const USERNAME_COOLDOWN_DAYS  = 30;
/** New accounts may change their username freely within this window. */
export const USERNAME_GRACE_HOURS   = 24;

/**
 * Returns a validation error string, or null if the value is valid.
 * Expects the value already lowercased — callers should normalise before
 * passing (e.g. `raw.toLowerCase()`).
 */
export function validateUsername(v: string): string | null {
  if (v.length < USERNAME_MIN) { return `At least ${USERNAME_MIN} characters required.`; }
  if (v.length > USERNAME_MAX) { return `Maximum ${USERNAME_MAX} characters.`; }
  if (!USERNAME_REGEX.test(v)) { return 'Only lowercase letters, numbers, and underscores.'; }
  return null;
}

/** Returns true if the username is not yet claimed. */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const snap = await getDoc(usernameIndexRef(username));
  return !snap.exists();
}

/**
 * Atomically claim a username for a user.
 * Writes to both `usernames/{username}` (index) and `users/{uid}` (profile).
 * Uses set-with-merge so the user doc is created if it does not exist yet
 * (new sign-ups have no Firestore document before their first username claim).
 *
 * Throws if the write fails (e.g. Firestore security rule blocks duplicate claim).
 */
export async function claimUsername(uid: string, username: string): Promise<void> {
  const db = getFirestore();
  const batch = writeBatch(db);
  batch.set(usernameIndexRef(username), { uid });
  batch.set(
    userRef(uid),
    { username, usernameUpdatedAt: serverTimestamp() },
    { merge: true },
  );
  await batch.commit();
}

/**
 * Change an existing username, enforcing the 30-day cooldown.
 *
 * Throws an error whose message starts with `username_cooldown:` and contains
 * the number of days remaining, so callers can show a specific message.
 */
export async function updateUsername(uid: string, newUsername: string): Promise<void> {
  const userData = await getUser(uid);
  if (userData?.usernameUpdatedAt) {
    const updatedAt  = (userData.usernameUpdatedAt as Timestamp).toDate();
    const daysSince  = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

    // New accounts get a 24-hour grace window to fix first-time typos.
    const accountAgeMs  = userData.createdAt
      ? Date.now() - (userData.createdAt as Timestamp).toDate().getTime()
      : Infinity;
    const inGracePeriod = accountAgeMs < USERNAME_GRACE_HOURS * 60 * 60 * 1000;

    if (daysSince < USERNAME_COOLDOWN_DAYS && !inGracePeriod) {
      const daysLeft = Math.ceil(USERNAME_COOLDOWN_DAYS - daysSince);
      throw new Error(`username_cooldown:${daysLeft}`);
    }
  }

  const db = getFirestore();
  const batch = writeBatch(db);

  // Remove old username index entry if one exists.
  if (userData?.username) {
    batch.delete(usernameIndexRef(userData.username));
  }

  batch.set(usernameIndexRef(newUsername), { uid });
  batch.set(
    userRef(uid),
    { username: newUsername, usernameUpdatedAt: serverTimestamp() },
    { merge: true },
  );

  await batch.commit();
}

/**
 * Look up a public user by their @username.
 * Returns null if the username is not claimed.
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  const indexSnap = await getDoc(usernameIndexRef(username));
  if (!indexSnap.exists()) { return null; }
  const { uid } = indexSnap.data() as { uid: string };
  return getUser(uid);
}
