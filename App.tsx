import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging';
import { useAuth } from './src/hooks/useAuth';
import { signOut } from './src/services/auth';
import CalendarScreen from './src/screens/CalendarScreen';
import LoginScreen from './src/screens/LoginScreen';

async function requestFCMPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    const token = await messaging().getToken();
    console.log('[FCM] Device token:', token);
    // TODO: save token to Firestore under users/{userId}/tokens/{token}
  } else {
    console.log('[FCM] Permission not granted — status:', authStatus);
  }
}

export default function App() {
  const { user, loading } = useAuth();

  // Request FCM permission and set up foreground handler once on mount
  useEffect(() => {
    requestFCMPermission();

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
