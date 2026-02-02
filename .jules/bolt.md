## 2024-02-19 - React Memoization and I18n
**Learning:** When using `React.memo` with a custom comparator in an app using `react-i18next`, failing to check `prev.t !== next.t` or `prev.data !== next.data` causes the component to freeze in the old language/data when the locale changes, even if the parent re-renders.
**Action:** Always include localization props (function `t` and data objects) in the dependency check of custom comparators to support dynamic language switching.

## 2024-03-22 - [Optimization] Memoizing i18next Object Returns
**Learning:** `t('key', { returnObjects: true })` returns a new object reference on every render. If these objects are passed as props to memoized components (like `QuestionBlock`), it breaks memoization and causes the entire tree to re-render.
**Action:** Always wrap `t(..., { returnObjects: true })` calls in `useMemo` dependent on `[t, i18n.language]` when the result is passed down as props.
