# EmberFlow V2 Master Audit

**Prepared by:** Engineering audit (CTO pass), ahead of V2
**Date:** 2026-08-06
**Method:** Full read of `frontend/`, `api/`, `supabase/`, and root config/docs, split across five parallel deep-dive passes (frontend architecture, UI/UX/accessibility/mobile, backend/API/billing security, database/RLS, SEO/performance), each cross-checked against the prior audit trail (`KNOWN_ISSUES.md`, `LAUNCH_READINESS_REPORT.md`, `PRODUCTION_VALIDATION_PLAN.md`, `SECURITY.md`, `V1.5_ROADMAP.md`, `docs/archive/MIGRATION_AUDIT.md`) to avoid re-reporting fixed or already-tracked work. No code was modified to produce this document.

**Status:** This document supersedes `KNOWN_ISSUES.md` as the canonical engineering-issue tracker going into V2. `KNOWN_ISSUES.md` should be considered folded into this file; genuinely fixed items (e.g. migration 007 confirmation, the Brand Studio free-tier bug) were dropped rather than carried forward. `LAUNCH_READINESS_REPORT.md`/`PRODUCTION_VALIDATION_PLAN.md`/`V1.5_ROADMAP.md` remain useful for their launch-process and roadmap-planning content respectively and are not superseded — only their *findings* are consolidated here.

---

## Executive Summary

EmberFlow V1 is, on the whole, unusually well-engineered for its stage: extensive inline rationale comments, deliberate handling of subtle races (bfcache, OAuth PKCE, StrictMode double-invoke), a real design-token system, and two hand-rolled verification scripts (`verify:polar`, `verify:account-deletion`) covering the trickiest business logic. The findings below are what survived that baseline, not low-hanging fruit — several are genuine, previously-undiscovered correctness bugs on money-handling code paths.

**Counts by category:**

| Category | Count |
|---|---|
| 🔥 Must Fix Before V2 (code) | 10 |
| 🔥 Must Fix Before V2 (carried-forward launch/config gates) | 5 |
| 🔒 Security | 6 |
| 🧹 Technical Debt | 30 |
| ⚡ Performance | 5 |
| 🎨 UI / UX | 8 |
| 📱 Mobile | 5 |
| ♿ Accessibility | 10 |
| 🌐 SEO | 0 open defects |
| 💡 Future Ideas | 5 |

**The four highest-stakes findings**, in order of blast radius:

