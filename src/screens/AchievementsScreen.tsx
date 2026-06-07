/**
 * AchievementsScreen — KAN-114
 *
 * Full-screen badge gallery reached from Profile → "See all achievements".
 *
 * Layout:
 *   1. Header: back + centered "Achievements"
 *   2. Points summary card (ring + TOTAL POINTS + % to tier + pts to go)
 *   3. EARNED · {n} grid
 *   4. LOCKED · {n} grid (with progress bars where applicable)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import {
  subscribeToTotalPoints,
  subscribeToAchievements,
  getLocationTasksCompletedCount,
} from '../services/firestore';
import {
  CheckIcon,
  ChevronLeftIcon,
  FlameIcon,
  LockIcon,
  PinIcon,
  StarIcon,
  SunIcon,
} from '../components/AppIcon';
import { Achievement } from '../types';

// ─── Tier ladder ──────────────────────────────────────────────────────────────

const TIER_LADDER = [
  { name: 'Bronze',   at: 10  },
  { name: 'Silver',   at: 50  },
  { name: 'Gold',     at: 100 },
  { name: 'Platinum', at: 200 },
];

function currentTier(pts: number) {
  return TIER_LADDER.find(t => pts < t.at) ?? TIER_LADDER[TIER_LADDER.length - 1];
}

// ─── V1 achievement definitions ───────────────────────────────────────────────

type AchievementIcon = 'check' | 'sun' | 'flame' | 'pin' | 'star';

interface AchievementDef {
  id:   string;
  label: string;
  desc:  string;
  icon:  AchievementIcon;
}

const V1_ACHIEVEMENTS: AchievementDef[] = [
  { id: 'day_complete', label: 'Day complete', desc: 'Brush away every task in a day',      icon: 'check' },
  { id: 'early_bird',   label: 'Early bird',   desc: 'Brush a task away before 9 AM',       icon: 'sun'   },
  { id: 'on_a_roll',    label: 'On a roll',     desc: '3-day brushing streak',               icon: 'flame' },
  { id: 'explorer',     label: 'Explorer',      desc: 'Brush away 10 location-based tasks', icon: 'pin'   },
  { id: 'centurion',    label: 'Centurion',     desc: 'Earn 100 points',                    icon: 'star'  },
];

// ─── Icon resolver ────────────────────────────────────────────────────────────

function AchievementIconComponent({
  icon,
  color,
  size,
}: {
  icon: AchievementIcon;
  color: string;
  size: number;
}) {
  switch (icon) {
    case 'check': return <CheckIcon color={color} size={size} />;
    case 'sun':   return <SunIcon   color={color} size={size} />;
    case 'flame': return <FlameIcon color={color} size={size} />;
    case 'pin':   return <PinIcon   color={color} size={size} />;
    case 'star':  return <StarIcon  color={color} size={size} />;
  }
}

// ─── Animated ring ────────────────────────────────────────────────────────────

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE   = 92;
const RING_STROKE = 9;
const RING_R      = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUM = 2 * Math.PI * RING_R;

function PointsRing({ points, tierAt }: { points: number; tierAt: number }) {
  const { palette } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.min(points / tierAt, 1), { duration: 700 });
  }, [points, tierAt, progress]);

  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUM * (1 - progress.value),
  }));

  return (
    <View style={s.ringContainer} accessibilityLabel={`${points} points`}>
      <Svg
        width={RING_SIZE}
        height={RING_SIZE}
        style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* track */}
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_R}
          stroke={palette.ringTrack}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        {/* fill */}
        <AnimatedCircle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_R}
          stroke={palette.accent}
          strokeWidth={RING_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUM}
          animatedProps={animProps}
        />
      </Svg>
      <View style={s.ringCenter} pointerEvents="none">
        <Text style={[s.ringPts,  { color: palette.text   }]}>{points}</Text>
        <Text style={[s.ringLabel, { color: palette.muted }]}>PTS</Text>
      </View>
    </View>
  );
}

// ─── Earned card ──────────────────────────────────────────────────────────────

