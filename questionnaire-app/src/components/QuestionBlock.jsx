import React, { memo } from 'react';

// Optimization: Extracted this component to apply React.memo.
// The Questionnaire component renders many of these blocks.
// Memoization prevents re-rendering all questions when typing in a single field,
// provided the custom comparator filters out unrelated state changes.
const QuestionBlock = ({
  qConfig,
  questionnaireData,
  questionnaireDataEn,
  formData,
  formDataEn,
  validationErrors,
  handleChange,
  t,
  displayNumber,
  randomPatientId, // NEW: Passed prop
  // Q27 specific props
  isQ27No,
  showQ27VideoPrompt,
  q27VideoConfirmed,
  setQ27VideoConfirmed,
}) => {
  const name = qConfig.name || qConfig.key;
  const data = questionnaireData[qConfig.key];

  if (!data) return <p>{t('ui.errors.questionNotFound', { key: qConfig.key })}</p>;

  // --- renderInput Logic ---
  const renderInput = (config) => {
    const qName = config.name || config.key;
    const qData = questionnaireData[config.key];
    if (!qData) return null;

    let placeholder = config.placeholder || '';
    if (config.key === 'Q44') {
      // FIX: Use the prop for placeholder
      placeholder = randomPatientId;
    }

    if (!Array.isArray(qData.answers) || qData.answers.length === 0) {
      if (config.type === 'number') {
        const minAttr = config.min !== undefined ? config.min : undefined;
        const maxAttr = config.max !== undefined ? config.max : undefined;
        const stepAttr = config.step !== undefined ? config.step : undefined;

        return (
          <>
            <input
              type="number"
              name={qName}
              placeholder={placeholder}
              value={formData[qName] || ''}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (config.integerOnly && (e.key === '.' || e.key === ',')) {
                  e.preventDefault();
                }
              }}
              className="text-input"
              min={minAttr}
              max={maxAttr}
              step={stepAttr}
            />
            {validationErrors.includes(qName) && (
              <div className="field-error">
                {config.min !== undefined && config.max !== undefined
                  ? `${t('ui.invalidInput.numberPrefix')} ${config.min} ${t('ui.invalidInput.and')} ${config.max}.`
                  : `${t('ui.invalidInput.validInput')} `}
              </div>
            )}
          </>
        );
      }
      return (
        <input
          type={config.type || 'text'}
          name={qName}
          placeholder={placeholder}
          value={formData[qName] || ''}
          onChange={handleChange}
          className="text-input"
        />
      );
    }

    switch (config.type) {
      case 'select':
        return (
          <select name={qName} onChange={handleChange} value={formData[qName] || ""} className="select-input">
            <option value="" disabled>{t('ui.inputs.selectDefault')}</option>
            {qData.answers.map((ans, i) => <option key={i} value={ans}>{ans}</option>)}
          </select>
        );
      case 'checkbox':
        return (
          <div className="checkbox-group vertical">
            {qData.answers.map((ans, i) => (
              <label key={i}>
                <input
                  type="checkbox" name={qName} value={ans} onChange={handleChange}
                  checked={formData[qName]?.includes(ans) || false}
                /> {ans}
              </label>
            ))}
          </div>
        );
      case 'checkbox-plus-text':
        return (
          <div className="checkbox-group vertical">
            {qData.answers.map((ans, i) => (
              <label key={i}>
                <input
                  type="checkbox" name={qName} value={ans} onChange={handleChange}
                  checked={formData[qName]?.includes(ans) || false}
                /> {ans}
              </label>
            ))}
          </div>
        );
      case 'radio':
      default:
        return (
          <div className="radio-group vertical">
            {qData.answers.map((ans, i) => (
              <label key={i}>
                <input
                  type="radio" name={qName} value={ans} onChange={handleChange}
                  checked={formData[qName] === ans}
                /> {ans}
              </label>
            ))}
          </div>
        );
    }
  };

  // --- renderSubQuestions Logic ---
  const renderSubQuestions = (subQuestions, parentNumber) => {
    if (!Array.isArray(subQuestions)) return null;

    return subQuestions.map((subQConfig, index) => {
      const subQData = questionnaireData[subQConfig.key];
      if (!subQData) return null;

      const subQKey = subQConfig.name || subQConfig.key;
      const conditionKey = subQConfig.condition ? subQConfig.condition.key : null;

      if (subQConfig.condition && conditionKey !== subQKey) {
        if (formDataEn[conditionKey] !== subQConfig.condition.value) {
          return null;
        }
      }

      const subDisplayNumber = `${parentNumber}${String.fromCharCode(97 + index)}.`;

      let allowChildren = true;
      if (subQConfig.condition && conditionKey === subQKey) {
        if (formDataEn[subQKey] !== subQConfig.condition.value) {
          allowChildren = false;
        }
      }

      return (
        <QuestionBlock
          key={subQKey}
          qConfig={{ ...subQConfig, subQuestions: allowChildren ? subQConfig.subQuestions : null }}
          questionnaireData={questionnaireData}
          questionnaireDataEn={questionnaireDataEn}
          formData={formData}
          formDataEn={formDataEn}
          validationErrors={validationErrors}
          handleChange={handleChange}
          t={t}
          displayNumber={subDisplayNumber}
          randomPatientId={randomPatientId}
        />
      );
    });
  };

  let showSubquestions = false;
  if (qConfig.subQuestions && qConfig.condition) {
      if (formDataEn[qConfig.condition.key] === qConfig.condition.value) {
          showSubquestions = true;
      }
  }

  const children = renderSubQuestions(qConfig.subQuestions, displayNumber);
  const hasValidChildren = Array.isArray(children) && children.some(child => child !== null);


  return (
    <React.Fragment>
      <div className={`question-block ${validationErrors.includes(name) ? 'error' : ''}`}>
        <label>
          {displayNumber} {data.question}
          {qConfig.required && <span className="required-asterisk">*</span>}
        </label>
        {renderInput(qConfig)}
      </div>

      {hasValidChildren && showSubquestions && (
        <div className={`sub-question-container visible`}>
          {children}
        </div>
      )}

      {qConfig.key === "Q27" && isQ27No && (
        <>
          {!q27VideoConfirmed && showQ27VideoPrompt && (
            <div className="video-prompt-container">
              <p className="video-prompt-note">{t('ui.videoPrompt.note')}</p>
              <button
                type="button"
                className="video-prompt-button"
                onClick={() => setQ27VideoConfirmed(true)}
              >
                {t('ui.videoPrompt.button')}
              </button>
            </div>
          )}
          {q27VideoConfirmed && qConfig.videoUrlOnNo && (
            <div className="youtube-player-container">
              <iframe width="560" height="315" src={qConfig.videoUrlOnNo} title={t('ui.videoPrompt.videoTitle')} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
            </div>
          )}
        </>
      )}
    </React.Fragment>
  );
};

