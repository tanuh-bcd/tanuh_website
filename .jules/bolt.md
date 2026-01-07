## 2026-01-07 - React i18next Object Stability
**Learning:** `i18next.t('key', { returnObjects: true })` returns a fresh object reference on every call. In React components, this breaks referential equality for props and dependencies, causing unnecessary re-renders of child components even if the translation content hasn't changed.
**Action:** Always wrap `t` calls returning objects in `useMemo`, with `[t, i18n.language]` as dependencies. This ensures stable references unless the language or translation function changes.
