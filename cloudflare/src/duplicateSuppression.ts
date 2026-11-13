import { haversineMeters } from './geohash';
import { normalizePoiName } from './manualPoi';

/** Two rows this close, sharing a name, are one place held twice. */
export const MANUAL_POI_DUPLICATE_DISTANCE_METERS = 20;

/** What the read-time twin rule needs from a candidate, whichever query built it. */
export interface SuppressibleCandidate {
  source?: string;
  lat: number;
  lng: number;
  dedupeName: string;
  name_local?: string | null;
  names?: Record<string, string>;
  primary_poi_type: string;
  demoZone: boolean;
}

/**
 * Two sources can hold the same shop at coordinates a few metres apart.
 * Suppress the twin at read time so the user never sees one shop twice.
 *
 * Least authoritative first, so each source is suppressed by everything
 * above it. Overture is the national base and curated mall tenants remain
 * authoritative for a building and its floor. `legacy_poi` left this list
 * at KAN-454 (empty since KAN-438, no longer read); `osm_poi` never joined
 * it (KAN-442). Both tables still exist; nearby reads neither.
 *
 * The rule itself is unchanged and must stay: it matches on `dedupeName`
 * plus proximity, never on source ids. An id identifies a row for a
 * correction; it never decides which of two places a user sees.
 *
 * Shared by `/poi/nearby` and the venue inventory (KAN-382) so a centre's
 * inventory and a nearby search at the same spot give the same answer.
 * Mutates `candidates` in place.
 */
export function suppressDuplicates<T extends SuppressibleCandidate>(candidates: Map<string, T>): void {
  const SUPPRESSION_ORDER = ['overture', 'community'] as const;

  // Odivelas rollout: official MULTIBANCO ATMs take precedence at the same
  // physical location. The lower-priority source remains stored for audit.
  const officialDemoAtms = [...candidates.values()].filter(candidate =>
    candidate.source === 'multibanco' && candidate.demoZone && candidate.primary_poi_type === 'atm');
  for (const [key, candidate] of candidates) {
    if (candidate.source === 'multibanco' || candidate.primary_poi_type !== 'atm') continue;
    if (officialDemoAtms.some(official =>
      haversineMeters(official.lat, official.lng, candidate.lat, candidate.lng) <= MANUAL_POI_DUPLICATE_DISTANCE_METERS)) {
      candidates.delete(key);
    }
  }

  const bySource = new Map<string, T[]>();
  for (const candidate of candidates.values()) {
    const list = bySource.get(candidate.source ?? '') ?? [];
    list.push(candidate);
    bySource.set(candidate.source ?? '', list);
  }

  for (const [key, candidate] of candidates) {
    const rank = SUPPRESSION_ORDER.indexOf(candidate.source as typeof SUPPRESSION_ORDER[number]);
    if (rank < 0) continue;
    const suppressors = SUPPRESSION_ORDER.slice(rank + 1)
      .flatMap(source => bySource.get(source) ?? []);
    if (suppressors.some(primary => {
      if (haversineMeters(primary.lat, primary.lng, candidate.lat, candidate.lng) > MANUAL_POI_DUPLICATE_DISTANCE_METERS) return false;
      const names = new Set([candidate.dedupeName, candidate.name_local]
        .concat(Object.values(candidate.names ?? {}))
        .filter((name): name is string => !!name).map(normalizePoiName));
      return [primary.dedupeName, primary.name_local, ...Object.values(primary.names ?? {})]
        .filter((name): name is string => !!name).some(name => names.has(normalizePoiName(name)));
    })) {
      candidates.delete(key);
    }
  }
}
