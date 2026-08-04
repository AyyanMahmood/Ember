# EmberFlow

EmberFlow is a premium freelancer finance operating system for independent professionals and small agencies. It replaces disconnected spreadsheets, email threads, PDF templates, and bank exports with one cohesive workspace for the money side of client work.

### Core Features

- **Client management** — Profiles, contact data, notes, billing history
- **Invoice generation** — Itemized invoices with tax, discounts, PDF export, status tracking
- **Proposal generation** — Template-driven proposals with scope, pricing, and PDF export
- **Payment tracking** — Manual payment records, balance reconciliation, overdue monitoring
- **Analytics** — Revenue totals, monthly collections, overdue tracking, top-client rankings
- **Dashboard** — At-a-glance metrics, recent activity, status summaries
- **Authentication** — Email/password auth with password reset flow, Google OAuth (✅ production verified). *(Microsoft OAuth was removed from V1 on 2026-07-28; dated session logs in SESSION_HISTORY.md that mention it are historical.)*
- **Settings** — Profile, business info, invoice branding, subscription management

---

# Tech Stack

### Frontend

| Layer | Choice |
|-------|--------|
| Framework | React (functional components, hooks) |
| Bundler | Vite |
| Routing | React Router v6 |
| Icons | Lucide React |s
| PDF generation | jsPDF + html2canvas (browser-side, no external API) |
| Language | **JavaScript** (NOT TypeScript) |

### Backend

| Layer | Choice |
|-------|--------|
| Database | PostgreSQL (via Supabase) |
| Auth | Supabase Auth (email/password, row-level security) |
| Storage | Supabase Storage (avatars, logos) |
| Payments | Polar (checkout, webhooks, customer portal — Merchant of Record) |
| API | Serverless functions on Vercel (`api/`) |

### Deployment

| Service | Purpose |
|---------|---------|
| Vercel | Frontend hosting + serverless API routes |
| Supabase | Database, Auth, Storage |
| Polar | Subscription billing |

---

# Project Structure

```
emberflow/
├── api/                          # Vercel serverless API functions
├── frontend/                     # React SPA
│   └── src/
│       ├── pages/               # Route-level page components (21 pages)
│       ├── components/
│       │   └── ui/              # Reusable design system components
│       ├── styles/
│       │   ├── tokens.css       # Design tokens (colors, spacing, shadows, etc.)
│       │   ├── reset.css        # CSS reset + base element styles
│       │   ├── typography.css   # Typography utilities
│       │   ├── layout.css       # Layout grids, panels, sections
│       │   └── components/      # Per-component CSS (BEM naming)
│       ├── services/            # API clients (Supabase, subscriptions)
│       ├── hooks/               # Custom React hooks (useAuth, useProfile, useSubscription)
│       └── utils/               # Formatting, invoice math, PDF export
├── supabase/                    # Database schema, migrations, policies
├── CLAUDE.md                    # This file — always loaded into context
├── DOCUMENTATION_MAP.md         # Index of every root .md file — what it's for, when to read it
└── SESSION_HISTORY.md           # Dated past-session write-ups — NOT auto-loaded, read on demand
```

---

# Architecture Protection

The presentation layer may be redesigned completely. The application architecture MUST NOT be redesigned.

### PRESERVED — NEVER change
- Supabase (database, auth, storage, RLS)
- Vercel (hosting, serverless functions)
- Polar (payments, subscriptions, webhooks)
- Redis / Upstash
- PostgreSQL schema and migrations
- API routes and function signatures
- React Router structure
- All business logic, database queries, services, hooks, utility functions
- Authentication flow
- Invoice / proposal generation logic
- Analytics calculations
- Payment logic
- Environment variables

### IMPROVABLE — redesign freely
- UI appearance, polish, layout, spacing, visual rhythm
- CSS, design tokens, component styling
- Animations, transitions, micro-interactions
- Responsiveness and mobile behavior
- Accessibility (ARIA, focus, keyboard navigation)
- Design system consistency and component API
- Typography and visual hierarchy
- Empty/loading/error states
- Component library (replace custom with shadcn/ui)

### Never migrate
Never migrate from Supabase, Vercel, Polar, Upstash Redis, or the current project architecture. Assume these technologies are permanent unless explicitly requested.

