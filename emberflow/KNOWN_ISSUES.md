# EmberFlow — Known Issues

Genuine, real remaining issues only — no invented future work. Each is something actually true of the current codebase/config as of 2026-08-01. Grouped by when it needs to be addressed.

**Snapshot:** there is **no known code defect that breaks the customer journey**. Entitlement is verified (parity 24/24, `verify:polar` 33/33) and the billing UI is render-verified. The launch gate is **live verification + Polar production config**, not a bug fix. Everything below is either that gate, a deliberately-deferred hardening item, or a minor polish.

**Update (2026-08-01):** a Final Launch Hardening Session found and fixed 8 real bugs not previously listed here (they were reported directly, not yet documented) — a Brand Studio false-error on free-tier saves (migration `008`, now live), a billing-portal "customer does not exist" for sandbox-era accounts, a localhost checkout 500 (dev-proxy DX, not app code), a password-reset session bug, and a subscription-lifecycle self-heal for stale Polar ids in Switch/Cancel (see item 7 below, now partially closed). Full writeup in `CLAUDE.md` → "Final Launch Hardening Session."

**Update (2026-08-02):** the Tier 1 launch blocker "no way to permanently delete an account" is now closed at the code level — see README.md → "Account Deletion." Migration `012_delete_account.sql` joins migrations `007`/`008` (item 3 below) as **not yet confirmed applied to production** — same standing gate, added as item 4.

---

## 🔴 Must fix / confirm before launch

These are launch **gates** — not code defects, but things that must be true before flipping `POLAR_SERVER=production`. The full step list is `LAUNCH_QA.md`.

1. **The live billing journey has never been exercised end-to-end.**
   Checkout, the activation moment, in-app switch/cancel/resume, webhook sync, and the `past_due` flow are all build-, schema-, and render-verified, but **no real Polar transaction has ever run** (this environment has no Polar credentials, ever) — this despite real supporting evidence in production (166 processed webhook events; 4 accounts currently on active Pro plans with correctly-synced Polar customer/subscription ids). Until `LAUNCH_QA.md` is completed against a Polar **sandbox** and then a single real production purchase, "it works live" is unproven.
   → *Action:* run `LAUNCH_QA.md` end-to-end.

2. **Polar production configuration is unconfirmed.**
   Specifically: the org access token must include **`subscriptions (write)`** (a token minted before 2026-07-31 lacks it → in-app switch/cancel return 403); the webhook endpoint must have all six `subscription.*` events at **Raw** format; the grace period should be **21 days**; and the portal's self-serve **cancel/switch should be disabled** (those are in-app now). `APP_URL` and the `POLAR_*` vars must be set for production and redeployed. Requires Polar dashboard access.
   → *Action:* `LAUNCH_QA.md` §0 "Go-Live configuration."

3. ~~**Supabase migration `007_polar_billing.sql` must be confirmed applied to production.**~~ **Confirmed 2026-08-01** — `polar_customer_id`/`polar_subscription_id`/`polar_product_id` verified present on `public.subscriptions` via a direct `information_schema` query against production. Migration `008` (the Brand Studio free-tier fix) was also applied and confirmed this session.

4. **Supabase migration `012_delete_account.sql` must be applied to production before Delete Account can work live.**
   Adds `delete_user_account(uuid)`, the SECURITY DEFINER function `api/account/delete.js` calls to atomically delete a user's rows. Without it, every deletion attempt fails at the RPC step with a clear "couldn't delete your data, nothing was changed" error (fails safe — no partial deletion, but the feature doesn't work until this is applied). Also not yet exercised against a live Supabase project or live Polar subscription (no credentials available in this environment, ever) — `npm run verify:account-deletion` covers the pure logic and the handler's control flow against a mocked client, not the real RLS/FK/Storage/Polar behavior.
   → *Action:* apply `supabase/migrations/012_delete_account.sql` to production, then manually delete one Free test account and one Pro test account (with real client/invoice/logo data) and confirm no rows remain in any table and no files remain in Storage.

