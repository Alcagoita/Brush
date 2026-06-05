/**
 * PublicProfileScreen — KAN-97 / KAN-98
 *
 * Shown when the user opens a `brushaway.app/u/{username}` deep link.
 * Displays the profile card for the linked user and exposes Follow/Unfollow.
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
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import { useTheme } from '../theme';
import { spacing, radius as radii } from '../theme/tokens';
import { ChevronLeftIcon } from '../components/AppIcon';
import Avatar from '../components/Avatar';
import {
  getUserByUsername,
  getUser,
  isFollowing,
  followUser,
  unfollowUser,
} from '../services/firestore';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { User } from '../types';

type Nav   = NativeStackNavigationProp<RootStackParamList, 'PublicProfile'>;
type Route = RouteProp<RootStackParamList, 'PublicProfile'>;

export default function PublicProfileScreen() {
  const { palette } = useTheme();
  const navigation  = useNavigation<Nav>();
  const route       = useRoute<Route>();
  const insets      = useSafeAreaInsets();

  const currentAuth = getAuth().currentUser;
  const currentUid  = currentAuth?.uid ?? '';

  const { username } = route.params;

  const [targetUser,   setTargetUser]   = useState<User | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [notFound,     setNotFound]     = useState(false);
  const [following,    setFollowing]    = useState(false);
  const [toggling,     setToggling]     = useState(false);

  // ── Load target user + follow state ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getUserByUsername(username),
    ])
      .then(async ([u]) => {
        if (cancelled) { return; }
        if (!u) { setNotFound(true); setLoading(false); return; }
        setTargetUser(u);
        // Check follow state only if viewing someone else's profile
        if (u.uid !== currentUid) {
          const followed = await isFollowing(currentUid, u.uid);
          if (!cancelled) { setFollowing(followed); }
        }
      })
      .catch(() => { if (!cancelled) { setNotFound(true); } })
      .finally(() => { if (!cancelled) { setLoading(false); } });
    return () => { cancelled = true; };
  }, [username, currentUid]);

  // ── Follow / Unfollow ────────────────────────────────────────────────────────
  const handleToggleFollow = async () => {
    if (!targetUser || toggling) { return; }
    setToggling(true);
    try {
      if (following) {
        await unfollowUser(currentUid, targetUser.uid);
        setFollowing(false);
      } else {
        const currentUserData = await getUser(currentUid);
        await followUser(
          currentUid,
          currentUserData?.username ?? '',
          currentAuth?.displayName ?? '',
          targetUser.uid,
          targetUser.username ?? '',
          targetUser.displayName,
        );
        setFollowing(true);
      }
    } catch (err) {
      console.warn('[PublicProfileScreen] follow toggle failed', err);
    } finally {
      setToggling(false);
    }
  };

  const isOwnProfile = targetUser?.uid === currentUid;

  // ── Render ───────────────────────────────────────────────────────────────────
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
      ) : targetUser ? (
        <View style={[styles.card, { backgroundColor: palette.surface2 }]}>
          <Avatar
            photoURL={null}
            size={72}
            accessibilityLabel={`${targetUser.displayName} avatar`}
          />
          <Text style={[styles.displayName, { color: palette.text }]}>
            {targetUser.displayName}
          </Text>
          <Text style={[styles.handle, { color: palette.muted }]}>
            @{targetUser.username}
          </Text>

          {/* Follower counts */}
          <View style={styles.countsRow}>
            <View style={styles.countItem}>
              <Text style={[styles.countNum, { color: palette.text }]}>
                {targetUser.followersCount ?? 0}
              </Text>
              <Text style={[styles.countLabel, { color: palette.muted }]}>Followers</Text>
            </View>
            <View style={[styles.countDivider, { backgroundColor: palette.line }]} />
            <View style={styles.countItem}>
              <Text style={[styles.countNum, { color: palette.text }]}>
                {targetUser.followingCount ?? 0}
              </Text>
              <Text style={[styles.countLabel, { color: palette.muted }]}>Following</Text>
            </View>
          </View>

          {/* Follow / Unfollow button — hidden on own profile */}
          {!isOwnProfile && (
            <Pressable
              style={({ pressed }) => [
                styles.followBtn,
                following
                  ? { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line }
                  : { backgroundColor: palette.text },
                (pressed || toggling) && { opacity: 0.7 },
              ]}
              onPress={handleToggleFollow}
              disabled={toggling}
              accessibilityRole="button"
              accessibilityLabel={following ? `Unfollow ${targetUser.displayName}` : `Follow ${targetUser.displayName}`}>
              {toggling ? (
                <ActivityIndicator size="small" color={following ? palette.text : palette.bg} />
              ) : (
                <Text style={[
                  styles.followLabel,
                  { color: following ? palette.text : palette.bg },
                ]}>
                  {following ? 'Following' : 'Follow'}
                </Text>
              )}
            </Pressable>
          )}
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
    width:          36,
    height:         36,
    alignItems:     'center',
    justifyContent: 'center',
  },
  title: {
    fontSize:   17,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },

  center: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: spacing.page,
  },
  notFoundText: {
    fontSize:   15,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
  },

  card: {
    margin:        spacing.page,
    borderRadius:  radii.card,
    padding:       24,
    alignItems:    'center',
    gap:           12,
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

  countsRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            24,
    marginVertical: 4,
  },
  countItem: {
    alignItems: 'center',
    gap:         2,
  },
  countNum: {
    fontSize:    20,
    fontWeight:  '600',
    fontFamily:  'Geist-SemiBold',
    fontVariant: ['tabular-nums'],
  },
  countLabel: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
  },
  countDivider: {
    width:  1,
    height: 28,
  },

  followBtn: {
    marginTop:         4,
    height:            44,
    paddingHorizontal: 36,
    borderRadius:      radii.ctaBtn,
    alignItems:        'center',
    justifyContent:    'center',
  },
  followLabel: {
    fontSize:   15,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
});
