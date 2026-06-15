/**
 * ProgressRing — SVG circular progress indicator.
 *
 * PERF (KAN-154 perf pass): the ring geometry is FIXED. The scroll-driven
 * collapse (rest → compact) is performed by the parent via `transform: scale`
 * on the ring wrapper — NOT by re-rendering SVG geometry every frame. A static
 * SVG is rasterised once and merely composited at a new scale while scrolling,
 * which eliminated the per-frame re-rasterisation that pinned the UI thread and
 * blocked touch input on Android.
 *
 * Progress changes (tasks completing) still animate smoothly via withTiming —
 * those are occasional, interaction-driven updates, not per-scroll-frame work.
 *
 * Trade-off: because the whole ring scales uniformly, the stroke scales with it
 * (rest 14 → compact ~6.4) rather than the previous non-proportional 14 → 10.
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
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Extra canvas on each side — must be ≥ halo dot radius (strokeWidth * 0.72 + 3). */
const DOT_PADDING = 12;

interface Props {
  /** 0–1 fraction of tasks completed. */
  progress: number;
  /**
   * Fixed outer diameter (px) at rest. The ring is collapsed via a parent
   * `transform: scale`, so this value stays constant — it is NOT animated.
   */
  diameter: number;
  /** Fixed stroke width (px) at rest. Scales with the ring via the parent. */
  strokeWidth: number;
}

export default function ProgressRing({ progress, diameter, strokeWidth }: Props) {
  const { palette } = useTheme();

  // Keep progress on the UI thread; animate transitions between values.
  const progressSV = useSharedValue(progress);
  useEffect(() => {
    progressSV.value = withTiming(progress, { duration: 400 });
  }, [progress, progressSV]);

  // ── Static geometry — computed once from the fixed diameter/stroke ──────────
  const d      = diameter;
  const s      = strokeWidth;
  const r      = (d - s) / 2;
  const cx     = d / 2 + DOT_PADDING;     // centre (also cy — square canvas)
  const circ   = 2 * Math.PI * r;
  const canvas = d + DOT_PADDING * 2;
  const tipR   = s * 0.72;

  // Progress arc — only strokeDashoffset animates, and only when progress
  // changes (task toggle). Nothing here updates during scroll.
  const arcProps = useAnimatedProps(() => {
    const clamped = Math.min(Math.max(progressSV.value, 0), 1);
    return { strokeDashoffset: circ * (1 - clamped) };
  });

  // Brand dot position at the arc's leading tip — animates with progress only.
  const dotProps = useAnimatedProps(() => {
    const pct   = Math.min(Math.max(progressSV.value, 0), 1);
    const angle = 2 * Math.PI * pct;
    return {
      cx: cx + r * Math.cos(angle),
      cy: cx + r * Math.sin(angle),
    };
  });

  return (
    // margin: -DOT_PADDING cancels the extra canvas in layout space so the
    // ring's visual diameter matches what the parent expects.
    <Svg
      width={canvas}
      height={canvas}
      style={{ transform: [{ rotate: '-90deg' }], margin: -DOT_PADDING }}>
      {/* Track */}
      <Circle
        stroke={palette.ringTrack}
        fill="none"
        cx={cx}
        cy={cx}
        r={r}
        strokeWidth={s}
      />
      {/* Progress arc */}
      <AnimatedCircle
        stroke={palette.ringFill}
        fill="none"
        strokeLinecap="round"
        cx={cx}
        cy={cx}
        r={r}
        strokeWidth={s}
        strokeDasharray={circ}
        animatedProps={arcProps}
      />
      {/* Brand dot — soft halo behind the tip */}
      <AnimatedCircle
        fill={palette.ringFill}
        opacity={0.15}
        r={tipR + 3}
        animatedProps={dotProps}
      />
      {/* Brand dot — solid core at the arc's leading tip */}
      <AnimatedCircle
        fill={palette.ringFill}
        r={tipR}
        animatedProps={dotProps}
      />
    </Svg>
  );
}
