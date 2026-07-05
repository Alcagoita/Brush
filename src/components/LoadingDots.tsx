/**
 * LoadingDots — classic three-dot loading indicator.
 *
 * Used for prominent full-screen "working on it" states (e.g. Trip
 * Planner's download step) where the platform's native ActivityIndicator
 * hasn't reliably read as "loading" rather than "stuck/errored".
 *
 * Reanimated, transform/opacity only (KAN-157 constraint — never animate
 * layout-affecting props per frame on Fabric).
 */
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const DOT_DURATION_MS = 400;
const DOT_STAGGER_MS = 150;

function Dot({ color, size, delay }: { color: string; size: number; delay: number }) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    const easing = Easing.inOut(Easing.ease);
    scale.value = withDelay(delay, withRepeat(withSequence(
      withTiming(1,   { duration: DOT_DURATION_MS, easing }),
      withTiming(0.6, { duration: DOT_DURATION_MS, easing }),
    ), -1));
    opacity.value = withDelay(delay, withRepeat(withSequence(
      withTiming(1,   { duration: DOT_DURATION_MS, easing }),
      withTiming(0.4, { duration: DOT_DURATION_MS, easing }),
    ), -1));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

interface Props {
  color: string;
  size?: number;
}

export default function LoadingDots({ color, size = 9 }: Props) {
  return (
    <View style={styles.row}>
      <Dot color={color} size={size} delay={0} />
      <Dot color={color} size={size} delay={DOT_STAGGER_MS} />
      <Dot color={color} size={size} delay={DOT_STAGGER_MS * 2} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
});
