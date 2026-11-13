/**
 * Feature-flag style user preferences stored on the root user document.
 *
 * Low-battery pause (KAN-52) lives under `poiPreferences` on /users/{uid} to
 * keep user-controlled feature flags in one document instead of adding a
 * subcollection per flag.
 *
 * User Preferences (KAN-120) is a separate document:
 * /users/{uid}/userPreferences/prefs.
 */

import { getDoc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import type { User, UserPreferences } from '../../types';
import { userRef, userPrefsRef } from './refs';

/**
 * Persist the user's "Pause nearby alerts on low battery" preference.
 * Pass `true` to enable, `false` to disable. Default server value is absent
 * (treated as false by callers and the proximity engine).
 */
export async function setLowBatteryPausePref(
  uid: string,
  enabled: boolean,
): Promise<void> {
  await updateDoc(userRef(uid), { 'poiPreferences.lowBatteryPause': enabled });
}

/** KAN-366 — defer the proactive download to Wi-Fi. Default false (any connection). */
export async function setWifiOnlyDownloadsPref(
  uid: string,
  enabled: boolean,
): Promise<void> {
  await updateDoc(userRef(uid), { 'poiPreferences.wifiOnlyDownloads': enabled });
}

/**
 * Read the user's low-battery pause preference once.
 * Returns `false` if not yet set.
 */
export async function getLowBatteryPausePref(uid: string): Promise<boolean> {
  const snap = await getDoc(userRef(uid));
  const data = snap.data() as User | undefined;
  return data?.poiPreferences?.lowBatteryPause ?? false;
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
