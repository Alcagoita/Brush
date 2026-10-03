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
 * A country with two native languages (Canada) offers those languages as
 * well, so a user can ask for one by name. 'native' is still offered and
 * still means `name_local` — `name_local_lang` records which language that
 * is — and it stays the default, so a user who has chosen nothing always has
 * a selected option that matches what they are shown.
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
 * Always the country's name and the source's. A country with two or more
 * native languages adds one choice per language, so a user can ask for one
 * by name.
 *
 * 'native' is deliberately offered everywhere, not only where there is a
 * single language: it is `selectPoiName`'s default, so leaving it out of a
 * two-language country's list would mean a user who has chosen nothing has
 * no option selected and a Settings row labelled with something the picker
 * never offered.
 */
export function placeNameOptions(languages: string[]): string[] {
  const distinct = [...new Set(languages.filter(code => code && code.trim()))];
  const extra = distinct.length > 1 ? distinct : [];
  return [NATIVE_CHOICE, SOURCE_CHOICE, ...extra];
}

/**
 * What is shown when the user has chosen nothing. Always an option
 * `placeNameOptions` offers, which is what keeps the Settings row and the
 * picker's selection honest.
 */
export function defaultPlaceNameChoice(): string {
  return NATIVE_CHOICE;
}

/** No translation is generated: absent variants fall back to the source name. */
export function selectPoiName(
  name: string,
  names: Record<string, string> | null | undefined,
  countryCode: string | null | undefined,
  preference: PlaceNameChoices = choices,
  localName?: string | null,
  localLang?: string | null,
): string {
  const variants = names ?? {};
  const nonBlank = (value?: string | null) => value?.trim() || null;
  if (!countryCode) return nonBlank(variants.en) || name;
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
  return nonBlank(variants[selected]) || name;
}

export function displayPlaceName(place: {
  name: string; nameOriginal?: string; names?: Record<string, string> | null;
  countryCode?: string | null; nameLocal?: string | null;
  nameLocalLang?: string | null;
}): string {
  return selectPoiName(place.nameOriginal ?? place.name, place.names, place.countryCode,
    choices, place.nameLocal, place.nameLocalLang);
}
