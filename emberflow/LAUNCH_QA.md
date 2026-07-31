# EmberFlow — Launch QA Checklist

**The gate before switching Polar to Live.** Work through every box on a real device against a **Polar sandbox** account first; only after all of it passes (and the "Go-Live configuration" section is confirmed for production) should `POLAR_SERVER` be flipped to `production`.

**How to check each item:** confirm the UI shows the right thing, the `subscriptions` row / Supabase data matches, and (for billing) the Vercel function log + Polar dashboard delivery log show what you'd expect. Record the exact failure if something doesn't match — "didn't work" isn't actionable.

**Legend:** ☐ = to verify. Items marked **(config)** are dashboard/env settings, not app tests. Items marked **(auto)** are already covered by `npm run verify:polar` (33/33) — re-run it, but the real value is the live path.

---

## 0. Go-Live configuration (must all be true before flipping to production)

- ☐ **(config)** Two **production** Polar products created (Pro Monthly $11, Pro Yearly $130); prices match `frontend/src/config/plans.js`.
- ☐ **(config)** `POLAR_SERVER=production` + production `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_PRODUCT_PRO_MONTHLY`, `POLAR_PRODUCT_PRO_YEARLY` set in Vercel; **redeployed** after setting them.
- ☐ **(config)** The access token has scopes **checkouts (write)**, **customer_sessions (write)**, **subscriptions (write)**, **customers/products (read)**. *A token minted before 2026-07-31 lacks `subscriptions (write)` → switch/cancel will 403.*
- ☐ **(config)** Production webhook endpoint added, **Format = Raw**, URL `https://<prod-domain>/api/polar/webhook`, with all six events: `subscription.created/active/updated/canceled/uncanceled/revoked`.
- ☐ **(config)** Polar **grace period = 21 days** (Settings → Subscriptions) — the offered value that satisfies the 15-day policy (see `SUPPORT_PLAYBOOK.md` → Grace Period).
- ☐ **(config)** Polar customer-portal **self-serve "cancel" and "switch plan" DISABLED** — those are in-app in EmberFlow; the portal is card + invoices only. (Consistency of the single path.)
- ☐ **(config)** Supabase migrations applied through `007_polar_billing.sql` on production (adds `polar_*` columns). Confirm the columns exist in the prod DB, not just that the migration file exists.
- ☐ **(config)** `APP_URL` set to the real production domain in Vercel (CORS + redirect URLs depend on it; a wrong/unset value fails closed).
- ☐ **(config)** Upstash Redis configured (rate limits on all billing routes).
- ☐ `npm run build` green; `npm run verify:polar` → **33 passed, 0 failed**.

---

## 1. Authentication

- ☐ Email/password **sign up** → account created; if email confirmation is required, the "check your email" state shows and the confirmation email arrives.
- ☐ Email/password **sign in** → lands on `/app`.
- ☐ **Google OAuth** sign in → `/auth/callback` → `/app`; session persists across a refresh.
- ☐ Wrong password / unknown email → friendly error (not a raw Supabase string).
- ☐ **Password reset**: request email → reset link → set new password → sign in with it.
- ☐ **Password reset (cross-device, 2026-08-01 fix):** request the reset on one device/browser, open the link on a *different* one → still works (requires the Supabase Reset Password email template to embed `{{ .TokenHash }}` — see `CLAUDE.md` → "Final Launch Hardening Session" for the exact template snippet; without it, this still only works same-browser). An expired/already-used link shows a clear "this link has expired" state with a way back to request a new one, not "Auth session missing."
- ☐ **Resend verification email** works for an unconfirmed account.
- ☐ **Change password** (Settings → Security) requires the current password; rejects a wrong current password.
- ☐ An OAuth-only account sees the "you sign in with Google" note instead of a password form.
- ☐ **Session gate**: the app-boot loader ("Loading EmberFlow…") shows briefly, then the app; a signed-out user hitting `/app/*` is redirected to `/login`.
- ☐ **Disposable email** is rejected at signup.
- ☐ Sign out → returns to a public/landing state; protected routes no longer accessible.

## 2. Billing (entitlement + presentation)

- ☐ A **Free** account shows Free limits (5 invoices/month, 10 clients) and Pro features locked (Analytics, Proposals, Brand Studio logo/font/accent).
- ☐ A **Pro** account shows "Unlimited" and all Pro features unlocked.
- ☐ Billing lives **only** at `/app/subscriptions` (nothing billing in Settings).
- ☐ Plan hero shows the correct plan name, status badge, and renewal/access line.
- ☐ **Billing summary** shows Current plan, Renewal date, Last payment, Next payment — values match the Polar dashboard.
- ☐ **Early Supporter** badge shows for an account created before the cutoff; it has no functional effect.
- ☐ Usage meters reflect real client/invoice counts; the meter color escalates near the limit (Free).
- ☐ Entitlement is identical across every surface (dashboard gates, ExportMenu, FeatureGate) — all read `useSubscription()`.

