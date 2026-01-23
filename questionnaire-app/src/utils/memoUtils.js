/**
 * Recursively collects all keys (question keys, condition keys, etc.)
 * that a question subtree depends on.
 *
 * @param {Object} qConfig - The configuration object for the root question of the subtree.
 * @returns {Set<string>} - A Set of unique keys.
 */
export const getSubtreeKeys = (qConfig) => {
  const keys = new Set();

  const traverse = (config) => {
    if (!config) return;

    // 1. The question's own key
    if (config.key) {
      keys.add(config.key);
    }
    // Some questions might use 'name' instead of 'key'
    if (config.name && config.name !== config.key) {
      keys.add(config.name);
    }

    // 2. Condition key (if visibility depends on another question)
    if (config.condition && config.condition.key) {
      keys.add(config.condition.key);
    }

    // 3. Other option key (e.g. checkbox-plus-text)
    if (config.otherOptionId) {
      keys.add(config.otherOptionId);
    }

    // 4. Recurse into subQuestions
    if (Array.isArray(config.subQuestions)) {
      config.subQuestions.forEach(traverse);
    }
  };

  traverse(qConfig);
  return keys;
};
