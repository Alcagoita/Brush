/**
 * Avatar — KAN-18 / KAN-78
 *
 * Shared avatar component used in the Header (TodayScreen) and ProfileScreen.
 *
 * States:
 *   No photoURL → amber dot (12px, palette.accent) with scr-pulse animation
 *                 (scale + opacity loop, 1.6 s, matches the nearby dot rhythm).
 *                 reduce-motion respected — dot shown statically.
 *   photoURL set → circular Image (cover resize), no animation.
 *
 * Props:
 *   photoURL  — Firebase Auth user.photoURL (null/undefined = show pulsing dot)
 *   size      — diameter in px (default 36)
 *   onPress   — optional; wraps in Pressable when provided
 *   accessibilityLabel — forwarded to the Pressable / View
 */

import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from '../theme';

const DOT_SIZE = 12; // px — amber brand dot diameter

interface AvatarProps {
  photoURL?:           string | null;
  size?:               number;
  onPress?:            () => void;
  accessibilityLabel?: string;
}

// ─── Pulsing dot ──────────────────────────────────────────────────────────────
// scr-pulse: 1.6 s ease-in-out infinite
//   0%, 100% → scale 1,   opacity 1
//   50%      → scale 0.5, opacity 0.45

function PulsingDot({ color }: { color: string }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation;

    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (reduced) { return; }

      animation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scale,   { toValue: 0.5,  duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.45, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 1,    duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1,    duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ]),
        ]),
      );
      animation.start();
    });

    return () => animation?.stop();
  }, [opacity, scale]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width:           DOT_SIZE,
          height:          DOT_SIZE,
          backgroundColor: color,
          transform:       [{ scale }],
          opacity,
        },
      ]}
    />
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

export default function Avatar({
  photoURL,
  size = 36,
  onPress,
  accessibilityLabel = 'Avatar',
}: AvatarProps) {
  const { palette } = useTheme();

  const containerStyle = [
    styles.circle,
    {
      width:           size,
      height:          size,
      borderRadius:    size / 2,
      backgroundColor: palette.surface2,
    },
  ];

  const content = photoURL ? (
    <Image
      source={{ uri: photoURL }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      resizeMode="cover"
      accessibilityIgnoresInvertColors
    />
  ) : (
    <PulsingDot color={palette.accent} />
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [containerStyle, pressed && { opacity: 0.75 }]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={containerStyle} accessibilityLabel={accessibilityLabel}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems:     'center',
    justifyContent: 'center',
    overflow:       'hidden',
  },
  dot: {
    borderRadius: DOT_SIZE / 2,
  },
});
