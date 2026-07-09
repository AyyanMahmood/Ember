# EmberFlow Project Status

Last updated: 2026-07-09

## Executive Summary

EmberFlow has been upgraded from a compact MVP into a much broader SaaS codebase with the foundations for a commercial freelancer finance product. The existing React/Vite/Supabase application was not rebuilt from scratch; the original working flows for authentication, clients, invoices, proposals, settings, PDF export, Supabase schema, and Vercel deployment were preserved and extended.

The current codebase now includes:

- A fuller public marketing website structure
- Authentication improvements including forgot/reset password routes
- A richer profile and business settings model
- A subscription and entitlement model
- Database tables and RLS policies for payments, proposal items, and subscriptions
- Server-side Paddle API route scaffolding for checkout, customer portal, and webhooks
- Free-plan usage enforcement in both frontend checks and database triggers
- Reusable UI primitives for a more maintainable component architecture
- Invoice upgrades including discounts, notes, payment instructions, and logo-aware PDF generation
- Payment recording and payment history on invoice detail pages
- Invoice duplicate and mark-sent actions
- Proposal itemized pricing saved to `proposal_items` and exported in proposal PDFs
- Pro-gated analytics route with monthly revenue, pending, overdue, and best-client metrics
- Client search and country filtering

The latest continuation work has been build-verified and production dependency-audited from the `emberflow` root.

Verification completed:

```bash
npm install
npm --prefix frontend install
npm run build
npm audit --omit=dev
npm --prefix frontend audit --omit=dev
```

Result:

```text
Build succeeded.
0 production vulnerabilities found in root and frontend audits.
```

## Current Architecture

### Frontend

Path: `emberflow/frontend`

Technology:

- React 18
- Vite
- JavaScript
- React Router
- CSS
- Supabase browser client
- jsPDF for browser-side PDF export
- Lucide icons

Main routing is in:

- `frontend/src/App.jsx`

The app now separates:

- Public routes through `PublicLayout`
- Auth routes
- Protected application routes through `ProtectedRoute` and `AppLayout`

Public routes:

- `/`
- `/features`
- `/pricing`
- `/terms`
- `/privacy`
- `/login`
- `/signup`
- `/register`
- `/forgot-password`
- `/reset-password`

Protected routes:

- `/app`
- `/app/clients`
- `/app/clients/new`
- `/app/clients/:id`
- `/app/clients/:id/edit`
- `/app/invoices`
- `/app/invoices/new`
- `/app/invoices/:id`
- `/app/invoices/:id/edit`
- `/app/proposals`
- `/app/proposals/new`
- `/app/analytics`
- `/app/settings`

### Backend

Backend is Supabase plus Vercel serverless functions.

Supabase responsibilities:

- Authentication
- PostgreSQL data storage
- Row Level Security
- Profile records
- Client records
- Invoice records
- Invoice item records
- Payment records
- Proposal records
- Proposal item records
- Subscription records
- Logo storage bucket

Vercel API responsibilities:

- Paddle checkout session creation
- Paddle customer portal session creation
- Paddle webhook handling
- Service-role subscription writes

### Subscription Architecture

Plans are defined in:

- `frontend/src/utils/plans.js`

Plans:

- Free
- Pro Monthly
- Pro Yearly

Frontend entitlement reads:

- `frontend/src/hooks/useSubscription.js`

Backend/database source of truth:

- `public.subscriptions`

Frontend is not trusted as the source of subscription status. Paddle webhook processing is intended to write subscription state through service-role Supabase access.

Database triggers enforce key limits:

- Free users cannot exceed 10 clients
- Free users cannot exceed 5 invoices/month
- Proposal creation requires Pro
- Payment creation requires Pro

## Files Created

### Project Root

- `emberflow/project_status.md`
- `emberflow/package.json`

### Vercel API Routes

- `emberflow/api/_utils/http.js`
- `emberflow/api/_utils/paddle.js`
- `emberflow/api/_utils/supabaseAdmin.js`
- `emberflow/api/paddle/checkout.js`
- `emberflow/api/paddle/portal.js`
- `emberflow/api/paddle/webhook.js`

### Frontend Components

