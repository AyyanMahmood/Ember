# Paddle → Polar.sh Migration — Audit & Plan

**Date:** 2026-07-28
**Branch:** `polar-migration` (off `opclaude-redesign`)
**Safety tag:** `pre-polar-migration-20260728-1140` (pushed to origin)
**Author:** Staff-level migration of the billing backbone. No code was modified while producing this audit; findings are from direct reads of the live source tree and Polar's current API docs (verified against `polarsource/polar-js` at `main`, not memory).

This document is the **audit and plan** required before any code changes. It is exhaustive by design — the goal is code that still makes sense in five years, not the fastest path.

---

## 0. Executive summary

EmberFlow bills Pro subscriptions through **Paddle Billing** via three Vercel serverless routes (`/api/paddle/{checkout,portal,webhook}`) plus a shared helper (`api/_utils/paddle.js`). Subscription state is written to Supabase **only by the signed webhook** and read by the app from the `subscriptions` table; the frontend never trusts billing state from the client. Entitlements are computed purely from `subscriptions.plan` / `.status` (`utils/plans.js`) — fully **provider-agnostic**.

The migration swaps the payment provider **without changing** the trust model, the entitlement logic, the DB read path, the route-per-file serverless pattern, or any non-billing feature. Polar is, like Paddle, a **Merchant of Record** — so the "we don't touch card data; the MoR handles tax/checkout/portal" posture in our legal copy stays true, only the vendor name changes.

**Why the surface is small:** everything Paddle-specific is isolated behind (a) three route files, (b) one util, (c) one frontend service, (d) five `PADDLE_*` env vars, (e) four `paddle_*` DB columns, and (f) documentation/legal copy. Nothing else in the app knows the provider exists.

**Net architectural win from Polar:** Polar accepts an `external_customer_id` at checkout and echoes it back on every webhook as `customer.external_id`. We pass the Supabase `user.id` there, which **removes** Paddle's mandatory "pre-create a customer via API, store its id, then start checkout" dance — a whole API round-trip and a pre-payment DB upsert disappear.

---

## 1. Current Paddle architecture (as-is)

### 1.1 Serverless routes (`api/paddle/`)
| Route | Method | Auth | Rate limit | Responsibility |
|---|---|---|---|---|
| `checkout.js` | POST | Bearer JWT (`getAuthenticatedUser`) | 5/60s | Find-or-create Paddle customer, create a `transaction`, return hosted checkout `url` |
| `portal.js` | POST | Bearer JWT | 5/60s | Create a Paddle customer portal session, return `url` |
| `webhook.js` | POST (bodyParser off) | HMAC signature | 60/60s | Verify signature → idempotency check → upsert `subscriptions` from event |

### 1.2 Shared helper (`api/_utils/paddle.js`)
- `getPriceId(plan)` — maps `pro_monthly`/`pro_yearly` → `PADDLE_PRICE_*` env, throws on unknown plan (this is the server-side allow-list that prevents arbitrary price injection).
- `planFromPrice(priceId)` — reverse map for the webhook.
- `billingCycleFromPlan(plan)` — `monthly`/`yearly`/`free`.
- `paddleFetch(path, opts)` — thin `fetch` wrapper, `Authorization: Bearer PADDLE_API_KEY`, base URL switched by `PADDLE_ENV`.
- `verifyPaddleSignature(rawBody, header)` — hand-rolled HMAC-SHA256 over `ts:body`, constant-time compare against `h1` in the `paddle-signature` header.
- `extractPriceId` / `extractUserId` / `normalizeSubscriptionPayload` — flatten a Paddle event `data` object into a `subscriptions` row.

### 1.3 Shared infra (reused unchanged by Polar)
- `api/_utils/http.js` — CORS (fail-closed on unset `APP_URL`), `sendJson`/`sendError`, `readRawBody`, `getBaseUrl`. **No changes.**
- `api/_utils/supabaseAdmin.js` — service-role client + `getAuthenticatedUser` (verifies JWT). **No changes.**
- `api/_utils/rateLimit.js` — Upstash Redis, fail-open. **No changes.**

