import { rawDeviceLocale } from './deviceLocale';

/** Select only a source-supplied translation; never infer a language from spelling. */
export function selectPoiName(
  name: string,
  nameLocal?: string | null,
  nameEn?: string | null,
  nameLocalLang?: string | null,
  locale: string = rawDeviceLocale(),
): string {
  const language = locale.toLowerCase().split(/[-_]/)[0];
  if (language === 'en') return nameEn || name;
  if (nameLocalLang?.toLowerCase() === language && nameLocal) return nameLocal;
  return nameEn || name;
}
