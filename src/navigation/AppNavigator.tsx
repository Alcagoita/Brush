/**
 * AppNavigator — root stack navigator shown after login.
 *
 * Structure:
 *   NativeStack
 *     ├── Today   — always the root screen
 *     └── Profile — pushed from the avatar in the Header
 *
 * No tab bar — navigation follows the design spec (avatar → profile).
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TodayScreen from '../screens/TodayScreen';
import ProfileScreen from '../screens/ProfileScreen';

export type RootStackParamList = {
  Today: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Today" component={TodayScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
