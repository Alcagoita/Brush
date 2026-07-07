/**
 * AchievementTile — reusable tile for the achievements grid.
 *
 * Used in PointsHistoryScreen (own achievements) and PublicProfileScreen
 * (friend's achievements, read-only). KAN-105.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radius } from '../theme/tokens';
import type { AchievementType } from '../types';
import type { useTheme } from '../theme';
import { COPY } from '../constants/copy';
import {
  CheckIcon,
  SunIcon,
  FlameIcon,
  PinIcon,
  StarIcon,
  MedalIcon,
} from './AppIcon';

// ─── Achievement catalogue ────────────────────────────────────────────────────

export type AchievementIconKey = 'check' | 'sun' | 'flame' | 'pin' | 'star' | 'medal';

export function AchievementIcon({ icon, color, size }: { icon: AchievementIconKey; color: string; size: number }) {
  switch (icon) {
    case 'check': return <CheckIcon  color={color} size={size} />;
    case 'sun':   return <SunIcon    color={color} size={size} />;
    case 'flame': return <FlameIcon  color={color} size={size} />;
    case 'pin':   return <PinIcon    color={color} size={size} />;
    case 'star':  return <StarIcon   color={color} size={size} />;
    case 'medal': return <MedalIcon  color={color} size={size} />;
  }
}

export interface AchievementDef {
  type:      AchievementType;
  label:     string;
  icon:      AchievementIconKey;
  condition: string;
}

/**
 * Tin tier (KAN-150) — built by a function called inside the component
 * instead of a module-scope constant, since COPY is language-dynamic
 * (KAN-252) and a module-scope read would freeze the text in whatever
 * language was active on first import.
 */
export function buildAchievementCatalogue(): AchievementDef[] {
  const c = COPY.achievements.catalogue;
  return [
    { type: 'first_task',  label: c.firstTaskLabel,   icon: 'check', condition: c.firstTaskCondition },
    { type: 'first_brush', label: c.firstBrushLabel,  icon: 'check', condition: c.firstBrushCondition },
    { type: 'right_place', label: c.rightPlaceLabel,  icon: 'pin',   condition: c.rightPlaceCondition },
    { type: 'worth_wait',  label: c.worthWaitLabel,   icon: 'flame', condition: c.worthWaitCondition },
    { type: 'custom_cat',  label: c.customCatLabel,   icon: 'star',  condition: c.customCatCondition },
    { type: 'out_about',   label: c.outAboutLabel,    icon: 'pin',   condition: c.outAboutCondition },
    {
      type:      'challenge_winner',
      label:     c.challengeWinnerLabel,
      icon:      'medal',
      condition: c.challengeWinnerCondition,
    },
  ];
}

// ─── Tile ─────────────────────────────────────────────────────────────────────

type Palette = ReturnType<typeof useTheme>['palette'];

interface Props {
  def:      AchievementDef;
  earned:   boolean;
  earnedAt?: string;
  palette:  Palette;
}

export default function AchievementTile({ def, earned, earnedAt, palette }: Props) {
  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: earned ? palette.nearTint2  : palette.surface2,
          borderColor:     earned ? palette.nearBorder : palette.line,
        },
      ]}
      accessibilityLabel={COPY.achievements.cardA11y(def.label, earned)}>

      <View style={[
        styles.iconCircle,
        { backgroundColor: earned ? palette.accent + '22' : palette.surface },
      ]}>
        <AchievementIcon
          icon={def.icon}
          color={earned ? palette.accent : palette.faint}
          size={22}
        />
      </View>

      <Text style={[styles.label, { color: earned ? palette.nearText : palette.text }]}>
        {def.label}
      </Text>

      <Text style={[styles.sub, { color: palette.muted }]} numberOfLines={2}>
        {earned && earnedAt ? earnedAt : def.condition}
      </Text>

      {!earned && (
        <View style={[styles.lockedBadge, { backgroundColor: palette.surface }]}>
          <Text style={[styles.lockedText, { color: palette.faint }]}>{COPY.achievements.lockedBadge}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

export const achievementsGridStyle = {
  flexDirection: 'row' as const,
  flexWrap:      'wrap' as const,
  gap:           12,
  marginBottom:  8,
};

const styles = StyleSheet.create({
  tile: {
    width:      '47%',
    borderRadius: radius.card,
    borderWidth:  1,
    padding:      16,
    gap:          8,
    alignItems:   'center',
  },
  iconCircle: {
    width:          52,
    height:         52,
    borderRadius:   26,
    alignItems:     'center',
    justifyContent: 'center',
  },
  label: {
    fontSize:   14,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
    textAlign:  'center',
  },
  sub: {
    fontSize:   12,
    fontFamily: 'Geist-Regular',
    textAlign:  'center',
    lineHeight: 16,
  },
  lockedBadge: {
    paddingHorizontal: 10,
    paddingVertical:    3,
    borderRadius:       9999,
    marginTop:          2,
  },
  lockedText: {
    fontSize:   11,
    fontFamily: 'Geist-Regular',
  },
});
