## 2024-02-19 - React Memoization and I18n
**Learning:** When using `React.memo` with a custom comparator in an app using `react-i18next`, failing to check `prev.t !== next.t` or `prev.data !== next.data` causes the component to freeze in the old language/data when the locale changes, even if the parent re-renders.
**Action:** Always include localization props (function `t` and data objects) in the dependency check of custom comparators to support dynamic language switching.

## 2026-01-11 - Optimization of Recursive Components
**Learning:** Blindly disabling memoization (returning `false` in `arePropsEqual`) for components with children/sub-structures causes massive re-render waterfalls, especially in large forms where parent re-renders on every input.
**Action:** Implement recursive equality checks (`hasSubtreeChanged`) that inspect relevant data (values, validation state, conditions) for the entire subtree instead of bailing out. This maintains correctness while enabling significant performance gains.
