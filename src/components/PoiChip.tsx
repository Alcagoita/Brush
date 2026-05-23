/**
 * PoiChip — KAN-15 (default state) / KAN-46 (nearby/active state)
 *
 * Default:  surface bg · line border · muted text
 * Nearby:   nearTint2 bg · nearBorder border · nearText · pulsing accent dot
 *           (pulsing dot animation wired up in KAN-46)
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { radius } from '../theme/tokens';
import { PoiType } from '../types';

const POI_LABELS: Record<PoiType, string> = {
  atm:         'ATM',
  cafe:        'Café',
  supermarket: 'Market',
  pharmacy:    'Pharmacy',
};

interface PoiChipProps {
  poi: PoiType;
  /** True when this POI type is currently within the user's geofence (KAN-46). */
  isNearby?: boolean;
}

export default function PoiChip({ poi, isNearby = false }: PoiChipProps) {
  const { palette } = useTheme();

  const bgColor     = isNearby ? palette.nearTint2  : palette.surface;
  const borderColor = isNearby ? palette.nearBorder : palette.line;
  const textColor   = isNearby ? palette.nearText   : palette.muted;

  return (
    <View style={[styles.chip, { backgroundColor: bgColor, borderColor }]}>
      {isNearby && (
        <View style={[styles.dot, { backgroundColor: palette.accent }]} />
      )}
      <Text style={[styles.label, { color: textColor }]}>
        {POI_LABELS[poi]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.chip,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
});
