## 2024-02-19 - React Memoization and I18n
**Learning:** When using `React.memo` with a custom comparator in an app using `react-i18next`, failing to check `prev.t !== next.t` or `prev.data !== next.data` causes the component to freeze in the old language/data when the locale changes, even if the parent re-renders.
**Action:** Always include localization props (function `t` and data objects) in the dependency check of custom comparators to support dynamic language switching.

## 2024-02-24 - Optimization of i18n Loading
**Learning:** The `preload` configuration in `i18next` forces immediate loading of all specified languages, causing a massive network spike on startup (30+ requests in this app).
**Action:** For the default language (English), import JSON files directly and bundle them using `resources`. Remove `preload` to let other languages load lazily on demand.
