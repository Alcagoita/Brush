/**
 * placeIdentity.ts — which source a place id belongs to (KAN-451).
 *
 * Every place the app holds offline is anchored by the id of the source that
 * produced it, and the sources are not interchangeable: an OSM element id, an
 * Overture GERS id, a Foursquare id and one of our own registry ids live in
 * different namespaces and carry different licence terms (ODbL, CDLA-Permissive
 * 2.0, Apache 2.0, ours). A column that lies about origin cannot be audited
 * against any of them, and cross-source dedupe stops working the moment two
 * sources share a column.
 *
 * Before this file, three call sites (proximity.ts, habitatCache.ts's
 * prefetch, cloudflareTripExport.ts) each decided the source with the same
 * expression — `tickSource === 'osm' ? { osm } : { fsq }` — and every row our
 * API returned was recorded as Foursquare, long after KAN-438 replaced
 * Foursquare with Overture. The Worker names each row's source on the wire
 * (`source` on every /poi/nearby row); this is the one place that turns it
 * into an identity ref. A new source is one line here, not three edits.
 */
import type { PoiSearchSource } from './maps';

/**
 * The origin of one row as the POI API reports it. Mirrors the Worker's
 * `NearbyPoi.source` (cloudflare/src/index.ts).
 *
 * The registry's rule (KAN-433): Overture is the base, and every place that
 * is not Overture — mall tenants, moderator entries, whatever KAN-433
 * recovers from the Foursquare archive — is a curated record of ours
 * (`community` / `manual`). No new rows are keyed on an OSM or Foursquare id.
 * `openstreetmap` and `legacy` remain on the wire type so an unexpected row
 * is still filed honestly, not because either is expected to arrive.
 */
export type PoiRecordSource = 'overture' | 'community' | 'manual' | 'openstreetmap' | 'multibanco' | 'legacy';

/**
 * One source-specific id, keyed by namespace. Exactly one key is set by
 * anything written today; `google` survives only because rows cached before
 * KAN-342 may carry one and the type still has to describe them.
 *
 * - `overture` — an Overture GERS id: the registry's base since KAN-438.
 * - `brush`    — a curated record our own registry owns: mall tenants,
 *                moderator entries, the Multibanco import, and anything
 *                KAN-433 recovers. Everything served that is not Overture.
 * - `osm`      — an OSM element id from the app's own Overpass fallback,
 *                the only path that still hands the app raw OSM rows.
 * - `fsq`      — a Foursquare id on a row cached before KAN-438; not written
 *                by any live path unless the API ever serves a `legacy` row.
 */
export interface PlaceSourceRef {
  osm?: string;
  overture?: string;
  fsq?: string;
  brush?: string;
  google?: string;
}

/**
 * The identity ref for a place returned by `searchNearbyPlaces`.
 *
 * `tickSource` says which chain answered; `recordSource` (when the answer
 * was our API) says which table the row came from. An API row without a
 * source — an older Worker, or a test fixture — is Overture, the API's
 * primary source; the wrong-but-safe default is never Foursquare again.
 */
export function placeSourceRef(
  placeId: string,
  tickSource: PoiSearchSource,
  recordSource?: PoiRecordSource,
): PlaceSourceRef {
  if (tickSource === 'osm') return { osm: placeId };
  switch (recordSource) {
    case 'openstreetmap': return { osm: placeId };
    case 'legacy': return { fsq: placeId };
    case 'community':
    case 'manual':
    case 'multibanco': return { brush: placeId };
    case 'overture':
    default: return { overture: placeId };
  }
}

/**
 * Whether a ref may create a row or move its coordinates. Everything but
 * Google is freely storable — ODbL, CDLA-Permissive, Apache 2.0 and our own
 * records all permit caching coordinates indefinitely; Google's terms do not,
 * which is the whole reason this gate exists (see habitatCache.upsertPlaceCore).
 */
export function isFreelyStorable(ref: PlaceSourceRef): boolean {
  return ref.osm != null || ref.overture != null || ref.fsq != null || ref.brush != null;
}
