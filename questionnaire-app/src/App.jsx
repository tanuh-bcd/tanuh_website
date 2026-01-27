
import React, { useState, lazy, Suspense } from 'react';
import Consent from './components/Consent';
import './App.css';
// --- NEW: Import the translation hook ---
import { useTranslation } from 'react-i18next';

import questionnaireDataEng from '../public/locales/english/questionnaire.json' with { type: 'json' };

// Lazy load large components
const Questionnaire = lazy(() => import('./components/Questionnaire'));
const ThankYou = lazy(() => import('./components/ThankYou'));

function App() {
  const [appState, setAppState] = useState('consent');
  const [sessionId, setSessionId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [riskResult, setRiskResult] = useState(null);
  const [finalFormData, setFinalFormData] = useState(null);
  const API_URL = (import.meta.env.VITE_API_URL || '').replace(/^["'](.+)["']$/, '$1');

  const safeFetch = async (url, options) => {
    let res;
    try {
      res = await fetch(url, options);
    } catch (e) {
      console.error(`❌ Network error fetching ${url}:`, e);
      throw new Error(`Network error: ${e.message}`);
    }

    const text = await res.text();

    if (!res.ok) {
      console.error(`❌ HTTP error ${res.status} from ${url}:`, text.slice(0, 200));
      throw new Error(`Server returned ${res.status}: ${text.slice(0, 100)}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      console.error(`❌ Invalid JSON from ${url}:`, text.slice(0, 200));
      throw new Error('Invalid JSON received from backend.');
    }
  };


  // console.log("Current language:", i18n.language);

  // --- MODIFIED: Load translations and get the 'ready' flag ---
  // We specify all namespaces here to ensure they are loaded
  const { t, ready } = useTranslation(['consent', 'questionnaire', 'thankyou']);

  // Get the entire translated objects for the current language
  // We use the 't' function with the namespace prefix
  const formStructure = t('questionnaire:formStructure', { returnObjects: true });
  const questionnaireData = t('questionnaire:questions', { returnObjects: true });
  const questionnaireDataEn = questionnaireDataEng.questions;
  const formStructureEn = questionnaireDataEng.formStructure;
  // const questionnaireDataEngRaw = questionnaireDataEng; // Unused
  
  // --- END MODIFICATION ---

  const { i18n } = useTranslation();


  const handleConsent = async () => {
    try {
      console.log(`Starting session via: ${API_URL}/api/session/start`);
      const data = await safeFetch(`${API_URL}/api/session/start`, { method: 'POST' });
      
      if (data.success && data.sessionId) {
        setSessionId(data.sessionId);
        setAppState('questionnaire');
        window.scrollTo(0, 0);
      } else {
        console.error('Session start failed:', data);
        alert(t('consent:errors.sessionStart', 'Could not start a session. Please try again.'));
      }
    } catch (error) {
      console.error('Error starting session:', error);
      // Enhanced diagnostic info
      const diagnosticMsg = `Error: ${error.message}. API_URL: "${API_URL}".`;
      console.error(diagnosticMsg);
      alert(`${t('consent:errors.sessionConnect', 'Could not connect to the server to start a session.')}\n\nTechnical details: ${error.message}`);
    }
  };

  const handleSubmit = async (formData, formDataEn) => {
    if (!sessionId) {
      alert('Session ID is missing. Cannot submit form.');
      return;
    }
    formDataEn = { ...formDataEn };
    if (!formDataEn.Q46) {
        formDataEn.Q46 = i18n.language;
    }
    // console.log('Final data to submit (English):', formDataEn);     

    
    setIsSubmitting(true);
    setFinalFormData(formDataEn); // Store the final data for the PDF
    // console.log('Submitting Form Data:', { formData, formDataEn });

    try {
      const result = await safeFetch(`${API_URL}/api/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, formDataEn }),
      });
      console.log('Submission Result:', result);

      if (result.success) {
        setRiskResult(result.riskPercentage);
        setAppState('submitted');
      } else {
        alert(t('questionnaire:ui.errors.validationAlert')); // Use translated error
        setFinalFormData(null);
      }
    } catch (error) {
      console.error(error); // Log the error to use it
      alert('Could not connect to the server to submit the form.'); // Generic error
      setFinalFormData(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const LoadingFallback = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
      Loading...
    </div>
  );

  if (!ready) {
    return <LoadingFallback />;
  }
  // --- END NEW LOADING CHECK ---

  // --- Passing diagnostics to Questionnaire ---
  return (
    <div className="app-container">
      {appState === 'consent' && <Consent onAccept={handleConsent} />}

      <Suspense fallback={<LoadingFallback />}>
        {appState === 'questionnaire' && (
          <Questionnaire
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            // Pass the loaded data down
            formStructure={formStructure}
            questionnaireData={questionnaireData}
            questionnaireDataEn={questionnaireDataEn}
          />
        )}
        {appState === 'submitted' && (
          <ThankYou
            riskResult={riskResult}
            formData={finalFormData}
            sessionId={sessionId}
            // Pass the loaded data down
            formStructure={formStructureEn}
            questionnaireData={questionnaireDataEn}
          />
        )}
      </Suspense>
    </div>
  );
}

export default App;
