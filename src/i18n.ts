import i18n, { type BackendModule } from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

export const LANGUAGES = [
  { code: 'it', label: 'Italiano' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]['code']

const SUPPORTED: string[] = LANGUAGES.map((l) => l.code)

// Each language is its own chunk, fetched when first used: visitors download one set of strings, not all three.
const lazyLocales: BackendModule = {
  type: 'backend',
  init: () => {},
  read: (language, _namespace, callback) => {
    import(`./locales/${language}/translation.json`).then(
      (module: { default: Record<string, unknown> }) => callback(null, module.default),
      (error: Error) => callback(error, null),
    )
  },
}

/** Resolves once the detected language's strings are loaded. */
export const i18nReady = i18n
  .use(lazyLocales)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // English only for languages we don't have. Every key exists in all three (npm run i18n:check), so Italian and
    // Spanish visitors don't need to download the English strings as a backup.
    fallbackLng: (code: string | undefined) => (code && SUPPORTED.includes(code.split('-')[0]) ? [] : ['en']),
    supportedLngs: SUPPORTED,
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    // Strings are loaded before the first render and before a language switch completes, so nothing needs to suspend.
    react: { useSuspense: false },
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
i18n.on('languageChanged', syncHtmlLang)

export default i18n
