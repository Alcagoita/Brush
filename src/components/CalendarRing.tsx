/**
 * CalendarRing — KAN-145
 *
 * Pure SVG progress ring for the Calendar screen. Used at two sizes: 36px in
 * each day-grid cell, 68px in the detail card header. Deliberately a SEPARATE
 * component from `ProgressRing.tsx` (the Today screen's header ring) — that
 * component has a hard-won fix for a Fabric ShadowTree freeze (KAN-157) and a
 * narrower single-state purpose (always partial/complete + brand dot). This
 * component needs five distinct states and theme-aware selected-cell colors,
 * which don't fit that contract. Like ProgressRing, it is fully static: all
 * geometry is derived directly from props on every render — no animated SVG
 * props, no useAnimatedProps, no per-frame native commits.
 *
 * Ring states:
 *   no ring        — total === 0 or isFuture (renders nothing)
 *   skipped        — past, 0% done, had tasks: track only, opacity 0.5
 *   partial        — 0 < done < total: partial arc, ringFill, rounded tip
 *   complete       — done === total (> 0): closed full ring, accent, +0.5 stroke
 *
 * Selected-cell color inversion: the selected cell's background is
 * palette.text (near-black in light mode, cream in dark mode), so the ring
 * inside it must use the opposite tone of the current theme — never a
 * hard-coded white, which disappears against a light selected cell in dark
 * mode.
 */

import React from 'react';
import Svg, { Circle } from 'react-native-svg';

interface CalendarRingProps {
  size:   number;
  stroke: number;
  done:   number;
  total:  number;
  isFuture:   boolean;
  isSelected: boolean;
  dark:   boolean;
  /** palette.ringTrack / palette.ringFill / palette.accent for the current theme. */
  ringTrack: string;
  ringFill:  string;
  accent:    string;
}

export default function CalendarRing({
  size, stroke, done, total, isFuture, isSelected, dark, ringTrack, ringFill, accent,
}: CalendarRingProps) {
  if (total === 0 || isFuture) { return null; }

  const pct        = done / total;
  const isComplete = pct >= 1;
  const isZero     = done === 0; // had tasks, none done

  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const cx   = size / 2;

  // Theme-aware inversion for the selected cell (bg = palette.text).
  const selTrack = dark ? 'rgba(0,0,0,0.16)'    : 'rgba(255,255,255,0.20)';
  const selArc   = dark ? 'rgba(20,18,14,0.82)' : 'rgba(255,255,255,0.88)';

  const trackColor   = isSelected ? selTrack : ringTrack;
  const trackOpacity = isZero ? 0.5 : 1;
  const arcColor     = isComplete ? accent : (isSelected ? selArc : ringFill);

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      {/* Track — always rendered */}
      <Circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke={trackColor}
        strokeWidth={stroke}
        opacity={trackOpacity}
      />
      {/* Arc — only when progress > 0 */}
      {!isZero && (
        isComplete ? (
          <Circle
            cx={cx} cy={cx} r={r}
            fill="none"
            stroke={arcColor}
            strokeWidth={stroke + 0.5}
          />
        ) : (
          <Circle
            cx={cx} cy={cx} r={r}
            fill="none"
            stroke={arcColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circ * pct} ${circ}`}
          />
        )
      )}
    </Svg>
  );
}
