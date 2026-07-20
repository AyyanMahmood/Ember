# EmberFlow

EmberFlow is a premium freelancer finance operating system for independent professionals and small agencies. It replaces disconnected spreadsheets, email threads, PDF templates, and bank exports with one cohesive workspace for the money side of client work.

### Core Features

- **Client management** — Profiles, contact data, notes, billing history
- **Invoice generation** — Itemized invoices with tax, discounts, PDF export, status tracking
- **Proposal generation** — Template-driven proposals with scope, pricing, and PDF export
- **Payment tracking** — Manual payment records, balance reconciliation, overdue monitoring
- **Analytics** — Revenue totals, monthly collections, overdue tracking, top-client rankings
- **Dashboard** — At-a-glance metrics, recent activity, status summaries
- **Authentication** — Email/password auth with password reset flow
- **Settings** — Profile, business info, invoice branding, subscription management

---

# Vision

The goal is not to build another generic dashboard. The goal is to become:

**"The Linear / Stripe / Notion of freelancer finance."**

The product should feel:

- Premium
- Minimal
- Calm
- Trustworthy
- Beautifully designed

Every pixel should communicate quality. The experience should make freelancers feel like they run a serious company.

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

> Reusable UI components live in `components/ui/`. Each component has a JSX file and a corresponding CSS file in `styles/components/`. The component library is intentionally small — Button, Card, Input, Table, Modal, Badge, Avatar, EmptyState, Loading.

---

# Design Principles

### Inspired By

- **Linear** — Clean, fast, opinionated project management
- **Stripe Dashboard** — Trustworthy, minimal financial UI
- **Vercel** — Developer-friendly, modern, geometric
- **Arc Browser** — Thoughtful, cohesive, premium
- **Notion** — Spacious, typographic, calm

### Visual Rules

- **Clean** — Every element earns its place
- **Spacious** — Generous whitespace, comfortable rhythm
- **Premium** — Quality textures, refined colors, deliberate shadows
- **Elegant** — Refined typography, subtle hierarchy, no visual noise
- **Responsive** — Mobile-first, works on any screen
- **Subtle motion** — Micro-interactions, smooth transitions, never gratuitous
- **Soft shadows** — Warm, layered depth without harshness
- **Strong typography** — Inter font, bold weights, tight display leading
- **No clutter** — One thing at a time, progressive disclosure
- **Dark mode** — World-class dark theme, not an afterthought

### Avoid

- Bootstrap appearance
- Material Design look
- Generic Tailwind dashboard feel
- Excessive gradients
- Heavy borders
- Unnecessary chrome

---

# Engineering Rules

### Claude must PRESERVE

- Business logic
- Supabase integration (database, auth, storage, RLS)
- Authentication flows
- Routing structure
- Database schema and migrations
- API contracts and serverless function signatures
- Paddle subscription integration

### Claude may freely IMPROVE

- UI appearance and polish
- UX and interaction design
- Layout, spacing, and visual rhythm
- CSS, design tokens, component styling
- Animations, transitions, micro-interactions
- Responsiveness and mobile behavior
- Accessibility (ARIA, focus management, keyboard navigation)
- Design system consistency and component API
- Typography and visual hierarchy
- Empty states, loading states, and error states

---

# Coding Standards

### Always

- Reuse existing components from `components/ui/`
- Avoid duplicating CSS across files
- Use design tokens from `tokens.css` (`var(--space-*)`, `var(--color-*)`, `var(--text-*)`, `var(--radius-*)`, etc.)
- Use BEM naming for CSS classes (`.block__element--modifier`)
- Keep components reusable and composable
- Preserve accessibility attributes (`role`, `aria-*`, focus management)
- Keep performance high (memoize where appropriate, avoid unnecessary re-renders)

### After Every Change

1. Run `npm run build` in `frontend/`
2. Fix any build errors
3. Explain what changed and why

---

# Libraries

- Prefer free, open-source libraries
- Do NOT introduce paid services or APIs
- Do NOT replace Supabase with another backend
- Do NOT rewrite the architecture unless explicitly requested

### Currently in use

- `lucide-react` — Icons
- `jspdf` + `html2canvas` — PDF generation
- `@supabase/supabase-js` — Database and auth client

---

# Current Status

| Area | Status |
|------|--------|
| UI migration (legacy → canonical components) | Complete |
| Design system (tokens, BEM, component library) | Established |
| Responsive foundation | Complete |
| Page-level polish | In progress |
| Dark mode | Preliminary tokens exist, needs full pass |
| Micro-interactions and animation | Basic transitions in place |
| Premium redesign (Linear/Stripe-level polish) | Remaining work |

The design system is stable. Remaining work focuses on polish, dark-mode refinement, UX improvements, animation, and elevating the overall visual quality to match the Linear/Stripe/Notion benchmark.

---

# Workflow

Claude should never rewrite the entire application. Instead, follow this loop:

1. **Understand** — Read the relevant files, understand the current state
2. **Plan** — Identify the smallest meaningful improvement
3. **Implement** — Make precise, scoped changes
4. **Build** — Run `npm run build` and fix errors
5. **Verify** — Confirm the result works correctly
6. **Explain** — Summarize what changed and why
7. **Continue** — Await approval before the next phase

---

_Preserving EmberFlow's architecture is more important than introducing unnecessary rewrites. Every change should make the product feel more premium, more reliable, and more delightful — not more complex._

---

# Product Philosophy

EmberFlow is not just an invoicing application.

It is intended to become the operating system for freelancers.

Every feature should answer one question:

"Does this help a freelancer run their business better?"

Do not add features simply because other SaaS products have them.

Every feature should feel intentional.

---

# Design Expectations

The UI should eventually be world-class.

Target quality should be comparable to:

- Linear
- Stripe Dashboard
- Arc Browser
- Notion
- Raycast
- Vercel

Design should feel:

- expensive
- premium
- calm
- warm
- modern
- timeless

Avoid looking like:

- Bootstrap
- generic Tailwind templates
- Material UI
- generic admin templates
- low-quality SaaS dashboards

Dark mode should receive the exact same attention as light mode.

Never treat dark mode as an afterthought.

---

# Performance Goals

Maintain:

- Fast page loads
- Smooth 60fps animations
- No layout shifts
- Responsive on every screen size
- Lighthouse score above 90 whenever practical

---

# Decision Priority

When making decisions, prioritize in this order:

1. Correctness
2. User Experience
3. Performance
4. Maintainability
5. Visual Polish

Never sacrifice correctness for appearance.

---

# AI Workflow

Before changing anything:

- Read all relevant files first.
- Understand existing architecture.
- Reuse existing components whenever possible.
- Avoid duplicate implementations.
- Preserve business logic.

After making changes:

1. Run npm run build.
2. Fix every build error.
3. Explain exactly what changed.
4. Wait for approval before beginning the next phase.

Never perform massive rewrites without approval.

---

# Ember Ecosystem

EmberFlow is only the first product under Ember.

Future Ember products will share:

- Design language
- Component library
- UX philosophy
- Engineering standards

Keep architecture modular enough that future products can reuse existing systems.

---

# Long-Term Vision

The long-term goal is to build a family of premium business software under the Ember brand.

Every improvement should move EmberFlow closer to becoming a product that feels comparable to the best software companies in the world.

The goal is not to copy Linear or Stripe.

The goal is to create software that belongs in the same conversation.
