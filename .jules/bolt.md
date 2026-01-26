## 2024-02-19 - React Memoization and I18n
**Learning:** When using `React.memo` with a custom comparator in an app using `react-i18next`, failing to check `prev.t !== next.t` or `prev.data !== next.data` causes the component to freeze in the old language/data when the locale changes, even if the parent re-renders.
**Action:** Always include localization props (function `t` and data objects) in the dependency check of custom comparators to support dynamic language switching.

## 2024-05-22 - Optimizing Recursive Form Structures
**Learning:** In a recursive form builder where parent components (blocks) contain child components (subquestions), a naive `React.memo` comparator that returns `false` (re-render) whenever subquestions exist essentially disables memoization for the entire tree. This causes O(N) re-renders on every keystroke.
**Action:** Implement a "smart" dependency check that recursively identifies all data keys (values, conditions, other-options) used by the subtree. Use this list to check for actual data changes in `arePropsEqual`. Cache the dependency list using `WeakMap` keyed by the stable configuration object to keep the check cheap.
