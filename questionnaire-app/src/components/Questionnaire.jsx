import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './Questionnaire.css';
// NEW: Import the translation hook
import { useTranslation } from 'react-i18next';
import QuestionBlock from './QuestionBlock';

// Helper function to generate random string (Unchanged)
const generateRandomId = (length = 8) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};


// NEW: Accept formStructure and questionnaireData as props
function Questionnaire({ onSubmit, isSubmitting, formStructure, questionnaireData, questionnaireDataEn }) {
  
  // NEW: Initialize i18next hook *only* for UI text

  const { t, i18n } = useTranslation('questionnaire');
  
  // NEW: Load 'ui' text from the hook
  // OPTIMIZATION: Memoize ui object to prevent recreation on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ui = useMemo(() => t('ui', { returnObjects: true }), [t, i18n.language]);


  // State hooks
  const [formData, setFormData] = useState(() => ({
    Q45: t('ui.defaults.q45')
  }));
  const [formDataEn, setFormDataEn] = useState(() => ({
    Q45: 'Universal'
  }));
  const [validationErrors, setValidationErrors] = useState([]);
  const [showQ27VideoPrompt, setShowQ27VideoPrompt] = useState(false); 
  const [q27VideoConfirmed, setQ27VideoConfirmed] = useState(false);
  const [randomPatientId, setRandomPatientId] = useState('');
  
  // Helper to get the translated value for a condition
  const getTranslatedConditionValue = useCallback((condition) => {
    if (!condition || !condition.key || !condition.value) return null;
    
    // 1. Get English answers for the condition key
    const enAnswers = questionnaireDataEn[condition.key]?.answers;
    if (!Array.isArray(enAnswers)) return null;

    // 2. Find index of the required value (e.g., "No" is index 1)
    const index = enAnswers.indexOf(condition.value);
    if (index === -1) return null;

    // 3. Get the Translated answer at that index
    // We use the 't' function logic or direct prop access
    const translatedAnswers = questionnaireData[condition.key]?.answers;
    
    // Fallback to English if translation missing
    return translatedAnswers?.[index] || enAnswers[index];
  }, [questionnaireData, questionnaireDataEn]);

  // Effect to set random ID and defaults
  useEffect(() => {
    const newId = generateRandomId();
    setRandomPatientId(newId);
    // Pre-fill the form with defaults from the translation file
    setFormData(prevData => ({
      ...prevData,
      Q44: newId,
      Q45: t('ui.defaults.q45') // Use default from JSON
    }));
  }, [t]); // 't' dependency re-runs this if language changes
  
  
  // Progress calculation - OPTIMIZED: Uses controllingKeys to avoid O(N) traversal on every keystroke

  // 1. Identify which keys affect visibility (Run once per formStructure)
  const controllingKeys = useMemo(() => {
    const keys = new Set();
    const traverse = (questions) => {
      if (!Array.isArray(questions)) return;
      questions.forEach(q => {
        if (q.condition) keys.add(q.condition.key);
        if (q.subQuestions) traverse(q.subQuestions);
      });
    };
    if (Array.isArray(formStructure)) {
      formStructure.forEach(section => traverse(section.questions));
    }
    return keys;
  }, [formStructure]);

  // 2. Create a signature that only changes when a controlling key changes
  const visibilitySignature = useMemo(() => {
    return Array.from(controllingKeys).sort().map(key => `${formData[key]}:${formDataEn[key]}`).join('|');
  }, [controllingKeys, formData, formDataEn]);

  // 3. Calculate visible keys ONLY when signature changes
  const visibleKeysSet = useMemo(() => {
    if (!Array.isArray(formStructure)) return new Set();

    const visibleKeys = new Set();
    const traverse = (questions) => {
      if (!Array.isArray(questions)) return; // Safety check
      questions.forEach(q => {
        const qKey = q.name || q.key;

        // NEW: Check if this question (the parent) should be visible
        if (q.condition && q.condition.key !== qKey) {
          if (formDataEn[q.condition.key] !== q.condition.value) {
            return;
          }
        }

        visibleKeys.add(qKey);
        if (q.otherOptionId) {
          const valEn = formDataEn[qKey];
          const isOtherSelected = Array.isArray(valEn)
            ? (valEn.includes('Other') || valEn.includes('others'))
            : (valEn === 'Other');
          if (isOtherSelected) {
            visibleKeys.add(q.otherOptionId);
          }
        }

        if (q.subQuestions && q.condition) {
          // If it's a fork (condition is on another question)
          if (q.condition.key !== qKey) {
            if (formDataEn[q.condition.key] === q.condition.value) {
              traverse(q.subQuestions);
            }
          } else {
            // It's a self-trigger (condition is on this question)
            const translatedConditionValue = getTranslatedConditionValue(q.condition);
            if (formData[q.condition.key] === translatedConditionValue) {
              traverse(q.subQuestions);
            }
          }
        }
      });
    };
    formStructure.forEach(section => traverse(section.questions));
    return visibleKeys;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibilitySignature, formStructure, getTranslatedConditionValue]);

  // 4. Calculate progress (Answered Count) - depends on visibleKeysSet and formData
  const progress = useMemo(() => {
    let answeredCount = 0;
    visibleKeysSet.forEach(key => {
      const value = formData[key];
      if (value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0)) {
        answeredCount++;
      }
    });
    const totalVisible = visibleKeysSet.size;
    const newProgress = totalVisible > 0 ? Math.round((answeredCount / totalVisible) * 100) : 0;
    return Math.min(newProgress, 100);
  }, [formData, visibleKeysSet]);


  // handleChange - Refactored to avoid side effects
  // The 'handleChange' function will be re-created on every render (no useCallback)
  // because QuestionBlock ignores its identity anyway in arePropsEqual.
  // This simplifies dependencies and ensures 'formData' is always fresh if needed,
  // but we use functional updates anyway.
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // CRITICAL FIX: Get translated "No" value for Q27
    const noValue = t('questions.Q27.answers.1'); // Assumes "No" is index 1

    if (name === 'Q27') {
      if (value === noValue) {
        setShowQ27VideoPrompt(true); 
        setQ27VideoConfirmed(false); 
      } else {
        setShowQ27VideoPrompt(false); 
        setQ27VideoConfirmed(false); 
      }
    }

    // Handle changes
    if (type === 'checkbox') {
        const currentValues = formData[name] || [];
        const newValues = checked ? [...currentValues, value] : currentValues.filter(v => v !== value);

        // Calculate English values
        const localAnswers = questionnaireData[name]?.answers || [];
        const englishAnswers = questionnaireDataEn[name]?.answers || [];
        const englishMappedValues = newValues.map(
          val => englishAnswers[localAnswers.indexOf(val)] || val
        );

        // Update both states
        setFormData(prev => ({ ...prev, [name]: newValues }));
        setFormDataEn(prev => ({ ...prev, [name]: englishMappedValues }));

    } else {
        const hindiAnswers = questionnaireData[name]?.answers || [];
        const englishAnswers = questionnaireDataEn[name]?.answers || [];
        const index = hindiAnswers.indexOf(value);
        const englishValue = index !== -1 ? englishAnswers[index] : value;

        setFormData(prev => ({ ...prev, [name]: value }));
        setFormDataEn(prev => ({ ...prev, [name]: englishValue }));
    }
  };


  // getVisibleRequiredQuestions - Modified to use translated "Yes"
  const getVisibleRequiredQuestions = () => {
    let visibleRequired = [];
    const traverseQuestions = (questions) => {
        if (!Array.isArray(questions)) return;
        for (const q of questions) {
            const qKey = q.name || q.key;

            // NEW: Check if this question (the parent) should be visible
            if (q.condition && q.condition.key !== qKey) {
              if (formDataEn[q.condition.key] !== q.condition.value) {
                continue;
              }
            }

            if (q.required) {
                visibleRequired.push(qKey);
            }
            if (q.otherOptionId && q.required) {
              const valEn = formDataEn[qKey];
              const isOtherSelected = Array.isArray(valEn) 
                ? (valEn.includes('Other') || valEn.includes('others'))
                : (valEn === 'Other');
              if (isOtherSelected) {
                visibleRequired.push(q.otherOptionId);
              }
            }
            
            if (q.subQuestions && q.condition) {
                // If it's a fork (condition is on another question)
                if (q.condition.key !== qKey) {
                  if (formDataEn[q.condition.key] === q.condition.value) {
                    traverseQuestions(q.subQuestions);
                  }
                } else {
                  // It's a self-trigger (condition is on this question)
                  const translatedConditionValue = getTranslatedConditionValue(q.condition);
                  if (formData[q.condition.key] === translatedConditionValue) {
                      traverseQuestions(q.subQuestions);
                  }
                }
            }
        }
    };
    if (Array.isArray(formStructure)) {
      formStructure.forEach(section => traverseQuestions(section.questions));
    }
    // console.log('Visible Required Keys:', visibleRequired);
    return visibleRequired;
  };
  // Helper: validate numeric rules and return array of failing keys
  const validateNumericRules = (data) => {
    const failures = [];

    if (!Array.isArray(formStructure)) return failures;

    const traverse = (questions) => {
      if (!Array.isArray(questions)) return;
      for (const q of questions) {
        const key = q.name || q.key;

        // NEW: Check if this question (the parent) should be visible
        if (q.condition && q.condition.key !== key) {
          if (formDataEn[q.condition.key] !== q.condition.value) {
            continue;
          }
        }

        // Only validate numeric fields that have value
        if (q.type === 'number') {
          const raw = data[key];
          if (raw !== undefined && raw !== null && raw !== '') {
            // coerce to number safely
            const num = Number(raw);
            if (Number.isNaN(num)) {
              failures.push(key);
              continue;
            }
            if (q.integerOnly && !Number.isInteger(num)) {
              failures.push(key);
              continue;
            }
            if (q.min !== undefined && num < q.min) {
              failures.push(key);
              continue;
            }
            if (q.max !== undefined && num > q.max) {
              failures.push(key);
              continue;
            }
          }
        }
        // Recurse into subQuestions
        if (q.subQuestions && q.condition) {
           if (q.condition.key !== key) {
             if (formDataEn[q.condition.key] === q.condition.value) {
               traverse(q.subQuestions);
             }
           } else {
             const translatedConditionValue = getTranslatedConditionValue(q.condition);
             if (data[q.condition.key] === translatedConditionValue) {
               traverse(q.subQuestions);
             }
           }
        }
      }
    };

    formStructure.forEach(section => traverse(section.questions));
    return failures;
  };

  
  // handleSubmit (with default value logic) - Modified for translated text
  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationErrors([]);

    const dataToSubmit = { ...formData };
    const dataToSubmitEn = { ...formDataEn };


    if (!dataToSubmitEn.Q44) {
        dataToSubmitEn.Q44 = randomPatientId;
    }
    if (!dataToSubmitEn.Q45) {
        dataToSubmitEn.Q45 = "Universal"; 
    }
    if (!dataToSubmit.Q44) {
        dataToSubmit.Q44 = randomPatientId;
    }
    if (!dataToSubmit.Q45) {
        dataToSubmit.Q45 = t('ui.defaults.q45'); 
    }
    const visibleRequiredKeys = getVisibleRequiredQuestions();
    const missingFields = visibleRequiredKeys.filter(key => {
        const value = dataToSubmit[key];
        return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
    });
    // console.log('Submitting:', { dataToSubmit, dataToSubmitEn, missingFields });

    const numericFailures = validateNumericRules(dataToSubmit);

    const combinedFailures = [...new Set([...missingFields, ...numericFailures])];
    // console.log('Validation Failures:', combinedFailures);

    if (combinedFailures.length > 0) {
      setValidationErrors(combinedFailures);
      alert(t('ui.errors.validationAlert')); // same alert
      const firstErrorKey = combinedFailures[0];
      const errorElement = document.querySelector(`[name="${firstErrorKey}"]`);
      if (errorElement) {
        errorElement.closest('.question-block').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

  
    onSubmit(dataToSubmit, dataToSubmitEn);
  };


  // renderSubQuestions - Modified to use translated data
  // const renderSubQuestions = (subQuestions, parentNumber) => {
  //   if (!Array.isArray(subQuestions)) return null; 
  //   return subQuestions.map((subQConfig, index) => {
  //     const subQData = questionnaireData[subQConfig.key];
  //     if (!subQData) return null;
      
  //     const subQName = subQConfig.name || subQConfig.key;
  //     const displayNumber = `${parentNumber}${String.fromCharCode(97 + index)}.`; 
      
  //     // const conditionValue = subQConfig.condition ? subQConfig.condition.value : null;
  //     // Assumes "Yes" is index 0
  //     // let translatedConditionValue = (subQConfig.condition && subQConfig.condition.key) ? t(`questions.${subQConfig.condition.key}.answers.0`) : null;
  //     // if (subQConfig.condition.key === "Q24") {
  //     //   translatedConditionValue = (subQConfig.condition && subQConfig.condition.key) ? t(`questions.${subQConfig.condition.key}.answers.1`) : null;
  //     // }

  //     let translatedConditionValue = null;
  //     if (subQConfig.condition && subQConfig.condition.key) {
  //       // default: use the first answer translation (index 0) if present
  //       // translatedConditionValue = t(`questions.${subQConfig.condition.key}.answers.0`, { defaultValue: null });
  //       translatedConditionValue = getTranslatedConditionValue(subQConfig.condition);
      

  //       // special-case: if condition key is Q24, we want "No" (answers[1]) as the trigger
  //       if (subQConfig.condition.key === "Q24") {
  //         translatedConditionValue = t(`questions.${subQConfig.condition.key}.answers.1`, { defaultValue: null });
  //       }
  //     }

  //     return (
  //       <React.Fragment key={subQName}>
  //         <div className={`question-block ${validationErrors.includes(subQName) ? 'error' : ''}`}>
  //           <label>
  //               {displayNumber} {subQData.question}
  //               {subQConfig.required && <span className="required-asterisk">*</span>}
  //           </label>
  //           {renderInput(subQConfig)} 
  //         </div>
  //         {subQConfig.subQuestions && (
  //           <div className={`sub-question-container ${formData[subQName] === translatedConditionValue ? 'visible' : ''}`}>
  //             {renderSubQuestions(subQConfig.subQuestions, displayNumber.slice(0,-1))} 
  //           </div>
  //         )}
  //       </React.Fragment>
  //     );
  //   });
  // };
  // renderSubQuestions - Corrected to handle Q24 (Self-Trigger)
  // renderSubQuestions - "Look-Ahead" Version to fix empty bars
  // renderSubQuestions - Optimized to use formDataEn for reliable condition checks
  const renderSubQuestions = (subQuestions, parentNumber, currentQuestionnaireData, currentQuestionnaireDataEn, currentFormData, currentFormDataEn, currentValidationErrors) => {
    if (!Array.isArray(subQuestions)) return null;

    return subQuestions.map((subQConfig, index) => {
      const subQData = currentQuestionnaireData[subQConfig.key];
      if (!subQData) return null;

      const subQKey = subQConfig.name || subQConfig.key;
      const conditionKey = subQConfig.condition ? subQConfig.condition.key : null;

      // --- LOGIC 1: SHOULD THIS QUESTION (THE PARENT) RENDER? ---
      if (subQConfig.condition && conditionKey !== subQKey) {
         if (currentFormDataEn[conditionKey] !== subQConfig.condition.value) {
             return null; 
         }
      }

      const displayNumber = `${parentNumber}${String.fromCharCode(97 + index)}.`;

      // --- LOGIC 2: PRE-CALCULATE CHILDREN ---
      let renderedChildren = null;
      let allowChildren = true;
      if (subQConfig.condition && conditionKey === subQKey) {
          if (currentFormDataEn[subQKey] !== subQConfig.condition.value) {
              allowChildren = false;
          }
      }

      if (subQConfig.subQuestions && allowChildren) {
          renderedChildren = renderSubQuestions(subQConfig.subQuestions, displayNumber.slice(0,-1), currentQuestionnaireData, currentQuestionnaireDataEn, currentFormData, currentFormDataEn, currentValidationErrors);
      }

      const hasValidChildren = Array.isArray(renderedChildren) && renderedChildren.some(child => child !== null);

      return (
        <React.Fragment key={subQKey}>
          <QuestionBlock
            qConfig={subQConfig}
            questionnaireData={currentQuestionnaireData}
            questionnaireDataEn={currentQuestionnaireDataEn}
            formData={currentFormData}
            formDataEn={currentFormDataEn}
            validationErrors={currentValidationErrors}
            handleChange={handleChange}
            t={t}
            displayNumber={displayNumber}
            randomPatientId={randomPatientId}
          />
          {hasValidChildren && (
            <div className="sub-question-container visible">
              {renderedChildren}
            </div>
          )}
        </React.Fragment>
      );
    });
  };

  let questionCounter = 0;

  // Loading check (important!)
  // If the data hasn't been loaded by i18next yet, show a loading message
  if (!Array.isArray(formStructure) || !ui.header || !questionnaireData.Q1) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
            Loading questionnaire content...
        </div>
    );
  }

  // --- Main return JSX - Modified to use translated 'ui' object ---
  return (
    <>
      <div className="progress-bar-container">
        {/* <div className="progress-bar-label">{t('ui.progressBarTemplate', {progress: progress})}</div> */}
        <div className="progress-bar-label">{ui.progressBarTemplate.replace('{progress}', progress)}</div>
        <div className="progress-bar-track">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progress}%` }} 
          ></div>
        </div>
      </div>

      <form className="questionnaire-container" onSubmit={handleSubmit} noValidate>
        <img src="/tanuh.png" alt={t('ui.logos.tanuhAlt')} className="logo tanuh-logo" />
        <img src="/IISc_logo.png" alt={t('ui.logos.iiscAlt')} className="logo iisc-logo" />
        
        <div className="form-header">
          <h1>{t('ui.header.title')}</h1>
          <p style={{ color: "#533b42ff", fontSize: "18px", marginTop: "8px" }}>{t('ui.header.instructions')}</p>
          <p style={{ color: "#533b42ff", fontSize: "15px", marginTop: "8px" }}>
            {t('ui.header.mandatoryPre')}
            <span style={{ color: "#d93025", fontWeight: 600 }}>{t('ui.header.mandatorySymbol')}</span>
            {t('ui.header.mandatoryPost')}
          </p>
        </div>
        
        {formStructure.map((section, index) => (
          <div key={index} className="form-section">
            <h2>{t(section.title)}</h2> {/* Get section title from translation */}
            {section.questions.map((qConfig) => {
              const data = questionnaireData[qConfig.key];
              if (!data) return null;
              
              // NEW: Check for top-level condition (like gender-based hiding)
              // FIX: Only hide if the condition is based on ANOTHER question.
              // If condition.key === qConfig.key, it's a self-referencing condition used for subquestions.
              if (qConfig.condition && qConfig.condition.key !== qConfig.key) {
                if (formDataEn[qConfig.condition.key] !== qConfig.condition.value) {
                  return null;
                }
              }

              questionCounter++;
              const displayNumber = `${questionCounter}.`;
              const name = qConfig.name || qConfig.key;
              
              const noValueQ27 = t('questions.Q27.answers.1'); 
              const isQ27No = qConfig.key === "Q27" && formData[name] === noValueQ27;
              
              const children = qConfig.subQuestions ? renderSubQuestions(qConfig.subQuestions, displayNumber, questionnaireData, questionnaireDataEn, formData, formDataEn, validationErrors) : null;
              const hasValidChildren = Array.isArray(children) && children.some(child => child !== null);

              return (
                <React.Fragment key={name}>
                  <QuestionBlock
                    qConfig={qConfig}
                    questionnaireData={questionnaireData}
                    questionnaireDataEn={questionnaireDataEn}
                    formData={formData}
                    formDataEn={formDataEn}
                    validationErrors={validationErrors}
                    handleChange={handleChange}
                    t={t}
                    displayNumber={displayNumber}
                    isQ27No={isQ27No}
                    showQ27VideoPrompt={showQ27VideoPrompt}
                    q27VideoConfirmed={q27VideoConfirmed}
                    setQ27VideoConfirmed={setQ27VideoConfirmed}
                    randomPatientId={randomPatientId}
                  />
                  {hasValidChildren && (
                    <div className="sub-question-container visible">
                      {children}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        ))}
        <div className="submit-button-container">
          {isSubmitting ? (
            <button type="button" className="submit-button loading" disabled>
              <span className="loading-dots"><span></span><span></span><span></span></span>
              {t('ui.submitButton.loading')}
            </button>
          ) : (
            <button type="submit" className="submit-button">
              {t('ui.submitButton.default')}
            </button>
          )}
        </div>
      </form>
    </>
  );
}

export default Questionnaire;
