/**
 * ChallengeDetailScreen — KAN-103
 *
 * Opened via FCM notification deep-link or from the Social hub activity feed.
 *
 * States:
 *   pending  — Accept / Decline buttons shown
 *   active   — live leaderboard with progress bars
 *   completed — final leaderboard; winner row highlighted with 🏆
 */

import React, { useEffect, useMemo, useState } from 'react';
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
import { ChevronLeftIcon, TrophyIcon } from '../components/AppIcon';
import {
  subscribeToChallenge,
  updateParticipantStatus,
} from '../services/challenges';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Challenge, ChallengeParticipant } from '../types';

type Nav   = NativeStackNavigationProp<RootStackParamList, 'ChallengeDetail'>;
type Route = RouteProp<RootStackParamList, 'ChallengeDetail'>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDeadline(ts: Challenge['deadline']): string {
  if (!ts) { return ''; }
  const d = (ts as any).toDate?.() ?? new Date((ts as any)._seconds * 1000);
  return d.toLocaleDateString() + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function typeLabel(c: Challenge): string {
  if (c.type === 'goal') { return `First to complete ${c.goalCount} tasks`; }
  return `Most tasks by ${formatDeadline(c.deadline)}`;
}

// ─── Progress bar row ─────────────────────────────────────────────────────────

interface LeaderboardRowProps {
  uid:         string;
  p:           ChallengeParticipant;
  goal?:       number;
  isMe:        boolean;
  isWinner:    boolean;
  palette:     ReturnType<typeof useTheme>['palette'];
}

function LeaderboardRow({ uid: _uid, p, goal, isMe, isWinner, palette }: LeaderboardRowProps) {
  const max      = goal ?? Math.max(p.completedCount, 1);
  const progress = Math.min(p.completedCount / max, 1);
  const handle   = p.username ? `@${p.username}` : p.displayName;

  return (
    <View style={styles.lbRow} accessibilityLabel={`${handle}: ${p.completedCount}${goal ? `/${goal}` : ''} tasks`}>
      <View style={styles.lbLeft}>
        <Text style={[styles.lbHandle, { color: isMe ? palette.accent : palette.text }]}>
          {handle}{isMe ? ' (you)' : ''}
        </Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: palette.line }]}>
        <View
          style={[
            styles.progressFill,
            {
              width:           `${Math.round(progress * 100)}%` as `${number}%`,
              backgroundColor: isWinner ? palette.accent : isMe ? palette.text : palette.muted,
            },
          ]}
        />
      </View>
      <View style={styles.lbRight}>
        <Text style={[styles.lbCount, { color: palette.text }]} accessibilityLabel={`${p.completedCount} tasks`}>
          {p.completedCount}{goal ? `/${goal}` : ''}
        </Text>
        {isWinner && <TrophyIcon color={palette.accent} size={14} />}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ChallengeDetailScreen() {
  const { palette } = useTheme();
  const navigation  = useNavigation<Nav>();
  const route       = useRoute<Route>();
  const insets      = useSafeAreaInsets();

  const uid            = getAuth().currentUser?.uid ?? '';
  const { challengeId } = route.params;

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [actioning, setActioning] = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    return subscribeToChallenge(
      challengeId,
      c => { setChallenge(c); setLoading(false); },
      _err => { setLoading(false); setError('Could not load challenge.'); },
    );
  }, [challengeId]);

  const myStatus = challenge?.participants[uid]?.status;

  // Sorted leaderboard: by completedCount desc, then by displayName
  const leaderboard = useMemo(() => {
    if (!challenge) { return []; }
    return Object.entries(challenge.participants)
      .sort(([, a], [, b]) => b.completedCount - a.completedCount || a.displayName.localeCompare(b.displayName));
  }, [challenge]);

  const handleAccept = async () => {
    if (!challenge) { return; }
    setActioning(true);
    try {
      await updateParticipantStatus(challengeId, uid, 'accepted');

      // Transition challenge to active once the accepting participant is the
      // last one outstanding (all have responded).
      const remaining = Object.values(challenge.participants)
        .filter(p => p.status === 'pending' && p !== challenge.participants[uid]);
      if (remaining.length === 0) {
        const { updateDoc } = await import('@react-native-firebase/firestore');
        const { challengeRef } = await import('../services/challenges');
        await updateDoc(challengeRef(challengeId), { status: 'active' });
      }
    } catch {
      setError('Failed to accept. Please try again.');
    } finally {
      setActioning(false);
    }
  };

  const handleDecline = async () => {
    if (!challenge) { return; }
    setActioning(true);
    try {
      await updateParticipantStatus(challengeId, uid, 'declined');

      // If all non-creator participants declined → complete the challenge.
      const nonCreator = Object.entries(challenge.participants)
        .filter(([pUid]) => pUid !== challenge.createdBy);
      const allDeclined = nonCreator.every(([pUid, p]) =>
        pUid === uid ? true : p.status === 'declined',
      );
      if (allDeclined) {
        const { updateDoc } = await import('@react-native-firebase/firestore');
        const { challengeRef } = await import('../services/challenges');
        await updateDoc(challengeRef(challengeId), { status: 'completed' });
      }
    } catch {
      setError('Failed to decline. Please try again.');
    } finally {
      setActioning(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.bg, paddingTop: insets.top }]}>

      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: palette.line }]}>
        <Pressable style={styles.navBtn} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back">
          <ChevronLeftIcon color={palette.text} size={22} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>Challenge</Text>
        <View style={styles.navBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: palette.muted }]}>{error}</Text>
        </View>
      ) : challenge ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}>

          {/* Challenge header */}
          <View style={[styles.headerCard, { backgroundColor: palette.surface2 }]}>
            <TrophyIcon color={palette.accent} size={28} />
            <Text style={[styles.typeLine, { color: palette.text }]}>{typeLabel(challenge)}</Text>
            {challenge.message ? (
              <Text style={[styles.messageText, { color: palette.muted }]}>"{challenge.message}"</Text>
            ) : null}
            <View style={[styles.statusBadge, { backgroundColor: palette.surface }]}>
              <Text style={[styles.statusLabel, { color: palette.muted }]}>
                {challenge.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Accept / Decline (pending participants only) */}
          {challenge.status !== 'completed' && myStatus === 'pending' && (
            <View style={styles.actionRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.acceptBtn, { backgroundColor: palette.text },
                  (pressed || actioning) && { opacity: 0.7 },
                ]}
                onPress={handleAccept}
                disabled={actioning}
                accessibilityRole="button"
                accessibilityLabel="Accept challenge">
                {actioning
                  ? <ActivityIndicator size="small" color={palette.bg} />
                  : <Text style={[styles.btnLabel, { color: palette.bg }]}>Accept</Text>
                }
              </Pressable>
              <Pressable
                onPress={handleDecline}
                disabled={actioning}
                accessibilityRole="button"
                accessibilityLabel="Decline challenge">
                <Text style={[styles.declineLabel, { color: palette.muted }]}>Decline</Text>
              </Pressable>
            </View>
          )}

          {/* Live leaderboard */}
          {(challenge.status === 'active' || challenge.status === 'completed') && (
            <View style={[styles.leaderboard, { backgroundColor: palette.surface2 }]}>
              <Text style={[styles.lbTitle, { color: palette.muted }]}>
                {challenge.status === 'completed' ? 'FINAL RESULTS' : 'LIVE'}
              </Text>
              {leaderboard.map(([pUid, p]) => (
                <LeaderboardRow
                  key={pUid}
                  uid={pUid}
                  p={p}
                  goal={challenge.type === 'goal' ? challenge.goalCount : undefined}
                  isMe={pUid === uid}
                  isWinner={p.won}
                  palette={palette}
                />
              ))}
            </View>
          )}

          {/* Pending participants list */}
          {challenge.status === 'pending' && (
            <View style={[styles.pendingList, { backgroundColor: palette.surface2 }]}>
              <Text style={[styles.lbTitle, { color: palette.muted }]}>PARTICIPANTS</Text>
              {Object.entries(challenge.participants).map(([pUid, p]) => (
                <View key={pUid} style={styles.pendingRow}>
                  <Text style={[styles.pendingName, { color: palette.text }]}>
                    {p.username ? `@${p.username}` : p.displayName}
                    {pUid === uid ? ' (you)' : ''}
                  </Text>
                  <Text style={[styles.pendingStatus, {
                    color: p.status === 'accepted' ? '#4caf7d' : p.status === 'declined' ? '#e05252' : palette.muted,
                  }]}>
                    {p.status}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {error ? (
            <Text style={[styles.errorText, { color: '#e05252', textAlign: 'center' }]}>{error}</Text>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.page, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title:  { fontSize: 17, fontWeight: '600', fontFamily: 'Geist-SemiBold' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.page, paddingTop: 20, gap: 16 },

  headerCard: {
    borderRadius: radii.card, padding: 20, alignItems: 'center', gap: 10,
  },
  typeLine:    { fontSize: 16, fontWeight: '600', fontFamily: 'Geist-SemiBold', textAlign: 'center' },
  messageText: { fontSize: 13, fontFamily: 'Geist-Regular', fontStyle: 'italic', textAlign: 'center' },
  statusBadge: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999,
  },
  statusLabel: { fontSize: 11, fontFamily: 'Geist-Medium', fontWeight: '500', letterSpacing: 0.5 },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  acceptBtn: {
    flex: 1, height: 48, borderRadius: radii.ctaBtn,
    alignItems: 'center', justifyContent: 'center',
  },
  btnLabel:     { fontSize: 15, fontWeight: '600', fontFamily: 'Geist-SemiBold' },
  declineLabel: { fontSize: 14, fontFamily: 'Geist-Regular', textDecorationLine: 'underline' },

  leaderboard: { borderRadius: radii.card, padding: 16, gap: 14 },
  lbTitle:     { fontSize: 11, fontFamily: 'Geist-Medium', fontWeight: '500', letterSpacing: 0.8 },
  lbRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lbLeft:      { width: 90 },
  lbHandle:    { fontSize: 12, fontFamily: 'Geist-Medium', fontWeight: '500' },
  progressTrack: {
    flex: 1, height: 8, borderRadius: 4, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  lbRight:     { flexDirection: 'row', alignItems: 'center', gap: 4, width: 48, justifyContent: 'flex-end' },
  lbCount:     { fontSize: 12, fontFamily: 'Geist-Medium', fontWeight: '500', fontVariant: ['tabular-nums'] },

  pendingList: { borderRadius: radii.card, padding: 16, gap: 12 },
  pendingRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pendingName:   { fontSize: 14, fontFamily: 'Geist-Regular' },
  pendingStatus: { fontSize: 12, fontFamily: 'Geist-Medium', fontWeight: '500', textTransform: 'capitalize' },

  errorText: { fontSize: 14, fontFamily: 'Geist-Regular' },
});
