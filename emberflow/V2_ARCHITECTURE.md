# EmberFlow V2 Architecture Review

**Prepared by:** Senior Software Architect review, ahead of V2
**Date:** 2026-08-06
**Method:** Full read of the repository's structure, routing, service/hook layer, API layer, and database layer, with precise file/line grounding throughout. No code was modified to produce this document.
**Companion document:** `V2_MASTER_AUDIT.md` (2026-08-06) covers the same codebase issue-by-issue (bugs, security, a11y, perf). This document is structural — it explains *how the system is put together* and *why that structure will or won't hold up over five years*. Where a structural problem also manifests as a concrete bug, it's cross-referenced rather than re-derived.

---

## Table of Contents

1. [Folder Structure](#1-folder-structure)
2. [Component Hierarchy](#2-component-hierarchy)
3. [Service Architecture](#3-service-architecture)
4. [API Architecture](#4-api-architecture)
5. [Database Architecture](#5-database-architecture)
6. [Flow: Authentication](#6-flow-authentication)
7. [Flow: Billing (Checkout → Webhook → Entitlement)](#7-flow-billing-checkout--webhook--entitlement)
8. [Flow: Proposal](#8-flow-proposal)
9. [Flow: Invoice](#9-flow-invoice)
10. [Flow: Payment (client payment tracking — distinct from Billing)](#10-flow-payment-client-payment-tracking--distinct-from-billing)
11. [Flow: Subscription (entitlement read-side)](#11-flow-subscription-entitlement-read-side)
12. [Structural Findings](#12-structural-findings)
    - [12.1 Tight Coupling](#121-tight-coupling)
    - [12.2 Duplicate Logic](#122-duplicate-logic)
    - [12.3 Overly Large Components](#123-overly-large-components)
    - [12.4 Missing Abstractions](#124-missing-abstractions)
    - [12.5 Poor Separation of Concerns](#125-poor-separation-of-concerns)
13. [Suggested Architecture Improvements for V2](#13-suggested-architecture-improvements-for-v2)

---

## Executive Summary

EmberFlow V1's architecture is **honest and legible** — there's no framework-magic, no hidden indirection, and an unusual amount of inline reasoning left in comments explaining *why* a given shortcut was taken (e.g. `useDocumentExport.js`'s own comment names the exact duplication it was extracted to fix). That legibility is a real asset for a V2 effort: nothing here needs to be reverse-engineered.

But the architecture was grown feature-by-feature without a settled layering discipline, and it shows in five recurring patterns, detailed in full in [§12](#12-structural-findings):

- **No data-access layer.** Supabase's query builder is called directly from 96 frontend files and from every page's `useEffect`. There is no repository/service boundary a V2 rewrite could swap out (for a different backend, a caching layer, or just a saner API) without touching every page.
- **No shared data-fetching abstraction.** The one hook that could serve as one (`useProfile`) is used by 2 of 8 pages that need it; the other 10+ pages each hand-roll `loading`/`error`/`try-catch` state independently.
- **Business rules exist in three unsynchronized places at once.** "Is this user allowed to do X" is answered by frontend derived state (`utils/plans.js`), a UI gate component (`FeatureGate.jsx`), and independently-hand-written Postgres triggers (`enforce_*_pro_only`) — confirmed to hardcode plan-name literals (`'free'`) rather than reading from the same catalog the frontend uses. A plan-model change today requires editing JS and SQL in lockstep, with nothing enforcing that they stay in sync.
- **No API middleware layer.** All 6 serverless functions hand-roll the identical auth/rate-limit/CORS/error-handling scaffolding at the top of every handler, rather than composing it.
- **Zero automated tests.** Two standalone Node scripts (`verify:polar`, `verify:account-deletion`) exercise pure business logic in isolation; there is no test for a single React component, page, or API route as actually wired together, and no CI-gated test run at all.

None of this is unusual for a fast-shipped V1 — several of these tradeoffs are explicitly, deliberately documented as such in code comments (the app is not "sloppy," it's "not yet layered"). But a 5-year maintainability horizon is exactly the point at which "no data layer" and "no tests" stop being acceptable, because every future feature compounds the cost of both. §13 lays out the concrete path forward.

---

## 1. Folder Structure

```
emberflow/
├── api/                              # Vercel serverless functions (CommonJS, Node runtime)
│   ├── polar/                        # Billing: 5 routes, 1 file = 1 endpoint
│   │   ├── checkout.js               #   POST — start a new subscription
│   │   ├── webhook.js                #   POST — Polar → EmberFlow event ingestion
│   │   ├── switch.js                 #   POST — change plan cadence in place
│   │   ├── cancel.js                 #   POST — cancel/resume at period end
│   │   └── portal.js                 #   POST — open Polar's hosted billing portal
│   ├── account/
│   │   └── delete.js                 #   POST — irreversible account deletion
│   └── _utils/                       # Shared backend helpers (no framework, hand-rolled)
│       ├── http.js                   #   CORS, JSON responses, raw body reader
│       ├── supabaseAdmin.js          #   Service-role client + Bearer-token auth
│       ├── polar.js                  #   Polar HTTP client, webhook verification, plan mapping
│       ├── planCatalog.js            #   Server-side projection of the plan catalog
│       ├── rateLimit.js              #   Upstash Redis-backed rate limiting
│       └── account.js                #   Account-deletion helper predicates
│
├── frontend/src/
│   ├── pages/                        # 25 route-level components (flat, no sub-folders)
│   ├── components/
│   │   ├── ui/                       # 18 design-system primitives (Button, Card, Table, ...)
│   │   └── *.jsx                     # 11 app-level components (layouts, gates, modals)
│   ├── document-studio/              # Self-contained PDF/document subsystem (17 files)
│   ├── hooks/                        # 6 hooks (useAuth, useProfile, useSubscription, ...)
│   ├── services/                     # 5 files — the only layer between UI and Supabase/API
│   ├── utils/                        # 8 files — formatting, invoice math, plan derivation
│   ├── config/plans.js               # Single data catalog for pricing/plans
│   ├── data/                         # Static reference data (countries, currencies, company info)
│   └── styles/                       # Design tokens + BEM component CSS
│
├── supabase/
│   ├── schema.sql                    # ⚠️ pg_dump snapshot, 9 migrations stale (see §5)
│   ├── policies.sql                  # ⚠️ RLS snapshot, equally stale
│   └── migrations/001..012           # The actual source of truth, chronological
│
└── scripts/                          # verify-polar.js, verify-account-deletion.js — the
                                       # only automated checks in the entire repository
```

**Structural observations from the tree itself:**

- **Flat, not domain-sliced.** `pages/`, `services/`, `hooks/` are each one flat directory regardless of domain — there's no `features/invoices/`, `features/billing/` grouping. At 25 pages and 5 service files this is still navigable; it will not still be navigable at 50+ pages, which is a realistic 5-year outcome for a product whose own vision statement calls it "the operating system for freelancers."
- **`document-studio/` is architecturally a separate application** (its own CSS files, its own theme system, its own export pipeline) that happens to live inside `frontend/src/` rather than being formally packaged as one. It is the closest thing in the codebase to a well-bounded module, and is a good model for what the rest of the app doesn't yet do (see §13).
- **No `types/` or shared contract layer.** The project is plain JavaScript by deliberate choice (CLAUDE.md). That's fine as a language choice, but it means the shape of a `subscriptions` row, an `invoice`, a `Polar` webhook payload, etc. is never written down once — each consumer re-derives its own assumptions about shape from reading the code that produces it.
- **No test directory anywhere in the repository** (confirmed — no `__tests__`, no `*.test.js`, no `*.spec.js`, no Vitest/Jest config). Addressed in §12.4 and §13.

---

## 2. Component Hierarchy

### 2.1 Root composition (`main.jsx`)

```
<React.StrictMode>
  <HelmetProvider>                    # react-helmet-async — per-route SEO tags
    <BrowserRouter>
      <ThemeProvider>                 # light/dark theme context (useTheme.js)
        <AuthProvider>                # global session/user context (useAuth.js)
          <App />
```

`AuthProvider` wraps the **entire** application, including every marketing page — not just the routes that need it. This is a coupling finding, not just a performance one; see §12.1 and the companion audit's PERF-1.

### 2.2 Routing tree (`App.jsx`)

```
<ErrorBoundary>
  <Suspense fallback={<RouteProgress />}>       # every page below is React.lazy-loaded
    <Routes>

      <PublicLayout>                             # marketing shell — no auth awareness
        /                → LandingPage
        /features         → FeaturesPage
        /pricing           → PricingPage
        /terms, /privacy, /refund, /contact

      # Standalone — outside both layouts
      /login, /signup, /register           → AuthPage (mode prop)
      /forgot-password                      → ForgotPasswordPage
      /reset-password                       → ResetPasswordPage
      /auth/callback                        → AuthCallbackPage

      <ProtectedRoute>                       # gates on useAuth().user
        <AppLayout>                          # authenticated shell: sidebar + topbar
          /app               → DashboardPage
          /app/clients[...]  → ClientsPage / ClientFormPage / ClientDetailPage
          /app/invoices[...] → InvoicesPage / InvoiceFormPage / InvoiceDetailPage
          /app/proposals[...]→ ProposalsPage / ProposalFormPage   (no edit route — see §9)
          /app/analytics     → AnalyticsPage
          /app/templates     → TemplatesPage
          /app/subscriptions → SubscriptionsPage
          /app/settings[...] → SettingsPage / BrandStudioPage

      *  → redirect to "/"
```

Two layout roots (`PublicLayout`, `AppLayout`) plus three auth pages that sit **outside both** — meaning `AuthPage`/`ForgotPasswordPage`/`ResetPasswordPage`/`AuthCallbackPage` each independently own their own page chrome rather than inheriting from a shared "unauthenticated" shell. Minor today (4 pages); worth deciding deliberately rather than by accretion if more pre-auth flows are added.

### 2.3 `AppLayout.jsx` (201 lines) — the authenticated shell

Owns, in one component: sidebar nav + collapse state (persisted to `localStorage`), mobile drawer open/close + focus management, a one-shot app-entrance animation (`AppEntrance`), the topbar (title + theme toggle + avatar), **and** renders `BillingNudge` (a billing-specific dunning banner) directly into every authenticated page's content area. See §12.1 (#3) and §12.5 (#3) — navigation-shell concerns and a specific product feature (billing nudges) are fused into one component every route mounts through.

### 2.4 UI primitive library (`components/ui/`, 18 components, 2,373 lines)

A conventional design-system layer (`Button`, `Card`, `Input`/`Textarea`/`Select`, `Table`, `Modal`/`ConfirmDialog`, `Badge`, `Avatar`, `EmberSelect`, `Alert`, `ProgressBar`/`ProgressRing`, `SegmentedControl`, `ItemRow`, `Loading` family, `EmptyState`, `ThemeToggle`, `EmberLogo`, `PasswordStrengthMeter`). Reasonably well-factored relative to the rest of the app — `Button.jsx` (92 lines) and `Card.jsx` (177 lines) are appropriately scoped. Two outliers are worth flagging structurally: `Input.jsx` (398 lines — the single largest file in `components/ui/`) and `Table.jsx` (362 lines), both discussed in §12.3.

### 2.5 App-level components (`components/*.jsx`, non-ui, 926 lines across 11 files)

`AppLayout`, `PublicLayout` (the two shells), `FeatureGate` + `UpgradeModal` + `BillingNudge` (three separate billing-gating components with overlapping responsibility — all three independently call `useSubscription()` and independently decide what to show a non-Pro user), `DeleteAccountModal`, `ProActivation` (the Pro-upgrade celebration), `ErrorBoundary`, `ProtectedRoute`, `AppEntrance`, `Seo`.

### 2.6 `document-studio/` (17 files, 3,226 lines) — a nested sub-application

```
DocumentTemplate.jsx  (theme-driven layout shell)
  ├── InvoiceDocument.jsx    (invoice-specific rendering)
  └── ProposalDocument.jsx   (proposal-specific rendering)
TemplateSelector.jsx     (theme picker UI)
ColorPicker.jsx          (brand color picker)
ScaledPreview.jsx         (zoom/fit-to-viewport wrapper)
MobilePreviewSheet.jsx    (mobile bottom-sheet preview, own focus-trap — see §12.2 #2)
ExportMenu.jsx  +  useDocumentExport.js  +  export.js   (8-format export pipeline)
offscreenRender.jsx       (headless render for PDF/image capture)
themes.js, color.js, fonts.js, sampleDocuments.js        (supporting data/logic)
```

This subsystem is imported **wholesale and identically** into `InvoiceFormPage`, `InvoiceDetailPage`, and `ProposalFormPage` — each page independently wires `TemplateSelector` + `ScaledPreview` + `MobilePreviewSheet` + `ExportMenu` + `useDocumentExport` into its own JSX rather than through one shared composite. The export *logic* itself is correctly deduplicated (`useDocumentExport.js`'s own comment documents that this was extracted specifically because it used to be "identical, copy-pasted switch-statement logic across all three" pages) — but the *composition* of the document-studio pieces into a page was never given the same treatment. See §12.2 (#7).

---

## 3. Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Pages (25 files)                                            │
│  — own data-fetching, loading/error state, and business      │
│    rules inline (see §12.5 #1)                                │
└───────────────┬─────────────────────────────┬────────────────┘
                │                             │
      ┌─────────▼─────────┐         ┌─────────▼─────────┐
      │   hooks/ (6)       │         │  services/ (5)     │
      │  useAuth (global)  │         │  api.js  (345 ln,   │
      │  useProfile        │────────▶│   all CRUD, flat)  │
      │  useSubscription   │         │  subscriptions.js  │
      │  useTheme          │         │  account.js         │
      │  useFocusTrap       │         │  brandAssets.js     │
      │  useAnimatedNumber  │         │  supabase.js (client)│
      └─────────────────────┘         └──────┬──────────────┘
                                             │
                              ┌──────────────┴───────────────┐
                              │                              │
                     Direct Supabase calls          fetch() to /api/*
                     (RLS-scoped, anon key)          (services/subscriptions.js,
                     services/api.js,                 services/account.js —
                     services/brandAssets.js           each owns its own
                                                        authenticatedFetch,
                                                        see §12.2 #1)
```

**What exists:**
- `services/supabase.js` — single client instantiation (anon key, RLS-scoped).
- `services/api.js` (345 lines) — the *only* data-access layer for clients, invoices, invoice_items, payments, proposals, proposal_items, profiles, subscriptions (read), and usage counts. One flat file, no per-domain module boundary (`clients.js`, `invoices.js`, `proposals.js` don't exist separately).
- `services/subscriptions.js` / `services/account.js` — thin HTTP clients for the two things that must go through the backend (billing mutations, account deletion) rather than direct Supabase access, because they need the service-role key or third-party (Polar) calls.
- `services/brandAssets.js` — Supabase Storage upload logic for logos/avatars.
- `hooks/*` — `useAuth` is a true global context (single `AuthProvider` at the root); `useProfile`/`useSubscription` are **not** context-shared — each is a per-component-instance hook that independently fetches on mount, so two components both calling `useSubscription()` on the same page (e.g. `FeatureGate` and `BillingNudge` both do, on pages where both render) issue two independent fetches of the same row.

**What's missing** (elaborated in §12.4): a repository/domain-model layer between `services/api.js` and the pages; a shared data-fetching/caching primitive; a single entitlements service consumed everywhere instead of `useSubscription()` re-fetching per call site.

---

## 4. API Architecture

Six Vercel serverless functions, all Node/CommonJS (a deliberate or incidental split from the frontend's ESM — worth deciding explicitly for V2). Every route follows the same **hand-copied**, not shared, scaffold:

```js
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return optionsHandler(res);
  if (req.method !== 'POST') return methodNotAllowed(res);

  const allowed = await rateLimit(req, res, { prefix, limit, windowSeconds });
  if (!allowed) return;

  try {
    const { supabase, user } = await getAuthenticatedUser(req);   // Bearer token → service-role client
    // ...business logic inline in the handler...
    return sendJson(res, 200, { ... });
  } catch (err) {
    console.error('...Error:', err.message);
    return sendJson(res, 400, { error: `...: ${err.message}` });  // NOT sendError() — see below
  }
};
```

**Shared utilities that exist** (`api/_utils/`):
- `http.js` — `sendJson`/`sendError`/`optionsHandler`/`methodNotAllowed`/`getBaseUrl`/`readRawBody`. `sendError()` sanitizes messages in production; **five of six routes deliberately bypass it** and hand-format their own error response instead, each independently re-justifying the choice in a comment (see V2_MASTER_AUDIT.md SEC-2 for the risk this creates).
- `supabaseAdmin.js` — `getAuthenticatedUser(req)`: decodes the `Authorization: Bearer` header via the service-role client's `auth.getUser(token)`. This is the closest thing to auth middleware in the API layer, but it's a function every handler calls explicitly and identically, not a wrapper that runs before the handler.
- `polar.js` (227 lines) — Polar HTTP transport (`polarFetch`), webhook signature verification, plan↔product ID mapping, **and** the self-healing recovery logic (`collapseToFreeAfterMissingSubscription`) — four different responsibility levels in one module (see §12.5 #4).
- `planCatalog.js` — server-side projection of `frontend/src/config/plans.js`'s catalog (two independent files, kept in sync by convention/a documented "drift guard" in `verify:polar`, not by import — the frontend and backend cannot literally share this file across the Vite/Vercel boundary as currently structured).
- `rateLimit.js` — Upstash Redis-backed, IP-keyed, fails open on Redis error (see V2_MASTER_AUDIT.md SEC-6).
- `account.js` — small predicate helpers specific to account deletion.

**What's missing:**
- **No middleware/composition pattern.** `OPTIONS` handling, method checking, rate limiting, and auth are procedural boilerplate repeated at the top of all 6 handlers rather than composed (e.g. `withApiRoute(handler, { method: 'POST', rateLimit: {...}, requireAuth: true })`). Any future cross-cutting change (e.g. adding request logging, or a new required header) means editing 6 files identically.
- **No request schema validation.** Every route does `const { plan } = req.body || {}` and trusts downstream logic (e.g. `getProductId`'s allow-list) to reject bad input. This works today because the allow-lists are tight, but it's implicit, not declared.
- **No API versioning** and **no OpenAPI/schema documentation** — the only description of what each endpoint accepts/returns is the handler source itself.
- **Two authorization models coexist with no shared boundary**: direct Supabase calls from the frontend rely on **RLS** (row-level security enforced by Postgres, using the user's own JWT); serverless routes use the **service-role key** (which bypasses RLS entirely) and manually re-scope every query with `.eq('user_id', user.id)`. Both are individually sound, but a developer moving logic from one side to the other (a very plausible V2 refactor) can silently drop the authorization check that the *other* side was providing for free.

---

## 5. Database Architecture

**Source of truth:** `supabase/migrations/001` through `012`, applied in order. **Not** `supabase/schema.sql`/`policies.sql` — both are stale `pg_dump` snapshots, confirmed via grep to be missing every schema/policy change introduced by migrations 002–012 (no `past_due`, no `polar_*` columns, no Brand Studio columns, no `invoice_usage`/`webhook_events` tables in `policies.sql` at all). Anyone — human or AI — designing V2 off those two files instead of the migrations directory will silently omit six-plus live features. **This is flagged as MF-6 in `V2_MASTER_AUDIT.md`; it's repeated here because it is the single most important fact for whoever starts V2 schema work to know.**

**Core tables:** `profiles`, `clients`, `invoices` → `invoice_items`, `payments`, `proposals` → `proposal_items`, `subscriptions`, `invoice_usage`, `webhook_events`.

**Authorization layer:** per-table RLS policies scoped to `user_id = auth.uid()` for ordinary CRUD, **plus** a second, independent enforcement layer of Postgres triggers implementing Pro-only gating at write time:

```
enforce_client_limit()             — Free-tier client count cap
enforce_proposals_pro_only()       — blocks proposal creation on Free
enforce_invoice_template_pro_only()— blocks premium templates on Free
enforce_payments_pro_only()        — blocks payment recording on Free
enforce_branding_pro_only()        — blocks Brand Studio customization on Free
```

Each of these is a **hand-written, independent SQL implementation of "is this user on a paid plan,"** confirmed (e.g. `enforce_proposals_pro_only()`, `supabase/schema.sql:228-249`) to hardcode the literal check `coalesce(v_plan, 'free') = 'free'` directly against the `subscriptions.plan` column — with no reference to, or shared source with, `frontend/src/config/plans.js` (the JS catalog) or `frontend/src/utils/plans.js` (the JS entitlement-derivation logic) that answers the *exact same question* on the frontend. Three unsynchronized implementations of one business rule, in two languages, with nothing enforcing agreement between them. See §12.2 (#5) and §12.4 (#4).

**Transactional integrity is inconsistent by table:**
- `invoices` + `invoice_items`: atomic on **create** (`create_invoice_with_items` RPC, a single `plpgsql` function) but **not** on **update** (`services/api.js updateInvoice()` — three separate round-trips, no transaction; see V2_MASTER_AUDIT.md MF-3).
- `proposals` + `proposal_items`: **never** atomic — `createProposal()` is a plain two-step insert with no RPC equivalent at all.
- `payments`: status derivation (whether an invoice becomes `"paid"`) is computed **client-side in JavaScript** after an unlocked read-modify-write, not in the database — the one place in the schema where "is this financial record valid" (payment amount, in particular) has **zero CHECK constraints** (V2_MASTER_AUDIT.md MF-4).

This means "does this write need to be transactionally safe" was decided independently, four separate times, for four structurally identical multi-table writes — one got it right (invoice create), the other three didn't. That's not a coincidence of one missing feature; it's the absence of a general pattern (§12.4 #3).

**Migration hygiene:** no formal migration tooling has ever been used (never run through `supabase db push`, no `schema_migrations` bookkeeping — confirmed in the prior database audit). Two migrations (`003`, `005`) are non-idempotent and would fail if replayed against a fresh environment. Low risk today (single environment, applied once), real risk for any future multi-environment (staging/prod parity, or a V2 spun up in parallel) workflow.

---

## 6. Flow: Authentication

```
1. main.jsx mounts a single global AuthProvider (hooks/useAuth.js) at the
   app root — session/user/loading state, subscribed to
   supabase.auth.onAuthStateChange for the life of the app.

2a. Email/password — AuthPage.jsx → useAuth().signIn/signUp → Supabase
    Auth API directly from the browser. No backend involvement at all.

2b. Google OAuth — useAuth().signInWithGoogle() → supabase.auth.signInWithOAuth
    (redirectTo hardcoded to window.location.origin — see V2_MASTER_AUDIT.md
    TD-15, inconsistent with signUp/resetPassword's use of the configured
    VITE_APP_URL) → Google's consent screen → back to /auth/callback.

3. AuthCallbackPage.jsx — exchangeCodeForSession(code) → getSession() →
   check localStorage for a plan chosen before sign-in
   (utils/pendingCheckout.js) → if present, immediately call
   services/subscriptions.js.startCheckout() and redirect to Polar; else
   navigate to /app. This is the one place the Auth flow and the Billing
   flow are deliberately stitched together.

4. ProtectedRoute.jsx — the sole gate on every /app/* route. Reads
   useAuth().user/loading; shows BrandLoader while resolving, redirects to
   /login (preserving the attempted path in router state) if unauthenticated.

5. Password reset — ForgotPasswordPage → useAuth().resetPassword() (emails a
   link) → ResetPasswordPage → useAuth().verifyPasswordRecovery(tokenHash)
   (explicit verifyOtp, not the ambient ?code= exchange — deliberately, per
   an inline comment, because the PKCE verifier usually isn't present when a
   reset link is opened on a different device/browser) → updatePassword().

6. Backend API auth — every api/*.js route independently calls
   getAuthenticatedUser(req) (api/_utils/supabaseAdmin.js), which decodes
   the Bearer token via the service-role client. This is procedural
   (explicitly invoked per-handler), not middleware.
```

**Structural note:** authorization is enforced by **two entirely different mechanisms** depending on which path a request takes — Postgres RLS for direct frontend↔Supabase calls, and manual `user.id` scoping (with RLS bypassed via the service-role key) for anything that goes through `api/*`. Both are correct as implemented, but there's no single place that documents or enforces "every code path must authorize by user ownership" — it's a convention each of the ~10 relevant call sites happens to follow correctly today, not a boundary the architecture makes hard to get wrong.

---

## 7. Flow: Billing (Checkout → Webhook → Entitlement)

```
1. UpgradeModal / PricingPage / SubscriptionsPage
      → services/subscriptions.js.startCheckout(plan)
      → POST /api/polar/checkout

2. api/polar/checkout.js:
      getAuthenticatedUser(req)
      → getProductId(plan)                     [api/_utils/polar.js + planCatalog.js —
                                                  server-side allow-list, rejects
                                                  anything not a known Pro product]
      → SELECT subscriptions WHERE user_id      [409 guard: refuses to start a second
                                                  checkout while one is already active —
                                                  a known TOCTOU race under concurrent
                                                  requests, see V2_MASTER_AUDIT.md TD-23]
      → polarFetch POST /v1/checkouts/
           { external_customer_id: user.id, ... }
      → returns { url } → frontend does
           window.location.assign(url)           [full navigation to Polar's hosted page]

3. User completes payment on Polar's hosted checkout (outside EmberFlow entirely).

4. Polar → POST /api/polar/webhook  (subscription.created / .updated / etc.)
      readRawBody → verifyPolarWebhook()        [Standard Webhooks HMAC signature]
      → idempotency check against webhook_events table (by delivery id)
      → resolveUserId(data)                     [customer.external_id, then
                                                  metadata.user_id, then a DB
                                                  lookup by stored Polar ids —
                                                  three-tier fallback]
      → normalizeSubscription(data, existing)   [derives plan/status/dates purely
                                                  from THIS event's payload —
                                                  replay-safe, but see TD-24: no
                                                  "apply only if newer" guard]
      → upsert into subscriptions (onConflict: user_id)

5. Frontend lands back on /app/subscriptions?billing=success.
      useSubscription() (hooks/useSubscription.js) fetches the subscriptions
      row DIRECTLY from Supabase (not through the API layer at all — the read
      side and the write/mutation side of the same table go through two
      completely different code paths). Also refetches on `visibilitychange`
      and `pageshow` specifically to work around a documented bfcache issue
      with Polar-portal round trips (see the inline comment in
      useSubscription.js — this is real, deliberate defensive engineering,
      not an oversight).

6. Plan switch (Monthly ↔ Yearly): SubscriptionsPage → switchPlan() →
      POST /api/polar/switch → Polar PATCH .../subscriptions/{id}
      { product_id, proration_behavior: 'invoice' }  [same subscription
      updated in place — deliberately not a second checkout, to guarantee
      a user can never end up with two parallel Polar subscriptions]
      → webhook re-confirms → frontend polls the DB row for ~12s
      (TD-28: bounded polling, not realtime — stale UI if the webhook lags).

7. Cancel / Resume: same pattern via POST /api/polar/cancel
      { cancel_at_period_end: boolean }.

8. Manage billing / update card: openBillingPortal() → POST /api/polar/portal
      → Polar hosted Customer Portal session (external redirect, has its own
      customer-id recovery logic for the sandbox→production cutover case —
      see api/polar/portal.js).

9. Both switch.js and cancel.js treat a 404 from Polar as proof the stored
      polar_subscription_id is stale and immediately collapse the user to
      Free (collapseToFreeAfterMissingSubscription, api/_utils/polar.js).
      This is a REAL structural risk, not just a bug: it's a single-404
      circuit with no confirmation step, sitting on the highest-blast-radius
      code path in the app. See V2_MASTER_AUDIT.md MF-7 for the full
      analysis — flagged here because it's the billing flow's most
      consequential architectural decision, not an edge case.
```

**Entitlement checking is scattered across the flow, not centralized:** DB triggers gate writes (step 5 of the DB layer, §5), `utils/plans.js`/`FeatureGate.jsx` gate UI, and the `subscriptions` row itself is the only shared state — but nothing in the architecture *is* "the entitlements service"; it's an emergent property of three independent implementations agreeing (most of the time).

---

## 8. Flow: Proposal

```
1. ProposalsPage → listProposals() (services/api.js) — embedded join,
      proposal_items sorted client-side by `position`.

2. New → ProposalFormPage.jsx (406 lines), wrapped in <FeatureGate
      feature="proposals"> at the route level — a Free user sees the
      upgrade panel instead of the form entirely.

3. Inside the form: client/currency selection, line-item editor (own,
      independent total-calculation logic — does NOT import
      utils/invoice.js's calculateInvoiceTotals, unlike the structurally
      identical invoice line-item editor — see §12.2 #6), document preview
      via ProposalDocument.jsx + TemplateSelector + ScaledPreview +
      MobilePreviewSheet (document-studio, wired independently — §12.2 #7),
      export via useDocumentExport (shared, correctly deduplicated).

4. Save → createProposal(values, items) (services/api.js) — a PLAIN
      two-step insert (proposal row, then proposal_items rows), no RPC, no
      transaction. A failure between the two steps leaves an orphaned,
      itemless proposal (V2_MASTER_AUDIT.md TD-5).

5. No edit route exists (App.jsx has no /app/proposals/:id or
      /app/proposals/:id/edit) — only Duplicate-as-new and Delete. This is
      a genuine architectural asymmetry against the otherwise-parallel
      Invoice flow (§9), which has full create/read/update. May be an
      intentional product decision (a proposal as a point-in-time
      document); it is not currently a documented one.

6. Pro-gating is enforced TWICE, independently: FeatureGate at the route
      (frontend, UX-friendly) and enforce_proposals_pro_only trigger at the
      DB (defense in depth, correct) — but as noted in §5, these are two
      hand-written implementations of the same rule with no shared source.
```

---

## 9. Flow: Invoice

```
1. InvoicesPage → listInvoices() — a flat list, plus bulk delete/mark-paid
      actions implemented via Promise.all() over per-row requests (not
      Promise.allSettled — a partial-failure leaves the UI silently
      out of sync with the DB; V2_MASTER_AUDIT.md MF-2).

2. New/Edit → InvoiceFormPage.jsx (423 lines — the largest form page in
      the app) owns, in one component: client picker, line-item editor +
      tax/discount math (utils/invoice.js calculateInvoiceTotals — the
      ONE calculation utility that IS shared, just not with Proposals),
      currency selection, Pro-gated template/theme picker (own inline
      UpgradeModal wiring), live document preview (document-studio, wired
      independently from InvoiceDetailPage's and ProposalFormPage's copies
      of the same wiring), and the export menu. Roughly seven distinct
      concerns in one file — see §12.3 (#3).

3. Save path bifurcates by create vs. edit, with DIFFERENT integrity
      guarantees for what is otherwise "the same save button":
        - createInvoice()  → create_invoice_with_items RPC — ATOMIC.
        - updateInvoice()  → update the invoice row, DELETE all
          invoice_items, re-INSERT the new set — THREE separate round
          trips, NO transaction. A failure between the delete and the
          insert leaves a real, possibly-already-sent invoice with ZERO
          line items (V2_MASTER_AUDIT.md MF-3). This is the single most
          consequential structural inconsistency found in this review:
          the architecture solved this exact problem once, correctly, and
          the fix simply wasn't extended to the twin code path 20 lines
          away in the same file.

4. InvoiceDetailPage.jsx (392 lines) — view + status transitions +
      payment recording (§10) + its OWN independent copy of the
      document-preview/export wiring (TemplateSelector, ScaledPreview,
      ExportMenu, useDocumentExport) — a third independent instantiation
      of the same composition pattern described in §2.6/§12.2 (#7).
```

---

## 10. Flow: Payment (client payment tracking — distinct from Billing)

**Important structural distinction, worth stating explicitly:** "Payment" here means a freelancer manually recording that *their client* paid an invoice (bank transfer, cash, check) — a bookkeeping record with no money movement through EmberFlow at all. This is a **completely separate system** from the Billing flow in §7, which is Polar processing *EmberFlow's own* SaaS subscription charge. The two flows share the English word "payment" and nothing else — no shared code, no shared table (`payments` vs. `subscriptions`), no shared UI. Worth flagging because the naming overlap is a real source of confusion when onboarding anyone new to the codebase.

```
1. InvoiceDetailPage → a form posts to createPayment(values)
      (services/api.js).

2. createPayment():
      INSERT payments row
      → getInvoice(invoice_id)                  [a full separate re-fetch]
      → sum(payments.amount) in JavaScript
      → IF sum >= invoice.total: updateInvoiceStatus(id, 'paid')

3. deletePayment() mirrors this in reverse (delete → re-fetch → re-sum →
      conditionally revert status to 'sent').

Neither step is wrapped in a transaction or a SELECT ... FOR UPDATE — two
concurrent payment writes against the same invoice can race (lost update).
Separately, and more structurally significant: "what counts as a valid
payment amount" and "when does an invoice become paid" are BOTH decided in
JavaScript, in the service layer — unlike the Pro-gating rules (§5), which
ARE enforced as database triggers. There is no consistent policy for WHERE
a business rule should live (app code vs. database); each rule's location
reflects whichever pattern was closest at hand when it was written, not a
deliberate layering decision. See §12.5 (#5) and V2_MASTER_AUDIT.md MF-4
(no CHECK constraints back this arithmetic at all).
```

---

## 11. Flow: Subscription (entitlement read-side)

Distinct from §7 (which is the *mutation* side — checkout/switch/cancel). This is how the rest of the app answers "what can this user do right now."

```
1. hooks/useSubscription.js — on mount (and on user change), fetches:
      getSubscription()    [services/api.js — direct Supabase read of the
                             subscriptions table, most-recent row]
      getUsageSummary()    [services/api.js — COUNT clients + COUNT
                             invoices created since UTC month start —
                             V2_MASTER_AUDIT.md TD-13 notes the UTC-vs-local
                             boundary edge case]
   ...in parallel, then derives entitlements via:
      utils/plans.js getEntitlements(subscription)
         → reads config/plans.js's plan catalog (limits, feature flags per
           plan) and returns { isPro, canUseFeature(), clientLimit,
           invoiceLimit, ... }

2. Every independent consumer calls useSubscription() itself — there is no
   shared/context-level cache, so FeatureGate, BillingNudge, and a page that
   also needs subscription data (e.g. SubscriptionsPage itself) each fetch
   the SAME row independently if they're mounted together. Confirmed:
   FeatureGate.jsx and BillingNudge.jsx both independently call
   useSubscription() and can both be mounted on the same authenticated page.

3. Consumers: FeatureGate (route-level Pro gating), BillingNudge (past_due
   dunning banner, rendered inside AppLayout on every route), UpgradeModal,
   InvoiceFormPage/ProposalFormPage (inline Pro-template checks),
   SubscriptionsPage (the full billing UI).

4. The DATABASE independently re-answers the same "is this user Pro"
   question at write time via the enforce_*_pro_only triggers (§5) — using
   its own hardcoded plan-name literals, not config/plans.js. Two
   implementations of one rule, confirmed to already exist as separate code
   with no shared source — the most concrete "missing abstraction" finding
   in this entire review (§12.4 #4).
```

---

## 12. Structural Findings

### 12.1 Tight Coupling

1. **UI components know database shape.** Pages call `services/api.js` functions that return raw Supabase rows (including relationship shape like `invoice.invoice_items`, sorted client-side) directly into component state — there is no interface boundary that would let the actual database, join strategy, or ORM change without touching every page that reads an invoice.
2. **`useSubscription()` serves three structurally different consumers through one undifferentiated hook.** Route-gating (`FeatureGate`), a persistent dunning banner (`BillingNudge`), and a full billing dashboard (`SubscriptionsPage`) all consume the exact same ~10-field return shape. A change meant for one consumer (e.g. adding a field only `SubscriptionsPage` needs) has no way to avoid being visible to, and re-fetched by, the other two.
3. **`AppLayout.jsx` couples navigation-shell rendering to a specific business feature.** It renders `<BillingNudge />` directly inside its `<main>`, meaning the navigation shell component cannot be reasoned about, tested, or reused without also carrying a billing-specific dependency.
4. **`document-studio` is coupled into three pages by copy-composition, not by an interface.** `InvoiceFormPage`, `InvoiceDetailPage`, and `ProposalFormPage` each independently import and wire the same five document-studio pieces — a change to how those pieces compose (e.g. a new required prop on `MobilePreviewSheet`) must be made in three places, and there's no compiler/type system to catch a missed one (plain JS, per CLAUDE.md).
5. **The plan/entitlement model is coupled across a language boundary with no shared contract.** `config/plans.js` (JS, frontend) and the `enforce_*_pro_only` Postgres triggers (SQL, database) both encode "what Pro includes" — confirmed independently written, confirmed to already have drifted in *mechanism* (the JS reads a data catalog; the SQL hardcodes literals) even where they still agree in *outcome*.
6. **Billing reads and billing writes don't share a boundary.** Mutations go through `api/polar/*.js` (serverless, service-role, Polar API calls); reads go directly through the Supabase client from `useSubscription()`. A future change to what a `subscriptions` row looks like (e.g. a new derived field) has to be made correctly in `normalizeSubscription()` (write side) AND wherever the frontend assumes the row's shape (read side), with nothing tying the two together.

### 12.2 Duplicate Logic

1. **`authenticatedFetch`** is implemented twice, nearly identically, in `services/subscriptions.js` and `services/account.js` (self-acknowledged in a code comment as a deliberate small-diff tradeoff — flagged here because a third near-identical implementation would tip this from "acceptable" to "needs extracting").
2. **Focus-trap logic** is implemented twice: `hooks/useFocusTrap.js` (the shared hook) and `document-studio/MobilePreviewSheet.jsx`'s `useMobilePreviewSheet` (a separate, near-identical reimplementation, per its own comment acknowledging the duplication without resolving it).
3. **Fetch/loading/error boilerplate** is duplicated across roughly a dozen pages instead of built once — `useProfile()` exists and does exactly this, but only 2 of 8 pages that need profile data actually use it.
4. **Currency-total aggregation** is implemented correctly once (`AnalyticsPage`, dominant-currency-with-exclusion, with an inline comment explaining why naive summing is wrong) and re-implemented **incorrectly** twice (`DashboardPage`, `ClientDetailPage` — naive summing across currencies; V2_MASTER_AUDIT.md MF-1). A case where the *duplicate* is the wrong copy.
5. **Pro-entitlement logic** is duplicated between JavaScript (`utils/plans.js`, `FeatureGate.jsx`) and SQL (five independent `enforce_*_pro_only` triggers) — the same rule, maintained in two languages with no shared source (§5, §12.4 #4).
6. **Document-total calculation** exists once for invoices (`utils/invoice.js calculateInvoiceTotals`, shared correctly between `InvoiceFormPage` and the invoice document renderer) but is **not** reused by `ProposalFormPage` — confirmed via import list: `ProposalFormPage.jsx` does not import `utils/invoice.js` at all, meaning proposal totals are computed by a separate, parallel implementation for a conceptually identical "sum line items, apply tax" operation.
7. **Document-studio composition** (the JSX wiring of `TemplateSelector` + `ScaledPreview` + `MobilePreviewSheet` + `ExportMenu` into a page) is independently duplicated three times (`InvoiceFormPage`, `InvoiceDetailPage`, `ProposalFormPage`) even though the underlying export *logic* was correctly deduplicated into `useDocumentExport`. A partial abstraction — the "what" was fixed, the "how it's assembled into a page" wasn't.

### 12.3 Overly Large Components

Ranked by line count, with the specific concerns each one is carrying:

| File | Lines | Concerns fused into one component |
|---|---|---|
| `pages/SubscriptionsPage.jsx` | 662 | Plan display, usage meters, cadence switch UI, cancel/resume flow, billing history summary, Early Supporter badge, past-due/revoked messaging, Pro-activation trigger, checkout-redirect handling (`?billing=success`) |
| `pages/BrandStudioPage.jsx` | 499 | Logo upload, color picker, font picker, live preview, free/Pro gating, save/reset |
| `pages/InvoiceFormPage.jsx` | 423 | Client picker, line-item editor + tax math, currency selection, Pro-gated template picker, live document preview, export menu (§9) |
| `pages/ProposalFormPage.jsx` | 406 | Structurally near-identical to InvoiceFormPage, independently maintained (§12.2 #6) |
| `components/ui/Input.jsx` | 398 | Likely several related-but-distinct field types in one file — 4× the size of the next-largest primitive (`Button.jsx`, 92 lines) |
| `pages/InvoiceDetailPage.jsx` | 392 | View + status transitions + payment recording (§10) + its own copy of document-preview wiring (§12.2 #7) |
| `components/ui/Table.jsx` | 362 | Pagination, sorting, empty/loading states, accessibility, column rendering — all internal to one primitive |
| `services/api.js` | 345 | Data access for 7+ distinct domain entities (clients, invoices, invoice_items, payments, proposals, proposal_items, profiles) in one flat file with no per-domain module boundary |

None of these are "wrong" in isolation — they work, and V1 shipped. The pattern across all eight is the same: **no page or file was ever split when it grew past the point where a new engineer could hold its full set of responsibilities in their head.** At 5 pages this doesn't matter; at 25 pages (today) it's already the top reason a first-time contributor would need a guided tour rather than being able to read the file.

### 12.4 Missing Abstractions

1. **No data-fetching/caching layer** (e.g. TanStack Query). Every page reimplements `loading`/`error`/refetch state by hand; no request de-duplication; no cache invalidation when data changes elsewhere (a `SettingsPage` profile edit doesn't propagate to any other open tab or already-mounted component without a full reload).
2. **No repository/data-access layer** between the UI and Supabase. `services/api.js`'s functions are thin, individually-shaped wrappers (some throw custom errors, some silently default to a fallback object, some return raw joined rows) rather than a consistent domain-model interface a future backend swap or caching layer could sit behind.
3. **No reusable "atomic multi-table write" pattern.** `create_invoice_with_items` solved this once, correctly, via an RPC. `updateInvoice()`, `createProposal()`, and `createPayment()`/`deletePayment()` all need the identical guarantee and don't have a shared pattern or helper to reach for — each was solved (or, in three of four cases, not solved) independently.
4. **No single entitlements service.** "Is this user allowed to do X" has three independent answers today (frontend derived state, `FeatureGate` component, database triggers) with no shared contract, confirmed to already differ in *mechanism* even where they still agree in *outcome* (§5, §12.1 #5).
5. **No API middleware/composition layer.** Every serverless route hand-rolls the identical method-check/rate-limit/auth/error-handling scaffold (§4) instead of composing it once.
6. **No request/response schema validation** anywhere in the API layer (no zod/yup/similar) — validation is implicit in whatever each handler happens to check.
7. **No document-composition abstraction.** A `<DocumentEditor kind="invoice" | "proposal">` composite that both form pages could consume doesn't exist (§2.6, §12.2 #7) despite the underlying pieces already being individually reusable.
8. **No automated test suite.** Confirmed zero `*.test.js`/`*.spec.js` files and no test runner configured anywhere in the repository. The two `scripts/verify-*.js` files are valuable but narrow — they check pure business-logic functions in isolation (e.g. `normalizeSubscription()`'s output for a given input), not a single React component, page, or the actual wiring of an API route end-to-end. For a codebase whose stated goal is 5-year maintainability, this is the single highest-leverage gap: every structural change recommended in §13 becomes materially riskier to make without regression coverage to lean on.

### 12.5 Poor Separation of Concerns

1. **Pages own presentation, data-fetching, AND business rules simultaneously**, with no container/presentational split anywhere in the codebase. `InvoiceFormPage` computes totals, gates Pro templates, fetches clients/profile, and renders the form and the document preview — all in one 423-line function component.
2. **A single business rule's implementation "home" is inconsistent and undocumented.** Pro-entitlement checks live in React components (`FeatureGate`) AND Postgres triggers. Invoice-paid-status derivation lives in a plain JS service function (`services/api.js`). There is no written-down policy for "this class of rule belongs in the database, this class belongs in the app layer" — each rule's current location reflects whichever pattern was closest at hand when it was first written (§10, §12.4 #4).
3. **`AppLayout.jsx` mixes three unrelated responsibilities**: navigation shell (sidebar/topbar/collapse state), app-entrance animation orchestration, and rendering a specific billing feature (`BillingNudge`) — in one component every authenticated page mounts through (§2.3, §12.1 #3).
4. **`api/_utils/polar.js` mixes four responsibility levels in one 227-line module**: low-level HTTP transport (`polarFetch`), cryptographic webhook verification (`verifyPolarWebhook`), pure data mapping (plan↔product ID), and business-decision logic (`collapseToFreeAfterMissingSubscription` — deciding when to downgrade a real user). A transport-layer change and a business-policy change currently require editing the same file for unrelated reasons.
5. **`services/api.js` mixes true data access with embedded business logic.** Simple selects (`getClient`, `listInvoices`) sit alongside payment-status derivation math (`createPayment`/`deletePayment` computing whether an invoice is now fully paid) in the same file with no internal boundary between "talk to the database" and "decide what a paid invoice means."

---

## 13. Suggested Architecture Improvements for V2

Presented as directions, not a sequenced plan — sequencing is a product/prioritization decision, not an architectural one. **Nothing below has been implemented; this is analysis only, per the brief.**

### Frontend

- **Adopt a data-fetching library** (TanStack Query is the natural fit given the promise-based Supabase client already in use) as the single way pages fetch anything. This alone resolves §12.2 (#3), most of §12.1 (#2), and half of §12.4 (#1) at once — it is the single highest-leverage change available.
- **Introduce a repository layer** between `services/api.js` and pages — one module per domain (`repositories/invoices.js`, `repositories/clients.js`, etc.) with a consistent return/error contract, replacing the current flat 345-line file. This is what makes a future backend change (or even just adding caching) possible without touching every page.
- **Extract a `<DocumentEditor>` composite** from the three independent wirings of document-studio pieces in `InvoiceFormPage`/`InvoiceDetailPage`/`ProposalFormPage` — parameterized by document kind, following the precedent `useDocumentExport.js` already set for the export logic itself.
- **Split the largest files along their actual seams** (§12.3): `SubscriptionsPage` into plan-display / usage / cancel-resume / activation sub-components; `InvoiceFormPage`/`ProposalFormPage` into a shared form shell plus kind-specific fields; `Input.jsx`/`Table.jsx` into their constituent primitives.
- **Give `AppLayout` a slot for feature-specific banners** (or move `BillingNudge` to render from `App.jsx`/a route-level wrapper) rather than hardcoding a billing feature into the navigation shell.

### Backend / API

- **Introduce a thin middleware/handler-wrapper pattern** (`withApiRoute(handler, { method, rateLimit, requireAuth })`) so the six routes stop hand-copying identical scaffolding, and any future cross-cutting change (logging, a new required header, a different auth scheme) is a one-file change.
- **Add request schema validation** (zod is a natural fit for a Node/Vercel function environment) at the top of each handler, replacing implicit `req.body || {}` trust.
- **Consolidate the safe-error-message pattern** into a typed error class (e.g. a distinguishable `BillingError`) rather than five routes independently bypassing `sendError()` with a comment each time (also flagged as SEC-2 in the companion audit).
- **Add a circuit breaker to the Polar 404-self-heal logic** (`collapseToFreeAfterMissingSubscription`) before any further billing work is layered on top of it — this is the highest-blast-radius single mechanism in the backend (MF-7 in the companion audit) and any V2 billing work should not build on it as-is.

### Database

- **Establish one source of truth for the plan/entitlement model** that both the frontend catalog and the database triggers read from — at minimum, generate the SQL triggers' literals from the same `config/plans.js` catalog at migration-authoring time, rather than hand-maintaining both; at best, move all Pro-gating logic to one layer (the database, since it's the layer that can't be bypassed) and have the frontend purely reflect it rather than independently re-implementing the check.
- **Extend the `create_invoice_with_items` RPC pattern** to `updateInvoice`, `createProposal`, and the payment-status recompute — one general "atomic multi-table write" pattern applied consistently, not four independent ad hoc decisions.
- **Regenerate `schema.sql`/`policies.sql` from a live database** (or retire them in favor of the migrations directory as the only documented source of truth) before any V2 schema design work starts — this is a prerequisite, not a nice-to-have (MF-6 in the companion audit).
- **Adopt real migration tooling** (`supabase db push` or equivalent, with `schema_migrations` bookkeeping) so migrations are guaranteed idempotent and replayable — a near-requirement if V2 ever needs a second environment (staging) run in parallel with production.

### Process / Testing

- **Establish a test pyramid from zero.** Given the current baseline (two isolated logic-verification scripts, nothing else), the highest-leverage starting point is: (1) unit tests for the business-logic-heavy utils (`utils/invoice.js`, `utils/plans.js`, `api/_utils/polar.js`'s pure functions), since they're already pure and cheap to test; (2) integration tests for the API routes (mocking Supabase/Polar at the boundary) to catch exactly the class of regression this review found (MF-2, MF-3, MF-4 — all would be caught by a test asserting "a partial failure doesn't corrupt existing data"); (3) a small number of end-to-end tests for the three or four flows that most need it (checkout, invoice create/edit, account deletion).
- **Wire test execution into CI** before it's needed for a specific bug — retrofitting tests onto a change that's already in flight is far more expensive than having them run automatically from day one of V2.
- **Document the "where does this rule live" policy explicitly** (app layer vs. database) once, so future contributors have a default to follow instead of pattern-matching on whatever's nearby (§12.5 #2).

---

## Related Documents

- **`V2_MASTER_AUDIT.md`** (2026-08-06) — the issue-level companion to this document: concrete bugs, security findings, accessibility/mobile/performance/SEO issues, each with severity and effort estimates. Several findings here (MF-1 through MF-7, TD-5, TD-13, TD-15, TD-23, TD-24, TD-28, SEC-2, SEC-6) are the bug-level manifestations of the structural issues described in §12.
- **`KNOWN_ISSUES.md`** — superseded by `V2_MASTER_AUDIT.md` per that document's header; not re-superseded here.
- **`V1.5_ROADMAP.md`** — billing-correctness follow-ups (Milestone A) overlap with several findings in §7/§12 by design; this document's recommendations are compatible with, not a replacement for, that roadmap's sequencing.