- `emberflow/frontend/src/components/Button.jsx`
- `emberflow/frontend/src/components/Card.jsx`
- `emberflow/frontend/src/components/FeatureGate.jsx`
- `emberflow/frontend/src/components/Input.jsx`
- `emberflow/frontend/src/components/LoadingSpinner.jsx`
- `emberflow/frontend/src/components/Modal.jsx`
- `emberflow/frontend/src/components/PricingCard.jsx`
- `emberflow/frontend/src/components/PublicLayout.jsx`
- `emberflow/frontend/src/components/Table.jsx`
- `emberflow/frontend/src/components/UpgradeModal.jsx`

### Frontend Hooks and Services

- `emberflow/frontend/src/hooks/useSubscription.js`
- `emberflow/frontend/src/services/subscriptions.js`

### Frontend Pages

- `emberflow/frontend/src/pages/FeaturesPage.jsx`
- `emberflow/frontend/src/pages/ForgotPasswordPage.jsx`
- `emberflow/frontend/src/pages/AnalyticsPage.jsx`
- `emberflow/frontend/src/pages/PricingPage.jsx`
- `emberflow/frontend/src/pages/PrivacyPage.jsx`
- `emberflow/frontend/src/pages/ResetPasswordPage.jsx`
- `emberflow/frontend/src/pages/TermsPage.jsx`

### Frontend Utilities

- `emberflow/frontend/src/utils/plans.js`

## Major Files Modified

- `emberflow/frontend/src/App.jsx`
- `emberflow/frontend/src/hooks/useAuth.js`
- `emberflow/frontend/src/pages/AuthPage.jsx`
- `emberflow/frontend/src/pages/ClientsPage.jsx`
- `emberflow/frontend/src/pages/InvoiceDetailPage.jsx`
- `emberflow/frontend/src/pages/InvoiceFormPage.jsx`
- `emberflow/frontend/src/pages/InvoicesPage.jsx`
- `emberflow/frontend/src/pages/LandingPage.jsx`
- `emberflow/frontend/src/pages/ProposalFormPage.jsx`
- `emberflow/frontend/src/pages/ProposalsPage.jsx`
- `emberflow/frontend/src/pages/SettingsPage.jsx`
- `emberflow/frontend/src/services/api.js`
- `emberflow/frontend/src/styles.css`
- `emberflow/frontend/src/utils/invoice.js`
- `emberflow/frontend/src/utils/pdf.js`
- `emberflow/.env.example`
- `emberflow/README.md`
- `emberflow/vercel.json`
- `emberflow/supabase/schema.sql`
- `emberflow/supabase/policies.sql`

## Latest Continuation Completed

Completed after the original status file was created:

- Fixed Vercel install/build commands for the new root API architecture.
- Installed root dependencies for Vercel API functions.
- Verified root production build with `npm run build`.
- Verified root production audit with `npm audit --omit=dev`.
- Verified frontend production audit with `npm --prefix frontend audit --omit=dev`.
- Added invoice payment recording UI.
- Added invoice payment history UI.
- Added invoice balance due calculations.
- Added invoice duplicate action.
- Added invoice mark-sent action in detail and list views.
- Added client search and country filtering.
- Added proposal itemized pricing in the proposal form.
- Added proposal item persistence through `proposal_items`.
- Added proposal PDF pricing breakdown.
- Added Pro-gated analytics route.
- Added Analytics sidebar navigation.
- Added responsive styling for modals, filters, analytics, payment forms, proposal items, branding, and pricing grids.
- Updated README with root install/build flow, Paddle setup, and required server environment variables.
- Updated `.env.example` with Supabase service-role and Paddle variables.

## Completed Work

### Public Website

Completed:

- Replaced the basic landing page with a larger premium SaaS landing page.
- Added hero headline: “Run your freelance business like a company.”
- Added subheadline: “Manage clients, invoices, payments, and revenue from one powerful workspace.”
- Added sections for problem, solution, features, workflow, testimonials, pricing, FAQ, final CTA, and footer.
- Added separate public pages for features, pricing, terms, and privacy.
- Added public navigation through `PublicLayout`.

### Authentication

Completed:

