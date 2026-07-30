# EmberFlow — Launch Readiness Report

**Date:** 2026-07-30 · **Phase:** Launch Hardening Phase 2 (final) · **Prepared as:** the engineer signing off for production.

This is the comprehensive engineering assessment. Companion docs: `LAUNCH_BLOCKERS.md`, `PRODUCTION_CHECKLIST.md`, `SUPPORT_PLAYBOOK.md`, `BILLING_QA_CHECKLIST.md`, `EMBER_UI_TIERING.md`.

---

## The one-line answer

> **Can EmberFlow launch today? — No, but it is close, and the gap is verification and configuration, not engineering.**

The product is production-quality code that has been audited deeply (five flow-by-flow billing audits, six real bugs found and fixed). What stands between it and launch is that **no real Polar transaction has ever been executed** — every "verified" claim is scoped to code + Polar's own docs — plus unconfirmed production config/migration state. None of the remaining work is *building*; it is *proving*. Realistic time-to-launch once someone with Polar credentials runs the checklist: **1–2 days**.

---

## Readiness scorecard

| Area | Score | One-line justification |
|---|---:|---|
| **Billing** | 82 / 100 | Code + doc verified exhaustively, 6 bugs fixed, idempotent & correct — but **never run live** (−15) and prod config unconfirmed (−3). |
| **Backend** | 90 / 100 | Minimal, clean surface (3 routes, 4 utils), signed idempotent webhook, service-role-only writes, rate-limited. Deducted for the theoretical out-of-order-webhook write and env-var-load-bearing entitlement. |
| **Frontend** | 87 / 100 | Mature, responsive, accessible, dark-first, lazy-loaded. Deducted because on-device QA (`MANUAL_QA_CHECKLIST.md`) is still largely unrun by a human and Lighthouse hasn't been executed. |
| **Security** | 85 / 100 | RLS owner-only, Standard-Webhooks signature verify, CORS fail-closed, rate limiting, no secrets in the bundle by construction. Deducted for open npm advisories (low real impact) and no live pen test. |
| **Performance** | 85 / 100 | Route-level code splitting, split vendor chunks, jsPDF/html2canvas deferred to when a doc is actually edited, self-hosted fonts. Deducted because Lighthouse was never actually run (no browser in the build env). |
| **Architecture** | 92 / 100 | Provider-agnostic entitlement, single source of truth (signed webhook), clean separation, modular, Ember UI extraction discipline. The strongest area. |
| **Documentation** | 95 / 100 | Unusually thorough and, deliberately, honest about what is and isn't verified. This report set, the QA checklists, the support playbook, and the per-flow audits. |
| **Overall** | **≈ 88 / 100** | Excellent, launch-grade engineering; gated on live billing verification + production config. |

The overall figure is intentionally *not* higher than Billing, because a finance product cannot be "more ready than its billing."

---

## Billing readiness — detail

Five flows audited end-to-end this sprint, each against code **and** Polar's own documentation (fetched, not recalled). Six real bugs found and fixed:

| # | Bug | Commit |
|---|---|---|
| 1 | Checkout errors sanitized to a dead-end generic string in prod | `75460d5` |
| 2 | Subscriptions-page refund summary contradicted the published `/refund` policy | `c241c0d` |
| 3 | Stale Pro state after portal cancel — no refetch on return (bfcache) | `5a12fa3` |
| 4 | False UI claim that Polar can't switch plans in place | `874b68c` |
| 5 | Portal session had no `return_url` → **no way back to EmberFlow from the portal at all** | `1b27012` |
| 6 | `past_due` failed-payment state presented as if healthy (malformed badge, "Renews" subtitle, no explanation) | `92ea1b8` |

**Verified correct and left unchanged** (with reasons, not assumptions): the `409` duplicate-subscription guard; the `user_id` unique index making the upsert safe; owner-only RLS; status-aware entitlement that mirrors Polar's real lifecycle (`active`/`trialing`/`past_due` grant; `canceled`/`unpaid`/`paused`/`incomplete*` don't) and is robust to Polar's own `canceled`-vs-`unpaid` doc inconsistency; renewals arriving as `subscription.updated`; webhook idempotency via `webhook_events`; the customer portal being 100% Polar-native (nothing rebuilt).

