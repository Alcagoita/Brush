/**
 * mallRoute.ts — KAN-282 "Mall/single-venue option for 'One trip for all of
 * these'".
 *
 * Adds an optional "All in one place" card to the Itinerary Options screen:
 * when a genuine destination shopping mall is within range, offer it as a
 * single-stop alternative to the stop-by-stop route. Opportunistic, never
 * hunted — it only reads data already on hand (the user's mall snapshot and
 * the offline habitat cache), never triggers a search of its own. No
 * qualifying mall is a normal outcome: findMallOption returns null and the
 * screen shows only the stop-by-stop card.
 *
 * WHAT COUNTS AS A MALL (2026-07-19, decided with Olegário after a long
 * detour — see git history / Jira for the dead ends). Two things had to be
 * true and neither was reachable through Google Places:
 *
 *   1. It must be a REAL mall, not a store mistagged as one. Google's Nearby
 *      Search routinely returned individual shops carrying `shopping_mall`
 *      as a type, with no geometry to tell them apart, and was capped at 20
 *      results so a real distant mall could be crowded out entirely. OSM's
 *      `shop=mall` tag doesn't have this problem: a real mall is a `way` or
 *      `relation` (a mapped building footprint); a store or a tiny gallery
 *      is a bare `node` (a point) or a small footprint. So mall discovery is
 *      OSM-only now — Google is out of it entirely. The habitat cache
 *      (populated by proximity's background OSM refresh and trip-area
 *      downloads) is the source, and it works offline by construction.
 *   2. It must be BIG enough to be worth the trip. No API exposes a store
 *      count, but the OSM footprint area is a factual, free proxy: a Lisbon
 *      sample showed every famous destination mall (Colombo 117k m², Almada
 *      Forum 89k, Amoreiras 36k, Vasco da Gama 26k) sits well above the
 *      neighborhood galleries (mostly < 15k, down to sub-1k). A candidate
 *      qualifies only if its footprint area >= MALL_MIN_FOOTPRINT_M2. Bare
 *      nodes (no footprint) fail this automatically — the size gate subsumes
 *      the node-vs-footprint distinction, no separate check needed.
 *
 * The user's own mall snapshot (KAN-237 — a mall they explicitly downloaded)
 * is exempt from the size gate: they already vouched for it.
 *
 * Among qualifying candidates, the closest wins. Copy built from a
 * MallOption states only name + distance — never a store count (unknowable)
 * or "biggest"/"largest" (not claimed).
 */

import { getDistanceMeters } from './maps';
import { queryHabitatCache } from './habitatCache';
import { ROUTE_MAX_RADIUS_M } from './destinationResolver';
import type { MallSnapshot } from '../types';
import type { TripStop } from './oneTripForAll';

/** Minimum OSM building-footprint area (m²) for a cached mall to qualify as
 *  a destination worth the trip — calibrated against a real Lisbon sample
 *  (every famous mall sits well above this; neighborhood galleries below).
 *  The user's own downloaded snapshot is exempt (see header). */
const MALL_MIN_FOOTPRINT_M2 = 25_000;

/** How close two candidates must be to be treated as the same physical mall
 *  (dedup) — mall-footprint scale, not the whole trip's search radius. */
const MALL_DEDUP_RADIUS_M = 250;

/** Generic words stripped before comparing mall names for the duplicate-
 *  merge heuristic — without this, "Colombo Shopping Center" and "Galeria
 *  Uruguai" would share nothing, but so would two genuinely different malls
 *  that both happen to be a "Shopping Center". Only a shared MEANINGFUL word
 *  (the actual proper name) counts as a match. */
const MALL_NAME_STOPWORDS = new Set([
  'shopping', 'center', 'centre', 'centro', 'comercial', 'mall', 'galeria', 'the', 'de', 'do', 'da', 'of',
]);

export interface MallOption {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
}

interface MallCandidate {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  footprintAreaM2?: number;
  /** True for the user's own downloaded snapshot — exempt from the size gate. */
  userPinned: boolean;
}

/** A candidate qualifies if the user explicitly downloaded it (snapshot), or
 *  its OSM footprint is at least MALL_MIN_FOOTPRINT_M2 (a real destination
 *  mall, not a neighborhood gallery or a bare-node mistag). */
function qualifies(c: MallCandidate): boolean {
  return c.userPinned || (c.footprintAreaM2 ?? 0) >= MALL_MIN_FOOTPRINT_M2;
}

