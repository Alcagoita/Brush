import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  View,
  StatusBar,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { getMessaging, onMessage } from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import { useAuth } from './src/hooks/useAuth';
import { useFCM } from './src/hooks/useFCM';
import { setCrashlyticsUser, logBreadcrumb } from './src/services/crashlytics';
import LoginScreen from './src/screens/LoginScreen';
import NetworkBanner from './src/components/NetworkBanner';
import ErrorBoundary from './src/components/ErrorBoundary';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef, navigateTo } from './src/navigation/navigationRef';
import type { RootStackParamList } from './src/navigation/AppNavigator';

function AppShell() {
  const { user, loading } = useAuth();
  const { palette, dark } = useTheme();

  // Persist the FCM device token whenever a user is signed in.
  useFCM(user?.uid ?? null);

  // Attach / detach the Crashlytics user identifier on auth changes.
  useEffect(() => {
    if (!loading) {
      setCrashlyticsUser(user?.uid ?? null);
      logBreadcrumb(user ? `User signed in: ${user.uid}` : 'User signed out');
    }
  }, [user, loading]);

  // Foreground FCM handler — show an Alert while the app is active.
  useEffect(() => {
    const unsubscribe = onMessage(getMessaging(), async remoteMessage => {
      const title = remoteMessage.notification?.title ?? 'New notification';
      const body = remoteMessage.notification?.body ?? '';
      Alert.alert(title, body);
    });
    return unsubscribe;
  }, []);

  // Notifee foreground press handler (KAN-28).
  // Fires when the user taps a local proximity notification while the app is
  // in the foreground. Navigates to the screen specified in the data payload.
  useEffect(() => {
    return notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        const screen = (detail.notification?.data?.screen as keyof RootStackParamList) ?? 'Today';
        navigateTo(screen);
      }
    });
  }, []);

  // Initial notification handler (KAN-28).
  // Fires when the user taps a notification that launches the app from quit state.
  // NavigationContainer is not yet mounted here, so we defer via a short timeout.
  useEffect(() => {
    notifee.getInitialNotification().then(initial => {
      if (initial?.notification?.data?.screen) {
        const screen = initial.notification.data.screen as keyof RootStackParamList;
        // Small delay to ensure NavigationContainer is ready before navigating.
        setTimeout(() => navigateTo(screen), 300);
      }
    });
  }, []);

  if (loading) {
    return (
      <View style={[styles.splash, { backgroundColor: palette.bg }]}>
        <ActivityIndicator size="large" color={palette.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={dark ? 'light-content' : 'dark-content'}
        backgroundColor={palette.bg}
      />
      <NetworkBanner />
      {user ? (
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
        </NavigationContainer>
      ) : (
        <LoginScreen />
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fb',
  },
});