// Custom Comparator
const arePropsEqual = (prev, next) => {
  const name = next.qConfig.name || next.qConfig.key;

  // 1. Check strict dependencies (including i18n)
  if (prev.t !== next.t) return false; // FIX: Language change detection
  if (prev.questionnaireData !== next.questionnaireData) return false; // FIX: Data change

  if (prev.qConfig !== next.qConfig) return false;
  if (prev.displayNumber !== next.displayNumber) return false;

  if (prev.randomPatientId !== next.randomPatientId) return false; // FIX: Q44 dependency

  // 2. Check value change - Optimized Recursive Check
  // Check if current question data changed
  if (prev.formData[name] !== next.formData[name]) return false;

  // Check if current question validation status changed
  if (prev.validationErrors.includes(name) !== next.validationErrors.includes(name)) return false;

  // 3. Check Q27 specifics
  if (name === 'Q27') {
    if (prev.isQ27No !== next.isQ27No) return false;
    if (prev.showQ27VideoPrompt !== next.showQ27VideoPrompt) return false;
    if (prev.q27VideoConfirmed !== next.q27VideoConfirmed) return false;
  }

  // 4. Recursive Subquestions check
  // Helper to recursively check if subtree data or errors changed
  const hasSubtreeChanged = (config) => {
     // config might be the top-level qConfig or a subQuestion object
     // If it has subQuestions, we must check them
     if (!config.subQuestions || !Array.isArray(config.subQuestions)) {
         return false;
     }

     for (const sub of config.subQuestions) {
         const subKey = sub.name || sub.key;

         // Check data for this subquestion
         if (prev.formData[subKey] !== next.formData[subKey]) return true;

         // Check validation error for this subquestion
         const prevHasError = prev.validationErrors.includes(subKey);
         const nextHasError = next.validationErrors.includes(subKey);
         if (prevHasError !== nextHasError) return true;

         // Recurse
         if (hasSubtreeChanged(sub)) return true;
     }
     return false;
  };

  if (hasSubtreeChanged(next.qConfig)) {
      return false; // Subtree data changed, re-render
  }

  return true; // No relevant changes found, skip render
};

export default memo(QuestionBlock, arePropsEqual);