> **Payment provider — migrated Paddle → Polar (2026-07-28, explicitly requested).** All billing now runs through Polar as Merchant of Record (`/api/polar/*`, `api/_utils/polar.js`, `frontend/src/services/subscriptions.js`). The Paddle route/util code has been removed; the legacy `subscriptions.paddle_*` columns are intentionally retained until a post-verification cleanup. `polar-migration` has since been merged into `main` (fast-forward — `main` and `polar-migration` now point at the same commit). See `POLAR_SETUP.md` and `POLAR_MIGRATION_PLAN.md`. Historical session logs in SESSION_HISTORY.md that reference Paddle describe the state at the time and are left as-is.

### STOP condition
If a redesign requires changing backend logic, STOP and explain why before making changes. Never rewrite working backend code simply because a different implementation exists.

---

# Vision & Philosophy

The goal is not to build another generic dashboard. EmberFlow's visual identity should be almost identical in design philosophy to OpenClaude. NOT "inspired by." The polish, spacing, animation, typography, hierarchy, and component quality should feel almost identical. The goal is for someone to immediately think "This feels like OpenClaude" without copying branding or logos.

The current UI is a functional prototype. Claude has full permission to completely redesign the presentation layer — layout, spacing, components, typography, animations, responsiveness — while preserving ALL business logic. Only presentation, UX, responsiveness, accessibility, animations, spacing, typography, and components may change.

Visual quality should compete with OpenClaude, Vercel, Raycast, Arc, Linear, Clerk, Resend, Notion. UI quality is equally important as functionality.

EmberFlow is not just an invoicing application. It is intended to become the operating system for freelancers. Every feature should answer: "Does this help a freelancer run their business better?" Do not add features simply because other SaaS products have them. Every feature should feel intentional.

Future Ember products will share this design language, component library, UX philosophy, and engineering standards. Keep architecture modular.

---

# Ember UI

EmberFlow is no longer the only thing being built. **Ember UI** is a parallel, permanent effort: a canonical component/design system that every reusable piece built inside EmberFlow eventually graduates into, so future Ember products (and EmberFlow itself) can be assembled from it instead of rebuilt from scratch each time. Think long-term. Build systems, not pages.

**Ember UI lives at `~/Desktop/Ember UI/`** (README + catalogue table, one folder per module — components, hooks, or backend modules like `polar-billing/`). EmberFlow *consumes* Ember UI; never the other way around.

### Ember UI Development Rules

Before building ANY UI:

1. Read `EMBER_UI_GUIDE.md` (repo root).
2. Study every relevant implementation inside `/references` (see below) — never design from a blank page when prior art exists.
3. Search Ember UI (`~/Desktop/Ember UI/`) before creating anything new.
4. Never copy components verbatim from a reference library. Extract ideas, improve them, and build something recognizably Ember.
5. If multiple reference implementations solve the same problem, compare all of them: identify strengths, identify weaknesses, combine the strongest ideas, then build the best Ember-native version.
6. Study at least **three** implementations before designing anything nontrivial — never stop at the first one that works.
7. Every genuinely reusable component belongs in Ember UI, not buried in an EmberFlow-specific folder.
8. Ember UI is the canonical design system going forward. Where it conflicts with an older EmberFlow-local pattern, prefer Ember UI once the equivalent exists there.
9. Reduce third-party dependencies over time by replacing them with Ember UI components as it matures — don't rip out working libraries preemptively.

### Open Source Research Philosophy

Study open-source like a research lab: understand *why* something is good, extract the engineering pattern, then create something recognizably Ember. Never build clones — always evolve the idea. Research, combine, improve — do not copy.

### References

Local reference repositories live in `/references` at the repo root (untracked/gitignored — large, cloned locally for study, not committed):

- `shadcn-ui` (cloned as `ui`), `magicui`, `originui`, `animate-ui`, `radix-ui`, `framer-motion`, `react-bits`, `mantine`, `heroui`, `chakra-ui`, `tremor`, `headlessui`

Documentation-only research sources (no local clone): reactbits.dev, kokonutui.com, motion.dev, animejs.com, rive.app.

## Motion Inspiration Library

A curated study catalog of motion/animation sources for the future **Ember UI v1.5 Motion System**. Added 2026-07-30 under launch freeze — **documentation-only, nothing implemented**. The full per-source analysis (strengths, weaknesses, components worth studying, animation quality, production suitability, recreate-vs-depend) lives in `EMBER_UI_GUIDE.md` → Motion Inspiration Library; the motion-system plan + Future Loader Library live in `EMBER_UI_TIERING.md`.

