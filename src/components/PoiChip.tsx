/**
 * PoiChip — KAN-15 (default state) / KAN-46 (nearby/active state)
 *
 * Default:  surface bg · line border · muted text
 * Nearby:   nearTint2 bg · nearBorder border · nearText · pulsing accent dot
 *
 * Pulse animation (scr-pulse spec):
 *   1.6 s ease-in-out infinite
 *   0%,100% → scale 1,   opacity 1
 *   50%     → scale 0.5, opacity 0.45
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { radius } from '../theme/tokens';
import { placeTypeLabel } from '../services/maps';
import { PoiIcon } from './AppIcon';

interface PoiChipProps {
  /** Google Places primary type string (built-in PoiType or custom type). */
  poi: string;
  /** True when this POI type is currently within the user's geofence (KAN-46). */
  isNearby?: boolean;
}

/** Static 6 px dot — animation removed (was an infinite reanimated pulse). */
function StaticDot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

export default function PoiChip({ poi, isNearby = false }: PoiChipProps) {
  const { palette } = useTheme();

  const bgColor     = isNearby ? palette.nearTint2  : palette.surface;
  const borderColor = isNearby ? palette.nearBorder : palette.line;
  const textColor   = isNearby ? palette.nearText   : palette.muted;

  return (
    <View style={[styles.chip, { backgroundColor: bgColor, borderColor }]}>
      {isNearby && <StaticDot color={palette.accent} />}
      <PoiIcon type={poi} color={textColor} size={12} />
      <Text style={[styles.label, { color: textColor }]}>
        {placeTypeLabel(poi)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              4,
    paddingHorizontal: 8,
    paddingVertical:  3,
    borderRadius:     radius.chip,
    borderWidth:      StyleSheet.hairlineWidth,
  },
  dot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  label: {
    fontSize:   11,
    fontWeight: '600',
    fontFamily: 'Geist-SemiBold',
  },
});
