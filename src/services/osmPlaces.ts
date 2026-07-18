/**
 * osmPlaces.ts — OpenStreetMap / Overpass API integration (KAN-228).
 *
 * Google Places' ToS forbids long-term caching of place coordinates (place
 * IDs only) — see maps.ts for the online live path (autocomplete, pinning,
 * live search), which stays on Google. This file is the OSM-backed source
 * for the offline habitat cache (habitatCache.ts): OpenStreetMap data is
 * ODbL-licensed and safe to persist on-device (attribution shown in
 * SettingsScreen).
 *
 * API reference: https://wiki.openstreetmap.org/wiki/Overpass_API
 *
 * v1 scope: queries `node` elements only (not ways/relations). Most POI
 * types this app cares about (pharmacy, cafe, bank, ATM, ...) are mapped as
 * nodes in OSM in practice — adding way/relation "center" handling can be a
 * later enhancement if node coverage proves insufficient.
 */

import type { PoiType } from '../types';
import { POI_OSM_TAGS, SUPPLEMENTARY_OSM_TAGS } from '../types';
import { getDistanceMeters, placeTypeLabel } from './maps';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OsmPlace {
  /** OSM element id (use for cross-source identity resolution, never as a display value). */
  osmId: string;
  /** Human-readable place name — falls back to the POI type label if OSM has no name tag. */
  name: string;
  /**
   * True when `name` is the generic tag-value fallback (OSM had no `name`
   * tag), not a real identifying name. habitatCache's identity matching
   * treats generic names as much weaker match evidence — see its docs.
   */
  isGenericName: boolean;
  lat: number;
  lng: number;
  /** Straight-line distance from the search origin in metres. */
  distanceMeters: number;
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

// ─── Fetch with timeout ────────────────────────────────────────────────────────
// Mirrors maps.ts's fetchWithTimeout — not shared across files since it's a
// 5-line wrapper, not worth a cross-file dependency for.

const FETCH_TIMEOUT_MS = 8_000;

// Overpass's usage policy asks every client to identify itself — unlabeled
// traffic risks being rate-limited or blocked. https://wiki.openstreetmap.org/wiki/Overpass_API#Rules
const USER_AGENT = `BrushApp/${require('../../package.json').version}`;

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

// ─── Overpass API — Nearby Search ─────────────────────────────────────────────

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Search OpenStreetMap for places of all given POI types within
 * `radiusMeters` of `lat`/`lng`, in a single Overpass API call.
 *
 * `poiTypes` accepts our internal PoiType keys (mapped via POI_OSM_TAGS).
 * Unrecognized keys (no OSM tag mapping) are silently skipped.
 *
 * Returns a map keyed by the original poiType, each entry sorted ascending
 * by straight-line distance.
 *
 * Never throws — network error, timeout (8 s by default), or a non-200/
 * malformed response all resolve to an empty result, since this must never
 * block the app (same contract as searchNearbyPlaces).
 *
 * `timeoutMs` defaults to the opportunistic-refresh case's 8s (unchanged
 * behavior). KAN-234's trip downloads pass a longer value — a 40km/16+ type
 * combined query is a meaningfully bigger request than anything the default
 * opportunistic 5km refresh has ever needed to handle, and unlike that
 * silent background refresh, a trip download is a foreground, visible,
 * retryable user action, so it can afford to wait longer before giving up.
 */
export async function searchOsmPlaces(
  lat: number,
  lng: number,
  poiTypes: string[],
  radiusMeters: number,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Record<string, OsmPlace[]>> {
  try {
    return await fetchOsmPlaces(lat, lng, poiTypes, radiusMeters, timeoutMs);
  } catch {
    const result: Record<string, OsmPlace[]> = {};
    for (const poiType of poiTypes) { result[poiType] = []; }
    return result;
  }
}

/**
 * Same query as searchOsmPlaces, but throws on timeout/network error/non-200
 * instead of collapsing failure into an empty result (KAN-234). Trip
 * downloads are a foreground, user-initiated, visible-progress action —
 * unlike the silent opportunistic refresh, a failed download must surface as
 * an error/retry, not look identical to "this area genuinely has no POIs".
 */
export async function searchOsmPlacesStrict(
  lat: number,
  lng: number,
  poiTypes: string[],
  radiusMeters: number,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Record<string, OsmPlace[]>> {
  return fetchOsmPlaces(lat, lng, poiTypes, radiusMeters, timeoutMs);
}

async function fetchOsmPlaces(
  lat: number,
  lng: number,
  poiTypes: string[],
  radiusMeters: number,
  timeoutMs: number,
): Promise<Record<string, OsmPlace[]>> {
  const result: Record<string, OsmPlace[]> = {};
  for (const poiType of poiTypes) { result[poiType] = []; }
  if (poiTypes.length === 0) { return result; }

  // Build one node[...] clause per recognized type; skip anything without an
  // OSM tag mapping (e.g. arbitrary custom-category Google Places strings).
  const tagByType: Record<string, { key: string; value: string }> = {};
  const clauses: string[] = [];
  for (const poiType of poiTypes) {
    const tag = POI_OSM_TAGS[poiType as PoiType] ?? SUPPLEMENTARY_OSM_TAGS[poiType];
    if (!tag) { continue; }
    tagByType[poiType] = tag;
    clauses.push(`node["${tag.key}"="${tag.value}"](around:${radiusMeters},${lat},${lng});`);
  }
  if (clauses.length === 0) { return result; }

  const query = `[out:json][timeout:25];(${clauses.join('')});out;`;

  const response = await fetchWithTimeout(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent':   USER_AGENT,
    },
    body: `data=${encodeURIComponent(query)}`,
  }, timeoutMs);
  if (!response.ok) { throw new Error(`Overpass request failed: ${response.status}`); }
  const data = (await response.json()) as OverpassResponse;

  for (const el of data.elements ?? []) {
    if (el.lat == null || el.lon == null || !el.tags) { continue; }

    // Assign to the first requested type whose tag matches this element.
    for (const poiType of poiTypes) {
      const tag = tagByType[poiType];
      if (!tag || el.tags[tag.key] !== tag.value) { continue; }

      result[poiType].push({
        osmId:          `${el.type}/${el.id}`,
        // Raw OSM tag values are lowercase, underscore-separated keys (e.g.
        // "atm") — route the no-name fallback through the same label helper
        // every other POI-type display uses, instead of leaking the tag.
        name:           el.tags.name ?? placeTypeLabel(poiType),
        isGenericName:  el.tags.name == null,
        lat:            el.lat,
        lng:            el.lon,
        distanceMeters: getDistanceMeters(lat, lng, el.lat, el.lon),
      });
      break;
    }
  }

  for (const poiType of poiTypes) {
    result[poiType].sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  return result;
}