Sources catalogued: **Orbs** (`orbs.jakubantalik.com` — the AI "thinking orb" pattern, newly added), Motion.dev, Anime.js, Rive, React Bits, Kokonut UI, Vengeance UI, Magic UI, Origin UI, Animate UI.

Normative rules that survive into any future motion work:
- **Recreate, don't depend** — extract the technique, rebuild it Ember-branded and reduced-motion-safe. The only justified runtime dependencies are **Motion.dev** (for genuine exit/layout orchestration CSS can't do) and **Rive/Anime.js** (only for a specific signature illustration/sequence).
- **Calm-premium, no bounce/gimmick**, CSS-first, `prefers-reduced-motion` always honored — richer motion is allowed only for rare *signature moments* (upgrade success, AI "thinking," completed export), never for chrome.
- **⚠️ Skeleton loaders remain excluded from EmberFlow** (standing Loading-States rule below). A skeleton primitive may live in Ember UI for *other* Ember Holdings products, but is not adopted in EmberFlow unless that rule is deliberately revisited.
- The **`EmberThinkingOrb`** is intended as a cross-product Ember Holdings motion signature ("an Ember product is thinking"), not just an EmberFlow loader.

---

# Design System

### Visual Direction

**Use:**
- Dark-first interface
- Matte charcoal backgrounds
- Soft elevated panels
- Large rounded corners
- Floating cards
- Glass-like subtle surfaces
- Minimal borders
- Soft shadows
- Premium typography
- Plenty of whitespace
- Calm layouts
- Strong visual hierarchy
- High contrast
- Blue accent color
- Very subtle gradients
- Animated hover states
- Smooth transitions
- Motion everywhere — but tasteful

**Avoid:**
- Cream theme
- Beige backgrounds
- Flat Bootstrap styling
- Generic Tailwind dashboards
- Material Design
- Dense enterprise layouts
- Loud gradients
- Heavy borders
- Outdated admin dashboards

### Brand Personality
Ember should feel: calm, premium, trustworthy, precise, effortless, professional.

Never feel: playful, childish, noisy, cluttered, flashy, over-designed.

Every screen should communicate competence.

### Typography Rules
Use Inter throughout. Create a clear hierarchy. Typography should do most of the visual work. Avoid oversized text unless used intentionally for hero sections.

### Spacing Rules
Use an 8px spacing system. Prefer spacing scale over arbitrary values. Whitespace is a feature. Never make layouts feel cramped.

### Color Rules
Maintain the current dark-first OpenClaude direction. Avoid introducing additional accent colors. Use color only for hierarchy and state. Contrast should remain excellent.

### Motion Rules
Animations should feel effortless. Prefer: fade, spring, slide, subtle scale. Avoid: bounce, exaggerated motion, gimmicky effects. Animation should support usability, never distract from it.

### Loading States
EmberFlow intentionally does not use skeleton screens. The product favors fast loading, preserved layouts, subtle loading indicators, and premium empty/error states. Concretely: keep the surrounding layout (headers, static labels, column headers) visible and in place while data loads; show a small, scoped `LoadingSpinner` only where content genuinely isn't available yet, instead of mimicking the shape of the eventual content with shimmering placeholder bars. Do not introduce skeleton screens anywhere in the application — this was tried (see the V1 Polish Sprint's H1 fix, later reverted) and reversed as a deliberate design decision, not an oversight.

### Component Philosophy
Buttons should feel clickable. Cards should float. Inputs should invite interaction. Tables should disappear visually and prioritize data. Navigation should never dominate content.

### Component Styles

**Buttons:** Rounded-xl, floating appearance, soft shadow, slight hover lift, spring animation, premium focus states, active press animation.

**Cards:** Floating, large radius, soft borders, deep layered shadows, spacious padding.

**Inputs:** Large, rounded, matte surfaces, excellent focus glow.

**Navigation:** Premium sidebar, clean spacing, beautiful icons, smooth hover animations.

**Tables:** Minimal, spacious, modern, Stripe-quality.

### Design Restraint
If something already looks premium, leave it alone. Do not redesign simply because another implementation exists. Elegance comes from restraint and consistency.

