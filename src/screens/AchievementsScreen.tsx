/**
 * AchievementsScreen — KAN-114 / KAN-129
 *
 * Full achievements list with progress bars, point values, and tier ladder.
 * Points are achievement-derived only (KAN-129). Progress data comes from
 * the `users/{uid}.achievements` map and `users/{uid}.totalPoints`.
 *
 * Layout:
 *   - Sticky header + "EARNED · N" counter
 *   - Progress ring (totalPoints toward next tier)
 *   - 2-column grid of AchievementCard tiles
 *     - Earned: accent tint, point badge "N pts earned"
 *     - Locked:  surface2,   point badge "N pts available"
 *     - Progress bar for multi-step achievements
 */

import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from '@react-native-firebase/auth/lib/modular';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import { ChevronLeftIcon } from '../components/AppIcon';
import {
  subscribeToTotalPoints,
  subscribeToAchievements,
} from '../services/firestore';
import { ACHIEVEMENT_DEFS, TIER_LADDER, getNextTier } from '../services/achievements';
import type { AchievementsMap, AchievementType } from '../types';
import {
  ACHIEVEMENT_CATALOGUE,
  AchievementDef as CatalogueDef,
} from '../components/AchievementTile';
import {
  CheckIcon,
  SunIcon,
  FlameIcon,
  PinIcon,
  StarIcon,
  MedalIcon,
  LockIcon,
} from '../components/AppIcon';

// ─── Mini animated ring ───────────────────────────────────────────────────────

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface TierRingProps {
  progress:    number; // 0–1
  size?:       number;
  strokeWidth?: number;
  accentColor: string;
  trackColor:  string;
}

function TierRing({
  progress,
  size        = 64,
  strokeWidth = 7,
  accentColor,
  trackColor,
}: TierRingProps) {
  const sv = useSharedValue(0);
  useEffect(() => {
    sv.value = withTiming(Math.min(Math.max(progress, 0), 1), { duration: 600 });
  }, [progress, sv]);

  const r            = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const cx            = size / 2;

  const arcProps = useAnimatedProps(() => ({
    strokeDasharray:  circumference,
    strokeDashoffset: circumference * (1 - sv.value),
  }));

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={cx} cy={cx} r={r} strokeWidth={strokeWidth} stroke={trackColor} fill="none" />
      <AnimatedCircle
        cx={cx} cy={cx} r={r}
        strokeWidth={strokeWidth} stroke={accentColor} fill="none"
        strokeLinecap="round"
        animatedProps={arcProps}
      />
    </Svg>
  );
}

// ─── Icon mapper ──────────────────────────────────────────────────────────────

type IconKey = CatalogueDef['icon'];

function AchievementIcon({ icon, color, size }: { icon: IconKey; color: string; size: number }) {
  switch (icon) {
    case 'check': return <CheckIcon  color={color} size={size} />;
    case 'sun':   return <SunIcon    color={color} size={size} />;
    case 'flame': return <FlameIcon  color={color} size={size} />;
    case 'pin':   return <PinIcon    color={color} size={size} />;
    case 'star':  return <StarIcon   color={color} size={size} />;
    case 'medal': return <MedalIcon  color={color} size={size} />;
  }
}

// ─── Achievement card ─────────────────────────────────────────────────────────

interface CardProps {
  catalogueDef: CatalogueDef;
  earned:       boolean;
  earnCount:    number;
  progress:     number;
  target:       number;
  points:       number;
  palette:      ReturnType<typeof useTheme>['palette'];
}

