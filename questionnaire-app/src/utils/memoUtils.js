// Utility to get all form data keys associated with a question subtree
// Used for memoization of QuestionBlock to prevent re-renders when unrelated fields change.

const subtreeKeysCache = new WeakMap();

export const getSubtreeKeys = (qConfig) => {
  if (subtreeKeysCache.has(qConfig)) {
    return subtreeKeysCache.get(qConfig);
  }

  const keys = new Set();

  // Add own key
  const name = qConfig.name || qConfig.key;
  if (name) keys.add(name);

  // Add condition key if exists
  if (qConfig.condition && qConfig.condition.key) {
    keys.add(qConfig.condition.key);
  }

  // Add otherOptionId if exists
  if (qConfig.otherOptionId) {
      keys.add(qConfig.otherOptionId);
  }

  // Recurse into subQuestions
  if (Array.isArray(qConfig.subQuestions)) {
    for (const subQ of qConfig.subQuestions) {
      const subKeys = getSubtreeKeys(subQ);
      for (const k of subKeys) {
        keys.add(k);
      }
    }
  }

  subtreeKeysCache.set(qConfig, keys);
  return keys;
};
