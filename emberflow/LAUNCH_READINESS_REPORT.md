# EmberFlow — Launch Readiness Report

**Date:** 2026-07-30, updated 2026-08-01, 2026-08-02 · **Phase:** Final Launch Hardening Session · **Prepared as:** the engineer signing off for production.

This is the comprehensive engineering assessment. Companion docs: `LAUNCH_BLOCKERS.md`, `PRODUCTION_CHECKLIST.md`, `SUPPORT_PLAYBOOK.md`, `BILLING_QA_CHECKLIST.md`, `EMBER_UI_TIERING.md`. Full per-issue root-cause writeup for this update lives in `CLAUDE.md` → "Final Launch Hardening Session (2026-08-01)".

---

## 2026-08-02 update — Account deletion (Tier 1 launch blocker)

EmberFlow had no way for a user to permanently delete their account — a hard blocker for any SaaS holding client PII, invoices, and payment records, independent of and unrelated to the billing-verification gate below. Closed: **Settings → Danger Zone → Delete Account**, backed by `api/account/delete.js` + `delete_user_account(uuid)` (migration `012_delete_account.sql`). Full design/reasoning in README.md → "Account Deletion"; security model in `KNOWN_ISSUES.md` item 4.

Build green, `verify:polar` 33/33 (no regression), new `verify:account-deletion` 36/36 (confirmation matching, the billing-revocation decision, and the handler's full control flow — billing/DB/storage/auth failure ordering — against a mocked Supabase client). **Not yet live-verified**: migration `012` has not been applied to production, and no real Supabase project or Polar subscription has exercised the actual RLS/FK/Storage/revocation behavior (same standing no-live-credentials gap as every Polar item below). This does not move the billing-readiness score — it closes a separate, previously-untracked compliance/data-handling gap.

---

## 2026-08-01 update — Final Launch Hardening Session

A dedicated audit-first stabilization pass investigated 8 named launch blockers (Brand Studio false errors, billing portal, checkout 500, password reset, subscription lifecycle, webhook verification, environment variables, misleading messages). **8 real bugs found and fixed**, each root-caused before being touched, `npm run build` and `npm run verify:polar` (33/33) green after every change. Migration 008 (the Brand Studio fix) has been **applied to and confirmed live in production**. Nothing here required new architecture, features, or UI redesign.

### Remaining manual tasks

1. **Update the Supabase Reset Password email template** to embed `{{ .TokenHash }}` (exact snippet given in-chat and in `CLAUDE.md`) — without this, the new code-side fix falls back to the old same-browser-only behavior rather than reliably working cross-device.
2. **Confirm the production Vercel environment variables**, specifically: `POLAR_SERVER` is named correctly (not the legacy `POLAR_ENVIRONMENT`) and set to `production`; `POLAR_ACCESS_TOKEN` and both `POLAR_PRODUCT_PRO_*` ids are the **production** (not sandbox) values; `POLAR_WEBHOOK_SECRET` matches the **production** webhook endpoint's secret specifically; `APP_URL`/`VITE_APP_URL` match the real live domain. This environment cannot be read from this session — no Vercel CLI/dashboard access here.
3. **Confirm the Polar dashboard's production webhook endpoint** has all six `subscription.*` events selected (`created`/`active`/`updated`/`canceled`/`uncanceled`/`revoked`), per `POLAR_SETUP.md`.
4. **Run the live Polar sandbox/production end-to-end billing test** — unchanged, the single biggest remaining gate, present since the original Paddle → Polar migration.
5. **Push this session's 6 commits** (`938ae31`..`0790a20`, still local-only on `main` — nothing has been pushed to origin this session).

### Remaining production risks

- **Never-run billing path.** Every "verified" billing claim in this repo (this session included) is scoped to code + Polar's own documentation, not a real transaction. This is the dominant residual risk and has been since the original migration.
- **Unconfirmed live environment config.** If item 2 above turns out wrong (e.g. the webhook secret is still sandbox's), every production webhook silently 403s and no subscription ever syncs — this would look identical to the stale-id bug fixed this session, but with a different, ongoing root cause. Worth explicitly ruling out, not just assuming fixed.
- **Reset-password fix is incomplete until the dashboard template is updated.** The code is safe either way (falls back gracefully), but the actual bug isn't closed until item 1 is done.
- **Residual, accepted (unchanged from Phase 2, still deferred to v1.5 by design, not oversights):** the out-of-order-webhook write guard, the duplicate-checkout TOCTOU race, and — new this session — the fact that a stale-sandbox subscription only self-heals *reactively* when a user hits Switch or Cancel, not proactively. None of these are new; all are documented, bounded, and judged non-blocking for launch.
- **npm advisories** (react-router-dom open redirect, dev-only esbuild) — unchanged from Phase 2, non-blocking, tracked for a scoped v1.5 upgrade.

### Production readiness score: **≈ 91 / 100** (up from 88 on 2026-07-30)

The increase reflects real bugs closed this session (a genuine access-control leak in switch/cancel, a Brand Studio correctness bug now live in production, a reset-password flow that will now work cross-device once the template is updated) — not a change in the fundamental gate. The score is still capped by the same thing it was capped by on 2026-07-30: **no code confidence, however high, substitutes for a real Polar transaction.**

### Launch recommendation

**Not yet — but the remaining gap is now almost entirely external verification, not code.** Every item in "Remaining manual tasks" above is a config/dashboard/testing action, zero of them require more engineering. Recommended sequence: (1) push the 6 commits, (2) update the email template, (3) confirm the Vercel checklist, (4) run the live Polar test, (5) launch. A Free-tier-only soft launch remains available immediately if you want to ship the stabilized app before the Polar/email items are closed out — nothing in this session's fixes is gated on Polar being live.

---

## The one-line answer (original, 2026-07-30)

> **Can EmberFlow launch today? — No, but it is close, and the gap is verification and configuration, not engineering.**

The product is production-quality code that has been audited deeply (five flow-by-flow billing audits, six real bugs found and fixed as of 2026-07-30; three more found and fixed 2026-08-01, see the update above). What stands between it and launch is that **no real Polar transaction has ever been executed** — every "verified" claim is scoped to code + Polar's own docs — plus unconfirmed production config/migration state. None of the remaining work is *building*; it is *proving*. Realistic time-to-launch once someone with Polar credentials runs the checklist: **1–2 days**.

---

## Readiness scorecard

| Area | Score (2026-07-30) | Score (2026-08-01) | What changed |
|---|---:|---:|---|
| **Billing** | 82 / 100 | 85 / 100 | 3 more real bugs closed (stale sandbox→production customer/subscription ids now self-heal instead of failing or leaking access; stale plan-switch copy fixed) — still capped by **never run live** (−15) and prod config unconfirmed (−3). |
| **Backend** | 90 / 100 | 91 / 100 | Portal/switch/cancel routes now handle a whole class of "environment migration left stale ids" failures gracefully instead of surfacing raw Polar errors or silently granting indefinite access. |
| **Frontend** | 87 / 100 | 89 / 100 | Password reset now has a real "link expired" state instead of a confusing raw error; Brand Studio's free tier actually works end-to-end for the first time. Still deducted for unrun on-device QA / Lighthouse. |
| **Security** | 85 / 100 | 86 / 100 | Tightened "never persist an id we haven't just confirmed works" discipline across portal/switch/cancel. Unchanged: open npm advisories, no live pen test. |
| **Performance** | 85 / 100 | 85 / 100 | No change this session (out of scope). |
| **Architecture** | 92 / 100 | 93 / 100 | The self-heal-on-404 pattern (portal, switch, cancel all share one `collapseToFreeAfterMissingSubscription` / recovery approach) is a clean, reusable answer to "what happens when an external id goes stale" — the kind of thing worth keeping consistent as the app grows. |
| **Documentation** | 95 / 100 | 96 / 100 | This report, `CLAUDE.md`'s full per-issue writeup, and the migration/email-template/env-var checklists stay honest about exactly what's confirmed vs. what still needs a human with real credentials. |
| **Overall** | **≈ 88 / 100** | **≈ 91 / 100** | See the 2026-08-01 update above for detail. |

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
| 7 | Billing portal "customer does not exist" for accounts whose Polar customer only ever existed in sandbox | `c3ab27f` (2026-08-01) |
| 8 | Switch/Cancel had no handling for a stale (404) subscription id — would grant indefinite Pro access with no recovery path | `c3ab27f` (2026-08-01) |
| 9 | Checkout's duplicate-subscription error described the old cancel-then-resubscribe flow, contradicting the in-app Switch feature | `3ef3230` (2026-08-01) |

**Verified correct and left unchanged** (with reasons, not assumptions): the `409` duplicate-subscription guard; the `user_id` unique index making the upsert safe; owner-only RLS; status-aware entitlement that mirrors Polar's real lifecycle (`active`/`trialing`/`past_due` grant; `canceled`/`unpaid`/`paused`/`incomplete*` don't) and is robust to Polar's own `canceled`-vs-`unpaid` doc inconsistency; renewals arriving as `subscription.updated`; webhook idempotency via `webhook_events`; the customer portal being 100% Polar-native (nothing rebuilt).

**Residual, non-blocking:** the theoretical out-of-order webhook write (needs an "apply only if newer" guard — v1.5), the duplicate-checkout TOCTOU race (needs a DB lock/idempotency key — v1.5), and env-var-load-bearing entitlement (an operational note in `PRODUCTION_CHECKLIST.md`, not a code fix).

---

## Refund Research (Task 1 — recommendations only, nothing implemented)

**Superseded 2026-08-03:** the founder decided a simpler final policy — a full refund within **7 calendar days of purchase**, identical for monthly and yearly, no discretionary carve-outs, processed manually. This differs from the monthly/yearly-split recommendation below; the research itself is left as-is as the historical analysis that informed the decision. Current policy lives at `/refund` and `SUPPORT_PLAYBOOK.md` → "Refund requests."

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

1. 🔴 **No live Polar transaction ever run** — the hard gate, unchanged.
2. 🔴 **Production Polar + Vercel config unverified** (products, env vars — specifically `POLAR_SERVER` vs the legacy `POLAR_ENVIRONMENT` name, webhook endpoint/secret, grace period). Cannot be confirmed from this environment.
3. 🟢 **Migration 007 confirmed applied to production** (direct column check, 2026-07-30).
4. 🟢 **Migration 008 confirmed applied to production** (direct function-body check, 2026-08-01 — the Brand Studio free-tier fix).
5. 🟠 **Reset Password email template needs a manual update** (embed `{{ .TokenHash }}`) for the 2026-08-01 password-reset fix to take full effect cross-device.
6. 🟠 **Production domain decided & made consistent** (blocks a *polished* launch, not a technical one).

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

EmberFlow is **engineered to launch**. The billing system is correct, minimal, idempotent, and honestly documented; the app is mature and accessible; the architecture is clean. As of 2026-08-01, three more real bugs (two of them genuine correctness/access-control gaps, not polish) have been found and fixed, and one of the two blocking migrations is now confirmed live in production. It is **still not cleared to launch today** — solely because the billing path has never been run against real Polar, the production environment configuration is unconfirmed, and one email template still needs a manual update. None of that is more building; it's a focused round of verification. Do not launch on code confidence alone: **run the live test first.**