5. **Vercel production environment variables are unconfirmed.**
   `POLAR_SERVER` (must read `production`, not the legacy `POLAR_ENVIRONMENT` name), `POLAR_ACCESS_TOKEN` and both `POLAR_PRODUCT_PRO_*` ids (production, not sandbox), `POLAR_WEBHOOK_SECRET` (must match the production endpoint specifically), `APP_URL`/`VITE_APP_URL`. Requires Vercel dashboard access.
   → *Action:* confirm each in the Vercel project dashboard before flipping `POLAR_SERVER=production`.

6. **The Supabase Reset Password email template's live content is unconfirmed.**
   The code-side fix (explicit `token_hash` verification, not an ambient session) is correct and in place; whether the dashboard template actually embeds `{{ .TokenHash }}` cannot be checked without Supabase dashboard access. Without it, the cross-device password-reset case falls back to same-browser-only behavior.
   → *Action:* confirm the template in the Supabase Authentication → Email Templates dashboard, test-send once.

---

## 🟡 Safe for V1.5 (real, deliberately deferred)

1. **Webhook entitlement-sync (portal-cancellation case) not fully root-caused.**
   The original "stays Pro after cancelling in the Polar portal" issue had two real contributors fixed (bfcache refetch on `pageshow`/`visibilitychange`; the portal `return_url`), but full closure was never live-confirmed. **Largely mitigated now:** cancellation is in-app (returns immediately + polls) and the portal's self-serve cancel is to be disabled, so the portal-cancel path is no longer the primary one. Deferred by explicit instruction — to be debugged separately after the customer journey.

2. **Switch/cancel reflect via bounded polling, not realtime.**
   After an in-app switch/cancel/resume, the page polls the `subscriptions` row for ~12s for the `subscription.updated` webhook to land. If the webhook lags beyond that, the UI shows the stale plan/cancel state until a manual reload. A Supabase realtime subscription or an optimistic local update would close it — both are new surface, out of scope for V1.

3. **Duplicate-checkout TOCTOU.**
   Two concurrent first-time checkouts from one Free user (two tabs/devices) could both pass `checkout.js`'s 409 guard before either subscription exists, creating two Polar subscriptions that Polar bills separately while EmberFlow's single-row schema reflects only one. Low probability (needs genuinely concurrent sessions); closing it properly needs a short-lived idempotency key or a DB lock.

4. **No webhook "apply only if newer" (out-of-order) guard.**
   `normalizeSubscription()` derives state purely from each event's own payload (which makes replays safe), but has no `modified_at` comparison — a late redelivery of an *older, distinct* event could overwrite newer state. No evidence this has happened; belt-and-suspenders hardening for a finance product.

5. **`react-router-dom` open-redirect advisory (moderate, dev-surfaced by `npm audit`).**
   Fixing means a major bump to `react-router-dom@7` — a breaking routing change that needs its own scoped upgrade-and-test pass.

6. **Exact 15-day grace is not code-enforced.**
   Entitlement grants Pro for the whole `past_due` window (until Polar revokes, ~21 days), so the 15-day promise is honored **with margin** — never less than promised. Enforcing *exactly* 15 days (cutting at day 15 while Polar still retries to 21) would need custom logic; granting slightly more grace never harms a customer.

7. **No periodic Polar↔Supabase reconciliation job (narrowed 2026-08-01).**
   Switch and Cancel now self-heal reactively: if a stored `polar_subscription_id` 404s against Polar (e.g. a sandbox-era row from before the production cutover), the route collapses the account to Free instead of leaving it frozen at stale Pro access. This closes the gap for accounts that actually touch Switch or Cancel. Still missing: a **proactive** check for accounts that never do — a subscription/customer deleted directly in the Polar dashboard (or left over from the sandbox era) with no corresponding webhook and no user-initiated Switch/Cancel would stay stale indefinitely. A scheduled reconcile job would close this fully; still deferred to v1.5.

8. **Live Lighthouse baseline never run.**
   Static picture is good (all routes lazy-loaded, vendor chunks split, `jspdf`/`html2canvas` deferred to when a document editor runs, self-hosted fonts), but performance/a11y have not been measured on a real device.

9. **`proposal_items` has two overlapping sets of RLS policies** (one current, one legacy pre-`past_due` set). Harmless today since permissive policies OR together, but real cleanup debt.

