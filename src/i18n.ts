import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import it from './locales/it/translation.json'
import en from './locales/en/translation.json'
import es from './locales/es/translation.json'

export const LANGUAGES = [
  { code: 'it', label: 'Italiano' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]['code']

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      it: { translation: it },
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: 'en',
    supportedLngs: LANGUAGES.map((l) => l.code),
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    detection: {
      // An explicit choice from the header switcher wins over the browser language.
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'roamie.lang',
      caches: ['localStorage'],
    },
  })

const syncHtmlLang = (lng: string) => {
  // No document while prerendering public pages at build time.
  if (typeof document !== 'undefined') document.documentElement.lang = lng.split('-')[0]
}
syncHtmlLang(i18n.resolvedLanguage ?? 'en')
i18n.on('languageChanged', syncHtmlLang)

export default i18n