- Existing login/signup/logout/persistent session flow preserved.
- Added `/register` alias for signup.
- Added forgot password route.
- Added reset password route.
- Added Supabase password reset redirect using `window.location.origin`.
- Signup email verification redirect now uses `window.location.origin`.
- Increased password minimum length in forms to 8 characters.

### User Profiles and Business Settings

Completed:

- Expanded profile model in SQL.
- Added fields for:
  - Full name
  - Email
  - Business name
  - Logo URL
  - Phone
  - Address
  - Country
  - Currency
  - Invoice brand color
  - Invoice footer
  - Payment instructions
  - Invoice prefix
- Added Supabase Storage bucket definition for business logos.
- Added logo upload UI in settings.
- Added subscription management section in settings.

### Client CRM

Completed from MVP:

- Create clients
- Edit clients
- Delete clients
- View client details
- View client invoice history

Not yet completed:

- Client search UI
- Client filter UI
- Rich timeline-style client history

### Invoice System

Completed from MVP:

- Create invoices
- Edit invoices
- Delete invoices
- View invoices
- Mark invoices paid
- PDF download
- Line items
- Quantity
- Price
- Tax
- Statuses

Added:

- Discount support
- Notes support
- Invoice prefix/default currency from profile
- Free-plan invoice creation guard
- Database-level invoice limit trigger
- Payment instructions included in PDF
- Logo-aware invoice PDF generation

Still needed:

- Duplicate action wired into the invoice UI
- Mark sent action wired into the invoice UI
- Payment form/history UI on invoice detail
- Overdue automation or scheduled status update

### PDF Generation

Completed:

- Existing browser-side invoice and proposal PDF generation preserved.
- Invoice PDFs now include:
  - Business logo when available
  - Freelancer/business details
  - Client details
  - Invoice number
  - Dates
  - Item table
  - Tax
  - Discount
  - Total
  - Notes
  - Payment instructions

Known caveat:

- Logo loading from remote storage may require CORS-compatible public object URLs. Supabase public storage URLs should work, but this should be tested with real uploaded logos.

### Proposal Builder

Completed from MVP:

- Proposal templates
- Editable project summary/scope/timeline
- Pricing
- PDF export
- Saved proposals

Added in database:

- `proposal_items` table
- Pro-only database trigger for proposal creation

Still needed:

- Update proposal form to save proposal line items into `proposal_items`.
- Add edit proposal route.
- Add accepted/declined status actions.
- Upgrade-gate proposal UI fully through `FeatureGate`.

### Payment Tracking

Completed in backend/data model:

- `payments` table
- Payment RLS policies
- Payment creation API function in frontend service
- Payment deletion API function in frontend service
- Auto-mark invoice paid when recorded payments reach invoice total
- Pro-only database trigger for payments

Still needed:

- Payment form UI on invoice detail
- Payment history UI on invoice detail
- Payment analytics display

### Analytics

Completed from MVP:

- Dashboard shows total paid revenue, pending invoices, paid invoices, client count, and recent invoices using real Supabase data.

Still needed:

- Monthly revenue chart/table
- Overdue invoice count card
- Best clients calculation
- Pro-gated analytics page or dashboard section

### Paddle Subscription System

Completed:

- `subscriptions` table
- Subscription RLS read policy
- Frontend plan definitions
- Frontend entitlement hook
- Upgrade modal
- Paddle checkout API route
- Paddle portal API route
- Paddle webhook API route
- Paddle webhook signature verification
- Service-role subscription upsert path
- Settings page upgrade buttons
- Settings page customer portal button

Still needed:

- Verify Paddle API request payloads against the exact Paddle account/version in use.
- Test sandbox checkout end-to-end.
- Test webhook event payloads from Paddle sandbox.
- Add webhook event logging table if operational auditability is required.
- Add cancellation downgrade behavior verification.
- Add plan upgrade/downgrade UI states after webhook confirmation.

## Current Database Schema

Current SQL files:

- `supabase/schema.sql`
- `supabase/policies.sql`

Tables:

- `profiles`
- `clients`
- `invoices`
- `invoice_items`
- `payments`
- `proposals`
- `proposal_items`
- `subscriptions`

