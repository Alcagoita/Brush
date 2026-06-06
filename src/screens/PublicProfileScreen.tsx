/**
 * PublicProfileScreen — KAN-97 / KAN-98 / KAN-105
 *
 * Shown when the user opens a `brushaway.app/u/{username}` deep link or taps
 * a friend in the Social Hub following list.
 *
 * Displays:
 *   - Profile card (avatar, name, @username, follower counts, follow button)
 *   - Stats row (points, achievements earned, streak)
 *   - Achievements grid — read-only, earned + locked (KAN-105)
 *   - Compare button — opens side-by-side comparison (KAN-105)
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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
import AchievementTile, {
  ACHIEVEMENT_CATALOGUE,
  achievementsGridStyle,
} from '../components/AchievementTile';
import {
  getUserByUsername,
  getUser,
  isFollowing,
  followUser,
  unfollowUser,
  getAchievementsForUser,
} from '../services/firestore';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Achievement, User } from '../types';

type Nav   = NativeStackNavigationProp<RootStackParamList, 'PublicProfile'>;
type Route = RouteProp<RootStackParamList, 'PublicProfile'>;

function formatTimestamp(ts: { seconds: number; nanoseconds: number } | undefined): string {
  if (!ts) { return ''; }
  return new Date(ts.seconds * 1000).toLocaleDateString('en-GB', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });
}

export default function PublicProfileScreen() {
  const { palette } = useTheme();
  const navigation  = useNavigation<Nav>();
  const route       = useRoute<Route>();
  const insets      = useSafeAreaInsets();

  const currentAuth = getAuth().currentUser;
  const currentUid  = currentAuth?.uid ?? '';

  const { username } = route.params;

  const [targetUser,    setTargetUser]    = useState<User | null>(null);
  const [achievements,  setAchievements]  = useState<Achievement[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [notFound,      setNotFound]      = useState(false);
  const [following,     setFollowing]     = useState(false);
  const [toggling,      setToggling]      = useState(false);

  // ── Load target user + achievements + follow state ───────────────────────────
  useEffect(() => {
    let cancelled = false;
    getUserByUsername(username)
      .then(async u => {
        if (cancelled) { return; }
        if (!u) { setNotFound(true); setLoading(false); return; }
        setTargetUser(u);

        const [achievs, followed] = await Promise.all([
          getAchievementsForUser(u.uid),
          u.uid !== currentUid ? isFollowing(currentUid, u.uid) : Promise.resolve(false),
        ]);
        if (cancelled) { return; }
        setAchievements(achievs);
        setFollowing(followed);
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

  const isOwnProfile    = targetUser?.uid === currentUid;
  const earnedMap       = Object.fromEntries(achievements.map(a => [a.type, a]));
  const achievementCount = achievements.length;

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
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}>

          {/* ── Profile card ── */}
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

          {/* ── Stats row ── */}
          <View style={[styles.statsCard, { backgroundColor: palette.surface2 }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: palette.text }]}>
                {targetUser.totalPoints ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: palette.muted }]}>Points</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: palette.line }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: palette.text }]}>
                {achievementCount}
              </Text>
              <Text style={[styles.statLabel, { color: palette.muted }]}>Achievements</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: palette.line }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: palette.text }]}>
                {targetUser.currentStreak ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: palette.muted }]}>Streak</Text>
            </View>
          </View>

          {/* ── Compare button ── */}
          {!isOwnProfile && (
            <Pressable
              style={({ pressed }) => [
                styles.compareBtn,
                { backgroundColor: palette.surface2, borderColor: palette.line },
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => navigation.navigate('CompareAchievements', { friendUid: targetUser.uid, friendUsername: targetUser.username ?? username })}
              accessibilityRole="button"
              accessibilityLabel={`Compare achievements with ${targetUser.displayName}`}>
              <Text style={[styles.compareBtnLabel, { color: palette.text }]}>
                Compare achievements
              </Text>
            </Pressable>
          )}

          {/* ── Achievements grid ── */}
          <Text style={[styles.sectionHeading, { color: palette.text }]}>Achievements</Text>

          <View style={achievementsGridStyle}>
            {ACHIEVEMENT_CATALOGUE.map(def => {
              const earned   = earnedMap[def.type];
              const earnedAt = earned ? formatTimestamp(earned.earnedAt as any) : undefined;
              return (
                <AchievementTile
                  key={def.type}
                  def={def}
                  earned={!!earned}
                  earnedAt={earnedAt}
                  palette={palette}
                />
              );
            })}
          </View>

        </ScrollView>
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

  scroll: {
    paddingHorizontal: spacing.page,
    paddingTop:        20,
    gap:               12,
  },

  // ── Profile card ──
  card: {
    borderRadius: radii.card,
    padding:      24,
    alignItems:   'center',
    gap:          12,
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
  countItem:  { alignItems: 'center', gap: 2 },
  countNum: {
    fontSize:    20,
    fontWeight:  '600',
    fontFamily:  'Geist-SemiBold',
    fontVariant: ['tabular-nums'],
  },
  countLabel:   { fontSize: 12, fontFamily: 'Geist-Regular' },
  countDivider: { width: 1, height: 28 },

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

  // ── Stats row ──
  statsCard: {
    borderRadius:  radii.card,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems:    'center',
  },
  statItem: {
    flex:       1,
    alignItems: 'center',
    gap:         2,
  },
  statNum: {
    fontSize:    22,
    fontWeight:  '600',
    fontFamily:  'Geist-SemiBold',
    fontVariant: ['tabular-nums'],
  },
  statLabel:   { fontSize: 12, fontFamily: 'Geist-Regular' },
  statDivider: { width: 1, height: 28 },

  // ── Compare button ──
  compareBtn: {
    height:        52,
    borderRadius:  radii.card,
    borderWidth:   1,
    alignItems:    'center',
    justifyContent:'center',
  },
  compareBtnLabel: {
    fontSize:   15,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },

  // ── Achievements section ──
  sectionHeading: {
    fontSize:     15,
    fontWeight:   '600',
    fontFamily:   'Geist-SemiBold',
    marginBottom: 4,
    marginTop:    4,
  },
});
