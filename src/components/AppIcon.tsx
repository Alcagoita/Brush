/**
 * AppIcon — centralized SVG icon set for Vibe Agenda.
 *
 * Style spec (applies to every icon in this file):
 *   • 24 × 24 viewBox, rendered at whatever size the caller passes
 *   • fill="none"
 *   • stroke="currentColor" → passed as `color` prop
 *   • strokeWidth 1.6  (1.8 for BellIcon emphasis)
 *   • strokeLinecap="round" · strokeLinejoin="round"
 *   • No gradients, no shadows, no multi-weight strokes
 *   • Exception: tiny solid accent dots/wheels use fill=color, stroke="none"
 *
 * Closest reference: Lucide / Feather — hairline geometric outline aesthetic.
 *
 * Usage:
 *   import { BellIcon, PoiIcon, ChevronRightIcon } from './AppIcon';
 *   <BellIcon color={palette.text} size={20} />
 *   <PoiIcon  type="atm" color={palette.muted} size={22} />
 */

import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
// PoiType import removed — PoiIcon now accepts the broader `string` type (KAN-23).

// ─── Shared stroke props ──────────────────────────────────────────────────────

const S = {
  strokeLinecap:  'round'  as const,
  strokeLinejoin: 'round'  as const,
};

// ─── Icon components ──────────────────────────────────────────────────────────

interface IconProps {
  color: string;
  size?: number;
}

// ── Bell (Header notifications) ───────────────────────────────────────────────
export function BellIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke={color} strokeWidth={1.8} {...S}
      />
      <Path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke={color} strokeWidth={1.8} {...S}
      />
    </Svg>
  );
}

// ── Plus (FAB add-task button) ─────────────────────────────────────────────────
export function PlusIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="5"  x2="12" y2="19" stroke={color} strokeWidth={2} {...S} />
      <Line x1="5"  y1="12" x2="19" y2="12" stroke={color} strokeWidth={2} {...S} />
    </Svg>
  );
}

// ── Close × (sheet dismiss) ────────────────────────────────────────────────────
export function CloseIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="6"  y1="6"  x2="18" y2="18" stroke={color} strokeWidth={1.6} {...S} />
      <Line x1="18" y1="6"  x2="6"  y2="18" stroke={color} strokeWidth={1.6} {...S} />
    </Svg>
  );
}

// ── Chevron right (list row affordance) ────────────────────────────────────────
export function ChevronRightIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={1.6} {...S} />
    </Svg>
  );
}

// ── Chevron left (screen back button) ─────────────────────────────────────────
export function ChevronLeftIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={1.6} {...S} />
    </Svg>
  );
}

// ── Clock (time field) ─────────────────────────────────────────────────────────
export function ClockIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.6} {...S} />
      <Path d="M12 6v6l4 2"        stroke={color} strokeWidth={1.6} {...S} />
    </Svg>
  );
}

// ── Sun (light mode toggle) ───────────────────────────────────────────────────
export function SunIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={1.6} {...S} />
      <Line x1="12" y1="2"     x2="12" y2="4"     stroke={color} strokeWidth={1.6} {...S} />
      <Line x1="12" y1="20"    x2="12" y2="22"    stroke={color} strokeWidth={1.6} {...S} />
      <Line x1="2"  y1="12"    x2="4"  y2="12"    stroke={color} strokeWidth={1.6} {...S} />
      <Line x1="20" y1="12"    x2="22" y2="12"    stroke={color} strokeWidth={1.6} {...S} />
      <Line x1="4.22"  y1="4.22"  x2="5.64"  y2="5.64"  stroke={color} strokeWidth={1.6} {...S} />
      <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke={color} strokeWidth={1.6} {...S} />
      <Line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36" stroke={color} strokeWidth={1.6} {...S} />
      <Line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"  stroke={color} strokeWidth={1.6} {...S} />
    </Svg>
  );
}

