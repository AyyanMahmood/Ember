# EmberFlow V2 Roadmap

**Prepared by:** Lead Product Architect
**Date:** 2026-08-06
**Source of truth:** Every item in this roadmap is a finding already documented in `V2_MASTER_AUDIT.md`. Nothing below is a new feature, a new page, or a new capability — this is exclusively the work required to close what the audit already found. Finding IDs (`MF-#`, `SEC-#`, `TD-#`, `PERF-#`, `UX-#`, `MOB-#`, `A11Y-#`) are cited throughout so every line of this roadmap traces back to a specific, already-written-up defect.

**On phase count vs. the example structure:** the request illustrated phases as Foundation → Dashboard → Clients → Invoices → Payments → Analytics → Polish. That shape is preserved, but the actual findings don't distribute evenly across those seven buckets — the audit surfaced far more Foundation-level and Billing/Subscriptions-level work than Dashboard- or Analytics-level work, and conflating "Foundation" (schema integrity, platform security, shared components) into one phase would make it too large to execute or sequence sensibly. This roadmap therefore uses **11 phases**: Foundation is split into three executable stages (data/schema, platform/security, design system), and Billing & Subscriptions is broken out as its own phase given it carries the single highest-severity finding in the whole audit (MF-7) plus 12 other findings. Every domain named in the example (Dashboard, Clients, Invoices, Payments, Analytics, Polish) still appears below, just alongside the additional phases the findings actually require.

**What's deliberately excluded:** `V2_MASTER_AUDIT.md`'s five 💡 Future Ideas (FUT-1 through FUT-5) are explicitly labeled "NOT for V2" in the source document and are not scheduled anywhere below — see the note at the end of this document. The audit's 🌐 SEO section reported zero open defects, so no SEO phase exists.

---

## Legend

**Severity / Effort** — inherited directly from `V2_MASTER_AUDIT.md`: Severity is Critical/High/Medium/Low; Effort is S (&lt;2 hrs) / M (&lt;1 day) / L (2–3 days) / XL (&gt;3 days or architectural). Phase-level "Estimated effort" below is an aggregate across that phase's findings, not a single number restated from the audit.

**Risk level** (phase-level, new to this document) — the likelihood and blast radius of something going wrong *while doing this phase's work*, not the severity of the underlying bug. A Low-severity finding can still sit inside a High-risk phase if the fix touches a sensitive shared file.

---

## Table of Contents

