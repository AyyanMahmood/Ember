# EmberFlow

EmberFlow is a premium freelancer finance operating system for independent professionals and small agencies. It replaces disconnected spreadsheets, email threads, PDF templates, and bank exports with one cohesive workspace for the money side of client work.

### Core Features

- **Client management** — Profiles, contact data, notes, billing history
- **Invoice generation** — Itemized invoices with tax, discounts, PDF export, status tracking
- **Proposal generation** — Template-driven proposals with scope, pricing, and PDF export
- **Payment tracking** — Manual payment records, balance reconciliation, overdue monitoring
- **Analytics** — Revenue totals, monthly collections, overdue tracking, top-client rankings
- **Dashboard** — At-a-glance metrics, recent activity, status summaries
- **Authentication** — Email/password auth with password reset flow, Google/Microsoft OAuth (pending provider config — see RESUME HERE)
- **Settings** — Profile, business info, invoice branding, subscription management

---

# Tech Stack

### Frontend

| Layer | Choice |
|-------|--------|
| Framework | React (functional components, hooks) |
| Bundler | Vite |
| Routing | React Router v6 |
| Icons | Lucide React |
| PDF generation | jsPDF + html2canvas (browser-side, no external API) |
| Language | **JavaScript** (NOT TypeScript) |

### Backend

| Layer | Choice |
|-------|--------|
| Database | PostgreSQL (via Supabase) |
| Auth | Supabase Auth (email/password, row-level security) |
| Storage | Supabase Storage (avatars, logos) |
| Payments | Paddle (checkout, webhooks, billing portal) |
| API | Serverless functions on Vercel (`api/`) |

### Deployment

