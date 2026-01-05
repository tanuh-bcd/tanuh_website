## 2024-02-19 - React Memoization and I18n
**Learning:** When using `React.memo` with a custom comparator in an app using `react-i18next`, failing to check `prev.t !== next.t` or `prev.data !== next.data` causes the component to freeze in the old language/data when the locale changes, even if the parent re-renders.
**Action:** Always include localization props (function `t` and data objects) in the dependency check of custom comparators to support dynamic language switching.

## 2024-02-24 - Recursive Memoization for Nested Forms
**Learning:** In recursive components (like `QuestionBlock` handling sub-questions), a blanket "always re-render if subquestions exist" policy defeats memoization for a large portion of the form.
**Action:** Use a recursive helper (`hasSubtreeChanged`) to check if any relevant data keys in the child subtree have actually changed. This restores O(N) re-renders (where N is changed fields) instead of O(Total) re-renders for every keystroke.
