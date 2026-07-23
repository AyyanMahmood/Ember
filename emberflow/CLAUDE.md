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
| Design system (tokens, BEM, component library) | Established, still cream/light by default — dark-first token rebuild is Phase 1 of the active roadmap |
| Responsive foundation | Complete |
| Page-level polish | In progress |
| Dark mode | Preliminary tokens exist, needs full pass |
| Micro-interactions and animation | Basic transitions in place |
| Premium redesign (OpenClaude-level polish) | Remaining work |
| Trust/correctness fixes (fake metrics, blank status badge, checkout PII log, CORS) | Complete (roadmap Phase 0) |

A full audit and a 10-phase implementation roadmap toward a dark-first, white-label-ready premium redesign is in progress on `opclaude-redesign`. See `PROJECT_STATUS.md` → "Redesign Roadmap Progress" for phase-by-phase status.
