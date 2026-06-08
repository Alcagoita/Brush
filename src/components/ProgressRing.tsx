/**
 * ProgressRing — SVG circular progress indicator.
 *
 * Driven by Reanimated SharedValues so all geometry updates run on the
 * UI thread — no JS re-renders on every animation frame.
 *
 * Progress changes (tasks completing) animate smoothly via withTiming.
 *
 * DOT_PADDING: the SVG canvas is expanded by this amount on every side so
 * the brand dot (which extends beyond the arc's outer edge) always stays
 * within the SVG frame. A matching negative margin keeps the layout size
 * identical to the logical diameter.
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

/** Extra canvas on each side — must be ≥ halo dot radius (strokeWidth * 0.72 + 3). */
const DOT_PADDING = 12;

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

  // SVG canvas is larger than the logical diameter by DOT_PADDING on each side
  // so the brand dot never clips against the frame boundary.
  const svgProps = useAnimatedProps(() => ({
    width:  diameter.value + DOT_PADDING * 2,
    height: diameter.value + DOT_PADDING * 2,
  }));

  // All geometry is offset by DOT_PADDING so the ring sits centred in the
  // expanded canvas. Layout size is kept correct via margin: -DOT_PADDING.

  // Track circle (background ring).
  const trackProps = useAnimatedProps(() => {
    const d  = diameter.value;
    const s  = strokeWidth.value;
    const r  = (d - s) / 2;
    const cx = d / 2 + DOT_PADDING;
    return { cx, cy: cx, r, strokeWidth: s };
  });

  // Progress arc — strokeDashoffset encodes how much of the arc is filled.
  const arcProps = useAnimatedProps(() => {
    const d       = diameter.value;
    const s       = strokeWidth.value;
    const r       = (d - s) / 2;
    const circ    = 2 * Math.PI * r;
    const clamped = Math.min(Math.max(progressSV.value, 0), 1);
    const cx      = d / 2 + DOT_PADDING;
    return {
      cx,
      cy:               cx,
      r,
      strokeWidth:      s,
      strokeDasharray:  circ,
      strokeDashoffset: circ * (1 - clamped),
    };
  });

  // Brand dot — halo (soft glow ring) behind the tip dot.
  const haloDotProps = useAnimatedProps(() => {
    const d     = diameter.value;
    const s     = strokeWidth.value;
    const r     = (d - s) / 2;
    const pct   = Math.min(Math.max(progressSV.value, 0), 1);
    const angle = 2 * Math.PI * pct;
    const cx    = d / 2 + DOT_PADDING + r * Math.cos(angle);
    const cy    = d / 2 + DOT_PADDING + r * Math.sin(angle);
    const tipR  = s * 0.72;
    return { cx, cy, r: tipR + 3 };
  });

  // Brand dot — solid core circle at the arc's leading tip.
  const coreDotProps = useAnimatedProps(() => {
    const d     = diameter.value;
    const s     = strokeWidth.value;
    const r     = (d - s) / 2;
    const pct   = Math.min(Math.max(progressSV.value, 0), 1);
    const angle = 2 * Math.PI * pct;
    const cx    = d / 2 + DOT_PADDING + r * Math.cos(angle);
    const cy    = d / 2 + DOT_PADDING + r * Math.sin(angle);
    const tipR  = s * 0.72;
    return { cx, cy, r: tipR };
  });

  return (
    // margin: -DOT_PADDING cancels the extra canvas in layout space so the
    // ring's visual diameter matches what the parent expects.
    <AnimatedSvg
      animatedProps={svgProps}
      style={{ transform: [{ rotate: '-90deg' }], margin: -DOT_PADDING }}>
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
