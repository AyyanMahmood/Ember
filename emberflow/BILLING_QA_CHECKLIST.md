# Billing Lifecycle QA Checklist

**Status: NOT verified.** Produced during the 2026-07-30 Launch Hardening audit from code + Polar's own documentation (verified directly against `polarsource/polar-js` source and `polar.sh/docs`, not recalled from memory) — not from a live sandbox run. This environment has no Polar account/credentials, so nothing below has been exercised end-to-end. Work through it against a real Polar **sandbox** account before launch; see `POLAR_SETUP.md` for account/webhook setup.

For each item, check: does the UI show the right thing, does the `subscriptions` row match, and (where relevant) does Vercel's function log show what you'd expect. Note the exact failure if something doesn't match — "didn't work" isn't enough to act on.

---

## 1. First purchase

- [ ] Free → Monthly: checkout opens, sandbox test card succeeds, redirect lands on `/app/subscriptions?billing=success`
- [ ] Immediately on landing back: the page shows "Confirming your purchase with Polar…" (not the Upgrade-to-Pro card, not a bare "Free plan") if the webhook hasn't landed yet — this is the fix from `c56a104`, added specifically because Polar's docs confirm the subscription's status "might not be active yet" on the very first webhook event. Confirm this actually appears live at least once (it may be too fast to see if the webhook is very quick) rather than just trusting the isolated-harness verification done in this environment.
- [ ] The `?billing=success` param disappears from the URL bar shortly after landing (not left dangling if the page is reloaded/bookmarked)
- [ ] Within a few seconds of payment, `subscription.active` (or `.created`) webhook lands (check Polar dashboard → Webhooks → delivery log for `200`)
- [ ] `subscriptions` row: `plan='pro_monthly'`, `status='active'`, `polar_customer_id`/`polar_subscription_id`/`polar_product_id` all populated, `current_period_start`/`current_period_end` set, `cancel_at_period_end=false`
- [ ] The confirming banner disappears and the real Pro state renders within the ~16s bounded poll window; if it doesn't (webhook genuinely slow/stuck), confirm the page falls back to showing its real current state rather than hanging on "Confirming…" forever
- [ ] Pro features unlock in the UI without a manual refresh (Analytics, Proposals, Brand Studio logo/font/accent, unlimited invoices/clients)
- [ ] "Manage billing" button appears on `/app/subscriptions`
- [ ] Free → Yearly: repeat all of the above with the yearly product

## 2. Duplicate purchase

- [ ] While already Pro (active or `past_due`), call `/api/polar/checkout` again (e.g. re-click Upgrade, or hit the API directly) → `409` with the "you already have an active subscription" message, **no second Polar checkout session is created**
- [ ] Confirm in the Polar dashboard that only one subscription exists for the test customer after this
- [ ] **Known unverified edge case (not fixed this sprint, documented not guessed):** two rapid checkout requests from two different tabs/devices for the same *Free* user, close enough together that both read "no existing subscription" before either completes, could both succeed at Polar and create two subscriptions Polar would separately bill — EmberFlow's single `subscriptions` row would only ever reflect whichever webhook lands last, silently losing visibility of the other. Low probability (needs two concurrent sessions), not reproducible without real timing control — flag if you can force it.

## 3. Upgrade / cadence switch (Monthly ↔ Yearly)

