/**
 * Avatar — KAN-18 / KAN-78
 *
 * Shared avatar component used in the Header (TodayScreen) and ProfileScreen.
 *
 * States:
 *   No photoURL → amber dot (12px, palette.accent) centred in a circle.
 *                 This is the brand-mark default — NOT a letter initial.
 *   photoURL set → circular Image (cover resize).
 *
 * Props:
 *   photoURL  — Firebase Auth user.photoURL (null/undefined = show dot)
 *   size      — diameter in px (default 36)
 *   onPress   — optional; wraps in Pressable when provided
 *   accessibilityLabel — forwarded to the Pressable / View
 */

import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';

const DOT_SIZE = 12; // px — amber brand dot diameter

interface AvatarProps {
  photoURL?:           string | null;
  size?:               number;
  onPress?:            () => void;
  accessibilityLabel?: string;
}

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
    /* Amber dot — brand-mark default */
    <View
      style={[
        styles.dot,
        { width: DOT_SIZE, height: DOT_SIZE, backgroundColor: palette.accent },
      ]}
    />
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