## 3. Checkout

- ☐ Free → **Upgrade to Monthly** from `/app/subscriptions` → Polar hosted checkout → sandbox card (`4242…`) → back to `/app/subscriptions?billing=success`.
- ☐ Free → **Upgrade to Yearly** → same, yearly product.
- ☐ **Plan persists through auth (email/password):** logged out, `/pricing` → "Start yearly" → register → **checkout opens automatically for Yearly** (never asked to pick again).
- ☐ **Plan persists through auth (Google):** same via OAuth (the plan survives the OAuth redirect).
- ☐ **Plan persists through email confirmation:** sign up with confirmation required → confirm → sign in → checkout opens for the chosen plan.
- ☐ **Activation moment** plays on return (`?billing=success`): ember ring → "Welcome to EmberFlow Pro" → settles. Param is stripped from the URL.
- ☐ Activation **does not replay** on a manual refresh of `/app/subscriptions`.
- ☐ Activation honors **reduced motion** (no ring animation; still resolves to the welcome + page).
- ☐ **Duplicate-purchase guard:** while already Pro, hitting `/api/polar/checkout` again → `409` with a clear message; **no second Polar subscription** is created (confirm one subscription in the dashboard).
- ☐ Checkout **rate limit** (5/min) returns a sane `429` message when exceeded.

## 4. Webhooks

- ☐ `subscription.active`/`.created` after purchase → `subscriptions` row upserts (`plan`, `status='active'`, `polar_customer_id`/`subscription_id`/`product_id`, period dates, `cancel_at_period_end=false`).
- ☐ Every delivery in the Polar dashboard log returns **200** (a `403` = signature/secret/format mismatch — see `POLAR_SETUP.md`).
- ☐ **Idempotency:** resend the latest `subscription.*` event → response indicates duplicate, **no double-apply**, row unchanged.
- ☐ **Out-of-EmberFlow change:** edit the subscription in the Polar dashboard → the matching `subscription.*` event re-syncs the row.
- ☐ `resolveUserId()` fallback: an event missing `customer.external_id` still resolves the right user via `polar_subscription_id`/`polar_customer_id`.
- ☐ Signature verification: a tampered body/stale timestamp is rejected `403` (auto-covered; confirm the real dashboard resend path too).

## 5. Subscription lifecycle (in-app switch / cancel / resume)

- ☐ **Switch Monthly → Yearly** (in-app): `/app/subscriptions` → "Switch to Yearly" → confirm → `subscription.updated` → the row's `plan`/`polar_product_id`/`billing_cycle` update; the plan hero reflects Yearly after the brief poll.
- ☐ **Switch Yearly → Monthly**: same, reverse.
- ☐ After a switch, **exactly one** subscription exists in the Polar dashboard (an in-place update, not a new subscription).
- ☐ Proration: the customer's Polar receipt shows the prorated charge/credit; EmberFlow does no proration math and never double-charges.
- ☐ Switch is **not offered** while a subscription is set to cancel (must Resume first) — copy is correct.
- ☐ **Cancel** (in-app): danger zone → "Cancel subscription" → confirm → `cancel_at_period_end=true`, `status` stays `active`, hero shows "Access ends {date}", **no portal redirect**.
- ☐ **Resume** (in-app): "Resume subscription" → `cancel_at_period_end=false`; renewals continue.
- ☐ Cancel → let the period end → `subscription.revoked` → `plan` collapses to `free`, Pro locks, nothing deleted (data still readable).
- ☐ Post-revoke via failed payment (`unpaid`) shows the "we couldn't collect your last payment" message + one-click Resubscribe (distinct from a voluntary cancel).
- ☐ Switch/cancel error paths: a Polar failure surfaces an actionable message (not a generic "unexpected error"); a `409`/`403` behaves as documented.
- ☐ **Stale-subscription self-heal (2026-08-01 fix):** for an account whose `polar_subscription_id` no longer exists in the current Polar environment, Switch/Cancel returns a clear "moved to Free plan" message instead of a raw error, and the `subscriptions` row actually collapses to `plan=free`/`status=canceled` (confirm in Supabase, not just the UI message).

## 6. Customer Portal (card + invoices only)

- ☐ **Manage billing** / **View all invoices** opens Polar's real hosted portal (not a rebuilt page).
- ☐ Update card in the portal works; the change is reflected on the next charge.
- ☐ Invoice history / receipts are visible and downloadable in the portal.
- ☐ The portal's **cancel/switch options are absent** (disabled in config §0) — the in-app controls are the only path.
- ☐ Portal opens for a user with a stale/wrong-environment `polar_customer_id` — the `external_customer_id` fallback recovers first; if that also 404s (e.g. a genuinely sandbox-era customer with no production counterpart), the route finds-or-creates a customer in the current environment and syncs the id back to Supabase (2026-08-01 fix).
- ☐ Portal button is **absent** for a never-subscribed user (no crash; correct).
- ☐ Returning from the portal reflects state (the `return_url` back-link + the `pageshow`/`visibilitychange` refetch).

