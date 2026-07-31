# EmberFlow

EmberFlow is a finance operating system for freelancers and small agencies — clients, invoices, proposals, payments, and analytics in one workspace, built with React, Vite, Supabase (Postgres + Auth + Storage), and Polar for subscription billing.

This README covers everything needed to install, configure, and deploy EmberFlow from a clean checkout. For the full Google OAuth walkthrough, see [`OAUTH_SETUP.md`](./OAUTH_SETUP.md); for Pro subscription billing, see [`POLAR_SETUP.md`](./POLAR_SETUP.md).

## Features

- **Clients** — profiles, contact details, notes, billing history
- **Invoices** — itemized line items, tax, discounts, status tracking (draft/sent/paid/overdue), mark-paid workflow, PDF export
- **Proposals** — template-driven scope/pricing/timeline documents with PDF export
- **Payments** — manual payment records reconciled against invoice balances (Pro)
- **Analytics** — revenue totals, monthly collections, overdue tracking, top-client rankings (Pro)
- **Templates** — 17 invoice/proposal document designs (3 free, 14 Pro)
- **Brand Studio** — Pro-only logo, color, and font branding applied consistently across generated documents
- **Authentication** — email/password with password reset and email verification; Google OAuth (production-verified — see `OAUTH_SETUP.md`)
- **Settings** — profile, business info, invoice branding, in-app password change, subscription management
- **Subscriptions** — Free and Pro tiers via Polar checkout, customer portal, and webhook-driven entitlements
- Row-level security on every table — all data access is scoped to the authenticated user in Postgres itself, not just in application code
- PDF generation runs entirely in the browser (jsPDF + html2canvas) — no invoice/proposal content is sent to a third-party document service

## Requirements

