import { en, type Dictionary, type TranslationKey } from './locales/en';
import { zh } from './locales/zh';
import { vi } from './locales/vi';
import { fr } from './locales/fr';
import { es } from './locales/es';
import { pt } from './locales/pt';
import { km } from './locales/km';
import { th } from './locales/th';
import { lo } from './locales/lo';
import { my } from './locales/my';
import { ru } from './locales/ru';
import { id } from './locales/id';
import { ja } from './locales/ja';
import { ko } from './locales/ko';
import { fil } from './locales/fil';
import { ms } from './locales/ms';

export type Language = 'en' | 'zh' | 'vi' | 'fr' | 'es' | 'pt' | 'km' | 'th' | 'lo' | 'my' | 'ru' | 'id' | 'ja' | 'ko' | 'fil' | 'ms';
export const defaultLanguage: Language = 'en';
export const languages: { id: Language; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'zh', name: '中文' },
  { id: 'vi', name: 'Tiếng Việt' },
  { id: 'fr', name: 'Français' },
  { id: 'es', name: 'Español' },
  { id: 'pt', name: 'Português' },
  { id: 'km', name: 'ខ្មែរ' },
  { id: 'th', name: 'ไทย' },
  { id: 'lo', name: 'ລາວ' },
  { id: 'my', name: 'မြန်မာ' },
  { id: 'ru', name: 'Русский' },
  { id: 'id', name: 'Bahasa Indonesia' },
  { id: 'ja', name: '日本語' },
  { id: 'ko', name: '한국어' },
  { id: 'fil', name: 'Filipino' },
  { id: 'ms', name: 'Bahasa Melayu' },
];
export const translations: Record<Language, Dictionary> = { en, zh, vi, fr, es, pt, km, th, lo, my, ru, id, ja, ko, fil, ms };

export function normalizeLanguage(value: unknown): Language {
  return languages.find(language => language.id === value)?.id ?? defaultLanguage;
}

export function translate(language: Language, key: string) {
  return translations[language]?.[key as TranslationKey] ?? en[key as TranslationKey] ?? key;
}

export function directionFor(_language: Language): 'rtl' | 'ltr' {
  return 'ltr';
}

