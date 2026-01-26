const dependenciesCache = new WeakMap();

/**
 * Recursively identifies all keys that a QuestionBlock (and its sub-blocks) depends on.
 *
 * Dependencies include:
 * 1. The question's own key (for value).
 * 2. keys for "Other" option (if applicable).
 * 3. Condition keys (for visibility logic).
 * 4. All of the above for all sub-questions recursively.
 *
 * @param {Object} qConfig - The configuration object for the question block.
 * @returns {Object} { keys: Array<string>, enKeys: Array<string> }
 *          keys: Keys to check in formData (local/translated values).
 *          enKeys: Keys to check in formDataEn (English values for logic).
 */
export const getSubtreeKeys = (qConfig) => {
  if (!qConfig || typeof qConfig !== 'object') {
    return { keys: [], enKeys: [] };
  }

  if (dependenciesCache.has(qConfig)) {
    return dependenciesCache.get(qConfig);
  }

  const keysToCheck = new Set();
  const enKeysToCheck = new Set();

  function traverse(config) {
    if (!config) return;
    const key = config.name || config.key;

    // 1. Own value dependency
    if (key) {
        keysToCheck.add(key);
        // Also check English value for "Other" visibility logic (renderInput checks formDataEn[name] === 'Other')
        if (config.otherOptionId) {
             enKeysToCheck.add(key);
        }
    }

    // 2. Other option value dependency
    if (config.otherOptionId) {
      keysToCheck.add(config.otherOptionId);
    }

    // 3. Condition dependency
    // Conditions rely on the English value of the referenced key
    if (config.condition && config.condition.key) {
      enKeysToCheck.add(config.condition.key);
    }

    // 4. Recurse
    if (config.subQuestions && Array.isArray(config.subQuestions)) {
      config.subQuestions.forEach(traverse);
    }
  }

  traverse(qConfig);

  const result = {
      keys: Array.from(keysToCheck),
      enKeys: Array.from(enKeysToCheck)
  };

  dependenciesCache.set(qConfig, result);
  return result;
};
