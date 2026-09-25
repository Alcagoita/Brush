export type PlaceNameChoice = 'native' | string;
export type PlaceNameChoices = Record<string, PlaceNameChoice>;

let choices: PlaceNameChoices = {};

/** Updated by the signed-in preference provider; reads stay synchronous offline. */
export function setPlaceNameChoices(next: PlaceNameChoices): void {
  choices = { ...next };
}

export function parsePlaceNames(value: unknown): Record<string, string> {
  if (typeof value === 'string') {
    try { return parsePlaceNames(JSON.parse(value)); } catch { return {}; }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([code, name]) =>
    /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(code) && typeof name === 'string' && name.trim(),
  )) as Record<string, string>;
}

/** No translation is generated: absent variants fall back to English, then the source name. */
export function selectPoiName(
  name: string,
  names: Record<string, string> | null | undefined,
  countryCode: string | null | undefined,
  preference: PlaceNameChoices = choices,
  legacyEnglish?: string | null,
  localName?: string | null,
): string {
  const variants = names ?? {};
  const nonBlank = (value?: string | null) => value?.trim() || null;
  const english = nonBlank(variants.en) || nonBlank(legacyEnglish) || name;
  if (!countryCode) return english;
  const selected = preference[countryCode.toUpperCase()] ?? 'native';
  if (selected === 'native') return nonBlank(localName) || english;
  return nonBlank(variants[selected]) || english;
}

export function displayPlaceName(place: {
  name: string; nameOriginal?: string; names?: Record<string, string> | null;
  countryCode?: string | null; nameEn?: string | null; nameLocal?: string | null;
}): string {
  return selectPoiName(place.nameOriginal ?? place.name, place.names, place.countryCode, choices, place.nameEn, place.nameLocal);
}
