## 2024-02-19 - React Memoization and I18n
**Learning:** When using `React.memo` with a custom comparator in an app using `react-i18next`, failing to check `prev.t !== next.t` or `prev.data !== next.data` causes the component to freeze in the old language/data when the locale changes, even if the parent re-renders.
**Action:** Always include localization props (function `t` and data objects) in the dependency check of custom comparators to support dynamic language switching.

## 2025-02-19 - Optimizing Tree Traversals in Form State
**Learning:** In a large form where visibility depends on a few "controlling" fields, recalculating visibility (O(Tree)) on every keystroke (O(1) update) is a major bottleneck.
**Action:** Identify "controlling keys" (those used in conditions) and memoize a "visibility signature" string based ONLY on their values. Use this signature to skip the O(Tree) visibility calculation when non-controlling fields are updated.
