/**
 * refs.ts — Firestore document/collection reference builders shared across
 * the firestore/ domain modules. All paths are scoped to /users/{uid}/...
 */

import { getFirestore, collection, doc } from '@react-native-firebase/firestore';
import type { SupportedLang } from '../poiInference';
import { normalize } from '../poiInference';

export function tasksRef(uid: string) {
  return collection(getFirestore(), 'users', uid, 'tasks');
}

export function taskRef(uid: string, taskId: string) {
  return doc(getFirestore(), 'users', uid, 'tasks', taskId);
}

export function userRef(uid: string) {
  return doc(getFirestore(), 'users', uid);
}

/** users/{uid}/userPreferences/prefs — single preferences document. */
export function userPrefsRef(uid: string) {
  return doc(getFirestore(), 'users', uid, 'userPreferences', 'prefs');
}

export function poisRef(uid: string) {
  return collection(getFirestore(), 'users', uid, 'pois');
}

export function poiRef(uid: string, poiType: string) {
  return doc(getFirestore(), 'users', uid, 'pois', poiType);
}

export function categoriesRef(uid: string) {
  return collection(getFirestore(), 'users', uid, 'categories');
}

export function categoryRef(uid: string, categoryId: string) {
  return doc(getFirestore(), 'users', uid, 'categories', categoryId);
}

export function pointsHistoryRef(uid: string) {
  return collection(getFirestore(), 'users', uid, 'pointsHistory');
}

export function achievementsRef(uid: string) {
  return collection(getFirestore(), 'users', uid, 'achievements');
}

export function achievementRef(uid: string, achievementId: string) {
  return doc(getFirestore(), 'users', uid, 'achievements', achievementId);
}

export function usernameIndexRef(username: string) {
  return doc(getFirestore(), 'usernames', username);
}

export function followingRef(uid: string) {
  return collection(getFirestore(), 'users', uid, 'following');
}

export function followingEntryRef(uid: string, followedUid: string) {
  return doc(getFirestore(), 'users', uid, 'following', followedUid);
}

export function followersEntryRef(uid: string, followerUid: string) {
  return doc(getFirestore(), 'users', uid, 'followers', followerUid);
}

export function followersRef(uid: string) {
  return collection(getFirestore(), 'users', uid, 'followers');
}

export function inboxRef(uid: string) {
  return collection(getFirestore(), 'users', uid, 'inbox');
}

export function learnedKeywordsRef(uid: string) {
  return collection(getFirestore(), 'users', uid, 'learnedPoiKeywords');
}

/** Stable doc id for a learned keyword: "<lang>:<normalized keyword>". */
export function learnedKeywordId(keyword: string, lang: SupportedLang): string {
  return `${lang}:${normalize(keyword)}`;
}
