## 2024-02-19 - React Memoization and I18n
**Learning:** When using `React.memo` with a custom comparator in an app using `react-i18next`, failing to check `prev.t !== next.t` or `prev.data !== next.data` causes the component to freeze in the old language/data when the locale changes, even if the parent re-renders.
**Action:** Always include localization props (function `t` and data objects) in the dependency check of custom comparators to support dynamic language switching.

## 2024-02-21 - i18next Object Creation Performance
**Learning:** `t('key', { returnObjects: true })` creates a new object reference on every render. If this is used to derive props for a large list of memoized components (like `QuestionBlock`), it breaks memoization completely, causing O(N) re-renders on every keystroke.
**Action:** Always memoize translation-derived objects using `useMemo(() => t(...), [t, i18n.language])` to ensure referential stability and prevent cascading re-renders.
