# EmberFlow - Complete Technical Specification

## Project Overview

**EmberFlow** is a freelance finance workspace — a SaaS dashboard for freelancers to manage clients, invoices, proposals, and analytics. Built as a full-stack application with Supabase (PostgreSQL + Auth + Storage) and Paddle for billing.

**Stack**: React 18 + Vite, Supabase (PostgreSQL, Auth, Storage, Realtime), Paddle Billing, Vercel deployment.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        VERCEL (Frontend + API)                  │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite)          │  API Routes (Serverless)    │
│  /app/* (Protected Dashboard)     │  /api/paddle/checkout       │
│  / (Landing, Pricing, Auth)       │  /api/paddle/portal         │
│                                   │  /api/paddle/webhook        │
└───────────────────────────────────┴─────────────────────────────┘
                    │                              │
                    ▼                              ▼
┌─────────────────────────────────┐   ┌─────────────────────────────┐
│         SUPABASE                │   │         PADDLE              │
│  ┌─────────────────────────┐    │   │  • Subscription Management  │
│  │ PostgreSQL (RLS)        │    │   │  • Checkout Sessions        │
│  │ Auth (Email/Password)   │    │   │  • Customer Portal          │
│  │ Storage (Avatars/Logos) │    │   │  • Webhooks                 │
│  │ Realtime                │    │   │                             │
│  └─────────────────────────┘    │   └─────────────────────────────┘
└─────────────────────────────────┘
```

---

## Database Schema (Supabase/PostgreSQL)

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | User profile & business settings | `id` (FK auth.users), `full_name`, `business_name`, `invoice_brand_color`, `invoice_footer`, `avatar_url`, `logo_url`, `currency`, `invoice_prefix` |
| `clients` | Client directory | `id`, `user_id`, `name`, `email`, `company`, `phone`, `country`, `notes` |
| `invoices` | Invoice records | `id`, `user_id`, `client_id`, `invoice_number`, `invoice_date`, `due_date`, `currency`, `subtotal`, `tax_total`, `discount_total`, `total`, `status` (draft/sent/paid/overdue), `sent_at`, `paid_at`, `notes` |
| `invoice_items` | Line items for invoices | `id`, `invoice_id`, `description`, `quantity`, `price`, `tax_rate`, `position` |
| `proposals` | Project proposals (Pro feature) | `id`, `user_id`, `template`, `client_name`, `title`, `project_summary`, `scope`, `timeline`, `amount`, `currency` |
| `proposal_items` | Proposal line items | `id`, `proposal_id`, `title`, `description`, `amount`, `position` |
| `subscriptions` | Paddle subscription sync | `id`, `user_id`, `plan` (free/pro_monthly/pro_yearly), `status`, `paddle_customer_id`, `paddle_subscription_id`, `paddle_price_id`, `current_period_start/end` |
| `invoice_usage` | Free plan limit tracking | `user_id`, `usage_month`, `invoice_count` |
| `payments` | Payment records | `id`, `invoice_id`, `user_id`, `amount`, `currency`, `payment_date`, `method`, `status` |
| `webhook_events` | Paddle webhook deduplication | `id`, `event_type`, `processed_at` |

### Key Functions

- `create_invoice_with_items(p_invoice jsonb, p_items jsonb)` — Creates invoice + items atomically, enforces free plan limits
- `enforce_client_limit()` — Trigger prevents free users from exceeding 10 clients
- `enforce_proposals_pro_only()` — Trigger blocks proposals for free users
- `handle_new_user()` — Auto-creates profile + subscription on signup
- `set_updated_at()` — Auto-updates `updated_at` timestamp

### RLS Policies

All tables have Row Level Security enabled. Policies ensure users only access their own data:
- Profiles: owner-only CRUD
- Clients/Invoices/Items: owner-only (with client ownership verification for invoices)
- Proposals/Proposal Items: owner-only + Pro plan enforcement
- Subscriptions: owner-only view
- Storage: user-scoped folders for avatars/logos

---

## Authentication & Authorization

**Supabase Auth** (Email/Password + OAuth ready)
- Signup → `handle_new_user()` creates profile + free subscription
- Protected routes via `ProtectedRoute` component
- Session persisted in localStorage
- Password reset via Supabase email

**Plan Gating** (via `useSubscription` hook + `FeatureGate` component):
| Feature | Free | Pro |
|---------|------|-----|
| Invoices/month | 5 | Unlimited |
| Clients | 10 | Unlimited |
| Proposals | ❌ | ✅ |
| Analytics | ❌ | ✅ |
| Branding (logo/color) | ❌ | ✅ |

---

## Frontend Architecture

### Routes

```
/ (Landing)
/features
/pricing
/terms, /privacy, /refund, /contact
/login, /signup, /forgot-password, /reset-password

/app (Protected)
  / (Dashboard)
  /clients, /clients/new, /clients/:id, /clients/:id/edit
  /invoices, /invoices/new, /invoices/:id, /invoices/:id/edit
  /proposals, /proposals/new
  /analytics
  /settings
```

### Layout Components

- **AppLayout** — Sidebar + Topbar + Outlet (authenticated pages)
- **PublicLayout** — Marketing header/footer (public pages)
- **Sidebar** — Navigation (Dashboard, Clients, Invoices, Proposals, Analytics, Settings), mobile drawer
- **Topbar** — Brand, user avatar, notifications (future)

### UI Components (`frontend/src/components/`)

| Component | Purpose |
|-----------|---------|
| `Button` | Primary, ghost, danger variants |
| `Card` / `Panel` | Content containers |
| `Table` | Generic data table with render props |
| `Modal` | Dialog with backdrop, focus trap |
| `Input` / `PasswordField` | Form inputs with labels |
| `StatusBadge` | Invoice status chips (draft/sent/paid/overdue) |
| `StatCard` | Dashboard metric cards |
| `EmptyState` | Illustrated empty states with CTA |
| `LoadingSpinner` | Inline/page loaders |
| `UpgradeModal` | Pro upsell dialog |
| `FeatureGate` | Conditional rendering for Pro features |

### New Design System Components (`frontend/src/components/ui/`)

| Component | Features |
|-----------|----------|
| `Button` / `IconButton` | 6 variants, 3 sizes, loading state, icons |
| `Input` / `Textarea` / `Select` | Validation states, addons, file upload |
| `Card` / `CardHeader` / `StatCard` / `FeatureCard` / `PricingCard` | Variants, composition |
| `Table` / `TableColumn` / `TablePagination` | Sorting, selection, pagination, skeletons |
| `Modal` / `ModalFooter` / `Drawer` / `DrawerFooter` | Focus trap, animations, responsive |
| `Badge` / `StatusBadge` / `Chip` | Semantic variants, removable |
| `Avatar` / `AvatarGroup` / `LogoPlaceholder` | Fallbacks, groups, initials |
| `EmptyState` / `EmptyStateIllustration` | Variants, actions, SVG illustrations |
| `LoadingSpinner` / `LoadingOverlay` / `PageLoader` / `Skeleton` / `SkeletonCard` / `SkeletonTable` / `SkeletonList` | Multiple variants |

### Design Tokens (`frontend/src/styles/`)

```
tokens.css      → All CSS custom properties (colors, spacing, typography, radius, shadows, z-index, breakpoints, durations, easings)
reset.css       → Normalize, base styles
typography.css  → Type scale classes (.heading-xl, .body-lg, .label, .caption, .overline, .mono)
layout.css      → Grid/flex/container/spacing utilities
components/     → Buttons, inputs, cards, tables, modals, badges, sidebar, topbar, avatars, empty-state, loading
index.css       → Imports all above
```

**Color System** (CSS custom properties):
- `--color-bg`: #F7F1E3 (warm cream)
- `--color-surface`: #FFFAF2
- `--color-surface-strong`: #FFFFFF
- `--color-ink`: #0A0A0A
- `--color-muted`: #6D675D
- `--color-line`: #E5DCCD
- `--color-blue`: #3B82F6 (primary)
- `--color-success`: #067647
- `--color-warning`: #B54708
- `--color-danger`: #B42318
- `--color-draft`: #4F4639

**Dark mode tokens defined** (inactive, ready for toggle)

---

## API Endpoints (Vercel Serverless Functions)

### Paddle Integration

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/paddle/checkout` | POST | Create checkout session for Pro upgrade |
| `/api/paddle/portal` | POST | Open Paddle customer portal |
| `/api/paddle/webhook` | POST | Handle Paddle events (subscription.created/updated/canceled, transaction.completed) |

**Checkout Flow:**
1. User clicks "Upgrade" → `startCheckout('pro_monthly'|'pro_yearly')`
2. API creates/finds Paddle customer
3. Creates transaction with price ID
4. Returns hosted checkout URL
5. User completes payment on Paddle
6. Webhook updates `subscriptions` table
7. UI refreshes via `useSubscription` hook

**Webhook Events Handled:**
- `subscription.created` / `updated` / `canceled` → upsert subscription
- `transaction.completed` (with subscription_id) → upsert subscription
- Deduplication via `webhook_events` table

### Frontend Services

| Service | Purpose |
|---------|---------|
| `api.js` | CRUD for clients, invoices, proposals + RPC `create_invoice_with_items` |
| `supabase.js` | Supabase client, auth helpers, storage upload |
| `subscriptions.js` | `startCheckout()`, `openBillingPortal()` |
| `useAuth` | `user`, `session`, `signIn`, `signUp`, `signOut`, `resetPassword` |
| `useProfile` | Profile CRUD, avatar/logo upload |
| `useSubscription` | Plan, limits, usage, `canUseFeature()` |

---

## Business Logic

### Invoice Status Flow

```
draft → sent → paid
         ↘ overdue (if past due_date and not paid)
```

- `effectiveStatus(invoice)` utility computes real-time status
- Free plan: max 5 invoices/month (enforced in DB function)
- Pro plan: unlimited

### Client Limits

- Free: 10 clients (enforced by `enforce_client_limit()` trigger)
- Pro: Unlimited

### Proposals (Pro Only)

- Template-based (Standard, Detailed, Minimal)
- Line items with amounts
- PDF generation via `html2canvas` + `jsPDF`
- Trigger `enforce_proposals_pro_only()` blocks free users

### Branding (Pro Only)

- Custom logo upload (Supabase Storage `logos` bucket)
- Invoice accent color picker
- Custom footer text
- Payment instructions

---

## Deployment (Vercel)

### `vercel.json`
```json
{
  "version": 2,
  "installCommand": "npm install && npm --prefix frontend install",
  "buildCommand": "npm run build",
  "outputDirectory": "frontend/dist",
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```

### Environment Variables (Required)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `PADDLE_API_KEY` | Paddle API key (server) |
| `PADDLE_WEBHOOK_SECRET` | Paddle webhook signature secret |
| `PADDLE_PRO_MONTHLY_PRICE_ID` | Price ID for monthly Pro |
| `PADDLE_PRO_YEARLY_PRICE_ID` | Price ID for yearly Pro |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server) |

---

## Key Files Reference

### Frontend Entry Points
- `frontend/src/main.jsx` — React root, providers, imports `styles/index.css`
- `frontend/src/App.jsx` — Route definitions
- `frontend/index.html` — HTML template

### Core Hooks
- `frontend/src/hooks/useAuth.js` — Auth state & actions
- `frontend/src/hooks/useProfile.js` — Profile & file uploads
- `frontend/src/hooks/useSubscription.js` — Plan, limits, feature gating

### Services
- `frontend/src/services/api.js` — Supabase CRUD + RPC
- `frontend/src/services/supabase.js` — Client, auth, storage
- `frontend/src/services/subscriptions.js` — Paddle checkout/portal

### Utilities
- `frontend/src/utils/format.js` — `formatMoney`, `formatDate`
- `frontend/src/utils/invoice.js` — `effectiveStatus`, `generateInvoiceNumber`
- `frontend/src/utils/plans.js` — `PLANS`, `formatLimit`
- `frontend/src/utils/pdf.js` — PDF generation for invoices/proposals

### Pages (App)
- `DashboardPage` — Stats + recent invoices table
- `ClientsPage` — Searchable/filterable client table + CRUD
- `ClientDetailPage` — Client info + related invoices
- `ClientFormPage` — Create/edit client
- `InvoicesPage` — Invoice table with status actions
- `InvoiceDetailPage` — Full invoice view + PDF download
- `InvoiceFormPage` — Create/edit invoice with line items
- `ProposalsPage` — Proposal list
- `ProposalFormPage` — Create/edit proposal + PDF
- `AnalyticsPage` — Revenue metrics + top clients (Pro)
- `SettingsPage` — Profile, branding, billing, usage

### Pages (Marketing)
- `LandingPage` — Hero, features, pricing teaser, testimonials
- `PricingPage` — Free vs Pro comparison, checkout buttons
- `FeaturesPage` — Feature details
- `AuthPage` — Login/signup/reset forms
- Legal: `TermsPage`, `PrivacyPage`, `RefundPolicy`, `ContactPage`

---

## Development Commands

```bash
# Install all dependencies
npm install && npm --prefix frontend install

# Frontend dev server
npm run dev        # Runs frontend on :5173

# Build for production
npm run build      # Outputs to frontend/dist/

# Preview production build
npm run preview
```

---

## Testing Checklist (Manual)

- [ ] Signup → email confirmation → profile created
- [ ] Login → dashboard loads with stats
- [ ] Create client → appears in list → edit/delete works
- [ ] Create invoice (draft) → add line items → save
- [ ] Mark invoice sent → status badge updates
- [ ] Mark invoice paid → revenue updates in dashboard
- [ ] Free plan: hit 5 invoice limit → blocked with message
- [ ] Free plan: hit 10 client limit → blocked
- [ ] Upgrade to Pro (test mode) → limits removed
- [ ] Proposal creation (Pro only) → PDF download
- [ ] Branding: upload logo + set color → appears on invoice PDF
- [ ] Billing portal: manage subscription
- [ ] Mobile: sidebar drawer, stacked tables
- [ ] Dark mode tokens present (toggle not yet implemented)

---

## Future Enhancements (Not Implemented)

- Dark mode UI toggle
- Email notifications (invoice sent/paid/overdue)
- Recurring invoices
- Multi-currency support with exchange rates
- Team/workspace collaboration
- Chart library integration (Recharts) for Analytics
- Toast notification system
- Tooltip/Popover components
- Keyboard shortcuts (Cmd+K command palette)
- PDF template customization
- Webhooks for Zapier/Make integration

---

## Security Considerations

- All DB access via RLS policies (no server-side bypass)
- Paddle webhook signature verification
- Rate limiting on checkout/webhook endpoints
- Supabase service role key only in serverless functions
- File uploads scoped to user folder in Storage
- CSP headers via Vercel (configure in `vercel.json` if needed)

---

## Performance Notes

- Vite code-splits by route automatically
- Lucide icons tree-shaken
- Supabase client singleton
- Table pagination + skeleton loading for large datasets
- CSS custom properties for theming (no runtime overhead)
- `prefers-reduced-motion` respected globally

---

*This specification reflects the codebase as of the current UI experimentation branch. All backend logic, database schema, and Paddle integration are production-ready. The frontend has been upgraded with a comprehensive design system and reusable component library.*