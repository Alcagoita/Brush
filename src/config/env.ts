/**
 * env.ts — App-level environment flags.
 *
 * Toggle USE_EMULATOR to true while running the Firebase Emulator Suite locally:
 *   firebase emulators:start --only auth,firestore
 *
 * No native rebuild required — just flip the constant and restart Metro.
 *
 * ANDROID EMULATOR NOTE:
 *   Android emulators map host-machine localhost → 10.0.2.2.
 *   iOS simulators and physical devices use localhost directly.
 */

import { Platform } from 'react-native';

/** Set to `true` to route Auth + Firestore traffic to local emulators. */
export const USE_EMULATOR: boolean = __DEV__ && false;

/**
 * Emulator host address.
 * - Android emulator: 10.0.2.2 (routes to the host machine's localhost)
 * - iOS simulator / physical device via USB: localhost
 */
export const EMULATOR_HOST: string =
  Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