### 1.4 Frontend
- `services/subscriptions.js` — `startCheckout(plan)` → `POST /api/paddle/checkout`; `openBillingPortal()` → `POST /api/paddle/portal`. Both attach the Supabase access token.
- Consumers: `components/UpgradeModal.jsx` (checkout), `pages/SettingsPage.jsx` (checkout + portal + shows "Manage billing" iff `subscription.paddle_customer_id`).
- `hooks/useSubscription.js` + `utils/plans.js` — read `subscriptions` row, compute entitlements from `plan`/`status`. **Provider-agnostic; no changes.**

### 1.5 Subscription lifecycle today
1. User clicks Upgrade → `POST /api/paddle/checkout` → hosted Paddle checkout URL → `window.location.assign`.
2. User pays on Paddle → redirect to `/app/settings?billing=success`.
3. Paddle fires `subscription.*` / `transaction.completed` webhooks → `webhook.js` verifies + upserts `subscriptions`.
4. App reads `subscriptions` → entitlements unlock.
5. Manage/cancel → `POST /api/paddle/portal` → hosted Paddle portal.
6. Cancellation/renewal webhooks keep `subscriptions` in sync.

---

## 2. Everywhere Paddle exists (complete inventory)

**Code (behavior-bearing):**
- `api/paddle/checkout.js`, `api/paddle/portal.js`, `api/paddle/webhook.js`
- `api/_utils/paddle.js`
- `frontend/src/services/subscriptions.js` (route paths)
- `frontend/src/pages/SettingsPage.jsx` (`paddle_customer_id` gate on the "Manage billing" button)

**Database:**
- `subscriptions.paddle_customer_id`, `.paddle_subscription_id`, `.paddle_price_id`, `.paddle_product_id` (migration `001`, live in prod)
- `webhook_events` table (provider-agnostic — **reused as-is**)

**Env vars:** `PADDLE_ENV`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_PRICE_PRO_MONTHLY`, `PADDLE_PRICE_PRO_YEARLY` (+ the `PADDLE_PRO_*_PRICE_ID` naming drift in some docs)

**User-facing copy (legal/marketing):**
- `frontend/src/pages/PrivacyPage.jsx` (processor disclosure + privacy link, 6 mentions)
- `frontend/src/pages/TermsPage.jsx` (payment processor + ToS link, 3 mentions)
- `frontend/src/pages/LandingPage.jsx` (feature bullet + 2 FAQ answers)

**Documentation:** `README.md`, `.env.example`, `PROJECT_STATUS.md`, `SPECIFICATION.md`, `SECURITY.md`, `MANUAL_QA_CHECKLIST.md`, `CLAUDE.md`. (`DESIGN_SYSTEM.md` / `EMBER_DESIGN_BIBLE.md` mention Paddle only as **visual-design inspiration**, not integration — left as-is; flagged, not changed.)

---

## 3. Target Polar architecture (to-be)

### 3.1 Verified Polar facts (from `polarsource/polar-js@main` + docs)
- **REST base:** `https://sandbox-api.polar.sh` (sandbox) / `https://api.polar.sh` (production). Auth: `Authorization: Bearer <POLAR_ACCESS_TOKEN>` (organization access token).
- **Create checkout:** `POST /v1/checkouts/` — body (snake_case): `products: [productId]` (Polar checkout takes **product IDs, not price IDs**), `success_url`, `customer_email`, `customer_name`, `external_customer_id`, `metadata`. Response: **`url`** (redirect target), `id`, `customer_id`, `external_customer_id`, `status`.
- **Create portal session:** `POST /v1/customer-sessions/` — body `customer_id` **or** `external_customer_id`. Response: **`customer_portal_url`**.
- **Webhooks:** Standard Webhooks spec. Headers `webhook-id`, `webhook-timestamp`, `webhook-signature`. The signing secret is a plain string; the HMAC key is the secret's raw UTF-8 bytes (Polar/SDK base64-encode it, the verifier base64-decodes it — net key = `Buffer.from(secret,'utf8')`). Verified event JSON is **raw snake_case** when using `standardwebhooks` directly (only the full SDK's `validateEvent` transforms to camelCase).
- **Subscription webhook payload (`event.data`, snake_case):** `id`, `status` (`active`/`trialing`/`past_due`/`canceled`/`incomplete`/`unpaid`/…), `current_period_start`, `current_period_end`, `cancel_at_period_end`, `customer_id`, `product_id`, `amount`, `currency`, `recurring_interval`, `metadata`, `customer: { id, email, external_id }`.
- **Relevant events:** `subscription.created`, `subscription.active`, `subscription.updated`, `subscription.canceled`, `subscription.uncanceled`, `subscription.revoked` (+ `order.*`, `customer.*` — acknowledged but not acted on; `subscription.*` is the single source of truth).

