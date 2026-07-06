import { getAuth } from '@react-native-firebase/auth';
import { getDoc, setDoc, updateDoc, deleteField, serverTimestamp } from '@react-native-firebase/firestore';
import type { User } from '../../types';
import { userRef } from './refs';

/**
 * Create or update a user document on sign-up / profile change.
 * Uses merge so partial updates don't wipe existing fields.
 */
export async function upsertUser(
  uid: string,
  data: Partial<Omit<User, 'uid' | 'createdAt'>>,
): Promise<void> {
  await setDoc(
    userRef(uid),
    { uid, ...data },
    { merge: true },
  );
}

/**
 * Write the full user document for a brand-new account.
 * Must be called once after Firebase Auth user creation — neither signUpWithEmail
 * nor claimUsername write the mandatory fields (email, displayName, createdAt, uid).
 * Uses setDoc without merge so a partial doc from a previous failed attempt
 * is always overwritten with complete data.
 */
export async function createUserDocument(
  uid: string,
  email: string,
  displayName: string,
): Promise<void> {
  await setDoc(userRef(uid), {
    uid,
    email,
    displayName,
    darkMode: false,
    createdAt: serverTimestamp(),
  });
}

/**
 * Backfill any missing mandatory fields (email, displayName, darkMode, createdAt)
 * on an existing user doc that was created before createUserDocument was in place.
 * Safe to call on every login — no-ops if the doc is already complete.
 */
export async function backfillUserDocument(
  uid: string,
  authEmail: string | null,
  authDisplayName: string | null,
): Promise<void> {
  if (getAuth().currentUser?.uid !== uid) { return; }

  const existing = await getUser(uid);
  if (!existing) { return; }

  const isComplete =
    existing.email != null &&
    existing.displayName != null &&
    existing.createdAt != null &&
    typeof existing.darkMode === 'boolean';
  if (isComplete) { return; }

  // Only fill email/displayName when a real value is available — writing ''
  // would make isComplete() true forever and prevent a later login (once Auth
  // actually has the data) from backfilling the real value.
  const patch: Record<string, unknown> = {};
  if (existing.email == null && authEmail) { patch.email = authEmail; }
  if (existing.displayName == null) {
    const displayName = authDisplayName ?? existing.username;
    if (displayName) { patch.displayName = displayName; }
  }
  if (existing.createdAt   == null) { patch.createdAt   = serverTimestamp(); }
  if (typeof existing.darkMode !== 'boolean') { patch.darkMode = false; }
  if (existing.uid         == null) { patch.uid         = uid; }

  if (Object.keys(patch).length > 0) {
    await updateDoc(userRef(uid), patch);
  }
}

/**
 * Update the displayName field on the Firestore user document (KAN-18).
 * Callers should also call firebase.auth().currentUser.updateProfile() to
 * keep the Auth profile in sync — see ProfileScreen.
 */
export async function updateDisplayName(uid: string, displayName: string): Promise<void> {
  await updateDoc(userRef(uid), { displayName });
}

/** Fetch the user document once. Returns null if it doesn't exist yet. */
export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(userRef(uid));
  return snap.exists() ? (snap.data() as User) : null;
}

/**
 * Set/replace the user's explicit home anchor (KAN-247) — never inferred,
 * only ever written from the Settings "Home" flow. Only the signed-in user
 * may write their own home anchor.
 */
export async function setHome(
  uid: string,
  home: { address: string; lat: number; lng: number },
): Promise<void> {
  if (getAuth().currentUser?.uid !== uid) { throw new Error('setHome: uid does not match the signed-in user'); }
  await updateDoc(userRef(uid), {
    home: { ...home, updatedAt: serverTimestamp() },
  });
}

/** Clears the user's home anchor. Only the signed-in user may clear their own. */
export async function clearHome(uid: string): Promise<void> {
  if (getAuth().currentUser?.uid !== uid) { throw new Error('clearHome: uid does not match the signed-in user'); }
  await updateDoc(userRef(uid), { home: deleteField() });
}
