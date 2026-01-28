import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

// OPTIMIZATION: Import English translations statically to avoid XHR requests on startup.
// This improves initial load performance and reliability.
import consentEn from '../public/locales/english/consent.json' with { type: 'json' };
import questionnaireEn from '../public/locales/english/questionnaire.json' with { type: 'json' };
import thankyouEn from '../public/locales/english/thankyou.json' with { type: 'json' };

i18n
  .use(HttpApi) // Loads translations from /public/locales for other languages
  .use(LanguageDetector) // Detects user's language
  .use(initReactI18next) // Passes i18n instance to react-i18next
  .init({
    // Define the namespaces (your JSON filenames)
    ns: ['consent', 'questionnaire', 'thankyou'],
    defaultNS: 'consent',
    
    // Provide bundled English resources.
    // This avoids fetching these 3 files via network when English is used (default).
    resources: {
      english: {
        consent: consentEn,
        questionnaire: questionnaireEn,
        thankyou: thankyouEn
      }
    },

    // OPTIMIZATION: Removed 'preload' of 10+ languages.
    // Previously, the app downloaded ~30 JSON files on startup.
    // Now it only loads the detected language (bundled English or fetched via XHR).
    // This significantly reduces network bandwidth and startup congestion.
    
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
