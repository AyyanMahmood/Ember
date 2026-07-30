# EmberFlow Launch Blockers

The short, honest list of what **must** be true before EmberFlow can take real money in production. Everything here is a hard gate. Items that are *not* here (npm audit advisories, failed-payment post-revoke copy, Ember UI extraction, etc.) are deferred by decision — see `LAUNCH_READINESS_REPORT.md` → Deferred.

Last updated: 2026-07-30 (Launch Hardening Phase 2).

---

## 🔴 BLOCKER 1 — No live Polar transaction has ever been run

**This is the single most important gate.** The entire billing system is verified two ways — by reading the code, and by reading Polar's own documentation — but it has **never once been executed against a real Polar account**. This environment has no Polar credentials and no publicly reachable webhook URL, so a live run was never possible here.

**What must happen:** run the full `BILLING_QA_CHECKLIST.md` against a real Polar **sandbox** account end-to-end — purchase → webhook → Pro unlock → portal → cancel → revoke → Free, plus the failed-payment path. Then repeat the critical paths once in **production** with a real card (a small real charge, refundable afterward).

**Why it can't be skipped:** every prior "verified" claim in this repo is explicitly scoped to "code + docs, not a live run." Signature verification, webhook event selection, entitlement sync timing, and the environment/product-id wiring can only be truly confirmed by watching one real transaction flow through.

---

## 🔴 BLOCKER 2 — Production Polar + Vercel configuration unverified

None of the following can be checked from code; all must be confirmed in the live dashboards:

- [ ] Two recurring products created in the **production** Polar org at **$11/mo** and **$130/yr** (must match `frontend/src/utils/plans.js`).
- [ ] `POLAR_PRODUCT_PRO_MONTHLY` / `POLAR_PRODUCT_PRO_YEARLY` in Vercel are the **production** product ids (not sandbox — ids are environment-specific, and a mismatch silently derives active subscribers to Free; see `PRODUCTION_CHECKLIST.md`).
- [ ] `POLAR_SERVER=production`, `POLAR_ACCESS_TOKEN` (with **customer_sessions (write)** scope), `POLAR_WEBHOOK_SECRET` all set for the production environment.
- [ ] Webhook endpoint registered at the production URL, **Raw** format, with all six `subscription.*` events selected (`created`/`active`/`updated`/`canceled`/`uncanceled`/`revoked`).
- [ ] `APP_URL` set to the real production domain (drives CORS, checkout `success_url`, and portal `return_url`).
- [ ] Polar dashboard **grace period = 21 days** (satisfies the 15-day policy — see `SUPPORT_PLAYBOOK.md`).

---

## 🔴 BLOCKER 3 — Supabase migration `007_polar_billing.sql` confirmed applied to production

The webhook writes `polar_customer_id` / `polar_subscription_id` / `polar_product_id`; without these columns in production, entitlement sync fails. Prior sessions found `supabase migration list` unreliable here (bookkeeping noise from applying via `db query`), so this must be confirmed by a **direct column check** against the production DB, not the migrations table.

- [ ] `information_schema.columns` shows the three `polar_*` columns on `public.subscriptions` in production.

---

## 🟠 BLOCKER 4 — Production domain decided and made consistent

The intended domain (`emberflowapp.com`) was never purchased/confirmed; the live deploy is `embersys.vercel.app`. SEO canonical/OG URLs, `robots.txt`, and `sitemap.xml` currently hardcode `emberflowapp.com`, and `APP_URL` must match whichever domain is actually live.

- [ ] Decide the real launch domain; make `APP_URL`, the SEO URLs, and the Polar `success_url`/`return_url`/webhook URL all agree.

*(Amber, not red: EmberFlow is functionally launchable on the `.vercel.app` domain — this blocks a *polished* public launch, not a technical one.)*

---

## Not blockers (explicitly deferred — do not let these hold launch)

- **npm audit advisories** — 3 moderate + 1 high, but: the esbuild one is **dev-server-only** (never shipped to prod), and the react-router "high" (SSR hydration constructor injection) **does not apply** — EmberFlow is a client-only SPA with no SSR. The react-router open-redirect (moderate) is real but low-impact; fixing needs a breaking `react-router-dom@7` major bump — a scoped v1.5 upgrade-and-test task, not a launch blocker.
- **Failed-payment post-revoke messaging** — the pre-revoke `past_due` notice is built; a "here's why you're back on Free" message after revoke is a minor unbuilt follow-up.
- **Ember UI extraction, out-of-order webhook hardening, duplicate-checkout race** — all documented, all deferred, none launch-blocking (see the readiness report).