---

# Libraries

### Currently in use
- `lucide-react` — Icons
- `jspdf` + `html2canvas` — PDF generation
- `@supabase/supabase-js` — Database and auth client

### Preferred additions
- **shadcn/ui** — Primary component system. Replace custom Button, Card, Input, Table, Modal, Badge, etc. with shadcn equivalents when they improve quality.
- **Motion (Framer Motion)** — All animations, page transitions, hover effects, micro-interactions.
- **Aceternity UI** — Premium landing-page sections and tasteful UI flourishes.
- **Magic UI** — Micro-interactions and animated components.
- **Recharts** — Analytics charts and data visualization.

### Rules
- Prefer free, open-source libraries. Do not introduce paid services or APIs.
- Before adding a library: check if the functionality exists, prefer the smallest mature library, explain why it was chosen.
- Adopt the OpenClaude visual identity (dark-first, matte charcoal, large radius, floating cards, soft shadows) — do not convert EmberFlow into a generic shadcn template.
- Do not replace working business logic simply to adopt a library.

---

# Responsiveness

Every page must be responsive at every screen size. No exceptions. Mobile-first approach. Perfect on phones, tablets, laptops, and ultrawide monitors. No horizontal scrolling or broken layouts at any viewport width. Test at 320px, 480px, 768px, 1024px, 1440px, 1920px.

---

# Performance

- Use `React.lazy` and `Suspense` for page-level code splitting
- Avoid unnecessary dependencies — keep the bundle lean
- Keep Lighthouse scores above 90
- Prefer CSS animations over JS when possible; animations must run at 60fps
- No layout shifts during page load

---

# Decision Hierarchy

When multiple implementations are possible, always prioritize:

1. Preserve architecture
2. Preserve business logic
3. User experience
4. Performance
5. Maintainability
6. Visual polish

Never sacrifice a higher priority for a lower one.

---

# Workflow

1. **Understand** — Read all relevant files. Understand existing architecture.
2. **Plan** — Identify the smallest meaningful improvement. Reuse existing components. Preserve business logic.
3. **Implement** — Make precise, scoped changes. Never perform massive rewrites without approval.
4. **Build** — Run `npm run build` in `frontend/`. Fix every error.
5. **Verify** — Confirm the result works correctly.
6. **Explain** — What changed and why.
7. **Continue** — Wait for approval before the next phase.

---

# Coding Standards

- Use shadcn/ui as the primary component system; replace custom components when they improve quality
- Use design tokens from `tokens.css` (`var(--space-*)`, `var(--color-*)`, `var(--text-*)`, `var(--radius-*)`)
- Use BEM naming for CSS (`.block__element--modifier`)
- Avoid duplicating CSS across files
- Keep components reusable and composable
- Preserve accessibility (`role`, `aria-*`, focus management)
- Memoize appropriately to avoid unnecessary re-renders

---

# Success Criteria

A redesign is successful only if all are true:
- Feels comparable to OpenClaude in overall quality
- Every page looks intentionally designed, not assembled
- Perfect UI consistency across all pages
- Every component feels part of one design language
- Mobile experience is first-class
- Dark mode is the primary experience
- Animations are subtle, smooth, and meaningful
- Lighthouse Performance >90
- Accessibility remains excellent
- Business logic is unchanged
- Existing functionality continues to work

If forced between preserving old UI or a substantially better implementation, choose better. Think like a senior product designer, not merely a frontend engineer.

Question every screen, spacing decision, interaction, hierarchy, and animation. If something looks merely "acceptable", redesign it until it feels premium.

---

# Current Status

