import { getDoc, getDocs, setDoc } from '@react-native-firebase/firestore';
import { POI_GEOFENCE_RADIUS } from '../../types';
import type { PoiPreference } from '../../types';
import { poisRef, poiRef } from './refs';

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
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    throw new Error(`setPoiPreference: radiusMeters must be a finite positive number, got ${radiusMeters}`);
  }
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
