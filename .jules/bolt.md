## 2024-02-19 - React Memoization and I18n
**Learning:** When using `React.memo` with a custom comparator in an app using `react-i18next`, failing to check `prev.t !== next.t` or `prev.data !== next.data` causes the component to freeze in the old language/data when the locale changes, even if the parent re-renders.
**Action:** Always include localization props (function `t` and data objects) in the dependency check of custom comparators to support dynamic language switching.

## 2024-02-19 - Optimizing Recursive React.memo
**Learning:** Blindly returning `false` in `React.memo` comparators for components with children (to ensure safety) destroys performance. For recursive tree structures (like questionnaires), explicitly traversing the subtree config to find relevant dependency keys (and caching this traversal with `WeakMap`) allows for safe, granular memoization.
**Action:** When memoizing a recursive container component, pre-calculate dependency keys (using `WeakMap` keyed by config object) and check only those keys in `formData` instead of forcing re-renders.
