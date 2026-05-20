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
import CalendarScreen from './src/screens/CalendarScreen';
import LoginScreen from './src/screens/LoginScreen';
import NetworkBanner from './src/components/NetworkBanner';

export default function App() {
  const { user, loading } = useAuth();

  // Persist the FCM device token whenever a user is signed in.
  // Pass null when signed out so the hook is a no-op.
  useFCM(user?.uid ?? null);

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
