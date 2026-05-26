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

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme';
import { radius } from '../theme/tokens';
import { placeTypeLabel } from '../services/maps';

interface PoiChipProps {
  /** Google Places primary type string (built-in PoiType or custom type). */
  poi: string;
  /** True when this POI type is currently within the user's geofence (KAN-46). */
  isNearby?: boolean;
}

/** Pulsing 6 px dot — animates only when rendered (isNearby = true). */
function PulsingDot({ color }: { color: string }) {
  const scale   = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const cfg = { duration: 800, easing: Easing.inOut(Easing.ease) };
    // Each withSequence: rest → half → rest = one full 1.6 s cycle
    scale.value   = withRepeat(
      withSequence(withTiming(1, cfg), withTiming(0.5, cfg)),
      -1,
    );
    opacity.value = withRepeat(
      withSequence(withTiming(1, cfg), withTiming(0.45, cfg)),
      -1,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: color }, style]}
    />
  );
}

export default function PoiChip({ poi, isNearby = false }: PoiChipProps) {
  const { palette } = useTheme();

  const bgColor     = isNearby ? palette.nearTint2  : palette.surface;
  const borderColor = isNearby ? palette.nearBorder : palette.line;
  const textColor   = isNearby ? palette.nearText   : palette.muted;

  return (
    <View style={[styles.chip, { backgroundColor: bgColor, borderColor }]}>
      {isNearby && <PulsingDot color={palette.accent} />}
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
