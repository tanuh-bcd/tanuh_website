## 2024-02-19 - React Memoization and I18n
**Learning:** When using `React.memo` with a custom comparator in an app using `react-i18next`, failing to check `prev.t !== next.t` or `prev.data !== next.data` causes the component to freeze in the old language/data when the locale changes, even if the parent re-renders.
**Action:** Always include localization props (function `t` and data objects) in the dependency check of custom comparators to support dynamic language switching.

## 2025-05-20 - Questionnaire Performance & Cleanliness
**Learning:** `Questionnaire.jsx` contained significant dead code (`renderInput`), confusing static analysis tools/reviewers. Also, `npm install` caused `package-lock.json` churn without dependency changes.
**Action:** Remove dead code aggressively to improve maintainability. Restore `package-lock.json` if no dependencies were added.
