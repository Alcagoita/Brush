/**
 * CompareAchievementsScreen — KAN-105
 *
 * Side-by-side comparison of the current user's stats vs a friend's.
 *
 * Rows compared:
 *   - Total points
 *   - Achievements earned
 *   - Current streak (days)
 *
 * Navigated from PublicProfileScreen via the "Compare achievements" button.
 * Params: { friendUid, friendUsername }
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
import {
  getUser,
  getAchievementsForUser,
} from '../services/firestore';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { User } from '../types';
import { COPY } from '../constants/copy';

type Nav   = NativeStackNavigationProp<RootStackParamList, 'CompareAchievements'>;
type Route = RouteProp<RootStackParamList, 'CompareAchievements'>;

interface CompareData {
  user:             User;
  achievementCount: number;
}

export default function CompareAchievementsScreen() {
  const { palette } = useTheme();
  const navigation  = useNavigation<Nav>();
  const route       = useRoute<Route>();
  const insets      = useSafeAreaInsets();

  const currentUid = getAuth().currentUser?.uid ?? '';
  const { friendUid, friendUsername } = route.params;

  const [mine,    setMine]    = useState<CompareData | null>(null);
  const [theirs,  setTheirs]  = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      Promise.all([getUser(currentUid),      getAchievementsForUser(currentUid)]),
      Promise.all([getUser(friendUid),        getAchievementsForUser(friendUid)]),
    ])
      .then(([[myUser, myAchievs], [friendUser, friendAchievs]]) => {
        if (cancelled) { return; }
        if (myUser)     { setMine({   user: myUser,     achievementCount: myAchievs.length }); }
        if (friendUser) { setTheirs({ user: friendUser, achievementCount: friendAchievs.length }); }
      })
      .catch(() => { if (!cancelled) { setError(true); } })
      .finally(() => { if (!cancelled) { setLoading(false); } });
    return () => { cancelled = true; };
  }, [currentUid, friendUid]);

  return (
    <View style={[styles.root, { backgroundColor: palette.bg, paddingTop: insets.top }]}>

      {/* Top bar */}
      <View style={[styles.topBar, { borderBottomColor: palette.line }]}>
        <Pressable
          style={styles.navBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={COPY.compareAchievements.backA11y}>
          <ChevronLeftIcon color={palette.text} size={22} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>{COPY.compareAchievements.screenTitle}</Text>
        <View style={styles.navBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.accent} />
        </View>
      ) : error || !mine || !theirs ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: palette.muted }]}>
            {COPY.compareAchievements.loadError}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}>

          {/* ── Column headers ── */}
          <View style={[styles.headerRow, { borderBottomColor: palette.line }]}>
            <View style={styles.labelCell} />
            <Text style={[styles.colHeader, { color: palette.text }]} numberOfLines={1}>
              {COPY.compareAchievements.you}
            </Text>
            <Text style={[styles.colHeader, { color: palette.muted }]} numberOfLines={1}>
              @{friendUsername}
            </Text>
          </View>

          {/* ── Comparison rows ── */}
          <CompareRow
            label={COPY.compareAchievements.totalPoints}
            myValue={mine.user.totalPoints ?? 0}
            theirValue={theirs.user.totalPoints ?? 0}
            palette={palette}
          />
          <CompareRow
            label={COPY.compareAchievements.achievements}
            myValue={mine.achievementCount}
            theirValue={theirs.achievementCount}
            palette={palette}
          />
          <CompareRow
            label={COPY.compareAchievements.streakDays}
            myValue={mine.user.currentStreak ?? 0}
            theirValue={theirs.user.currentStreak ?? 0}
            palette={palette}
            isLast
          />

        </ScrollView>
      )}
    </View>
  );
}

// ─── Row component ────────────────────────────────────────────────────────────

function CompareRow({
  label,
  myValue,
  theirValue,
  palette,
  isLast = false,
}: {
  label:      string;
  myValue:    number;
  theirValue: number;
  palette:    ReturnType<typeof useTheme>['palette'];
  isLast?:    boolean;
}) {
  const myWins    = myValue > theirValue;
  const theirWins = theirValue > myValue;

  return (
    <View style={[
      styles.row,
      { borderBottomColor: palette.line },
      !isLast && { borderBottomWidth: StyleSheet.hairlineWidth },
    ]}>
      <Text style={[styles.rowLabel, { color: palette.muted }]}>{label}</Text>
      <Text style={[
        styles.rowValue,
        { color: myWins ? palette.accent : palette.text },
      ]}>
        {myValue}
      </Text>
      <Text style={[
        styles.rowValue,
        { color: theirWins ? palette.accent : palette.text },
      ]}>
        {theirValue}
      </Text>
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
  errorText: {
    fontSize:   15,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
  },

  scroll: {
    paddingHorizontal: spacing.page,
    paddingTop:        20,
  },

  // ── Table ──
  headerRow: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingBottom:    12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom:     4,
  },
  labelCell: { flex: 1 },
  colHeader: {
    width:      90,
    fontSize:   13,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    textAlign:  'center',
  },

  row: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingVertical: 18,
  },
  rowLabel: {
    flex:       1,
    fontSize:   15,
    fontFamily: 'Geist-Regular',
  },
  rowValue: {
    width:       90,
    fontSize:    22,
    fontWeight:  '600',
    fontFamily:  'Geist-SemiBold',
    fontVariant: ['tabular-nums'],
    textAlign:   'center',
  },
});