- [Phase 1 — Foundation: Data & Schema Integrity](#phase-1)
- [Phase 2 — Foundation: Platform, Security & Architecture](#phase-2)
- [Phase 3 — Design System & Shared Components](#phase-3)
- [Phase 4 — Billing & Subscriptions](#phase-4)
- [Phase 5 — Invoices](#phase-5)
- [Phase 6 — Payments](#phase-6)
- [Phase 7 — Proposals](#phase-7)
- [Phase 8 — Dashboard & Clients](#phase-8)
- [Phase 9 — Settings & Account](#phase-9)
- [Phase 10 — Analytics](#phase-10)
- [Phase 11 — Polish](#phase-11)
- [Critical Path](#critical-path)
- [Explicitly Excluded from V2](#excluded)

---

<a name="phase-1"></a>
## Phase 1 — Foundation: Data & Schema Integrity

### Objectives
Close every gap between what the database *actually* enforces and what the audit found it should enforce, and make the schema documentation trustworthy again before any other phase writes another line of SQL against it.

- **MF-6** — Regenerate `supabase/schema.sql` and `supabase/policies.sql` from a live `pg_dump`/`pg_policies` export (currently 9 migrations stale — missing Brand Studio, Polar billing, invoice-template gating, payment gating, and `past_due` access logic entirely).
- **MF-4** — Add `CHECK (amount > 0)`, `NOT NULL`, and a status-enum constraint to `payments`, matching the existing `invoices_status_check` pattern.
- **MF-5** — Add missing indexes: `payments.invoice_id`, `payments.user_id`, `proposal_items.proposal_id`.
- **TD-6** — Rewrite migrations `003_brand_studio.sql` and `005_expand_brand_fonts.sql` to be idempotent (`create or replace function`, `drop trigger if exists`, `drop constraint if exists`), matching the safe pattern already used in later migrations.
- **TD-7** — Normalize money-column precision/nullability: `payments.amount` and `proposal_items.amount` to `numeric(12,2)`; `invoices.discount_total` to `NOT NULL` (with a backfill).
- **TD-9** — Collapse `proposal_items`'s two overlapping RLS policy sets (one "are"-named, one not) into a single canonical set.

### Files affected
`supabase/schema.sql`, `supabase/policies.sql`, `supabase/migrations/003_brand_studio.sql`, `supabase/migrations/005_expand_brand_fonts.sql`, plus one new migration file for MF-4/MF-5/TD-7/TD-9.

### Dependencies
None. This is the first phase — every later phase that writes to `payments`, `proposal_items`, or reads current schema state depends on this one, not the reverse.

### Estimated effort
Aggregate **S** (6 findings, each individually S per the audit). Realistically 1–2 days including migration review and a staging dry-run, since these are schema/constraint changes on tables already holding production financial data.

### Risk level
**Medium.** Individually trivial changes, but they touch the `payments` table's write path in production. A `CHECK (amount > 0)` constraint added without first confirming no existing row violates it will fail the migration outright — verify against production data before applying, not after.

### Success criteria
- `schema.sql`/`policies.sql` grep-match every table/trigger/column introduced by migrations 002–012 (no more zero-hits for `past_due`, `polar_*`, `invoice_usage`, `webhook_events`).
- Migrations 003 and 005 can be replayed against a fresh database without error.
- A negative or zero `payments.amount` insert is rejected by the database, not just the UI.
- `EXPLAIN` on the invoice-detail and proposal-list queries shows index usage on `payments.invoice_id` and `proposal_items.proposal_id`.
- `proposal_items` has exactly one RLS policy per operation (4 total), not 8.

---

<a name="phase-2"></a>
## Phase 2 — Foundation: Platform, Security & Architecture

### Objectives
Close the security and architecture gaps that sit underneath every feature phase — API-layer trust boundaries, the frontend's data-fetching foundation, and the launch-verification gates that are non-engineering but still block calling V2 "done."

- **SEC-1** — Make `getBaseUrl()` fail closed when `APP_URL` is unset in production, matching `corsOrigin()`'s existing fail-closed pattern.
- **SEC-2** — Introduce a distinguishable "safe billing error" class so the five billing routes' broad try/catch can't forward an unbounded error message to the client.
- **SEC-5** — Upgrade `react-router-dom` to v7 to close the open-redirect advisory (a deliberate, scoped major-version bump, not a patch).
- **SEC-6** — Add a `user.id`-scoped rate-limit key alongside the existing IP key for authenticated routes; reconsider fail-open specifically for `account-delete` and `webhook`.
- **TD-1** — Adopt a shared data-fetching layer (e.g. TanStack Query) as the single way pages fetch data, replacing the ~12 pages that currently hand-roll loading/error state.
- **TD-2** — Add the same `mounted`/request-token guard `useAuth` already has to `useProfile` and `useSubscription`.
- **TD-11** — Extract the duplicated `authenticatedFetch` helper (currently copy-pasted in `services/subscriptions.js` and `services/account.js`) into one shared module.
- **TD-15** — Fix `signInWithGoogle`'s hardcoded `window.location.origin` redirect to use `authRedirectUrl()`/`VITE_APP_URL`, consistent with `signUp`/`resetPassword`.
- **TD-16** — Propagate `err.status` from `polarFetch` through the billing routes instead of hardcoding 400 for every failure.
- **PERF-1** — Scope `AuthProvider` to the auth + `/app/*` route subtree so marketing pages stop eagerly loading the Supabase client.
- **PERF-2** — Split the single monolithic 123KB CSS bundle so marketing pages stop shipping dashboard/table/modal CSS they never use.
- **PERF-4** — Add a `preconnect` hint for the Supabase origin.
- **PERF-5** — Revisit `vite.config.js`'s `manualChunks`/`build.target` configuration.
- **MF-11 / MF-12 / MF-13 / MF-14 / MF-15** — The five carried-forward launch/config gates: run `LAUNCH_QA.md` against a live Polar sandbox and one production purchase; confirm Polar production config (token scopes, webhook events, grace period, portal self-serve disabled); confirm migration `012_delete_account.sql` is applied to production; confirm Vercel production environment variables; confirm the Supabase Reset Password email template embeds `{{ .TokenHash }}`. **These five are not engineering tasks** — they require Vercel/Polar/Supabase dashboard access, not a code change, and should run on a separate track in parallel with all engineering work in this phase (see [Critical Path](#critical-path)).

### Files affected
`api/_utils/http.js`, `api/polar/checkout.js`, `api/polar/portal.js`, `api/polar/switch.js`, `api/polar/cancel.js`, `api/account/delete.js`, `api/_utils/rateLimit.js`, `frontend/src/hooks/useAuth.js`, `frontend/src/hooks/useProfile.js`, `frontend/src/hooks/useSubscription.js`, `frontend/src/services/subscriptions.js`, `frontend/src/services/account.js`, `frontend/src/main.jsx`, `frontend/src/styles/index.css`, `frontend/index.html`, `frontend/vite.config.js`, `frontend/package.json` (react-router-dom bump). Plus the external config surfaces for MF-11–15 (Vercel dashboard, Polar dashboard, Supabase dashboard — no repo files).

### Dependencies
Depends on **Phase 1** being merged first for the security fixes that touch the same billing route files migrations may also touch (SEC-1/SEC-2 land before Phase 4's MF-7 fix edits the same files, to avoid a merge conflict on `api/polar/*.js`). TD-1's data-fetching-layer decision should be made in this phase specifically because every later domain phase (4 through 10) will build its fixes on top of whichever pattern is chosen here — deciding it mid-roadmap would mean rework.

### Estimated effort
Aggregate **L/XL** — 18 findings, most S/M individually, but SEC-5 (react-router-dom v7 major bump) and TD-1 (the data-fetching layer, explicitly noted as "V2-scoped" in the audit) are both L on their own. Realistically 2–3 weeks of engineering, run in parallel with the non-engineering MF-11–15 track.

### Risk level
**High.** This phase changes the app's root composition (`AuthProvider` scope), the routing library (major version), and the data-fetching pattern every subsequent phase depends on. A mistake here has the widest blast radius of any phase in this roadmap short of Phase 1's schema work.

### Success criteria
- `APP_URL` unset in production causes billing routes to fail closed, not silently trust request headers.
- A non-billing-safe error thrown inside any of the five billing routes' try/catch no longer reaches the client verbatim.
- `npm audit` no longer flags the react-router-dom open-redirect advisory; all existing routes still resolve correctly post-upgrade.
- `rateLimit()` keys on `user.id` for authenticated routes; a Redis outage no longer silently removes all throttling from `account-delete`.
- At least one page (`useProfile`/`useSubscription` consumer) is verified to no longer show stale data after a fast account switch.
- `dist/index.html` no longer `modulepreload`s the Supabase vendor chunk on marketing-only routes; a Lighthouse run on `/` shows a measurable reduction in unused JS/CSS.
- `LAUNCH_QA.md` is fully checked off against a live Polar sandbox and one real production purchase; all five launch gates (MF-11–15) are confirmed closed, not just code-reviewed.

---

<a name="phase-3"></a>
## Phase 3 — Design System & Shared Components

### Objectives
Fix every defect in a component or hook that's reused across multiple pages — doing this once, here, means Phases 4 through 10 inherit the fix instead of each rediscovering (or re-touching) the same file.

- **MF-8** — Rebuild the native `<select>` chevron from current design tokens (`var(--color-muted)`/`var(--color-accent)`), replacing the hardcoded pre-rebrand hex colors visible on every form page.
- **MF-9** — Give `FeatureGate` a way to render a page's header unconditionally while gating only the body, so a Free user's first paint isn't a bare spinner with no page title.
- **UX-7** — Define `--color-on-accent` for real in `tokens.css`; reference it from both `.skip-link` and `.button--primary` instead of one token reference and one hardcoded hex.
- **MOB-1** — Add a `@media (pointer: coarse)` touch-target bump to `.side-link`, matching the pattern already used for `.icon-button--sm`/`.table__page`/`.modal-close`.
- **MOB-2** — Same touch-target fix for `EmberSelect`'s dropdown option rows.
- **A11Y-2** — Resolve `EmberSelect`'s dual `role="combobox"` (currently assigned to both the trigger button and the search input simultaneously) to one correct W3C APG pattern.
- **A11Y-3** — Add an `ariaLabel` prop to `Table`, defaulting to the current "Data table" string for back-compat, so each caller can pass a distinguishing label.
- **A11Y-4** — Give `Avatar`'s wrapping `<div>` a `role="img"` (or move the accessible name to an interactive ancestor) so its `aria-label` is actually exposed to the accessibility tree.
- **A11Y-5** — Make `Card` attach keyboard/role handling whenever `onClick` is present, regardless of `variant`, closing the latent keyboard-access gap.
- **A11Y-6** — Add `scope="col"` to every `<th>` render path in `Table.jsx`.
- **A11Y-9** — Remove the redundant duplicate `aria-live` wrapper around `LoadingSpinner` on the seven pages that currently double it up (`AnalyticsPage`, `BrandStudioPage`, `InvoiceDetailPage`, `InvoiceFormPage`, `SettingsPage`, `SubscriptionsPage`, `TemplatesPage`).
- **TD-3** — Make `document-studio/MobilePreviewSheet.jsx` consume the shared `useFocusTrap` hook instead of its own duplicated copy; make `useFocusTrap`'s scroll-lock reference-counted so it's safe with stacked overlays.

### Files affected
`frontend/src/styles/components/inputs.css`, `frontend/src/styles/tokens.css`, `frontend/src/styles/components/buttons.css`, `frontend/src/styles/layout.css`, `frontend/src/styles/components/sidebar.css`, `frontend/src/styles/components/select-menu.css`, `frontend/src/components/FeatureGate.jsx`, `frontend/src/components/ui/EmberSelect.jsx`, `frontend/src/components/ui/Table.jsx`, `frontend/src/components/ui/Avatar.jsx`, `frontend/src/components/ui/Card.jsx`, `frontend/src/hooks/useFocusTrap.js`, `frontend/src/document-studio/MobilePreviewSheet.jsx`, plus the seven page files touched by A11Y-9.

### Dependencies
Depends on **Phase 2**'s TD-1 decision if any of these components are being re-wired onto the new data-fetching pattern at the same time (not required, but doing both passes on `EmberSelect`/`Table` together avoids touching the same file twice). Does not depend on Phase 1.

### Estimated effort
Aggregate **M** — 12 findings, all S or S/M individually, none architecturally large. Realistically 1 week, but budget extra review time: every change here is a shared component, so each fix needs regression-checked against every page that consumes it (`EmberSelect` alone appears in Invoices, Proposals, Settings, and Subscriptions).

### Risk level
**Medium-High.** Low complexity per fix, but high *reach* — a regression in `Table.jsx` or `EmberSelect.jsx` doesn't stay contained to one page, it appears everywhere that component is used. Budget for a full click-through of every consuming page, not just unit-level verification.

### Success criteria
- Every native `<select>` chevron renders in the current accent/muted palette in both themes.
- A Free user opening Analytics/Proposals sees the page header immediately, with only the body region showing a loading spinner.
- `EmberSelect` and `.side-link` touch targets measure ≥44px under `pointer: coarse`.
- Screen-reader testing confirms `EmberSelect` announces as one coherent combobox pattern, not two competing roles.
- Each `Table` instance in the app can be independently identified by screen-reader region navigation.
- `Avatar`'s name is confirmed present in the accessibility tree (via browser dev tools' accessibility inspector, not just visual inspection).
- A `Card` with `onClick` and no `variant="interactive"` is keyboard-operable.
- Exactly one `aria-live` region wraps each loading spinner on all seven previously-affected pages.

---

<a name="phase-4"></a>
## Phase 4 — Billing & Subscriptions

### Objectives
Close the highest-severity, highest-blast-radius finding in the entire audit (MF-7) alongside the rest of the Polar integration's correctness, consistency, and mobile/accessibility gaps.

- **MF-7** — Add a circuit breaker to the Polar 404-triggered self-heal (`collapseToFreeAfterMissingSubscription`) used by `switch.js`, `cancel.js`, and `portal.js`: require two consecutive 404s (or a secondary signal) before mutating a user to Free, and log a structured, alertable event whenever it fires.
- **MF-10** — Set `EARLY_SUPPORTER_CUTOFF` to the actual launch date instead of the placeholder ~5 months past launch.
- **TD-8** — Drop the legacy `subscriptions.paddle_*` columns (the "post-verification cleanup" CLAUDE.md already flags as pending).
- **TD-13** — Fix `getUsageSummary`'s "this month" boundary to compute in local time rather than UTC, so Free-tier limits don't misfire at month boundaries in non-UTC timezones.
- **TD-23** — Close the duplicate-checkout TOCTOU with a short-lived idempotency key or DB lock on `checkout.js`'s 409 guard.
- **TD-24** — Add an "apply only if newer" (`modified_at` comparison) guard to `normalizeSubscription()` so an out-of-order webhook redelivery can't overwrite newer state.
- **TD-25** — Build a periodic Polar↔Supabase reconciliation job for accounts that never touch Switch/Cancel (the proactive counterpart to MF-7's reactive self-heal).
- **TD-26** — Decide whether to code-enforce the exact 15-day grace period or formally document that it's honored "with margin" via Polar's ~21-day window.
- **TD-27** — Finish root-causing the portal-cancellation webhook entitlement-sync gap (largely mitigated already by in-app cancel, but never fully closed).
- **TD-28** — Replace Switch/Cancel's ~12s bounded polling with a Supabase realtime subscription or optimistic local update.
- **UX-6** — Default the cadence picker and post-revoke "Resubscribe" CTA to the user's prior plan (or the catalog's highlighted plan) instead of always defaulting to Yearly.
- **UX-8** — Add a post-revoke recap message for a voluntary cancellation reaching period end (the involuntary failed-payment case already has one).
- **MOB-3** — Fix the usage-meter 2-column-on-mobile CSS specificity bug (`.plan-hero .subscription-grid` needs to match the mobile override's specificity).
- **MOB-4** — Add a tablet-width (2-column) step to the Pricing/Upgrade/Subscription grids instead of jumping straight from 3-column to 1-column at 920px.
- **A11Y-1** — Add full ARIA progressbar semantics to `ProgressRing`/`ProgressBar`, and a computed countdown label to the renewal ring specifically (currently a total information loss for screen-reader users on a billing page).

### Files affected
`api/polar/switch.js`, `api/polar/cancel.js`, `api/polar/portal.js`, `api/_utils/polar.js`, `api/polar/checkout.js`, `api/polar/webhook.js`, `frontend/src/utils/earlySupporter.js`, `frontend/src/services/api.js` (`getUsageSummary`), `frontend/src/pages/SubscriptionsPage.jsx`, `frontend/src/hooks/useSubscription.js`, `frontend/src/components/ui/ProgressRing.jsx`, `frontend/src/components/ui/ProgressBar.jsx`, `frontend/src/styles/components/subscriptions.css`, `frontend/src/styles/utilities.css`, `supabase/schema.sql` (paddle column drop migration).

### Dependencies
Depends on **Phase 1** (schema must be trustworthy before further billing-table migrations), **Phase 2** (SEC-1/SEC-2/SEC-6 land on the same `api/polar/*.js` files first — sequence this phase after Phase 2 merges to avoid conflicting edits to `switch.js`/`cancel.js`/`portal.js`), and **Phase 3** (A11Y-1's `ProgressRing` fix and the shared component baseline). This phase should not start until `verify:polar`'s 33/33 baseline is confirmed still green post-Phase-1/2.

### Estimated effort
Aggregate **L/XL** — 15 findings, five of them M (MF-7, TD-23, TD-24, TD-25, TD-27, TD-28). Realistically 2 weeks, and MF-7/TD-25 in particular warrant dedicated design review before implementation given the real-money consequences of getting the self-heal logic wrong a second time.

### Risk level
**Critical.** This is the only phase touching code that can silently move a real paying customer's account to Free. Every change here should ship behind the same rigor as the original Paddle→Polar migration: staged rollout, structured logging on the circuit breaker, and a live Polar sandbox re-test (not just `verify:polar`) before this phase is called done.

### Success criteria
- A simulated repeat of the documented `POLAR_SERVER`/`POLAR_ENVIRONMENT` misconfiguration incident no longer mass-downgrades users on the first 404 — it requires the circuit breaker's threshold and produces an alertable log line.
- `EARLY_SUPPORTER_CUTOFF` reflects the real launch date; no account created after it receives the badge.
- Two concurrent first-checkout requests from one Free user cannot create two Polar subscriptions.
- A late-redelivered, out-of-order webhook event cannot overwrite newer subscription state.
- A reconciliation job runs on a schedule and correctly flags at least one deliberately-desynced test account.
- The cadence picker defaults to the user's actual prior plan when one exists.
- Usage-meter cards render at 1 column on mobile; Pricing/Subscription grids show a 2-column tablet step.
- A screen reader announces the renewal countdown, not just a decorative icon.
- `verify:polar` remains 33/33 (or is extended to cover the circuit breaker and reconciliation job) at the end of this phase.

---

<a name="phase-5"></a>
## Phase 5 — Invoices

### Objectives
Fix the two real data-integrity bugs on the highest-traffic mutating page in the app, plus the invoice-specific polish/mobile findings.

- **MF-2** — Replace `Promise.all` with `Promise.allSettled` for bulk delete/mark-paid, reload the list regardless of outcome, and report which specific rows failed.
- **MF-3** — Add an `update_invoice_with_items` RPC mirroring `create_invoice_with_items`'s atomic pattern, closing the gap where a failed edit can leave a real invoice with zero line items.
- **TD-14** — Add collision retry (or a clear error) to `nextInvoiceNumber`'s random-suffix generation.
- **MOB-5** — Fix the template-picker keyboard-navigation breakpoint mismatch in `document-studio/TemplateSelector.jsx` (shared with Proposals — see Phase 7).
- **UX-1** (Invoices portion) — Replace `InvoiceDetailPage`'s full-page replace-on-fetch-failure with a scoped inline error banner that preserves the page header.

### Files affected
`frontend/src/pages/InvoicesPage.jsx`, `frontend/src/services/api.js` (`updateInvoice`), `supabase/schema.sql` (new RPC migration), `frontend/src/utils/invoice.js`, `frontend/src/document-studio/TemplateSelector.jsx`, `frontend/src/pages/InvoiceDetailPage.jsx`.

### Dependencies
Depends on **Phase 1** (schema/migration hygiene should be settled before adding another RPC) and **Phase 3** (Table/select-chevron fixes land first so this phase isn't re-touching the same list/table markup twice). MOB-5's fix in this phase is inherited by **Phase 7** (Proposals) at no extra cost, since `TemplateSelector.jsx` is one shared file.

### Estimated effort
Aggregate **M** — 5 findings; MF-3 (M) is the only non-trivial item, the rest are S.

### Risk level
**High** for MF-3 specifically (the RPC change touches the invoice-edit write path directly, on real financial documents that may already be sent/paid) — **Low** for the rest.

### Success criteria
- A partial failure during bulk mark-paid/delete leaves the UI and database in agreement, with the specific failed rows named to the user.
- A simulated failure between `invoice_items` delete and re-insert during an edit no longer leaves an invoice with zero line items — the whole update is atomic.
- Two invoices created on the same day for the same user cannot collide on invoice number without a clear retry/error.
- Keyboard-only template selection works correctly across the full viewport range, including the previously-broken ~40px band.

---

<a name="phase-6"></a>
## Phase 6 — Payments

### Objectives
Close the race condition in invoice payment-status derivation — the one remaining data-integrity gap in the payment-tracking feature after Phase 1's constraint work lands.

- **TD-4** — Fold `createPayment`/`deletePayment`'s insert-then-refetch-then-recompute sequence into a single `SELECT ... FOR UPDATE` RPC (or a database trigger deriving `invoices.status` from `payments`), closing the lost-update race between two concurrent payment writes on the same invoice.

### Files affected
`frontend/src/services/api.js` (`createPayment`, `deletePayment`), `supabase/schema.sql` (new RPC or trigger migration).

### Dependencies
Depends on **Phase 1** (MF-4's new CHECK constraints and MF-5's new indexes on `payments` should be live before this phase adds a new RPC against the same table — building the atomic-write RPC before the column constraints exist means re-testing it twice).

### Estimated effort
**M** — a single finding, but it requires either a new RPC or a new trigger, plus careful testing of the paid/unpaid status transition in both directions.

### Risk level
**Medium.** Small surface area (two functions, one table), but it's the mechanism that decides whether a real invoice is marked paid — worth a deliberate test pass for concurrent writes specifically, not just the happy path.

### Success criteria
- Two payments recorded against the same invoice in quick succession (simulated concurrent requests) cannot produce a lost update — the invoice's paid status always reflects the sum of all recorded payments.
- Deleting a payment that drops the total below the invoice amount correctly reverts status from `paid` back to `sent`, with no race window.

---

<a name="phase-7"></a>
## Phase 7 — Proposals

### Objectives
Bring Proposals' data-integrity guarantee up to parity with Invoices, and close the one UX gap between the two otherwise-parallel document editors.

- **TD-5** — Add a `create_proposal_with_items` RPC mirroring the invoice pattern, closing the orphaned-proposal risk when the two-step insert fails partway.
- **UX-4** — Add the same real-time "excluded" warning for an incomplete line item that the invoice editor already has.

### Files affected
`frontend/src/services/api.js` (`createProposal`), `supabase/schema.sql` (new RPC migration), `frontend/src/pages/ProposalFormPage.jsx`.

### Dependencies
Depends on **Phase 1** (schema/migration hygiene) and **Phase 3** (MF-9's `FeatureGate` fix — `ProposalFormPage` and `ProposalsPage` are both `FeatureGate` consumers and should inherit the corrected loading behavior rather than this phase re-fixing it). Inherits **Phase 5**'s MOB-5 fix to `TemplateSelector.jsx` at no additional cost.

### Estimated effort
**M** — two findings, TD-5 being the larger of the two (new RPC + migration).

### Risk level
**Medium.** Same class of risk as Phase 6 — a new atomic-write RPC needs real testing, though the blast radius (an orphaned proposal row) is lower-severity than Payments' or Invoices' equivalents since no existing data can be destroyed, only a new row left incomplete.

### Success criteria
- A simulated failure between the proposal insert and the `proposal_items` insert leaves no orphaned proposal row — the whole create is atomic.
- The proposal line-item editor shows the same real-time excluded-row warning the invoice editor shows for an incomplete row.
- `ProposalFormPage`/`ProposalsPage` visibly inherit Phase 3's `FeatureGate` header-preservation fix with no additional code changes required in this phase.

---

<a name="phase-8"></a>
## Phase 8 — Dashboard & Clients

### Objectives
Fix the currency-arithmetic bug on the first screen a user sees after login, and the two related UI-polish findings on the same pages.

- **MF-1** — Extract `AnalyticsPage`'s already-correct dominant-currency-with-exclusion logic into a shared utility (`utils/currencyAggregate.js`) and use it in `DashboardPage` and `ClientDetailPage` instead of the naive cross-currency sum.
- **UX-1** (Dashboard/ClientDetail portion) — Replace the full-page replace-on-fetch-failure with a scoped inline error banner on both pages.
- **UX-2** — Fix the minor layout shift on Dashboard/ClientDetail stat cards between the loading and loaded state.

### Files affected
`frontend/src/pages/DashboardPage.jsx`, `frontend/src/pages/ClientDetailPage.jsx`, `frontend/src/pages/AnalyticsPage.jsx` (source of the logic being extracted, read-only reference), new file `frontend/src/utils/currencyAggregate.js`.

### Dependencies
Depends on **Phase 2** (if TD-1's data-fetching layer is adopted, these two pages' fetch logic should be rewritten once against the new pattern rather than patched twice — fix the currency bug and adopt the new fetching pattern in the same pass if timing allows). Does not depend on Phase 1.

### Estimated effort
**S** — three findings, all S individually. The smallest domain phase in this roadmap.

### Risk level
**Low.** Contained to two pages and one new utility file; the fix itself (using an already-correct, already-shipped algorithm) carries little implementation risk — the risk is purely "did we wire it in correctly," verifiable by comparing before/after totals against known multi-currency test data.

### Success criteria
- A test account with invoices in two currencies shows a correctly-labeled, single-currency total on Dashboard and Client Detail (matching Analytics' existing correct behavior), with any excluded-currency invoices clearly noted rather than silently summed in.
- Dashboard/ClientDetail show a scoped error banner (not a full-page replacement) on a simulated fetch failure, with the page header still visible.
- No visible layout shift on stat cards between loading and loaded states.

---

<a name="phase-9"></a>
## Phase 9 — Settings & Account

### Objectives
Close the account-deletion messaging gap and the residual Brand Studio SVG upload risk, plus two small accessibility fixes on the same surfaces.

- **SEC-3** — Track whether the Polar subscription revoke step actually succeeded before account deletion fails at the RPC step, so the error message doesn't claim "nothing was changed" when a real subscription was already canceled.
- **SEC-4** — Run a one-time production Storage audit query against the `logos` bucket for any SVG uploaded between migration 004 (which allowed SVG) and migration 009 (which blocked it), and remediate any survivors — a residual stored-XSS risk.
- **A11Y-7** — Give color-swatch buttons a descriptive accessible label instead of announcing a raw hex code.
- **A11Y-8** — Fix the delete-account dialog losing its accessible name during the deleting/success transition.

### Files affected
`api/account/delete.js`, `frontend/src/components/DeleteAccountModal.jsx`, Brand Studio color-picker component (`frontend/src/document-studio/ColorPicker.jsx` or `frontend/src/pages/BrandStudioPage.jsx`, whichever owns the swatch buttons), plus a one-time Supabase Storage query for SEC-4 (an operational action, not a code change, similar in kind to MF-11–15).

### Dependencies
Depends on **Phase 2** for SEC-3 specifically — it shares `api/account/delete.js` with Phase 2's SEC-2 (safe-error-message class), so sequencing this phase after Phase 2 avoids two separate passes over the same error-handling code in that file.

### Estimated effort
**S** — four findings, all S. The smallest-effort phase alongside Phase 8, though SEC-4's production Storage query needs coordination with whoever has Supabase dashboard access.

### Risk level
**Medium** for SEC-4 specifically (a production data query and potential remediation of user-uploaded files — needs care not to remove a legitimately-reused legacy logo by mistake), **Low** for the other three.

### Success criteria
- An account-deletion failure after a successful Polar revoke shows an accurate message reflecting that the subscription was in fact canceled.
- The production `logos` bucket has zero objects with `Content-Type: image/svg+xml` remaining after remediation.
- Screen readers announce a descriptive label for each color swatch, not a raw hex string.
- The delete-account dialog retains a stable accessible name through the deleting → success transition.

---

<a name="phase-10"></a>
## Phase 10 — Analytics

### Objectives
Verify Analytics correctly inherits the one shared-component fix that affects it — no Analytics-specific defects exist in the audit beyond this.

- **MF-9** (Analytics portion) — `AnalyticsPage.jsx` is one of `FeatureGate`'s three consumers; this phase is verification that it correctly inherits Phase 3's header-preservation fix, not new implementation work.

### Files affected
`frontend/src/pages/AnalyticsPage.jsx` (verification only — no changes anticipated beyond what Phase 3 already made to `FeatureGate.jsx`).

### Dependencies
Depends entirely on **Phase 3**. Cannot start meaningfully before it.

### Estimated effort
**S** — verification only; effectively zero net-new implementation.

### Risk level
**Low.**

### Success criteria
- A Free user opening Analytics sees the page header immediately, with only the body region gated — confirmed by direct click-through, not just code review, since this is the one place in the roadmap where "the fix landed elsewhere" needs an explicit check rather than being assumed.

---

<a name="phase-11"></a>
## Phase 11 — Polish

### Objectives
Clear the remaining low-severity, low-risk findings — dead code, stale docs, minor content mismatches, and small cosmetic gaps. Every item here is independent of every other item in this phase and most are independent of every other phase in this roadmap, making this the natural place to absorb spare capacity throughout the roadmap rather than treating it as strictly "last."

- **TD-10** — Remove the unused `FREE_THEME_IDS` export.
- **TD-12** — Fix the Terms of Service's "14 days" language to match the actual 15/21-day grace policy.
- **TD-17** — Regenerate or retire `DESIGN_SYSTEM.md`/`EMBER_DESIGN_BIBLE.md`, which still describe the pre-rebrand cream/light palette.
- **TD-18** — Remove `ProgressRing`'s tautological ternary (`variant={subscription.isPro ? 'accent' : 'accent'}`).
- **TD-19** — Implement or remove `Drawer`'s inert `size` prop.
- **TD-20** — Give `EmptyState`'s `illustration` prop real callers, or remove it.
- **TD-21** — Re-extract the `info` medallion status into the Ember UI `modal-dialog` module.
- **TD-22** — Reconcile the `/features` page's drifted, shorter feature list with the homepage's list.
- **TD-29** — Update `SECURITY.md`'s stale CORS wildcard-fallback finding (already fixed in code, not yet reflected in the doc).
- **TD-30** — Remove `ContactPage`'s link to Supabase's own developer documentation.
- **PERF-3** — Remove the two unused Inter 800/900 font-weight imports.
- **UX-3** — Fix decorative external-link icons wrapping onto their own line on Terms/Privacy/Contact.
- **UX-5** — Fix the Brand Studio color-picker popover rendering off-screen near a narrow viewport's right edge.

### Files affected
`frontend/src/document-studio/themes.js`, `frontend/src/pages/TermsPage.jsx`, `DESIGN_SYSTEM.md`, `EMBER_DESIGN_BIBLE.md`, `frontend/src/pages/SubscriptionsPage.jsx`, `frontend/src/components/ui/Modal.jsx`, `frontend/src/components/ui/EmptyState.jsx`, local `Modal`/`ConfirmDialog` component and the Ember UI `modal-dialog` module (external repo), `frontend/src/pages/FeaturesPage.jsx`, `frontend/src/data/features.js` (or landing page's equivalent list), `SECURITY.md`, `frontend/src/pages/ContactPage.jsx`, `frontend/src/main.jsx`, various legal-page CSS, Brand Studio color-picker component.

### Dependencies
None of substance — every item in this phase can be picked up independently, by anyone, at any point once its owning phase's larger work isn't actively mid-flight on the same file. This phase has no blocking relationship with any other phase in either direction.

### Estimated effort
Aggregate **M** — 13 findings, all S. Roughly a week if done as a single batch, but realistically absorbed piecemeal alongside other phases.

### Risk level
**Low** across the board — no finding in this phase touches a shared component, a data write path, or a security boundary.

### Success criteria
- Each of the 13 items above is independently verifiable against its own one-line description in `V2_MASTER_AUDIT.md`; no shared success criterion applies across the phase beyond "matches the audit's stated recommended solution."

---

<a name="critical-path"></a>
## Critical Path

### What blocks other work

1. **Phase 1 (Data & Schema Integrity) blocks Phases 4, 5, 6, and 7.** Every one of those phases either adds a new migration/RPC or relies on constraints Phase 1 introduces (MF-4's CHECK constraints, MF-5's indexes). Starting Billing, Invoices, Payments, or Proposals work before Phase 1 lands risks building new atomic-write RPCs against a schema that's about to change underneath them.

2. **Phase 2 (Platform, Security & Architecture) blocks Phase 4 directly, and shapes the implementation of Phases 5 through 10 indirectly.** Phase 4's MF-7 fix edits the same `api/polar/*.js` files Phase 2's SEC-1/SEC-2/SEC-6 already touch — sequencing Phase 2 first avoids a conflicting rewrite of the same error-handling code twice. More broadly, **TD-1's data-fetching-layer decision is the single highest-leverage sequencing dependency in this roadmap**: every domain phase (4–10) currently hand-rolls its own fetch/loading/error state, and if V2 adopts a shared library (as TD-1 recommends), every one of those phases' implementations should be written against it from the start rather than migrated afterward.

3. **Phase 3 (Design System & Shared Components) blocks parts of Phases 4, 5, 7, 8, and 10.** Specifically: Phase 4 depends on Phase 3's `ProgressRing` accessibility fix (A11Y-1); Phase 5 and Phase 7 both depend on Phase 3's `Table`/native-`<select>` fixes to avoid re-touching list/form markup twice; Phase 7 and Phase 10 both depend on Phase 3's `FeatureGate` fix (MF-9), since both are direct consumers.

4. **Phase 6 depends on Phase 1's `payments` constraints landing before its new RPC is built**, so the RPC is tested against the final schema, not an intermediate one.

5. **The five launch-verification gates (MF-11–15, inside Phase 2) are themselves a hard blocker on calling V2 "shippable,"** independent of every code-level phase above. Every other phase in this roadmap can be 100% complete and V2 is still not launch-ready until a real Polar transaction has been run and production config is confirmed.

### What can be done in parallel

- **MF-11 through MF-15 (the launch-verification gates) should start on day one, in parallel with Phase 1's engineering work**, not sequenced after it. They require dashboard access (Vercel, Polar, Supabase), not code changes, and have zero dependency on anything else in this roadmap.
- **Once Phases 1, 2, and 3 are merged, Phases 4 through 9 are largely independent of each other** — different files, different pages, no shared write paths between them (Billing/Subscriptions, Invoices, Payments, Proposals, Dashboard/Clients, and Settings/Account touch six genuinely separate parts of the schema and UI). These six phases are the natural place to parallelize across separate engineers or workstreams once the three Foundation phases are done.
- **Phase 6 (Payments) and Phase 7 (Proposals) are small enough, and independent enough of each other, to run as a single combined workstream** if headcount is tight — neither blocks the other and their combined scope (3 findings total) is comparable to a single mid-sized phase elsewhere in this roadmap.
- **Phase 11 (Polish) has no dependencies in either direction and can be worked continuously from day one** by anyone with spare capacity — there is no reason to wait until every other phase is done to start clearing it, despite its position at the end of this document reflecting priority, not sequencing.
- **Phase 10 (Analytics) is a single verification step** and can be checked the moment Phase 3 merges, without waiting for Phases 4–9.

### Suggested execution order (respecting the above)

```
Day 1:        Phase 1 (Data & Schema) starts.  MF-11–15 (launch gates) start in parallel, external track.
Week 1–3:     Phase 2 (Platform/Security/Architecture) starts once Phase 1 is merged.
Week 3–4:     Phase 3 (Design System) starts once Phase 2's TD-1 decision is made.
Week 4 on:    Phases 4, 5, 6+7 (combined), 8, 9 run in parallel across available engineers,
              each gated only on Phases 1–3 being merged. Phase 10 is checked off as soon as
              Phase 3 lands. Phase 11 runs continuously throughout as spare-capacity work.
Ongoing:      MF-11–15 must all be confirmed closed before V2 is considered launch-ready,
              regardless of how far the engineering phases have progressed.
```

---

<a name="excluded"></a>
## Explicitly Excluded from V2

`V2_MASTER_AUDIT.md`'s 💡 Future Ideas section lists five items the audit itself labels "explicitly NOT for V2": SPA SSR/prerendering (FUT-1), a Proposals edit route (FUT-2), a proration-preview in the plan-switch dialog (FUT-3), a handful of narrow low-frequency edge cases (FUT-4), and running a live Lighthouse baseline as a first V2 action rather than a fix (FUT-5). None of these appear in any phase above, consistent with the audit's own scoping and this roadmap's instruction not to invent new work beyond what the audit found.
