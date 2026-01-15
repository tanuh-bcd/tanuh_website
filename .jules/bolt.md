## 2026-01-15 - React.memo Recursion Optimization
**Learning:** When using `React.memo` on recursive components where the parent needs to pass updated data to children, simply "always re-rendering" when children exist (to ensure data propagation) is a massive performance kill.
**Action:** Implement a smart deep-check function (like `hasSubtreeChanged`) that traverses the configuration subtree to check if any *relevant* dependency (conditions or values) has changed, rather than invalidating the entire subtree. This turns O(N) re-renders into O(1) or O(d) (depth) for unrelated changes.
