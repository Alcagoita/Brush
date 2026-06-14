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
import { Category, PoiType, POI_GOOGLE_TYPES } from '../types';

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
  types?: string[];
}

interface PlacesApiResponse {
  places?: PlacesApiPlace[];
}

// ─── Fetch with timeout ────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 8_000;

function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
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
 * Search for places of all given POI types within `radiusMeters` of `lat`/`lng`
 * in a SINGLE Places API call.
 *
 * `poiTypes` accepts our internal PoiType keys (mapped via POI_GOOGLE_TYPES) or
 * arbitrary Google Places primary type strings for custom categories. All types
 * are sent together in `includedTypes` so the API returns matches for any of
 * them in one round-trip.
 *
 * Returns a map keyed by the original poiType, each entry sorted ascending by
 * straight-line distance (up to 5 candidates per type).
 *
 * Throws on network error, timeout (8 s), or non-200 response.
 */
export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  poiTypes: string[],
  radiusMeters: number,
): Promise<Record<string, NearbyPlace[]>> {
  if (poiTypes.length === 0) { return {}; }

  // Map internal type keys → Google Places primary type strings.
  const googleTypes = poiTypes.map(t => POI_GOOGLE_TYPES[t as PoiType] ?? t);

  // Reverse map for grouping results back by our internal key.
  const googleToInternal: Record<string, string> = {};
  for (let i = 0; i < poiTypes.length; i++) {
    googleToInternal[googleTypes[i]] = poiTypes[i];
  }

  const body = {
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMeters,
      },
    },
    includedTypes: googleTypes,
    maxResultCount: 20,
    rankPreference: 'DISTANCE',
  };

  const response = await fetchWithTimeout(PLACES_NEARBY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.types',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Places API ${response.status}: ${text}`);
  }

  const data = (await response.json()) as PlacesApiResponse;

  // Initialise result buckets for every requested type.
  const result: Record<string, NearbyPlace[]> = {};
  for (const poiType of poiTypes) { result[poiType] = []; }

  for (const p of data.places ?? []) {
    if (!p.location) { continue; }
    const placeLat = p.location.latitude;
    const placeLng = p.location.longitude;
    const nearbyPlace: NearbyPlace = {
      placeId:        p.id,
      name:           p.displayName?.text ?? 'Unknown',
      lat:            placeLat,
      lng:            placeLng,
      distanceMeters: getDistanceMeters(lat, lng, placeLat, placeLng),
    };

    // Assign this place to the first requested type it matches.
    for (const placeType of (p.types ?? [])) {
      const internalType = googleToInternal[placeType];
      if (internalType && result[internalType]) {
        result[internalType].push(nearbyPlace);
        break;
      }
    }
  }

  // Sort and cap each bucket.
  for (const poiType of poiTypes) {
    result[poiType].sort((a, b) => a.distanceMeters - b.distanceMeters);
    if (result[poiType].length > 5) { result[poiType] = result[poiType].slice(0, 5); }
  }

  return result;
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
  // Food & drink
  atm:                  'ATM',
  bakery:               'Bakery',
  bank:                 'Bank',
  bar:                  'Bar',
  cafe:                 'Café',
  fast_food_restaurant: 'Fast Food',
  night_club:           'Night Club',
  restaurant:           'Restaurant',

  // Health
  dentist:              'Dentist',
  doctor:               'Doctor',
  drugstore:            'Drugstore',
  gym:                  'Gym',
  fitness_center:       'Fitness Center',
  hospital:             'Hospital',
  pharmacy:             'Pharmacy',
  physiotherapist:      'Physiotherapist',
  spa:                  'Spa',
  sports_complex:       'Sports Complex',
  veterinary_care:      'Veterinary',

  // Shopping & retail
  beauty_salon:         'Beauty Salon',
  bicycle_store:        'Bicycle Store',
  book_store:           'Book Store',
  car_dealer:           'Car Dealer',
  car_rental:           'Car Rental',
  clothing_store:       'Clothing Store',
  convenience_store:    'Convenience Store',
  department_store:     'Department Store',
  electronics_store:    'Electronics Store',
  florist:              'Florist',
  grocery_store:        'Grocery Store',
  hair_care:            'Hair Salon',
  hardware_store:       'Hardware Store',
  home_goods_store:     'Home Goods',
  jewelry_store:        'Jewelry Store',
  laundry:              'Laundry',
  liquor_store:         'Liquor Store',
  locksmith:            'Locksmith',
  meal_delivery:        'Delivery',
  meal_takeaway:        'Takeaway',
  pet_store:            'Pet Store',
  shoe_store:           'Shoe Store',
  shopping_mall:        'Shopping Mall',
  storage:              'Storage',
  supermarket:          'Supermarket',

  // Services & finance
  accounting:           'Accounting',
  car_repair:           'Car Repair',
  car_wash:             'Car Wash',
  city_hall:            'City Hall',
  gas_station:          'Gas Station',
  insurance_agency:     'Insurance',
  post_office:          'Post Office',
  real_estate_agency:   'Real Estate',

  // Transport
  airport:              'Airport',
  bus_station:          'Bus Station',
  light_rail_station:   'Light Rail',
  subway_station:       'Subway Station',
  taxi_stand:           'Taxi',
  train_station:        'Train Station',
  transit_station:      'Transit Station',

  // Education & culture
  art_gallery:          'Art Gallery',
  library:              'Library',
  museum:               'Museum',
  primary_school:       'Primary School',
  school:               'School',
  secondary_school:     'Secondary School',
  university:           'University',

  // Outdoor & leisure
  amusement_park:       'Amusement Park',
  aquarium:             'Aquarium',
  campground:           'Campground',
  lodging:              'Hotel',
  movie_theater:        'Movie Theater',
  park:                 'Park',
  stadium:              'Stadium',
  tourist_attraction:   'Tourist Attraction',
  zoo:                  'Zoo',
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

