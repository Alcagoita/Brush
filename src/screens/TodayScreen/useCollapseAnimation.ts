/**
 * useCollapseAnimation — KAN-157 / KAN-214
 *
 * Owns the scroll-driven 2-state ring collapse: a single `collapseT` (0↔1)
 * animates between rest and collapsed entirely on the UI thread. Every
 * dependent style is a composite-only transform/opacity interpolation of it —
 * no per-frame layout, no JS round-trip.
 */

import { useState } from 'react';
import { Platform, Vibration } from 'react-native';
import {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  SCROLL_RANGE,
  COLLAPSE_THRESHOLD,
  RING_LEFT_REST,
  RING_LEFT_COLLAPSED,
  RING_TOP_REST,
  RING_TOP_COLLAPSED,
  RING_REST,
  RING_COLLAPSED,
  SECTION_H_REST,
  SECTION_H_COLLAPSED,
} from './constants';

export function useCollapseAnimation() {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const collapseT = useDerivedValue(() =>
    withTiming(scrollY.value >= SCROLL_RANGE * COLLAPSE_THRESHOLD ? 1 : 0, {
      duration: 240,
      easing: Easing.inOut(Easing.cubic),
    }),
  );

  // `collapsed` mirrors the state in JS — used only for caption pointerEvents and
  // the one-shot haptic. The animation itself never touches JS.
  const [collapsed, setCollapsed] = useState(false);
  useAnimatedReaction(
    () => scrollY.value >= SCROLL_RANGE * COLLAPSE_THRESHOLD,
    (isCollapsed, prev) => {
      if (isCollapsed !== prev) {
        runOnJS(setCollapsed)(isCollapsed);
        if (isCollapsed) { runOnJS(Vibration.vibrate)(Platform.OS === 'android' ? 10 : 1); }
      }
    },
  );

  const ringWrapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(collapseT.value, [0, 1], [0, RING_LEFT_COLLAPSED - RING_LEFT_REST]) },
      { translateY: interpolate(collapseT.value, [0, 1], [0, RING_TOP_COLLAPSED - RING_TOP_REST]) },
      { scale:      interpolate(collapseT.value, [0, 1], [1, RING_COLLAPSED / RING_REST]) },
    ],
  }));
  const bgStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: interpolate(collapseT.value, [0, 1], [1, SECTION_H_COLLAPSED / SECTION_H_REST]) }],
  }));
  const captionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapseT.value, [0, 0.5], [1, 0], Extrapolation.CLAMP),
  }));
  const collapsedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapseT.value, [0.5, 1], [0, 1], Extrapolation.CLAMP),
  }));

  return { scrollHandler, collapsed, ringWrapStyle, bgStyle, captionStyle, collapsedStyle };
}