// ── Moon (dark mode toggle) ───────────────────────────────────────────────────
export function MoonIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        stroke={color} strokeWidth={1.6} {...S}
      />
    </Svg>
  );
}

// ── Grid (categories list) ────────────────────────────────────────────────────
export function GridIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3"  y="3"  width="7" height="7" rx="1" stroke={color} strokeWidth={1.6} {...S} />
      <Rect x="14" y="3"  width="7" height="7" rx="1" stroke={color} strokeWidth={1.6} {...S} />
      <Rect x="3"  y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={1.6} {...S} />
      <Rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={1.6} {...S} />
    </Svg>
  );
}

// ── LogOut (sign out) ─────────────────────────────────────────────────────────
export function LogOutIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
            stroke={color} strokeWidth={1.6} {...S} />
      <Path d="M16 17l5-5-5-5"
            stroke={color} strokeWidth={1.6} {...S} />
      <Line x1="21" y1="12" x2="9" y2="12"
            stroke={color} strokeWidth={1.6} {...S} />
    </Svg>
  );
}

// ── POI icons ──────────────────────────────────────────────────────────────────
//
//   ATM         — credit-card outline + magnetic stripe + chip line
//   Café        — cup body + handle + two steam wisps
//   Market      — shopping cart body; wheel dots are the only solid fills
//   Pharmacy    — diagonal pill capsule with centre divider (Lucide Pill)

interface PoiIconProps extends IconProps {
  /** Google Places primary type string. Built-in types render a specific icon;
   *  all other strings (custom category types) render a generic map-pin. */
  type: string;
}

export function PoiIcon({ type, color, size = 24 }: PoiIconProps) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' };

  switch (type) {
    case 'atm':
      return (
        <Svg {...p}>
          <Rect x="2" y="5" width="20" height="14" rx="2" stroke={color} strokeWidth={1.6} {...S} />
          <Line x1="2" y1="10" x2="22" y2="10" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
          <Line x1="5.5" y1="14.5" x2="9" y2="14.5" stroke={color} strokeWidth={1.6} {...S} />
        </Svg>
      );

    case 'cafe':
      return (
        <Svg {...p}>
          <Path d="M8 3 Q7.5 5 8 7"    stroke={color} strokeWidth={1.6} {...S} />
          <Path d="M12 3 Q11.5 5 12 7" stroke={color} strokeWidth={1.6} {...S} />
          <Path d="M4 9h14v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9z" stroke={color} strokeWidth={1.6} {...S} />
          <Path d="M18 11h1a3 3 0 0 1 0 6h-1" stroke={color} strokeWidth={1.6} {...S} />
        </Svg>
      );

    case 'supermarket':
      return (
        <Svg {...p}>
          <Path
            d="M2 2h2l1.68 8.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 1.95-1.57L21 5H6"
            stroke={color} strokeWidth={1.6} {...S}
          />
          {/* Wheel dots — only solid fills in the icon set */}
          <Circle cx="9"  cy="20" r="1.1" fill={color} stroke="none" />
          <Circle cx="18" cy="20" r="1.1" fill={color} stroke="none" />
        </Svg>
      );

    case 'pharmacy':
      return (
        <Svg {...p}>
          <Path
            d="M10.5 20.5 20 11a4.95 4.95 0 1 0-7-7L3.5 13.5a4.95 4.95 0 1 0 7 7Z"
            stroke={color} strokeWidth={1.6} {...S}
          />
          <Line x1="8.5" y1="8.5" x2="15.5" y2="15.5" stroke={color} strokeWidth={1.6} {...S} />
        </Svg>
      );

    default:
      // Generic map-pin for custom (non-built-in) place types.
      return (
        <Svg {...p}>
          <Path
            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
            stroke={color} strokeWidth={1.6} {...S}
          />
          <Circle cx="12" cy="9" r="2.5" stroke={color} strokeWidth={1.6} {...S} />
        </Svg>
      );
  }
}
