/**
 * navigationRef — KAN-28
 *
 * A module-level NavigationContainerRef that lets code outside the React tree
 * (notifee background event handler, index.js) trigger navigation imperatively.
 *
 * Usage:
 *   // In App.tsx — attach to NavigationContainer:
 *   <NavigationContainer ref={navigationRef}>
 *
 *   // Anywhere else — navigate programmatically:
 *   import { navigateTo } from './navigationRef';
 *   navigateTo('Today');
 */

import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './AppNavigator';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Navigate to a screen by name, if the navigation container is ready.
 * Safe to call from outside the React tree (background event handlers).
 */
export function navigateTo(
  screen: keyof RootStackParamList,
  params?: RootStackParamList[keyof RootStackParamList],
): void {
  if (navigationRef.isReady()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigationRef as any).navigate(screen, params);
  }
}
