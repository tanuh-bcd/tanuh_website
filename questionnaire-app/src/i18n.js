import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
  .use(HttpApi) // Loads translations from /public/locales
  .use(LanguageDetector) // Detects user's language
  .use(initReactI18next) // Passes i18n instance to react-i18next
  .init({
    // Define the namespaces (your JSON filenames)
    ns: ['consent', 'questionnaire', 'thankyou'],
    defaultNS: 'consent',
    
    // --- OPTIMIZATION: Removed preload to reduce startup network requests ---
    // preload: ['english', 'hindi', ...],
    
    fallbackLng: 'english', // Use English if the detected language is missing
    debug: false, // Set to true for console logs

    interpolation: {
      escapeValue: false, // React already protects from XSS
    },

    backend: {
      // Path to your translation files in the 'public' folder
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // Configuration for the language detector
    detection: {
      order: ['queryString', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['cookie', 'localStorage'], // Remember the user's choice
    },
  });

export default i18n;