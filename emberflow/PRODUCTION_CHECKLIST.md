# EmberFlow Production Checklist

Pre-flight for going live. Work top to bottom; nothing here is optional for a real-money launch. Companion docs: `LAUNCH_BLOCKERS.md` (the hard gates), `POLAR_SETUP.md` (detailed Polar setup), `BILLING_QA_CHECKLIST.md` (the test script), `SUPPORT_PLAYBOOK.md` (post-launch ops).

Legend: ☐ to do · each item says **who/where** since none of this is code.

---

## 1. Database (Supabase, production project)

- ☐ All migrations `001`–`007` confirmed applied by **direct column/table inspection** (not `supabase migration list`, which is unreliable here). Specifically verify:
  - `subscriptions` has `plan`, `status`, `billing_cycle`, `current_period_start/end`, `cancel_at_period_end`, `trial_ends_at`, and the three `polar_*` columns (migration 007).
  - `subscriptions_user_id_unique` index exists (the webhook upsert depends on it).
  - `webhook_events` table exists (idempotency).
  - `invoices.template` column exists (migration 002 — historically found missing in prod).
- ☐ RLS enabled on `subscriptions` with the owner-only `select` policy and **no** client insert/update/delete policy (writes are service-role webhook only).
- ☐ Confirm the `logos` and `avatars` storage buckets exist with their policies.

## 2. Billing (Polar, production org)

- ☐ Two **recurring** products at **$11.00/month** and **$130.00/year** (must match `frontend/src/utils/plans.js`).
- ☐ Organization Access Token created with scopes: **checkouts (write)**, **customer_sessions (write)**, **customers/products (read)**.
- ☐ Webhook endpoint at `https://<prod-domain>/api/polar/webhook`, **Raw** format, subscribed to `subscription.created/active/updated/canceled/uncanceled/revoked`.
- ☐ **Grace period = 21 days** (Settings → Subscriptions) — satisfies the 15-day access policy.
- ☐ Dunning emails enabled (Polar default) so customers are notified on failed charges.

## 3. Environment variables (Vercel, Production scope)

- ☐ `POLAR_SERVER=production`
- ☐ `POLAR_ACCESS_TOKEN` = production token (from step 2)
- ☐ `POLAR_WEBHOOK_SECRET` = production endpoint's signing secret (copy exactly, no trailing whitespace — the code trims, but be clean)
- ☐ `POLAR_PRODUCT_PRO_MONTHLY` / `POLAR_PRODUCT_PRO_YEARLY` = **production** product ids
- ☐ **No** `POLAR_ENVIRONMENT` var (the code accepts it as a fallback but warns loudly — use the canonical `POLAR_SERVER`)
- ☐ `APP_URL` = the real production domain (drives CORS fail-closed, checkout `success_url`, portal `return_url`)
- ☐ `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (service role — server-side only, never `VITE_`)
- ☐ `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (browser client)
- ☐ `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (rate limiting; billing routes fail *open* if Redis is down, so not launch-blocking, but should be set)
- ☐ Redeploy after any env change (Vercel env edits don't apply to already-running deployments).

> **Critical wiring note (from the production audit):** entitlement is derived from the product id. If `POLAR_PRODUCT_PRO_*` don't exactly match the ids of the products the live webhooks reference, `planFromProduct()` returns `free` and **active, paying subscribers silently derive to Free**. Double-check these two values against the production product ids specifically.

## 4. Auth (Supabase + Google Cloud)

- ☐ Google OAuth is **production verified** already (7 successful runs — see CLAUDE.md), but re-confirm the callback URL and authorized origins match the final production domain.
- ☐ Email confirmation flow works from the production domain (`emailRedirectTo` / reset links use `APP_URL`).

## 5. Domain & SEO

- ☐ Final domain decided. Make consistent across: `APP_URL`, `frontend/public/robots.txt`, `sitemap.xml`, the `<Seo>` canonical/OG URLs, and every Polar URL (webhook, success, return).
- ☐ (Recommended, not blocking) a real favicon/OG image — current favicon is a generated monogram placeholder.

## 6. Security sign-off

- ☐ Webhook signature verification confirmed live (a real delivery returns `200`; a tampered one `403`). `npm run verify:polar` already proves the crypto (31/31); this confirms the *deployed* secret matches.
- ☐ CORS: with `APP_URL` set, the API only allows that origin (fail-closed confirmed in code). Verify a cross-origin request is rejected.
- ☐ Confirm no service-role key or `POLAR_ACCESS_TOKEN` is exposed to the browser bundle (grep the built `dist/` for the token prefixes if paranoid — they're server-only by construction).
- ☐ Note the accepted npm advisories (see `LAUNCH_BLOCKERS.md` → Not blockers) — decision on record, not an oversight.

## 7. The live test (the actual gate — see `BILLING_QA_CHECKLIST.md`)

- ☐ Full sandbox pass of `BILLING_QA_CHECKLIST.md` §1–§12.
- ☐ One **production** purchase with a real card → confirm webhook `200`, `subscriptions` row correct, Pro unlocks, portal opens, then cancel/refund it.
- ☐ Confirm the `?billing=success` confirming-purchase state renders, and that Pro unlocks within the bounded poll window.

## 8. Post-launch monitoring (first 48h)

- ☐ Watch Vercel function logs for `Polar webhook signature verification failed`, `Polar Checkout Error`, `Polar Portal Error`, and `could not resolve a user for subscription` lines.
- ☐ Watch the Polar dashboard webhook delivery log for any non-`200` responses.
- ☐ Have `SUPPORT_PLAYBOOK.md` open for the first billing support tickets.
