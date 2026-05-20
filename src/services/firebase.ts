/**
 * firebase.ts — Central Firebase service module.
 *
 * Import Firebase services from here rather than directly from
 * @react-native-firebase/* packages. This ensures a single
 * initialization point and makes it easy to swap or mock services.
 */

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import storage from '@react-native-firebase/storage';

// ─── Service instances ────────────────────────────────────────────────────────

export const db = firestore();
export const authService = auth();
export const storageService = storage();
export { messaging };

// ─── Initialization state ─────────────────────────────────────────────────────

let _initialized = false;
let _initError: Error | null = null;

export function isFirebaseReady(): boolean {
  return _initialized;
}

export function getFirebaseInitError(): Error | null {
  return _initError;
}

// ─── Health check ─────────────────────────────────────────────────────────────

/**
 * Verify the Firebase connection is live by pinging Firestore.
 * Call this once at app startup (e.g. in App.tsx) and pass an
 * optional error callback to handle degraded-mode scenarios.
 */
export async function checkFirebaseConnection(
  onError?: (error: Error) => void,
): Promise<boolean> {
  try {
    // A lightweight read to confirm Firestore is reachable
    await firestore().collection('_health').limit(1).get();
    _initialized = true;
    _initError = null;
    return true;
  } catch (error) {
    _initialized = false;
    _initError = error as Error;
    console.warn('[Firebase] Connection check failed:', (error as Error).message);
    onError?.(error as Error);
    return false;
  }
}
