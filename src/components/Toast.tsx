/**
 * Toast — KAN-149
 *
 * Bottom-anchored confirmation toast. Mounted once at the App root; reads
 * from the global toastStore so it survives whatever screen/sheet triggered
 * it closing or navigating away right after.
 *
 * Spec: warm `surface` background, `text` color, ~2.5s auto-dismiss,
 * screen-reader announced. An optional action button (KAN-244) is supported
 * for moments that teach a fix rather than just confirm something — those
 * get a longer dismiss window so there's time to read and tap.
 */

import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useToastStore } from '../store/toastStore';

const AUTO_DISMISS_MS = 2500;
const AUTO_DISMISS_WITH_ACTION_MS = 4500;
const FADE_MS = 220;

export default function Toast() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const message = useToastStore(s => s.message);
  const action = useToastStore(s => s.action);
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
    }, action ? AUTO_DISMISS_WITH_ACTION_MS : AUTO_DISMISS_MS);

    return () => {
      if (dismissTimer.current !== null) { clearTimeout(dismissTimer.current); }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, action]);

  if (!message) { return null; }

  const handleActionPress = () => {
    if (dismissTimer.current !== null) { clearTimeout(dismissTimer.current); }
    action?.onPress();
    hideToast();
  };

  return (
    <Animated.View
      pointerEvents="box-none"
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
      {action && (
        <View style={styles.actionRow} pointerEvents="box-none">
          <Pressable
            onPress={handleActionPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={action.label}>
            <Text style={[styles.actionLabel, { color: palette.accent }]}>{action.label}</Text>
          </Pressable>
        </View>
      )}
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
  actionRow: {
    alignItems: 'center',
    marginTop:  10,
  },
  actionLabel: {
    fontSize:      14,
    fontFamily:    'Geist-SemiBold',
    letterSpacing: -0.14,
  },
});
