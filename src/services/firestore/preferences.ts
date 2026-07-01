/**
 * Feature-flag style user preferences stored on the root user document.
 *
 * Low-battery pause (KAN-52) and Store fine tuning (KAN-74) both live under
 * `poiPreferences` on /users/{uid} to keep user-controlled feature flags in
 * one document instead of adding a subcollection per flag.
 *
 * User Preferences (KAN-120) is a separate document:
 * /users/{uid}/userPreferences/prefs.
 */

import { getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from '@react-native-firebase/firestore';
import type { User, UserPreferences } from '../../types';
import { userRef, userPrefsRef } from './refs';

/**
 * Persist the user's "Pause nearby alerts on low battery" preference.
 * Pass `true` to enable, `false` to disable. Default server value is absent
 * (treated as false by subscribers and the proximity engine).
 */
export async function setLowBatteryPausePref(
  uid: string,
  enabled: boolean,
): Promise<void> {
  await updateDoc(userRef(uid), { 'poiPreferences.lowBatteryPause': enabled });
}

/**
 * Subscribe to live updates for the user's low-battery pause preference.
 *
 * Fires immediately with the stored value (or `false` if not yet set), then
 * again whenever the preference changes. Returns an unsubscribe function.
 */
export function subscribeLowBatteryPausePref(
  uid: string,
  onUpdate: (enabled: boolean) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    userRef(uid),
    snap => {
      const data = snap?.data() as User | undefined;
      onUpdate(data?.poiPreferences?.lowBatteryPause ?? false);
    },
    onError,
  );
}

/**
 * Persist the user's Store fine tuning preference.
 *
 * `true`  — user enabled via prompt or settings toggle
 * `false` — user explicitly disabled via settings toggle (suppresses prompt)
 */
export async function setStoreTuningPref(
  uid: string,
  enabled: boolean,
): Promise<void> {
  await updateDoc(userRef(uid), { 'poiPreferences.storeTuningEnabled': enabled });
}

/**
 * Subscribe to live updates for the user's Store fine tuning preference.
 *
 * `onUpdate` receives `true | false | undefined`:
 *   undefined — field not yet set (first-time user; show prompt on indoor_mapped)
 *   true      — user has enabled the feature
 *   false     — user explicitly disabled (suppress prompt)
 *
 * Returns an unsubscribe function.
 */
export function subscribeStoreTuningPref(
  uid: string,
  onUpdate: (enabled: boolean | undefined) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    userRef(uid),
    snap => {
      const data = snap?.data() as User | undefined;
      onUpdate(data?.poiPreferences?.storeTuningEnabled);
    },
    onError,
  );
}

/**
 * Read preferences once. Returns a partial object — missing fields mean the
 * user has never saved that preference; callers should fall back to
 * DEFAULT_USER_PREFERENCES for any missing key.
 */
export async function getUserPreferences(
  uid: string,
): Promise<Partial<UserPreferences>> {
  const snap = await getDoc(userPrefsRef(uid));
  return (snap.data() as Partial<UserPreferences>) ?? {};
}

/**
 * Merge-write any subset of preferences. Safe to call with partial objects;
 * keys not present in `prefs` are left untouched.
 */
export async function updateUserPreferences(
  uid: string,
  prefs: Partial<UserPreferences>,
): Promise<void> {
  await setDoc(userPrefsRef(uid), prefs, { merge: true });
}

/**
 * Live subscription to the user's preferences document.
 * Returns an unsubscribe function.
 */
export function subscribeToUserPreferences(
  uid: string,
  onUpdate: (prefs: Partial<UserPreferences>) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    userPrefsRef(uid),
    snap => onUpdate((snap?.data() as Partial<UserPreferences>) ?? {}),
    onError,
  );
}

/**
 * Stamp lastOpenedAt on every foreground event.
 * Called from App.tsx AppState listener (KAN-124 dependency).
 */
export async function markLastOpenedAt(uid: string): Promise<void> {
  await setDoc(
    userPrefsRef(uid),
    { lastOpenedAt: serverTimestamp() },
    { merge: true },
  );
}
