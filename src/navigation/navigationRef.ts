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
 *
 * The conditional args tuple mirrors react-navigation's own `navigate()`
 * overloads: `params` is optional only for routes whose param type includes
 * `undefined` (e.g. `Today: undefined`), and required otherwise (e.g.
 * `TaskForm: TaskFormParams`) — this is what lets the call resolve without an
 * `any` cast on `navigationRef.navigate` itself.
 */
export function navigateTo<RouteName extends keyof RootStackParamList>(
  ...args: undefined extends RootStackParamList[RouteName]
    ? [screen: RouteName, params?: RootStackParamList[RouteName]]
    : [screen: RouteName, params: RootStackParamList[RouteName]]
): void {
  if (navigationRef.isReady()) {
    // navigationRef.navigate()'s overloads are a big union of per-route
    // tuples and don't distribute over a still-generic RouteName, so TS can't
    // verify args matches one specific route's tuple at this call site — even
    // though the exported signature above guarantees every real caller passes
    // a matching (screen, params) pair. This is the one place that gap is
    // bridged; callers of navigateTo get full type checking.
    type NavigateFn = (screen: RouteName, params?: RootStackParamList[RouteName]) => void;
    (navigationRef.navigate as NavigateFn)(args[0], args[1]);
  }
}
