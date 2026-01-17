## 2024-02-19 - React Memoization and I18n
**Learning:** When using `React.memo` with a custom comparator in an app using `react-i18next`, failing to check `prev.t !== next.t` or `prev.data !== next.data` causes the component to freeze in the old language/data when the locale changes, even if the parent re-renders.
**Action:** Always include localization props (function `t` and data objects) in the dependency check of custom comparators to support dynamic language switching.

## 2024-02-19 - Recursive Dependency Tracking in React.memo
**Learning:** Components with recursive children (like tree structures) often bypass memoization by force-returning `false` in comparators because tracking deep dependencies is hard. This causes massive over-rendering.
**Action:** Implement a lightweight recursive helper (like `hasSubtreeChanged`) that collects relevant dependency keys (IDs, conditions) to allow safe memoization of subtrees. Even an O(N) key collection is faster than O(N) React renders.