| Area | Status |
|------|--------|
| UI migration (legacy → canonical components) | Complete |
| Design system (tokens, BEM, component library) | Dark-first token rebuild complete (roadmap Phase 1) |
| Responsive foundation | Complete, incl. system-wide audit (roadmap Phase 6.5) |
| Page-level polish | In progress |
| Dark mode | Complete — default theme, with explicit light-theme opt-in via `ThemeToggle` (roadmap Phase 1) |
| Micro-interactions and animation | Basic transitions in place |
| Premium redesign (OpenClaude-level polish) | Remaining work |
| Trust/correctness fixes (fake metrics, blank status badge, checkout PII log, CORS) | Complete (roadmap Phase 0) |
| Bundle 1: Authentication (Google OAuth, password strength meter, disposable email detection) | Google OAuth **✅ production verified**. Microsoft OAuth **removed from V1** (2026-07-28) — button, `signInWithMicrosoft`, Azure provider, and docs all removed. |
| Bundle 2: Brand Studio (Pro-only logo/color/font branding) | Superseded by Bundle 3 (critical bugs fixed, free tier added, first-class nav) — see SESSION_HISTORY.md |
| Bundle 3: Brand Studio Polish & Premium Positioning | Code complete, all approved migrations applied to production, build green. Live device/account testing still not done this session — see SESSION_HISTORY.md |
| V1 Audit (2026-07-27) | Complete — full feature-by-feature status report produced across all 15 areas (auth, pages, invoices, proposals, brand studio, subscriptions, security, SEO, performance, prod readiness). Findings drove the two bundles that follow in SESSION_HISTORY.md. |
| Production Authentication bundle (2026-07-27): resend verification email, in-app password change | Code complete, build green — see "Production Authentication" section in SESSION_HISTORY.md |
| V1 Launch Prep bundle (2026-07-27): SEO, production hardening, performance verification | Complete — see "V1 Launch Prep" section in SESSION_HISTORY.md |
| Paddle → Polar billing migration (2026-07-28) | Code complete across all 7 phases + logic-verified (`npm run verify:polar` 31/31), build green. Merged from `polar-migration` into `main`. **Not yet live-sandbox-tested** (no Polar account/public webhook URL available in this environment) — that remains the gate before calling it production-verified. See "Paddle → Polar Billing Migration" section in SESSION_HISTORY.md. |
| Microsoft OAuth removal (2026-07-28) | Complete — button, provider logic, Azure references, and docs all removed from V1; build green. Merged from `polar-migration` into `main`. See "Microsoft OAuth Removal" section in SESSION_HISTORY.md. |
| Subscriptions page (architecture, redesign, Ember UI extraction) | Complete — see "Subscriptions Redesign" section in SESSION_HISTORY.md. |
| Launch Hardening Sprint — Phase 1: Billing Lifecycle Audit (2026-07-30) | Complete, flow-by-flow: Purchase, Upgrade, Cancellation, Renewals, Failed Payments all fully audited — 6 real bugs found and fixed (checkout error sanitization; a refund-policy contradiction; a false claim about Polar's capabilities; both halves of the cancellation-stale-state root cause; the misleading past_due presentation). Still gated on a live Polar sandbox test this environment can't run. See "Launch Hardening Sprint — Phase 1" section in SESSION_HISTORY.md. |
| Launch Hardening Sprint — Phase 2: Production Readiness (2026-07-30) | Complete — final production audit (1 stale-comment fix, 1 safe `.gitignore` fix; no new code bug), 15-day grace period finalized as official policy, refund research + competitive analysis, and the full launch doc set: `LAUNCH_READINESS_REPORT.md`, `LAUNCH_BLOCKERS.md`, `PRODUCTION_CHECKLIST.md`, `SUPPORT_PLAYBOOK.md`, `EMBER_UI_TIERING.md`. **Launch decision: not today** — gated on running the live Polar test + confirming prod config (≈1–2 days of verification, not more building). Readiness ≈88/100. See `LAUNCH_READINESS_REPORT.md`. |
| Launch Hardening Sprint — Phase 3: Production Validation (2026-07-30) | Complete (docs only, no code change). Deliverables: `PRODUCTION_VALIDATION_PLAN.md` (P0/P1/P2 per-scenario validation with expected Polar/Supabase/UI/log/webhook state for all 15 billing scenarios + a production configuration-risk audit + the formal Go/No-Go), `REPO_CLEANUP_LIST.md` (categorized, nothing deleted), `V1.5_ROADMAP.md` (7 milestones, grounded, planning only). **Go/No-Go: NO-GO today** for real-money launch (nothing broken — solely because no live Polar transaction has been run and prod config is unconfirmed); a Free-tier-only soft launch is available immediately. See `PRODUCTION_VALIDATION_PLAN.md`. |
| Billing legibility milestone (2026-07-31): Ember Alert primitive + failed-payment messaging | Complete, build green (`61de978`, `e5599ce`). New `Alert` UI primitive (extracted to Ember UI); failed-payment **post-revoke** message + **one-click resubscribe** on Subscriptions; app-wide proactive **`past_due` dunning nudge** (`BillingNudge` in `AppLayout`); all Subscriptions notices migrated onto `Alert`. Completes 2 of the 5 Milestone-A items in `V1.5_ROADMAP.md`. Not on-device tested (standing no-browser limitation). See "Billing Legibility Milestone" section in SESSION_HISTORY.md. |
| Billing architecture design doc (2026-07-31) | Complete (docs only, `dcbc019`). `BILLING_UX_ARCHITECTURE.md` — full current-state audit of every billing surface, UX/IA comparison vs Linear/Vercel/Notion/Framer/Arc/Cursor/GitHub, proposed ideal experience within the 6 standing billing decisions. Central recommendation: fix Monthly↔Yearly switching (Polar portal-native switch, or in-app prorated update). Awaiting decisions before implementation. |
| Premium experience milestone (2026-07-31): activation, loaders, entrance, badge, real logo | Complete, build green + **render-verified in headless Chrome (light + dark)**. `61de978`..`e339d91`. Apple-style **Pro activation** (traced ember ring → welcome), **contextual loader family** (EmberSpinner + RouteProgress top-bar + BrandLoader; no skeletons — standing rule honored), **logo-anchored app entrance**, **Early Supporter badge**, **real EmberFlow logo wired in** (transparent hex mark extracted from the supplied lockup → `/emberflow-mark.png`, anchors entrance/sidebar/activation/auth; favicon updated to match). EmberSpinner + RouteProgress extracted to Ember UI. See "Premium Experience Milestone" section in SESSION_HISTORY.md. |
| Billing plan-model extensibility (2026-07-31) | Complete, build green + **entitlement parity 24/24** + **verify:polar 33/33** + pricing render-verified identical. `a05ec04`..`5a17935`. The plan model is now **config-driven**: `frontend/src/config/plans.js` (data catalog) + `api/_utils/planCatalog.js` (server projection) are the single source of truth; `utils/plans.js` derives the old `PLANS` shape (fully back-compat) and all billing UI (Pricing/Landing/UpgradeModal/Subscriptions) renders from catalog helpers; Polar mapping is data-driven. **No new plans added** — Monthly/Yearly behavior byte-identical. A drift guard in `verify:polar` keeps the two config files in sync. See "Billing Plan-Model Extensibility" section in SESSION_HISTORY.md for the add-a-plan recipe. |
| V1 billing customer journey (2026-07-31) | Complete, build green + verify:polar 33/33 + render-verified. `57c95b8`..`ea63290`. The whole journey now happens **inside EmberFlow**, no portal redirect for common actions: **in-app Monthly↔Yearly switch** (Polar Update Subscription API, in place → one subscription always); **in-app cancel + resume** (`cancel_at_period_end`, no portal); **checkout persists the chosen plan through auth** (`?plan` → register/login/OAuth → auto-checkout, never ask twice); **billing summary** (plan/renewal/last+next payment) + View-all-invoices → Polar; **Report a billing problem** prefilled email. Polar owns only card entry + the invoice archive. Celebration (activation) already shipped. **Not live-sandbox tested** (no Polar creds — standing gate). See "V1 Billing Customer Journey" section in SESSION_HISTORY.md. |
| **Final Launch Hardening Session (2026-08-01)** | **V1 Launch: ✔ Production Stable.** All 8 audited launch blockers investigated root-cause-first; 8 real bugs found and fixed, build green + `verify:polar` 33/33 throughout. See "Final Launch Hardening Session" section in SESSION_HISTORY.md for the full per-issue writeup. |
| **Resume audit + refund policy decision (2026-08-03)** | Resume-audit confirmed the working tree's uncommitted files were the already-verified hardening-fix batch, not unfinished work — committed as one checkpoint (`a3b4b13`). **Founder-approved refund policy adopted, superseding the old discretionary-only policy**: full refund within **7 calendar days of purchase**, identical for monthly and yearly, none after — updated across `/refund`, the in-app Subscriptions refund summary, `SUPPORT_PLAYBOOK.md`, `docs/archive/BILLING_UX_ARCHITECTURE.md`, and `LAUNCH_READINESS_REPORT.md`. Checkout's duplicate-subscription TOCTOU race (two near-simultaneous first-time checkouts) audited and confirmed still open — no clean fix without an idempotency-key/DB-lock addition, left as documented V1.5 work (`V1.5_ROADMAP.md` Milestone A) rather than a scope-creeping architecture change. Build green, `verify:polar` 33/33. See "Resume Audit + Refund Policy Decision" section in SESSION_HISTORY.md. |
| **White Label Foundation session (2026-08-04)** | Docs/ops-only — no EmberFlow product code touched. Two parallel efforts, both outside this repo except for the repo-hygiene item below: (1) **White Label Edition** (`~/Desktop/White Label EmberFlow/`) — found the buyer-facing docs/license/fingerprinting/component-catalog already substantially built from a prior session; added the missing internal go-to-market roadmap, the `sanitize-source.mjs` and `package-for-delivery.mjs` tooling `stamp-license.mjs` referenced but never had, and the buyer delivery workflow — both new scripts tested end-to-end against a scratch copy. (2) **Ember Holdings company ops** (new `~/Desktop/Ember Holdings/`) — launch marketing checklist + support/bug, release/versioning/changelog, customer communication, and refund/billing-support policy docs, framed as reusable company policy with EmberFlow's own docs as the worked examples. (3) **This repo's documentation cleanup** (item 6 of that session's scope, judged low-risk/git-reversible and directly requested): executed the previously-frozen `REPO_CLEANUP_LIST.md` plan now that launch is stable — 3 empty stub files removed, `AGENTS.md` filled with a `CLAUDE.md` pointer, 9 historical/superseded docs moved to new `docs/archive/` (the original 6 plus `BILLING_QA_CHECKLIST.md`, `BILLING_UX_ARCHITECTURE.md`, and `KNOWN_LIMITATIONS.md`, the last after a genuine merge — it and `KNOWN_ISSUES.md` had drifted apart with real items missing from each, now unified in `KNOWN_ISSUES.md`). New `DOCUMENTATION_MAP.md` is the resulting one-page doc index. Root markdown count: 36 → 25. **Next priority unchanged: V1.5 Phase 1 — EmberFlow Control Center** (planning only, not started — see the RESUME HERE marker at the end of this file). |

A full audit and a 10-phase implementation roadmap toward a dark-first, white-label-ready premium redesign is in progress on `opclaude-redesign`. See `PROJECT_STATUS.md` → "Redesign Roadmap Progress" for phase-by-phase status.

---

# Session History

Detailed, dated write-ups of past work sessions — root causes, migration decisions, audit findings, per-commit rationale — live in **`SESSION_HISTORY.md`**, not in this file. That file is **not auto-loaded**: read it deliberately (Read tool, grep for a date/topic first if needed) when you need context on a specific past decision, bug fix, or migration. Don't load it by default — the Current Status table above is the compact index; match a row's date/topic to `SESSION_HISTORY.md`'s section headers to find the full writeup.

---

## ⏸️ RESUME HERE — V1.5 Phase 1: EmberFlow Control Center

**V1 Launch: ✔ Production Stable**, now with live-production verification (not just code review) behind it. The "19 uncommitted audit-phase files" item from `SESSION_HISTORY.md`'s "What's left" punch list is now resolved (committed `a3b4b13`, 2026-08-03), as is the refund-policy contradiction. Remaining gates before a real-money launch are entirely external/config, not code: confirm the Vercel/Polar environment-variable checklist, update the Supabase Reset Password email template, apply migration `012_delete_account.sql` to production if not already done, and run the still-outstanding live Polar sandbox end-to-end test (the standing gate noted throughout this file since the original Paddle → Polar migration).

**Next priority: V1.5 Phase 1 — EmberFlow Control Center.** Planning only — **do not begin implementation** until this is deliberately picked up.

**Purpose:** a production-grade internal operations console replacing day-to-day direct Supabase dashboard/SQL usage for running EmberFlow.

**Requirements (high level only, not yet designed):**
- Enterprise-grade security
- Audit logs
- User management
- Billing management
- Analytics
- Feature flags
- Support tools
- Safe destructive actions (confirmed, reversible-by-default, logged)
- MFA
- Session security

This does not reopen or supersede anything in `V1.5_ROADMAP.md`'s existing Milestone A (billing correctness follow-ups) — it's a new, separate initiative layered on top. Same rule as everywhere else in this file: STOP and confirm scope/design before writing code once this is picked up.
