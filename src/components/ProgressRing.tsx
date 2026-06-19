/**
 * ProgressRing — SVG circular progress indicator.
 *
 * PERF (KAN-157): this component is now FULLY STATIC — no Reanimated, no
 * useAnimatedProps. On the New Architecture, animating react-native-svg props
 * (strokeDashoffset / cx / cy) drives `setNativeProps` on the JS thread every
 * frame; when that per-frame flood overlaps a normal React commit (which is
 * exactly what add / remove / complete a task triggers, because `progress`
 * changes), the Fabric ShadowTree can't converge, retries 1024×, and the app
 * freezes then crashes (ShadowTree.cpp commit assertion).
 *
 * The fix: render the geometry directly from the numeric `progress` prop. The
 * ring updates on a single React re-render instead of 24 setNativeProps commits.
 * The scroll-driven collapse is handled by the parent via `transform: scale`
 * (also non-SVG, also commit-free).
 *
 * Trade-off: the progress fill snaps to its new value instead of easing over
 * 400ms. That animation can be reintroduced later via a non-SVG technique if
 * desired — but never by animating SVG props on Fabric.
 *
 * DOT_PADDING: the SVG canvas is expanded by this amount on every side so the
 * brand dot (which extends beyond the arc's outer edge) always stays within the
 * SVG frame. A matching negative margin keeps the layout size identical to the
 * logical diameter.
 */
import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme';

/** Extra canvas on each side — must be ≥ halo dot radius (strokeWidth * 0.72 + 3). */
const DOT_PADDING = 12;

interface Props {
  /** 0–1 fraction of tasks completed. */
  progress: number;
  /** Fixed outer diameter (px) at rest. Collapse is a parent transform:scale. */
  diameter: number;
  /** Fixed stroke width (px) at rest. */
  strokeWidth: number;
}

export default function ProgressRing({ progress, diameter, strokeWidth }: Props) {
  const { palette } = useTheme();

  // ── Geometry — all derived directly from props (no animation) ───────────────
  const d      = diameter;
  const s      = strokeWidth;
  const r      = (d - s) / 2;
  const cx     = d / 2 + DOT_PADDING;   // centre (also cy — square canvas)
  const circ   = 2 * Math.PI * r;
  const canvas = d + DOT_PADDING * 2;
  const tipR   = s * 0.72;

  const clamped    = Math.min(Math.max(progress, 0), 1);
  const dashoffset = circ * (1 - clamped);

  // Brand dot at the arc's leading tip.
  const angle = 2 * Math.PI * clamped;
  const dotCx = cx + r * Math.cos(angle);
  const dotCy = cx + r * Math.sin(angle);

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
      <Circle
        stroke={palette.ringFill}
        fill="none"
        strokeLinecap="round"
        cx={cx}
        cy={cx}
        r={r}
        strokeWidth={s}
        strokeDasharray={circ}
        strokeDashoffset={dashoffset}
      />
      {/* Brand dot — soft halo behind the tip */}
      <Circle fill={palette.ringFill} opacity={0.15} cx={dotCx} cy={dotCy} r={tipR + 3} />
      {/* Brand dot — solid core at the arc's leading tip */}
      <Circle fill={palette.ringFill} cx={dotCx} cy={dotCy} r={tipR} />
    </Svg>
  );
}
