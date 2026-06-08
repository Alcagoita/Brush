/**
 * ProgressRing — SVG circular progress indicator.
 *
 * Driven by Reanimated SharedValues so all geometry updates run on the
 * UI thread — no JS re-renders on every animation frame.
 *
 * Progress changes (tasks completing) animate smoothly via withTiming.
 */
import React, { useEffect } from 'react';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme';

const AnimatedSvg    = Animated.createAnimatedComponent(Svg);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  /** 0–1 fraction of tasks completed. */
  progress: number;
  /** Shared/derived value — diameter of the whole ring (outer edge). */
  diameter: SharedValue<number>;
  /** Shared/derived value — stroke width. */
  strokeWidth: SharedValue<number>;
}

export default function ProgressRing({ progress, diameter, strokeWidth }: Props) {
  const { palette } = useTheme();

  // Keep progress on the UI thread; animate transitions between values.
  const progressSV = useSharedValue(progress);
  useEffect(() => {
    progressSV.value = withTiming(progress, { duration: 400 });
  }, [progress, progressSV]);

  // Animated Svg wrapper — width/height must follow the collapsing diameter.
  const svgProps = useAnimatedProps(() => ({
    width:  diameter.value,
    height: diameter.value,
  }));

  // Track circle (background ring).
  const trackProps = useAnimatedProps(() => {
    const d = diameter.value;
    const s = strokeWidth.value;
    const r = (d - s) / 2;
    return { cx: d / 2, cy: d / 2, r, strokeWidth: s };
  });

  // Progress arc — strokeDashoffset encodes how much of the arc is filled.
  const arcProps = useAnimatedProps(() => {
    const d     = diameter.value;
    const s     = strokeWidth.value;
    const r     = (d - s) / 2;
    const circ  = 2 * Math.PI * r;
    const clamped = Math.min(Math.max(progressSV.value, 0), 1);
    return {
      cx:                d / 2,
      cy:                d / 2,
      r,
      strokeWidth:       s,
      strokeDasharray:   circ,
      strokeDashoffset:  circ * (1 - clamped),
    };
  });

  // Brand dot — halo (soft glow ring) behind the tip dot.
  const haloDotProps = useAnimatedProps(() => {
    const d       = diameter.value;
    const s       = strokeWidth.value;
    const r       = (d - s) / 2;
    const pct     = Math.min(Math.max(progressSV.value, 0), 1);
    const angle   = 2 * Math.PI * pct;
    const cx      = d / 2 + r * Math.cos(angle);
    const cy      = d / 2 + r * Math.sin(angle);
    const tipR    = s * 0.72;
    return { cx, cy, r: tipR + 3 };
  });

  // Brand dot — solid core circle at the arc's leading tip.
  const coreDotProps = useAnimatedProps(() => {
    const d       = diameter.value;
    const s       = strokeWidth.value;
    const r       = (d - s) / 2;
    const pct     = Math.min(Math.max(progressSV.value, 0), 1);
    const angle   = 2 * Math.PI * pct;
    const cx      = d / 2 + r * Math.cos(angle);
    const cy      = d / 2 + r * Math.sin(angle);
    const tipR    = s * 0.72;
    return { cx, cy, r: tipR };
  });

  return (
    <AnimatedSvg
      animatedProps={svgProps}
      overflow="visible"
      style={{ transform: [{ rotate: '-90deg' }] }}>
      {/* Track */}
      <AnimatedCircle
        stroke={palette.ringTrack}
        fill="none"
        animatedProps={trackProps}
      />
      {/* Progress arc */}
      <AnimatedCircle
        stroke={palette.ringFill}
        fill="none"
        strokeLinecap="round"
        animatedProps={arcProps}
      />
      {/* Brand dot — soft halo behind the tip */}
      <AnimatedCircle
        fill={palette.ringFill}
        opacity={0.15}
        animatedProps={haloDotProps}
      />
      {/* Brand dot — solid core at the arc's leading tip */}
      <AnimatedCircle
        fill={palette.ringFill}
        animatedProps={coreDotProps}
      />
    </AnimatedSvg>
  );
}