1. **[MF-7](#mf-7)** — Polar's 404-triggered "self-heal" (used by Switch/Cancel/Portal) has no circuit breaker. A repeat of the `POLAR_SERVER` misconfiguration incident already documented in code comments would now **silently downgrade every paying customer who touches billing** during the window, not just fail loudly.
2. **[MF-1](#mf-1)** / **[MF-3](#mf-3)** — Dashboard/Client Detail sum revenue across currencies into one arithmetically wrong number, and `updateInvoice()` can delete all of an invoice's line items with no rollback on a partial failure. Both are real, live-today bugs on financial data, not edge cases.
3. **[MF-4](#mf-4)** — The `payments` table has zero CHECK constraints; nothing server-side stops a negative or zero payment amount from corrupting an invoice's paid-status arithmetic.
4. **[MF-6](#mf-6)** — `schema.sql`/`policies.sql` are 9 migrations out of date. Anyone (human or AI) designing V2 off those files instead of the migrations directory will omit Brand Studio, Polar billing, invoice-template gating, payment gating, and `past_due` access logic entirely.

Everything else is meaningful but lower-severity — see full findings below.

---

## Table of Contents

- [🔥 Must Fix Before V2](#must-fix-before-v2)
  - [Code-level bugs](#code-level-bugs)
  - [Carried-forward launch/config verification gates](#launch-gates)
- [🔒 Security](#security)
- [🧹 Technical Debt](#technical-debt)
- [⚡ Performance](#performance)
- [🎨 UI / UX](#ui-ux)
- [📱 Mobile](#mobile)
- [♿ Accessibility](#accessibility)
- [🌐 SEO](#seo)
- [💡 Future Ideas (explicitly not for V2)](#future-ideas)

**Legend — Severity:** Critical / High / Medium / Low. **Effort:** S (&lt;2 hrs) · M (&lt;1 day) · L (2–3 days) · XL (&gt;3 days / architectural).

---

<a name="must-fix-before-v2"></a>
## 🔥 MUST FIX BEFORE V2

Real bugs, architectural problems, data-corruption risks, and launch-blocking security issues.

<a name="code-level-bugs"></a>
### Code-level bugs

<a name="mf-1"></a>
#### MF-1 — Dashboard and Client Detail sum revenue across currencies into one meaningless number
**Files:** `frontend/src/pages/DashboardPage.jsx:45-56`, `frontend/src/pages/ClientDetailPage.jsx:53-63`
**Description:** Both pages do `invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0)` over every invoice regardless of currency, then label the result with whichever currency the *first* invoice happens to have. `InvoiceFormPage.jsx:294` lets a user pick any of ~150 currencies per invoice, so a freelancer billing in USD and EUR sees a Dashboard total that's literally `2000 USD + 2300 EUR` added as raw numbers and mislabeled.
**Why it matters:** `AnalyticsPage.jsx:34-60` already solves this correctly (dominant-currency-with-exclusion, with an inline comment explicitly explaining why naive summing is "arithmetically wrong," not just imprecise) — the fix exists in the same codebase and simply wasn't applied to the other two pages doing the identical aggregation. This is a wrong number on the *first screen a user sees after login*, on a finance product.
**Recommended solution:** Extract Analytics' dominant-currency logic into a shared `utils/currencyAggregate.js` and reuse it on Dashboard and Client Detail.
**Severity:** High **Effort:** S

<a name="mf-2"></a>
#### MF-2 — Bulk invoice actions can partially fail with no reload and no indication of which rows succeeded
**File:** `frontend/src/pages/InvoicesPage.jsx:136-161` (`confirmBulkDelete`, `bulkMarkPaid`)
**Description:** Both use `Promise.all()` over per-row requests. If any one request fails, `Promise.all` rejects immediately, but the others already in flight mostly still complete server-side. The catch path sets one generic error and never reloads — the table keeps showing stale data (some rows already deleted/marked-paid, displayed as untouched), and `selectedKeys` isn't cleared, so a retry re-submits already-succeeded IDs.
**Why it matters:** For a billing product, "the UI silently disagrees with the database after a partial bulk failure" is a data-trust problem — a user could re-delete or re-mark-paid rows, or believe an action failed entirely when most of it succeeded.
**Recommended solution:** Use `Promise.allSettled`, reload the list regardless of outcome, and report which specific rows failed by invoice number.
**Severity:** High **Effort:** S

<a name="mf-3"></a>
#### MF-3 — `updateInvoice()` is a non-atomic 3-step client sequence that can delete all line items on partial failure
**File:** `frontend/src/services/api.js:217-237`
**Description:** Update runs as three separate round-trips — update the invoice row, delete all `invoice_items`, insert the new rows — with no database transaction. If the delete succeeds but the insert fails (network drop, an RLS/trigger rejection such as the free-tier template clamp), the invoice is left with **zero line items**, and nothing rolls back. Contrast with `createInvoice`, which correctly routes through the atomic `create_invoice_with_items` RPC (`supabase/schema.sql:40-179`).
**Why it matters:** This is the invoice *edit* path — the highest-traffic mutating operation in the app, on documents that may already be sent or paid. A transient failure mid-sequence corrupts a real invoice with no rollback and no clear warning.
**Recommended solution:** Add an `update_invoice_with_items(p_invoice_id, p_invoice, p_items)` RPC mirroring `create_invoice_with_items`'s transactional pattern.
**Severity:** High **Effort:** M

<a name="mf-4"></a>
#### MF-4 — `payments` table has zero CHECK constraints on financial columns
**File:** `supabase/schema.sql:441-456` (contrast with `invoice_items` at `:385-387`, which has `price >= 0`, `quantity > 0`, `tax_rate >= 0`)
**Description:** `payments.amount` (nullable numeric, default 0), `payments.status`, `payments.currency`, and `payments.method` have no CHECK constraints at all. Only ownership RLS and a migration-011 Pro-only trigger gate inserts — neither validates the value. `min="0.01"` is enforced client-side only (`InvoiceDetailPage.jsx:320`).
**Why it matters:** Any authenticated user going around the UI (direct `supabase-js` call) can insert a negative/zero payment amount or an arbitrary status string against their own invoice. `createPayment` sums `payments.amount` client-side to decide when to flip an invoice to `"paid"` (`services/api.js:283-296`) — a negative amount corrupts that arithmetic, silently breaking the core "payment tracking" feature's bookkeeping.
**Recommended solution:** Add `CHECK (amount > 0)`, `NOT NULL`, and a status enum CHECK, mirroring the pattern already used on `invoices_status_check`.
**Severity:** High **Effort:** S

<a name="mf-5"></a>
#### MF-5 — Missing indexes on high-traffic FK columns: `payments.invoice_id`, `payments.user_id`, `proposal_items.proposal_id`
**File:** `supabase/schema.sql:731-804` (full index list — no `payments` or `proposal_items` index exists anywhere in the schema or any migration)
**Description:** Both tables have a primary key only, despite being hit via embedded PostgREST joins on every invoice-detail (`services/api.js:191`) and proposal-list (`services/api.js:314`) load, and despite every RLS check on `payments` filtering by `user_id` with no supporting index.
**Why it matters:** Invisible at today's data volume; becomes a real production slowdown (sequential scans on every invoice-detail/proposal-list load) as clients accumulate invoices and payments. Cheap to fix now, expensive to diagnose later.
**Recommended solution:** `CREATE INDEX payments_invoice_id_idx ON public.payments (invoice_id);` + `payments_user_id_idx` + `proposal_items_proposal_id_idx`.
**Severity:** Medium **Effort:** S

<a name="mf-6"></a>
#### MF-6 — `schema.sql` and `policies.sql` are severely stale — 9 migrations out of date
**File:** `supabase/schema.sql` (mtime predates migration 002), `supabase/policies.sql`
**Description:** Grepping both files for terms introduced by every migration after 001 returns zero hits for `past_due`, `polar`, `enforce_payments`, `enforce_invoice_template` — and `policies.sql` doesn't even mention `invoice_usage` or `webhook_events`. Neither file reflects Brand Studio, Polar billing, invoice-template gating, payment gating, or `past_due` access logic — all shipped and live.
**Why it matters:** This is a documentation-trust risk specifically dangerous for a V2 audit/rewrite: an engineer (or AI) designing V2 off these files as "the schema" would omit six-plus real, live features and get RLS policy shape wrong (see MF-9/TD-9 below).
**Recommended solution:** Regenerate both from a live `pg_dump --schema-only` + a `pg_policies` dump before any V2 schema design starts; treat the `migrations/` directory as sole source of truth until then.
**Severity:** Critical **Effort:** S

<a name="mf-7"></a>
#### MF-7 — Polar's 404-triggered self-heal has no circuit breaker against false positives
**Files:** `api/polar/switch.js:57-64`, `api/polar/cancel.js:49-56`, `api/polar/portal.js:85-116`, `api/_utils/polar.js:195-213`
**Description:** All three routes treat any 404 from Polar as conclusive proof a stored `polar_subscription_id`/`polar_customer_id` is stale, and react destructively: Switch/Cancel immediately collapse the user to Free; Portal silently creates a brand-new Polar customer. There's no retry, no secondary confirmation, and no distinction between "this ID is genuinely gone" and "this 404 is a symptom of a wider outage or misconfiguration." The codebase's own comments confirm this exact failure mode already happened once in production (`api/_utils/polar.js:12-27` documents a real `POLAR_SERVER`/`POLAR_ENVIRONMENT` mix-up incident).
**Why it matters:** This is the single highest-blast-radius bug class on the billing surface. A repeat of the documented config mistake would now silently and automatically downgrade **every paying customer who touches Switch or Cancel** during the misconfigured window — with no alert, just a `console.error` line in logs. It's the false-positive counterpart to the already-known missing-reconciliation gap (TD-25): that item covers stale rows that never get caught; this is a self-heal that fires when it shouldn't.
**Recommended solution:** Require two consecutive 404s across a short window (or a cheap secondary signal) before mutating state; log a structured, alertable event whenever the self-heal fires; consider a volume-based kill switch (if it fires for N+ users in a short window, that's a config incident, not N independent stale rows).
**Severity:** High **Effort:** M

<a name="mf-8"></a>
#### MF-8 — Native `<select>` chevron hardcoded to the pre-dark-first palette, wrong color on every form page
**File:** `frontend/src/styles/components/inputs.css:83,92`
**Description:** The `.select` and `.select:focus-visible` chevron SVGs are hardcoded data-URIs using `#6D675D` and `#3B82F6` — the old cream-theme `--muted`/`--blue` values. Neither exists anywhere in current `tokens.css` (dark: `--color-muted:#8B93A3`/`--color-accent:#C0603A`). Every native `<select>` (via `Select` in `Input.jsx`, and `Table.jsx`'s page-size picker) renders an off-brand chevron, in both themes, on ClientFormPage, InvoiceFormPage, InvoicesPage, InvoiceDetailPage, ProposalFormPage, SettingsPage, and every paginated table.
**Why it matters:** A visible, verifiable rendering bug on effectively every page with a form — a leftover from the cream→dark migration that a V2 rewrite needs to know to purge, not copy forward.
**Recommended solution:** Rebuild the chevron from `var(--color-muted)`/`var(--color-accent)` — either an inline `<svg>` positioned like `EmberSelect` already does, or a small build step that inlines the current hex.
**Severity:** High **Effort:** S

<a name="mf-9"></a>
#### MF-9 — `FeatureGate` blanks the entire page (including the header) while checking plan status
**Files:** `frontend/src/components/FeatureGate.jsx:13`; used on `AnalyticsPage.jsx:130-138`, `ProposalsPage.jsx:121-123`, `ProposalFormPage.jsx:239-241`
**Description:** `FeatureGate` wraps the entire page body — including the page header — so a Free or just-loaded user briefly sees only a lone centered spinner with no title at all. This directly violates CLAUDE.md's own explicit Loading States rule ("keep the surrounding layout... visible... show a small, scoped spinner only where content genuinely isn't available"), a rule the project deliberately adopted after trying and reverting skeleton screens. Every other page (Dashboard, Clients, Invoices) keeps its header static during load; these three don't, purely because the gate sits above the header in the tree.
**Why it matters:** A systemic pattern across 3 routes that regresses the project's own previously-litigated design decision — a real risk if `FeatureGate` is reused as-is in V2.
**Recommended solution:** Render the page header unconditionally in each page and pass only the gated body as `FeatureGate`'s children, or give it a `preserveHeader` API.
**Severity:** Medium **Effort:** S

<a name="mf-10"></a>
#### MF-10 — Early Supporter badge cutoff was never updated at launch, per its own TODO comment
**File:** `frontend/src/utils/earlySupporter.js:8-12`
**Description:** The file's own comment says to set `EARLY_SUPPORTER_CUTOFF` to the real launch date "at launch," so the badge stops being granted afterward. It's hardcoded to `'2026-12-31T23:59:59Z'`. Per CLAUDE.md's own status table, V1 has already launched ("V1 Launch: ✔ Production Stable") — the cutoff is still ~5 months past today. Every account created between actual launch and December 31, 2026 receives the "Early Supporter" badge.
**Why it matters:** Not a crash or corruption bug, but it defeats the entire purpose of the feature — right now it recognizes essentially everyone for months after launch, exactly the TODO its own author flagged.
**Recommended solution:** Set `EARLY_SUPPORTER_CUTOFF` to the real launch date.
**Severity:** Medium **Effort:** S

---

<a name="launch-gates"></a>
### Carried-forward launch / production-verification gates

These are **not code defects** — they're unconfirmed production configuration/verification steps, carried forward from `KNOWN_ISSUES.md` (2026-08-01/02) and CLAUDE.md's "RESUME HERE" note (2026-08-04), because as of this audit they remain the only things standing between "code complete" and "verified live." They should be closed (or explicitly re-verified) before or in parallel with V2 kickoff — a rewrite built on top of an unverified billing foundation compounds the risk.

**MF-11 — Live billing journey never exercised end-to-end.** Checkout, activation, in-app switch/cancel/resume, webhook sync, and `past_due` are build/schema/render-verified but no real Polar transaction has ever run in this environment. *Action:* run `LAUNCH_QA.md` against a Polar sandbox, then one real production purchase. **Severity:** High **Effort:** M (external verification, not code)

**MF-12 — Polar production configuration unconfirmed.** Org access token must include `subscriptions (write)`; webhook endpoint needs all six `subscription.*` events at Raw format; grace period should be 21 days; portal self-serve cancel/switch should be disabled. *Action:* `LAUNCH_QA.md` §0. **Severity:** High **Effort:** S (config)

**MF-13 — Migration `012_delete_account.sql` not confirmed applied to production.** Without it, every account-deletion attempt fails at the RPC step (fails safe, but the feature doesn't work). *Action:* apply, then manually delete one Free and one Pro test account and confirm no orphaned rows/files. **Severity:** High **Effort:** S

**MF-14 — Vercel production environment variables unconfirmed.** `POLAR_SERVER` (must read `production`, not the legacy `POLAR_ENVIRONMENT` name), `POLAR_ACCESS_TOKEN`, both `POLAR_PRODUCT_PRO_*` ids, `POLAR_WEBHOOK_SECRET`, `APP_URL`/`VITE_APP_URL`. **Severity:** High **Effort:** S

**MF-15 — Supabase Reset Password email template's live content unconfirmed.** Code-side fix (explicit `token_hash` verification) is correct; whether the dashboard template actually embeds `{{ .TokenHash }}` can't be checked without dashboard access. Without it, cross-device password reset falls back to same-browser-only. **Severity:** Medium **Effort:** S

---

<a name="security"></a>
## 🔒 Security

Real security-relevant issues that don't rise to launch-blocking, or that are explicitly deferred hardening.

**SEC-1 — `getBaseUrl()` has no fail-closed protection, unlike CORS.**
`api/_utils/http.js:43-48`, used by `checkout.js:74,84` (`success_url`) and `portal.js:47` (`return_url`). `corsOrigin()` was deliberately hardened to fail closed if `APP_URL` is unset in production; `getBaseUrl()` falls back to `x-forwarded-host`/`req.headers.host` instead. Given `APP_URL` being unset is a *documented open gate* (MF-14), this function could end up trusting header-derived values to build the redirect URL a customer's browser lands on right after a real payment. **Recommended solution:** fail closed like `corsOrigin()` does, or validate the derived host against an allowlist. **Severity:** Medium **Effort:** S

**SEC-2 — Broad try/catch in billing routes forwards any thrown error's raw message to the client.**
`checkout.js:96-105`, `portal.js:138-147`, `switch.js:74-79`, `cancel.js:65-69`, `account/delete.js:130-138`. Each deliberately bypasses `sendError()`'s sanitization on the stated assumption every error thrown inside is "known and bounded" — but the `try` blocks aren't scoped that narrowly (e.g. `checkout.js:47` throws a raw Supabase error into the same catch as Polar errors, and `.message` reaches the client verbatim). **Recommended solution:** tag genuinely safe-to-show errors with a distinguishable class; only forward `.message` for those. **Severity:** Medium **Effort:** S-M

**SEC-3 — Account-deletion failure message says "Nothing was changed" even after the Polar subscription was already revoked.**
`api/account/delete.js:101-107`. If the Polar revoke (step 1) succeeds but the `delete_user_account` RPC (step 2) fails, the response still claims nothing changed — factually wrong for a Pro user. `verify:account-deletion`'s RPC-failure scenario only exercises a free-plan subscription, so this combined case is untested. **Recommended solution:** branch the message on whether a revocation actually occurred. **Severity:** Low **Effort:** S

**SEC-4 — Residual pre-migration-009 SVG logo uploads remain a live stored-XSS vector.**
`supabase/migrations/009_logos_bucket_disallow_svg.sql`, which by its own comment only blocks *new* uploads. Any SVG uploaded as a logo between migration 004 (which allowed `image/svg+xml`) and migration 009 is unaffected and still publicly reachable with an executable content-type. **Recommended solution:** a one-time production Storage query (`storage.objects` in `logos` filtered by mimetype) to find and remediate any survivors. **Severity:** Medium (contingent on whether any were actually uploaded — unconfirmed without a live query) **Effort:** S

**SEC-5 — `react-router-dom` open-redirect advisory (moderate, `npm audit`).**
Carried forward from `KNOWN_ISSUES.md`. Fixing means a major bump to `react-router-dom@7` — a breaking routing change deliberately not bundled into a patch release. Worth scoping explicitly as part of V2's routing work rather than deferred indefinitely. **Severity:** Medium **Effort:** L

**SEC-6 — Rate limiting is IP-only and fails open on a Redis outage.**
`api/_utils/rateLimit.js:15-22,52-57`. Every billing + account-deletion route shares one limiter keyed solely on `x-forwarded-for` (no per-user dimension, despite `user.id` being available by the time the handler runs), and it fails open by explicit design if Upstash is unreachable — including on `account/delete.js`, which its own comment calls "the single most consequential endpoint in the app." **Recommended solution:** add a `user.id`-scoped key for authenticated routes; consider fail-closed (or a much lower emergency ceiling) specifically for account-delete and webhook. **Severity:** Low **Effort:** S

---

<a name="technical-debt"></a>
## 🧹 Technical Debt

Dead code, duplication, outdated patterns, and deliberately-deferred hardening. Ordered roughly by leverage/impact.

**TD-1 — No shared data-fetching layer; the same fetch/loading/error boilerplate is duplicated across ~12 pages.**
`useProfile()` exists (`hooks/useProfile.js`) but only 2 of 8 pages that need profile data actually use it — six others (`ProposalsPage`, `InvoiceDetailPage`, `InvoiceFormPage`, `ProposalFormPage`, `SettingsPage`, `InvoicesPage`) hand-roll their own fetch + loading/error state. The same `try { setLoading(true)... } catch... finally` pattern, and the same delete-confirm `deleteTarget`/`deleting` pattern, repeat near-verbatim across a dozen pages. No caching, no request de-duplication, no consistent loading/error contract; a `SettingsPage` profile edit doesn't propagate to any other open tab without a full reload. **This is the single highest-leverage architectural change for V2** — adopting a real data-fetching library (TanStack Query is a natural fit given the promise-based Supabase client) would collapse 150+ lines of duplicated boilerplate. **Severity:** Medium-High **Effort:** L (V2-scoped)

**TD-2 — `useProfile`/`useSubscription` have no guard against out-of-order responses, unlike `useAuth`.**
`hooks/useProfile.js:11-34`, `hooks/useSubscription.js:13-29` vs. `hooks/useAuth.js:12-20` (which uses a `mounted` flag). If a user signs out and immediately signs in as a different account, and the first (stale) fetch resolves after the second, the previous account's profile/subscription data can render under the new session — a data-leak-adjacent bug on shared/kiosk devices. **Severity:** Medium **Effort:** S

**TD-3 — Focus-trap logic duplicated verbatim; body-scroll-lock isn't reentrant across stacked overlays.**
`hooks/useFocusTrap.js` vs. `document-studio/MobilePreviewSheet.jsx:13-62`, which reimplements the identical trap logic instead of reusing the hook (its own comment acknowledges this). Separately, `useFocusTrap`'s cleanup unconditionally clears `body.style.overflow` on close rather than reference-counting — if two focus-trapped overlays are ever open at once, closing the inner one unlocks scroll while the outer is still open. **Severity:** Medium **Effort:** S-M

**TD-4 — `createPayment`/`deletePayment` recompute invoice paid-status via an unlocked client-side read-modify-write race.**
`services/api.js:283-308`. Insert/delete the payment, then a separate `getInvoice()` read, sum in JS, conditionally update status — no transaction, no `SELECT ... FOR UPDATE`. Two concurrent payment writes (two tabs, or a retried request) can both read a stale snapshot before either status update commits — a lost update on financial state. Compare `createInvoice`, which correctly uses an atomic RPC. **Recommended solution:** fold into a `SELECT ... FOR UPDATE` RPC, or derive `invoices.status` via a DB trigger on `payments` insert/delete. **Severity:** Low-Medium **Effort:** M

**TD-5 — `createProposal()` is a non-atomic 2-step insert (orphan risk).**
`services/api.js:325-341`. Insert the proposal, then separately insert `proposal_items`; a failure on the second insert leaves an empty orphaned proposal row. Lower severity than TD-4/MF-3 (no destruction of *existing* data), but the same missing-transaction pattern recurring a third time. **Recommended solution:** a `create_proposal_with_items` RPC matching the invoice pattern. **Severity:** Low **Effort:** M

**TD-6 — Two migrations (003, 005) are non-idempotent and will fail if replayed.**
`supabase/migrations/003_brand_studio.sql` uses `create function` (not `create or replace`), an unguarded `create trigger`, and an unguarded `add constraint`; `005_expand_brand_fonts.sql:19` does an unguarded `drop constraint`. Every later migration uses the safe idempotent pattern (`create or replace`, `drop trigger if exists`). Since this project has never been run through `supabase db push` and has no migration-history bookkeeping, standing up a fresh environment from these files in order — exactly a plausible V2 scenario — would hit this. **Severity:** Medium **Effort:** S

**TD-7 — Inconsistent precision/nullability on money columns.**
`payments.amount` and `proposal_items.amount` are unscaled `numeric` (no `(12,2)`); `invoices.discount_total` is nullable, unlike its sibling totals columns which are `numeric(12,2) NOT NULL`. Not causing a live bug today (all read sites defensively coalesce), but exactly the kind of inconsistency a V2 rebuild would otherwise copy forward. **Severity:** Low **Effort:** S

**TD-8 — Legacy `subscriptions.paddle_*` columns.**
`schema.sql:534-537`. Confirmed still present, confirmed unused. Intentional, documented retention per CLAUDE.md pending a "post-verification cleanup" migration — flagged here only so V2's schema doesn't inherit these columns by default. **Severity:** Low **Effort:** S (when done)

**TD-9 — `proposal_items` has two overlapping, differently-named RLS policy sets.**
`schema.sql:1087-1125` (non-"are"-named) vs. `policies.sql:183-237` (are-named) vs. migration `001`'s drop-then-recreate, which targeted names that never matched live production, leaving a duplicate set (8 policies for 4 operations). Not exploitable today (permissive policies OR together), but a real risk if a future access-rule change updates only one naming variant, silently leaving the other stale-but-permissive copy active. **Recommended solution:** one explicit migration dropping both known variants and recreating a single canonical set. **Severity:** Medium **Effort:** S

**TD-10 — `FREE_THEME_IDS` export is dead code.** `document-studio/themes.js:160` — zero import sites anywhere. **Severity:** Low **Effort:** S

**TD-11 — Duplicate `authenticatedFetch` helper in `services/subscriptions.js` and `services/account.js`.** Self-acknowledged in-repo as a deliberate small-diff tradeoff; only worth extracting if a third consumer appears. **Severity:** Low **Effort:** S

**TD-12 — Terms of Service's "14 days" doesn't match the actual 15/21-day grace policy.**
`pages/TermsPage.jsx:82`. The documented/implemented policy (per `SUPPORT_PLAYBOOK.md`/`LAUNCH_READINESS_REPORT.md`) grants Pro access for the whole `past_due` window (~21 days) to honor a 15-day promise; the Terms page states a different number. Not customer-harmful (actual practice is more generous), but a real legal-doc/product inconsistency. **Severity:** Low **Effort:** S

**TD-13 — `getUsageSummary`'s "this month" boundary is computed in UTC, not local calendar time.**
`services/api.js:96-107`. Affects Free-tier's 5-invoices/month enforcement at month boundaries for non-UTC timezones — a user near month-end/start could be blocked or allowed incorrectly for a few hours. **Severity:** Low **Effort:** S

**TD-14 — `nextInvoiceNumber`'s random suffix has no collision retry despite a DB unique constraint.**
`utils/invoice.js:41-44`; constraint at `schema.sql:679`. Extremely low collision probability, but unlike `deleteClient`'s explicit FK-violation handling, a collision here surfaces as a raw Postgres error with no retry. **Severity:** Low **Effort:** S

**TD-15 — Google OAuth redirect ignores `VITE_APP_URL`, inconsistent with every other auth redirect.**
`hooks/useAuth.js:51-55` hardcodes `window.location.origin` while `signUp`/`resetPassword` correctly prefer `authRedirectUrl()`/`VITE_APP_URL`. If Supabase's allowed redirect list only contains the canonical domain, Google sign-in from a non-canonical origin (preview deploy, domain alias) fails while email/password auth on the same origin still works. **Severity:** Low **Effort:** S

**TD-16 — Billing routes return a generic HTTP 400 regardless of actual cause.**
`checkout.js:104`, `portal.js:146`, `switch.js:78`, `cancel.js:68`, `account/delete.js:137`. `polarFetch` attaches `error.status` from Polar's real response but handlers never propagate it — auth failures, Polar outages, misconfig, and genuine client mistakes all collapse to 400. **Severity:** Low **Effort:** S

**TD-17 — `DESIGN_SYSTEM.md`/`EMBER_DESIGN_BIBLE.md` fully describe the old cream/light palette, not the current dark-first tokens.**
Both dated 2026-07-18; every color table, button spec, and rationale assumes `--bg: #F7F1E3`/`--blue: #3B82F6`. `tokens.css` has been dark-first with a terracotta `--color-accent: #C0603A` for some time. Neither doc has a single correct dark-theme value. Docs-only, but these can't currently serve as ground truth for V2 design work. **Recommended solution:** regenerate from `tokens.css`, or retire in favor of it. **Severity:** Medium **Effort:** S

**TD-18 — `ProgressRing` tautological ternary.** `SubscriptionsPage.jsx:386` — `variant={subscription.isPro ? 'accent' : 'accent'}` is always `'accent'`. Harmless dead code. **Severity:** Low **Effort:** S

**TD-19 — `Drawer`'s `size` prop maps to Tailwind classes that don't exist in the codebase.** `Modal.jsx:164-170`; actual width is governed unconditionally by a fixed CSS rule, so `size` is fully inert for every current caller. **Severity:** Low **Effort:** S

**TD-20 — `EmptyState`'s `illustration` image prop lacks fixed dimensions; no current callers use it** (everyone uses the inline-SVG icon path instead). **Severity:** Low **Effort:** S

**TD-21 — The `info` medallion status added to the local `Modal`/`ConfirmDialog` hasn't been re-extracted into the Ember UI `modal-dialog` module.** Tracked for the next dialog pass. **Severity:** Low **Effort:** S

**TD-22 — `/features` page has its own shorter, hand-maintained feature list that has drifted from the homepage's list** (missing a "Secure workspace" callout). **Severity:** Low **Effort:** S

**TD-23 — Duplicate-checkout TOCTOU.** `api/polar/checkout.js:36-47`. Two concurrent first-time checkouts from one Free user (two tabs/devices) can both pass the 409 guard before either subscription exists, creating two Polar subscriptions billed separately while EmberFlow's single-row schema reflects only one. Needs a short-lived idempotency key or DB lock to close properly. **Severity:** Medium **Effort:** M

**TD-24 — No webhook "apply only if newer" (out-of-order) guard.** `api/_utils/polar.js:160-193` — `normalizeSubscription()` derives state purely from each event's own payload (safe for replays) but has no `modified_at` comparison; a late redelivery of an older, distinct event could overwrite newer state. No evidence this has happened. **Severity:** Low-Medium **Effort:** M

**TD-25 — No periodic Polar↔Supabase reconciliation job.** Switch/Cancel self-heal reactively (see MF-7 for the false-positive risk in that same mechanism), but an account that never touches Switch/Cancel — e.g. a subscription deleted directly in the Polar dashboard with no webhook — stays stale indefinitely with no proactive check. **Severity:** Medium **Effort:** M

**TD-26 — Exact 15-day grace period isn't code-enforced**, only honored with margin (entitlement lasts the full `past_due` window, ~21 days). Never harms a customer, but the exact promise isn't literally implemented. **Severity:** Low **Effort:** M

**TD-27 — Webhook entitlement-sync for the portal-cancellation case was never fully root-caused**, though largely mitigated now that cancellation is in-app and the portal's self-serve cancel is slated to be disabled. **Severity:** Low **Effort:** M

**TD-28 — Switch/cancel reflect via ~12s bounded polling, not realtime.** If the webhook lags beyond that window, the UI shows stale plan/cancel state until a manual reload. A Supabase realtime subscription or optimistic local update would close it. **Severity:** Low-Medium **Effort:** M

**TD-29 — `SECURITY.md`'s CORS wildcard-fallback finding (#6) is stale.** `api/_utils/http.js:1-11` already fails closed rather than falling back to `'*'` — appears fixed since `SECURITY.md` was written. Doc-update only. **Severity:** Low **Effort:** S

**TD-30 — `ContactPage` sends end users to Supabase's own developer documentation for "account help."** `pages/ContactPage.jsx:72-73` links to `supabase.com/docs` — generic developer docs, unhelpful for an EmberFlow customer, and incidentally exposes the backend vendor by name on a public support page. **Severity:** Low-Medium **Effort:** S

---

<a name="performance"></a>
## ⚡ Performance

Verified against a real `npm run build` output, not just source inspection.

**PERF-1 — Supabase client + `AuthProvider` are eagerly loaded on every route, including static marketing pages that never use them.**
`main.jsx:14` mounts `AuthProvider` globally rather than scoped to the routes that need it; `useAuth.js:12-20` unconditionally calls `supabase.auth.getSession()` on mount. `PublicLayout.jsx` (wraps every marketing page) never calls `useAuth()` at all — its nav is static regardless of auth state. Confirmed in the production build: `dist/index.html` unconditionally `modulepreload`s `vendor-supabase` (114 kB / 31 kB gzip) for every route, including landing/pricing/features/legal pages — exactly the SEO-critical, first-impression surface. **Recommended solution:** scope `AuthProvider` to the auth + `/app/*` route subtree only. **Severity:** Medium-High **Effort:** M

**PERF-2 — Single monolithic, render-blocking CSS bundle shipped identically to every route.**
`styles/index.css` imports every stylesheet globally (tokens through every per-page component CSS) from `main.jsx`, not per-route. Confirmed in build output: one 123 kB raw / 19.8 kB gzip stylesheet, render-blocking, containing dashboard/table/modal/settings CSS that a marketing visitor to `/` or `/pricing` never uses — no per-route CSS chunk exists despite the JS being `React.lazy`-split. **Recommended solution:** import page-specific CSS from within each lazy page module (lets Vite's automatic per-chunk CSS splitting work), or at minimum split a "marketing" bundle from an "app" bundle. **Severity:** Medium **Effort:** M-L

**PERF-3 — Two Inter font weights (800, 900) are imported globally but never used anywhere.**
`main.jsx:1-6`. Grep for `font-weight: 800`/`900` across the whole codebase returns zero matches. Low real runtime cost (fonts only fetch on actual use), primarily a dead-import/maintainability issue. **Severity:** Low **Effort:** S

**PERF-4 — No `preconnect`/`dns-prefetch` hint for the Supabase origin.**
`index.html` has no such hint; given PERF-1, the browser doesn't discover the Supabase origin until JS executes and calls `createClient`. A `preconnect` shaves a DNS+TLS round trip off the critical path to first meaningful authenticated data. **Severity:** Low **Effort:** S

**PERF-5 — `vite.config.js` has minimal chunking/build-target configuration.**
Only a 3-way `manualChunks` split (react/supabase/icons), no explicit `build.target`, no CSS-splitting strategy. Not broken, but a config a V2 rewrite should deliberately revisit rather than inherit as-is. **Severity:** Low **Effort:** S-M

**Verified non-issues (worth recording so V2 doesn't re-check):** `jspdf`/`html2canvas`/`docx` are all correctly lazy-loaded via dynamic `import()`, confirmed in the actual `dist/` chunk manifest, each in its own chunk, none in the main bundle. The two ~850 KB repo-root PNGs (`emberflow.png`, `emberflow-vertical.png`) are outside `frontend/`, confirmed unreferenced anywhere in `frontend/src`, and are not shipped to the client.

---

<a name="ui-ux"></a>
## 🎨 UI / UX

**UX-1 — Dashboard/ClientDetail/InvoiceDetail replace the whole page (not a scoped banner) on a failed data fetch.** A full-page error state instead of a scoped inline error, on pages otherwise designed to preserve layout during loading (per CLAUDE.md's Loading States rule). **Severity:** Medium **Effort:** S

**UX-2 — Minor layout shift on Dashboard/ClientDetail stat cards between the loading and loaded state.** **Severity:** Low **Effort:** S

**UX-3 — Decorative external-link icons occasionally wrap onto their own line on Terms/Privacy/Contact pages.** **Severity:** Low **Effort:** S

**UX-4 — The proposal line-item editor doesn't show the same real-time "excluded" warning the invoice editor has for an incomplete row.** Still caught at submit time, not silently lost — an asymmetry between two otherwise-parallel editors. **Severity:** Low **Effort:** S

**UX-5 — The Brand Studio color picker popover can render partially off-screen near a narrow viewport's right edge.** **Severity:** Low-Medium **Effort:** S

**UX-6 — Subscriptions cadence picker and post-revoke "Resubscribe" both default to Yearly regardless of the user's prior plan or the pricing page's own highlighted plan.**
`pages/SubscriptionsPage.jsx:79,372`. `config/plans.js` marks `pro_monthly` as `highlight: true`, but the in-app picker always initializes to `pro_yearly` — including for a user whose subscription was just revoked for a failed *monthly* payment. **Recommended solution:** default to `row?.plan` when available, otherwise the catalog's `highlight` plan. **Severity:** Low **Effort:** S

**UX-7 — `--color-on-accent` is referenced but never defined in `tokens.css` (phantom token).**
`layout.css:21` uses `var(--color-on-accent, #fff)` while `buttons.css:75,82` hardcodes `#FFFFFF` directly for the same "text on accent" value — two different tokenization strategies for one concept, one of which silently falls through to its fallback. **Recommended solution:** define `--color-on-accent` once and use it in both places. **Severity:** Low **Effort:** S

**UX-8 — No post-revoke explanation for a voluntary cancellation reaching period end.** The involuntary failed-payment revoke case has a clear message; a voluntary cancel that reaches period end simply shows Free with no recap. Lower priority than the pre-revoke `past_due` notice, which already exists. **Severity:** Low **Effort:** S

---

<a name="mobile"></a>
## 📱 Mobile

**MOB-1 — Primary in-app sidebar navigation touch targets are undersized, unlike every other control in the app.**
`styles/components/sidebar.css:74-88` (`.side-link`) computes to ~36px tall, under the 44px minimum. This is the exact nav used in the mobile off-canvas drawer — the primary way a phone user navigates the whole authenticated app. By contrast, `.icon-button--sm`, `.table__page`, and `.modal-close` were all explicitly patched with `@media (pointer: coarse)` overrides; `.side-link` has no equivalent. **Recommended solution:** add the same coarse-pointer padding bump used elsewhere. **Severity:** Medium **Effort:** S

**MOB-2 — `EmberSelect` dropdown option rows are also under the touch-target minimum (~40px), with no coarse-pointer override**, affecting every EmberSelect instance (currency picker, country picker, template filters) on touch. **Severity:** Low-Medium **Effort:** S

**MOB-3 — Usage-meter cards are stuck at 2 columns on mobile instead of 1 — a CSS specificity bug, root-caused.**
`.plan-hero .subscription-grid` in `subscriptions.css:61-64` has specificity `(0,2,0)`, which beats the mobile-collapse rule in `utilities.css` at `(0,1,0)` (media queries don't add specificity) — so the intended `1fr` mobile rule can never win. **Recommended solution:** qualify the mobile override with the same specificity (`.plan-hero .subscription-grid`), or lower the base rule's specificity. **Severity:** Medium **Effort:** S

**MOB-4 — Pricing/Upgrade/Subscription card grids skip a tablet-optimized layout, jumping straight from 3-column to 1-column at 920px.** Confirmed in `utilities.css`. **Severity:** Low-Medium **Effort:** S

**MOB-5 — A template-picker keyboard-navigation breakpoint mismatch affects a narrow ~40px viewport range for keyboard-only users.** **Severity:** Low **Effort:** S

---

<a name="accessibility"></a>
## ♿ Accessibility

**A11Y-1 — `ProgressRing`/`ProgressBar` carry no ARIA progressbar semantics; the renewal ring is a total information loss for screen reader users.**
`components/ui/ProgressRing.jsx`, `ProgressBar.jsx`. Neither sets `role="progressbar"`, `aria-valuenow/min/max`, or an accessible name. For the usage-meter `ProgressBar`, adjacent text (`{used} / {limit}`) covers the gap. But the renewal `ProgressRing` on `SubscriptionsPage.jsx:386-388` is used with only an `aria-hidden` decorative icon as its children — "how far through your billing period you are" is conveyed *exclusively* through an `aria-hidden` SVG's stroke animation, completely inaccessible to blind users on a billing page. **Recommended solution:** add full ARIA progressbar semantics; for the renewal ring specifically, a computed label stating the actual countdown. **Severity:** High (ring) / Low (bar) **Effort:** S

**A11Y-2 — `EmberSelect` assigns `role="combobox"` to two different elements simultaneously.**
`components/ui/EmberSelect.jsx` — the trigger button and the popover's search input both carry the combobox role when `searchable` is true, conflating the W3C APG's two distinct combobox patterns (select-only vs. editable) rather than implementing one correctly. Used broadly (currency, country, template pickers). **Severity:** Medium **Effort:** S-M

**A11Y-3 — `Table`'s region has a generic, non-distinguishing `aria-label="Data table"`, hardcoded with no override prop.** Every table in the app (Invoices, Clients, Proposals) announces identically to screen reader users navigating by landmark. **Recommended solution:** add an `ariaLabel` prop, defaulting to the current string for back-compat. **Severity:** Low **Effort:** S

**A11Y-4 — `Avatar`'s `aria-label` on a bare `<div>` isn't exposed to the accessibility tree.**
`components/ui/Avatar.jsx:45`. A plain div has the implicit role `generic`, which per spec prohibits "name from author" — `aria-label` is typically dropped by browsers/AT. Contrast with `LogoPlaceholder` in the same file, which correctly pairs `aria-label` with `role="img"`. **Severity:** Low **Effort:** S

**A11Y-5 — `Card`'s `onClick` prop has no keyboard/role safety net unless `variant="interactive"` is also set.**
`components/ui/Card.jsx:27-45`. A future caller passing `onClick` on a non-interactive-variant Card — a plausible mistake given the API shape — silently gets a mouse-only clickable card with no keyboard access. No current caller triggers this, but the component API itself doesn't prevent it. **Severity:** Low **Effort:** S

**A11Y-6 — Missing `scope="col"` on table headers app-wide**, confirmed across all three `<th>` render paths in `Table.jsx` (loading, empty, and data states). **Severity:** Low **Effort:** S

**A11Y-7 — Color-swatch buttons announce a raw hex code instead of a descriptive label.** **Severity:** Low **Effort:** S

**A11Y-8 — The delete-account confirmation dialog briefly loses its accessible name during the deleting/success transition.** **Severity:** Low **Effort:** S

**A11Y-9 — Redundant duplicate `aria-live` regions wrap loading spinners on seven pages, not three as previously recorded.**
`LoadingSpinner` (`Loading.jsx:27`) already sets `role="status" aria-live="polite"` internally; `AnalyticsPage.jsx:177`, `BrandStudioPage.jsx:373`, `InvoiceDetailPage.jsx:202`, `InvoiceFormPage.jsx:238`, `SettingsPage.jsx:177`, `SubscriptionsPage.jsx:253`, and `TemplatesPage.jsx:38` each wrap it in a second, redundant `<div role="status" aria-live="polite">`. (Corrects the prior "three pages" count.) **Severity:** Low **Effort:** S

**A11Y-10 — The mobile sidebar navigation drawer doesn't trap keyboard focus the way every other overlay in the app does.** **Severity:** Medium **Effort:** S

---

<a name="seo"></a>
## 🌐 SEO

**No open SEO defects found.** The `Seo.jsx` component and per-route implementation are genuinely solid: every public page (`LandingPage`, `PricingPage`, `FeaturesPage`, `ContactPage`, `PrivacyPage`, `TermsPage`, `RefundPolicyPage`) has a unique title/description/canonical/OG/Twitter tags and JSON-LD; heading hierarchy is clean (h1→h2→h3, no skips); decorative logo `alt=""` is correctly paired with adjacent visible brand text; `robots.txt` and `sitemap.xml` are present and correct. This was verified by direct inspection, not assumed from the prior "SEO complete" status note.

The one structural SEO limitation — the SPA has no SSR/prerender, so non-JS-executing crawlers/unfurlers see only generic static meta tags — is a known, deliberate architecture tradeoff. See [Future Ideas](#future-ideas).

---

<a name="future-ideas"></a>
## 💡 Future Ideas (explicitly NOT for V2)

**FUT-1 — SPA has no SSR/prerender.** Per-route SEO tags are JS-rendered; Googlebot and modern social crawlers execute JS and see them fine, but a crawler/unfurler that doesn't run JS sees only the generic static title/meta. Closing this means SSR/prerendering — an architecture change, deliberately out of scope for V2.

**FUT-2 — Proposals have no edit route** (create + duplicate-as-new only, unlike invoices' full CRUD). May be an intentional product decision (a proposal as a point-in-time document); flagged as a real, visible asymmetry worth a deliberate yes/no rather than an oversight.

**FUT-3 — Plan-switch confirmation doesn't preview the exact prorated amount.** Copy says "Polar prorates the difference"; the precise figure only appears on Polar's receipt. Polar has a proration-preview endpoint that could surface it in-dialog.

**FUT-4 — A handful of narrow, low-frequency edge cases:** a long business name silently clipping in one premium document theme; a locked template briefly flashing via a guessed URL before snapping back; one page-size control using an inline style instead of the spacing token scale.

**FUT-5 — Live Lighthouse baseline has never been run on a real device.** The static picture is good (verified in this audit via actual build-output inspection — see Performance section), but performance/accessibility scores have never been measured live. Worth running as a first action once V2 work begins, to get a real baseline rather than continuing to reason from source alone.

---

## Related documents (not superseded, still current)

- `LAUNCH_QA.md` — the master pre-live checklist; source for the launch gates (MF-11–MF-15).
- `SUPPORT_PLAYBOOK.md` — billing support playbook, referenced by SEC-3/TD-12.
- `V1.5_ROADMAP.md` — grounded post-launch roadmap; several Milestone A items overlap with the billing Technical Debt entries above (TD-23–TD-28) by design — that roadmap's sequencing/timing guidance still applies, only the *findings themselves* are consolidated here.
- `MANUAL_QA_CHECKLIST.md` — frontend QA checklist, still to be run on-device.
- CLAUDE.md's "RESUME HERE" section — V1.5 Phase 1 (EmberFlow Control Center) is a separate, already-scoped initiative layered on top of this audit, not reopened by it.
