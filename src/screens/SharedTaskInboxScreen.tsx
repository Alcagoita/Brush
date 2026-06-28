/**
 * SharedTaskInboxScreen — unified Notifications screen (KAN-87 / KAN-212)
 *
 * Shows all incoming social events in one chronological feed:
 *   - Follow notifications (from /users/{uid}/inbox, type: follow_request)
 *   - Shared task notifications (from /sharedTasks/{uid}/incoming)
 *
 * Follow row: tap → PublicProfile; "Follow back" button inline.
 * Shared task row: Accept / Decline inline.
 * Inbox entries are marked read when the screen mounts.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import { useTheme } from '../theme';
import { spacing, radius as radii } from '../theme/tokens';
import { ChevronLeftIcon } from '../components/AppIcon';
import Avatar from '../components/Avatar';
import {
  subscribeToIncomingSharedTasks,
  acceptSharedTask,
  declineSharedTask,
} from '../services/sharing';
import {
  getUser,
  isFollowing,
  followUser,
  getInboxEntries,
  markInboxEntryRead,
} from '../services/firestore';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { SharedTask, InboxEntry } from '../types';
import { COPY } from '../constants/copy';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SharedTaskInbox'>;

// ─── Feed item union ──────────────────────────────────────────────────────────

type FeedItem =
  | { kind: 'follow'; data: InboxEntry }
  | { kind: 'task';   data: SharedTask };

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function itemTimestamp(item: FeedItem): number {
  if (item.kind === 'follow') {
    return item.data.createdAt?.toDate?.().getTime() ?? 0;
  }
  return (item.data.sentAt as any)?.toDate?.().getTime() ?? 0;
}

// ─── Follow row ───────────────────────────────────────────────────────────────

interface FollowRowProps {
  entry:       InboxEntry;
  currentUid:  string;
  currentUsername: string;
  currentName: string;
  palette:     ReturnType<typeof useTheme>['palette'];
  onViewProfile: (username: string) => void;
}

function FollowRow({ entry, currentUid, currentUsername, currentName, palette, onViewProfile }: FollowRowProps) {
  const [alreadyFollowing, setAlreadyFollowing] = useState<boolean | null>(null);
  const [followingBack, setFollowingBack]       = useState(false);

  useEffect(() => {
    isFollowing(currentUid, entry.fromUid)
      .then(setAlreadyFollowing)
      .catch(() => setAlreadyFollowing(false));
  }, [currentUid, entry.fromUid]);

  const handleFollowBack = async () => {
    if (followingBack || alreadyFollowing) { return; }
    setFollowingBack(true);
    try {
      await followUser(
        currentUid,
        currentUsername,
        currentName,
        entry.fromUid,
        entry.fromUsername,
        entry.fromDisplayName,
      );
      setAlreadyFollowing(true);
    } catch (err) {
      console.warn('[Notifications] follow back failed', err);
    } finally {
      setFollowingBack(false);
    }
  };

  const handle = entry.fromUsername ? `@${entry.fromUsername}` : entry.fromDisplayName;

  return (
    <Pressable
      style={[styles.row, { backgroundColor: palette.surface2 }]}
      onPress={() => entry.fromUsername && onViewProfile(entry.fromUsername)}
      accessibilityRole="button"
      accessibilityLabel={`${handle} started following you`}>
      <View style={styles.rowTop}>
        <Avatar photoURL={null} size={32} accessibilityLabel={handle} />
        <View style={styles.rowText}>
          <Text style={[styles.rowMain, { color: palette.text }]} numberOfLines={2}>
            <Text style={{ fontFamily: 'Geist-SemiBold' }}>{handle}</Text>
            {' started following you'}
          </Text>
          <Text style={[styles.time, { color: palette.faint }]}>
            {relativeTime(entry.createdAt)}
          </Text>
        </View>
      </View>
      {alreadyFollowing === false && (
        <Pressable
          style={({ pressed }) => [
            styles.followBackBtn, { backgroundColor: palette.text },
            (pressed || followingBack) && { opacity: 0.7 },
          ]}
          onPress={handleFollowBack}
          disabled={followingBack}
          accessibilityRole="button"
          accessibilityLabel={`Follow back ${handle}`}>
          <Text style={[styles.followBackLabel, { color: palette.bg }]}>
            {followingBack ? '…' : 'Follow back'}
          </Text>
        </Pressable>
      )}
      {alreadyFollowing === true && (
        <Text style={[styles.followingLabel, { color: palette.muted }]}>Following</Text>
      )}
    </Pressable>
  );
}

// ─── Shared task row ──────────────────────────────────────────────────────────

interface TaskRowProps {
  item:            SharedTask;
  currentUid:      string;
  currentUsername: string;
  currentName:     string;
  onAccept:        (item: SharedTask) => Promise<void>;
  onDecline:       (item: SharedTask) => Promise<void>;
  palette:         ReturnType<typeof useTheme>['palette'];
}

function SharedTaskRow({
  item, currentUid, currentUsername, currentName,
  onAccept, onDecline, palette,
}: TaskRowProps) {
  const [actioning,  setActioning]  = useState(false);
  const [followed,   setFollowed]   = useState<boolean | null>(null);
  const [following,  setFollowing]  = useState(false);

  useEffect(() => {
    if (!item.sentBy || item.sentBy === currentUid) { return; }
    isFollowing(currentUid, item.sentBy)
      .then(setFollowed)
      .catch(() => setFollowed(false));
  }, [currentUid, item.sentBy]);

  const handleAccept  = async () => { setActioning(true); await onAccept(item).catch(() => setActioning(false)); };
  const handleDecline = async () => { setActioning(true); await onDecline(item).catch(() => setActioning(false)); };

  const handleFollow = async () => {
    if (following || !item.sentBy) { return; }
    setFollowing(true);
    try {
      await followUser(currentUid, currentUsername, currentName, item.sentBy, item.sentByUsername ?? '', item.sentByName);
      setFollowed(true);
    } catch (e) {
      console.warn('[Notifications] follow failed', e);
    } finally {
      setFollowing(false);
    }
  };

  const senderHandle = item.sentByUsername ? `@${item.sentByUsername}` : null;

  return (
    <View style={[styles.row, { backgroundColor: palette.surface2 }]}>
      <View style={styles.rowTop}>
        <Avatar photoURL={null} size={32} accessibilityLabel={`${item.sentByName} avatar`} />
        <View style={styles.rowText}>
          <Text style={[styles.senderName, { color: palette.text }]}>
            {senderHandle ?? item.sentByName}
          </Text>
          <Text style={[styles.time, { color: palette.faint }]}>
            {relativeTime(item.sentAt as any)}
          </Text>
        </View>
      </View>
      <Text style={[styles.taskTitle, { color: palette.text }]}>{item.title}</Text>
      <View style={[styles.categoryChip, { backgroundColor: palette.surface }]}>
        <Text style={[styles.categoryLabel, { color: palette.muted }]}>
          {item.category}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, { backgroundColor: palette.text }, (pressed || actioning) && { opacity: 0.7 }]}
          onPress={handleAccept}
          disabled={actioning}
          accessibilityRole="button"
          accessibilityLabel="Accept task">
          {actioning
            ? <ActivityIndicator size="small" color={palette.bg} />
            : <Text style={[styles.actionLabel, { color: palette.bg }]}>Accept</Text>}
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, styles.declineBtn, { borderColor: palette.line }, (pressed || actioning) && { opacity: 0.7 }]}
          onPress={handleDecline}
          disabled={actioning}
          accessibilityRole="button"
          accessibilityLabel="Decline task">
          <Text style={[styles.actionLabel, { color: palette.muted }]}>Decline</Text>
        </Pressable>
      </View>
      {followed === false && !following && item.sentBy !== currentUid && (
        <Pressable onPress={handleFollow} style={styles.followPrompt} accessibilityRole="button">
          <Text style={[styles.followLabel, { color: palette.accent }]}>
            + Follow {senderHandle ?? item.sentByName}
          </Text>
        </Pressable>
      )}
      {following && <ActivityIndicator size="small" color={palette.accent} style={styles.followPrompt} />}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SharedTaskInboxScreen() {
  const { palette } = useTheme();
  const navigation  = useNavigation<Nav>();
  const insets      = useSafeAreaInsets();

  const currentUser = getAuth().currentUser;
  const currentUid  = currentUser?.uid ?? '';
  const currentName = currentUser?.displayName ?? '';

  const [sharedTasks,      setSharedTasks]      = useState<SharedTask[]>([]);
  const [inboxEntries,     setInboxEntries]      = useState<InboxEntry[]>([]);
  const [currentUsername,  setCurrentUsername]   = useState('');

  // Fetch username once for follow calls
  useEffect(() => {
    if (!currentUid) { return; }
    getUser(currentUid).then(u => setCurrentUsername(u?.username ?? ''));
  }, [currentUid]);

  // Fetch follow inbox entries and mark them all read
  useEffect(() => {
    if (!currentUid) { return; }
    let cancelled = false;
    getInboxEntries(currentUid).then(entries => {
      if (cancelled) { return; }
      setInboxEntries(entries);
      entries.filter(e => !e.read).forEach(e =>
        markInboxEntryRead(currentUid, e.id).catch(() => {}),
      );
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [currentUid]);

  // Real-time subscription for shared tasks
  useEffect(() => {
    if (!currentUid) { return; }
    return subscribeToIncomingSharedTasks(
      currentUid,
      setSharedTasks,
      err => console.warn('[Notifications] shared task subscription error', err),
    );
  }, [currentUid]);

  const handleAccept  = useCallback(async (item: SharedTask) => { await acceptSharedTask(currentUid, item); }, [currentUid]);
  const handleDecline = useCallback(async (item: SharedTask) => { await declineSharedTask(currentUid, item.id); }, [currentUid]);

  // Merge and sort all events newest first
  const feedItems: FeedItem[] = [
    ...inboxEntries.map(e  => ({ kind: 'follow' as const, data: e })),
    ...sharedTasks.map(t   => ({ kind: 'task'   as const, data: t })),
  ].sort((a, b) => itemTimestamp(b) - itemTimestamp(a));

  const unreadCount = inboxEntries.filter(e => !e.read).length + sharedTasks.length;

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
        <Text style={[styles.title, { color: palette.text }]}>
          {'Notifications'}
          {unreadCount > 0 ? ` (${unreadCount})` : ''}
        </Text>
        <View style={styles.navBtn} />
      </View>

      <FlatList<FeedItem>
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        data={feedItems}
        keyExtractor={item =>
          item.kind === 'follow' ? `follow:${item.data.id}` : `task:${item.data.id}`
        }
        renderItem={({ item }) => {
          if (item.kind === 'follow') {
            return (
              <FollowRow
                entry={item.data}
                currentUid={currentUid}
                currentUsername={currentUsername}
                currentName={currentName}
                palette={palette}
                onViewProfile={username => navigation.navigate('PublicProfile', { username })}
              />
            );
          }
          return (
            <SharedTaskRow
              item={item.data}
              currentUid={currentUid}
              currentUsername={currentUsername}
              currentName={currentName}
              onAccept={handleAccept}
              onDecline={handleDecline}
              palette={palette}
            />
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: palette.text }]}>All caught up</Text>
            <Text style={[styles.emptySubtitle, { color: palette.muted }]}>
              {COPY.emptyState.inboxNoShared}
            </Text>
          </View>
        }
      />
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

  content:   { paddingHorizontal: spacing.page, paddingTop: 20 },
  separator: { height: 12 },

  // ── Shared row shell ──
  row:    { borderRadius: radii.card, padding: 16, gap: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { flex: 1, gap: 2 },
  rowMain: { fontSize: 14, fontFamily: 'Geist-Regular', lineHeight: 18 },
  time:    { fontSize: 12, fontFamily: 'Geist-Regular' },

  // ── Shared task row extras ──
  senderName:    { fontSize: 14, fontWeight: '500', fontFamily: 'Geist-Medium' },
  taskTitle:     { fontSize: 15, fontWeight: '500', fontFamily: 'Geist-Medium' },
  categoryChip:  { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  categoryLabel: { fontSize: 12, fontFamily: 'Geist-Regular', textTransform: 'capitalize' },

  // ── Accept / Decline ──
  actions:    { flexDirection: 'row', gap: 10, marginTop: 2 },
  actionBtn:  { flex: 1, height: 40, borderRadius: radii.ctaBtn, alignItems: 'center', justifyContent: 'center' },
  declineBtn: { borderWidth: 1 },
  actionLabel: { fontSize: 14, fontWeight: '500', fontFamily: 'Geist-Medium' },

  // ── Follow prompt (shared task) ──
  followPrompt: { alignSelf: 'flex-start' },
  followLabel:  { fontSize: 13, fontFamily: 'Geist-Medium', fontWeight: '500' },

  // ── Follow back (follow row) ──
  followBackBtn:   { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7, borderRadius: radii.chip },
  followBackLabel: { fontSize: 13, fontFamily: 'Geist-Medium', fontWeight: '500' },
  followingLabel:  { fontSize: 12, fontFamily: 'Geist-Regular' },

  // ── Empty ──
  empty:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  emptyTitle:    { fontSize: 17, fontWeight: '600', fontFamily: 'Geist-SemiBold' },
  emptySubtitle: { fontSize: 14, fontFamily: 'Geist-Regular', textAlign: 'center' },
});
