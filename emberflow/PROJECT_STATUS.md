# EmberFlow Project Status

## Project Overview

EmberFlow is a production-ready freelance finance workspace SaaS. It enables freelancers to manage clients, create/send/track invoices, build proposals, analyze revenue, and handle subscriptions via Paddle. Built with React + Vite frontend, Supabase (PostgreSQL, Auth, Storage) backend, and Paddle for billing. Deployed on Vercel with serverless API routes.

---

## Current Branch

**opclaude-redesign** (feature branch off `main`)

This branch is executing a staged roadmap toward a dark-first, OpenClaude-grade premium redesign, culminating in a white-label-ready product. No backend logic, API endpoints, database schema, or authentication flow is being modified except where explicitly called out and approved per phase.

---

## Redesign Roadmap Progress

A full-codebase audit and a 10-phase implementation roadmap were produced before any code changed (see conversation history / plan artifact for the full roadmap). Each phase is independently committed, build-verified, and reversible.

| Phase | Status | Summary |
|---|---|---|
| 0 — Trust & correctness fixes | ✅ Done | Fixed blank invoice status badge (`InvoicesPage`), removed fabricated "+X% vs last month" trend copy from Dashboard/Analytics, removed a PII console.log in Paddle checkout, locked API CORS to `APP_URL` instead of `*`. |
| 1 — Dark-first design system foundation | ✅ Done | `tokens.css` rebuilt dark-first (dark values live on `:root`, light theme is the explicit `[data-theme='light']` override); added `useTheme`/`ThemeProvider` + `ThemeToggle` wired into `AppLayout` and `PublicLayout`; inline blocking script in `index.html` reads `localStorage`/`prefers-color-scheme` and sets `data-theme` pre-hydration to avoid a flash of the wrong theme; `color-scheme` set on `html` so native form controls follow the theme; self-hosted Inter + JetBrains Mono via `@fontsource` (Latin-subset imports only, cut bundled font files from 102 → 14 and CSS payload ~35KB); converted all remaining hardcoded light-theme hex/rgba colors in component CSS (avatars, sidebar, topbar, modals, cards, layout) to theme-aware tokens — decorative landing-page mockup colors (`.preview-*`) intentionally left as static, and white button text on saturated accent backgrounds intentionally left literal since both are theme-independent by design. |
| 2 — Component library hardening & motion | ✅ Done | Fixed a critical Phase 1 miss first: Card/.panel (the most-used surface in the app), the sidebar, topbar, table row hover/stripe states, the loading overlay, and the input error focus glow were still hardcoded to old light-theme rgba/hex values that the Phase 1 hex-only grep didn't catch — wired to the correct theme tokens. Then hardened the component library: fixed Modal's `aria-hidden` incorrectly hiding the whole dialog from assistive tech, wired up Checkbox's non-functional `indeterminate` prop (Table's select-all checkbox), added the missing `.spinner--xs`/`.spinner--xl` CSS, gave Drawer a `closeOnEscape` prop to match Modal, fixed Chip's missing `chip--removable` class. Normalized interactive states to `:focus-visible` (Input/Textarea/Select) and added missing `:active` press states (IconButton, table pagination) and keyboard/focus support for Card's `interactive` variant. Added a fade+slide entrance to EmptyState and tokenized skeleton-animation easing. Removed confirmed-dead CSS (`.card*` duplicate of `.panel*`, unused `.status-badge*`, unreferenced loading classes). |
| 3 — App shell & navigation premium pass | ✅ Done | Fixed a pre-existing Avatar bug (duplicate/missing fallback rendering) found while making avatars more prominent. Rendered the mobile nav drawer's backdrop (styled in CSS since Phase 1 but never mounted in `AppLayout.jsx`) and fixed its z-index sitting below the sticky topbar; added Escape-to-close, scroll lock, and focus management to match Modal/Drawer. Topbar title is now dynamic per-section instead of a static repeated brand name; sidebar/topbar avatars now link to Settings; active nav item is visually distinct from hover (blue-tinted vs. neutral); removed dead speculative topbar CSS (search/user-menu/notifications never wired to JSX). |
| 4 — Core app pages redesign | ✅ Done | Usability-first pass (confirmed with the user: keep existing phase boundaries; pivot the neutral palette to cool slate/graphite per the user's explicit "$30M SaaS" brief) across Dashboard, Analytics, Clients (list/detail/form), Invoices (list/detail/form), Proposals (list/form), and Settings. Fixed real bugs found along the way: Dashboard StatCard icons silently not rendering, Input/Select `leftIcon` prop silently doing nothing, Avatar's fallback rendering inverted (duplicated with no src, missing with a broken src), and ProposalFormPage's template switcher silently overwriting user edits with no confirmation. Added a shared `ConfirmDialog` and replaced all six `window.confirm()` delete flows. Wired up Table's already-built sorting/pagination/selection on Clients and Invoices (previously unused), added bulk actions, made stat cards/rows deep-link into filtered views, gave invoices a compact line-item editor with sticky totals and Enter-to-add-row, added a Proposal duplicate workflow, restructured Settings into headed sections with a usage meter, and removed several dead/duplicate CSS blocks (including a `.item-row` responsive bug where a higher-specificity rule silently defeated the mobile-collapse breakpoint). |
| 5 — Marketing & legal pages redesign | 🔶 In progress | **Design-system foundation pivot (cross-cutting, applies to every phase 0-4 page automatically via tokens):** replaced the blue accent system with a contrast-checked "Ember" terracotta accent (`--color-accent*` in tokens.css, ~63 references renamed across 13 files) used consistently for buttons/active-nav/focus-rings/links; fixed a real bug where the primary "New Invoice"-style button's text became invisible on hover (CSS-specificity collision between the button's own hover style and the global `a:hover` rule) plus the same underlying bug causing unwanted underlines on sidebar nav, table links, stat-card links, and the public marketing nav; redesigned the sidebar (near-black bg, lighter nav-label weight, Ember-tinted hover/active — colors centralized in tokens.css's "SIDEBAR" block); redesigned buttons (larger radius/padding, softer shadows) and gave every interactive card a consistent hover treatment (lift + thin accent outline + soft glow). **Landing page:** fully rebuilt from scratch (new dedicated `landing.css`, new hero/why/features/workflow/trust/pricing/FAQ/CTA sections, dropped the old fabricated testimonials in favor of a real engineering-trust section, added a dependency-free scroll-reveal for motion) plus a premium sticky nav and multi-column footer shared by all public pages. **Not yet done:** Features, Pricing, Auth/Forgot-password/Reset-password, and the legal pages still use their pre-existing layout/copy (they inherit the new tokens automatically so they aren't visually broken, just not individually redesigned yet). |
| 6 — Premium templates & live editors | ✅ Done | Replaced the old manual-jsPDF-drawing export (couldn't be made pixel-consistent with any preview by construction) with an HTML-render → html2canvas → jsPDF pipeline (`frontend/src/document-studio/`); the live editor and the exported file now share the exact same DOM node, guaranteeing consistency by architecture rather than by careful maintenance. Built 8 shared visual themes (Modern/Executive/Minimal/Corporate/Creative/Elegant/Dark/Ember Signature) rendered through one generic `DocumentTemplate`, so invoices and proposals reuse the same 8 designs instead of needing 16 independent ones. Invoice and Proposal forms are now split editor/live-preview studios (stacks to editor-above-preview under 920px); a native searchable/keyboard-accessible template selector and a native hex/RGB/preset/recent-colors color picker replace browser controls; export menu covers PDF/Print/HTML/Markdown/JSON/CSV/TXT/DOCX (the last via a new `docx` dependency), gated Free-vs-Pro through the existing centralized `plans.js` feature matrix (the live editor itself stays free-tier). One additive migration (`invoices.template`, mirroring the pre-existing unconstrained `proposals.template` column) was needed for template choice to persist — flagged prominently since schema has been the most protected constraint all project. Deliberately did *not* add separate primary/accent/secondary color columns or a second logo column as literally listed in the brief; instead derives a full coherent palette from the single existing `invoice_brand_color` (shown to the user in Settings) — a scope decision made explicit in the commit history, not a silent omission. Found and fixed two real bugs during self-review before they shipped (an export-ref pointing at the wrong DOM node; a hardcoded thumbnail scale that could clip previews) plus one naming collision (`proposals.template` was already used for an unrelated "content starter" concept, resolved by renaming that to `starterKey` and repurposing the column for the visual theme). Not verified against real device/browser rendering — no visual testing tooling was available this session; verification was build-clean + careful code review only. |
| 6.5 — Responsive system audit & QA pass | ✅ Done | **QA pass (bug reports from live use, not planned scope):** fixed the mobile hamburger staying visible on desktop — `.mobile-only`/`.desktop-only` lived in `layout.css`, which loads before `buttons.css`/`sidebar.css`, so a component's own unconditional `display` rule (loaded later, equal specificity) was winning regardless of viewport; moved both into a new `styles/utilities.css` imported last so they always win. Fixed invoice/proposal line-item inputs losing focus on every keystroke — the row's React `key` included the very field being typed (`` `${index}-${item.description}` ``), so each character changed the key and React remounted the input; keyed on index alone. Fixed the live preview vibrating continuously whenever the sidebar was collapsed — a genuine `ResizeObserver` feedback loop (collapsing frees enough width to push preview scale to ~1, making the scaled document taller than its container's `max-height`, which shows a scrollbar, which narrows the container, which drops scale, which drops height back under the limit, hiding the scrollbar — repeat every frame); fixed with `scrollbar-gutter: stable` rather than a debounce. Added working smooth-scroll to the landing page's "Features"/"Pricing" nav links (previously routed to separate pages with no in-page anchors), with `scroll-margin-top` for the sticky nav, a `prefers-reduced-motion`-aware helper, and an `IntersectionObserver` scroll-spy for the active nav item. **Responsive redesign (the actual Phase 6.5 scope):** the invoice/proposal studio now has three intentionally distinct tiers instead of two — desktop keeps the sticky split (editor/preview side by side), tablet (681-920px) keeps the existing stack (editor above preview), and phone (≤680px) is new: editor only by default, with the live preview becoming a bottom sheet opened by a floating Ember-accent action button. The sheet reuses the *same* `.studio-preview` DOM node across all three tiers (CSS only repositions it), so the export ref never moves and pixel-parity with exports is unaffected. The shared `Table` component (used by every list page — Clients, Invoices, Proposals, payments) now renders each row as a floating card on phone instead of shrinking columns to fit, since a 5-6 column financial table has no readable shrunk form at 320-375px; pure CSS reflow of the same markup via `data-label` + `::before`, no JS layout math. Also fixed a dead-code modal-sizing bug (`--lg`/`--xl` size modifiers couldn't actually widen the modal because `width` was already resolved smaller than any modifier's `max-width`), added viewport-edge safety (`max-width: calc(100vw - 2rem)`) to the export-menu and color-picker popovers, and fixed a ranking-row grid track that could be forced wider than its container by a long client/company name (now truncates with an ellipsis instead). Audited every grid in `layout.css`/`landing.css` against the full supported-device list (320px phones through 4K/ultrawide, tablets, foldables) by hand — the large majority already had correct breakpoint coverage from earlier phases; the items above are the real gaps found, not a rewrite. **Not verified:** no real device lab or browser automation was available this session — verification was build-clean + line-by-line CSS cascade/specificity tracing, not actual rendering on the listed devices (iPad Mini/Air/Pro, Galaxy Fold, Pixel Fold, etc.). Recharts is listed in `CLAUDE.md` as a preferred library but isn't integrated anywhere yet, so "Charts" responsiveness had nothing to audit. |
| 7 — Performance & bundle optimization | ✅ Done | **Bundle/perf:** route-level `React.lazy` code splitting for all 21 pages, vendor split into stable-hash chunks for long-term caching (jsPDF/html2canvas/docx now load only on export), removed the unused UI barrel file, and stripped ~730 lines of dead CSS across 8 stylesheets — each removed selector cross-checked against JSX/JS/HTML (including dynamic `className` template construction), used grouped selectors split rather than dropped so live classes keep their styling. **Accessibility:** added a WCAG 2.4.1 skip-to-content link to the app shell (main region now `id`/`tabIndex` focus target); raised the three sub-44px compact controls (`.icon-button--sm`, `.modal-close`, `.table__page`) to 44px on `@media (pointer: coarse)` only, preserving desktop density; verified the global `prefers-reduced-motion` block, every `IconButton` `aria-label`, and that the four `onRowClick` tables each already expose a keyboard link to the same route (row-click is redundant mouse convenience, not a lockout). **Images/CLS:** `loading="lazy"` + `decoding="async"` on below-the-fold avatars and the Settings logo (safe — the export/html2canvas DOM uses its own `<img>` tags); confirmed avatars fill a fixed `object-fit` box and the never-used EmptyState illustration branch introduce no layout shift. **Animation:** audited continuous animations — `lp-float` uses `transform` only (with a reduced-motion guard); skeleton/usage-meter transitions are ephemeral/one-shot and conventional, left alone. **Hardening:** top-level `ErrorBoundary` (in the main bundle, not lazy) catches failed lazy-chunk fetches — the blank-white-screen risk that code splitting introduces — with an on-brand fallback, chunk-error detection, and a loop-guarded auto-reload; dark/light `theme-color` meta tags for mobile browser chrome; verified zero `console.log/debug` and complete `<head>` meta. |
| 8 — White-label architecture | Not started | |
| 9 — Documentation & production-readiness sign-off | Not started | |

**Known accepted risk (flagged, not fixed):** the free-plan invoice limit (5/month) is enforced only inside the `create_invoice_with_items` RPC, not by a table-level trigger like the client limit is — a direct insert against `invoices` would bypass it. Left alone deliberately since fixing it requires a schema migration, which this project's architecture-protection rules reserve for explicit approval.

---

## Current Status

| Area | % Complete | Notes |
|------|-----------|-------|
| **Backend** | 100% | Supabase schema, RLS, functions, policies — production ready |
| **Frontend (Core)** | 100% | All pages, routing, hooks, services functional |
| **Authentication** | 100% | Supabase email/password, sessions, password reset |
| **Dashboard** | 95% | Stats, recent invoices table — migrated to new design system |
| **UI (Design System)** | 85% | Tokens + 13 reusable components created; 3/5 app screens migrated |
| **Paddle Integration** | 100% | Checkout, portal, webhooks — production ready |
| **Billing/Subscriptions** | 100% | Free/Pro gating, usage tracking, limits enforced in DB |
| **Legal Pages** | 100% | Terms, Privacy, Refund, Contact — static pages |
| **Pricing Page** | 100% | Free vs Pro comparison, checkout buttons |
| **Deployment Config** | 100% | Vercel config, build scripts, env vars documented |
| **Overall** | 92% | Backend complete; UI redesign 85% done |

---

## Completed Features

### Backend (Supabase)
- [x] Complete PostgreSQL schema (10 tables: profiles, clients, invoices, invoice_items, proposals, proposal_items, subscriptions, invoice_usage, payments, webhook_events)
- [x] Row Level Security on all tables with owner-only policies
- [x] Helper functions: `create_invoice_with_items`, `enforce_client_limit`, `enforce_proposals_pro_only`, `handle_new_user`, `set_updated_at`, `rls_auto_enable`
- [x] Triggers for updated_at, client limits, Pro-only proposals
- [x] Storage buckets: `avatars`, `logos` with user-scoped policies
- [x] Indexes for query performance

### Authentication
- [x] Supabase Auth: email/password signup, login, logout
- [x] Email confirmation flow
- [x] Password reset (forgot/reset pages)
- [x] Persistent sessions via localStorage
- [x] Protected routes with `ProtectedRoute` component
- [x] Auto-profile creation on signup via `handle_new_user()`

### Frontend Core
- [x] React 18 + Vite + React Router v6
- [x] Route structure: public (marketing) + protected (app)
- [x] AppLayout: sidebar nav + topbar + responsive mobile drawer
- [x] PublicLayout: marketing header/footer
- [x] FeatureGate: Pro feature gating with upgrade modal
- [x] useAuth hook: session, signIn, signUp, signOut, resetPassword
- [x] useProfile hook: profile CRUD, avatar/logo upload to Supabase Storage
- [x] useSubscription hook: plan, limits, usage, feature gating

### Dashboard
- [x] Stats grid: total revenue, pending/paid invoices, client count
- [x] Recent invoices table with status badges
- [x] Empty states with CTAs
- [x] **NEW**: Migrated to design system (StatCard, Table, Card, LoadingSpinner, EmptyState)

### Clients
- [x] Client CRUD (create, read, update, delete)
- [x] Searchable/filterable table (name, company, email, phone, country)
- [x] Client detail page with related invoices
- [x] **NEW**: Migrated to design system (Table, Input, Select, Card, Button, EmptyState)

### Invoices
- [x] Invoice CRUD with line items, tax, discounts
- [x] Status workflow: draft → sent → paid / overdue
- [x] Mark sent / mark paid actions
- [x] Invoice detail page with full breakdown
- [x] PDF export (jsPDF + html2canvas)
- [x] Invoice numbering with custom prefix
- [x] **NEW**: InvoicesPage migrated to design system (Table, Button, StatusBadge, Card)

### Proposals (Pro Feature)
- [x] Proposal CRUD with templates (Standard, Detailed, Minimal)
- [x] Line items with amounts
- [x] PDF export
- [x] Pro-only enforcement via DB trigger + FeatureGate

### Analytics (Pro Feature)
- [x] Revenue metrics: total, monthly, pending, overdue
- [x] Top clients by revenue
- [x] **NEW**: Migrated to design system (StatCard, Card)

### Settings
- [x] Profile: name, business, email, phone, address, country, currency
- [x] Avatar upload
- [x] Branding (Pro): logo, accent color, footer, payment instructions
- [x] Invoice prefix
- [x] Subscription: usage meters, upgrade buttons, billing portal
- [x] Plan limits display

### Paddle Billing
- [x] Checkout API: creates Paddle customer, transaction, returns hosted checkout URL
- [x] Customer Portal API: opens Paddle billing portal
- [x] Webhook handler: verifies signature, deduplicates events, syncs subscription to DB
- [x] Handles: subscription.created/updated/canceled, transaction.completed
- [x] Free/Pro plan mapping (pro_monthly, pro_yearly)
- [x] Frontend: startCheckout(), openBillingPortal() in useSubscription

### Marketing Pages
- [x] Landing: hero, features, pricing teaser, testimonials, footer
- [x] Pricing: Free vs Pro comparison, monthly/yearly toggle, checkout CTAs
- [x] Features: detailed feature breakdown
- [x] Auth: login, signup, forgot password, reset password
- [x] Legal: Terms, Privacy, Refund Policy, Contact

### Design System (NEW — this branch)
- [x] `frontend/src/styles/tokens.css` — 50+ CSS custom properties (colors, spacing, typography, radius, shadows, z-index, breakpoints, durations, easings)
- [x] `frontend/src/styles/reset.css` — normalize + base
- [x] `frontend/src/styles/typography.css` — type scale classes
- [x] `frontend/src/styles/layout.css` — grid/flex/container/spacing utilities
- [x] `frontend/src/styles/components/*.css` — 10 component style files
- [x] `frontend/src/components/ui/Button.jsx` — 6 variants, 3 sizes, loading, icons
- [x] `frontend/src/components/ui/Input.jsx` — Input, Textarea, Select, Checkbox, Radio, Switch, FileUpload
- [x] `frontend/src/components/ui/Card.jsx` — Card, CardHeader, CardBody, CardFooter, StatCard, FeatureCard, PricingCard
- [x] `frontend/src/components/ui/Table.jsx` — Table, TableColumn, TablePagination with sorting, selection, pagination, skeletons
- [x] `frontend/src/components/ui/Modal.jsx` — Modal, ModalFooter, Drawer, DrawerFooter with focus trap, animations
- [x] `frontend/src/components/ui/Badge.jsx` — Badge, StatusBadge, Chip (semantic variants, removable)
- [x] `frontend/src/components/ui/Avatar.jsx` — Avatar, AvatarGroup, LogoPlaceholder (fallbacks, initials)
- [x] `frontend/src/components/ui/EmptyState.jsx` — EmptyState, EmptyStateIllustration (SVG variants)
- [x] `frontend/src/components/ui/Loading.jsx` — LoadingSpinner, LoadingOverlay, PageLoader, Skeleton, SkeletonCard, SkeletonTable, SkeletonList
- [x] Dark mode tokens defined (inactive, ready for toggle)
- [x] `prefers-reduced-motion` support in tokens.css
- [x] AppLayout migrated to new Avatar, Button components
- [x] DashboardPage migrated to new StatCard, Table, Card, LoadingSpinner, EmptyState
- [x] InvoicesPage migrated to new Table, Button, StatusBadge, Card, LoadingSpinner
- [x] ClientsPage migrated to new Table, Input, Select, Card, Button, EmptyState
- [x] AnalyticsPage migrated to new StatCard, Card, LoadingSpinner

---

## Features In Progress

- [ ] **SettingsPage** — Migrate to new Input, Textarea, Select, Card, Avatar, Button, FileUpload, Badge components
- [ ] **InvoiceFormPage** — Complex form with line items editor (needs new Input, Select, Table, Button)
- [ ] **InvoiceDetailPage** — Detail view with PDF actions
- [ ] **ClientDetailPage** — Detail view
- [ ] **ClientFormPage** — Create/edit client form
- [ ] **ProposalsPage** — Proposal list table
- [ ] **ProposalFormPage** — Proposal editor
- [ ] **LandingPage** — Marketing page (different layout needs)
- [ ] **PricingPage** — Marketing page
- [ ] **AuthPage** — Login/signup forms
- [ ] **ForgotPasswordPage / ResetPasswordPage** — Auth forms
- [ ] **Legal pages** — Terms, Privacy, Refund, Contact

---

## Remaining Features

### Tier 1 (Critical — Core App Screens)
- [ ] SettingsPage full migration
- [ ] InvoiceFormPage (create/edit invoices with line items)
- [ ] InvoiceDetailPage (view + PDF download)
- [ ] ClientFormPage (create/edit clients)
- [ ] ClientDetailPage

### Tier 2 (Pro Features)
- [ ] ProposalsPage
- [ ] ProposalFormPage
- [ ] ProposalDetailPage (if exists)

### Tier 3 (Marketing & Auth)
- [ ] LandingPage
- [ ] PricingPage
- [ ] FeaturesPage
- [ ] AuthPage (login/signup)
- [ ] ForgotPasswordPage
- [ ] ResetPasswordPage

### Tier 4 (Legal & Misc)
- [ ] TermsPage
- [ ] PrivacyPage
- [ ] RefundPolicy
- [ ] ContactPage

### Tier 5 (Polish & Enhancements)
- [ ] Dark mode toggle implementation
- [ ] Toast notification system
- [ ] Tooltip/Popover components
- [ ] Chart library integration (Recharts) for Analytics
- [ ] Keyboard shortcuts (Cmd+K command palette)
- [ ] Print stylesheets
- [ ] Animation polish (stagger, page transitions)
- [ ] Focus-visible audit across all components

---

## Current UI Roadmap

**Screen-by-screen redesign order (exact sequence):**

1. ✅ **DashboardPage** — Stats grid + recent invoices table
2. ✅ **InvoicesPage** — Invoice table with action buttons
3. ✅ **ClientsPage** — Searchable/filterable client table
4. ✅ **AnalyticsPage** — Stats cards + ranking list
5. 🔄 **SettingsPage** — Forms, branding, billing, usage (IN PROGRESS)
6. ⏳ **InvoiceFormPage** — Complex multi-section form with line items editor
7. ⏳ **InvoiceDetailPage** — Read-only detail with PDF actions
8. ⏳ **ClientFormPage** — Client create/edit form
9. ⏳ **ClientDetailPage** — Client detail with related invoices
10. ⏳ **ProposalsPage** — Proposal list
11. ⏳ **ProposalFormPage** — Proposal editor
12. ⏳ **LandingPage** — Marketing hero, features, testimonials
13. ⏳ **PricingPage** — Pricing comparison cards
14. ⏳ **FeaturesPage** — Feature detail grid
15. ⏳ **AuthPage** — Login/signup forms
16. ⏳ **ForgotPasswordPage / ResetPasswordPage**
17. ⏳ **Legal pages** (Terms, Privacy, Refund, Contact)

**Rule**: Finish one screen completely before moving to the next. No partial migrations.

---

## Deployment Status

| Component | Status | Details |
|-----------|--------|---------|
| **Vercel Project** | Configured | Root: `emberflow/`, Output: `frontend/dist/`, Build: `npm run build` |
| **Frontend Build** | Passing | `npm run build` completes in ~25s, no errors |
| **API Routes** | Deployed | `/api/paddle/checkout`, `/api/paddle/portal`, `/api/paddle/webhook` |
| **Supabase** | Connected | Requires env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| **Paddle** | Configured | Requires: `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, price IDs |
| **Environment** | Documented | `.env.example` + README have all required vars |
| **Custom Domain** | Not configured | Ready for production domain |
| **SSL/HTTPS** | Auto | Vercel handles automatically |

---

## Paddle Status

### Environment Variables Required

| Variable | Purpose | Status |
|----------|---------|--------|
| `PADDLE_API_KEY` | Server-side API authentication | Required in Vercel |
| `PADDLE_WEBHOOK_SECRET` | Webhook signature verification | Required in Vercel |
| `PADDLE_PRO_MONTHLY_PRICE_ID` | Monthly Pro price ID (e.g., `pri_xxx`) | Required in Vercel |
| `PADDLE_PRO_YEARLY_PRICE_ID` | Yearly Pro price ID | Required in Vercel |
| `PADDLE_ENV` | `production` or `sandbox` | Optional (defaults to production) |

### Verification Checklist

- [x] Paddle sandbox products created for Pro Monthly/Yearly
- [x] Price IDs added to Vercel environment
- [x] API key and webhook secret configured in Vercel
- [x] Webhook endpoint registered: `https://your-domain.com/api/paddle/webhook`
- [x] Webhook events subscribed: `subscription.created`, `subscription.updated`, `subscription.canceled`, `transaction.completed`
- [x] Checkout flow tested: user clicks upgrade → hosted checkout → payment → webhook syncs DB
- [x] Customer portal tested: opens Paddle portal for subscription management
- [x] Free → Pro upgrade flow works end-to-end
- [x] Subscription cancellation handled (plan reverts to free)

### Remaining Blockers

- **None for core functionality** — Paddle integration is production-ready
- **Optional**: Add `PADDLE_ENV=sandbox` for development testing against sandbox

---

## Git Workflow

| Branch | Purpose |
|--------|---------|
| `main` | Stable production branch — only merged after manual review |
| `ui-redesign` | Previous UI experiment branch (archived) |
| `ui-redesign-lab` | **Current** — UI laboratory branch for design system work |
| `pre-opencode-backup` | Backup branch created by opencode |

### Merge Strategy

1. All UI work happens on `ui-redesign-lab`
2. No backend/API/database changes allowed on this branch
3. When UI redesign is complete and approved:
   - Create PR from `ui-redesign-lab` → `main`
   - Manual review of all visual changes
   - Squash merge to `main`
4. `main` remains deployable at all times

### Current Branch State

```
ui-redesign-lab (HEAD)
├── Modified: AppLayout.jsx, main.jsx, DashboardPage.jsx, InvoicesPage.jsx, ClientsPage.jsx, AnalyticsPage.jsx
├── New: DESIGN_SYSTEM.md, frontend/src/components/ui/ (13 components), frontend/src/styles/ (13 files)
└── Unchanged: All API routes, Supabase schema, backend logic
```

---

## Repository Structure

```
emberflow/
├── api/                          # Vercel serverless functions
│   ├── _utils/
│   │   ├── http.js              # Response helpers, rate limiting
│   │   ├── paddle.js            # Paddle API client, signature verification
│   │   ├── rateLimit.js         # Upstash Redis rate limiting
│   │   └── supabaseAdmin.js     # Service role client for server
│   └── paddle/
│       ├── checkout.js          # POST /api/paddle/checkout
│       ├── portal.js            # POST /api/paddle/portal
│       └── webhook.js           # POST /api/paddle/webhook
├── frontend/                     # React + Vite application
│   ├── public/                   # Static assets
│   ├── src/
│   │   ├── components/           # Legacy components (being replaced)
│   │   │   ├── ui/               # NEW: Design system components (13)
│   │   │   ├── AppLayout.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── FeatureGate.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── PasswordField.jsx
│   │   │   ├── PricingCard.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── PublicLayout.jsx
│   │   │   ├── StatCard.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   ├── Table.jsx
│   │   │   └── UpgradeModal.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useProfile.js
│   │   │   └── useSubscription.js
│   │   ├── pages/                # 24 page components
│   │   ├── services/
│   │   │   ├── api.js           # Supabase CRUD + RPC
│   │   │   ├── subscriptions.js # Paddle checkout/portal
│   │   │   └── supabase.js      # Client, auth, storage
│   │   ├── styles/               # NEW: Design system styles (13 files)
│   │   │   ├── components/
│   │   │   ├── index.css
│   │   │   ├── layout.css
│   │   │   ├── reset.css
│   │   │   ├── tokens.css
│   │   │   └── typography.css
│   │   ├── utils/
│   │   │   ├── auth.js
│   │   │   ├── format.js
│   │   │   ├── invoice.js
│   │   │   ├── pdf.js
│   │   │   └── plans.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css (legacy, replaced by styles/index.css)
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── supabase/
│   ├── schema.sql               # Complete schema dump (1467 lines)
│   ├── policies.sql             # RLS policies + storage (299 lines)
│   ├── migrations/
│   │   └── 001_production_fixes.sql
│   └── schema_backup_before_dump.sql
├── .env.example
├── vercel.json                  # Vercel deployment config
├── package.json                 # Root scripts (dev, build, preview)
├── README.md
├── DESIGN_SYSTEM.md             # Full design system spec (988 lines)
├── SPECIFICATION.md             # Complete technical spec
└── PROJECT_STATUS.md            # This file
```

---

## Important Commands

```bash
# Development
cd emberflow
npm run dev                    # Starts Vite on localhost:5173

# Build
npm run build                  # Production build to frontend/dist/
npm run preview                # Preview production build

# Database (run in Supabase SQL Editor)
# 1. supabase/schema.sql
# 2. supabase/policies.sql

# Environment Setup
cp .env.example frontend/.env.local
# Edit frontend/.env.local with Supabase URL + Anon Key

# Vercel Deployment
# 1. Push to GitHub
# 2. Import in Vercel (root: emberflow/)
# 3. Add environment variables
# 4. Deploy

# Git Workflow
git checkout ui-redesign-lab   # Switch to UI lab branch
git status                     # Check changes
git add -A && git commit -m "msg"  # Commit changes
git push origin ui-redesign-lab    # Push to remote
```

---

## AI Context

**Everything a fresh AI session needs to understand:**

### Project Type
Freelance finance SaaS — React frontend, Supabase backend, Paddle billing, Vercel deployment.

### Current Work
**UI redesign laboratory branch** (`ui-redesign-lab`). Only frontend visual changes. No backend/API/database modifications permitted.

### Design System Philosophy
- **Warm**: Cream background (#F7F1E3), warm shadows
- **Premium**: High contrast, refined typography, meaningful motion
- **Minimal**: No unnecessary decoration, purposeful whitespace
- **Fast**: CSS custom properties, no runtime theming overhead
- **Elegant**: 8px base radius, Inter font, Lucide icons
- **Soft**: Layered shadows, rounded surfaces, gentle transitions

### Key Files to Know
- `frontend/src/styles/tokens.css` — Single source of truth for all design tokens
- `frontend/src/components/ui/index.js` — Exports all 13 new components
- `frontend/src/components/ui/*.jsx` — Component implementations
- `frontend/src/styles/components/*.css` — Component styles
- `DESIGN_SYSTEM.md` — 988-line detailed specification
- `SPECIFICATION.md` — Complete technical specification

### Component Migration Pattern
```jsx
// OLD (legacy)
import Button from '../components/Button.jsx';
<Button variant="primary" size="small">Click</Button>

// NEW (design system)
import { Button } from '../components/ui/Button.jsx';
<Button variant="primary" size="sm">Click</Button>
```

### CSS Class Mapping
| Legacy | New |
|--------|-----|
| `.button.primary` | `.button.button--primary` |
| `.button.ghost` | `.button.button--ghost` |
| `.button.danger` | `.button.button--danger` |
| `.button.small` | `.button.button--sm` |
| `.panel` | `.panel` (unchanged) |
| `.stat-card` | `.stat-card` (unchanged) |
| `.table-wrap` | `.table-wrap` (unchanged) |
| `.status-badge.status-paid` | `.badge.badge--success` or `<StatusBadge status="paid" />` |

### Rules for This Branch
1. **Never touch**: `api/`, `supabase/`, backend logic, database schema, authentication flow, Paddle integration
2. **Only modify**: `frontend/src/components/ui/`, `frontend/src/styles/`, `frontend/src/pages/*.jsx`, `frontend/src/components/AppLayout.jsx`
3. **Use design tokens**: Never hardcode colors, spacing, radii — use CSS custom properties from `tokens.css`
4. **Screen-by-screen**: Complete one page fully before starting the next
5. **Preserve functionality**: All existing features must work identically after migration
6. **Accessibility**: Maintain focus-visible, ARIA labels, semantic HTML

---

## Next Immediate Task

**Migrate SettingsPage to the new design system**

SettingsPage is the most complex remaining screen with:
- Profile form (name, business, email, phone, address, country, currency)
- Avatar upload (use new Avatar component)
- Branding section (Pro): logo upload (FileUpload), color picker, footer textarea
- Billing section: usage meters, upgrade buttons, billing portal
- All forms need new Input, Textarea, Select, Card, Button, Avatar, Badge components

**Estimated effort**: 2-3 hours
**Dependencies**: All required UI components already exist in `frontend/src/components/ui/`

---

## Last Updated

**2026-07-24** — Phase 7 (performance & bundle optimization) complete: route-level code splitting, vendor chunking, dead-CSS removal, accessibility (skip link, touch targets), image loading hints, and production hardening (ErrorBoundary, theme-color). See "Redesign Roadmap Progress" above. Next: Phase 8 (white-label architecture).