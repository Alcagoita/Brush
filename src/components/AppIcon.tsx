/**
 * AppIcon — centralized SVG icon set for Brush.
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
export function ChevronRightIcon({ color, size = 24, strokeWidth = 1.6 }: IconProps & { strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={strokeWidth} {...S} />
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

// ── Users / Social hub ────────────────────────────────────────────────────────
export function UsersIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Primary person */}
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
            stroke={color} strokeWidth={1.6} {...S} />
      <Circle cx="9" cy="7" r="4"
              stroke={color} strokeWidth={1.6} {...S} />
      {/* Secondary person (right, slightly offset) */}
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87"
            stroke={color} strokeWidth={1.6} {...S} />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75"
            stroke={color} strokeWidth={1.6} {...S} />
    </Svg>
  );
}

// ── Share / Send ──────────────────────────────────────────────────────────────
export function ShareIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="18" cy="5"  r="3" stroke={color} strokeWidth={1.6} {...S} />
      <Circle cx="6"  cy="12" r="3" stroke={color} strokeWidth={1.6} {...S} />
      <Circle cx="18" cy="19" r="3" stroke={color} strokeWidth={1.6} {...S} />
      <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49"
            stroke={color} strokeWidth={1.6} {...S} />
      <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49"
            stroke={color} strokeWidth={1.6} {...S} />
    </Svg>
  );
}

// ── Trophy / Challenge ────────────────────────────────────────────────────────
export function TrophyIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9H3V4h3" stroke={color} strokeWidth={1.6} {...S} />
      <Path d="M18 9h3V4h-3" stroke={color} strokeWidth={1.6} {...S} />
      <Path d="M6 4h12v7a6 6 0 0 1-12 0V4z" stroke={color} strokeWidth={1.6} {...S} />
      <Path d="M12 17v4" stroke={color} strokeWidth={1.6} {...S} />
      <Path d="M8 21h8" stroke={color} strokeWidth={1.6} {...S} />
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
   *  Google-mapped types fall back to the nearest semantic icon;
   *  truly unknown strings render a generic map-pin. */
  type: string;
}

/**
 * Maps Google Places API type strings (and common free-text equivalents) to
 * the nearest built-in icon key. Only types NOT already handled by the switch
 * cases below need to be listed here.
 */
const GOOGLE_TYPE_ICON: Record<string, string> = {
  // Food & drink
  bakery:               'store',
  bar:                  'cafe',
  coffee_shop:          'cafe',
  food:                 'restaurant',
  meal_delivery:        'restaurant',
  meal_takeaway:        'restaurant',
  night_club:           'restaurant',

  // Health
  dentist:              'clinic',
  doctor:               'clinic',
  drugstore:            'pharmacy',
  hospital:             'clinic',
  physiotherapist:      'clinic',
  veterinary_care:      'clinic',

  // Shopping & retail
  bicycle_store:        'store',
  book_store:           'library',
  car_dealer:           'store',
  car_rental:           'store',
  clothing_store:       'store',
  convenience_store:    'store',
  department_store:     'store',
  electronics_store:    'store',
  florist:              'park',
  furniture_store:      'store',
  grocery_or_supermarket: 'supermarket',
  hardware_store:       'store',
  home_goods_store:     'store',
  jewelry_store:        'store',
  laundry:              'store',
  liquor_store:         'store',
  locksmith:            'store',
  moving_company:       'store',
  pet_store:            'store',
  shoe_store:           'store',
  shopping_mall:        'store',
  storage:              'store',

  // Finance / official
  accounting:           'bank',
  city_hall:            'bank',
  courthouse:           'bank',
  embassy:              'bank',
  insurance_agency:     'bank',
  local_government_office: 'bank',
  real_estate_agency:   'bank',

  // Transport
  airport:              'bus',
  bus_station:          'bus',
  light_rail_station:   'bus',
  subway_station:       'bus',
  taxi_stand:           'bus',
  train_station:        'bus',
  transit_station:      'bus',

  // Education & culture
  art_gallery:          'library',
  museum:               'library',
  primary_school:       'school',
  secondary_school:     'school',
  university:           'school',

  // Outdoor & leisure
  amusement_park:       'park',
  aquarium:             'park',
  campground:           'park',
  natural_feature:      'park',
  rv_park:              'park',
  stadium:              'park',
  tourist_attraction:   'park',
  zoo:                  'park',

  // Auto & fuel
  car_repair:           'gas',
  car_wash:             'gas',
  gas_station:          'gas',

  // Beauty & wellness
  beauty_salon:         'salon',
  hair_care:            'salon',
  spa:                  'salon',

  // Post & lodging
  lodging:              'store',
  post_office:          'post',
};