---

## 🟢 Nice-to-have (minor, non-blocking)

1. **Plan-switch confirm doesn't preview the exact prorated amount.**
   Copy says "Polar prorates the difference"; the precise figure appears only on Polar's receipt. Polar has a proration-preview endpoint that could show it in-dialog for extra transparency.

2. **No post-revoke explanation for a *voluntary* downgrade.**
   The failed-payment revoke case (`unpaid`) has a clear "we couldn't collect payment" message; a voluntary cancel that reaches period end simply shows Free with no recap. Lower-value than the pre-revoke `past_due` notice, which already exists.

3. **SPA has no SSR/prerender.**
   Per-route SEO tags are rendered by JS (via `react-helmet-async`). Googlebot and modern social crawlers execute JS and see them; a crawler/unfurler that does **not** run JS sees only the generic static `<title>`/meta. Closing it means SSR/prerendering — an architecture change, deliberately out of scope.

4. **`ProgressRing` tautological ternary.**
   `SubscriptionsPage.jsx` passes `variant={subscription.isPro ? 'accent' : 'accent'}` — always `'accent'`. Harmless dead code; a one-line cleanup.

5. **Minor dead code with no call sites.**
   `Drawer`'s `size` prop maps to Tailwind classes that don't exist in this codebase (no current callers); `EmptyState`'s `illustration` image prop lacks fixed dimensions (no callers — everyone uses the inline-SVG icon path).

6. **`info` medallion status added to the local `Modal`/`ConfirmDialog`, not yet re-extracted.**
   The 2026-07-31 addition (accent-tinted medallion for positive confirms) lives in EmberFlow's local component; fold it into the `modal-dialog` Ember UI module on the next dialog pass.

---

## 🟢 UX polish (from the first-time-customer product audit)

All findings classified Critical or High were fixed in the v1.0.0 release. The following Medium/Low items remain, triaged for v1.1 or later; none block launch.

1. Dashboard/ClientDetail/InvoiceDetail replace the whole page (not a scoped banner) on a failed data fetch.
2. A minor layout shift on Dashboard/ClientDetail stat cards between the loading and loaded state.
3. Pricing/Upgrade/Subscription card grids skip a tablet-optimized layout, going straight from 3-column to 1-column at 920px.
4. Usage-meter cards stay at 2 columns on mobile instead of 1 (a CSS specificity bug).
5. Decorative external-link icons occasionally wrap onto their own line on the Terms/Privacy/Contact pages.
6. The dedicated `/features` page has its own shorter, hand-maintained feature list that has drifted from the homepage's list (missing a "Secure workspace" callout).
7. The proposal line-item editor doesn't show the same real-time "excluded" warning the invoice editor has for an incomplete row (still caught at submit time, not silently lost).
8. The Brand Studio color picker popover can render partially off-screen near a narrow viewport's right edge.
9. The mobile sidebar navigation drawer doesn't trap keyboard focus the way every other overlay in the app does.
10. Several minor accessibility gaps: missing `scope="col"` on table headers app-wide; color-swatch buttons announce a raw hex code instead of a descriptive label; the delete-account dialog briefly loses its accessible name during the deleting/success transition; loading spinners are wrapped in a redundant duplicate `aria-live` region on three pages.
11. A handful of narrow, low-frequency edge cases: a template-picker keyboard-navigation breakpoint mismatch (only affects a ~40px viewport range for keyboard-only users), a long business name silently clipping in one premium document theme, a locked template briefly flashing via a guessed URL before snapping back, and one page-size control using an inline style instead of the spacing token scale.

---

*This document lists only genuine current issues. When one is fixed, remove it here and note the fix in CLAUDE.md and CHANGELOG.md. See `LAUNCH_QA.md` for the launch gate and `SUPPORT_PLAYBOOK.md` for handling the deferred sync case in support. Absorbed the former `KNOWN_LIMITATIONS.md` (archived `docs/archive/` — its v1.0.0-dated content is fully preserved above) on 2026-08-04 after the two trackers were found to have drifted apart with genuinely different items in each.*
