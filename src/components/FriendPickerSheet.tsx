/**
 * FriendPickerSheet — KAN-101
 *
 * Bottom sheet for sending a task to one or more followed friends.
 * Backed by the user's following list (KAN-98) — no email search.
 *
 * Features:
 *   - Following list fetched once each time the sheet opens (KAN-218)
 *   - Search bar to filter by @username or display name
 *   - Multi-select with checkboxes
 *   - Send button sends to all selected friends in parallel
 *   - Per-row sent confirmation
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import { getScreenKeyboardAvoidingBehavior } from '../utils/keyboardAvoiding';
import Avatar from './Avatar';
import { getFollowing } from '../services/firestore';
import { sendSharedTask } from '../services/sharing';
import type { FollowEntry, Task } from '../types';
import { COPY } from '../constants/copy';

export interface FriendPickerSheetProps {
  visible:         boolean;
  onClose:         () => void;
  task:            Task;
  senderUid:       string;
  senderName:      string;
  senderUsername?: string;
}

export default function FriendPickerSheet({
  visible, onClose, task, senderUid, senderName, senderUsername,
}: FriendPickerSheetProps) {
  const { palette } = useTheme();
  const insets      = useSafeAreaInsets();

  const [following,        setFollowing]        = useState<FollowEntry[]>([]);
  const [loadingFollowing, setLoadingFollowing] = useState(true);
  const [followingError,   setFollowingError]   = useState('');
  const [query,     setQuery]       = useState('');
  const [selected,  setSelected]    = useState<Set<string>>(new Set());
  const [sending,   setSending]     = useState(false);
  const [sentTo,    setSentTo]      = useState<Set<string>>(new Set());
  const [error,     setError]       = useState('');

  // Fetch the following list once each time the sheet opens
  useEffect(() => {
    if (!visible || !senderUid) { return; }
    setLoadingFollowing(true);
    setFollowingError('');
    getFollowing(senderUid)
      .then(setFollowing)
      .catch(err => {
        console.warn('[FriendPickerSheet] following error', err);
        setFollowingError(COPY.friendPicker.followingLoadError);
      })
      .finally(() => setLoadingFollowing(false));
  }, [visible, senderUid]);

  // Reset state when sheet closes
  const handleClose = useCallback(() => {
    setQuery('');
    setSelected(new Set());
    setSentTo(new Set());
    setError('');
    onClose();
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) { return following; }
    return following.filter(f =>
      f.displayName.toLowerCase().includes(q) ||
      (f.username ?? '').toLowerCase().includes(q),
    );
  }, [following, query]);

  const toggleSelect = (uid: string) => {
    if (sentTo.has(uid)) { return; } // already sent, can't unselect
    setSelected(prev => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  };

  const handleSend = async () => {
    if (selected.size === 0 || sending) { return; }
    setSending(true);
    setError('');
    const targets = following.filter(f => selected.has(f.uid));
    const results = await Promise.allSettled(
      targets.map(f => sendSharedTask({
        senderUid,
        senderName,
        senderUsername,
        recipientUid:  f.uid,
        recipientName: f.displayName,
        task,
      })),
    );
    const newSent = new Set(sentTo);
    const failed: string[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') { newSent.add(targets[i].uid); }
      else { failed.push(targets[i].displayName); }
    });
    setSentTo(newSent);
    setSelected(new Set());
    if (failed.length > 0) {
      setError(COPY.friendPicker.sendFailed(failed.join(', ')));
    }
    setSending(false);
  };

  const canSend = selected.size > 0 && !sending;

  const renderItem = ({ item }: { item: FollowEntry }) => {
    const isSelected = selected.has(item.uid);
    const isSent     = sentTo.has(item.uid);
    return (
      <Pressable
        style={[styles.row, { borderBottomColor: palette.line }]}
        onPress={() => toggleSelect(item.uid)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
        accessibilityLabel={item.displayName}>
        <Avatar photoURL={null} size={36} accessibilityLabel={item.displayName} />
        <View style={styles.rowText}>
          <Text style={[styles.rowName, { color: palette.text }]}>{item.displayName}</Text>
          {item.username ? (
            <Text style={[styles.rowHandle, { color: palette.muted }]}>@{item.username}</Text>
          ) : null}
        </View>
        {isSent ? (
          <Text style={[styles.sentLabel, { color: palette.accent }]}>
            {item.username ? COPY.friendPicker.sentToHandle(item.username) : COPY.friendPicker.sentCheck}
          </Text>
        ) : (
          <View style={[
            styles.checkbox,
            { borderColor: isSelected ? palette.text : palette.line },
            isSelected && { backgroundColor: palette.text },
          ]}>
            {isSelected && <Text style={[styles.checkmark, { color: palette.bg }]}>✓</Text>}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.scrim} onPress={handleClose} accessibilityLabel={COPY.friendPicker.closeA11y} />
      <KeyboardAvoidingView
        behavior={getScreenKeyboardAvoidingBehavior()}
        style={styles.wrapper}>
        <View style={[styles.sheet, {
          backgroundColor: palette.surface,
          paddingBottom:   insets.bottom + 16,
          borderTopColor:  palette.line,
        }]}>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: palette.line }]}>
            <Text style={[styles.title, { color: palette.text }]}>{COPY.friendPicker.title}</Text>
            <Pressable onPress={handleClose} hitSlop={12} accessibilityLabel={COPY.friendPicker.closeA11y}>
              <Text style={[styles.closeBtn, { color: palette.muted }]}>✕</Text>
            </Pressable>
          </View>

          {/* Task preview */}
          <View style={[styles.taskPreview, { backgroundColor: palette.surface2, borderColor: palette.line }]}>
            <Text style={[styles.taskLabel, { color: palette.muted }]}>{COPY.friendPicker.taskLabel}</Text>
            <Text style={[styles.taskTitle, { color: palette.text }]} numberOfLines={1}>
              {task.title}
            </Text>
          </View>

          {/* Search */}
          <View style={[styles.searchRow, { backgroundColor: palette.surface2, borderColor: palette.line }]}>
            <TextInput
              style={[styles.searchInput, { color: palette.text }]}
              placeholder={COPY.friendPicker.searchPlaceholder}
              placeholderTextColor={palette.faint}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={COPY.friendPicker.searchA11y}
            />
          </View>

          {/* Friend list */}
          {loadingFollowing ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator color={palette.muted} accessibilityLabel={COPY.friendPicker.loadingA11y} />
            </View>
          ) : followingError ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: '#e05252' }]} accessibilityRole="alert">
                {followingError}
              </Text>
            </View>
          ) : following.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: palette.muted }]}>
                {COPY.friendPicker.notFollowingAnyone}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={f => f.uid}
              renderItem={renderItem}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={[styles.emptyText, { color: palette.muted }]}>
                    {COPY.friendPicker.noMatches(query)}
                  </Text>
                </View>
              }
            />
          )}

          {/* Error */}
          {error ? (
            <Text style={[styles.errorText, { color: '#e05252' }]}>{error}</Text>
          ) : null}

          {/* Send button */}
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: canSend ? palette.text : palette.surface2 },
              (pressed && canSend) && { opacity: 0.8 },
            ]}
            onPress={handleSend}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel={selected.size > 0 ? COPY.friendPicker.sendAtLeastOneA11y(selected.size) : COPY.friendPicker.selectFriendsFirstA11y}>
            {sending
              ? <ActivityIndicator color={palette.bg} />
              : <Text style={[styles.sendLabel, { color: canSend ? palette.bg : palette.faint }]}>
                  {selected.size > 0 ? COPY.friendPicker.sendButton : COPY.friendPicker.selectFriendsFirstButton}
                </Text>
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  wrapper: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.page, paddingVertical: 16, borderBottomWidth: 1,
  },
  title:    { fontSize: 16, fontFamily: 'Geist-SemiBold', fontWeight: '600' },
  closeBtn: { fontSize: 16, lineHeight: 20 },

  taskPreview: {
    marginHorizontal: spacing.page, marginTop: 14,
    borderRadius: radius.card, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10, gap: 2,
  },
  taskLabel: { fontSize: 11, fontFamily: 'Geist-Medium', fontWeight: '500', letterSpacing: 0.3 },
  taskTitle: { fontSize: 14, fontFamily: 'Geist-Medium', fontWeight: '500' },

  searchRow: {
    marginHorizontal: spacing.page, marginTop: 12,
    borderRadius: radius.ctaBtn, borderWidth: 1,
    paddingHorizontal: 14, height: 40, justifyContent: 'center',
  },
  searchInput: { fontSize: 14, fontFamily: 'Geist-Regular', height: '100%' },

  list: { marginTop: 4, maxHeight: 260 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: spacing.page, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText:   { flex: 1 },
  rowName:   { fontSize: 14, fontFamily: 'Geist-Medium', fontWeight: '500' },
  rowHandle: { fontSize: 12, fontFamily: 'Geist-Regular' },
  sentLabel: { fontSize: 13, fontFamily: 'Geist-Medium', fontWeight: '500' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { fontSize: 13, lineHeight: 16 },

  emptyWrap: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: spacing.page },
  emptyText: { fontSize: 14, fontFamily: 'Geist-Regular', textAlign: 'center' },

  errorText: { marginHorizontal: spacing.page, marginTop: 8, fontSize: 13, fontFamily: 'Geist-Regular' },

  sendBtn: {
    marginHorizontal: spacing.page, marginTop: 12,
    height: 50, borderRadius: radius.ctaBtn,
    alignItems: 'center', justifyContent: 'center',
  },
  sendLabel: { fontSize: 15, fontFamily: 'Geist-SemiBold', fontWeight: '600' },
});
