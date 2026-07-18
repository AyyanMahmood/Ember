# EmberFlow Project Status

## Project Overview

EmberFlow is a production-ready freelance finance workspace SaaS. It enables freelancers to manage clients, create/send/track invoices, build proposals, analyze revenue, and handle subscriptions via Paddle. Built with React + Vite frontend, Supabase (PostgreSQL, Auth, Storage) backend, and Paddle for billing. Deployed on Vercel with serverless API routes.

---

## Current Branch

**ui-redesign-lab** (feature branch off `main`)

This branch is dedicated exclusively to UI experimentation — a complete design system overhaul inspired by Paddle, Notion, Material 3 Expressive, Linear, Vercel, Raycast, and Arc Browser. No backend logic, API endpoints, database schema, authentication, or Paddle integration is being modified.

---

## Current Goal

**Complete the UI redesign laboratory work** — transform all app screens to the new design system (warm/premium/minimal aesthetic with design tokens, reusable components, improved spacing/typography/animations/hierarchy/responsiveness/empty states/loading states).

**Current screen**: ClientsPage (updated with new Table, Input, Select, Card components)
**Next screen**: SettingsPage (needs new Input, Select, Card, Avatar, Button components)

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

**2026-07-18** — UI redesign lab branch active, design system complete, 4/17 app screens migrated, SettingsPage next.