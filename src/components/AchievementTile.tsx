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

export const ACHIEVEMENT_CATALOGUE: AchievementDef[] = [
  { type: 'first_brush',     label: 'First brush',  icon: 'check', condition: 'Brush away your first task'            },
  { type: 'early_bird',      label: 'Early bird',   icon: 'sun',   condition: 'Brush a task away before 9 AM'         },
  { type: 'day_complete',    label: 'Day complete', icon: 'check', condition: 'Brush away every task in a single day' },
  { type: 'on_a_roll',       label: 'On a roll',    icon: 'flame', condition: '3-day brushing streak'                 },
  { type: 'explorer',        label: 'Explorer',     icon: 'pin',   condition: 'Brush away 10 location-based tasks'   },
  { type: 'centurion',       label: 'Centurion',    icon: 'star',  condition: 'Reach 100 achievement points'          },
  {
    type:      'challenge_winner',
    label:     COPY.achievement.challengeWinnerTitle,
    icon:      'medal',
    condition: 'Win a challenge against a friend',
  },
];

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
      accessibilityLabel={`${def.label} achievement, ${earned ? 'earned' : 'locked'}`}>

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
          <Text style={[styles.lockedText, { color: palette.faint }]}>Locked</Text>
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