function EarnedCard({
  def,
  count,
}: {
  def:   AchievementDef;
  count: number;
}) {
  const { palette } = useTheme();

  return (
    <View style={[s.card, { backgroundColor: palette.surface }]}>
      <View style={s.cardTopRow}>
        <View
          style={[
            s.medalCircle,
            { backgroundColor: palette.nearTint2, borderColor: palette.nearBorder },
          ]}>
          <AchievementIconComponent icon={def.icon} color={palette.nearText} size={22} />
        </View>
        {count > 1 ? (
          <View style={[s.countPill, { backgroundColor: palette.nearTint, borderColor: palette.nearBorder }]}>
            <Text style={[s.countPillText, { color: palette.nearText }]}>×{count}</Text>
          </View>
        ) : (
          <CheckIcon color={palette.nearText} size={18} />
        )}
      </View>
      <Text style={[s.cardLabel, { color: palette.text }]}>{def.label}</Text>
      <Text style={[s.cardDesc,  { color: palette.muted }]}>{def.desc}</Text>
    </View>
  );
}

// ─── Locked card ──────────────────────────────────────────────────────────────

function LockedCard({
  def,
  progress,
}: {
  def:      AchievementDef;
  progress: { have: number; need: number } | null;
}) {
  const { palette } = useTheme();
  const fillPct = progress ? Math.min(progress.have / progress.need, 1) : 0;

  return (
    <View style={[s.card, { backgroundColor: palette.surface, opacity: 0.92 }]}>
      <View style={s.cardTopRow}>
        <View
          style={[
            s.medalCircle,
            { backgroundColor: 'transparent', borderColor: palette.line },
          ]}>
          <LockIcon color={palette.faint} size={20} />
        </View>
      </View>
      <Text style={[s.cardLabel, { color: palette.muted }]}>{def.label}</Text>
      <Text style={[s.cardDesc,  { color: palette.muted }]}>{def.desc}</Text>
      {progress != null && (
        <>
          <View style={[s.progressTrack, { backgroundColor: palette.ringTrack, marginTop: 4 }]}>
            <View
              style={[
                s.progressFill,
                { backgroundColor: palette.faint, width: `${fillPct * 100}%` },
              ]}
            />
          </View>
          <Text style={[s.progressCaption, { color: palette.faint }]}>
            {progress.have} / {progress.need}
          </Text>
        </>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AchievementsScreen() {
  const { palette }  = useTheme();
  const navigation   = useNavigation();
  const insets       = useSafeAreaInsets();

  const uid = getAuth().currentUser?.uid ?? '';

  const [totalPoints,    setTotalPoints]    = useState(0);
  const [achievements,   setAchievements]   = useState<Achievement[]>([]);
  const [explorerCount,  setExplorerCount]  = useState(0);

  useEffect(() => {
    if (!uid) { return; }

    const unsubPts  = subscribeToTotalPoints(uid,  setTotalPoints);
    const unsubAch  = subscribeToAchievements(uid, setAchievements);

    getLocationTasksCompletedCount(uid)
      .then(setExplorerCount)
      .catch(() => { /* non-critical — progress bar just won't animate */ });

    return () => { unsubPts(); unsubAch(); };
  }, [uid]);

  // ── Tier math ─────────────────────────────────────────────────────────────
  const tier    = currentTier(totalPoints);
  const pct     = Math.round((totalPoints / tier.at) * 100);
  const ptsToGo = tier.at - totalPoints;

  // ── Earned / locked split ─────────────────────────────────────────────────
  const countByType = achievements.reduce<Record<string, number>>((acc, a) => {
    const key = a.type as string;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const earnedIds = new Set<string>(Object.keys(countByType));

  const earnedDefs = V1_ACHIEVEMENTS.filter(d => earnedIds.has(d.id));
  const lockedDefs = V1_ACHIEVEMENTS.filter(d => !earnedIds.has(d.id));

  function lockedProgress(def: AchievementDef): { have: number; need: number } | null {
    if (def.id === 'centurion') { return { have: totalPoints, need: 100 }; }
    if (def.id === 'explorer')  { return { have: explorerCount, need: 10 }; }
    return null;
  }

  return (
    <View style={[s.root, { backgroundColor: palette.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8, borderBottomColor: palette.line }]}>
        <Pressable
          style={({ pressed }) => [s.headerBtn, pressed && { opacity: 0.6 }]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <ChevronLeftIcon color={palette.text} size={22} />
        </Pressable>
        <Text style={[s.headerTitle, { color: palette.text }]}>Achievements</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}>

        {/* Points summary card */}
        <View style={[s.summaryCard, { backgroundColor: palette.surface }]}>
          <PointsRing points={totalPoints} tierAt={tier.at} />
          <View style={s.summaryText}>
            <Text style={[s.summaryEyebrow, { color: palette.muted }]}>TOTAL POINTS</Text>
            <Text style={[s.summaryHeadline, { color: palette.text }]}>
              {pct}% to {tier.name}
            </Text>
            <Text style={[s.summaryCaption, { color: palette.muted }]}>
              <Text style={{ color: palette.text, fontFamily: 'Geist-SemiBold' }}>
                {ptsToGo} pts
              </Text>
              {' '}until your next badge
            </Text>
          </View>
        </View>

        {/* EARNED section */}
        <Text style={[s.sectionLabel, { color: palette.muted }]}>
          {`EARNED · ${earnedDefs.length}`}
        </Text>
        <View style={s.grid}>
          {earnedDefs.map(def => (
            <EarnedCard key={def.id} def={def} count={countByType[def.id] ?? 1} />
          ))}
        </View>

        {/* LOCKED section */}
        <Text style={[s.sectionLabel, { color: palette.muted }]}>
          {`LOCKED · ${lockedDefs.length}`}
        </Text>
        <View style={s.grid}>
          {lockedDefs.map(def => (
            <LockedCard key={def.id} def={def} progress={lockedProgress(def)} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.page,
    paddingBottom:     12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width:          36,
    height:         36,
    alignItems:     'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize:   17,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },

  scroll: {
    paddingHorizontal: spacing.page,
    paddingTop:        16,
    gap:               16,
  },

  // ── Summary card ──
  summaryCard: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           18,
    borderRadius:  20,
    padding:       18,
  },
  ringContainer: {
    width:          RING_SIZE,
    height:         RING_SIZE,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  ringCenter: {
    position:       'absolute',
    alignItems:     'center',
    justifyContent: 'center',
  },
  ringPts: {
    fontSize:          24,
    fontWeight:        '600',
    fontFamily:        'Geist-SemiBold',
    fontVariant:       ['tabular-nums'],
    lineHeight:        28,
  },
  ringLabel: {
    fontSize:   11,
    fontFamily: 'Geist-Regular',
    letterSpacing: 0.5,
  },
  summaryText: {
    flex: 1,
    gap:  3,
  },
  summaryEyebrow: {
    fontSize:      11,
    fontWeight:    '500',
    fontFamily:    'Geist-Medium',
    letterSpacing: 0.16 * 11,
  },
  summaryHeadline: {
    fontSize:   15,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  summaryCaption: {
    fontSize:   12.5,
    fontFamily: 'Geist-Regular',
  },

  // ── Section labels ──
  sectionLabel: {
    fontSize:      12,
    fontWeight:    '500',
    fontFamily:    'Geist-Medium',
    letterSpacing: 0.5,
  },

  // ── Grid ──
  grid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           10,
  },

  // ── Achievement card ──
  card: {
    width:        '47.5%',
    borderRadius: radius.card,
    padding:      16,
    gap:          10,
  },
  cardTopRow: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
  },
  medalCircle: {
    width:          48,
    height:         48,
    borderRadius:   9999,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      9999,
    borderWidth:       1,
  },
  countPillText: {
    fontSize:   11,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  cardLabel: {
    fontSize:   14.5,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  cardDesc: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
    minHeight:  32,
  },

  // ── Progress bar ──
  progressTrack: {
    height:       5,
    borderRadius: 999,
    overflow:     'hidden',
  },
  progressFill: {
    height:       5,
    borderRadius: 999,
  },
  progressCaption: {
    fontSize:   11.5,
    fontFamily: 'Geist-Regular',
    fontVariant: ['tabular-nums'],
  },
});
