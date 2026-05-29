/**
 * navigationRef — global navigation reference
 *
 * Allows navigation from outside the React tree (e.g. notification handlers
 * in App.tsx before NavigationContainer is mounted).
 */

import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './AppNavigator';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateTo(screen: keyof RootStackParamList) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(screen);
  }
}
