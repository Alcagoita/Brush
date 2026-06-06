/**
 * SharedTaskInboxScreen — KAN-87
 *
 * Receive, accept and decline shared tasks.
 *
 * Each row shows:
 *   - Sender: amber avatar dot + display name + @username (if available)
 *   - Task title + category chip
 *   - Time sent
 *   - Accept / Decline buttons
 *   - "Follow @{sender}" button when not already following (KAN-98)
 *
 * Accept: copies task into today's task list, removes from incoming.
 * Decline: removes from incoming only.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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
} from '../services/firestore';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { SharedTask } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SharedTaskInbox'>;

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(ts: { toDate(): Date } | null | undefined): string {
  if (!ts) { return ''; }
  const diff = Date.now() - ts.toDate().getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)   { return 'just now'; }
  if (mins < 60)  { return `${mins}m ago`; }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   { return `${hrs}h ago`; }
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Inbox row ────────────────────────────────────────────────────────────────

interface RowProps {
  item:            SharedTask;
  currentUid:      string;
  currentUsername: string;
  currentName:     string;
  onAccept:        (item: SharedTask) => Promise<void>;
  onDecline:       (item: SharedTask) => Promise<void>;
  palette:         ReturnType<typeof useTheme>['palette'];
}

function InboxRow({
  item, currentUid, currentUsername, currentName,
  onAccept, onDecline, palette,
}: RowProps) {
  const [actioning,  setActioning]  = useState(false);
  const [followed,   setFollowed]   = useState<boolean | null>(null);
  const [following,  setFollowing]  = useState(false);

  // Check follow state once on mount
  useEffect(() => {
    if (!item.sentBy || item.sentBy === currentUid) { return; }
    isFollowing(currentUid, item.sentBy)
      .then(setFollowed)
      .catch(() => setFollowed(false));
  }, [currentUid, item.sentBy]);

  const handleAccept = async () => {
    setActioning(true);
    await onAccept(item).catch(() => setActioning(false));
  };

  const handleDecline = async () => {
    setActioning(true);
    await onDecline(item).catch(() => setActioning(false));
  };

  const handleFollow = async () => {
    if (following || !item.sentBy) { return; }
    setFollowing(true);
    try {
      await followUser(
        currentUid,
        currentUsername,
        currentName,
        item.sentBy,
        item.sentByUsername ?? '',
        item.sentByName,
      );
      setFollowed(true);
    } catch (e) {
      console.warn('[SharedTaskInbox] follow failed', e);
    } finally {
      setFollowing(false);
    }
  };

  const senderHandle = item.sentByUsername ? `@${item.sentByUsername}` : null;

  return (
    <View style={[styles.row, { backgroundColor: palette.surface2 }]}>
      {/* Sender */}
      <View style={styles.senderRow}>
        <Avatar photoURL={null} size={32} accessibilityLabel={`${item.sentByName} avatar`} />
        <View style={styles.senderInfo}>
          <Text style={[styles.senderName, { color: palette.text }]}>{item.sentByName}</Text>
          {senderHandle ? (
            <Text style={[styles.senderHandle, { color: palette.muted }]}>{senderHandle}</Text>
          ) : null}
        </View>
        <Text style={[styles.time, { color: palette.faint }]}>
          {relativeTime(item.sentAt as any)}
        </Text>
      </View>

      {/* Task */}
      <Text style={[styles.taskTitle, { color: palette.text }]}>{item.title}</Text>
      <View style={[styles.categoryChip, { backgroundColor: palette.surface }]}>
        <Text style={[styles.categoryLabel, { color: palette.muted }]}>
          {item.category}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn, styles.acceptBtn, { backgroundColor: palette.text },
            (pressed || actioning) && { opacity: 0.7 },
          ]}
          onPress={handleAccept}
          disabled={actioning}
          accessibilityRole="button"
          accessibilityLabel="Accept task">
          {actioning
            ? <ActivityIndicator size="small" color={palette.bg} />
            : <Text style={[styles.actionLabel, { color: palette.bg }]}>Accept</Text>
          }
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionBtn, styles.declineBtn,
            { borderColor: palette.line },
            (pressed || actioning) && { opacity: 0.7 },
          ]}
          onPress={handleDecline}
          disabled={actioning}
          accessibilityRole="button"
          accessibilityLabel="Decline task">
          <Text style={[styles.actionLabel, { color: palette.muted }]}>Decline</Text>
        </Pressable>
      </View>

      {/* Follow prompt */}
      {followed === false && !following && item.sentBy !== currentUid && (
        <Pressable
          onPress={handleFollow}
          style={styles.followPrompt}
          accessibilityRole="button"
          accessibilityLabel={`Follow ${senderHandle ?? item.sentByName}`}>
          <Text style={[styles.followLabel, { color: palette.accent }]}>
            + Follow {senderHandle ?? item.sentByName}
          </Text>
        </Pressable>
      )}
      {following && (
        <ActivityIndicator size="small" color={palette.accent} style={styles.followPrompt} />
      )}
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

  const [items,           setItems]           = useState<SharedTask[]>([]);
  const [currentUsername, setCurrentUsername] = useState('');

  // Fetch current user's username once for follow calls
  useEffect(() => {
    if (!currentUid) { return; }
    getUser(currentUid).then(u => setCurrentUsername(u?.username ?? ''));
  }, [currentUid]);

  // Real-time inbox subscription
  useEffect(() => {
    if (!currentUid) { return; }
    return subscribeToIncomingSharedTasks(
      currentUid,
      setItems,
      err => console.warn('[SharedTaskInbox] subscription error', err),
    );
  }, [currentUid]);

  const handleAccept = useCallback(async (item: SharedTask) => {
    await acceptSharedTask(currentUid, item);
  }, [currentUid]);

  const handleDecline = useCallback(async (item: SharedTask) => {
    await declineSharedTask(currentUid, item.id);
  }, [currentUid]);

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
          Inbox{items.length > 0 ? ` (${items.length})` : ''}
        </Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: palette.text }]}>All caught up</Text>
            <Text style={[styles.emptySubtitle, { color: palette.muted }]}>
              Nothing brushed your way yet.
            </Text>
          </View>
        ) : (
          items.map(item => (
            <InboxRow
              key={item.id}
              item={item}
              currentUid={currentUid}
              currentUsername={currentUsername}
              currentName={currentName}
              onAccept={handleAccept}
              onDecline={handleDecline}
              palette={palette}
            />
          ))
        )}
      </ScrollView>
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
  navBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: 17, fontWeight: '600', fontFamily: 'Geist-SemiBold',
  },

  content: {
    paddingHorizontal: spacing.page,
    paddingTop:        20,
    gap:               12,
  },

  // ── Row ──
  row: {
    borderRadius:  radii.card,
    padding:       16,
    gap:           10,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },
  senderInfo: { flex: 1 },
  senderName: {
    fontSize: 14, fontWeight: '500', fontFamily: 'Geist-Medium',
  },
  senderHandle: {
    fontSize: 12, fontFamily: 'Geist-Regular',
  },
  time: {
    fontSize: 12, fontFamily: 'Geist-Regular',
  },
  taskTitle: {
    fontSize: 15, fontWeight: '500', fontFamily: 'Geist-Medium',
  },
  categoryChip: {
    alignSelf:         'flex-start',
    paddingHorizontal: 10,
    paddingVertical:    4,
    borderRadius:      9999,
  },
  categoryLabel: {
    fontSize: 12, fontFamily: 'Geist-Regular', textTransform: 'capitalize',
  },

  // ── Actions ──
  actions: {
    flexDirection: 'row',
    gap:           10,
    marginTop:     2,
  },
  actionBtn: {
    flex:           1,
    height:         40,
    borderRadius:   radii.ctaBtn,
    alignItems:     'center',
    justifyContent: 'center',
  },
  acceptBtn: {},
  declineBtn: {
    borderWidth: 1,
  },
  actionLabel: {
    fontSize: 14, fontWeight: '500', fontFamily: 'Geist-Medium',
  },

  // ── Follow prompt ──
  followPrompt: {
    alignSelf: 'flex-start',
  },
  followLabel: {
    fontSize: 13, fontFamily: 'Geist-Medium', fontWeight: '500',
  },

  // ── Empty state ──
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, gap: 8,
  },
  emptyTitle: {
    fontSize: 17, fontWeight: '600', fontFamily: 'Geist-SemiBold',
  },
  emptySubtitle: {
    fontSize: 14, fontFamily: 'Geist-Regular', textAlign: 'center',
  },
});
