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

// ─── Achievement catalogue ────────────────────────────────────────────────────

export interface AchievementDef {
  type:      AchievementType;
  label:     string;
  icon:      string;
  condition: string;
}

export const ACHIEVEMENT_CATALOGUE: AchievementDef[] = [
  {
    type:      'first_task',
    label:     'First task',
    icon:      '★',
    condition: 'Complete your very first task',
  },
  {
    type:      'daily_complete',
    label:     'Day complete',
    icon:      '✓',
    condition: 'Complete every task for a day',
  },
  {
    type:      'challenge_winner',
    label:     COPY.achievement.challengeWinnerTitle,
    icon:      '◆',
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
        <Text style={[styles.iconText, { color: earned ? palette.accent : palette.faint }]}>
          {def.icon}
        </Text>
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
  iconText: {
    fontSize:   22,
    lineHeight: 28,
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