export function PoiIcon({ type, color, size = 24 }: PoiIconProps) {
  // If the type isn't a built-in case, check the Google mapping before the pin fallback.
  const resolved = GOOGLE_TYPE_ICON[type] ?? type;

  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' };

  switch (resolved) {
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

    case 'gas':
      return (
        <Svg {...p}>
          <Path d="M3 22V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14" stroke={color} strokeWidth={1.6} {...S} />
          <Line x1="2" y1="22" x2="14" y2="22" stroke={color} strokeWidth={1.6} {...S} />
          <Path d="M13 8h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9l-3-3" stroke={color} strokeWidth={1.6} {...S} />
          <Rect x="6" y="11" width="6" height="4" rx="1" stroke={color} strokeWidth={1.4} {...S} />
        </Svg>
      );

    case 'gym':
      return (
        <Svg {...p}>
          <Line x1="6.5" y1="12" x2="17.5" y2="12" stroke={color} strokeWidth={1.6} {...S} />
          <Path d="M3 12h2.5M18.5 12H21" stroke={color} strokeWidth={2} {...S} />
          <Rect x="4" y="9" width="2" height="6" rx="1" stroke={color} strokeWidth={1.6} {...S} />
          <Rect x="18" y="9" width="2" height="6" rx="1" stroke={color} strokeWidth={1.6} {...S} />
          <Rect x="2" y="10.5" width="2" height="3" rx="0.8" stroke={color} strokeWidth={1.6} {...S} />
          <Rect x="20" y="10.5" width="2" height="3" rx="0.8" stroke={color} strokeWidth={1.6} {...S} />
        </Svg>
      );

    case 'bank':
      return (
        <Svg {...p}>
          <Path d="M3 10h18M12 3l9 7H3l9-7z" stroke={color} strokeWidth={1.6} {...S} />
          <Line x1="6"  y1="10" x2="6"  y2="18" stroke={color} strokeWidth={1.6} {...S} />
          <Line x1="12" y1="10" x2="12" y2="18" stroke={color} strokeWidth={1.6} {...S} />
          <Line x1="18" y1="10" x2="18" y2="18" stroke={color} strokeWidth={1.6} {...S} />
          <Line x1="3"  y1="18" x2="21" y2="18" stroke={color} strokeWidth={1.6} {...S} />
          <Line x1="2"  y1="21" x2="22" y2="21" stroke={color} strokeWidth={1.6} {...S} />
        </Svg>
      );

    case 'restaurant':
      return (
        <Svg {...p}>
          <Path d="M3 3v6a4 4 0 0 0 4 4h0a4 4 0 0 0 4-4V3" stroke={color} strokeWidth={1.6} {...S} />
          <Line x1="7" y1="13" x2="7" y2="21" stroke={color} strokeWidth={1.6} {...S} />
          <Path d="M17 3v5" stroke={color} strokeWidth={1.6} {...S} />
          <Path d="M17 12a4 4 0 0 1-4-4V3h8v5a4 4 0 0 1-4 4z" stroke={color} strokeWidth={1.6} {...S} />
          <Line x1="17" y1="12" x2="17" y2="21" stroke={color} strokeWidth={1.6} {...S} />
        </Svg>
      );

    case 'park':
      return (
        <Svg {...p}>
          <Path d="M12 2C8 2 5 6 7 10H5l7 8 7-8h-2c2-4-1-8-5-8z" stroke={color} strokeWidth={1.6} {...S} />
          <Line x1="12" y1="18" x2="12" y2="22" stroke={color} strokeWidth={1.6} {...S} />
        </Svg>
      );

    case 'library':
      return (
        <Svg {...p}>
          <Path d="M4 19V7a2 2 0 0 1 2-2h1v14H6a2 2 0 0 1-2-2z" stroke={color} strokeWidth={1.6} {...S} />
          <Path d="M9 5h2a2 2 0 0 1 2 2v12H9V5z" stroke={color} strokeWidth={1.6} {...S} />
          <Path d="M15.5 5.5l1.9-.7a2 2 0 0 1 2.5 1.2l3.5 9.6a2 2 0 0 1-1.2 2.5l-2 .7-4.7-13.3z" stroke={color} strokeWidth={1.6} {...S} />
        </Svg>
      );

    case 'post':
      return (
        <Svg {...p}>
          <Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth={1.6} {...S} />
          <Path d="M2 6l10 7 10-7" stroke={color} strokeWidth={1.6} {...S} />
        </Svg>
      );

    case 'store':
      return (
        <Svg {...p}>
          <Path d="M6 2 3 6v2a4 4 0 0 0 8 0V6M13 8a4 4 0 0 0 8 0V6l-3-4" stroke={color} strokeWidth={1.6} {...S} />
          <Path d="M5 10v10a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1V10" stroke={color} strokeWidth={1.6} {...S} />
        </Svg>
      );

    case 'clinic':
      return (
        <Svg {...p}>
          <Rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth={1.6} {...S} />
          <Line x1="12" y1="7" x2="12" y2="17" stroke={color} strokeWidth={1.6} {...S} />
          <Line x1="7"  y1="12" x2="17" y2="12" stroke={color} strokeWidth={1.6} {...S} />
        </Svg>
      );

    case 'salon':
      return (
        <Svg {...p}>
          <Circle cx="6"  cy="6"  r="2.5" stroke={color} strokeWidth={1.6} {...S} />
          <Circle cx="18" cy="6"  r="2.5" stroke={color} strokeWidth={1.6} {...S} />
          <Circle cx="6"  cy="20" r="2"   stroke={color} strokeWidth={1.6} {...S} />
          <Circle cx="18" cy="20" r="2"   stroke={color} strokeWidth={1.6} {...S} />
          <Line x1="6.5" y1="7.5" x2="17.5" y2="18.5" stroke={color} strokeWidth={1.6} {...S} />
          <Line x1="17.5" y1="7.5" x2="6.5" y2="18.5" stroke={color} strokeWidth={1.6} {...S} />
        </Svg>
      );

    case 'bus':
      return (
        <Svg {...p}>
          <Rect x="3" y="3" width="18" height="14" rx="2" stroke={color} strokeWidth={1.6} {...S} />
          <Path d="M3 9h18" stroke={color} strokeWidth={1.6} {...S} />
          <Line x1="12" y1="3" x2="12" y2="9" stroke={color} strokeWidth={1.6} {...S} />
          <Path d="M7 17v2M17 17v2" stroke={color} strokeWidth={1.6} {...S} />
          <Circle cx="7.5"  cy="17" r="1.5" fill={color} stroke="none" />
          <Circle cx="16.5" cy="17" r="1.5" fill={color} stroke="none" />
        </Svg>
      );

    case 'school':
      return (
        <Svg {...p}>
          <Path d="M12 3L2 9l10 6 10-6-10-6z" stroke={color} strokeWidth={1.6} {...S} />
          <Path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" stroke={color} strokeWidth={1.6} {...S} />
          <Line x1="22" y1="9" x2="22" y2="14" stroke={color} strokeWidth={1.6} {...S} />
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

// ── Settings / Gear ───────────────────────────────────────────────────────────
export function SettingsIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.6} {...S} />
      <Path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke={color} strokeWidth={1.6} {...S}
      />
    </Svg>
  );
}