## 7. Failed payments

- ☐ Force a failed renewal (Polar sandbox) → subscription → `past_due`; the customer **keeps** Pro access.
- ☐ `/app/subscriptions` shows the warning **"Past due"** badge, the "Payment failed — update your card" subtitle, and the explanatory notice.
- ☐ The **app-wide `past_due` banner** appears on every `/app` route; "Update payment method" opens the portal; it's dismissible for the session and reappears on reload while still `past_due`.
- ☐ Polar sends the dunning email with a portal link.
- ☐ Retries exhaust → `subscription.revoked` → Free; the `past_due` notices clear; the post-revoke `unpaid` message shows.
- ☐ Grace: confirm the Polar dashboard grace (21d) doesn't cut access before the 15-day commitment.

## 8. Refunds

- ☐ Issue a test refund from the Polar dashboard → confirm the money returns and (separately) that the **subscription is not cancelled by the refund** (must be cancelled as a separate step if intended).
- ☐ The in-app **Refund policy** card copy matches the published `/refund` page (no contradiction).
- ☐ **"Report a billing problem"** opens a prefilled support email (subject + account/plan context in the body).

## 9. Dashboard

- ☐ Loads with the real header/layout preserved; a scoped ember spinner shows only in the data region while loading (no skeletons, no full-page spinner).
- ☐ Metrics (revenue total, paid invoices, clients, recent activity) match the underlying data; stat-card icons are correct/distinct.
- ☐ Error state shows an inline retry (not a dead-end), retry re-fetches.
- ☐ Empty state (new account) reads as intentional, not broken.
- ☐ Entrance: the logo-anchored app entrance plays once on load, then settles.

## 10. Settings

- ☐ Profile save works (name/business/address); avatar upload works; no "null email" error.
- ☐ **No billing UI** in Settings (moved to Subscriptions).
- ☐ Security card: change password (current-password gate); OAuth-only note where applicable.
- ☐ Theme toggle (light/dark) persists and renders correctly in both themes (incl. the logo mark).
- ☐ Brand Studio: Free tier can edit brand color + footer; logo/font/accent are Pro-gated (blurred + upsell, keyboard-inert when locked); Pro can edit all and it reflects in invoice/proposal previews + exports.

## 11. Analytics (Pro-gated)

- ☐ Free account: Analytics is gated with the standard Pro-lock treatment (Lock badge), not a raw panel.
- ☐ Pro account: revenue totals, monthly collections, overdue tracking, top-client ranking compute correctly against real data.
- ☐ Loading/error/empty states are premium (scoped spinner, inline retry).

## 12. Mobile (test at 320 / 360 / 480 / 768 px)

- ☐ No horizontal scroll or broken layout on any page at any width.
- ☐ `/app/subscriptions`: plan hero, billing summary, switch/cancel/resume actions, dialogs all usable at 320–360px.
- ☐ Invoice/proposal list card layouts (mobile stack) don't overflow; row actions wrap.
- ☐ Auth pages, pricing cards, landing nav (hamburger) all correct on mobile.
- ☐ Activation + app-entrance overlays are centered and legible on small screens.
- ☐ Tap targets ≥ ~44px on coarse pointers.

## 13. Accessibility

- ☐ Keyboard-only: can complete signup → upgrade → switch → cancel without a mouse; focus is visible throughout.
- ☐ Dialogs (Confirm/Modal/Drawer, MobilePreviewSheet) trap focus and restore it on close; `Esc` closes.
- ☐ The plan-switch/cancel confirm dialogs announce (role/medallion) and the confirm buttons have correct labels.
- ☐ Alerts/notices (past_due, post-revoke, errors) have `role="alert"`/`status` and are announced.
- ☐ Password show/hide toggles are reachable and labeled for assistive tech.
- ☐ Locked Pro controls are `inert` (can't be tabbed into) while visually locked.
- ☐ Run **axe / Lighthouse a11y** on the key routes; record the score and fix any serious violations.
- ☐ `prefers-reduced-motion`: activation, app entrance, and all transitions collapse gracefully.
- ☐ Color contrast on badges/buttons/alerts passes AA in both themes.

---

## Sign-off

- ☐ Every box above checked on a real device against Polar **sandbox**.
- ☐ Go-Live configuration (§0) confirmed for **production**.
- ☐ One **real** small live purchase made post-flip and confirmed (webhook 200 + Pro unlock), then refunded/cancelled if desired.

Only then: **flip `POLAR_SERVER=production` and announce launch.** Related: `SUPPORT_PLAYBOOK.md` (handling live tickets), `KNOWN_ISSUES.md` (what's deliberately deferred).
