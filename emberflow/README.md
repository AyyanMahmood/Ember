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
cd emberflow/frontend
npm install
cp ../.env.example .env.local
npm run dev
```

Update `frontend/.env.local` with your Supabase project URL and anon key:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
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
- `proposals`

All tables have row-level security enabled by `policies.sql`. Users can only access rows owned by their authenticated Supabase user ID. Invoice item access is derived from ownership of the parent invoice.

## Local Development

```bash
cd emberflow/frontend
npm run dev
```

Open the Vite URL shown in your terminal. Create an account, add a client, create an invoice, and export a PDF.

## Production Build

```bash
cd emberflow/frontend
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
