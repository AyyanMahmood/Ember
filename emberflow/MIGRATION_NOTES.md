# Migration Notes — Discoveries During Execution

Append new findings here after each PR. Do NOT edit earlier entries.

---

## PR 2

- **StatCard ignores children.** `StatCard` does not destructure `children`. Passing children between `<StatCard>` tags is silently dropped. The existing AnalyticsPage pattern `<StatCard>...icon...</StatCard>` is a pre-existing visual bug.
- **LoadingSpinner `label` is screen-reader-only.** Canonical `LoadingSpinner` wraps `label` in `<span className="sr-only">`. Text is not visible to sighted users. This is intended behavior.
- **Password toggle in `rightAddon` has an a11y gap.** The `rightAddon` renders inside `<span aria-hidden="true">`, so any interactive element inside (e.g., a password eye toggle) is not announced to screen readers. The toggle still works for sighted users.
