import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import pt from './locales/pt.json'
import en from './locales/en.json'

// Internacionalização: textos da UI vêm de pt.json / en.json (nada chumbado).
// O detector escolhe o idioma inicial (navegador/localStorage); o fallback é PT.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
    },
    fallbackLng: 'pt',
    interpolation: { escapeValue: false }, // React já escapa
  })

export default i18n
