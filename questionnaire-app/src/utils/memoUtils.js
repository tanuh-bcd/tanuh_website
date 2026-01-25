// WeakMap to cache the keys for a given configuration object.
// This ensures that we don't re-traverse the same object structure repeatedly.
const keysCache = new WeakMap();

/**
 * Recursively collects all keys (names) involved in a question's subtree.
 * This includes:
 * - The question's own key
 * - Keys for "Other" options (otherOptionId)
 * - Condition keys that affect visibility
 * - Keys of all sub-questions (recursively)
 *
 * @param {Object} qConfig - The configuration object for the question.
 * @returns {Set<string>} - A Set containing all relevant keys.
 */
export const getSubtreeKeys = (qConfig) => {
  if (!qConfig) return new Set();

  if (keysCache.has(qConfig)) {
    return keysCache.get(qConfig);
  }

  const keys = new Set();

  const traverse = (config) => {
    if (!config) return;

    // 1. Add own key
    const key = config.name || config.key;
    if (key) keys.add(key);

    // 2. Add 'Other' option key
    if (config.otherOptionId) {
      keys.add(config.otherOptionId);
    }

    // 3. Add Condition key
    // If a subquestion (or this question) depends on another field,
    // we must watch that field too.
    if (config.condition && config.condition.key) {
      keys.add(config.condition.key);
    }

    // 4. Recurse into sub-questions
    if (config.subQuestions && Array.isArray(config.subQuestions)) {
      config.subQuestions.forEach(traverse);
    }
  };

  traverse(qConfig);

  keysCache.set(qConfig, keys);
  return keys;
};
