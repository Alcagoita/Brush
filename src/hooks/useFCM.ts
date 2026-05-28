/**
 * useFCM — Request notification permission, persist the device token to
 * Firestore, and refresh it automatically when FCM rotates the token.
 *
 * Call this hook once in App.tsx after the user is authenticated.
 * Pass `null` when there is no authenticated user (hook is a no-op).
 */

import { useEffect } from 'react';
import {
  getMessaging,
  requestPermission,
  getToken,
  onTokenRefresh,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} from '@react-native-firebase/firestore';

async function saveToken(userId: string, token: string): Promise<void> {
  await setDoc(
    doc(getFirestore(), 'users', userId, 'tokens', token),
    { createdAt: serverTimestamp() },
  );
  console.log('[FCM] Token saved to Firestore:', token.slice(0, 20) + '…');
}

export function useFCM(userId: string | null): void {
  useEffect(() => {
    if (!userId) {
      return;
    }
    // Capture the narrowed non-null value so TypeScript retains the `string`
    // type inside the async closure (outer variables are re-readable by TS).
    const uid: string = userId;

    let unsubscribeRefresh: (() => void) | undefined;

    async function setup() {
      const messaging = getMessaging();

      // 1. Request permission (iOS prompts; Android ≥ 13 also prompts)
      const authStatus = await requestPermission(messaging);
      const granted =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      if (!granted) {
        console.log('[FCM] Permission denied — status:', authStatus);
        return;
      }

      // 2. Get current token and persist it
      const token = await getToken(messaging);
      await saveToken(uid, token);

      // 3. Listen for token rotations and persist the new token
      unsubscribeRefresh = onTokenRefresh(messaging, newToken => {
        saveToken(uid, newToken).catch(err =>
          console.warn('[FCM] Token refresh save failed:', err.message),
        );
      });
    }

    setup().catch(err => console.warn('[FCM] Setup failed:', err.message));

    return () => {
      unsubscribeRefresh?.();
    };
  }, [userId]);
}
