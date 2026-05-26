/**
 * maps.ts — Google Places API (New) integration.
 *
 * Decision (KAN-21):
 *   We use the Google Places API (New) via REST — no native Maps SDK embedded
 *   in the app. The "Open in Maps" CTA deep-links to the device's native Maps
 *   application. This keeps the binary size small and avoids a heavy native
 *   dependency for v1.0.
 *
 *   API reference: https://developers.google.com/maps/documentation/places/web-service
 *
 * Nearby Search endpoint used:
 *   POST https://places.googleapis.com/v1/places:searchNearby
 *
 * Field mask (billing impact — only request what we need):
 *   places.id, places.displayName, places.location, places.types
 */

import { Linking, Platform } from 'react-native';
import { GOOGLE_PLACES_API_KEY } from '../config/keys';
import { PoiType, POI_GOOGLE_TYPES } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NearbyPlace {
  /** Google Places ID (use for place details, deep links, caching). */
  placeId: string;
  /** Human-readable place name. */
  name: string;
  /** Latitude of the place. */
  lat: number;
  /** Longitude of the place. */
  lng: number;
  /** Straight-line distance from the search origin in metres. */
  distanceMeters: number;
}

// ─── Internal Places API types ─────────────────────────────────────────────────

interface PlacesApiPlace {
  id: string;
  displayName?: { text: string; languageCode?: string };
  location?: { latitude: number; longitude: number };
}

interface PlacesApiResponse {
  places?: PlacesApiPlace[];
}

// ─── Haversine distance ────────────────────────────────────────────────────────

const DEG_TO_RAD = Math.PI / 180;

/**
 * Returns the great-circle distance in metres between two lat/lng pairs.
 * Accurate enough for geofence radii of 50–75 m.
 */
export function getDistanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000; // Earth radius in metres
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Places API — Nearby Search ───────────────────────────────────────────────

const PLACES_NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby';

/**
 * Search for places of the given POI type within `radiusMeters` of `lat`/`lng`.
 *
 * Results are sorted ascending by straight-line distance from the origin.
 * Returns up to 5 candidates (we only ever show the closest one per type).
 *
 * Throws on network error or non-200 response so callers can handle gracefully.
 */
export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  poiType: PoiType,
  radiusMeters: number,
): Promise<NearbyPlace[]> {
  const googleType = POI_GOOGLE_TYPES[poiType];

  const body = {
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMeters,
      },
    },
    includedTypes: [googleType],
    maxResultCount: 5,
    rankPreference: 'DISTANCE',
  };

  const response = await fetch(PLACES_NEARBY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      // Request only the fields we use — avoids billing for unused field sets.
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Places API ${response.status}: ${text}`);
  }

  const data = (await response.json()) as PlacesApiResponse;
  const places = data.places ?? [];

  return places
    .filter(p => p.location != null)
    .map(p => {
      const placeLat = p.location!.latitude;
      const placeLng = p.location!.longitude;
      return {
        placeId:        p.id,
        name:           p.displayName?.text ?? 'Unknown',
        lat:            placeLat,
        lng:            placeLng,
        distanceMeters: getDistanceMeters(lat, lng, placeLat, placeLng),
      };
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

// ─── Deep-link to native Maps ─────────────────────────────────────────────────

/**
 * Opens the device's native Maps application and starts navigation to the
 * given coordinates.
 *
 * Android: `geo:0,0?q={lat},{lng}({label})`  — opens Google Maps or default
 * iOS:     `maps://?daddr={lat},{lng}`        — opens Apple Maps
 *          Falls back to Google Maps URL if Apple Maps cannot open.
 */
export async function openInMaps(
  lat: number,
  lng: number,
  label: string,
): Promise<void> {
  const encodedLabel = encodeURIComponent(label);

  let url: string;
  if (Platform.OS === 'android') {
    url = `geo:0,0?q=${lat},${lng}(${encodedLabel})`;
  } else {
    // Try Apple Maps first; fall back to Google Maps if unavailable.
    const appleMapsUrl = `maps://?daddr=${lat},${lng}`;
    const canOpenApple = await Linking.canOpenURL(appleMapsUrl);
    url = canOpenApple
      ? appleMapsUrl
      : `https://maps.google.com/?daddr=${lat},${lng}&q=${encodedLabel}`;
  }

  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    // Last resort: open Google Maps in browser.
    url = `https://maps.google.com/?daddr=${lat},${lng}&q=${encodedLabel}`;
  }

  await Linking.openURL(url);
}

// ─── Distance display helper ───────────────────────────────────────────────────

