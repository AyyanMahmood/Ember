# EmberFlow

EmberFlow is a production-ready MVP SaaS for freelancers to manage clients, invoices, proposals, and payments. It uses React, Vite, Supabase Auth, PostgreSQL with row-level security, and PDF export with jsPDF.

## Features

- Supabase email/password authentication with persistent sessions
- Protected dashboard routes
- Live dashboard metrics from Supabase data
- Client create, read, update, delete, and detail views
- Invoice create, read, update, delete, itemized totals, tax, statuses, and mark-paid workflow
- Professional invoice PDF export
- Proposal templates, saved proposals, and proposal PDF export
- Settings for name, business name, email, invoice color, and invoice footer
- Responsive Linear/Notion-inspired UI
- Vercel-compatible deployment configuration
- Paddle subscription checkout, customer portal, and webhook API routes
- Free and Pro entitlement checks backed by database subscription state

## Project Structure

```text
emberflow/
  frontend/
    src/
      components/
      pages/
      services/
      utils/
      hooks/
      assets/
  supabase/
    schema.sql
    policies.sql
  README.md
  .env.example
  vercel.json
```

## Local Installation

```bash
cd emberflow
npm install
npm --prefix frontend install
cp .env.example frontend/.env.local
npm --prefix frontend run dev
```

Update `frontend/.env.local` with your Supabase project URL and anon key:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

For Vercel API routes, configure these variables in Vercel:

```bash
APP_URL=https://your-production-domain.com
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PADDLE_ENV=production
PADDLE_API_KEY=your-paddle-api-key
PADDLE_WEBHOOK_SECRET=your-webhook-secret
PADDLE_PRICE_PRO_MONTHLY=pri_your_monthly_price_id
PADDLE_PRICE_PRO_YEARLY=pri_your_yearly_price_id
```

## Supabase Setup

1. Create a free Supabase project.
2. In Supabase, open **SQL Editor**.
3. Run `supabase/schema.sql`.
4. Run `supabase/policies.sql`.
5. In **Authentication > Providers**, keep Email enabled.
6. In **Project Settings > API**, copy the project URL and anon public key into your Vite environment variables.

The schema creates:

- `profiles`
- `clients`
- `invoices`
- `invoice_items`
- `payments`
- `proposals`
- `proposal_items`
- `subscriptions`

All tables have row-level security enabled by `policies.sql`. Users can only access rows owned by their authenticated Supabase user ID. Invoice and proposal item access is derived from ownership of the parent record. Subscription rows are readable by users but are only mutated by server-side Paddle webhook handling.

## Paddle Setup

1. Create Paddle sandbox products/prices for Pro Monthly and Pro Yearly.
2. Add the price IDs to `PADDLE_PRICE_PRO_MONTHLY` and `PADDLE_PRICE_PRO_YEARLY`.
3. Add your Paddle API key and webhook secret to Vercel.
4. Configure the webhook endpoint:

```text
https://your-production-domain.com/api/paddle/webhook
```

5. Subscribe from `/app/settings`.
6. Confirm the webhook updates `public.subscriptions`.

## Local Development

```bash
cd emberflow
npm run dev
```

Open the Vite URL shown in your terminal. Create an account, add a client, create an invoice, and export a PDF.

## Production Build

```bash
cd emberflow
npm run build
npm run preview
```

## Vercel Deployment

1. Push this repository to GitHub.
2. Create a new Vercel project.
3. Set the Vercel project root to `emberflow`.
4. Add these environment variables in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy.

The included `vercel.json` installs and builds the Vite app from `frontend/`, serves `frontend/dist`, and rewrites client-side routes to `index.html`.

## Security Notes

- Only the Supabase anon key is used in the browser.
- No service role key is present or required.
- RLS policies restrict all user-owned data.
- Invoice insert/update policies verify that the selected client belongs to the current user.
- PDF generation runs locally in the browser and does not send invoice or proposal content to third-party APIs.
