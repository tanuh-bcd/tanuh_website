## 2024-02-19 - React Memoization and I18n
**Learning:** When using `React.memo` with a custom comparator in an app using `react-i18next`, failing to check `prev.t !== next.t` or `prev.data !== next.data` causes the component to freeze in the old language/data when the locale changes, even if the parent re-renders.
**Action:** Always include localization props (function `t` and data objects) in the dependency check of custom comparators to support dynamic language switching.

## 2024-02-19 - Optimizing Recursive Structures
**Learning:** For components with recursive children (like questionnaire blocks), unconditionally disabling memoization (`return false`) when children exist is a major performance bottleneck. It causes O(N) re-renders of the entire tree on every keystroke.
**Action:** Implement a deep equality check (e.g., `hasSubtreeChanged`) that inspects the recursive data structure (values, errors, conditions) to determine if the subtree *actually* needs updates, allowing the parent to stay memoized.
