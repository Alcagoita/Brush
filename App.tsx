import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
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
import UsernameSetupScreen from './src/screens/UsernameSetupScreen';
import NetworkBanner from './src/components/NetworkBanner';
import ErrorBoundary from './src/components/ErrorBoundary';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef, navigateTo } from './src/navigation/navigationRef';
import type { RootStackParamList } from './src/navigation/AppNavigator';
import { getUser, markLastOpenedAt } from './src/services/firestore';
import { migratePointsToAchievementDerived } from './src/services/achievements';
import { subscribeToSharedTaskNotifications } from './src/services/sharing';
import notifeeApp, { AndroidImportance as AppAndroidImportance } from '@notifee/react-native';
import ShareMenu from 'react-native-share-menu';

// Deep link config (KAN-97 / KAN-87).
const LINKING_CONFIG = {
  prefixes: ['https://brushaway.app', 'brushaway://'],
  config: {
    screens: {
      PublicProfile:   'u/:username',
      SharedTaskInbox: 'inbox',
    } as Record<keyof RootStackParamList, unknown>,
  },
};

const TRANSITION_MS = 220;

function AppShell() {
  const { user, loading } = useAuth();
  const { palette, dark } = useTheme();

  // Tracks the auth state actually rendered — lags behind `user` by one animation cycle
  // so the fade-out completes before we swap login ↔ app.
  const [displayUser, setDisplayUser] = useState(user);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  // True once the first onAuthStateChanged result has been applied. Used to
  // skip the fade animation on cold-start so a persisted session never flashes
  // the login screen before navigating to the app.
  const hasResolved = useRef(false);

  useEffect(() => {
    if (loading) return;

    // First resolution — apply immediately with no animation so a silently
    // restored session never shows the login screen, even for a frame.
    if (!hasResolved.current) {
      hasResolved.current = true;
      setDisplayUser(user);
      return;
    }

    if (user === displayUser) return;

    // Subsequent changes (explicit sign-in / sign-out) — animate the transition.
    Animated.timing(fadeAnim, { toValue: 0, duration: TRANSITION_MS, useNativeDriver: true })
      .start(() => {
        setDisplayUser(user);
        Animated.timing(fadeAnim, { toValue: 1, duration: TRANSITION_MS, useNativeDriver: true }).start();
      });
  }, [user, loading, displayUser]);

  // ── Username check (KAN-97) ───────────────────────────────────────────────
  // null = still loading, false = needs setup, true = ready
  const [hasUsername, setHasUsername] = useState<boolean | null>(null);

  useEffect(() => {
    if (!displayUser) { setHasUsername(null); return; }
    let cancelled = false;
    getUser(displayUser.uid)
      .then(userData => { if (!cancelled) { setHasUsername(!!userData?.username); } })
      .catch(() => { if (!cancelled) { setHasUsername(false); } });
    return () => { cancelled = true; };
  }, [displayUser]);

  // KAN-129: recompute totalPoints from achievements map on every login.
  // Fixes legacy accounts that accumulated per-task points before KAN-129.
  useEffect(() => {
    if (!displayUser) { return; }
    migratePointsToAchievementDerived(displayUser.uid).catch(err =>
      console.warn('[App] migratePointsToAchievementDerived failed (non-critical)', err),
    );
  }, [displayUser]);

  // ── Shared-task notification subscription (KAN-87) ───────────────────────
  // Fires a local notifee notification when a new pendingNotification arrives.
  // The data.screen key routes the press handler to SharedTaskInbox.
  useEffect(() => {
    if (!displayUser) { return; }
    const uid = displayUser.uid;
    return subscribeToSharedTaskNotifications(uid, async n => {
      try {
        await notifeeApp.createChannel({
          id: 'shared_tasks', name: 'Shared Tasks', importance: AppAndroidImportance.HIGH,
        });
        await notifeeApp.displayNotification({
          title: n.title,
          body:  n.body,
          data:  { ...n.data, screen: 'SharedTaskInbox' },
          android: { channelId: 'shared_tasks', importance: AppAndroidImportance.HIGH, pressAction: { id: 'default' } },
        });
      } catch (e) {
        console.warn('[AppShell] shared task notification failed', e);
      }
    });
  }, [displayUser]);

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

  // Notifee foreground press handler (KAN-28 / KAN-103).
  // Navigates to the screen specified in data.screen, forwarding any extra
  // params (e.g. challengeId for ChallengeDetail).
  useEffect(() => {
    return notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        const data   = detail.notification?.data ?? {};
        const screen = (data.screen as keyof RootStackParamList) ?? 'Today';
        const params = data.challengeId ? { challengeId: data.challengeId as string } : undefined;
        navigateTo(screen, params as any);
      }
    });
  }, []);

  // Initial notification handler (KAN-28 / KAN-103).
  useEffect(() => {
    notifee.getInitialNotification().then(initial => {
      if (initial?.notification?.data?.screen) {
        const data   = initial.notification.data;
        const screen = data.screen as keyof RootStackParamList;
        const params = data.challengeId ? { challengeId: data.challengeId as string } : undefined;
        setTimeout(() => navigateTo(screen, params as any), 300);
      }
    });
  }, []);

  // Stamp lastOpenedAt on every foreground event (KAN-124 dependency).
  useEffect(() => {
    if (!displayUser) { return; }
    const uid = displayUser.uid;
    // Stamp immediately on mount (cold start counts as a foreground event).
    markLastOpenedAt(uid).catch(() => {});
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        markLastOpenedAt(uid).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [displayUser]);

  // ── Android Share Intent (KAN-90) ────────────────────────────────────────
  // Only active once the user is fully logged in and the navigation container
  // is ready (displayUser set, username confirmed). This ensures navigateTo()
  // has a ready NavigationContainer to dispatch to.
  useEffect(() => {
    if (!displayUser || hasUsername !== true) { return; }

    type SharedItem = { mimeType: string; data: string };

    const handleShare = (item: SharedItem | null) => {
      if (!item) { return; }
      const text = typeof item.data === 'string' ? item.data.trim() : '';
      if (!text || item.mimeType !== 'text/plain') { return; }
      // Small delay so the NavigationContainer finishes mounting on cold-start.
      setTimeout(() => navigateTo('ShareReceive', { sharedText: text }), 300);
    };

    // Handles the case where the app was launched via a share intent.
    ShareMenu.getInitialShare(handleShare);

    // Handles the case where a share arrives while the app is already open.
    const sub = ShareMenu.addNewShareListener(handleShare);
    return () => sub.remove();
  }, [displayUser, hasUsername]);

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
      <Animated.View style={[styles.fill, { opacity: fadeAnim }]}>
        {displayUser ? (
          hasUsername === null ? (
            // Still resolving whether username exists — hold on the spinner.
            <View style={[styles.splash, { backgroundColor: palette.bg }]}>
              <ActivityIndicator size="large" color={palette.accent} />
            </View>
          ) : !hasUsername ? (
            // New user (or user without a username) — collect it before entering the app.
            <UsernameSetupScreen onComplete={() => setHasUsername(true)} />
          ) : (
            <NavigationContainer ref={navigationRef} linking={LINKING_CONFIG}>
              <AppNavigator />
            </NavigationContainer>
          )
        ) : (
          <LoginScreen />
        )}
      </Animated.View>
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
  fill: {
    flex: 1,
  },
});
