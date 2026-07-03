/**
 * PointsHistoryScreen — KAN-33
 *
 * Two-section screen pushed from ProfileScreen ("See all"):
 *
 * 1. Points History — chronological list of PointsHistoryEntry records,
 *    newest first. Paginated via server-side Firestore cursors: fetches
 *    PAGE_SIZE rows at a time, "Load more" fetches the next page (unbounded
 *    history is never fully loaded at once — KAN-222).
 *
 * 2. Achievements Gallery — grid of all known achievements (earned + locked).
 *    Earned: full accent colour, date unlocked.
 *    Locked: surface2 background, muted text, unlock condition shown.
 *
 * Achievement set is hardcoded for v1:
 *   - first_task       "First task"         Complete your first task ever
 *   - daily_complete   "Day complete"        Complete every task for a day
 *
 * Navigation: pushed from Profile; back via header chevron.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import { ChevronLeftIcon } from '../components/AppIcon';
import AchievementTile, {
  ACHIEVEMENT_CATALOGUE,
  achievementsGridStyle,
} from '../components/AchievementTile';
import {
  getPointsHistory,
  getAchievements,
} from '../services/firestore';
import type { PointsHistoryCursor } from '../services/firestore/points';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { AchievementsMap, PointsHistoryEntry } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(ts: FirebaseFirestoreTypes.Timestamp | null | undefined): string {
  if (!ts) { return ''; }
  return new Date(ts.seconds * 1000).toLocaleDateString('en-GB', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });
}

function reasonLabel(reason: string): string {
  switch (reason) {
    case 'task_completed':     return 'Brushed';
    case 'achievement_bonus':  return 'Achievement bonus';
    case 'daily_complete_bonus': return 'Daily complete bonus';
    case 'streak_bonus':       return 'Streak bonus';
    default:                   return reason.replace(/_/g, ' ');
  }
}

// ─── Points history row ───────────────────────────────────────────────────────

function HistoryRow({
  entry,
  isFirst,
  isLast,
  palette,
}: {
  entry:   PointsHistoryEntry;
  isFirst: boolean;
  isLast:  boolean;
  palette: ReturnType<typeof useTheme>['palette'];
}) {
  return (
    <View style={[
      styles.historyRow,
      { backgroundColor: palette.surface2 },
      isFirst && styles.historyRowFirst,
      isLast  && styles.historyRowLast,
      !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
    ]}>
      <View style={styles.historyContent}>
        <Text style={[styles.historyTitle, { color: palette.text }]} numberOfLines={1}>
          {entry.taskTitle}
        </Text>
        <Text style={[styles.historyReason, { color: palette.muted }]}>
          {reasonLabel(entry.reason)} · {formatTimestamp(entry.awardedAt)}
        </Text>
      </View>
      <Text style={[styles.historyPoints, { color: palette.accent }]}>
        +{entry.points}
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PointsHistoryScreen() {
  const { palette } = useTheme();
  const navigation  = useNavigation();
  const insets      = useSafeAreaInsets();
  const uid         = getAuth().currentUser?.uid ?? '';

  // ── Points history ──────────────────────────────────────────────────────────
  const [history,       setHistory]       = useState<PointsHistoryEntry[]>([]);
  const [cursor,        setCursor]        = useState<PointsHistoryCursor | null>(null);
  const [hasMore,       setHasMore]       = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [loadingMore,   setLoadingMore]   = useState(false);

  // Cross-page dedup of task_completed entries by taskId (mirrors the old
  // single-query dedup behaviour — see getPointsHistory in services/firestore/points.ts).
  // A ref, not state: it must survive across pages without forcing re-renders.
  const seenTaskIds = useRef<Set<string>>(new Set());

  function dedupeAgainstSeen(entries: PointsHistoryEntry[]): PointsHistoryEntry[] {
    const kept: PointsHistoryEntry[] = [];
    for (const entry of entries) {
      if (entry.reason === 'task_completed' && entry.taskId) {
        if (seenTaskIds.current.has(entry.taskId)) { continue; }
        seenTaskIds.current.add(entry.taskId);
      }
      kept.push(entry);
    }
    return kept;
  }

  // Re-fetch the first page on every focus so returning from Today after
  // brushing a task shows it without a manual reload (KAN-218 follow-up).
  useFocusEffect(useCallback(() => {
    if (!uid) { return; }
    seenTaskIds.current = new Set();
    getPointsHistory(uid, PAGE_SIZE)
      .then(({ entries, nextCursor }) => {
        setHistory(dedupeAgainstSeen(entries));
        setCursor(nextCursor);
        setHasMore(nextCursor !== null);
        setHistoryLoaded(true);
      })
      .catch(err => console.warn('[PointsHistoryScreen] history error', err));
  }, [uid]));

  const handleLoadMore = useCallback(() => {
    if (!uid || !cursor || loadingMore) { return; }
    setLoadingMore(true);
    getPointsHistory(uid, PAGE_SIZE, cursor)
      .then(({ entries, nextCursor }) => {
        setHistory(prev => [...prev, ...dedupeAgainstSeen(entries)]);
        setCursor(nextCursor);
        setHasMore(nextCursor !== null);
      })
      .catch(err => console.warn('[PointsHistoryScreen] load more error', err))
      .finally(() => setLoadingMore(false));
  }, [uid, cursor, loadingMore]);

  // ── Achievements — one-shot, re-run on every focus so returning from Today
  // after unlocking one shows it (KAN-218) ──────────────────────────────────
  const [earnedMap, setEarnedMap] = useState<AchievementsMap>({});

  useFocusEffect(useCallback(() => {
    if (!uid) { return; }
    getAchievements(uid).then(setEarnedMap).catch(err => console.warn('[PointsHistoryScreen] achievements error', err));
  }, [uid]));

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: palette.bg, paddingTop: insets.top }]}>

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { borderBottomColor: palette.line }]}>
        <Pressable
          style={styles.navBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <ChevronLeftIcon color={palette.text} size={22} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>Points & Achievements</Text>
        <View style={styles.navBtn} />
      </View>

      <FlatList<PointsHistoryEntry>
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        data={historyLoaded && history.length > 0 ? history : []}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <HistoryRow
            entry={item}
            isFirst={index === 0}
            isLast={index === history.length - 1 && !hasMore}
            palette={palette}
          />
        )}
        ListHeaderComponent={
          <View>
            <Text style={[styles.sectionHeading, { color: palette.text }]}>Points History</Text>
            {(!historyLoaded || history.length === 0) && (
              <View style={[styles.card, { backgroundColor: palette.surface2 }]}>
                {!historyLoaded ? (
                  <ActivityIndicator
                    color={palette.accent}
                    style={styles.loader}
                    accessibilityLabel="Loading points history"
                  />
                ) : (
                  <View style={styles.emptyWrap}>
                    <Text style={[styles.emptyText, { color: palette.faint }]}>
                      No points yet — complete a task to earn your first point.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        }
        ListFooterComponent={
          <View>
            {hasMore && (
              <Pressable
                style={[
                  styles.loadMoreBtn,
                  {
                    backgroundColor:       palette.surface2,
                    borderTopColor:        palette.line,
                    borderBottomLeftRadius:  radius.card,
                    borderBottomRightRadius: radius.card,
                  },
                ]}
                onPress={handleLoadMore}
                disabled={loadingMore}
                accessibilityRole="button"
                accessibilityLabel="Load more history">
                {loadingMore ? (
                  <ActivityIndicator color={palette.accent} />
                ) : (
                  <Text style={[styles.loadMoreLabel, { color: palette.accent }]}>
                    Load more
                  </Text>
                )}
              </Pressable>
            )}
            <Text style={[styles.sectionHeading, { color: palette.text, marginTop: 12 }]}>Achievements</Text>
            <View style={achievementsGridStyle}>
              {ACHIEVEMENT_CATALOGUE.map(def => {
                const entry  = earnedMap[def.type];
                const earned = (entry?.earnCount ?? 0) > 0;
                const earnedAt = earned ? formatTimestamp(entry?.earnedAt) : undefined;
                return (
                  <AchievementTile
                    key={def.type}
                    def={def}
                    earned={earned}
                    earnedAt={earnedAt}
                    palette={palette}
                  />
                );
              })}
            </View>
          </View>
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1 },

  // ── Top bar ──
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

  // ── Scroll ──
  scroll:  { flex: 1 },
  content: {
    paddingHorizontal: spacing.page,
    paddingTop:        24,
  },
  sectionHeading: {
    fontSize:     15,
    fontWeight:   '600',
    fontFamily:   'Geist-SemiBold',
    marginBottom: 4,
  },

  // ── Card wrapper ──
  card: {
    borderRadius:  radius.card,
    overflow:      'hidden',
    marginBottom:  8,
  },

  // ── History row ──
  historyRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.page,
    paddingVertical:   14,
  },
  historyRowFirst: {
    borderTopLeftRadius:  radius.card,
    borderTopRightRadius: radius.card,
  },
  historyRowLast: {
    borderBottomLeftRadius:  radius.card,
    borderBottomRightRadius: radius.card,
  },
  historyContent: {
    flex: 1,
    gap:   3,
  },
  historyTitle: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
  },
  historyReason: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
  },
  historyPoints: {
    fontSize:    16,
    fontWeight:  '600',
    fontFamily:  'Geist-SemiBold',
    fontVariant: ['tabular-nums'],
    marginLeft:  12,
  },

  // ── Load more ──
  loadMoreBtn: {
    paddingVertical: 14,
    alignItems:      'center',
    borderTopWidth:  StyleSheet.hairlineWidth,
  },
  loadMoreLabel: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
  },

  // ── Empty / loading ──
  loader: {
    paddingVertical: 32,
  },
  emptyWrap: {
    paddingVertical:   32,
    paddingHorizontal: spacing.page,
    alignItems:        'center',
  },
  emptyText: {
    fontSize:   14,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
    lineHeight: 20,
  },

});
