import React, { memo } from 'react';

// Helper to check if any question in the subtree has changed.
// This allows us to skip re-rendering parent questions even if they have sub-questions,
// as long as the sub-questions themselves haven't changed.
const hasSubtreeChanged = (prev, next, questions) => {
  if (!questions) return false;

  for (const q of questions) {
      const key = q.name || q.key;

      // 1. Check direct value change
      if (prev.formData[key] !== next.formData[key]) return true;

      // 2. Check validation error status
      const prevHasError = prev.validationErrors.includes(key);
      const nextHasError = next.validationErrors.includes(key);
      if (prevHasError !== nextHasError) return true;

      // 3. Check condition dependency
      if (q.condition) {
           const condKey = q.condition.key;
           // Check English data for condition as that's what's used in logic
           if (prev.formDataEn[condKey] !== next.formDataEn[condKey]) return true;
      }

      // 4. Recurse
      if (q.subQuestions && hasSubtreeChanged(prev, next, q.subQuestions)) {
          return true;
      }
  }
  return false;
};

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
  if (prev.validationErrors.includes(name) !== next.validationErrors.includes(name)) return false;

  if (prev.randomPatientId !== next.randomPatientId) return false; // FIX: Q44 dependency

  // 2. Check value change
  if (prev.formData[name] !== next.formData[name]) return false;

  // 3. Check Q27 specifics
  if (name === 'Q27') {
    if (prev.isQ27No !== next.isQ27No) return false;
    if (prev.showQ27VideoPrompt !== next.showQ27VideoPrompt) return false;
    if (prev.q27VideoConfirmed !== next.q27VideoConfirmed) return false;
  }

  // 4. Subquestions check
  if (next.qConfig.subQuestions && next.qConfig.subQuestions.length > 0) {
      // OPTIMIZED: Only re-render if the subtree actually changed.
      // Previously this was 'return false', causing O(N) re-renders for parents with children.
      if (hasSubtreeChanged(prev, next, next.qConfig.subQuestions)) {
        return false;
      }
  }

  return true;
};

export default memo(QuestionBlock, arePropsEqual);
