# EmberFlow — Security Audit

**Date:** 2026-07-25
**Scope:** Phase 2 of the production-hardening pass. Covers RLS, storage bucket permissions, database triggers, API routes, authentication flow, authorization/feature gating, environment variables & secrets, and dependency vulnerabilities.
**Method:** Live production schema/policies/triggers introspected directly via the Supabase CLI (`supabase db query --linked`) against project `rzwgbrwjrzapbagbksof`; application code reviewed in `frontend/src` and `api/`. Per the hardening-pass rules, **no Supabase schema/RLS/trigger/storage changes were applied** — those findings are documented with recommendations only. Application-level fixes that don't touch the database (dependency patches, response headers) were applied directly; see "Fixed in this pass" below.

---

## Critical

### 1. The `logos` storage bucket does not exist in production

`select * from storage.buckets` on the live project returns only `avatars` — there is no `logos` bucket, even though:
- `policies.sql` and this session's `003_brand_studio.sql` both define RLS policies on `storage.objects` scoped to `bucket_id = 'logos'`
- `SettingsPage.jsx` (pre-existing, before Brand Studio) and the new `BrandStudioPage.jsx`/`brandAssets.js` both call `supabase.storage.from('logos').upload(...)`

**Effect:** every logo upload attempt — old code and new Brand Studio code alike — fails at the Storage API with a bucket-not-found error, before RLS is ever evaluated. This predates this session; it is not something Brand Studio introduced, but Brand Studio's logo feature is currently non-functional in production because of it.

**Not fixed here:** creating a storage bucket is a live production infrastructure change, out of scope for "unquestionably safe" under this pass's "do not modify Supabase production schema" rule, and warrants its own explicit go-ahead given how directly it affects a feature you may want to verify end-to-end anyway.

**Recommendation:** create the `logos` bucket (`public: true`, mirroring `avatars`) with an explicit `file_size_limit` and `allowed_mime_types` (`image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`) set at the **bucket** level, not just validated client-side in `brandAssets.js` — the `avatars` bucket already does this (1MB cap, 3 mime types) and `logos` should get the same defense-in-depth once created.

---

## High

### 2. Several declared "Pro" features are enforced only in the frontend, not the database

`utils/plans.js` declares `PRO_FEATURES = {'analytics', 'proposals', 'payments', 'branding', 'unlimited', 'premium-templates', 'advanced-export'}`, all gated client-side via `FeatureGate`/`useSubscription().canUseFeature()`. Checking each against actual RLS/triggers on the live database:

| Feature | DB-enforced? | Evidence |
|---|---|---|
| `proposals` | **Yes** | `enforce_proposals_pro_only` trigger (BEFORE INSERT on `proposals`) + Pro-gated RLS on `proposals`/`proposal_items` UPDATE/DELETE |
| `branding` | **Yes** | `enforce_branding_pro_only` trigger on `profiles` (added this session) + Pro-gated `logos` storage policies |
| `unlimited` (invoice count) | **Partially** — see Finding 3 below | Free-tier limit only enforced inside the `create_invoice_with_items` RPC, not by RLS or a trigger on `invoices` itself |
| `payments` (payment tracking) | **No** | `payments` RLS is owner-only (`auth.uid() = user_id`) with no plan check at all, and no trigger exists on `payments`. A Free user can `supabase.from('payments').insert(...)` directly. |
| `analytics` | N/A by nature | Purely a read-side aggregation of data the user already owns via existing RLS — bypassing the UI gate lets a Free user view their own analytics early, not access anyone else's data. Lower severity: a paywall bypass, not a data-exposure issue. |
| `premium-templates` / `advanced-export` | **No** | `invoices.template`/`proposals.template` are free-text columns with no CHECK constraint restricting which template ids a Free plan may set, and PDF/print/DOCX export happens entirely client-side (jsPDF/html2canvas/docx) with no server call to gate at all — there's no server-side data to protect here, so this is architecturally client-only rather than a closable gap. |

**Recommendation (not applied):** add a `payments` INSERT/UPDATE policy requiring an active Pro plan (mirroring the exact pattern used for `proposals`), and consider a `CHECK` constraint or trigger on `invoices.template`/`proposals.template` restricting Free-plan rows to the free theme ids in `themes.js` (`FREE_THEME_IDS`). Both are additive, low-risk migrations in the same style as `003_brand_studio.sql`.

### 3. Free-tier invoice limit is bypassable via direct API insert

`create_invoice_with_items()` (the RPC `createInvoice()` calls) enforces the 5-invoices/month Free cap internally, but the `invoices` table's own INSERT RLS policy only checks ownership — there is **no trigger on `invoices`** (unlike `clients`, which has `enforce_client_limit_trigger`). A Free user can call `supabase.from('invoices').insert({...})` directly from a browser console, bypassing the RPC (and its limit check) entirely, and going through `updateInvoice`'s direct `.update()` call similarly bypasses any creation-time check for edits.

