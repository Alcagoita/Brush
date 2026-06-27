/**
 * SocialHubScreen — KAN-100 / KAN-212
 *
 * Social inbox with three sections:
 *   1. Friends   — follow notifications from /users/{uid}/inbox (KAN-212)
 *   2. Challenges — placeholder (future)
 *   3. Shared tasks — incoming shared to-dos
 *
 * Plus the following list and quick-action buttons.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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
import {
  getFollowing,
  getInboxEntries,
  markInboxEntryRead,
  followUser,
  isFollowing,
  getUser,
} from '../services/firestore';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { SharedTask, FollowEntry, InboxEntry } from '../types';

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

function SectionHeader({ title, palette }: {
  title:   string;
  palette: ReturnType<typeof useTheme>['palette'];
}) {
  return (
    <Text style={[styles.sectionTitle, { color: palette.muted }]}>{title}</Text>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SocialHubScreen() {
  const { palette } = useTheme();
  const navigation  = useNavigation<Nav>();
  const insets      = useSafeAreaInsets();

  const currentUser = getAuth().currentUser;
  const uid         = currentUser?.uid ?? '';

  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);
  const [inboxEntries, setInboxEntries] = useState<InboxEntry[]>([]);
  const [pendingTasks, setPendingTasks] = useState<SharedTask[]>([]);
  const [following,    setFollowing]    = useState<FollowEntry[]>([]);

  // Track which follow-back operations are in progress (keyed by fromUid).
  const [followingBack, setFollowingBack] = useState<Record<string, boolean>>({});
  // Track which entries have already been followed back (so we hide the button).
  const [followedBack, setFollowedBack] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    if (!uid) {
      setLoading(false);
      setError(false);
      setInboxEntries([]);
      setPendingTasks([]);
      setFollowing([]);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const [entries, tasks, followingList] = await withTimeout(
        Promise.all([
          getInboxEntries(uid),
          getIncomingSharedTasks(uid),
          getFollowing(uid),
        ]),
        LOAD_TIMEOUT_MS,
      );
      setInboxEntries(entries);
      setPendingTasks(tasks);
      setFollowing(followingList);

      // Pre-compute which inbox senders we already follow back.
      const followChecks = await Promise.all(
        entries
          .filter(e => e.type === 'follow_request')
          .map(e => isFollowing(uid, e.fromUid).then(v => [e.fromUid, v] as [string, boolean])),
      );
      setFollowedBack(Object.fromEntries(followChecks));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Follow back ─────────────────────────────────────────────────────────────

  const handleFollowBack = useCallback(async (entry: InboxEntry) => {
    if (followingBack[entry.fromUid] || followedBack[entry.fromUid]) { return; }
    setFollowingBack(prev => ({ ...prev, [entry.fromUid]: true }));
    try {
      const me = await getUser(uid);
      await followUser(
        uid,
        me?.username ?? '',
        currentUser?.displayName ?? '',
        entry.fromUid,
        entry.fromUsername,
        entry.fromDisplayName,
      );
      setFollowedBack(prev => ({ ...prev, [entry.fromUid]: true }));
    } catch (err) {
      console.warn('[SocialHubScreen] follow back failed', err);
    } finally {
      setFollowingBack(prev => ({ ...prev, [entry.fromUid]: false }));
    }
  }, [uid, currentUser, followingBack, followedBack]);

  // ── Mark inbox entry read on tap ─────────────────────────────────────────────

  const handleInboxTap = useCallback(async (entry: InboxEntry, onTap: () => void) => {
    if (!entry.read) {
      markInboxEntryRead(uid, entry.id).catch(() => {});
      setInboxEntries(prev =>
        prev.map(e => e.id === entry.id ? { ...e, read: true } : e),
      );
    }
    onTap();
  }, [uid]);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const unreadCount = inboxEntries.filter(e => !e.read).length;

  // ── Render ───────────────────────────────────────────────────────────────────

  const renderFollowEntry = ({ item: entry }: { item: InboxEntry }) => {
    const alreadyFollowing = followedBack[entry.fromUid];
    return (
      <TouchableOpacity
        style={[styles.feedRow, { backgroundColor: palette.surface2 }]}
        onPress={() =>
          handleInboxTap(entry, () =>
            entry.fromUsername && navigation.navigate('PublicProfile', { username: entry.fromUsername }),
          )
        }
        accessibilityRole="button"
        accessibilityLabel={`${entry.fromDisplayName} started following you`}>

        {/* Unread dot */}
        {!entry.read && (
          <View style={[styles.unreadDot, { backgroundColor: palette.accent }]} />
        )}

        <Avatar photoURL={null} size={32} accessibilityLabel={entry.fromDisplayName} />

        <View style={styles.feedText}>
          <Text style={[styles.feedMain, { color: palette.text }]} numberOfLines={1}>
            <Text style={{ fontFamily: 'Geist-SemiBold' }}>
              {entry.fromUsername ? `@${entry.fromUsername}` : entry.fromDisplayName}
            </Text>
            {' started following you'}
          </Text>
          <Text style={[styles.feedTime, { color: palette.faint }]}>
            {relativeTime(entry.createdAt)}
          </Text>
        </View>

        <View style={styles.inboxActions}>
          {!alreadyFollowing && (
            <TouchableOpacity
              style={[styles.followBackBtn, { backgroundColor: palette.text }]}
              onPress={() => handleFollowBack(entry)}
              disabled={!!followingBack[entry.fromUid]}
              accessibilityRole="button"
              accessibilityLabel={`Follow back ${entry.fromDisplayName}`}>
              <Text style={[styles.followBackLabel, { color: palette.bg }]}>
                {followingBack[entry.fromUid] ? '…' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
          {alreadyFollowing && (
            <Text style={[styles.followingLabel, { color: palette.muted }]}>Following</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSharedTask = ({ item: task }: { item: SharedTask }) => (
    <TouchableOpacity
      style={[styles.feedRow, { backgroundColor: palette.surface2 }]}
      onPress={() => navigation.navigate('SharedTaskInbox')}
      accessibilityRole="button"
      accessibilityLabel={`Shared task from ${task.sentByName}`}>
      <Avatar photoURL={null} size={32} accessibilityLabel={task.sentByName} />
      <View style={styles.feedText}>
        <Text style={[styles.feedMain, { color: palette.text }]} numberOfLines={1}>
          <Text style={{ fontFamily: 'Geist-SemiBold' }}>{task.sentByName}</Text>
          {' brushed a to-do your way'}
        </Text>
        <Text style={[styles.feedSub, { color: palette.muted }]} numberOfLines={1}>
          {task.title}
        </Text>
      </View>
      <Text style={[styles.feedTime, { color: palette.faint }]}>
        {relativeTime(task.sentAt)}
      </Text>
    </TouchableOpacity>
  );

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
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: palette.text }]}>Friends</Text>
          {unreadCount > 0 && (
            <View style={[styles.badgePill, { backgroundColor: palette.accent }]}>
              <Text style={[styles.badgeText, { color: palette.bg }]}>
                {unreadCount > 99 ? '99+' : String(unreadCount)}
              </Text>
            </View>
          )}
        </View>
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
        <FlatList
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          data={[null]}
          renderItem={() => null}
          ListHeaderComponent={
            <View>
              {/* ── Quick actions ── */}
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

              {/* ── Section: Friends (follow notifications) ── */}
              <SectionHeader title="FRIENDS" palette={palette} />
              {inboxEntries.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: palette.surface2 }]}>
                  <UsersIcon color={palette.faint} size={28} />
                  <Text style={[styles.emptyText, { color: palette.muted }]}>
                    No follow notifications yet.
                  </Text>
                </View>
              ) : (
                <View style={styles.feedList}>
                  {inboxEntries.map((entry, i) => (
                    <View key={entry.id}>
                      {renderFollowEntry({ item: entry })}
                      {i < inboxEntries.length - 1 && <View style={styles.feedSep} />}
                    </View>
                  ))}
                </View>
              )}

              {/* ── Section: Challenges (placeholder) ── */}
              <SectionHeader title="CHALLENGES" palette={palette} />
              <View style={[styles.emptyCard, { backgroundColor: palette.surface2 }]}>
                <TrophyIcon color={palette.faint} size={28} />
                <Text style={[styles.emptyText, { color: palette.muted }]}>
                  Challenge alerts coming soon.
                </Text>
              </View>

              {/* ── Section: Shared tasks ── */}
              <SectionHeader title="SHARED TASKS" palette={palette} />
              {pendingTasks.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: palette.surface2 }]}>
                  <ShareIcon color={palette.faint} size={28} />
                  <Text style={[styles.emptyText, { color: palette.muted }]}>
                    No shared tasks yet.
                  </Text>
                </View>
              ) : (
                <View style={styles.feedList}>
                  {pendingTasks.map((task, i) => (
                    <View key={task.id}>
                      {renderSharedTask({ item: task })}
                      {i < pendingTasks.length - 1 && <View style={styles.feedSep} />}
                    </View>
                  ))}
                </View>
              )}

              {/* ── Section: Following list ── */}
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
                <FlatList<FollowEntry>
                  horizontal
                  data={following}
                  keyExtractor={entry => entry.uid}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.followingScroll}
                  renderItem={({ item: entry }) => (
                    <TouchableOpacity
                      style={styles.followingItem}
                      onPress={() =>
                        entry.username && navigation.navigate('PublicProfile', { username: entry.username })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={entry.displayName}>
                      <Avatar photoURL={null} size={44} accessibilityLabel={entry.displayName} />
                      <Text style={[styles.followingHandle, { color: palette.muted }]} numberOfLines={1}>
                        {entry.username ? `@${entry.username}` : entry.displayName}
                      </Text>
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => <View style={styles.followingSep} />}
                  ListFooterComponent={
                    <TouchableOpacity
                      style={[styles.findMoreChip, { backgroundColor: palette.surface2, borderColor: palette.line, marginLeft: 16 }]}
                      onPress={() => navigation.navigate('ContactSuggestions')}
                      accessibilityRole="button"
                      accessibilityLabel="Find more friends">
                      <Text style={[styles.findMoreLabel, { color: palette.accent }]}>Find more</Text>
                    </TouchableOpacity>
                  }
                />
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1 },

  topBar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.page,
    paddingVertical:   12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title:    { fontSize: 17, fontWeight: '600', fontFamily: 'Geist-SemiBold' },
  badgePill: {
    minWidth:          18,
    height:            18,
    borderRadius:      9,
    paddingHorizontal: 5,
    alignItems:        'center',
    justifyContent:    'center',
  },
  badgeText: { fontSize: 11, fontFamily: 'Geist-SemiBold', fontVariant: ['tabular-nums'] },

  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorCenter: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: spacing.page,
    gap:               16,
  },
  errorText:  { fontSize: 14, fontFamily: 'Geist-Regular', textAlign: 'center', lineHeight: 20 },
  retryBtn:   { paddingHorizontal: 24, paddingVertical: 12, borderRadius: radii.ctaBtn },
  retryLabel: { fontSize: 14, fontFamily: 'Geist-Medium', fontWeight: '500' },

  content: { paddingHorizontal: spacing.page, paddingTop: 20 },

  // ── Quick actions ──
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
    height:         52,
    borderRadius:   radii.ctaBtn,
  },
  actionLabel: { fontSize: 14, fontWeight: '500', fontFamily: 'Geist-Medium' },

  // ── Section header ──
  sectionTitle: {
    fontSize:      11,
    fontWeight:    '600',
    fontFamily:    'Geist-SemiBold',
    letterSpacing: 0.8,
    marginBottom:  10,
    marginTop:     20,
  },

  // ── Feed ──
  feedList: { gap: 0 },
  feedSep:  { height: 8 },
  feedRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
    padding:       12,
    borderRadius:  radii.card,
  },
  feedText: { flex: 1 },
  feedMain: { fontSize: 14, fontFamily: 'Geist-Regular' },
  feedSub:  { fontSize: 12, fontFamily: 'Geist-Regular', marginTop: 2 },
  feedTime: { fontSize: 11, fontFamily: 'Geist-Regular', fontVariant: ['tabular-nums'] },

  // ── Unread dot ──
  unreadDot: { width: 8, height: 8, borderRadius: 4 },

  // ── Inbox actions (follow back / following) ──
  inboxActions: { alignItems: 'flex-end', gap: 4 },
  followBackBtn: {
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:      radii.chip,
  },
  followBackLabel: { fontSize: 12, fontFamily: 'Geist-Medium', fontWeight: '500' },
  followingLabel:  { fontSize: 12, fontFamily: 'Geist-Regular' },

  // ── Empty card ──
  emptyCard: {
    borderRadius: radii.card,
    padding:      20,
    alignItems:   'center',
    gap:          10,
    marginBottom: 4,
  },
  emptyText: { fontSize: 14, fontFamily: 'Geist-Regular', textAlign: 'center', lineHeight: 20 },

  // ── Following ──
  followingScroll:  { paddingRight: spacing.page },
  followingSep:     { width: 16 },
  followingItem:    { alignItems: 'center', gap: 6, width: 60 },
  followingHandle:  { fontSize: 11, fontFamily: 'Geist-Regular', textAlign: 'center' },
  findMoreChip: {
    height:            44,
    paddingHorizontal: 16,
    borderRadius:      radii.chip,
    borderWidth:       1,
    alignSelf:         'center',
    alignItems:        'center',
    justifyContent:    'center',
  },
  findMoreLabel: { fontSize: 13, fontWeight: '500', fontFamily: 'Geist-Medium' },
});
