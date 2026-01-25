## 2024-02-19 - React Memoization and I18n
**Learning:** When using `React.memo` with a custom comparator in an app using `react-i18next`, failing to check `prev.t !== next.t` or `prev.data !== next.data` causes the component to freeze in the old language/data when the locale changes, even if the parent re-renders.
**Action:** Always include localization props (function `t` and data objects) in the dependency check of custom comparators to support dynamic language switching.

## 2024-05-22 - Optimization of Recursive Structures
**Learning:** In a recursive component tree (like a questionnaire with sub-questions), a naive `React.memo` comparator that bails out (`return false`) whenever sub-items exist defeats the purpose of memoization, causing the entire tree to re-render on every state change.
**Action:** Use a helper function (cached with `WeakMap`) to traverse the static configuration and identify exactly which data keys are relevant for the subtree. This allows `React.memo` to safely return `true` if none of those specific keys have changed in the data store, significantly reducing re-renders.
