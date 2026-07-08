/**
 * ContactSuggestionsScreen — KAN-99
 *
 * Scans the device contacts (with permission), hashes each phone/email
 * client-side, queries the `userDiscovery/{hash}` index, and displays
 * matched Brush users with a Follow button.
 *
 * Privacy: raw contact data never leaves the device.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
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
import { ChevronLeftIcon, UsersIcon } from '../components/AppIcon';
import Avatar from '../components/Avatar';
import {
  requestContactsPermission,
  findContactsOnBrush,
  contactsLibAvailable,
  type ContactMatch,
} from '../services/contacts';
import {
  getUser,
  isFollowing,
  followUser,
} from '../services/firestore';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { COPY } from '../constants/copy';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ContactSuggestions'>;

type ScreenState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'scanning' }
  | { status: 'results'; matches: ContactMatch[] }
  | { status: 'empty' }
  | { status: 'denied' }
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

export default function ContactSuggestionsScreen() {
  const { palette } = useTheme();
  const navigation  = useNavigation<Nav>();
  const insets      = useSafeAreaInsets();

  const currentAuth = getAuth().currentUser;
  const currentUid  = currentAuth?.uid ?? '';

  const [state,    setState]    = useState<ScreenState>({ status: 'idle' });
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [following, setFollowingInProgress] = useState<Set<string>>(new Set());

  const handleScan = async () => {
    if (!contactsLibAvailable) { setState({ status: 'unavailable' }); return; }

    setState({ status: 'requesting' });
    const permission = await requestContactsPermission();

    if (permission === 'denied') { setState({ status: 'denied' }); return; }
    if (permission === 'unavailable') { setState({ status: 'unavailable' }); return; }

    setState({ status: 'scanning' });
    try {
      const raw = await findContactsOnBrush();
      // Filter out the current user and already-followed users.
      const filtered = raw.filter(m => m.uid !== currentUid);
      // Check follow state for each match.
      const followStates = await Promise.allSettled(
        filtered.map(m => isFollowing(currentUid, m.uid)),
      );
      const alreadyFollowed = new Set<string>();
      followStates.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value) { alreadyFollowed.add(filtered[i].uid); }
      });
      setFollowed(alreadyFollowed);

      if (filtered.length === 0) { setState({ status: 'empty' }); return; }
      setState({ status: 'results', matches: filtered });
    } catch (e) {
      setState({ status: 'error', message: COPY.contactSuggestions.errorGeneric });
    }
  };

  const handleFollow = async (match: ContactMatch) => {
    if (following.has(match.uid)) { return; }
    setFollowingInProgress(prev => new Set(prev).add(match.uid));
    try {
      const currentUserData = await getUser(currentUid);
      await followUser(
        currentUid,
        currentUserData?.username ?? '',
        currentAuth?.displayName ?? '',
        match.uid,
        match.username ?? '',
        match.displayName,
      );
      setFollowed(prev => new Set(prev).add(match.uid));
    } catch (e) {
      console.warn('[ContactSuggestions] follow failed', e);
    } finally {
      setFollowingInProgress(prev => { const n = new Set(prev); n.delete(match.uid); return n; });
    }
  };

  const renderItem = ({ item }: { item: ContactMatch }) => {
    const isFollowed    = followed.has(item.uid);
    const isInProgress  = following.has(item.uid);
    return (
      <View style={[styles.row, { backgroundColor: palette.surface2 }]}>
        <Avatar photoURL={null} size={40} accessibilityLabel={item.displayName} />
        <View style={styles.rowText}>
          <Text style={[styles.rowName, { color: palette.text }]}>{item.displayName}</Text>
          {item.username
            ? <Text style={[styles.rowHandle, { color: palette.muted }]}>@{item.username}</Text>
            : null}
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.followBtn,
            isFollowed
              ? { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line }
              : { backgroundColor: palette.text },
            (pressed || isInProgress) && { opacity: 0.7 },
          ]}
          onPress={() => handleFollow(item)}
          disabled={isFollowed || isInProgress}
          accessibilityRole="button"
          accessibilityLabel={isFollowed
            ? COPY.contactSuggestions.followingA11y(item.displayName)
            : COPY.contactSuggestions.followA11y(item.displayName)}>
          {isInProgress
            ? <ActivityIndicator size="small" color={isFollowed ? palette.text : palette.bg} />
            : <Text style={[styles.followLabel, { color: isFollowed ? palette.text : palette.bg }]}>
                {isFollowed ? COPY.contactSuggestions.following : COPY.contactSuggestions.follow}
              </Text>
          }
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.bg, paddingTop: insets.top }]}>

      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: palette.line }]}>
        <Pressable style={styles.navBtn} onPress={() => navigation.goBack()}
          accessibilityRole="button" accessibilityLabel={COPY.contactSuggestions.backA11y}>
          <ChevronLeftIcon color={palette.text} size={22} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>{COPY.contactSuggestions.screenTitle}</Text>
        <View style={styles.navBtn} />
      </View>

      {/* Content */}
      {state.status === 'idle' && (
        <View style={styles.center}>
          <UsersIcon color={palette.faint} size={40} />
          <Text style={[styles.h2, { color: palette.text }]}>{COPY.contactSuggestions.idleTitle}</Text>
          <Text style={[styles.sub, { color: palette.muted }]}>
            {COPY.contactSuggestions.idleSub}
          </Text>
          <Pressable
            style={[styles.cta, { backgroundColor: palette.text }]}
            onPress={handleScan}
            accessibilityRole="button"
            accessibilityLabel={COPY.contactSuggestions.scanA11y}>
            <Text style={[styles.ctaLabel, { color: palette.bg }]}>{COPY.contactSuggestions.scanButton}</Text>
          </Pressable>
        </View>
      )}

      {(state.status === 'requesting' || state.status === 'scanning') && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.accent} />
          <Text style={[styles.sub, { color: palette.muted }]}>
            {state.status === 'requesting' ? COPY.contactSuggestions.requestingPermission : COPY.contactSuggestions.scanning}
          </Text>
        </View>
      )}

      {state.status === 'denied' && (
        <View style={styles.center}>
          <Text style={[styles.h2, { color: palette.text }]}>{COPY.contactSuggestions.deniedTitle}</Text>
          <Text style={[styles.sub, { color: palette.muted }]}>
            {COPY.contactSuggestions.deniedSub}
          </Text>
          <Pressable
            style={[styles.cta, { backgroundColor: palette.text }]}
            onPress={() => Linking.openSettings()}
            accessibilityRole="button"
            accessibilityLabel={COPY.contactSuggestions.openSettingsA11y}>
            <Text style={[styles.ctaLabel, { color: palette.bg }]}>{COPY.contactSuggestions.openSettingsButton}</Text>
          </Pressable>
        </View>
      )}

      {state.status === 'unavailable' && (
        <View style={styles.center}>
          <Text style={[styles.h2, { color: palette.text }]}>{COPY.contactSuggestions.unavailableTitle}</Text>
          <Text style={[styles.sub, { color: palette.muted }]}>
            {COPY.contactSuggestions.unavailableSub}
          </Text>
        </View>
      )}

      {state.status === 'empty' && (
        <View style={styles.center}>
          <UsersIcon color={palette.faint} size={40} />
          <Text style={[styles.h2, { color: palette.text }]}>{COPY.contactSuggestions.emptyTitle}</Text>
          <Text style={[styles.sub, { color: palette.muted }]}>
            {COPY.contactSuggestions.emptySub}
          </Text>
        </View>
      )}

      {state.status === 'error' && (
        <View style={styles.center}>
          <Text style={[styles.h2, { color: palette.text }]}>{COPY.contactSuggestions.errorTitle}</Text>
          <Text style={[styles.sub, { color: palette.muted }]}>{state.message}</Text>
          <Pressable style={[styles.cta, { backgroundColor: palette.text }]} onPress={handleScan}>
            <Text style={[styles.ctaLabel, { color: palette.bg }]}>{COPY.contactSuggestions.tryAgain}</Text>
          </Pressable>
        </View>
      )}

      {state.status === 'results' && (
        <FlatList
          data={state.matches}
          keyExtractor={m => m.uid}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.page, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title:  { fontSize: 17, fontWeight: '600', fontFamily: 'Geist-SemiBold' },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.page, gap: 12,
  },
  h2:  { fontSize: 18, fontWeight: '600', fontFamily: 'Geist-SemiBold', textAlign: 'center' },
  sub: { fontSize: 14, fontFamily: 'Geist-Regular', textAlign: 'center', lineHeight: 20 },
  cta: {
    marginTop: 8, height: 48, paddingHorizontal: 32,
    borderRadius: radii.ctaBtn, alignItems: 'center', justifyContent: 'center',
  },
  ctaLabel: { fontSize: 15, fontWeight: '600', fontFamily: 'Geist-SemiBold' },

  list: { paddingHorizontal: spacing.page, paddingTop: 16 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: radii.card,
  },
  rowText:   { flex: 1 },
  rowName:   { fontSize: 14, fontWeight: '500', fontFamily: 'Geist-Medium' },
  rowHandle: { fontSize: 12, fontFamily: 'Geist-Regular' },
  followBtn: {
    height: 36, paddingHorizontal: 16, borderRadius: radii.ctaBtn,
    alignItems: 'center', justifyContent: 'center',
  },
  followLabel: { fontSize: 13, fontWeight: '600', fontFamily: 'Geist-SemiBold' },
});
