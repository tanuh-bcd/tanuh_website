## 2024-02-19 - React Memoization and I18n
**Learning:** When using `React.memo` with a custom comparator in an app using `react-i18next`, failing to check `prev.t !== next.t` or `prev.data !== next.data` causes the component to freeze in the old language/data when the locale changes, even if the parent re-renders.
**Action:** Always include localization props (function `t` and data objects) in the dependency check of custom comparators to support dynamic language switching.
## 2026-01-20 - React.memo bail-out on subtree dependencies
**Learning:** React.memo comparators that blindly return false for complex props (like recursive subcomponents) can cause massive re-render waterfalls. In this app, QuestionBlock was bailing out for any question with subquestions, causing the entire form tree to re-render on every keystroke.
**Action:** Implement smart dependency tracking (using cached traversal helpers) to identify the specific data keys a subtree depends on, and only re-render if those specific values change.