function AchievementCard({
  catalogueDef,
  earned,
  earnCount,
  progress,
  target,
  points,
  palette,
}: CardProps) {
  const fillRatio = target > 0 ? Math.min(progress / target, 1) : 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: earned ? palette.nearTint2  : palette.surface2,
          borderColor:     earned ? palette.nearBorder : palette.line,
        },
      ]}
      accessibilityLabel={`${catalogueDef.label} achievement, ${earned ? 'earned' : 'locked'}`}>

      {/* Icon circle */}
      <View style={[
        styles.cardIconCircle,
        { backgroundColor: earned ? palette.accent + '22' : palette.surface },
      ]}>
        <AchievementIcon
          icon={catalogueDef.icon}
          color={earned ? palette.accent : palette.faint}
          size={22}
        />
      </View>

      {/* Label + description */}
      <Text style={[styles.cardLabel, { color: earned ? palette.nearText : palette.text }]}>
        {catalogueDef.label}
      </Text>
      <Text style={[styles.cardDesc, { color: palette.muted }]} numberOfLines={2}>
        {catalogueDef.condition}
      </Text>

      {/* Progress bar (for multi-step achievements) */}
      {target > 1 && (
        <View style={[styles.progressTrack, { backgroundColor: palette.ringTrack }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: earned ? palette.accent : palette.faint,
                width: `${Math.round(fillRatio * 100)}%` as any,
              },
            ]}
          />
        </View>
      )}

      {/* Progress fraction for multi-step */}
      {target > 1 && (
        <Text style={[styles.progressFraction, { color: palette.muted }]}>
          <Text style={{ fontVariant: ['tabular-nums'] }}>{Math.min(progress, target)}</Text>
          {'/'}<Text style={{ fontVariant: ['tabular-nums'] }}>{target}</Text>
        </Text>
      )}

      {/* Point value badge */}
      <View style={[
        styles.pointBadge,
        { backgroundColor: earned ? palette.accent + '22' : palette.surface },
      ]}>
        {earned
          ? <LockIcon color={palette.accent} size={10} />
          : <LockIcon color={palette.faint}  size={10} />
        }
        <Text style={[
          styles.pointBadgeText,
          { color: earned ? palette.accent : palette.faint },
        ]}>
          {earned
            ? `${points * earnCount} pts earned`
            : `${points} pts available`
          }
        </Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AchievementsScreen() {
  const { palette }  = useTheme();
  const navigation   = useNavigation();
  const insets       = useSafeAreaInsets();
  const uid          = getAuth().currentUser?.uid;

  const [totalPoints,   setTotalPoints]   = useState(0);
  const [achievementsMap, setAchievementsMap] = useState<AchievementsMap>({});

  useEffect(() => {
    if (!uid) { return; }
    const u1 = subscribeToTotalPoints(uid, setTotalPoints,     err => console.warn('[AchievementsScreen] points', err));
    const u2 = subscribeToAchievements(uid, setAchievementsMap, err => console.warn('[AchievementsScreen] achievements', err));
    return () => { u1(); u2(); };
  }, [uid]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const nextTier     = getNextTier(totalPoints);
  const tierIdx      = TIER_LADDER.findIndex(t => t.at === nextTier.at);
  const prevTierAt   = tierIdx > 0 ? TIER_LADDER[tierIdx - 1].at : 0;
  const ringProgress = nextTier.at > prevTierAt
    ? Math.min((totalPoints - prevTierAt) / (nextTier.at - prevTierAt), 1)
    : 1;

  const earnedCount = ACHIEVEMENT_CATALOGUE.filter(
    d => (achievementsMap[d.type as AchievementType]?.earnCount ?? 0) > 0,
  ).length;

  // ── Render ───────────────────────────────────────────────────────────────────

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
        <Text style={[styles.topBarTitle, { color: palette.text }]}>Achievements</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}>

        {/* ── Points + tier summary card ── */}
        <View style={[styles.tierCard, { backgroundColor: palette.surface }]}>
          <TierRing
            progress={ringProgress}
            accentColor={palette.accent}
            trackColor={palette.ringTrack}
          />
          <View style={styles.tierTextBlock}>
            <Text style={[styles.tierPts, { color: palette.accent }]}>
              <Text style={{ fontVariant: ['tabular-nums'] }}>{totalPoints}</Text>
              {' pts'}
            </Text>
            <Text style={[styles.tierName, { color: palette.text }]}>
              {totalPoints >= TIER_LADDER[TIER_LADDER.length - 1].at
                ? 'Gold tier'
                : `${Math.max(nextTier.at - totalPoints, 0)} pts to ${nextTier.name}`}
            </Text>
            <Text style={[styles.tierEarned, { color: palette.muted }]}>
              <Text style={{ fontVariant: ['tabular-nums'] }}>{earnedCount}</Text>
              {` / ${ACHIEVEMENT_CATALOGUE.length} earned`}
            </Text>
          </View>
        </View>

        {/* ── Section label ── */}
        <Text style={[styles.sectionLabel, { color: palette.muted }]}>ACHIEVEMENTS</Text>

        {/* ── 2-column grid ── */}
        <View style={styles.grid}>
          {ACHIEVEMENT_CATALOGUE.map(catDef => {
            const type      = catDef.type as AchievementType;
            const entry     = achievementsMap[type];
            const earned    = (entry?.earnCount ?? 0) > 0;
            const earnCount = entry?.earnCount ?? 0;

            // Centurion progress = totalPoints (meta-achievement)
            const rawProgress = type === 'centurion'
              ? totalPoints
              : (entry?.progress ?? 0);

            // Look up point value from ACHIEVEMENT_DEFS
            const def    = ACHIEVEMENT_DEFS[type];
            const points = def?.points ?? 0;
            const target = def?.target ?? 1;

            return (
              <AchievementCard
                key={type}
                catalogueDef={catDef}
                earned={earned}
                earnCount={earnCount}
                progress={rawProgress}
                target={target}
                points={points}
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
  root:  { flex: 1 },

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
    width:          40,
    height:         40,
    alignItems:     'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize:   17,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },

  // ── Scroll ──
  scroll:  { flex: 1 },
  content: {
    paddingHorizontal: spacing.page,
    paddingTop:        20,
    gap:               16,
  },

  // ── Tier summary card ──
  tierCard: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            16,
    borderRadius:   radius.card,
    padding:        18,
  },
  tierTextBlock: {
    flex: 1,
    gap:  4,
  },
  tierPts: {
    fontSize:   22,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
  tierName: {
    fontSize:   14,
    fontWeight: '500',
    fontFamily: 'Geist-Medium',
  },
  tierEarned: {
    fontSize:   13,
    fontFamily: 'Geist-Regular',
  },

  // ── Section label ──
  sectionLabel: {
    fontSize:      11,
    fontWeight:    '500',
    fontFamily:    'Geist-Medium',
    letterSpacing: 0.8,
    marginTop:     4,
    marginBottom:  -4,
  },

  // ── 2-column grid ──
  grid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           12,
  },

  // ── Achievement card ──
  card: {
    width:        '47.5%',
    borderRadius: radius.card,
    borderWidth:  StyleSheet.hairlineWidth,
    padding:      14,
    gap:          6,
    alignItems:   'center',
  },
  cardIconCircle: {
    width:          48,
    height:         48,
    borderRadius:   24,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   2,
  },
  cardLabel: {
    fontSize:   13,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    textAlign:  'center',
  },
  cardDesc: {
    fontSize:   11.5,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
    lineHeight: 15,
  },

  // ── Progress bar ──
  progressTrack: {
    height:       5,
    borderRadius: 999,
    overflow:     'hidden',
    width:        '100%',
    marginTop:    4,
  },
  progressFill: {
    height:       5,
    borderRadius: 999,
  },
  progressFraction: {
    fontSize:   11,
    fontFamily: 'Geist-Regular',
    alignSelf:  'flex-end',
  },

  // ── Point badge ──
  pointBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      9999,
    marginTop:         4,
  },
  pointBadgeText: {
    fontSize:   10.5,
    fontFamily: 'Geist-Regular',
  },
});
