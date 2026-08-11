import type { LocaleStrings } from './types';
import { ru } from './ru';
import { en } from './en';

const locales: Record<'ru' | 'en', LocaleStrings> = { ru, en };

export function getLocale(lang: 'ru' | 'en'): LocaleStrings {
  return locales[lang];
}