**Corrected understanding of Polar's real capability (2026-07-30, superseding the note that used to be here — the old note overstated Polar's limitation and was fixed in `874b68c` after being found stated as fact in the app's own UI):** Polar has a real **Update Subscription API** (`product_id` + `proration_behavior`: `invoice`/`prorate`/`next_period`/`reset`, verified against `polar.sh/docs/api-reference/subscriptions/update-subscription`) that can move a subscription onto a different product with proration handled by Polar. Polar's Customer Portal also has a configurable self-serve "switch subscription plans" feature (`Settings → Customer portal` in the Polar dashboard). **EmberFlow does not use either of these** — it deliberately keeps Monthly and Yearly as separate products (confirmed this is Polar's own recommended design: "one product per pricing model," not a workaround) and requires cancel-then-resubscribe instead of an in-place swap, to avoid building custom proration UI/logic. This was a deliberate scope decision this sprint, not a technical limitation — do not describe it to users as something Polar can't do.

- [ ] **Checkout creation while already Pro** — `checkout.js`'s `409` guard fires (verified in code, see §2) — confirm live that clicking anything that would call `/api/polar/checkout` while Pro is actually unreachable from the UI (the "Switch billing cadence" card replaces the Upgrade card entirely once `isPro`) and that hitting the API directly still gets the `409`
- [ ] **Polar behavior** — confirm in the Polar dashboard whether "switch subscription plans" is enabled under Customer Portal settings for this org; if it is, a customer might see a plan-switch option inside Polar's own portal UI that bypasses EmberFlow's cancel-first flow entirely — if so, decide (as a follow-up, not this sprint) whether to disable it for consistency with EmberFlow's own messaging, or adopt it as the real mechanism instead
- [ ] **Database updates** — cancel Monthly (`cancel_at_period_end=true`, `status` stays `active`) → confirm `subscriptions` row reflects this immediately after the webhook; confirm a fresh Yearly checkout is still blocked (`409`) until the row's status actually leaves `hasAccessGrantingStatus` (i.e. until the period genuinely ends and `subscription.revoked` lands, not just because `cancel_at_period_end=true`)
- [ ] **Webhook sequence** — same `subscription.*` sequence as cancellation (this section doesn't introduce new event types since EmberFlow implements switching as cancel-then-purchase, not an in-place update) — see §5 and §1 for the two halves
- [ ] **Entitlement updates** — once the old subscription is genuinely `revoked`/free and the new Yearly checkout completes, confirm entitlements (`isPro`, invoice/client limits, Pro feature gates) reflect the new plan correctly, same mechanism as §1
- [ ] **UI state** — "Switch billing cadence" card copy (now corrected in `874b68c`) accurately describes cancel-then-resubscribe without claiming it's a Polar limitation
- [ ] **Duplicate subscription prevention** — confirm only one subscription ever exists in the Polar dashboard for the test customer throughout a full Monthly→(cancel)→Yearly cycle
- [ ] **Proration** — confirm EmberFlow does **not** attempt any proration math of its own (it shouldn't — there's nothing to prorate since the old plan's paid-for period runs out naturally before the new one starts; the customer isn't charged for or credited any overlap). If Polar's own portal-based switch (see above) ever gets enabled, its proration behavior would need separate verification.
- [ ] **Billing period changes** — confirm the new subscription's `current_period_start`/`current_period_end` are a fresh period from the new checkout date, not inherited from the old subscription

## 4. Downgrade

- [ ] Yearly → Monthly: same mechanism as #3 (cancel, then resubscribe) — verify the UI copy doesn't imply anything more automatic exists
- [ ] Monthly/Yearly → Free: this **is** cancellation (EmberFlow has no paid tier below Pro) — see section 5

## 5. Cancellation

- [ ] **Cancel from Polar customer portal** (Manage billing → cancel in Polar's hosted UI): confirm `cancel_at_period_end` flips to `true` in the `subscriptions` row (status stays `active` — you keep Pro until period end, by design)
- [ ] Return to EmberFlow **via the browser back button** after cancelling in the portal → the Subscriptions page must show the cancelling state without a manual reload (this is the specific scenario the `pageshow`/`visibilitychange` refetch fix in `useSubscription.js` targets — confirm it actually works live, since this environment couldn't test it against a real portal redirect)
- [ ] Return to EmberFlow via a **second tab** (portal opened in a new tab, original tab still open) → switching back to the original tab must also pick up the change (the `visibilitychange` half of the same fix)
- [ ] Wait for the period to actually end → `subscription.revoked` webhook lands → `plan` collapses to `'free'`, `status` updates, Pro features lock again
- [ ] **Cancel from EmberFlow's own dashboard**: `SubscriptionsPage.jsx`'s "Cancel subscription" danger-zone action opens a confirm dialog, then redirects to the Polar portal to actually complete the cancellation (EmberFlow has no direct cancel-via-API call of its own — confirm this is what actually happens, not a silent no-op)
- [ ] Check Vercel's function logs for the `subscription.*` webhook deliveries around a cancel — confirm which specific event type(s) Polar actually sends for a portal-initiated cancel vs. an end-of-period revoke, and cross-check that the endpoint's selected events (Polar dashboard → Webhooks → your endpoint) includes all of them. This is the one part of the historical "stays Pro after cancelling" bug this audit could not independently verify from code alone.

## 6. Failed payments

Confirmed against Polar's own docs (not assumed): on renewal, if the charge fails the subscription moves to `past_due` and Polar's automatic payment-recovery/retry flow begins; there's an optional org-level grace period before benefits are revoked; once retries are exhausted, `subscription.revoked` fires and status becomes `unpaid`/`canceled`.

- [ ] Force a `past_due` state (Polar sandbox should have a way to simulate a failed renewal — check their sandbox docs) → confirm the user **keeps** Pro access (`hasAccessGrantingStatus` in `api/_utils/polar.js` already includes `past_due` by design) and the UI communicates this isn't a normal "active" state, not just silently showing "Pro" with no explanation
- [ ] Let retries exhaust (or simulate) → `subscription.revoked` → `plan` collapses to `free`, features lock
- [ ] Confirm there's no user-facing message today explaining *why* access was lost after a failed-payment revoke (vs. a voluntary cancel) — this is a real UX gap, not implemented this sprint (see Recommendations)

## 7. Refunds

**Not implemented — recommendations only, see the audit report.** Manual QA once a real policy/process exists:

- [ ] Confirm support's process actually includes cancelling the subscription separately after issuing a refund — Polar's docs are explicit that **refunding an order does not cancel the subscription**; the customer keeps Pro access unless someone separately cancels it
- [ ] Confirm the in-app refund summary (`SubscriptionsPage.jsx`) and the published `/refund` policy say the same thing (this audit found and fixed one contradiction between them — re-check after any future policy change)

## 8. Customer portal

- [ ] Manage billing opens Polar's real hosted portal (not a custom-built page) — confirm this is still true, since "never rebuild what Polar provides" is a hard rule
- [ ] Inside the portal: change card / update payment method works (Polar-native, nothing to test in EmberFlow's own code)
- [ ] Inside the portal: invoice history / receipts are visible and downloadable (Polar-native)
- [ ] Portal opens correctly for a user whose stored `polar_customer_id` is stale/wrong-environment (the `external_customer_id` fallback added in `23a3732` should recover automatically — hard to force deliberately, but worth a note if it's ever observed)
- [ ] Portal route for a genuinely free user (never subscribed) → friendly "no billing account yet" error, not a crash (confirm the exact message reads sensibly, not a raw Polar error string)

## 9. Webhook replay / idempotency

- [ ] Re-deliver the same webhook event from the Polar dashboard's delivery log (most webhook UIs support a "resend" action) → confirm the second delivery returns `{ received: true, duplicate: true }` (via the `webhook_events` id check) and does **not** double-apply or corrupt the `subscriptions` row
- [ ] Confirm a tampered/replayed request with a stale `webhook-timestamp` is rejected with `403` (already covered by `npm run verify:polar`'s automated signature tests — this item is about confirming the *real* Polar dashboard's resend mechanism specifically, not just the unit test)

## 10. Expired subscription

- [ ] A `past_due` subscription that never recovers and eventually reaches `subscription.revoked` — confirm the transition to Free is clean (no leftover `polar_subscription_id` confusion, `current_period_end` still reflects the last real period rather than being nulled out unexpectedly)

## 11. Deleted customer / deleted subscription (edited or removed directly in the Polar dashboard)

- [ ] Delete or edit a subscription directly in the Polar dashboard (not through EmberFlow) → confirm `resolveUserId()`'s fallback (match by `polar_subscription_id`, then `polar_customer_id`) still resolves the correct EmberFlow user if `customer.external_id` is missing from that event
- [ ] A customer deleted entirely in Polar with no corresponding webhook event at all → EmberFlow's row would simply go stale with no update (no event ever arrives to trigger one) — this is a silent gap, not fixable in the webhook handler itself since there's nothing to react to; worth a periodic reconciliation job someday (see Recommendations), not this sprint.

---

## After you finish

Update this file's checkboxes and note any real findings (with the exact `subscriptions` row values, webhook payload, or error message) rather than "worked"/"didn't work." If a scenario reveals a real bug, open it the same way prior sessions have — root cause first, fix second, don't guess.