### 3.2 Dependency & module-format decision
The existing api layer is **100% CommonJS** (`require`/`module.exports`) with **no Paddle SDK** — it deliberately uses raw `fetch`. Vercel runs these as CJS. The full `@polar-sh/sdk` is ESM-first and would risk `ERR_REQUIRE_ESM` and a camelCase/Date deserialization layer.

**Decision:** mirror the existing house style.
- **Checkout + portal** → raw `fetch` via a new `polarFetch()` helper (identical shape to `paddleFetch()`).
- **Webhook signature verification** → the official **`standardwebhooks`** package (`v1.0.1`, `"type":"commonjs"`, `require`-safe, deps `@stablelib/base64` + `fast-sha256`). This is exactly what Polar's own SDK uses internally, so we don't hand-roll security-critical crypto, and we stay CJS with zero ESM risk. It returns raw snake_case JSON, which is simpler to map than the SDK's transformed objects.

Net new dependencies: **one** (`standardwebhooks`, + 2 tiny transitive). No SDK, no ESM landmine.

### 3.3 Route mapping
| Paddle (old) | Polar (new) | Notes |
|---|---|---|
| `POST /api/paddle/checkout` | `POST /api/polar/checkout` | No customer pre-create; pass `external_customer_id=user.id` |
| `POST /api/paddle/portal` | `POST /api/polar/portal` | `customer_sessions` by stored `polar_customer_id`, else `external_customer_id` |
| `POST /api/paddle/webhook` | `POST /api/polar/webhook` | Standard Webhooks verify; idempotency by `webhook-id` header |
| `api/_utils/paddle.js` | `api/_utils/polar.js` | Same responsibilities, Polar shapes |

Provider-namespaced paths are kept (clean for future Ember Holdings infra — the provider is explicit in the URL).

### 3.4 Data model
New **additive** columns (`migration 007_polar_billing.sql`): `subscriptions.polar_customer_id`, `.polar_subscription_id`, `.polar_product_id`, plus lookup indexes. `plan`/`status`/`billing_cycle`/period/cancel columns are provider-agnostic and **unchanged**. `webhook_events` **unchanged**.

The legacy `paddle_*` columns are **kept in place** (nullable, unused) during and after this migration. Dropping them is data-destructive and irreversible on a production DB whose migration history is known-fragile (see `MIGRATION_AUDIT.md`); it is documented as a **deferred, explicitly-gated manual step** to run only after Polar is verified live. This is the responsible order: additive + reversible now, destructive later with sign-off.

### 3.5 Environment variables
| Old (`PADDLE_*`) | New (`POLAR_*`) |
|---|---|
| `PADDLE_ENV` (sandbox/production) | `POLAR_SERVER` (sandbox/production) |
| `PADDLE_API_KEY` | `POLAR_ACCESS_TOKEN` |
| `PADDLE_WEBHOOK_SECRET` | `POLAR_WEBHOOK_SECRET` |
| `PADDLE_PRICE_PRO_MONTHLY` | `POLAR_PRODUCT_PRO_MONTHLY` |
| `PADDLE_PRICE_PRO_YEARLY` | `POLAR_PRODUCT_PRO_YEARLY` |

### 3.6 Status → plan mapping (correctness note)
Polar's plan is derived from `product_id`. To keep **both** the frontend entitlement check (`isSubscriptionActive`, status-based) **and** the DB-level free-limit triggers (`create_invoice_with_items` etc., which check `plan` only) consistent, the webhook derives:

```
grantsAccess = status ∈ {active, trialing, past_due}
plan = grantsAccess ? planFromProduct(product_id) : 'free'
```

So a revoked/expired subscription lands as `plan='free'`, and every gate (frontend + DB triggers + RLS) agrees. A cancel-at-period-end subscription stays `active` + `cancel_at_period_end=true` → the user correctly keeps Pro until period end. This is a small, deliberate hardening over Paddle's price-only derivation, documented so it isn't mistaken for a behavior change.

---

## 4. Aspect-by-aspect impact

