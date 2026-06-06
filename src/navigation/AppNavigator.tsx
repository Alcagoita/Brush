/**
 * AppNavigator — root stack navigator shown after login.
 *
 * Structure:
 *   NativeStack
 *     ├── Today    — always the root screen
 *     ├── Calendar — pushed by tapping the day number in TodayScreen (KAN-50)
 *     └── Profile  — pushed from the avatar in the Header
 *
 * No tab bar — navigation follows the design spec (avatar → profile).
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TodayScreen from '../screens/TodayScreen';
import CalendarScreen from '../screens/CalendarScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import TaskFormScreen, { TaskFormParams } from '../screens/TaskFormScreen';
import PointsHistoryScreen from '../screens/PointsHistoryScreen';
import PublicProfileScreen from '../screens/PublicProfileScreen';
import SharedTaskInboxScreen from '../screens/SharedTaskInboxScreen';

export type RootStackParamList = {
  Today: undefined;
  /** Optional initial date (YYYY-MM-DD); defaults to today if omitted. */
  Calendar: { initialDate?: string } | undefined;
  Profile: undefined;
  Categories: undefined;
  /** Full task creation / edit form (KAN-12 / KAN-13). Presented as a modal. */
  TaskForm: TaskFormParams;
  /** Points history + achievements gallery (KAN-33). Pushed from ProfileScreen. */
  PointsHistory: undefined;
  /** Public profile card opened via brushaway.app/u/{username} deep link (KAN-97). */
  PublicProfile: { username: string };
  /** Shared-task inbox — receive, accept and decline (KAN-87). */
  SharedTaskInbox: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Today"      component={TodayScreen} />
      <Stack.Screen name="Calendar"   component={CalendarScreen} />
      <Stack.Screen name="Profile"    component={ProfileScreen} />
      <Stack.Screen name="Categories" component={CategoriesScreen} />
      <Stack.Screen
        name="TaskForm"
        component={TaskFormScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="PointsHistory"    component={PointsHistoryScreen} />
      <Stack.Screen name="PublicProfile"   component={PublicProfileScreen} />
      <Stack.Screen name="SharedTaskInbox" component={SharedTaskInboxScreen} />
    </Stack.Navigator>
  );
}