| Service | Purpose |
|---------|---------|
| Vercel | Frontend hosting + serverless API routes |
| Supabase | Database, Auth, Storage |
| Paddle | Subscription billing |

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
└── CLAUDE.md                    # This file
```

---

# Architecture Protection

The presentation layer may be redesigned completely. The application architecture MUST NOT be redesigned.

### PRESERVED — NEVER change
- Supabase (database, auth, storage, RLS)
- Vercel (hosting, serverless functions)
- Paddle (payments, subscriptions, webhooks)
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
Never migrate from Supabase, Vercel, Paddle, Upstash Redis, or the current project architecture. Assume these technologies are permanent unless explicitly requested.

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
| Bundle 1: Authentication (Google/Microsoft OAuth, password strength meter, disposable email detection) | Code complete; **blocked on external dashboard config** — see RESUME HERE |

A full audit and a 10-phase implementation roadmap toward a dark-first, white-label-ready premium redesign is in progress on `opclaude-redesign`. See `PROJECT_STATUS.md` → "Redesign Roadmap Progress" for phase-by-phase status.

---

## ⏸️ RESUME HERE — Release Candidate QA (active mode, 2026-07-25)

**Current mode: RELEASE CANDIDATE QA**, real-device testing on **Arc Browser for Android (Chromium/Blink)**, test device **Samsung Galaxy A06 (~360px CSS width)**. User sends bugs in **batches with screenshots**; wait for a batch before acting. This mode was briefly interrupted for Bundle 1 (Authentication feature work — Google/Microsoft OAuth, password strength meter, disposable email detection, auth UX polish), which is now folded back into this same QA thread since Batch 3 covered both a QA bug and Bundle 1 follow-up together.

**Rules for this phase (strict):**
- **No new features** unless the user explicitly asks. Prioritize stability over polish.
- Fix **only** the bugs in the current batch. **No unrelated refactors** (note critical nearby issues separately instead of fixing them).
- **Commit every 3–4 logical fixes**, run `npm run build` (in `frontend/`), confirm green **before continuing**.
- Diagnose root causes from code + screenshots. **No speculative CSS.** If a cause can't be confidently located, tell the user the exact component / CSS file / selector / grid-flex container instead of guessing.
- **Never add the "Co-Authored-By: Claude" trailer to commit messages** — user explicitly had 62 prior commits rewritten to strip it (`git filter-branch` + force-push, 2026-07-25) and does not want it back. Watch for this specifically since it's in muscle memory from the default commit workflow.

**Batch 3 (2026-07-25), commit `5233613` — build green:**
1. **P1 blocker, invoice cards overflowing mobile — fixed.** Root cause: `frontend/src/styles/components/tables.css`, `.table__actions` (used inside the mobile `.table--stack` card layout) had no `flex-wrap`. Invoice rows render up to 6 icon-buttons (Mark sent + Mark paid + Copy + Download + Edit + Delete, each a 44px touch target per the `@media (pointer: coarse)` rule) vs. Proposals' 3 — a non-wrapping flex row's minimum size is "every button on one line," which is wider than a 360px card. Proposals never hit this because it has fewer actions. Fix: `flex-wrap: wrap; justify-content: flex-end;` scoped to `.table--stack .table__actions`. **Not yet confirmed on-device.**
2. **OAuth — code was already done in Bundle 1; configuration is external.** Gave the user exact Google Cloud Console + Azure/Entra portal + Supabase Dashboard steps in-chat (project ref `rzwgbrwjrzapbagbksof`, callback URL `https://rzwgbrwjrzapbagbksof.supabase.co/auth/v1/callback`). No code changes needed once the user completes that — the `signInWithGoogle`/`signInWithMicrosoft` flow in `useAuth.js` already works against it.
3. **Auth UI polish** (not a redesign — spacing/hierarchy/typography/breathing room only, no gradients/glassmorphism/heavy animation): auth card now has a real `max-width` (26rem) instead of shrink-wrapping, more generous card padding and form gap, primary CTA bumped to `size="lg"`, password eye-toggle button got real hover/focus states (`.input-addon-btn` in `inputs.css`). Also fixed a real inconsistency found while doing this: `ForgotPasswordPage.jsx`/`ResetPasswordPage.jsx` headings weren't using the `heading-xl` class (fell back to unstyled browser-default `<h1>`) and their `<form>` wasn't using `auth-card__form`, so their spacing silently didn't match `AuthPage.jsx`. **Not yet confirmed on-device.**
4. **EmberSelect search padding widened again** (`select-menu.css`): panel padding 4→8px, search left padding 16→20px. This is the **third** round of widening this same spot (previously 8→16px and icon-gap 8→12px) — if the user reports it's still too tight after this, stop guessing at padding values and ask them for a screenshot with pixel measurements rather than nudging numbers again.