| Aspect | Impact |
|---|---|
| **DB dependencies** | Additive columns only; `webhook_events` reused; RLS/entitlements untouched |
| **Env vars** | 5 `PADDLE_*` → 5 `POLAR_*` (Vercel + local) |
| **API routes** | 3 new `/api/polar/*`, remove 3 `/api/paddle/*` in cleanup |
| **Checkout flow** | Simpler — no customer pre-create; `external_customer_id=user.id` |
| **Webhooks** | Standard Webhooks verify; idempotency by `webhook-id`; `subscription.*` authoritative |
| **Customer portal** | `customer_sessions` → `customer_portal_url` |
| **Success/cancel** | `success_url` unchanged (`/app/settings?billing=success`); Polar handles cancel back to checkout |
| **Subscription lifecycle** | Same states, mapped from Polar statuses; status-aware plan derivation |
| **Invoice handling** | **Zero** — app invoices are Supabase rows, unrelated to the payment provider's own receipts |
| **Error handling** | Reuse `sendError`/`sendJson`; friendly messages; 403 on bad signature; fail-open rate limit unchanged |
| **Documentation** | README, .env.example, POLAR_SETUP.md (new), status/spec/security/CLAUDE refreshed |

---

## 5. Phase plan (one commit per phase, build green after each)

1. **Infrastructure** — `.env.example` POLAR vars, add `standardwebhooks`, `007_polar_billing.sql`.
2. **Backend** — `api/_utils/polar.js`, `api/polar/checkout.js`, `api/polar/portal.js`.
3. **Frontend** — `services/subscriptions.js` → `/api/polar/*`, `SettingsPage` `polar_customer_id`, legal/marketing copy.
4. **Webhook** — `api/polar/webhook.js`.
5. **Testing** — `npm run build`; static route verification; signature self-test; manual checklist.
6. **Cleanup** — remove `api/paddle/*` + `api/_utils/paddle.js`; deferred DB-column-drop documented.
7. **Documentation** — README, POLAR_SETUP.md, status/spec/security/CLAUDE; extract reusable components to `~/Desktop/Ember UI/`.

---

## 6. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Wrong webhook secret handling (Standard Webhooks base64 quirk) | Use official `standardwebhooks` lib exactly as Polar's SDK does; documented in `polar.js` |
| ESM/CJS breakage on Vercel | No SDK; `standardwebhooks` is CJS; all api files stay CJS |
| Prod DB migration fragility (no history table) | Additive `IF NOT EXISTS` migration; apply via reviewed `db query`, never bare `db push`; drop deferred |
| Losing historical Paddle linkage | Keep `paddle_*` columns; drop only post-verification with sign-off |
| Manual Polar dashboard config (products, webhook, token) | Enumerated in POLAR_SETUP.md + §7 manual steps |
| Can't do live payment test in this environment | Build + static verification here; live sandbox test is a documented manual step before merge |

## 7. Manual steps (outside this repo)
1. Create Polar org + Pro Monthly / Pro Yearly **products** (sandbox first).
2. Create an **organization access token** → `POLAR_ACCESS_TOKEN`.
3. Add webhook endpoint `https://<domain>/api/polar/webhook`, copy signing secret → `POLAR_WEBHOOK_SECRET`.
4. Set `POLAR_SERVER`, `POLAR_PRODUCT_PRO_MONTHLY`, `POLAR_PRODUCT_PRO_YEARLY` in Vercel + `.env.local`.
5. Apply `007_polar_billing.sql` to Supabase (reviewed).
6. Sandbox end-to-end test (upgrade, webhook sync, portal, cancel), then flip `POLAR_SERVER=production`.
7. **After** production verification: drop legacy `paddle_*` columns and remove `PADDLE_*` Vercel vars.

## 8. Rollback plan
- **Code:** `git checkout opclaude-redesign` (or reset to tag `pre-polar-migration-20260728-1140`). The Polar work is isolated on `polar-migration` and is **not merged** until approved.
- **Routing:** Paddle routes remain until Phase 6; re-adding them is a revert of that one commit.
- **DB:** additive migration — nothing dropped, so nothing to restore. `paddle_*` columns still hold prior linkage.
- **Env:** `PADDLE_*` Vercel vars stay set until post-verification, so a revert needs no secret re-entry.

---

*No application code was changed while producing this audit. Implementation follows in Phases 1–7 on `polar-migration`; nothing merges to `main` without approval.*
