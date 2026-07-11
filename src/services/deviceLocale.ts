/**
 * deviceLocale.ts — KAN-252
 *
 * Detects the device's system language with zero new native dependencies —
 * reads the same NativeModules RN itself already links for iOS/Android
 * locale info, rather than pulling in expo-localization for a one-shot
 * lookup used only as the signed-out/first-launch default.
 *
 * Brush ships exactly two UI languages: English and Português-Portugal
 * (pt-PT — never pt-BR). Any Portuguese-tagged device locale (pt, pt-BR,
 * pt-PT, ...) maps to our single pt-PT copy; everything else falls back to
 * English.
 */

import { NativeModules, Platform } from 'react-native';
import type { SupportedLanguage } from '../constants/copy';

/**
 * Raw locale identifier string from the platform (e.g. "en_US", "pt-PT",
 * "pt_BR"). Never throws — an unexpected/missing native shape falls back to
 * an empty string, which `detectDeviceLanguage` treats as English.
 */
export function rawDeviceLocale(): string {
  try {
    if (Platform.OS === 'ios') {
      const settings = NativeModules.SettingsManager?.settings;
      return settings?.AppleLocale ?? settings?.AppleLanguages?.[0] ?? '';
    }
    return NativeModules.I18nManager?.localeIdentifier ?? '';
  } catch {
    return '';
  }
}

/** Resolves the device's system language to one of Brush's two supported UI languages. */
export function detectDeviceLanguage(): SupportedLanguage {
  return rawDeviceLocale().toLowerCase().startsWith('pt') ? 'pt-PT' : 'en';
}
