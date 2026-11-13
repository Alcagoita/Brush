/**
 * A row's explicitly tagged names by language, from its `names_json` column.
 * Anything that isn't a plain `{languageTag: non-empty string}` is dropped.
 * Shared by `/poi/nearby` and the venue inventory (KAN-382).
 */
export function parseSourceNames(value: string | null): Record<string, string> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([code, name]) =>
      /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(code) && typeof name === 'string' && name.trim(),
    )) as Record<string, string>;
  } catch {
    return {};
  }
}
