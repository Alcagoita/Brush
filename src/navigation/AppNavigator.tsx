/**
 * AppNavigator — root navigator shown after login.
 *
 * Structure:
 *   BottomTabNavigator
 *     ├── Today   (KAN-45 will flesh this out)
 *     └── Profile (backlog — placeholder for now)
 *
 * Tab bar styling follows the design tokens: no shadows, 1px top border,
 * surface background, accent colour for the active indicator.
 */
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useTheme } from '../theme';
import TodayScreen from '../screens/TodayScreen';
import ProfileScreen from '../screens/ProfileScreen';

// ─── Tab param list ───────────────────────────────────────────────────────────

export type RootTabParamList = {
  Today: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

// ─── Tab icons ────────────────────────────────────────────────────────────────

function TabIcon({ label, focused, color }: { label: string; focused: boolean; color: string }) {
  const icons: Record<string, { active: string; inactive: string }> = {
    Today:   { active: '◉', inactive: '○' },
    Profile: { active: '▪', inactive: '▫' },
  };
  const icon = icons[label] ?? { active: '●', inactive: '○' };
  return (
    <Text style={{ fontSize: 20, color, lineHeight: 24 }}>
      {focused ? icon.active : icon.inactive}
    </Text>
  );
}

// ─── Navigator ────────────────────────────────────────────────────────────────

export default function AppNavigator() {
  const { palette } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Today"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: palette.surface,
            borderTopColor: palette.line,
          },
        ],
        tabBarActiveTintColor: palette.text,
        tabBarInactiveTintColor: palette.muted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => (
          <TabIcon label={route.name} focused={focused} color={color} />
        ),
      })}>
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    // No elevation / shadow — borders only, per design spec.
    elevation: 0,
    shadowOpacity: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: Platform.OS === 'ios' ? 84 : 60,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: 'Geist-Medium',
    marginTop: 2,
  },
});