/**
 * Formats a distance in metres for display.
 *   < 1000 m → "850 m"
 *   ≥ 1000 m → "1.2 km"
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

// ─── Place type search ────────────────────────────────────────────────────────

const PLACES_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

/**
 * Generic place type strings that convey no useful information to a user
 * (returned by the Places API alongside specific types like "gym").
 * We filter these out before displaying search results.
 */
const GENERIC_PLACE_TYPES = new Set([
  'establishment', 'point_of_interest', 'food', 'store', 'health', 'finance',
  'service', 'political', 'locality', 'sublocality', 'country', 'route',
  'street_address', 'premise', 'subpremise', 'postal_code', 'natural_feature',
  'transit_station', 'place_of_worship', 'geocode',
]);

/**
 * Human-readable labels for common Google Places primary types.
 * Covers the full taxonomy that users are likely to search for as
 * category location types.
 */
export const PLACE_TYPE_LABELS: Record<string, string> = {
  atm:                  'ATM',
  bank:                 'Bank',
  bar:                  'Bar',
  beauty_salon:         'Beauty Salon',
  book_store:           'Book Store',
  cafe:                 'Café',
  car_repair:           'Car Repair',
  car_wash:             'Car Wash',
  clothing_store:       'Clothing Store',
  convenience_store:    'Convenience Store',
  dentist:              'Dentist',
  department_store:     'Department Store',
  doctor:               'Doctor',
  drugstore:            'Drugstore',
  electronics_store:    'Electronics Store',
  fast_food_restaurant: 'Fast Food',
  fitness_center:       'Fitness Center',
  florist:              'Florist',
  gas_station:          'Gas Station',
  grocery_store:        'Grocery Store',
  gym:                  'Gym',
  hair_care:            'Hair Salon',
  hardware_store:       'Hardware Store',
  home_goods_store:     'Home Goods',
  hospital:             'Hospital',
  jewelry_store:        'Jewelry Store',
  laundry:              'Laundry',
  library:              'Library',
  liquor_store:         'Liquor Store',
  meal_delivery:        'Delivery',
  meal_takeaway:        'Takeaway',
  movie_theater:        'Movie Theater',
  museum:               'Museum',
  night_club:           'Night Club',
  park:                 'Park',
  pet_store:            'Pet Store',
  pharmacy:             'Pharmacy',
  physiotherapist:      'Physiotherapist',
  post_office:          'Post Office',
  restaurant:           'Restaurant',
  school:               'School',
  shopping_mall:        'Shopping Mall',
  spa:                  'Spa',
  sports_complex:       'Sports Complex',
  stadium:              'Stadium',
  storage:              'Storage',
  subway_station:       'Subway Station',
  supermarket:          'Supermarket',
  tourist_attraction:   'Tourist Attraction',
  train_station:        'Train Station',
  university:           'University',
  veterinary_care:      'Veterinary',
};

/**
 * Returns a human-readable label for a Google Places type string.
 * Falls back to title-casing the raw type (e.g. "fitness_center" → "Fitness Center").
 */
export function placeTypeLabel(type: string): string {
  return (
    PLACE_TYPE_LABELS[type] ??
    type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  );
}

/** Result item returned by searchPlaceTypes. */
export interface PlaceTypeSuggestion {
  type:  string;
  label: string;
}

/**
 * Search Google Places for place types matching the given query.
 *
 * Uses the Places API (New) Text Search endpoint and extracts unique
 * primary types from the top results — giving the user real Google Maps
 * categories to choose from as a category location type.
 *
 * Returns up to 8 distinct, non-generic type suggestions.
 * Throws on network error or non-200 response.
 */
export async function searchPlaceTypes(query: string): Promise<PlaceTypeSuggestion[]> {
  const response = await fetch(PLACES_TEXT_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type':     'application/json',
      'X-Goog-Api-Key':   GOOGLE_PLACES_API_KEY,
      // Request only the primary type — minimal billing impact.
      'X-Goog-FieldMask': 'places.primaryType',
    },
    body: JSON.stringify({
      textQuery:      query,
      maxResultCount: 10,
      languageCode:   'en',
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Places API ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    places?: Array<{ primaryType?: string }>;
  };

  const seen    = new Set<string>();
  const results: PlaceTypeSuggestion[] = [];

  for (const place of data.places ?? []) {
    const type = place.primaryType;
    if (!type || GENERIC_PLACE_TYPES.has(type) || seen.has(type)) { continue; }
    seen.add(type);
    results.push({ type, label: placeTypeLabel(type) });
    if (results.length >= 8) { break; }
  }

  return results;
}
