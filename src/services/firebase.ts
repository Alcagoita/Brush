/**
 * firebase.ts — Central Firebase service module.
 *
 * Import Firebase services from here rather than directly from
 * @react-native-firebase/* packages. This ensures a single
 * initialization point and makes it easy to swap or mock services.
 */

import { getApp } from '@react-native-firebase/app';
import '@react-native-firebase/auth'; // registers RNFBAuth native module
import { getAuth, connectAuthEmulator } from '@react-native-firebase/auth/lib/modular';
import {
  getFirestore,
  connectFirestoreEmulator,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED,
} from '@react-native-firebase/firestore';
import { getMessaging } from '@react-native-firebase/messaging';
import { getStorage } from '@react-native-firebase/storage';
import { EMULATOR_HOST, USE_EMULATOR } from '../config/env';

// ─── Offline persistence ──────────────────────────────────────────────────────
// initializeFirestore must be called once before any other Firestore access.
// We guard with a flag so Fast Refresh doesn't call it twice.

let _settingsApplied = false;

if (!_settingsApplied) {
  try {
    initializeFirestore(getApp(), {
      // Remove the 40 MB default cap so all user events are cached on-device.
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      // Ignore undefined fields in documents instead of throwing.
      ignoreUndefinedProperties: true,
    });
  } catch {
    // initializeFirestore throws if called after getFirestore() — safe to ignore
    // on Fast Refresh re-runs.
  }
  _settingsApplied = true;
}

// ─── Local emulator wiring ────────────────────────────────────────────────────
// Must happen before any other Firebase calls.

let _emulatorsAttached = false;

if (USE_EMULATOR && !_emulatorsAttached) {
  connectAuthEmulator(getAuth(), `http://${EMULATOR_HOST}:9099`);
  connectFirestoreEmulator(getFirestore(), EMULATOR_HOST, 8080);
  _emulatorsAttached = true;
  console.log('[Firebase] 🔧 Using local emulators —', EMULATOR_HOST);
}

// ─── Service instances ────────────────────────────────────────────────────────

export const db = getFirestore();
export const authService = getAuth();
export const storageService = getStorage();
export { getMessaging as messaging };

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