/** Strips generic mall-naming words/punctuation down to the meaningful
 *  proper-name tokens, for the duplicate-merge heuristic below. */
function meaningfulNameWords(name: string): string[] {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !MALL_NAME_STOPWORDS.has(w));
}

/** Two candidates are treated as the SAME physical mall (e.g. the same mall
 *  cached under both a `way` and a `relation` OSM id) when they sit within
 *  MALL_DEDUP_RADIUS_M of each other AND share at least one meaningful name
 *  word. Distance alone would wrongly merge two unrelated neighbors; name
 *  alone would wrongly merge two branches of a chain across town. */
function isSameMall(a: MallCandidate, b: MallCandidate): boolean {
  if (getDistanceMeters(a.lat, a.lng, b.lat, b.lng) > MALL_DEDUP_RADIUS_M) { return false; }
  const wordsA = meaningfulNameWords(a.name);
  const wordsB = meaningfulNameWords(b.name);
  return wordsA.some(w => wordsB.includes(w));
}

/** Collapses near-duplicate entries for the same physical mall into one,
 *  keeping the nearest-to-user entry of each group as canonical (and the
 *  largest known footprint, so the size gate sees the best evidence). */
function mergeDuplicateMalls(candidates: MallCandidate[]): MallCandidate[] {
  const groups: MallCandidate[][] = [];
  for (const candidate of candidates) {
    const group = groups.find(g => g.some(existing => isSameMall(existing, candidate)));
    if (group) { group.push(candidate); } else { groups.push([candidate]); }
  }
  return groups.map(group => {
    const canonical = group.reduce((nearest, c) => c.distanceMeters < nearest.distanceMeters ? c : nearest);
    const maxArea = Math.max(...group.map(c => c.footprintAreaM2 ?? 0));
    return { ...canonical, footprintAreaM2: maxArea > 0 ? maxArea : canonical.footprintAreaM2, userPinned: group.some(c => c.userPinned) };
  });
}

function collectCandidates(
  coords: { lat: number; lng: number },
  mallSnapshot: MallSnapshot | null,
): MallCandidate[] {
  const candidates: MallCandidate[] = [];

  if (mallSnapshot) {
    const distanceToMall = getDistanceMeters(coords.lat, coords.lng, mallSnapshot.centerLat, mallSnapshot.centerLng);
    if (distanceToMall <= ROUTE_MAX_RADIUS_M) {
      candidates.push({
        placeId: mallSnapshot.placeId, name: mallSnapshot.name,
        lat: mallSnapshot.centerLat, lng: mallSnapshot.centerLng,
        distanceMeters: distanceToMall, userPinned: true,
      });
    }
  }

  const cachedMalls = queryHabitatCache(coords.lat, coords.lng, ['shopping_mall'], ROUTE_MAX_RADIUS_M).shopping_mall ?? [];
  candidates.push(...cachedMalls.map(c => ({
    placeId: c.placeId, name: c.name, lat: c.lat, lng: c.lng,
    distanceMeters: c.distanceMeters, footprintAreaM2: c.footprintAreaM2, userPinned: false,
  })));

  // Same physical mall from more than one source — dedupe by placeId, then
  // merge same-named neighbors (e.g. one mall cached under two OSM ids).
  const seen = new Set<string>();
  const deduped = candidates.filter(c => {
    if (seen.has(c.placeId)) { return false; }
    seen.add(c.placeId);
    return true;
  });

  return mergeDuplicateMalls(deduped);
}

/**
 * The closest qualifying mall within range, or null if none qualifies.
 * Qualifying = the user's own snapshot, or a cached OSM mall whose footprint
 * clears MALL_MIN_FOOTPRINT_M2 (see header). Requires the trip to have >= 2
 * tasks. No network, no per-candidate work — pure reads over data already
 * on hand.
 */
export function findMallOption(
  coords: { lat: number; lng: number },
  stops: TripStop[],
  mallSnapshot: MallSnapshot | null,
): MallOption | null {
  if (stops.length < 2) { return null; }

  const qualifying = collectCandidates(coords, mallSnapshot).filter(qualifies);
  if (qualifying.length === 0) { return null; }

  const nearest = qualifying.reduce((a, b) => a.distanceMeters < b.distanceMeters ? a : b);
  return { placeId: nearest.placeId, name: nearest.name, lat: nearest.lat, lng: nearest.lng, distanceMeters: nearest.distanceMeters };
}
