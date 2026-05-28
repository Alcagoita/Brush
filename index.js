/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';
import { navigateTo } from './src/navigation/navigationRef';

/**
 * Notifee background / quit-state press handler (KAN-28).
 *
 * Fires when the user taps a local proximity notification while the app is
 * backgrounded or fully quit. Reads the `screen` key from the notification
 * data payload written by proximity.ts and navigates there once the
 * NavigationContainer is ready.
 *
 * Must be registered before AppRegistry.registerComponent.
 */
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) {
    const screen = detail.notification?.data?.screen ?? 'Today';
    navigateTo(screen);
  }
});

/**
 * FCM background / quit-state handler.
 *
 * Must be registered before AppRegistry.registerComponent so it is
 * available immediately when the OS wakes the app to deliver a data message.
 * The handler runs in a headless JS task — no UI is available here.
 */
setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
  console.log('[FCM] Background message received:', remoteMessage.messageId);
  // Extend here to schedule a local notification, update badge count, etc.
});

AppRegistry.registerComponent(appName, () => App);