- Node.js >= 18.13.0 and npm
- A [Supabase](https://supabase.com) project (the free tier is sufficient)
- A [Polar](https://polar.sh) account — only required if you want to enable Pro subscription billing; the rest of the app works without it. See [`POLAR_SETUP.md`](./POLAR_SETUP.md)
- An [Upstash](https://upstash.com) Redis database — recommended for rate-limiting the `/api/polar/*` routes in production; the app still functions without it (the rate limiter fails open if Redis is unreachable)
- A Google Cloud project — only required if you want the "Continue with Google" button to work; see `OAUTH_SETUP.md`

## Project Structure

```text
emberflow/
  frontend/            React SPA (Vite)
    src/
      components/       Shared UI components
      pages/             Route-level pages
      services/          Supabase/API clients
      hooks/              useAuth, useProfile, useSubscription, etc.
      utils/               Formatting, invoice math, PDF export
      document-studio/     Invoice/proposal template rendering
      data/                 Static reference data (countries, currencies, company info)
  api/                 Vercel serverless functions (Polar checkout/portal/webhook)
  supabase/            Database schema, RLS policies, migrations
  .env.example
  vercel.json
  OAUTH_SETUP.md
```

> **Note:** if you cloned this as part of a larger folder structure, make sure you're inside the `emberflow/` directory before running any of the commands below — `vercel.json`, `package.json`, and every path referenced in this guide are relative to it.

## Installation

```bash
cd emberflow
npm install
npm --prefix frontend install
```

Copy the environment template and fill in your own values (see **Environment Variables** below):

```bash
cp .env.example frontend/.env.local
```

Run the dev server:

```bash
npm run dev
```

Open the URL Vite prints in your terminal.

## Environment Variables

`.env.example` at the repo root documents every variable EmberFlow uses, with comments explaining what each one does, where to obtain it, and whether it's required. In short:

- **Frontend** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`) go in `frontend/.env.local` for local development.
- **Backend** (`APP_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `POLAR_*`, `UPSTASH_*`) are read only by the `api/` serverless functions and are configured in your Vercel project's Environment Variables settings — they are never bundled into the browser build.

Read `.env.example` directly for the full, authoritative list.

## Database Setup

EmberFlow's schema is split across a base schema/policy dump plus incremental migrations. **Both steps are required** — running only the base schema will leave your database missing columns and features added after the initial dump (invoice templates, Brand Studio, and the storage bucket it depends on).

In the Supabase Dashboard, open **SQL Editor** and run these files **in this exact order**:

1. `supabase/schema.sql` — creates the base tables: `profiles`, `clients`, `invoices`, `invoice_items`, `payments`, `proposals`, `proposal_items`, `subscriptions`.
2. `supabase/policies.sql` — enables row-level security on every table above (users can only access rows they own; invoice/proposal item access is derived from ownership of the parent record; subscription rows are read-only to users and mutated only by the server-side Polar webhook handler) and sets up the `avatars`/`logos` storage bucket policies.
3. Every file in `supabase/migrations/`, **in numeric order** (`001_production_fixes.sql` through `008_fix_brand_accent_null_check.sql`). Each migration is additive and idempotent (safe to run more than once), and together they add:
   - `001` — payment/subscription columns and RLS policies missing from the initial dump, plus a `webhook_events` table the Polar webhook handler uses for idempotency
   - `002` — the `invoices.template` column (invoice template selection won't persist without this)
   - `003` — Brand Studio's `brand_font`/`brand_accent_color` columns and the trigger that enforces they're Pro-only
   - `004` — creates the `logos` storage bucket (see **Storage Buckets** below)
   - `005` — expands the allowed `brand_font` values
   - `006` — allows Free-tier users to set a brand color (only logo/font/accent stay Pro-only)
   - `007` — adds the `polar_customer_id`/`polar_subscription_id`/`polar_product_id` columns the Polar billing integration writes (see [`POLAR_SETUP.md`](./POLAR_SETUP.md))
   - `008` — fixes a trigger bug where saving just a brand color (no accent override) was misdetected as a Pro-gated change and rejected for Free-tier users

In **Authentication > Providers**, keep **Email** enabled. If you want Google sign-in, follow `OAUTH_SETUP.md` before testing that button.

## Storage Buckets

EmberFlow uses two Supabase Storage buckets. `supabase/policies.sql` already contains the RLS policies for both, but the buckets themselves must exist first.

### `logos`
Created automatically by `supabase/migrations/004_logos_bucket.sql` (see **Database Setup** above) — no manual step needed. Configuration:
- **Public:** yes (read-only access to anyone with the file URL; write access is RLS-restricted to the owning user)
- **File size limit:** 2 MB
- **Allowed MIME types:** `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`

### `avatars`
Not created by any SQL file — `policies.sql`'s RLS policies assume it already exists, so you must create it manually:

1. Supabase Dashboard > **Storage** > **New bucket**
2. Name: `avatars` (must match exactly — the RLS policies in `policies.sql` reference this bucket by name)
3. Public bucket: **on**
4. Recommended: restrict allowed MIME types to `image/png`, `image/jpeg`, `image/webp` (matching what the Settings page's file picker accepts) and set a reasonable file size limit — the app does not enforce a specific size limit for avatars client-side, unlike logos

Both buckets' RLS policies require uploaded files to be stored under a path beginning with the uploading user's own ID (e.g. `<user-id>/filename.png`) — this is handled automatically by the app's upload code; you don't need to do anything extra for it.

## Google OAuth

See [`OAUTH_SETUP.md`](./OAUTH_SETUP.md) for the complete walkthrough — Google Cloud Console, Supabase provider configuration, redirect URLs for local development vs. production vs. custom domains, how the PKCE flow works in this app, and common mistakes.

Email/password authentication works with zero additional configuration.

## Subscription Billing (Polar)

Pro subscriptions are handled by [Polar](https://polar.sh), a Merchant of Record that hosts checkout, remits sales tax/VAT, and runs the customer billing portal — EmberFlow never touches card data. See [`POLAR_SETUP.md`](./POLAR_SETUP.md) for the complete walkthrough: creating products, the organization access token, the webhook endpoint and signing secret, environment variables, sandbox testing, and going to production.

Billing is entirely optional — with no `POLAR_*` variables configured, every account stays on the Free tier and the rest of the app works normally.

## Vercel Deployment

1. Push this repository to GitHub (or GitLab/Bitbucket).
2. Create a new Vercel project from it.
3. Set the Vercel project's **Root Directory** to `emberflow` (only relevant if your repository has this folder nested under something else — if `emberflow/` is already the repo root, leave this as the default).
4. Add the backend environment variables from `.env.example` in the Vercel project's **Environment Variables** settings: `APP_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and (if using Pro billing) the `POLAR_*` variables and `UPSTASH_*` variables.
5. Deploy.

`vercel.json` (inside `emberflow/`) installs and builds the Vite app from `frontend/`, serves `frontend/dist`, and rewrites all non-`/api/*` paths to `index.html` so client-side routing works on refresh and direct navigation.

## Production Build (local)

```bash
cd emberflow
npm run build
npm run preview
```

## Security Notes

- Only the Supabase anon key is used in the browser — the service role key is never exposed to the client.
- Row-level security restricts every table to rows owned by the authenticated user.
- Invoice insert/update policies verify the selected client belongs to the current user.
- PDF generation runs locally in the browser; invoice/proposal content is never sent to a third-party document API.
- The Polar webhook handler verifies the Standard Webhooks signature (via the `standardwebhooks` library) on every request before trusting the payload, and uses a `webhook_events` table to prevent duplicate processing.

## Troubleshooting

**"Bucket not found" when uploading a logo or avatar**
The `logos`/`avatars` bucket doesn't exist yet in your Supabase project. See **Storage Buckets** above — `logos` requires running migration `004`, `avatars` must be created manually.

**Invoice template selection doesn't persist / Brand Studio fields don't save**
You're likely missing migrations. Re-check **Database Setup** — `002` adds the `invoices.template` column, `003` adds Brand Studio's columns. Migrations are additive and safe to re-run if you're not sure which ones already applied.

**Free-tier Brand Studio save fails with "Pro subscription required for brand customization"**
You're missing migration `008`. Without it, saving just a brand color (the one Brand Studio field Free users are meant to be able to edit) can be misdetected as a Pro-gated change and rejected, even though nothing Pro-only was touched.

**Google sign-in redirects to an error page, or back to the login page with "Sign-in was cancelled or failed"**
Almost always a redirect URL mismatch between what the app requests and what's allow-listed in your Supabase Dashboard (Authentication > URL Configuration > Redirect URLs). See `OAUTH_SETUP.md`'s **Common Mistakes** and **Troubleshooting** sections — this is the single most common OAuth setup issue.

**OAuth works locally but not on your deployed Vercel URL (or vice versa)**
Each environment's exact origin needs its own entry (or a wildcard) in Supabase's Redirect URLs allow-list. Local and production are separate origins as far as Supabase is concerned. See `OAUTH_SETUP.md`.

**API routes return CORS errors in production**
`APP_URL` is unset or doesn't match your actual deployed frontend URL — `api/_utils/http.js` fails closed (omits the CORS header entirely) rather than allowing all origins when `APP_URL` is missing in production. Set it in Vercel's environment variables to your real deployed URL.

**Polar checkout/portal/webhook routes return errors, or Pro upgrades don't unlock features**
Confirm `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_PRODUCT_PRO_MONTHLY`, and `POLAR_PRODUCT_PRO_YEARLY` are set and correct, that your webhook endpoint (`https://your-domain.com/api/polar/webhook`) is configured in the Polar dashboard, and that `POLAR_SERVER` matches whether you're using sandbox or production Polar credentials. Rate-limit errors on these routes (`429 Too many requests`) mean `UPSTASH_REDIS_REST_URL`/`TOKEN` are missing or incorrect. See [`POLAR_SETUP.md`](./POLAR_SETUP.md) → Troubleshooting.

**Build fails or the app won't start locally**
Confirm you're running Node >= 18.13.0 and that you ran `npm install` in both the repo root and `frontend/` (`npm --prefix frontend install`) — this is a two-package-manifest project.

## FAQ

**Do I need Polar to run EmberFlow?**
No. Client management, invoices, proposals, and PDF export all work without it. Polar is only needed if you want to sell Pro subscriptions; without it configured, every account simply stays on the Free tier's limits.

**Do I need to configure Google OAuth?**
No — email/password authentication works out of the box. The "Continue with Google" button is visible in the UI regardless, so if you don't plan to configure it, be aware clicking that button will fail until you either configure it (`OAUTH_SETUP.md`) or remove the button.

**Why do I need to run both `schema.sql` and a `migrations/` folder — why isn't there just one file?**
`schema.sql`/`policies.sql` are a point-in-time dump from early in the project; `migrations/` contains everything added afterward. Both are required for a fully working, current database — see **Database Setup**.

**Can I use a different payment provider instead of Polar?**
Not without code changes — the `/api/polar/*` routes, webhook handling, and Settings page's billing UI are Polar-specific. The provider does live behind a small, isolated surface, though (three routes, one util, one frontend service, the `POLAR_*` env vars, and the `polar_*` columns) — see `POLAR_MIGRATION_PLAN.md` for exactly where that boundary is drawn.

**Is there a test suite?**
No automated test suite is included. Verify functionality manually after setup: sign in, create a client, create an invoice, and export a PDF.

**Where do I change my company's support email, legal name, or address on the Terms/Privacy/Refund/Contact pages?**
`frontend/src/data/company.js` — a single file with `name`, `supportEmail`, and `address`, referenced by all four pages.