**Batch 3 follow-up (2026-07-25), screenshots supplied, commit `9380450` — build green:**
- **EmberSelect padding — root cause finally found and fixed for real.** Three earlier rounds (Batch 2 and Batch 3 #4 above) all padded the *container* (`.ember-select__search`, `.ember-select__panel`) and never fixed it because `.ember-select__search input` itself had `padding: 0.6rem 0` — **zero horizontal padding on the input box**. Text always sat flush against the input's own left edge no matter how far the icon/container were pushed right. Fixed the input's own padding directly (`0.6rem var(--space-3)`). **Lesson for next time this class of bug shows up:** when repeated container-padding nudges don't fix a "text too close to edge" complaint, check the padding of the actual text-rendering element, not just its ancestors.
- **Auth OAuth buttons redesigned Raycast-style, Ember-themed** (user showed a Raycast signup screenshot as the reference, explicitly wanting that layout/density but not Raycast's branding): converted from two full-width stacked "Continue with Google/Microsoft" text buttons to a 2-up row of icon-only square buttons (`.auth-oauth` now `grid-template-columns: repeat(2, 1fr)`), same secondary-button dark/orange surface, `aria-label`/`title` for a11y since there's no visible text. Added a Terms of Service / Privacy Policy disclaimer line under the signup CTA (links to existing `/terms`/`/privacy` routes, signup-only).
- ~~Did not build a two-column marketing-panel layout~~ — **superseded below, user explicitly asked for it next.**

**Batch 4 (2026-07-25), screenshots supplied, commits `451923d` + `efb2bbb` — build green:**
1. **Invoice/Proposal totals-box glued to the items table above it — fixed.** Root cause: `frontend/src/styles/components/cards.css`, `.totals-box` had no `margin-top` at all — it's a plain sibling `<div>` directly after `.items-editor` inside the same `Card` in both `InvoiceFormPage.jsx` and `ProposalFormPage.jsx` (shared class, one fix covers both). Added `margin-top: var(--space-5)`. **Not yet confirmed on-device.**
2. ~~Login/Signup rebuilt as a Raycast-style two-column layout~~ (`.auth-shell`/`.auth-showcase`, reusing `.lp-glimpse` + `data/features.js`) — **reverted one round later in Batch 5, see below.** `frontend/src/data/features.js` (the centralized feature-copy extraction) was kept since `LandingPage.jsx` still uses it; only the auth-page showcase panel itself was removed.

**Batch 5 (2026-07-25), screenshots supplied, commit `3dde6de` — build green:**
User clarified after seeing Batch 4's two-column result: keep Raycast as a **proportions/density reference only**, not as license to reuse landing-page sections in the auth page — "clean and minimal, dedicated auth experience." Removed `.auth-shell`/`.auth-showcase` entirely (deleted, not hidden — no dead CSS left behind); back to the single centered `.auth-page` card. Then applied 6 more specific, scoped changes, all via `.auth-page`-prefixed selectors so `ForgotPasswordPage`/`ResetPasswordPage` inherit them automatically (no separate edits needed there):
1. **Primary CTA gets a deeper terracotta** (`#AB5736`, via a local `--auth-accent-deep` custom property on `.auth-page`, not a global `--color-accent` change). The global token is documented in `tokens.css` as contrast-tuned for text-on-dark use (~4.6:1); I ran the WCAG contrast math before touching this — darkening it further would drop the eyebrow label/links below 4.5:1 AA, but darkening only improves white-on-button contrast (~4.2:1 → ~5:1), so only `.button--primary`'s background was changed. **If a future ask wants the eyebrow/links deepened too, that needs a different approach (e.g. a slightly-less-dark shade, or accept the AA tradeoff explicitly with the user) — don't just extend the same override to text uses.**
2. Required-field asterisks hidden **visually only** (`.auth-page .label span[aria-hidden='true'] { display: none }`) — `required` stays on every `<input>`, HTML5 + app validation unchanged.
3. Denser vertical rhythm: card padding `space-8`→`space-6`, form gap `space-5`→`space-4`, label-to-input gap `space-2`→`space-1` (scoped `.auth-page .input-wrapper`), OAuth/submit buttons reverted from `size="lg"` back to default.
4. Password eye-toggle un-boxed: `.auth-page .input-addon` background/border stripped so it sits inside the input surface instead of its own compartment.
5. Corners softened one step: card/inputs → `--radius-lg` (10→14px), buttons (already `--radius-lg` app-wide by default) → `--radius-xl` (14→18px).
6. No Raycast assets/colors/copy anywhere — confirmed via code review, only Ember tokens and existing icons used.
**Not yet confirmed on-device.**

**Batch 6 (2026-07-25), commit `ec05f15` — build green:**
Desktop shouldn't need scrolling to reach a field; mobile stays exactly as-is (explicit instruction). Everything below is gated behind `@media (min-width: 768px)` — nothing changes on mobile. Signup (the longer form) now: ~~Name+Email share one row via a new `.auth-card__row` grid~~ (see Batch 7 — Name field removed entirely one round later, so this row layout no longer applies), plus another tightening pass on top of Batch 5's (`.auth-page` outer padding/gap, card padding, form gap, label-to-input gap all step down further at desktop width). Not measured in an actual browser (no headless browser available, see below) — if a real desktop viewport still requires scrolling, tell me the exact window height and cut further rather than guessing again.

**Batch 7 (2026-07-25), commit `ab2b1b7` — build green:**
User decided EmberFlow doesn't need a Name field at signup at all — removed it, Email now renders identically in both login and signup (no more `isSignup` branch for that field). Backend needed **no changes**: `handle_new_user()` in `supabase/schema.sql` already does `coalesce(new.raw_user_meta_data ->> 'full_name', '')`, so a signup with no `full_name` in metadata just gets an empty string, same as today — profile `full_name` can still be filled in later via Settings. Removed the now-unused `.auth-card__row` CSS from Batch 6 since there's nothing left to put in two columns.

**Session note:** dev server was started with `npm run dev -- --host` (LAN-visible, prints a `Network:` URL) so the user could test from another device on the same network — this is session-local state, won't persist to the next session, just start it again the same way if asked.

**Verification limitation (ongoing, all sessions so far):** no headless browser or real Android device available in this container — Playwright's bundled Chromium doesn't support macOS 12 here, and `chromium-cli` isn't installed. All fixes are verified by `npm run build` + code/CSS reasoning only, not on-device rendering. Always say so explicitly and ask the user to confirm on Arc/Android before treating a fix as done.

**Branch:** `opclaude-redesign`. Prior batches (newest first, before Batch 3 above):
- `b338960` Fix light theme rendering blue-tinted on Android Chrome/Arc (`index.html`, Batch 2 #5, **confirmed on-device**): root cause was Chromium's Auto Dark Theme force-inverting the light palette despite CSS `color-scheme` being set — added `<meta name="color-scheme" content="light dark">`. Toggle JS/state logic was never buggy (single tap, correct); this was a browser rendering override, not a code bug. User confirmed by disabling "Force dark mode" in Chrome settings before the fix landed.
- `987f6c4` Widen EmberSelect search field left padding 8→16px + search→list gap 4→8px (`select-menu.css`, Batch 2 #3/#4)
- `e348c13` Client phone field: `type="tel"`/`inputMode="tel"` + strip non-digit/punctuation chars on change (`ClientFormPage.jsx`, Batch 2 #2)
- `e6e585c` Invoice/Client list mobile fix (Batch 2 #1, release-blocking): root cause was `.table-wrap`'s mobile negative-margin/zero-padding bleed (`tables.css`) — written for horizontally-scrolling tables, but also applied to `.table--stack` (card) tables where it zeroed out vertical spacing and collided with sibling filters-row/pagination. Scoped the bleed off for `.table--stack` via `:has()`; also made `.table__pagination-controls`/`.table__pages` wrap instead of forcing a non-wrapping row that could exceed 360px. Applies to both InvoicesPage and ClientsPage (both use `pagination` + `filters-row`, same shared `Table` component).
- `ae2efb7` Fix crumpled landing navbar on mobile (retarget `.marketing-nav__inner`, the real flex container; `layout.css`)
- `787aacb` Widen EmberSelect search icon→text gap 8→12px (`.ember-select__search`)
- `8904341` Invoice mobile overflow fix: `min-width:0` on `.input/.textarea/.select` + `.ember-select`/`__value` (native Client `<select>` couldn't shrink → root cause).
- `3197897` Tighten mobile `page-stack` gap 20→16px
- Earlier: EmberSelect component + centralized `src/data/currencies.js` & `src/data/countries.js` (Palestine pinned first, Israel + ILS excluded — **do not change**), Phase 7 (perf/a11y/hardening) complete; Bundle 1 (Google/Microsoft OAuth code, password strength meter, disposable email detection) — commits `b7721fe`, `e428ecd`, both folded into this thread as of Batch 3.

**Known open item (deferred, do NOT do unprompted):** spacing tokens are **px**; migrating to rem is only worthwhile if paired with unpinning `html { font-size: 16px }` (`reset.css:8`) — recommended as its own tracked, device-tested task, not during RC QA.
