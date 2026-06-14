/**
 * SocialHubScreen — KAN-100
 *
 * Central screen for all social features.
 * Accessible from the people icon in the Today screen header.
 *
 * Layout (scrollable):
 *   1. Quick actions — "Share a to-do" (KAN-101) · "Challenge a friend" (KAN-102)
 *   2. Activity feed — pending shared tasks · recent followers
 *   3. Following list — horizontal scroll of avatar dots + @username
 *      "Find more" chip → contacts suggestions (KAN-99)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import { useTheme } from '../theme';
import { spacing, radius as radii } from '../theme/tokens';
import { ChevronLeftIcon, RefreshIcon, ShareIcon, TrophyIcon, UsersIcon } from '../components/AppIcon';
import Avatar from '../components/Avatar';
import { getIncomingSharedTasks } from '../services/sharing';
import { getFollowing, getFollowers } from '../services/firestore';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { SharedTask, FollowEntry } from '../types';
import { COPY } from '../constants/copy';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SocialHub'>;

const LOAD_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Load timed out')), ms),
    ),
  ]);
}

// ─── Relative time ────────────────────────────────────────────────────────────

function relativeTime(ts: { toDate(): Date } | null | undefined): string {
  if (!ts) { return ''; }
  const diff = Date.now() - ts.toDate().getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  { return 'just now'; }
  if (mins < 60) { return `${mins}m ago`; }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  { return `${hrs}h ago`; }
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, palette }: { title: string; palette: any }) {
  return (
    <Text style={[styles.sectionTitle, { color: palette.muted }]}>{title}</Text>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SocialHubScreen() {
  const { palette } = useTheme();
  const navigation  = useNavigation<Nav>();
  const insets      = useSafeAreaInsets();

  const uid = getAuth().currentUser?.uid ?? '';

  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(false);
  const [pendingTasks,   setPendingTasks]   = useState<SharedTask[]>([]);
  const [following,      setFollowing]      = useState<FollowEntry[]>([]);
  const [recentFollowers, setRecentFollowers] = useState<FollowEntry[]>([]);

  const loadData = useCallback(async () => {
    if (!uid) { return; }
    setLoading(true);
    setError(false);
    try {
      const [tasks, followingList, followersList] = await withTimeout(
        Promise.all([
          getIncomingSharedTasks(uid),
          getFollowing(uid),
          getFollowers(uid),
        ]),
        LOAD_TIMEOUT_MS,
      );
      setPendingTasks(tasks);
      setFollowing(followingList);
      setRecentFollowers(followersList.slice(0, 5));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { loadData(); }, [loadData]);

  const hasActivity = pendingTasks.length > 0 || recentFollowers.length > 0;

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
        <Text style={[styles.title, { color: palette.text }]}>Friends</Text>
        {/* Refresh button */}
        <Pressable
          style={styles.navBtn}
          onPress={loadData}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Refresh">
          <RefreshIcon color={loading ? palette.faint : palette.text} size={20} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={palette.accent} />
        </View>
      ) : error ? (
        <View style={styles.errorCenter}>
          <Text style={[styles.errorText, { color: palette.muted }]}>
            {'Could not load Friends. Check your connection.'}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: palette.text }]}
            onPress={loadData}
            accessibilityRole="button"
            accessibilityLabel="Retry">
            <Text style={[styles.retryLabel, { color: palette.bg }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}>

          {/* ── Section 1: Quick actions ── */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: palette.text }]}
              onPress={() => navigation.navigate('ShareToDo')}
              accessibilityRole="button"
              accessibilityLabel="Brush a To-do with a friend">
              <ShareIcon color={palette.bg} size={18} />
              <Text style={[styles.actionLabel, { color: palette.bg }]}>Brush a To-do</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: palette.surface2 }]}
              onPress={() => navigation.navigate('CreateChallenge')}
              accessibilityRole="button"
              accessibilityLabel="Challenge a friend">
              <TrophyIcon color={palette.text} size={18} />
              <Text style={[styles.actionLabel, { color: palette.text }]}>Challenge</Text>
            </TouchableOpacity>
          </View>

          {/* ── Section 2: Activity feed ── */}
          <SectionHeader title="ACTIVITY" palette={palette} />

          {!hasActivity ? (
            <View style={[styles.emptyCard, { backgroundColor: palette.surface2 }]}>
              <UsersIcon color={palette.faint} size={28} />
              <Text style={[styles.emptyText, { color: palette.muted }]}>
                No activity yet — follow friends to get started.
              </Text>
            </View>
          ) : (
            <View style={styles.feedList}>
              {/* Pending shared tasks */}
              {pendingTasks.map(task => (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.feedRow, { backgroundColor: palette.surface2 }]}
                  onPress={() => navigation.navigate('SharedTaskInbox')}
                  accessibilityRole="button"
                  accessibilityLabel={`Shared task from ${task.sentByName}`}>
                  <Avatar photoURL={null} size={32} accessibilityLabel={task.sentByName} />
                  <View style={styles.feedText}>
                    <Text style={[styles.feedMain, { color: palette.text }]} numberOfLines={1}>
                      <Text style={{ fontFamily: 'Geist-Medium' }}>{task.sentByName}</Text>
                      {' brushed a to-do your way'}
                    </Text>
                    <Text style={[styles.feedSub, { color: palette.muted }]} numberOfLines={1}>
                      {task.title}
                    </Text>
                  </View>
                  <Text style={[styles.feedTime, { color: palette.faint }]}>
                    {relativeTime(task.sentAt as any)}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Recent followers */}
              {recentFollowers.map(f => (
                <TouchableOpacity
                  key={f.uid}
                  style={[styles.feedRow, { backgroundColor: palette.surface2 }]}
                  onPress={() => f.username && navigation.navigate('PublicProfile', { username: f.username })}
                  accessibilityRole="button"
                  accessibilityLabel={`${f.displayName} started following you`}>
                  <Avatar photoURL={null} size={32} accessibilityLabel={f.displayName} />
                  <View style={styles.feedText}>
                    <Text style={[styles.feedMain, { color: palette.text }]} numberOfLines={1}>
                      <Text style={{ fontFamily: 'Geist-Medium' }}>
                        {f.username ? `@${f.username}` : f.displayName}
                      </Text>
                      {' started following you'}
                    </Text>
                  </View>
                  <Text style={[styles.feedTime, { color: palette.faint }]}>
                    {relativeTime(f.followedAt as any)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Section 3: Following list ── */}
          <SectionHeader
            title={following.length > 0 ? `FOLLOWING (${following.length})` : 'FOLLOWING'}
            palette={palette}
          />

          {following.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: palette.surface2 }]}>
              <Text style={[styles.emptyText, { color: palette.muted }]}>
                You're not following anyone yet.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.followingScroll}>
              {following.map(entry => (
                <TouchableOpacity
                  key={entry.uid}
                  style={styles.followingItem}
                  onPress={() => entry.username && navigation.navigate('PublicProfile', { username: entry.username })}
                  accessibilityRole="button"
                  accessibilityLabel={entry.displayName}>
                  <Avatar photoURL={null} size={44} accessibilityLabel={entry.displayName} />
                  <Text style={[styles.followingHandle, { color: palette.muted }]} numberOfLines={1}>
                    {entry.username ? `@${entry.username}` : entry.displayName}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* "Find more" chip → KAN-99 contacts suggestions */}
              <TouchableOpacity
                style={[styles.findMoreChip, { backgroundColor: palette.surface2, borderColor: palette.line }]}
                onPress={() => navigation.navigate('ContactSuggestions')}
                accessibilityRole="button"
                accessibilityLabel="Find more friends">
                <Text style={[styles.findMoreLabel, { color: palette.accent }]}>Find more</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title:  { fontSize: 17, fontWeight: '600', fontFamily: 'Geist-SemiBold' },

  loadingCenter: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },

  errorCenter: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.page,
    gap:            16,
  },
  errorText: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
    lineHeight: 20,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical:   12,
    borderRadius:      radii.ctaBtn,
  },
  retryLabel: {
    fontSize:   14,
    fontFamily: 'Geist-Medium',
    fontWeight: '500',
  },

  content: {
    paddingHorizontal: spacing.page,
    paddingTop:        20,
    gap:               16,
  },

  // ── Quick actions ──
  quickActions: {
    flexDirection: 'row',
    gap:           12,
  },
  actionBtn: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
    height:         52,
    borderRadius:   radii.ctaBtn,
  },
  actionLabel: {
    fontSize:   14,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },

  // ── Section header ──
  sectionTitle: {
    fontSize:      11,
    fontWeight:    '600',
    fontFamily:    'Geist-SemiBold',
    letterSpacing: 0.8,
    marginBottom:  -4,
  },

  // ── Feed ──
  feedList: { gap: 8 },
  feedRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
    padding:        12,
    borderRadius:   radii.card,
  },
  feedText: { flex: 1 },
  feedMain: { fontSize: 14, fontFamily: 'Geist-Regular' },
  feedSub:  { fontSize: 12, fontFamily: 'Geist-Regular', marginTop: 2 },
  feedTime: { fontSize: 11, fontFamily: 'Geist-Regular' },

  // ── Empty card ──
  emptyCard: {
    borderRadius:   radii.card,
    padding:        20,
    alignItems:     'center',
    gap:            10,
  },
  emptyText: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
    lineHeight: 20,
  },

  // ── Following ──
  followingScroll: { gap: 16, paddingRight: spacing.page },
  followingItem:   { alignItems: 'center', gap: 6, width: 60 },
  followingHandle: {
    fontSize:   11,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
  },
  findMoreChip: {
    height:            44,
    paddingHorizontal: 16,
    borderRadius:      9999,
    borderWidth:       1,
    alignSelf:         'center',
    alignItems:        'center',
    justifyContent:    'center',
  },
  findMoreLabel: {
    fontSize:   13,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
});
