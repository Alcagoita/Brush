import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  View,
  StatusBar,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';
import { useAuth } from './src/hooks/useAuth';
import { useFCM } from './src/hooks/useFCM';
import { signOut } from './src/services/auth';
import { setCrashlyticsUser, logBreadcrumb } from './src/services/crashlytics';
import CalendarScreen from './src/screens/CalendarScreen';
import LoginScreen from './src/screens/LoginScreen';
import NetworkBanner from './src/components/NetworkBanner';
import ErrorBoundary from './src/components/ErrorBoundary';

export default function App() {
  const { user, loading } = useAuth();

  // Persist the FCM device token whenever a user is signed in.
  useFCM(user?.uid ?? null);

  // Attach / detach the Crashlytics user identifier on auth changes.
  useEffect(() => {
    if (!loading) {
      setCrashlyticsUser(user?.uid ?? null);
      logBreadcrumb(user ? `User signed in: ${user.uid}` : 'User signed out');
    }
  }, [user, loading]);

  // Foreground notification handler — show an Alert while the app is active.
  // Background / quit-state messages are handled in index.js.
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      const title = remoteMessage.notification?.title ?? 'New notification';
      const body = remoteMessage.notification?.body ?? '';
      Alert.alert(title, body);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        {/* Offline banner sits above everything; renders null when online */}
        <NetworkBanner />
        {user ? (
          <CalendarScreen user={user} onSignOut={signOut} />
        ) : (
          <LoginScreen />
        )}
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