// ── Camera ────────────────────────────────────────────────────────────────────
export function CameraIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke={color} strokeWidth={1.6} {...S}
      />
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={1.6} {...S} />
    </Svg>
  );
}

// ── Flame / Streak ────────────────────────────────────────────────────────────
export function FlameIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
        stroke={color} strokeWidth={1.6} {...S}
      />
    </Svg>
  );
}

/** Filled flame — used in the streak chip. Fill-only, no stroke. */
export function FilledFlameIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M13.4 2.2c.4 2.6-.7 4.1-2 5.5-1.3 1.4-2.9 2.8-2.9 5.4a5.6 5.6 0 0 0 8.4 4.9c2-1.2 3.1-3.4 3.1-5.8 0-2.2-.9-3.8-1.9-5-.3 1-1 1.7-1.9 2 .4-2.4-.6-5.1-2.9-7z"
        fill={color}
      />
    </Svg>
  );
}

// ── Lock ──────────────────────────────────────────────────────────────────────
export function LockIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth={1.6} {...S} />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth={1.6} {...S} />
    </Svg>
  );
}

// ── Pencil / Edit ─────────────────────────────────────────────────────────────
export function PencilIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
        stroke={color} strokeWidth={1.6} {...S}
      />
      <Path
        d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke={color} strokeWidth={1.6} {...S}
      />
    </Svg>
  );
}

// ── Battery ───────────────────────────────────────────────────────────────────
export function BatteryIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="7" width="17" height="10" rx="2" stroke={color} strokeWidth={1.6} {...S} />
      <Path d="M22 11v2" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Line x1="5.5" y1="12" x2="9.5" y2="12" stroke={color} strokeWidth={1.6} {...S} />
    </Svg>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────────────
export function CalendarIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth={1.6} {...S} />
      <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth={1.6} {...S} />
      <Line x1="8"  y1="2" x2="8"  y2="6" stroke={color} strokeWidth={1.6} {...S} />
      <Line x1="3"  y1="10" x2="21" y2="10" stroke={color} strokeWidth={1.6} {...S} />
    </Svg>
  );
}