**Residual, non-blocking:** the theoretical out-of-order webhook write (needs an "apply only if newer" guard — v1.5), the duplicate-checkout TOCTOU race (needs a DB lock/idempotency key — v1.5), and env-var-load-bearing entitlement (an operational note in `PRODUCTION_CHECKLIST.md`, not a code fix).

---

## Refund Research (Task 1 — recommendations only, nothing implemented)

### Polar's actual capabilities (verified against `polar.sh/docs/features/refunds`)
- **Full and partial refunds**, from the **dashboard** or the **API** (`POST` create-refund; `refund.created`/`order.refunded` webhooks exist).
- Polar **auto-calculates the tax portion** and prorates it for partial refunds.
- **Refunding an order does NOT cancel the subscription** — the money returns but access continues. Ending access is a *separate* cancel step. (This is the single most important operational fact — see `SUPPORT_PLAYBOOK.md`.)
- **Payment-processing fees are not returned** on a refund (~2.9%+30¢ retained by the networks).
- Polar **reserves the right to refund within 60 days** at its own discretion to prevent chargebacks — a platform backstop, independent of EmberFlow's stated policy.
- **No built-in prorated-refund-on-cancel** — cancel keeps access to period end; there is no automatic mid-term money-back.

### Competitive comparison
| Provider | Refund model | Relevant to EmberFlow |
|---|---|---|
| **Stripe** | Full/partial via API/dashboard; refund ≠ cancel (same as Polar); merchant sets policy | Confirms the "refund and cancel are separate" norm; Stripe merchants overwhelmingly run *discretionary* refund policies, not blanket windows |
| **Paddle** (MoR, EmberFlow's former provider) | MoR-managed; a customer-facing ~14-day money-back is common on Paddle-billed SaaS | 14-day cooling-off is the recognizable MoR default customers expect |
| **LemonSqueezy** (MoR) | Full/partial; publicly promotes a customer-friendly refund stance | Signals the MoR-space customer expectation leans generous, especially annual |
| **Industry (dev/productivity SaaS)** | Monthly: rarely refunded (small, cancel-anytime). Annual: frequent good-faith cooling-off (7–30 days), pro-rate rare | Directly informs the split recommendation below |

### Recommendation (for adoption as policy — **not implemented**)
- **Monthly ($11):** keep **discretionary-only** (billing error / duplicate / outage). The charge is small and the customer is never >~30 days from cancelling; a blanket window mostly invites abuse for little goodwill gain.
- **Yearly ($130):** discretionary **plus** a good-faith **14-day cooling-off** for a first-time yearly purchase with minimal usage. A $130 up-front commitment earns more goodwill than a monthly one, and 14 days matches the MoR-space norm customers recognize from Paddle/LemonSqueezy. No mid-term proration — direct to cancel (keeps access to period end).
- **Philosophy:** "calm, premium, trustworthy" (the brand) means *fair and predictable*, not *free-for-all*. Discretionary-with-a-clear-annual-cooling-off is fair without being exploitable.
- **CX:** the `/refund` page + `SUPPORT_PLAYBOOK.md` already state the current (discretionary) policy consistently — the one contradiction was fixed (`c241c0d`). If the yearly cooling-off is adopted, update both.
- **Fraud prevention:** verify requests come from the account email; watch for refund-then-resubscribe loops and refunds right after heavy export; lean on Polar's 60-day chargeback discretion as a backstop, never a promise.

---

## Security readiness — detail

- **Entitlement writes are service-role-only** through the signed webhook; the browser can never write `subscriptions` (RLS has no client write policy).
- **Webhook signature** verified per Standard Webhooks (base64 secret, required headers, 5-min replay window, constant-time compare) — proven by `verify:polar` (31/31, incl. tamper/stale rejection).
- **CORS fail-closed:** unset `APP_URL` omits the allow-origin header rather than wildcarding.
- **Rate limiting** on all billing routes (fail-open if Redis is down — a deliberate availability choice).
- **Secrets** (`POLAR_ACCESS_TOKEN`, service-role key, webhook secret) are server-only by construction; never `VITE_`-prefixed.
- **npm advisories (accepted, on record):** 3 moderate + 1 high, but the esbuild one is **dev-server-only** (never in the prod bundle) and the react-router "high" is an **SSR-hydration** vector that **does not apply** (EmberFlow is a client-only SPA, no SSR). The react-router open-redirect (moderate) is real but low-impact; fixing needs a breaking `react-router-dom@7` bump — a scoped v1.5 task. None are launch-blocking.

---

## Repository audit (Task 6 — findings; only the safe fix was applied)

- **Paddle remnants in code:** none in `api/` or `frontend/src` (verified by grep). The 4 `paddle_*` **columns** remain in the DB schema **intentionally** (documented rollback safety in `POLAR_SETUP.md` → Decommissioning Paddle) — drop only after a real production Polar purchase succeeds.
- **Microsoft/Azure remnants:** none in code (only historical CLAUDE.md session logs, left as accurate record).
- **Debug/temp code:** none. No `console.log` in `api/` (only intentional `console.error` diagnostics). No `TODO`/`FIXME`/`XXX` except one legit disposable-email data entry and — now fixed — a stale cross-reference comment (`webhook.js`, corrected this phase).
- **Dead CSS:** none — every `styles/components/*.css` file on disk is imported in `index.css` (1:1 verified).
- **Unused exports:** none found in the billing utils — all of `getProductId`/`planFromProduct`/`billingCycleFromPlan`/`hasAccessGrantingStatus`/`extractUserId`/`describeConfiguredWebhookSecret`/`normalizeSubscription` are used.
- **Applied safe fix:** `references/` (3.3GB of local clones) was untracked-but-**not-ignored** despite CLAUDE.md claiming it was gitignored — added to `.gitignore` (non-destructive; prevents an accidental `git add -A` of gigabytes).
- **Documented, not touched:** the out-of-repo stray `../frontend/` leftover (can't be gitignored from inside the project; harmless, sits outside the project dir). Legacy migration/audit markdown at the root (`MIGRATION_*.md`, `POLAR_MIGRATION_PLAN.md`) is historical and left as-is.

---

## Launch blockers (see `LAUNCH_BLOCKERS.md` for detail)

1. 🔴 **No live Polar transaction ever run** — the hard gate.
2. 🔴 **Production Polar + Vercel config unverified** (products, env vars, webhook endpoint, grace period).
3. 🔴 **Migration 007 confirmed applied to production** (direct column check).
4. 🟠 **Production domain decided & made consistent** (blocks a *polished* launch, not a technical one).

---

## Deferred (post-launch, by decision)

- Ember UI component extraction (planning done — `EMBER_UI_TIERING.md`; extraction is a separate effort).
- Failed-payment *post-revoke* explanation copy (pre-revoke notice is built).
- Out-of-order webhook "apply only if newer" hardening.
- Duplicate-checkout TOCTOU guard.
- `react-router-dom@7` upgrade (clears the open-redirect advisory) — scoped, test-heavy.
- Real designed favicon / OG image.
- Analytics visualization (currently number tiles; Recharts/Tremor is a v1.5 UX lift, not a correctness gap).

---

## Recommended v1.5 priorities (in order)

1. Run the live billing checklist and close Blocker 1 (this is really a v1.0 gate, listed first because nothing else matters until it's done).
2. Failed-payment post-revoke messaging + a proactive in-app "update your card" nudge during `past_due`.
3. `react-router-dom@7` upgrade-and-test pass (clears the open-redirect).
4. Out-of-order/idempotency hardening on the webhook (belt-and-suspenders for a finance product).
5. Analytics visualization (Recharts/Tremor) — the highest-visible-quality UX lift.
6. Begin Ember UI extraction per `EMBER_UI_TIERING.md`, starting Tier 1 (Button, Card).

---

## Day-1 launch checklist (once blockers clear)

1. ☐ `PRODUCTION_CHECKLIST.md` fully ticked.
2. ☐ `BILLING_QA_CHECKLIST.md` sandbox pass complete; one production purchase done and refunded.
3. ☐ Production deploy verified to contain the current `main` (fetch the deployed bundle, confirm the fixes are in it).
4. ☐ Support inbox monitored; `SUPPORT_PLAYBOOK.md` open.
5. ☐ Vercel + Polar delivery logs watched for the first 48h.
6. ☐ A rollback plan confirmed (the `pre-polar-migration` tag exists; `paddle_*` columns retained so no data restore is needed to revert billing).

---

## Bottom line

EmberFlow is **engineered to launch**. The billing system is correct, minimal, idempotent, and honestly documented; the app is mature and accessible; the architecture is clean. It is **not cleared to launch today** solely because the billing path has never been run against real Polar and the production configuration is unconfirmed — both of which are a focused day of verification, not more building. Do not launch on code confidence alone: **run the live test first.**
