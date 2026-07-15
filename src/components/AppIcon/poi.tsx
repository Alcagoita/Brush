import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { S } from './shared';
import type { IconProps } from './shared';

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
export const GOOGLE_TYPE_ICON: Record<string, string> = {
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
  fire_station:         'bank',
  government_office:    'bank',
  insurance_agency:     'bank',
  local_government_office: 'bank',
  neighborhood_police_station: 'bank',
  police:               'bank',
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
  const resolved = resolvePoiIconType(type);

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

export function resolvePoiIconType(type: string): string {
  return GOOGLE_TYPE_ICON[type] ?? type;
}
