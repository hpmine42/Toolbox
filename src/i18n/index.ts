import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import de from './locales/de.json'
import en from './locales/en.json'
import { persistLanguage, resolveInitialLanguage, type AppLanguage } from './language'

export const resources = {
  de: { translation: de },
  en: { translation: en },
} as const

const initialLanguage = resolveInitialLanguage()

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'de',
  supportedLngs: ['de', 'en'],
  load: 'languageOnly',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})

document.documentElement.lang = initialLanguage

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
})

export function setAppLanguage(language: AppLanguage): void {
  persistLanguage(language)
  void i18n.changeLanguage(language)
}

export default i18n