// ── ListCheck (import tasks) ──────────────────────────────────────────────────
export function ListCheckIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="10" y1="6"  x2="21" y2="6"  stroke={color} strokeWidth={1.6} {...S} />
      <Line x1="10" y1="12" x2="21" y2="12" stroke={color} strokeWidth={1.6} {...S} />
      <Line x1="10" y1="18" x2="21" y2="18" stroke={color} strokeWidth={1.6} {...S} />
      <Path d="M3 6l1.5 1.5L7 3.5"  stroke={color} strokeWidth={1.6} {...S} />
      <Path d="M3 12l1.5 1.5L7 9.5" stroke={color} strokeWidth={1.6} {...S} />
      <Path d="M3 18l1.5 1.5L7 15.5" stroke={color} strokeWidth={1.6} {...S} />
    </Svg>
  );
}

// ── Medal / Achievement ───────────────────────────────────────────────────────
export function MedalIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="14" r="7" stroke={color} strokeWidth={1.6} {...S} />
      <Path d="M7.9 4L6 7l6 2.5L18 7l-1.9-3" stroke={color} strokeWidth={1.6} {...S} />
    </Svg>
  );
}

// ── Check (achievement) ───────────────────────────────────────────────────────
export function CheckIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12l5 5L20 7" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Pin / Location ────────────────────────────────────────────────────────────
export function PinIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C8.69 2 6 4.69 6 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.31-2.69-6-6-6z"
        stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Circle cx="12" cy="8" r="2" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

// ── Star ──────────────────────────────────────────────────────────────────────
export function StarIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}

export function FilledStarIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={color}
      />
    </Svg>
  );
}

// ── Copy (clipboard) ──────────────────────────────────────────────────────────
export function CopyIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="9" width="13" height="13" rx="2" stroke={color} strokeWidth={1.6} {...S} />
      <Path
        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke={color} strokeWidth={1.6} {...S}
      />
    </Svg>
  );
}

// ── Message / Chat ────────────────────────────────────────────────────────────
export function MessageIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke={color} strokeWidth={1.6} {...S}
      />
    </Svg>
  );
}

// ── Refresh (circular arrow) ──────────────────────────────────────────────────
export function RefreshIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 4v6h6"
        stroke={color} strokeWidth={1.6} {...S}
      />
      <Path
        d="M3.51 15a9 9 0 1 0 .49-4"
        stroke={color} strokeWidth={1.6} {...S}
      />
    </Svg>
  );
}

// ── QR Code ───────────────────────────────────────────────────────────────────
export function QrCodeIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Finder patterns (outer squares) */}
      <Rect x="3"  y="3"  width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.6} {...S} />
      <Rect x="14" y="3"  width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.6} {...S} />
      <Rect x="3"  y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.6} {...S} />
      {/* Finder inner dots */}
      <Rect x="5"  y="5"  width="3" height="3" rx="0.5" fill={color} />
      <Rect x="16" y="5"  width="3" height="3" rx="0.5" fill={color} />
      <Rect x="5"  y="16" width="3" height="3" rx="0.5" fill={color} />
      {/* Data area (bottom-right, simplified) */}
      <Rect x="14" y="14" width="3" height="3" rx="0.5" stroke={color} strokeWidth={1.6} {...S} />
      <Rect x="18" y="14" width="3" height="3" rx="0.5" stroke={color} strokeWidth={1.6} {...S} />
      <Rect x="18" y="18" width="3" height="3" rx="0.5" stroke={color} strokeWidth={1.6} {...S} />
    </Svg>
  );
}

/** Building / store icon — used by KAN-74 Store fine tuning indicator. */
export function BuildingIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Main building outline */}
      <Path
        d="M3 21h18M5 21V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v16"
        stroke={color} strokeWidth={1.6} {...S}
      />
      {/* Left windows */}
      <Rect x="7"  y="8"  width="3" height="3" rx="0.5" stroke={color} strokeWidth={1.4} {...S} />
      <Rect x="7"  y="13" width="3" height="3" rx="0.5" stroke={color} strokeWidth={1.4} {...S} />
      {/* Right windows */}
      <Rect x="14" y="8"  width="3" height="3" rx="0.5" stroke={color} strokeWidth={1.4} {...S} />
      <Rect x="14" y="13" width="3" height="3" rx="0.5" stroke={color} strokeWidth={1.4} {...S} />
      {/* Door */}
      <Path d="M10 21v-4h4v4" stroke={color} strokeWidth={1.6} {...S} />
    </Svg>
  );
}
