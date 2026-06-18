import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from '@/locales/zh-CN.json';
import en from '@/locales/en.json';

export const SUPPORTED_LOCALES = ['zh-CN', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const STORAGE_KEY = 'resume-assistant:lang';

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'zh-CN';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved && (SUPPORTED_LOCALES as readonly string[]).includes(saved)) return saved as Locale;
  const nav = navigator.language || 'zh-CN';
  return nav.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    en: { translation: en },
  },
  lng: getInitialLocale(),
  fallbackLng: 'zh-CN',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function setLocale(locale: Locale): void {
  void i18n.changeLanguage(locale);
  window.localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale === 'zh-CN' ? 'zh-CN' : 'en';
}

export default i18n;
