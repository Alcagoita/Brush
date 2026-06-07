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
      height={16}
      viewBox="0 0 260 16"
      style={{ position: 'absolute', top: 2 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">

      {/* ── Main body ─────────────────────────────────────────────────────── */}
      {/* Filled closed bezier shape — top edge arcs slightly upward at midpoint */}
      <Path
        d={
          'M 4 8 ' +
          'C 20 5 60 3 130 4 ' +
          'C 180 3 220 5 248 7 ' +
          'L 252 7 ' +
          'L 250 10 ' +
          'C 220 11 180 10 130 10 ' +
          'C 60 11 20 10 6 10 ' +
          'Z'
        }
        fill={color}
        fillOpacity={0.42}
      />

      {/* ── Bristle fan — right end (dry-brush tail) ──────────────────────── */}
      <Path d="M 250 7 L 260 5"   stroke={color} strokeWidth={1.2} strokeOpacity={0.55} strokeLinecap="round" fill="none" />
      <Path d="M 251 8 L 262 7"   stroke={color} strokeWidth={1.0} strokeOpacity={0.45} strokeLinecap="round" fill="none" />
      <Path d="M 251 9 L 261 10"  stroke={color} strokeWidth={0.9} strokeOpacity={0.38} strokeLinecap="round" fill="none" />
      <Path d="M 250 10 L 259 12" stroke={color} strokeWidth={0.8} strokeOpacity={0.28} strokeLinecap="round" fill="none" />

      {/* ── Left entry — ragged organic edge ──────────────────────────────── */}
      <Path d="M 4 7 L 1 8" stroke={color} strokeWidth={1.0} strokeOpacity={0.3} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
