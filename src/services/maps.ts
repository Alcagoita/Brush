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
