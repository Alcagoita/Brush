/**
 * TripSuggestionCard — KAN-245
 *
 * Quiet row on Today, shown only when the calendar signal has a qualifying
 * candidate (absence is the default, same as ContextChip/ErrandBundleCard).
 * Tap navigates straight to the Trip Planner flow, pre-filled with the
 * event's location text (search-box seed, not a resolved place — the
 * signal never geocodes) and its date. A small dismiss control hides this
 * exact event permanently (KAN-245's dismissal store), not just for today.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { radius, spacing } from '../theme/tokens';
import { CloseIcon, SuitcaseIcon } from './AppIcon';
import { logTap } from '../services/analytics';
import { COPY } from '../constants/copy';
import type { CalendarSuggestion } from '../services/tripSuggestions';

export interface TripSuggestionCardProps {
  suggestion: CalendarSuggestion;
  language: string;
  onPress: () => void;
  onDismiss: () => void;
}

export default function TripSuggestionCard({ suggestion, language, onPress, onDismiss }: TripSuggestionCardProps) {
  const { palette } = useTheme();

  const locale = language === 'pt-PT' ? 'pt-PT' : 'en-US';
  const day = new Date(suggestion.dateISO).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.line }]}>
      <Pressable
        style={styles.cardMain}
        onPress={() => { logTap('trip_suggestion_open'); onPress(); }}
        accessibilityRole="button"
        accessibilityLabel={COPY.tripSuggestion.cardA11y(suggestion.place, day)}>
        <View style={[styles.iconTile, { backgroundColor: palette.surface2 }]}>
          <SuitcaseIcon color={palette.muted} size={18} />
        </View>
        <Text style={[styles.cardText, { color: palette.text }]} numberOfLines={2}>
          {COPY.tripSuggestion.cardLine(suggestion.place, day)}
        </Text>
      </Pressable>
      <Pressable
        style={styles.dismissBtn}
        onPress={() => { logTap('trip_suggestion_dismiss'); onDismiss(); }}
        hitSlop={7}
        accessibilityRole="button"
        accessibilityLabel={COPY.tripSuggestion.dismissA11y}>
        <CloseIcon color={palette.faint} size={14} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection:     'row',
    alignItems:        'center',
    marginHorizontal:  spacing.page,
    marginTop:         14,
    padding:           12,
    borderRadius:      radius.card,
    borderWidth:       1,
    gap:               10,
  },
  cardMain: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
    minWidth:       0,
  },
  iconTile: {
    width:          36,
    height:         36,
    borderRadius:   radius.listIcon,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  cardText: {
    flex:        1,
    fontSize:    13,
    fontFamily:  'Geist-Regular',
    lineHeight:  18,
    fontVariant: ['tabular-nums'],
  },
  dismissBtn: {
    width:          30,
    height:         30,
    alignItems:     'center',
    justifyContent: 'center',
  },
});
