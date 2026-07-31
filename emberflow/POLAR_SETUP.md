# Polar Billing Setup

EmberFlow bills Pro subscriptions through [**Polar**](https://polar.sh), a Merchant of Record (MoR). Polar hosts the checkout, charges the card, remits sales tax/VAT on your behalf, and runs the customer billing portal. EmberFlow never sees or stores card data — it only reads subscription **state** (plan + status), which is written to your database exclusively by Polar's signed webhook.

This guide takes you from a fresh Polar account to a working Pro upgrade flow, in **sandbox first**, then production.

> Billing is optional. With no `POLAR_*` variables set, every account stays on the Free tier and the rest of EmberFlow works normally.

---

## How it fits together

```
/app/subscriptions "Upgrade"  ──POST /api/polar/checkout──▶  Polar  ──hosted checkout──▶  card charged
        ▲                                                                                     │
        │        switch / cancel: POST /api/polar/{switch,cancel} ──PATCH /v1/subscriptions──▶│
        │                                                                     subscription.* webhook
        │                                                                                     ▼
   reads subscriptions row  ◀──── /api/polar/webhook  (verify signature → upsert subscriptions)
```

| Piece | File |
|---|---|
| Create checkout session | `api/polar/checkout.js` → `POST /v1/checkouts/` |
| Switch plan (Monthly↔Yearly, in place) | `api/polar/switch.js` → `PATCH /v1/subscriptions/{id}` (`product_id` + `proration_behavior`) |
| Cancel / resume (in-app) | `api/polar/cancel.js` → `PATCH /v1/subscriptions/{id}` (`cancel_at_period_end`) |
| Open customer portal (card + invoices only) | `api/polar/portal.js` → `POST /v1/customer-sessions/` |
| Receive lifecycle events | `api/polar/webhook.js` → verifies + upserts `subscriptions` |
| Shared client + verification | `api/_utils/polar.js` |
| Plan catalog (data + server projection) | `frontend/src/config/plans.js`, `api/_utils/planCatalog.js` |
| Frontend calls | `frontend/src/services/subscriptions.js` |
| Entitlements (provider-agnostic) | `frontend/src/utils/plans.js`, `hooks/useSubscription.js` |

The Supabase `user.id` is passed to Polar as `external_customer_id` at checkout and comes back on every webhook as `customer.external_id`, which is how the webhook knows whose subscription changed — no customer pre-creation needed.

---

## Prerequisites

- A deployed EmberFlow (Vercel) **or** `vercel dev` locally — webhooks need a publicly reachable URL, so `npm run dev` (Vite only, no API routes) is **not** enough to test billing end to end.
- Supabase database with migrations applied through `007_polar_billing.sql` (adds the `polar_*` columns). See [README](./README.md) → Database Setup.
- Upstash Redis configured (rate-limits the billing routes; optional but recommended).

---

## 1. Create a Polar account

1. Sign up at **https://polar.sh** (production) and **https://sandbox.polar.sh** (sandbox — a fully separate environment with test payments). Do everything below in **sandbox** first.
2. Create an **Organization**. Note its name/slug.

## 2. Create the two Pro products (sandbox)

In the sandbox dashboard → **Products** → **New Product**, create two **recurring** products:

| Product | Billing | Price |
|---|---|---|
| EmberFlow Pro — Monthly | Monthly | $11.00 |
| EmberFlow Pro — Yearly | Yearly | $130.00 |

These prices must match what `frontend/src/utils/plans.js` advertises — that file is the source of truth for what the app *displays*, but Polar's product price is the source of truth for what actually gets charged. If you change pricing, update both, and update the live product price in the Polar dashboard too (`plans.js` cannot change what Polar charges).

For each product, open the "**⋯**" menu → **Copy Product ID**. You'll set these as `POLAR_PRODUCT_PRO_MONTHLY` and `POLAR_PRODUCT_PRO_YEARLY`. Polar checkout is created from **product** ids (not price ids).

## 3. Create an Organization Access Token

Dashboard → **Settings → Developers → Organization Access Tokens** → **Create**.

- Give it a name (e.g. `emberflow-server`).
- Grant it the scopes the integration uses: **checkouts (write)**, **customer_sessions (write)**, **subscriptions (write)** — required for in-app plan switch + cancel/resume, added 2026-07-31 — and **customers / products (read)**. When in doubt, granting the full set is fine — this token is server-side only. **A token created before 2026-07-31 will lack `subscriptions (write)` and must be regenerated**, or switch/cancel will 403.
- Copy the token (shown once) → `POLAR_ACCESS_TOKEN`.

This token is read only by the `api/` serverless functions. **Never** put it in `frontend/.env.local` or any `VITE_*` variable — that would ship it to the browser.

## 4. Configure the webhook endpoint

Dashboard → **Settings → Webhooks → Add Endpoint**.

- **URL:** `https://<your-domain>/api/polar/webhook` (e.g. `https://embersys.vercel.app/api/polar/webhook`).
- **Format:** **Raw** (Polar's standard payload — *not* the Slack/Discord formatters).
- **Events:** at minimum select all of:
  - `subscription.created`
  - `subscription.active`
  - `subscription.updated`
  - `subscription.canceled`
  - `subscription.uncanceled`
  - `subscription.revoked`
- Save, then copy the endpoint's **Signing Secret** → `POLAR_WEBHOOK_SECRET`.

The handler verifies this secret on every delivery (Standard Webhooks HMAC) and returns `403` if it doesn't match, so the secret must be exact.

## 5. Set environment variables

All five are **backend** variables (no `VITE_` prefix) read only by `api/`.

| Variable | Value |
|---|---|
| `POLAR_SERVER` | `sandbox` now, `production` later |
| `POLAR_ACCESS_TOKEN` | Organization access token from step 3 |
| `POLAR_WEBHOOK_SECRET` | Webhook signing secret from step 4 |
| `POLAR_PRODUCT_PRO_MONTHLY` | Monthly product id from step 2 |
| `POLAR_PRODUCT_PRO_YEARLY` | Yearly product id from step 2 |

- **On Vercel:** Project → **Settings → Environment Variables**. Add all five (plus the existing `APP_URL`, `SUPABASE_*`, `UPSTASH_*`). Redeploy so they take effect.
- **Locally with `vercel dev`:** put them in `emberflow/.env` (git-ignored). `vercel dev` runs both the Vite app and the `api/` functions and reads that file. (`vercel env pull` can populate it from the linked project.)

See `.env.example` for the annotated list.

## 6. Apply the database migration

Run `supabase/migrations/007_polar_billing.sql` in the Supabase SQL Editor (additive, `IF NOT EXISTS`, safe to re-run). It adds `polar_customer_id`, `polar_subscription_id`, `polar_product_id` and their lookup indexes to `subscriptions`.

---

## Testing guide (sandbox)

1. **Logic checks (no account needed):** from `emberflow/`, run `npm run verify:polar`. This exercises plan↔product mapping, status-aware subscription normalization, the frontend/backend plan-catalog drift guard, and Standard Webhooks signature verification (valid + tampered signature/body + stale timestamp). Expect `33 passed, 0 failed`.
2. **End-to-end** (needs a public URL — use a Vercel preview deploy or `vercel dev` behind a tunnel so Polar can reach the webhook):
   1. Sign in to EmberFlow → **Subscriptions** (`/app/subscriptions`).
   2. Click **Upgrade to Monthly**. You should land on Polar's hosted sandbox checkout. *(Also test the pricing entry point: from `/pricing` click "Start yearly" while logged out → register/sign in → checkout should open automatically for Yearly, no second pick.)*
   3. Pay with a sandbox test card (Polar sandbox accepts Stripe test cards, e.g. `4242 4242 4242 4242`, any future expiry/CVC).
   4. You're redirected to `/app/subscriptions?billing=success`. The activation "Welcome to Pro" moment plays while the `subscription.active` webhook lands, the `subscriptions` row updates, Pro features unlock, and **Manage billing** / **View all invoices** appear.
   5. **Switch plan (in-app):** click **Switch to Yearly** → confirm → the row's `plan`/`polar_product_id` update via `subscription.updated`, still **one** subscription in the Polar dashboard (an in-place update, not a new subscription).
   6. **Cancel (in-app):** danger zone → **Cancel subscription** → confirm → `cancel_at_period_end = true`, `status` stays `active` (you keep Pro until period end). **Resume subscription** flips it back to `false`. When the period finally ends, `subscription.revoked` flips the row to Free.
   7. **Portal (cards + invoices only):** click **Manage billing** / **View all invoices** → Polar portal opens for card update + receipts.
3. **Inspect deliveries:** Polar Dashboard → Webhooks → your endpoint shows each delivery, its payload, and the HTTP response. A healthy delivery returns `200`. `403` means a signature mismatch (see Troubleshooting).

For the full pre-Live checklist — duplicate purchases, in-app switch/cancel/resume, failed payments, webhook replay, expired/deleted subscriptions, and the non-billing areas — see **`LAUNCH_QA.md`** at the repo root (the exhaustive gate before switching Polar to Live). `BILLING_QA_CHECKLIST.md` is the older billing-audit record and is superseded by `LAUNCH_QA.md`.

---

## Going to production

1. Repeat steps 1–4 in the **production** dashboard (https://polar.sh): create the two products, an access token, and a webhook endpoint pointing at your production URL.
2. In Vercel, set `POLAR_SERVER=production` and swap in the **production** access token, webhook secret, and product ids.
3. Redeploy. Do one real (small) live purchase and confirm the webhook + unlock, then refund it from the Polar dashboard if desired.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Webhook deliveries return **403** | `POLAR_WEBHOOK_SECRET` doesn't match the endpoint's signing secret, or the endpoint **Format** isn't **Raw**. Sandbox and production endpoints each have their own distinct secret — make sure you copied the one for the environment that's actually delivering. Check Vercel's function logs for the `Polar webhook signature verification failed` line: it names the exact cause (`Missing required headers`, `Message timestamp too old/new`, or `No matching signature found`) plus a `sha256Prefix` fingerprint of the currently-configured secret — `sha256(<trimmed secret from the dashboard>)`'s first 12 hex chars should match it; if not, the deployed value is wrong or a Vercel redeploy hasn't happened since it was last changed (env var edits don't apply to already-running deployments). Also confirm the endpoint **Format** is **Raw**. |
| Checkout route returns **400** | Wrong `POLAR_PRODUCT_*` id, or `POLAR_SERVER` doesn't match where the product lives (sandbox id with `POLAR_SERVER=production` or vice-versa). Product ids are environment-specific. |
| **Switch / cancel** route returns `Couldn't switch/cancel …` with a Polar **403** | The org access token is missing the **subscriptions (write)** scope (added to the integration 2026-07-31). Regenerate the token with that scope in Polar dashboard → Developers and update `POLAR_ACCESS_TOKEN`. A `409` from switch/cancel is expected and benign — the user has no active paid subscription to change (or is already on that plan). |
| `Missing POLAR_ACCESS_TOKEN` / `Missing POLAR_PRODUCT_...` | Env var not set in the environment actually running the function (Vercel env vs. local `.env`). Redeploy after adding on Vercel. |
| Payment succeeds but Pro never unlocks | Webhook not configured, wrong URL, or the `subscription.*` events aren't selected on the endpoint. Check the endpoint's delivery log in the Polar dashboard. |
| **Manage billing** button never appears | The `subscriptions` row has no `polar_customer_id` yet — it's written by the first `subscription.*` webhook. Confirm the webhook delivered `200`. |
| `429 Too many requests` on billing routes | Upstash rate limit (5/min for checkout & portal). Wait a minute; confirm `UPSTASH_REDIS_REST_URL`/`TOKEN`. |
| Portal route errors for a user who *has* subscribed successfully | `api/polar/portal.js` now returns the real Polar error text directly (not sanitized) and tries both `polar_customer_id` and `external_customer_id` before giving up — check Vercel's function logs for the `Polar portal: customer session lookup via ... failed` line. Two known causes: (1) the org access token's scopes don't include **customer_sessions (write)** (see the scopes list above — a token created before the portal was added may only have checkouts/customers scopes); (2) the stored `polar_customer_id` was captured under a different `POLAR_SERVER` environment than the one now configured (a sandbox customer id 404s against the production API and vice versa) — the `external_customer_id` fallback recovers from this automatically, so if *both* attempts fail identically, that points at (1), not (2). |
| Portal route errors for a user who has *never* subscribed | Expected — no Polar customer exists yet for them under either lookup. The UI only shows the portal button once a customer exists. |

---

## Decommissioning Paddle (deferred — do only after Polar is verified live)

The migration intentionally left Paddle's data columns and Vercel secrets in place so a rollback needs no data restore. **After** a successful production purchase through Polar, clean them up as a separate, explicit step:

1. **Drop the legacy columns** (destructive — take a backup first) via a new migration, e.g. `008_drop_paddle_columns.sql`:
   ```sql
   begin;
   alter table public.subscriptions drop column if exists paddle_customer_id;
   alter table public.subscriptions drop column if exists paddle_subscription_id;
   alter table public.subscriptions drop column if exists paddle_price_id;
   alter table public.subscriptions drop column if exists paddle_product_id;
   commit;
   ```
2. **Remove the `PADDLE_*` environment variables** from Vercel (`PADDLE_ENV`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_PRICE_PRO_MONTHLY`, `PADDLE_PRICE_PRO_YEARLY`).
3. **Delete the Paddle webhook endpoint** in the Paddle dashboard.

The Paddle route/util code was already removed in the migration's cleanup phase; these three items are the only Paddle remnants left, and they're deliberately manual.
