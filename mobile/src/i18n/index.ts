import { getLocales } from 'expo-localization';
import { useCallback } from 'react';
import { useSettingsStore, type Language } from '../store/settingsStore';
import { en, type TranslationKey, type Translations } from './en';
import { si } from './si';
import { ta } from './ta';

export const SUPPORTED_LANGUAGES: readonly Language[] = ['en', 'si', 'ta'] as const;

const dictionaries: Record<Language, Translations> = { en, si, ta };

export type TranslateParams = Record<string, string | number>;

/** Device language if it is si/ta/en, otherwise English (SPEC §9.1). */
export function detectDeviceLanguage(): Language {
  const code = getLocales()[0]?.languageCode;
  return code === 'si' || code === 'ta' ? code : 'en';
}

export function translate(language: Language, key: TranslationKey, params?: TranslateParams): string {
  let text = dictionaries[language][key];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export function useT() {
  const language = useSettingsStore((s) => s.language) ?? detectDeviceLanguage();
  return useCallback(
    (key: TranslationKey, params?: TranslateParams) => translate(language, key, params),
    [language],
  );
}

export type { Language, TranslationKey };
