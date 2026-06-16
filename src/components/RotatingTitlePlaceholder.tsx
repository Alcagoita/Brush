/**
 * RotatingTitlePlaceholder — KAN-148
 *
 * Faux placeholder for the task title input. Native TextInput placeholders
 * can't be animated, so this renders an absolutely-positioned overlay Text
 * that cross-fades between example phrases — teaching, by example, that
 * tasks are place-shaped ("Pick up toothpaste…") without asking a second
 * near-identical question on top of the sheet's own title.
 *
 * Stops rotating permanently once `active` goes false (the caller flips this
 * on first focus — "stop rotating once the user taps the field"). Respects
 * AccessibilityInfo.isReduceMotionEnabled(): shows the first example
 * statically, no animation, no interval.
 *
 * Reused by the More Details screen (KAN-149) for the same input experience.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';

interface Props {
  examples: string[];
  /** Caller flips this false on first focus to permanently freeze rotation. */
  active: boolean;
  /** Milliseconds between examples. Default 4000 per spec. */
  intervalMs?: number;
  style?: StyleProp<TextStyle>;
}

const FADE_DURATION = 250;

export default function RotatingTitlePlaceholder({
  examples,
  active,
  intervalMs = 4000,
  style,
}: Props) {
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!active || reduceMotion || examples.length <= 1) { return; }

    const timer = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: FADE_DURATION, useNativeDriver: true })
        .start(() => {
          setIndex(i => (i + 1) % examples.length);
          Animated.timing(opacity, { toValue: 1, duration: FADE_DURATION, useNativeDriver: true }).start();
        });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [active, reduceMotion, examples.length, intervalMs, opacity]);

  const current = examples[index] ?? examples[0] ?? '';

  return (
    <Animated.Text
      style={[style, { opacity: reduceMotion ? 1 : opacity }]}
      numberOfLines={1}
      pointerEvents="none">
      {current}
    </Animated.Text>
  );
}
