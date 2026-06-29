/**
 * BrushStroke — KAN-109
 *
 * An organic filled SVG brushstroke that overlays a completed task title,
 * replacing the standard CSS line-through.
 *
 * Shape anatomy (viewBox 0 0 260 16):
 *   - Main body: filled closed bezier path, slightly arced upward in the centre
 *   - Bristle fan: 4 thin strands at the right end (dry-brush tail)
 *   - Left entry: one ragged thin strand on the left
 *   - Colour: tokens.accent; fillOpacity 0.42 so the title stays readable
 *
 * Usage:
 *   <BrushStroke width={titleWidth} color={palette.accent} />
 *   Render inside a View that has position: 'relative'; add pointerEvents="none".
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface BrushStrokeProps {
  /** Pixel width of the title container — the SVG scales its viewBox to fit. */
  width: number;
  /** Fill / stroke colour, typically palette.accent. */
  color: string;
}

export default function BrushStroke({ width, color }: BrushStrokeProps) {
  if (width === 0) { return null; }

  return (
    <Svg
      width={width}
      height={26}
      viewBox="0 0 260 26"
      style={{ position: 'absolute', top: -2 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">

      {/* ── Main body ─────────────────────────────────────────────────────── */}
      {/* Filled closed bezier shape — top edge arcs slightly upward at midpoint */}
      <Path
        d={
          'M 4 12 ' +
          'C 20 7 60 5 130 6 ' +
          'C 180 5 220 7 248 10 ' +
          'L 252 10 ' +
          'L 250 19 ' +
          'C 220 20 180 19 130 19 ' +
          'C 60 20 20 19 6 19 ' +
          'Z'
        }
        fill={color}
        fillOpacity={0.42}
      />

      {/* ── Bristle fan — right end (dry-brush tail) ──────────────────────── */}
      <Path d="M 250 10 L 260 7"   stroke={color} strokeWidth={1.2} strokeOpacity={0.55} strokeLinecap="round" fill="none" />
      <Path d="M 251 12 L 262 11"  stroke={color} strokeWidth={1.0} strokeOpacity={0.45} strokeLinecap="round" fill="none" />
      <Path d="M 251 15 L 261 17"  stroke={color} strokeWidth={0.9} strokeOpacity={0.38} strokeLinecap="round" fill="none" />
      <Path d="M 250 17 L 259 20"  stroke={color} strokeWidth={0.8} strokeOpacity={0.28} strokeLinecap="round" fill="none" />

      {/* ── Left entry — ragged organic edge ──────────────────────────────── */}
      <Path d="M 4 11 L 1 13" stroke={color} strokeWidth={1.0} strokeOpacity={0.3} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