// ─── Category → place type mapping ───────────────────────────────────────────

/**
 * Returns the Google Places primary type string to use for proximity searches
 * for tasks that belong to `category`.
 *
 * This is the formal mapping layer (KAN-23): because `category.poi` is already
 * stored as a Google Places primary type string, the mapping is an identity
 * pass-through. The function exists as the single place to put any future
 * translation logic (e.g. aliasing, overrides) without touching call sites.
 *
 * Returns null when the category has no location association.
 */
export function resolveCategoryPlaceType(category: Category): string | null {
  return category.poi ?? null;
}

// ─── Place type search ────────────────────────────────────────────────────────

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
  const response = await fetchWithTimeout(PLACES_TEXT_SEARCH_URL, {
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

// ─── Places Autocomplete (KAN-76) ─────────────────────────────────────────────

const PLACES_AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';

/** A single autocomplete suggestion returned by the Places Autocomplete API. */
export interface PlaceAutocompleteSuggestion {
  /** Google Places ID. */
  placeId: string;
  /** Display name of the establishment (e.g. "Nike Store"). */
  name: string;
  /** Formatted secondary address line (e.g. "Oxford Street, London"). */
  address: string;
}

/**
 * Search for establishments matching the user-typed `query` string.
 * Results are optionally biased towards `lat`/`lng` when the device location
 * is available (50 km radius — covers most metro areas).
 *
 * Returns up to 5 establishment suggestions, sorted by relevance.
 * Returns an empty array on API error (search is best-effort).
 *
 * Uses the Places Autocomplete (New) API:
 *   POST https://places.googleapis.com/v1/places:autocomplete
 */
export async function searchPlacesAutocomplete(
  query: string,
  lat?: number,
  lng?: number,
): Promise<PlaceAutocompleteSuggestion[]> {
  if (!query.trim()) { return []; }

  const body: Record<string, unknown> = {
    input:                query,
    includedPrimaryTypes: ['establishment'],
  };

  if (lat != null && lng != null) {
    body.locationBias = {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: 50_000,
      },
    };
  }

  interface AutocompleteResponse {
    suggestions?: Array<{
      placePrediction?: {
        placeId?: string;
        structuredFormat?: {
          mainText?:      { text?: string };
          secondaryText?: { text?: string };
        };
      };
    }>;
  }

  let data: AutocompleteResponse;
  try {
    const response = await fetchWithTimeout(PLACES_AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-Goog-Api-Key':  GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) { return []; }
    data = (await response.json()) as AutocompleteResponse;
  } catch {
    return [];
  }

  const results: PlaceAutocompleteSuggestion[] = [];
  for (const s of data.suggestions ?? []) {
    const pred = s.placePrediction;
    if (!pred?.placeId) { continue; }
    results.push({
      placeId: pred.placeId,
      name:    pred.structuredFormat?.mainText?.text      ?? pred.placeId,
      address: pred.structuredFormat?.secondaryText?.text ?? '',
    });
    if (results.length >= 5) { break; }
  }
  return results;
}
