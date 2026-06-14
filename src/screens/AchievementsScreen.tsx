/**
 * AchievementsScreen — KAN-114 / KAN-129 / KAN-136
 *
 * Tier header (KAN-136): flat card with lifetime total, TierMedal (96px),
 * TierLadder scroll strip. Replaces the old ring-based summary card.
 *
 * Achievement gallery: "EARNED · N" + "LOCKED · N" sections, 2-col grid.
 */

import React, { useEffect, useState } from 'react';
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
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import { ChevronLeftIcon } from '../components/AppIcon';
import {
  subscribeToTotalPoints,
  subscribeToAchievements,
} from '../services/firestore';
import { ACHIEVEMENT_DEFS } from '../services/achievements';
import { deriveTierStanding } from '../constants/tiers';
import TierMedal from '../components/TierMedal';
import TierLadder from '../components/TierLadder';
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
                width: `${Math.round(fillRatio * 100)}%`,
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
          ? <CheckIcon color={palette.accent} size={10} />
          : <LockIcon  color={palette.faint}  size={10} />
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

  const [totalPoints,     setTotalPoints]     = useState(0);
  const [achievementsMap, setAchievementsMap] = useState<AchievementsMap>({});

  useEffect(() => {
    if (!uid) { return; }
    const u1 = subscribeToTotalPoints(uid, setTotalPoints,      err => console.warn('[AchievementsScreen] points', err));
    const u2 = subscribeToAchievements(uid, setAchievementsMap, err => console.warn('[AchievementsScreen] achievements', err));
    return () => { u1(); u2(); };
  }, [uid]);

  // ── Tier standing ─────────────────────────────────────────────────────────────
  const { nextTier, maxed, bandPct, toGo } = deriveTierStanding(totalPoints);

  // ── Achievement lists ─────────────────────────────────────────────────────────
  const earnedDefs = ACHIEVEMENT_CATALOGUE.filter(
    d => (achievementsMap[d.type as AchievementType]?.earnCount ?? 0) > 0,
  );
  const lockedDefs = ACHIEVEMENT_CATALOGUE.filter(
    d => (achievementsMap[d.type as AchievementType]?.earnCount ?? 0) === 0,
  );

  // ── Render ────────────────────────────────────────────────────────────────────

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

        {/* ── Tier header card ── */}
        <View style={[styles.tierCard, { backgroundColor: palette.surface, borderColor: palette.line }]}>
          <View style={styles.tierRow}>

            {/* Left: total points */}
            <View style={styles.tierLeft}>
              <Text style={[styles.totalLabel, { color: palette.muted }]}>TOTAL POINTS</Text>
              <Text style={[styles.totalNumber, { color: palette.text }]}>
                <Text style={{ fontVariant: ['tabular-nums'] }}>{totalPoints}</Text>
              </Text>
              <Text style={[styles.totalCaption, { color: palette.muted }]}>points earned so far</Text>
            </View>

            {/* Right: medal + caption */}
            <View style={styles.tierRight}>
              <TierMedal
                tier={nextTier}
                earned={maxed}
                pct={maxed ? null : bandPct}
                size={96}
              />
              {maxed ? (
                <Text style={[styles.medalCaption, { color: palette.muted }]}>
                  {'Top tier · '}
                  <Text style={{ color: nextTier.color, fontWeight: '600' }}>{nextTier.name}</Text>
                </Text>
              ) : (
                <Text style={[styles.medalCaption, { color: palette.muted }]}>
                  <Text style={{ color: nextTier.color, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                    {toGo} pts
                  </Text>
                  {' to '}{nextTier.name}
                </Text>
              )}
            </View>

          </View>

          {/* Divider */}
          <View style={[styles.tierDivider, { backgroundColor: palette.line }]} />

          {/* Ladder */}
          <TierLadder points={totalPoints} />
        </View>

        {/* ── Earned achievements ── */}
        {earnedDefs.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: palette.muted }]}>
              {`EARNED · ${earnedDefs.length}`}
            </Text>
            <View style={styles.grid}>
              {earnedDefs.map(catDef => {
                const type      = catDef.type as AchievementType;
                const entry     = achievementsMap[type];
                const earnCount = entry?.earnCount ?? 0;
                const rawProgress = type === 'centurion' ? totalPoints : (entry?.progress ?? 0);
                const def    = ACHIEVEMENT_DEFS[type];
                const points = def?.points ?? 0;
                const target = def?.target ?? 1;
                return (
                  <AchievementCard
                    key={type}
                    catalogueDef={catDef}
                    earned={true}
                    earnCount={earnCount}
                    progress={rawProgress}
                    target={target}
                    points={points}
                    palette={palette}
                  />
                );
              })}
            </View>
          </>
        )}

        {/* ── Locked achievements ── */}
        {lockedDefs.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: palette.muted }]}>
              {`LOCKED · ${lockedDefs.length}`}
            </Text>
            <View style={styles.grid}>
              {lockedDefs.map(catDef => {
                const type      = catDef.type as AchievementType;
                const entry     = achievementsMap[type];
                const rawProgress = type === 'centurion' ? totalPoints : (entry?.progress ?? 0);
                const def    = ACHIEVEMENT_DEFS[type];
                const points = def?.points ?? 0;
                const target = def?.target ?? 1;
                return (
                  <AchievementCard
                    key={type}
                    catalogueDef={catDef}
                    earned={false}
                    earnCount={0}
                    progress={rawProgress}
                    target={target}
                    points={points}
                    palette={palette}
                  />
                );
              })}
            </View>
          </>
        )}

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
    width:          44,
    height:         44,
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
    paddingTop:        4,
    gap:               16,
  },

  // ── Tier header card ──
  tierCard: {
    borderRadius: radius.card,
    padding:      18,
    borderWidth:  1,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           16,
  },
  tierLeft: {
    flex:     1,
    minWidth: 0,
  },
  totalLabel: {
    fontSize:      11,
    fontWeight:    '500',
    fontFamily:    'Geist-Medium',
    letterSpacing: 0.15 * 11,
    textTransform: 'uppercase',
  },
  totalNumber: {
    fontSize:      58,
    fontWeight:    '500',
    fontFamily:    'Geist-Medium',
    lineHeight:    58,
    letterSpacing: -0.04 * 58,
    marginTop:     8,
  },
  totalCaption: {
    fontSize:   12.5,
    fontFamily: 'Geist-Regular',
    marginTop:  8,
  },
  tierRight: {
    alignItems: 'center',
    gap:        10,
  },
  medalCaption: {
    fontSize:  12.5,
    fontFamily: 'Geist-Regular',
    textAlign: 'center',
  },
  tierDivider: {
    height:           1,
    marginHorizontal: -18,
    marginTop:        16,
    marginBottom:     14,
  },

  // ── Section label ──
  sectionLabel: {
    fontSize:      11,
    fontWeight:    '500',
    fontFamily:    'Geist-Medium',
    letterSpacing: 0.8,
    paddingTop:    24,
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
