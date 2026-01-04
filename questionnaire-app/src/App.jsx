
import React, { useState, lazy, Suspense, useMemo } from 'react';
import Consent from './components/Consent';
import './App.css';
// --- NEW: Import the translation hook ---
import { useTranslation } from 'react-i18next';

import questionnaireDataEng from './assets/questionnaire.json' with { type: 'json' };

// Lazy load large components
const Questionnaire = lazy(() => import('./components/Questionnaire'));
const ThankYou = lazy(() => import('./components/ThankYou'));

function App() {
  const [appState, setAppState] = useState('consent');
  const [sessionId, setSessionId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [riskResult, setRiskResult] = useState(null);
  const [finalFormData, setFinalFormData] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const safeFetch = async (url, options) => {
    const res = await fetch(url, options);
    const text = await res.text();

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
  const { t, ready, i18n } = useTranslation(['consent', 'questionnaire', 'thankyou']);

  // Get the entire translated objects for the current language
  // We use the 't' function with the namespace prefix
  // OPTIMIZATION: Memoize these objects to prevent unnecessary re-renders in children
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const formStructure = useMemo(() => t('questionnaire:formStructure', { returnObjects: true }), [t, i18n.language]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const questionnaireData = useMemo(() => t('questionnaire:questions', { returnObjects: true }), [t, i18n.language]);

  const questionnaireDataEn = questionnaireDataEng.questions;
  const formStructureEn = questionnaireDataEng.formStructure;
  
  // --- END MODIFICATION ---


  const handleConsent = async () => {
    try {
      const data = await safeFetch(`${API_URL}/api/session/start`, { method: 'POST' });
      
      if (data.success && data.sessionId) {
        setSessionId(data.sessionId);
        setAppState('questionnaire');
        window.scrollTo(0, 0);
      } else {
        alert(t('consent:errors.sessionStart', 'Could not start a session. Please try again.'));
      }
    } catch (error) {
      console.error('Error starting session:', error);
      alert(t('consent:errors.sessionConnect', 'Could not connect to the server to start a session.'));
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
    } catch { // Fixed: Removed unused 'error' variable
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

  // --- Pass data down as props ---
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
