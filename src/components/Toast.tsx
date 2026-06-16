/**
 * Toast — KAN-149
 *
 * Bottom-anchored confirmation toast. Mounted once at the App root; reads
 * from the global toastStore so it survives whatever screen/sheet triggered
 * it closing or navigating away right after.
 *
 * Spec: warm `surface` background, `text` color, ~2.5s auto-dismiss, no
 * action button (informational only), screen-reader announced.
 */

import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useToastStore } from '../store/toastStore';

const AUTO_DISMISS_MS = 2500;
const FADE_MS = 220;

export default function Toast() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const message = useToastStore(s => s.message);
  const hideToast = useToastStore(s => s.hideToast);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) { return; }

    AccessibilityInfo.announceForAccessibility?.(message);

    opacity.setValue(0);
    translateY.setValue(12);
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: FADE_MS, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
    ]).start();

    if (dismissTimer.current !== null) { clearTimeout(dismissTimer.current); }
    dismissTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 12, duration: FADE_MS, useNativeDriver: true }),
      ]).start(() => hideToast());
    }, AUTO_DISMISS_MS);

    return () => {
      if (dismissTimer.current !== null) { clearTimeout(dismissTimer.current); }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  if (!message) { return null; }

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        {
          backgroundColor: palette.surface,
          bottom: insets.bottom + 24,
          opacity,
          transform: [{ translateY }],
        },
      ]}>
      <Text style={[styles.label, { color: palette.text }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position:          'absolute',
    left:               22,
    right:              22,
    paddingHorizontal: 18,
    paddingVertical:   14,
    borderRadius:      14,
    zIndex:             999,
  },
  label: {
    fontSize:      14,
    fontFamily:    'Geist-Regular',
    letterSpacing: -0.14,
    textAlign:     'center',
  },
});
