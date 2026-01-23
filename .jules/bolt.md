## 2024-02-19 - React Memoization and I18n
**Learning:** When using `React.memo` with a custom comparator in an app using `react-i18next`, failing to check `prev.t !== next.t` or `prev.data !== next.data` causes the component to freeze in the old language/data when the locale changes, even if the parent re-renders.
**Action:** Always include localization props (function `t` and data objects) in the dependency check of custom comparators to support dynamic language switching.

## 2026-01-23 - Recursive Component Memoization
**Learning:** Naively returning `false` (re-render) in `arePropsEqual` for components with children/sub-questions defeats memoization for the entire subtree, causing O(N) re-renders on every input.
**Action:** Use a recursive dependency checker (like `getSubtreeKeys`) to verify if any key in the subtree actually changed before re-rendering.
