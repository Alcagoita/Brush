/**
 * PublicProfileScreen — KAN-97
 *
 * Shown when the user opens a `brushaway.app/u/{username}` deep link.
 * Displays the profile card for the linked user.
 *
 * Follow functionality is wired in KAN-98.
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { spacing, radius as radii } from '../theme/tokens';
import { ChevronLeftIcon } from '../components/AppIcon';
import Avatar from '../components/Avatar';
import { getUserByUsername } from '../services/firestore';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { User } from '../types';

type Nav   = NativeStackNavigationProp<RootStackParamList, 'PublicProfile'>;
type Route = RouteProp<RootStackParamList, 'PublicProfile'>;

export default function PublicProfileScreen() {
  const { palette } = useTheme();
  const navigation  = useNavigation<Nav>();
  const route       = useRoute<Route>();
  const insets      = useSafeAreaInsets();

  const { username } = route.params;

  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getUserByUsername(username)
      .then(u => {
        if (cancelled) { return; }
        if (!u) { setNotFound(true); } else { setUser(u); }
      })
      .catch(() => { if (!cancelled) { setNotFound(true); } })
      .finally(() => { if (!cancelled) { setLoading(false); } });
    return () => { cancelled = true; };
  }, [username]);

  return (
    <View style={[styles.root, { backgroundColor: palette.bg, paddingTop: insets.top }]}>

      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: palette.line }]}>
        <Pressable
          style={styles.navBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <ChevronLeftIcon color={palette.text} size={22} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>@{username}</Text>
        <View style={styles.navBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.accent} />
        </View>
      ) : notFound ? (
        <View style={styles.center}>
          <Text style={[styles.notFoundText, { color: palette.muted }]}>
            User @{username} not found.
          </Text>
        </View>
      ) : user ? (
        <View style={[styles.card, { backgroundColor: palette.surface2 }]}>
          <Avatar photoURL={null} size={72} accessibilityLabel={`${user.displayName} avatar`} />
          <Text style={[styles.displayName, { color: palette.text }]}>
            {user.displayName}
          </Text>
          <Text style={[styles.handle, { color: palette.muted }]}>@{user.username}</Text>

          {/* Follow button — wired in KAN-98 */}
          <Pressable
            style={({ pressed }) => [
              styles.followBtn,
              { backgroundColor: palette.text },
              pressed && { opacity: 0.82 },
            ]}
            onPress={() => { /* KAN-98 */ }}
            accessibilityRole="button"
            accessibilityLabel={`Follow ${user.displayName}`}>
            <Text style={[styles.followLabel, { color: palette.bg }]}>Follow</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.page,
    paddingVertical:   12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize:   17,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },

  center: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.page,
  },
  notFoundText: {
    fontSize:  15,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
  },

  card: {
    margin:        spacing.page,
    borderRadius:  radii.card,
    padding:       24,
    alignItems:    'center',
    gap:           10,
  },
  displayName: {
    fontSize:   20,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    marginTop:  4,
  },
  handle: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
  },
  followBtn: {
    marginTop:      8,
    height:         44,
    paddingHorizontal: 32,
    borderRadius:   radii.ctaBtn,
    alignItems:     'center',
    justifyContent: 'center',
  },
  followLabel: {
    fontSize:   15,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
});