Storage:

- `logos` bucket

Security:

- RLS enabled for all application tables.
- Owner-only policies for user-owned data.
- Invoice item access derived from parent invoice ownership.
- Proposal item access derived from parent proposal ownership.
- Payment insert requires ownership of parent invoice.
- Subscription rows are readable by owner but not mutable from frontend.
- Logo storage policies restrict upload/update/delete to the authenticated user folder.

Database triggers:

- `set_updated_at`
- `handle_new_user`
- `enforce_client_limit`
- `enforce_invoice_limit`
- `enforce_pro_feature`

## Environment Variables Required

### Frontend / Vite

Required in local `frontend/.env.local` and Vercel:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Vercel Serverless API

Required in Vercel project environment:

```bash
APP_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PADDLE_ENV=sandbox
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
PADDLE_PRICE_PRO_MONTHLY=
PADDLE_PRICE_PRO_YEARLY=
```

For production:

```bash
PADDLE_ENV=production
APP_URL=https://your-production-domain.com
```

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `PADDLE_API_KEY`, or `PADDLE_WEBHOOK_SECRET` to the browser.

## Current Known Bugs / Risks

1. The latest changes have not been build-verified.
   - The project built successfully before the latest expansion.
   - After adding Paddle APIs, new pages, settings changes, database changes, and invoice updates, `npm install` and `npm run build` must be rerun.

2. `vercel.json` may need adjustment for the new root `package.json`.
   - Current Vercel config was originally optimized for `frontend`.
   - New serverless API dependencies exist at project root.
   - Root install must include root dependencies and frontend dependencies.

3. Paddle API payloads need sandbox validation.
   - The API routes are implemented for Paddle Billing-style APIs, but real Paddle accounts can differ in API shape and enabled features.
   - Checkout, portal, and webhook payloads must be tested in Paddle sandbox.

4. Settings page uses `FeatureGate` inside a form.
   - This should be build-tested and UX-tested.
   - It may trigger nested layout issues on small screens.

5. Root `package-lock.json` exists outside `emberflow`.
   - There is an unrelated `package-lock.json` at `/Users/mahmoodahmad/Documents/EMBER_INV/package-lock.json`.
   - It should be reviewed and removed only if confirmed unnecessary by the project owner.

6. `.DS_Store` exists in workspace root.
   - It is untracked.
   - It should not be committed.

## Exact Next Steps

### 1. Test Supabase SQL on a real project

In Supabase SQL Editor:

1. Run `supabase/schema.sql`
2. Run `supabase/policies.sql`
3. Confirm tables exist
4. Confirm triggers exist
5. Confirm RLS is enabled
6. Confirm `logos` bucket exists
7. Create a test user
8. Confirm profile and free subscription are auto-created

### 2. Test Paddle sandbox end to end

In Paddle sandbox:

1. Create Pro Monthly price
2. Create Pro Yearly price
3. Set environment variables
4. Configure webhook endpoint:

```text
https://your-vercel-domain.com/api/paddle/webhook
```

5. Subscribe through `/app/settings`
6. Confirm Paddle redirects back
7. Confirm webhook updates `public.subscriptions`
8. Confirm Pro features unlock only after database subscription state changes

### 3. Run security checks after every dependency change

Run:

```bash
npm audit --omit=dev
npm --prefix frontend audit --omit=dev
```

Fix production dependency vulnerabilities.

### 4. Final launch QA

Manually verify:

- Register
- Email verification
- Login
- Forgot password
- Reset password
- Logout
- Add 10 free clients, verify 11th is blocked
- Add 5 free invoices in current month, verify 6th is blocked
- Upgrade to Pro through Paddle sandbox
- Verify unlimited client/invoice creation after webhook
- Create proposal as Pro
- Record payment as Pro
- Export invoice PDF
- Upload logo
- Deploy to Vercel

## Final Build Status

Build command:

```bash
cd emberflow
npm run build
```

Current build status:

```text
Build succeeded from the emberflow root.
Root production audit: 0 vulnerabilities.
Frontend production audit: 0 vulnerabilities.
```

The immediate next engineering action is to test Supabase migrations and Paddle sandbox events against real external services.