**Recommendation (not applied):** add a `BEFORE INSERT` trigger on `invoices` mirroring `enforce_client_limit()` exactly (count this month's invoices for the user if `plan = 'free'`, raise if `>= 5`). This is the same pattern already proven safe for `clients`.

---

## Medium

### 4. Duplicate RLS policies on `proposal_items`

Documented in full in `MIGRATION_AUDIT.md` (Finding 1) — migration 001's `DROP POLICY` statements didn't match the live policy names, leaving 8 policies (2 per operation, functionally identical) instead of 4. Not exploitable today, but a latent trap if a future change only updates one naming variant. Recommendation: reconcile in a reviewed migration, not applied here.

### 5. Service-role client used with request-scoped filtering, not RLS, in Paddle API routes

`api/paddle/checkout.js` and `api/paddle/portal.js` use `getAuthenticatedUser()`, which verifies the caller's JWT but then queries `profiles`/`subscriptions` via a **service-role** Supabase client (bypasses RLS). Every query is manually scoped with `.eq('user_id', user.id)` / `.eq('id', user.id)`, and the JWT is genuinely verified first (`supabase.auth.getUser(token)`), so this isn't exploitable as written — but it means these two routes have **no RLS safety net**; a future edit that forgets a `user_id` filter would have full cross-user access with nothing to catch it. This is a standard, common pattern for trusted backend code (and the correct one — service-role is the only way to look up a Paddle customer before a `subscriptions` row exists), just worth naming as a trust boundary for future changes to these two files specifically.

**No code change made** — this is a design observation for future editors of these files, not a bug to fix.

### 6. CORS falls back to wildcard if `APP_URL` is unset

`api/_utils/http.js`'s `corsOrigin()` returns `process.env.APP_URL` if set, else `'*'`. All the routes that use it require a Bearer token (not cookies), so a wildcard CORS doesn't enable CSRF against them the way it would for cookie-authenticated endpoints — but it's still a silent degrade if the env var is missing in a given Vercel environment. **Recommendation:** confirm `APP_URL` is set in every Vercel environment (production + preview), not just documented in `.env.example`.

---

## Low / hygiene

- **Disposable-email check is client-side only** (`AuthPage.jsx` calls `isDisposableEmail()` before submit; nothing re-checks server-side). Low severity — bypassing it just allows signup with a throwaway address, not a security boundary. Not fixed here; would need a Postgres check on `handle_new_user()` or an Auth hook to close for real.
- **`webhook_events` grants are broader than needed in `schema.sql`/migration 001** (both grant `anon`/`authenticated` in addition to `service_role`), though live production only actually grants `service_role`/`postgres`. Not a live issue (RLS has zero policies, so `anon`/`authenticated` are denied regardless of the grant) — noting only because it's more evidence production wasn't built by literally running these files (see `MIGRATION_AUDIT.md`).
- **No baseline security response headers on the SPA itself** (only the `api/` routes set them). **Fixed in this pass** — see below.

---

## Fixed in this pass

- **`postcss` high-severity path-traversal advisory** (GHSA-r28c-9q8g-f849) — resolved via `npm audit fix` (non-breaking, transitive dependency).
- **`vite` pinned version bumped 5.4.11 → 5.4.21** (still same minor line, dev dependency only) to pick up the latest patches available without a major bump. Build reverified green.
- **Added baseline security response headers** to the deployed SPA via `vercel.json` (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`) — previously only the `api/` routes set these. Static config only; no deployment was triggered.

## Documented, not applied (needs its own decision + testing)

- **`esbuild`/`vite` moderate advisory** (GHSA-67mh-4wv8-2f99) — dev-server-only (doesn't affect the built production bundle), but fully resolving it requires a major Vite bump (5→8), which is out of scope for a safe patch.
- **`react-router`/`react-router-dom` moderate advisories** (open redirect via backslash; SSR hydration constructor injection — the latter doesn't apply, this app has no SSR) — fixing requires a major bump (6→7), a real breaking-change migration effort, not a drop-in patch.
- **Dependency versions generally behind latest** (`@supabase/supabase-js` 2.50.0 vs. 2.110.8, `react`/`react-dom` 18 vs. 19, `lucide-react` 0.468 vs. 1.x) — no active vulnerabilities beyond the two above, but worth a dedicated, tested upgrade pass rather than a blind bump here.
- **Findings 1-4 above** (missing `logos` bucket, payments/premium-template gating gaps, invoice-limit bypass, duplicate `proposal_items` policies) — all require a Supabase migration or bucket creation, excluded by this pass's rules. Recommendations are written to be directly actionable as a follow-up, explicitly-approved change.
