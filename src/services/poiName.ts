/**
 * Which name a place shows.
 *
 * A place has one name per language of its country (KAN-474). For Portugal
 * that is two choices, not one:
 *
 *   'source'  what the source called it — mostly Portuguese, English for ~1%
 *   'native'  the country's own language: `name_local` where we recorded one,
 *             else the source name, which already is Portuguese
 *
 * A country with two native languages (Canada) offers one choice per
 * language instead of the single 'native', because "the country's language"
 * does not name one of them.
 *
 * Nothing here translates. A choice with no recorded name falls back to the
 * source name rather than inventing one.
 */
export type PlaceNameChoice = 'native' | 'source' | string;
export type PlaceNameChoices = Record<string, PlaceNameChoice>;

/** Shown as the source supplied it. */
export const SOURCE_CHOICE = 'source';
/** Shown in the country's own language. */
export const NATIVE_CHOICE = 'native';

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

/**
 * The choices to offer for a country, in order.
 *
 * One language: the country's name, or the source's. Two or more: the source,
 * then one per language — 'native' would not say which of them.
 */
export function placeNameOptions(languages: string[]): string[] {
  const distinct = [...new Set(languages.filter(code => code && code.trim()))];
  if (distinct.length <= 1) return [NATIVE_CHOICE, SOURCE_CHOICE];
  return [SOURCE_CHOICE, ...distinct];
}

/** No translation is generated: absent variants fall back to the source name. */
export function selectPoiName(
  name: string,
  names: Record<string, string> | null | undefined,
  countryCode: string | null | undefined,
  preference: PlaceNameChoices = choices,
  legacyEnglish?: string | null,
  localName?: string | null,
  localLang?: string | null,
): string {
  const variants = names ?? {};
  const nonBlank = (value?: string | null) => value?.trim() || null;
  if (!countryCode) return nonBlank(variants.en) || nonBlank(legacyEnglish) || name;
  const selected = preference[countryCode.toUpperCase()] ?? NATIVE_CHOICE;
  // The source's own name, declared rather than reached by falling through
  // every other branch.
  if (selected === SOURCE_CHOICE) return name;
  if (selected === NATIVE_CHOICE) return nonBlank(localName) || name;
  // A language chosen by name. `name_local` already is one of the country's
  // languages and says which, so asking for that language gets it.
  if (localLang && selected.toLowerCase() === localLang.toLowerCase()) {
    return nonBlank(localName) || name;
  }
  return nonBlank(variants[selected]) || (selected === 'en' && nonBlank(legacyEnglish)) || name;
}

export function displayPlaceName(place: {
  name: string; nameOriginal?: string; names?: Record<string, string> | null;
  countryCode?: string | null; nameEn?: string | null; nameLocal?: string | null;
  nameLocalLang?: string | null;
}): string {
  return selectPoiName(place.nameOriginal ?? place.name, place.names, place.countryCode,
    choices, place.nameEn, place.nameLocal, place.nameLocalLang);
}
