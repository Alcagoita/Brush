import { getDoc, getDocs, setDoc, onSnapshot } from '@react-native-firebase/firestore';
import { POI_GEOFENCE_RADIUS } from '../../types';
import type { PoiPreference } from '../../types';
import { poisRef, poiRef } from './refs';

/**
 * Subscribe to live updates for all of the user's POI geofence radius
 * preferences. Fires immediately with the current stored values, then again
 * whenever any preference is created, updated, or deleted.
 *
 * `onUpdate` receives a plain `Record<string, number>` map of
 * `poiType → radiusMeters` containing ONLY the types that the user has
 * explicitly saved. Callers should fall back to `POI_GEOFENCE_RADIUS` (and
 * then to `DEFAULT_GEOFENCE_RADIUS`) for any type not present in the map.
 *
 * Returns an unsubscribe function — call it on component unmount.
 */
export function subscribeToPoiPreferences(
  uid: string,
  onUpdate: (prefs: Record<string, number>) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    poisRef(uid),
    snap => {
      if (!snap) return;
      const prefs: Record<string, number> = {};
      for (const d of snap.docs) {
        const pref = d.data() as PoiPreference;
        prefs[pref.type] = pref.radiusMeters;
      }
      onUpdate(prefs);
    },
    onError,
  );
}

/**
 * Fetch a user's geofence radius preference for a POI type.
 * Accepts any Google Places primary type string (built-in or custom).
 * Falls back to the spec default for built-in types; custom types that have
 * no saved preference return a 75 m default.
 */
export async function getPoiPreference(
  uid: string,
  poiType: string,
): Promise<PoiPreference> {
  const snap = await getDoc(poiRef(uid, poiType));
  if (snap.exists()) {
    return snap.data() as PoiPreference;
  }
  const defaultRadius = (POI_GEOFENCE_RADIUS as Record<string, number>)[poiType] ?? 75;
  return { type: poiType, radiusMeters: defaultRadius };
}

/**
 * Persist a user's geofence radius preference for a POI type.
 * Accepts any Google Places primary type string (built-in or custom).
 */
export async function setPoiPreference(
  uid: string,
  poiType: string,
  radiusMeters: number,
): Promise<void> {
  await setDoc(poiRef(uid, poiType), { type: poiType, radiusMeters });
}

/**
 * Fetch all saved POI preferences for a user as a flat map.
 * Returns a `Record<string, number>` (type → radiusMeters) containing ONLY
 * the preferences that have been explicitly stored — callers must apply their
 * own fallback for missing types.
 */
export async function getPoiPreferencesMap(
  uid: string,
): Promise<Record<string, number>> {
  const snap = await getDocs(poisRef(uid));
  const map: Record<string, number> = {};
  for (const d of snap.docs) {
    const pref = d.data() as PoiPreference;
    map[pref.type] = pref.radiusMeters;
  }
  return map;
}
