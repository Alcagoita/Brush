/**
 * PointsHistoryScreen — KAN-33
 *
 * Two-section screen pushed from ProfileScreen ("See all"):
 *
 * 1. Points History — chronological list of PointsHistoryEntry records,
 *    newest first. Paginated: shows PAGE_SIZE rows, "Load more" appends the
 *    next batch (unbounded history is never fully loaded at once).
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

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import { ChevronLeftIcon } from '../components/AppIcon';
import AchievementTile, {
  ACHIEVEMENT_CATALOGUE,
  achievementsGridStyle,
} from '../components/AchievementTile';
import {
  subscribeToPointsHistory,
  subscribeToAchievements,
} from '../services/firestore';
import type { Achievement, PointsHistoryEntry } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(ts: { seconds: number; nanoseconds: number } | undefined): string {
  if (!ts) { return ''; }
  return new Date(ts.seconds * 1000).toLocaleDateString('en-GB', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });
}

function reasonLabel(reason: string): string {
  switch (reason) {
    case 'task_completed':     return 'Task completed';
    case 'achievement_bonus':  return 'Achievement bonus';
    case 'daily_complete_bonus': return 'Daily complete bonus';
    case 'streak_bonus':       return 'Streak bonus';
    default:                   return reason.replace(/_/g, ' ');
  }
}

// ─── Points history row ───────────────────────────────────────────────────────

function HistoryRow({
  entry,
  isLast,
  palette,
}: {
  entry:   PointsHistoryEntry;
  isLast:  boolean;
  palette: ReturnType<typeof useTheme>['palette'];
}) {
  return (
    <View style={[styles.historyRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line }]}>
      <View style={styles.historyContent}>
        <Text style={[styles.historyTitle, { color: palette.text }]} numberOfLines={1}>
          {entry.taskTitle}
        </Text>
        <Text style={[styles.historyReason, { color: palette.muted }]}>
          {reasonLabel(entry.reason)} · {formatTimestamp(entry.awardedAt as any)}
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
  const [allHistory,    setAllHistory]    = useState<PointsHistoryEntry[]>([]);
  const [visibleCount,  setVisibleCount]  = useState(PAGE_SIZE);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    if (!uid) { return; }
    return subscribeToPointsHistory(uid, entries => {
      setAllHistory(entries);
      setHistoryLoaded(true);
    }, err => console.warn('[PointsHistoryScreen] history error', err));
  }, [uid]);

  const visibleHistory  = allHistory.slice(0, visibleCount);
  const hasMore         = visibleCount < allHistory.length;

  // ── Achievements ────────────────────────────────────────────────────────────
  const [earnedMap, setEarnedMap] = useState<Record<string, Achievement>>({});

  useEffect(() => {
    if (!uid) { return; }
    return subscribeToAchievements(uid, list => {
      const map: Record<string, Achievement> = {};
      for (const a of list) { map[a.type] = a; }
      setEarnedMap(map);
    }, err => console.warn('[PointsHistoryScreen] achievements error', err));
  }, [uid]);

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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>

        {/* ── Points History ── */}
        <Text style={[styles.sectionHeading, { color: palette.text }]}>Points History</Text>

        <View style={[styles.card, { backgroundColor: palette.surface2 }]}>
          {!historyLoaded ? (
            <ActivityIndicator
              color={palette.accent}
              style={styles.loader}
              accessibilityLabel="Loading points history"
            />
          ) : allHistory.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: palette.faint }]}>
                No points yet — complete a task to earn your first point.
              </Text>
            </View>
          ) : (
            <>
              {visibleHistory.map((entry, idx) => (
                <HistoryRow
                  key={entry.id}
                  entry={entry}
                  isLast={idx === visibleHistory.length - 1}
                  palette={palette}
                />
              ))}
              {hasMore && (
                <Pressable
                  style={styles.loadMoreBtn}
                  onPress={() => setVisibleCount(c => c + PAGE_SIZE)}
                  accessibilityRole="button"
                  accessibilityLabel="Load more history">
                  <Text style={[styles.loadMoreLabel, { color: palette.accent }]}>
                    Load more ({allHistory.length - visibleCount} remaining)
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </View>

        {/* ── Achievements Gallery ── */}
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
    gap:               12,
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
    paddingVertical:   14,
    alignItems:        'center',
    borderTopWidth:    StyleSheet.hairlineWidth,
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
