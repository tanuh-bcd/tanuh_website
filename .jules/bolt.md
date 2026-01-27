## 2024-02-19 - React Memoization and I18n
**Learning:** When using `React.memo` with a custom comparator in an app using `react-i18next`, failing to check `prev.t !== next.t` or `prev.data !== next.data` causes the component to freeze in the old language/data when the locale changes, even if the parent re-renders.
**Action:** Always include localization props (function `t` and data objects) in the dependency check of custom comparators to support dynamic language switching.

## 2026-01-27 - Optimizing Derived State with Signature Memoization
**Learning:** When calculating derived state (like visibility trees) that depends on a small subset of fields in a large form object, standard `useMemo` on the entire object causes unnecessary recalculations on every keystroke.
**Action:** Extract "controlling keys" (keys that affect logic) and create a dependency "signature" (e.g., string concatenation of `key:value`) to use in `useMemo`. This ensures the expensive calculation only runs when relevant data changes, not when any data changes.
