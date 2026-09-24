import * as Location from 'expo-location';
import { doc, getDoc, getFirestore, setDoc } from '@react-native-firebase/firestore';
import { cloudflarePlaceNameLanguages, type PlaceNameLanguagesResponse } from './cloudflarePoiFunctions';
import { getCurrentPosition, getLastKnownPosition } from './geolocation';
import { getLastSearchCoords } from './proximity';

const POSITION_TIMEOUT_MS = 8_000;

/** Resolve settings against the current country, then the last known one. */
export async function resolvePlaceNameCountry(uid: string): Promise<PlaceNameLanguagesResponse> {
  const userRef = doc(getFirestore(), 'users', uid);
  let saved: PlaceNameLanguagesResponse = { countryCode: null, languages: [] };
  try {
    const data = (await getDoc(userRef)).data();
    if (typeof data?.placeNameLastCountryCode === 'string' && /^[A-Z]{2}$/.test(data.placeNameLastCountryCode)) {
      saved = {
        countryCode: data.placeNameLastCountryCode,
        languages: Array.isArray(data.placeNameLastLanguages)
          ? data.placeNameLastLanguages.filter((value: unknown): value is string => typeof value === 'string') : [],
      };
    }
  } catch { /* Offline or signed out: use the location path if available. */ }

  let position = null;
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.granted) {
      position = await Promise.race([
        getCurrentPosition(),
        new Promise<null>(resolve => setTimeout(() => resolve(null), POSITION_TIMEOUT_MS)),
      ]).catch(() => null);
    }
  } catch { /* A denied or unavailable permission is an ordinary fallback. */ }
  position ??= await getLastKnownPosition(Number.MAX_SAFE_INTEGER);
  position ??= getLastSearchCoords();

  if (!position) return saved;
  try {
    const resolved = await cloudflarePlaceNameLanguages({ lat: position.lat, lng: position.lng });
    if (!resolved.countryCode) return saved;
    const result = { countryCode: resolved.countryCode, languages: [...new Set(resolved.languages)].sort() };
    await setDoc(userRef, {
      placeNameLastCountryCode: result.countryCode,
      placeNameLastLanguages: result.languages,
    }, { merge: true }).catch(() => {});
    return result;
  } catch {
    return saved;
  }
}
