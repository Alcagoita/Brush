/**
 * WearNotificationModule.ts — JS bridge for WearNotificationModule.kt (KAN-36).
 *
 * Forwards proximity alerts from the phone notification to the paired Wear OS
 * watch via MessageClient. Android-only — no-ops gracefully on iOS.
 */

import { NativeModules, Platform } from 'react-native';

export interface WearNotificationModuleInterface {
  /**
   * Send a proximity alert to all connected Wear OS nodes.
   * Fire-and-forget — no return value.
   *
   * @param title     Task title (used as the watch notification title).
   * @param placeName Name of the nearby place.
   * @param distance  Human-readable distance string (e.g. "75m").
   */
  sendProximityAlert(title: string, placeName: string, distance: string): void;
}

const { WearNotificationModule } = NativeModules;

if (Platform.OS === 'android' && !WearNotificationModule) {
  console.warn(
    '[WearNotificationModule] Native module not found. ' +
    'Ensure WearNotificationPackage is registered in MainApplication and the app has been rebuilt.',
  );
}

export default WearNotificationModule as WearNotificationModuleInterface | null;
