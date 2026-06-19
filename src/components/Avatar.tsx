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

import React, { useEffect } from 'react';
import {
  AccessibilityInfo,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme';

const DOT_SIZE = 12; // px — amber brand dot diameter

interface AvatarProps {
  photoURL?:           string | null;
  /** When provided and no photo, shows the first character as an initial letter instead of the pulsing dot. */
  displayName?:        string | null;
  size?:               number;
  onPress?:            () => void;
  accessibilityLabel?: string;
}

// ─── Pulsing dot ──────────────────────────────────────────────────────────────
// scr-pulse: 1.6 s ease-in-out infinite
//   0%, 100% → scale 1,   opacity 1
//   50%      → scale 0.5, opacity 0.45

function PulsingDot({ color }: { color: string }) {
  // Reanimated (UI-thread) — replaces the legacy `Animated` loop. On the New
  // Architecture the legacy API drove per-frame setNativeProps commits, which
  // flooded the Fabric ShadowTree and livelocked/crashed the app (KAN-157).
  const scale   = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (reduced || !active) { return; }
      const duration = 800;
      const easing   = Easing.inOut(Easing.ease);
      scale.value = withRepeat(
        withSequence(withTiming(0.5, { duration, easing }), withTiming(1, { duration, easing })),
        -1,
      );
      opacity.value = withRepeat(
        withSequence(withTiming(0.45, { duration, easing }), withTiming(1, { duration, easing })),
        -1,
      );
    });

    return () => {
      active = false;
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        { width: DOT_SIZE, height: DOT_SIZE, backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

export default function Avatar({
  photoURL,
  displayName,
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

  const initial = displayName ? displayName.trim()[0]?.toUpperCase() ?? null : null;

  const content = photoURL ? (
    <Image
      source={{ uri: photoURL }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      resizeMode="cover"
      accessibilityIgnoresInvertColors
    />
  ) : initial ? (
    <Text
      style={{
        fontSize:   size * 0.4,
        fontWeight: '500',
        fontFamily: 'Geist-Medium',
        color:      palette.muted,
      }}
      accessibilityElementsHidden>
      {initial}
    </Text>
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
