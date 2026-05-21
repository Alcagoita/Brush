/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

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
