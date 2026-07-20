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

The goal is not to build another generic dashboard.

EmberFlow's visual identity should be almost identical in design philosophy to OpenClaude.

NOT "inspired by."

The level of polish, spacing, animation, typography, hierarchy, and component quality should feel almost identical.

The goal is for someone to immediately think:

"This feels like OpenClaude."

without copying branding or logos.

The current UI should be treated only as a functional prototype.

Claude has permission to completely redesign the presentation layer — layout, spacing, components, typography, animations, responsiveness — while preserving ALL business logic.

Business logic must NEVER change. Only presentation, UX, responsiveness, accessibility, animations, spacing, typography, and components may change.

The visual quality should compete with:

- OpenClaude
- Vercel
- Raycast
- Arc Browser
- Linear
- Clerk
- Resend
- Notion

UI quality is now considered equally important as functionality.

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

### Visual Characteristics

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

### Claude may freely IMPROVE (or completely redesign)

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
- Component library — replace custom components with shadcn/ui equivalents

---

# Coding Standards

### Always

- Use shadcn/ui as the primary component system; replace custom components with shadcn/ui equivalents whenever they improve quality.
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
| Premium redesign (OpenClaude-level polish) | Remaining work |

The design system is stable. Remaining work focuses on polish, dark-mode refinement, UX improvements, animation, and elevating the overall visual quality to match the OpenClaude benchmark.

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

The UI should feel world-class. When someone opens EmberFlow they should immediately think:

"This looks like a premium product."

Every page should feel handcrafted. Nothing should feel like a generic template.

### Component Style

Buttons should resemble OpenClaude:

- Rounded-xl
- Floating appearance
- Soft shadow
- Slight hover lift
- Spring animation
- Premium focus states
- Active press animation

Cards:

- Floating
- Large radius
- Soft borders
- Deep layered shadows
- Spacious padding

Inputs:

- Large
- Rounded
- Matte surfaces
- Excellent focus glow

Navigation:

- Premium sidebar
- Clean spacing
- Beautiful icons
- Smooth hover animations

Tables:

- Minimal
- Spacious
- Modern
- Stripe-quality

### Motion

Animations should feel like OpenClaude.

Use Motion (Framer Motion) extensively throughout the application. Nothing should feel static.

Examples:

- Fade
- Slide
- Scale
- Spring
- Stagger children
- Hover lift
- Smooth page transitions

### UI Library Rules

- Use **shadcn/ui** aggressively as the primary component system. Replace custom components with shadcn/ui equivalents whenever they improve quality. Do not preserve custom components simply because they already exist.
- Use **Motion (Framer Motion)** for all animations — page transitions, hover effects, entrance animations, micro-interactions.
- Use **Aceternity UI** and **Magic UI** selectively for premium landing-page sections and tasteful micro-interactions.
- Use **lucide-react** for all icons.
- Use **Recharts** for analytics charts.
- Do not convert EmberFlow into a generic shadcn template. Preserve the OpenClaude visual identity: dark-first, matte charcoal, large radius, floating cards, soft shadows.

---

# Responsiveness

Every page must be responsive across every screen size. No exceptions.

- Mobile-first approach
- Perfect on phones
- Perfect on tablets
- Perfect on laptops
- Perfect on ultrawide monitors
- No horizontal scrolling
- No broken layouts at any viewport width
- Test at 320px, 480px, 768px, 1024px, 1440px, 1920px

---

# Performance

- Use lazy loading for route-level code splitting
- Use code splitting for heavy dependencies
- Avoid unnecessary dependencies — keep the bundle lean
- Keep Lighthouse scores above 90
- Prefer CSS animations over JS animations when possible
- Animations must run at 60fps — no jank
- Do not sacrifice performance for visual effects
- No layout shifts during page load
- Use React.lazy and Suspense for page-level code splitting

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

---

# Component Strategy

Claude is encouraged to replace existing custom UI components with mature open-source library equivalents whenever it improves quality. Do not preserve custom components simply because they already exist — the goal is world-class UI.

Preferred libraries:
- **shadcn/ui** — Primary component system. Replace custom Button, Card, Input, Table, Modal, Badge, etc. with shadcn equivalents.
- **Motion (Framer Motion)** — All animations, page transitions, hover effects, micro-interactions.
- **Aceternity UI** — Premium landing-page sections and tasteful UI flourishes.
- **Magic UI** — Micro-interactions and animated components.
- **Recharts** — Analytics charts and data visualization.
- **lucide-react** — All icons.

Rules:

- Adopt the OpenClaude visual identity: dark-first, matte charcoal, large radius, floating cards, soft shadows.
- Do not replace working business logic simply to adopt a library.
- Do not convert EmberFlow into a generic shadcn template — preserve the premium OpenClaude aesthetic.
- Install libraries only when they provide clear value. Avoid unnecessary dependencies.

Before introducing a new library:
1. Check if the functionality already exists in the codebase.
2. If not, prefer the smallest mature library.
3. Explain why the library was chosen.

---

# Success Criteria

A redesign is considered successful only if all of the following are true:

- The application feels comparable to OpenClaude in overall quality.
- Every page looks intentionally designed rather than assembled.
- UI consistency is perfect across all pages.
- Every component feels part of one design language.
- Mobile experience is first-class.
- Dark mode is the primary experience.
- Animations are subtle, smooth, and meaningful.
- Lighthouse Performance >90.
- Accessibility remains excellent.
- Business logic is unchanged.
- Existing functionality continues to work.

If forced to choose between preserving the old UI or replacing it with a substantially better implementation, always choose the better implementation. Claude should think like a senior product designer, not merely a frontend engineer.

Question every screen.

Question every spacing decision.

Question every interaction.

Question every hierarchy.

Question every animation.

If something looks merely "acceptable", redesign it until it feels premium.

---

# 🚨 Critical Architecture Protection

The presentation layer may be redesigned completely.

The application architecture MUST NOT be redesigned.

Claude must preserve all existing integrations.

DO NOT replace, rewrite, or remove:

- Supabase
- Supabase Auth
- PostgreSQL schema
- Row Level Security (RLS)
- Storage buckets
- API routes
- Vercel serverless functions
- Paddle integration
- Redis / Upstash
- Environment variables
- React Router structure
- Business logic
- Database queries
- Services
- Hooks
- Utility functions
- Authentication flow
- Invoice generation logic
- Proposal generation logic
- Analytics calculations
- Payment logic

Claude may ONLY change these if explicitly instructed.

Default assumption:

Backend is production-ready.

The frontend presentation layer is the only area requiring redesign.

---

## Architecture Rule

Backend = Stable

Business Logic = Stable

Database = Stable

API = Stable

Authentication = Stable

Payments = Stable

Deployment = Stable

UI = Replace freely.

---

If a redesign requires changing backend logic,
Claude must STOP and explain why before making changes.

Never rewrite working backend code simply because a different implementation exists.
