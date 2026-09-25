import { cloudflarePlaceNameLanguages, type PlaceNameLanguagesResponse } from './cloudflarePoiFunctions';
import { getCurrentPositionIfPermitted, getLastKnownPosition } from './geolocation';
import { getPlaceNameCountry, savePlaceNameCountry } from './firestore/users';

/** Resolve settings against the current country, then the last known one. */
export async function resolvePlaceNameCountry(uid: string): Promise<PlaceNameLanguagesResponse> {
  const saved = await getPlaceNameCountry(uid).catch(() => ({ countryCode: null, languages: [] }));

  let position = await getCurrentPositionIfPermitted();
  position ??= await getLastKnownPosition(Number.MAX_SAFE_INTEGER);

  if (!position) return saved;
  try {
    const resolved = await cloudflarePlaceNameLanguages({ lat: position.lat, lng: position.lng });
    if (!resolved.countryCode) return saved;
    const result = { countryCode: resolved.countryCode, languages: [...new Set(resolved.languages)].sort() };
    await savePlaceNameCountry(uid, result).catch(() => {});
    return result;
  } catch {
    return saved;
  }
}
